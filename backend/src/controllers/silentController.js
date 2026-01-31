
import Course from '../models/Course.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import { ACTIVE_COURSE_FILTER } from '../utils/courseFilters.js';
import NodeCache from 'node-cache';

const silentCache = new NodeCache({ stdTTL: 60 });

const SILENCE_THRESHOLDS = {
    INACTIVITY_DAYS: 14
};

export const getSilentStudents = async (req, res) => {
    console.time('silent_students_compat');
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Number(req.query.limit) || 25);
        const cacheKey = `silent_list_${page}_${limit}`;

        const cached = silentCache.get(cacheKey);
        if (cached) {
            console.timeEnd('silent_students_compat');
            return res.json(cached);
        }

        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 1. Get all students enrolled in ACTIVE courses
        const activeCourses = await Course.find({ courseState: 'ACTIVE' }, { students: 1, name: 1, id: 1 }).lean();

        const studentToInfo = {};
        const allStudentIds = new Set();
        const courseIds = activeCourses.map(c => c.id);

        activeCourses.forEach(course => {
            (course.students || []).forEach(studentId => {
                allStudentIds.add(studentId);
                if (!studentToInfo[studentId]) {
                    studentToInfo[studentId] = {
                        courses: [],
                        courseId: course.id // For assignment check
                    };
                }
                studentToInfo[studentId].courses.push(course.name);
            });
        });

        const uniqueStudentIds = Array.from(allStudentIds);

        // 2. Identify "Silent" Students (Last submission >= 30 days ago, and course HAS assignments)
        const recentSubmissions = await Submission.find({
            userId: { $in: uniqueStudentIds },
            creationTime: { $gte: thirtyDaysAgo },
            state: { $in: ['TURNED_IN', 'RETURNED'] }
        }, { userId: 1 }).lean();

        const recentSubmittersSet = new Set(recentSubmissions.map(s => s.userId));

        // 3. Gather data for potentially silent students
        const [users, allSubs, allAssignments] = await Promise.all([
            User.find({ googleId: { $in: uniqueStudentIds } }, { googleId: 1, name: 1, email: 1 }).lean(),
            Submission.find({
                userId: { $in: uniqueStudentIds },
                state: { $in: ['TURNED_IN', 'RETURNED'] }
            }, { userId: 1, creationTime: 1, courseWorkId: 1 }).sort({ creationTime: -1 }).lean(),
            Assignment.find({ courseId: { $in: courseIds } }).lean()
        ]);

        const userMap = new Map(users.map(u => [u.googleId, u]));
        const lastSubMap = new Map();
        const subMap = new Map();
        allSubs.forEach(s => {
            if (!lastSubMap.has(s.userId)) lastSubMap.set(s.userId, s.creationTime);
            if (!subMap.has(s.userId)) subMap.set(s.userId, new Set());
            subMap.get(s.userId).add(s.courseWorkId);
        });

        // Filter assignments with due dates
        const passedAssignments = allAssignments.filter(a => {
            if (!a.dueDate?.year) return false;
            const hours = a.dueTime?.hours ?? 23;
            const minutes = a.dueTime?.minutes ?? 59;
            const dueUTC = Date.UTC(a.dueDate.year, a.dueDate.month - 1, a.dueDate.day, hours, minutes, 59);
            return now.getTime() > dueUTC;
        });

        // 4. Resolve silent students based on EXTENDED Silent Student Rule
        const silentResults = [];
        uniqueStudentIds.forEach(id => {
            const userCourses = activeCourses.filter(c => (c.students || []).includes(id));
            const userCourseIds = userCourses.map(c => c.id);
            const userValidAssignmentsTotal = passedAssignments.filter(a => userCourseIds.includes(a.courseId));

            // Rule: Ignore courses with fewer than 4 due-date assignments for the chronic missed check
            const hasEnoughCourseAssignments = userValidAssignmentsTotal.length >= 4;

            // New Chronic Missed Condition: Missed >= 4 in the last 30 days
            const assignmentsDueInLast30 = userValidAssignmentsTotal.filter(a => {
                const dueUTC = Date.UTC(a.dueDate.year, a.dueDate.month - 1, a.dueDate.day, a.dueTime?.hours ?? 23, a.dueTime?.minutes ?? 59, 59);
                return dueUTC >= thirtyDaysAgo.getTime();
            });

            const userSubs = subMap.get(id) || new Set();
            const missedInLast30 = assignmentsDueInLast30.filter(a => !userSubs.has(a.id));
            const isChronicMissed = hasEnoughCourseAssignments && (missedInLast30.length >= 4);

            if (userValidAssignmentsTotal.length === 0) return;

            const lastDate = lastSubMap.get(id);
            const daysInactive = lastDate ? Math.floor((now - lastDate) / (1000 * 60 * 60 * 24)) : null;

            // Classification Priority: 1. AT_RISK, 2. SILENT
            const isAtRisk = (!lastDate || daysInactive >= 30);

            // SILENT (includes inactivity OR chronic missed)
            const isSilentInactivity = (daysInactive >= 15 && daysInactive < 30);
            const isSilent = !isAtRisk && (isSilentInactivity || isChronicMissed);

            if (isSilent) {
                silentResults.push({
                    studentId: id,
                    studentName: userMap.get(id)?.name || 'Unknown Student',
                    courseName: userCourses.map(c => c.name).join(', '),
                    daysSinceLastActivity: daysInactive,
                    missedAssignments: missedInLast30.length,
                    lastSubmissionDate: lastDate ? lastDate.toISOString().split('T')[0] : 'None',
                    status: 'SILENT',
                    silentReason: isChronicMissed ? 'Chronic Missed Assignments' : 'Inactivity'
                });
            }
        });

        // 5. Final Formatting & Pagination
        const totalItems = silentResults.length;
        const skip = (page - 1) * limit;
        const items = silentResults.slice(skip, skip + limit);

        const response = {
            items,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.ceil(totalItems / limit)
            }
        };

        silentCache.set(cacheKey, response, 60);
        console.timeEnd('silent_students_compat');
        res.json(response);
    } catch (error) {
        console.timeEnd('silent_students_compat');
        console.error('Silent Students Error:', error);
        res.status(500).json({ message: 'Error fetching silent students' });
    }
};

export const explainSilence = async (req, res) => {
    try {
        const { studentData } = req.body;
        if (!studentData) return res.status(400).json({ message: 'Student data required' });
        const workerUrl = process.env.LLM_WORKER_URL;
        const apiKey = process.env.LLM_WORKER_API_KEY;
        if (!workerUrl || !apiKey) return res.json({ explanation: "AI service unconfigured." });

        const systemPrompt = `You are an academic analyst. Explain the patterns of a "Silent Student". Focus on inactivity and missed deadlines. No bold/markdown.`;
        const userContent = `Student: ${studentData.studentName}, Course: ${studentData.courseName}, Inactive: ${studentData.daysSinceLastActivity ?? 'Never'}, Missed: ${studentData.missedAssignments}, Last: ${studentData.lastSubmissionDate || 'None'}`;

        const response = await fetch(workerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
            body: JSON.stringify({ messages: [{ role: 'user', content: `${systemPrompt}\n\n${userContent}` }] })
        });
        if (!response.ok) throw new Error('LLM Error');
        const data = await response.json();
        const raw = data.answer || data.insights || data.response || data.output || data.content || data.message?.content || data.choices?.[0]?.message?.content || JSON.stringify(data);
        res.json({ explanation: String(raw).replace(/[#*`_~]/g, '').trim() });
    } catch (error) {
        res.status(500).json({ explanation: "Unable to generate explanation." });
    }
};
