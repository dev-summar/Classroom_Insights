import Course from '../models/Course.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import { ACTIVE_COURSE_FILTER } from '../utils/courseFilters.js';
import NodeCache from 'node-cache';

const atRiskCache = new NodeCache({ stdTTL: 60 });

const RISK_THRESHOLDS = {
    MISSED_ASSIGNMENTS: 2,
    INACTIVITY_DAYS: 15,
    LOW_RATE: 50
};

export const getAtRiskStudents = async (req, res) => {
    console.time('at_risk_students_compat');
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Number(req.query.limit) || 25);
        const cacheKey = `at_risk_list_${page}_${limit}`;

        const cached = atRiskCache.get(cacheKey);
        if (cached) {
            console.timeEnd('at_risk_students_compat');
            return res.json(cached);
        }

        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 1. Fetch data
        const [activeCourses, passedAssignments, users, allSubs] = await Promise.all([
            Course.find({ courseState: 'ACTIVE' }, { id: 1, name: 1, students: 1 }).lean(),
            Assignment.find({ "dueDate.year": { $exists: true } }).lean(),
            User.find({}, { googleId: 1, name: 1, email: 1 }).lean(),
            Submission.find({ state: { $in: ['TURNED_IN', 'RETURNED'] } }, { userId: 1, courseWorkId: 1, creationTime: 1, late: 1 }).lean()
        ]);

        const reallyPassed = passedAssignments.filter(a => {
            const hours = a.dueTime?.hours ?? 23;
            const minutes = a.dueTime?.minutes ?? 59;
            const dueUTC = Date.UTC(a.dueDate.year, a.dueDate.month - 1, a.dueDate.day, hours, minutes, 59);
            return now.getTime() > dueUTC;
        });

        // 2. Pre-process for performance
        const userMap = new Map(users.map(u => [u.googleId, u]));
        const assignmentsByCourse = {};
        reallyPassed.forEach(a => {
            if (!assignmentsByCourse[a.courseId]) assignmentsByCourse[a.courseId] = [];
            assignmentsByCourse[a.courseId].push(a.id);
        });

        const studentSubMap = new Map();
        const studentLastSub = new Map();
        const studentLateCount = new Map();

        allSubs.forEach(s => {
            if (!studentSubMap.has(s.userId)) studentSubMap.set(s.userId, new Set());
            studentSubMap.get(s.userId).add(s.courseWorkId);

            if (!studentLastSub.has(s.userId) || s.creationTime > studentLastSub.get(s.userId)) {
                studentLastSub.set(s.userId, s.creationTime);
            }

            if (s.late) {
                studentLateCount.set(s.userId, (studentLateCount.get(s.userId) || 0) + 1);
            }
        });

        // 3. Risk Calculation logic
        const atRiskResults = [];

        activeCourses.forEach(course => {
            // Rule 1 & 2: Course must have valid assignments with due dates
            const courseAssigns = assignmentsByCourse[course.id] || [];
            if (courseAssigns.length === 0) return; // NOT_APPLICABLE -> Hidden from list

            (course.students || []).forEach(studentId => {
                const student = userMap.get(studentId);
                const lastDate = studentLastSub.get(studentId);
                const daysInactive = lastDate ? Math.floor((now - lastDate) / (1000 * 60 * 60 * 24)) : null;

                // Step 3 Classification
                let status = "ACTIVE";
                if (!lastDate || daysInactive >= 30) {
                    status = "AT_RISK";
                } else if (daysInactive >= 15) {
                    status = "SILENT";
                }

                if (status === "AT_RISK") {
                    const userSubs = studentSubMap.get(studentId) || new Set();
                    let missedCount = 0;
                    courseAssigns.forEach(aId => {
                        if (!userSubs.has(aId)) missedCount++;
                    });
                    const submissionRate = Math.round(((courseAssigns.length - missedCount) / courseAssigns.length) * 100);
                    const lateCount = studentLateCount.get(studentId) || 0;

                    const riskReasons = [];
                    if (!lastDate) riskReasons.push("Never submitted");
                    else if (daysInactive >= 30) riskReasons.push(`Inactive ≥ 30d (${daysInactive} days)`);
                    if (missedCount > 0) riskReasons.push(`Missed ${missedCount} tasks`);
                    if (lateCount > 0) riskReasons.push(`Late patterns (${lateCount})`);

                    atRiskResults.push({
                        studentId,
                        studentName: student?.name || 'Unknown',
                        courseName: course.name,
                        missedAssignments: missedCount,
                        submissionRate,
                        daysSinceLastActivity: daysInactive,
                        riskReasons,
                        status: 'AT_RISK'
                    });
                }
            });
        });
        // 4. Pagination & Final Response
        const totalItems = atRiskResults.length;
        const skip = (page - 1) * limit;
        const items = atRiskResults.slice(skip, skip + limit);

        const response = {
            items,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.ceil(totalItems / limit)
            }
        };

        atRiskCache.set(cacheKey, response, 60);
        console.timeEnd('at_risk_students_compat');
        res.json(response);
    } catch (error) {
        console.timeEnd('at_risk_students_compat');
        console.error('At Risk Error:', error);
        res.status(500).json({ message: 'Error identifying at-risk students' });
    }
};

export const explainAtRiskStatus = async (req, res) => {
    try {
        const { studentData } = req.body;
        if (!studentData) return res.status(400).json({ message: 'Student data required' });
        const workerUrl = process.env.LLM_WORKER_URL;
        const apiKey = process.env.LLM_WORKER_API_KEY;
        if (!workerUrl || !apiKey) return res.json({ explanation: "AI service unavailable." });

        const systemPrompt = `You are an academic advisor. Explain why a student is flagged as "At-Risk". Focus strictly on provided metrics. No bold/markdown.`;
        const userContent = `Student: ${studentData.studentName}, Course: ${studentData.courseName}, Missed: ${studentData.missedAssignments}, Rate: ${studentData.submissionRate}%, Inactive: ${studentData.daysSinceLastActivity ?? 'N/A'}, Reasons: ${studentData.riskReasons.join(', ')}`;

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
