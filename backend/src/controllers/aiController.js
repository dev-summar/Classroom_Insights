
import Course from '../models/Course.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import Teacher from '../models/Teacher.js';
import { ACTIVE_COURSE_FILTER } from '../utils/courseFilters.js';
import { getUniqueActiveCourseIds } from '../utils/dashboardMetrics.js';

/**
 * Normalizes responses from various AI providers into a single string.
 */
const normalizeAIResponse = (data) => {
    if (!data) return "Required data is not available in the system.";
    let raw = data;
    if (typeof data === 'object' && data !== null) {
        raw = data.answer || data.insights || data.response || data.output || data.content || data.message?.content || data.choices?.[0]?.message?.content || JSON.stringify(data);
    }
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                const parsed = JSON.parse(trimmed);
                raw = parsed.output || parsed.answer || parsed.insights || parsed.response || parsed.content || raw;
            } catch (e) { }
        }
    }
    let text = String(raw).replace(/[#*`_~]/g, '').replace(/^>+ /gm, '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/\s+/g, ' ').trim();
    return text || "Required data is not available in the system.";
};

import dashboardCache from '../utils/cache.js';

export const getAIInsights = async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) return res.status(400).json({ message: 'Question is required' });

        // 1. Fetch Institute-Wide ACTIVE Context Data
        const activeCourseIds = await getUniqueActiveCourseIds();

        // 2. Fetch Detailed Data for Context (Courses, Assignments, Submissions)
        // We replicate dashboard logic here to ensure AI has standalone access to the TRUE state of the DB.
        const [activeCoursesWithStudents, allActiveAssignments, allStudentSubs, teachersOverviewFull] = await Promise.all([
            Course.find({ courseState: 'ACTIVE', id: { $in: activeCourseIds } }, { id: 1, name: 1, students: 1, section: 1 }).lean(),
            Assignment.find({ courseId: { $in: activeCourseIds } }).lean(),
            Submission.find({ courseId: { $in: activeCourseIds }, state: { $in: ['TURNED_IN', 'RETURNED'] } }, { userId: 1, creationTime: 1, courseWorkId: 1 }).lean(),
            Teacher.aggregate([
                { $match: { courseId: { $in: activeCourseIds } } },
                {
                    $group: {
                        _id: "$userId",
                        name: { $first: "$fullName" },
                        email: { $first: "$emailAddress" },
                        totalCourses: { $sum: 1 }
                    }
                },
                { $project: { _id: 0, userId: "$_id", email: "$email", name: "$name", totalCourses: "$totalCourses" } },
                { $sort: { totalCourses: -1 } }
            ])
        ]);

        // 3. Process Metrics (At-Risk / Silent / Engagement)
        const totalStudents = new Set(activeCoursesWithStudents.flatMap(c => c.students || [])).size;
        const totalTeachers = teachersOverviewFull.length;
        const totalCourses = activeCourseIds.length;

        // Calculate Submissions & Pending
        const totalExpected = allActiveAssignments.reduce((acc, a) => {
            const course = activeCoursesWithStudents.find(c => c.id === a.courseId);
            return acc + (course?.students?.length || 0);
        }, 0);
        const totalSubmitted = allStudentSubs.length;
        const totalPending = Math.max(0, totalExpected - totalSubmitted);

        // Calculate At-Risk / Silent (accurate logic matching dashboard)
        const now = new Date();
        const lastSubMap = new Map();
        allStudentSubs.forEach(s => {
            if (!lastSubMap.has(s.userId) || s.creationTime > lastSubMap.get(s.userId)) {
                lastSubMap.set(s.userId, s.creationTime);
            }
        });

        const assignmentsByCourse = {};
        allActiveAssignments.forEach(a => {
            if (!assignmentsByCourse[a.courseId]) assignmentsByCourse[a.courseId] = [];
            assignmentsByCourse[a.courseId].push(a);
        });

        const atRiskSet = new Set();
        const silentSet = new Set();

        activeCoursesWithStudents.forEach(course => {
            const courseAssigns = assignmentsByCourse[course.id] || [];
            // Check if course has ANY due dates (expectations)
            const hasExpectations = courseAssigns.some(a => a.dueDate?.year);

            if (hasExpectations) {
                (course.students || []).forEach(studentId => {
                    const lastDate = lastSubMap.get(studentId);
                    const daysInactive = lastDate ? Math.floor((now - lastDate) / (1000 * 60 * 60 * 24)) : null;

                    if (!lastDate || daysInactive >= 30) {
                        atRiskSet.add(studentId);
                    } else if (daysInactive >= 15) {
                        silentSet.add(studentId);
                    }
                });
            }
        });

        const atRiskCount = atRiskSet.size;
        const silentCount = silentSet.size;

        // 4. Summaries for AI Context
        const coursesSummary = activeCoursesWithStudents
            .map(c => ({
                name: c.name,
                students: (c.students || []).length,
                assignments: allActiveAssignments.filter(a => a.courseId === c.id).length
            }))
            .sort((a, b) => b.students - a.students)
            .slice(0, 30); // Top 30 courses by size

        const assignmentsSummary = allActiveAssignments
            .map(a => {
                const subCount = allStudentSubs.filter(s => s.courseWorkId === a.id).length;
                const course = activeCoursesWithStudents.find(c => c.id === a.courseId);
                const expected = course?.students?.length || 0;
                return {
                    title: a.title,
                    course: course?.name,
                    pending: Math.max(0, expected - subCount),
                    submitted: subCount
                };
            })
            .sort((a, b) => b.pending - a.pending)
            .slice(0, 20); // Top 20 assignments with pending work

        // 5. Build Final Context Object
        const context = {
            contextType: "INSTITUTE_FULL_DATA",
            generatedAt: new Date().toISOString(),
            stats: {
                totalActiveCourses: totalCourses,
                totalStudents: totalStudents,
                totalTeachers: totalTeachers,
                totalAssignments: allActiveAssignments.length,
                submissionRate: totalExpected > 0 ? Math.round((totalSubmitted / totalExpected) * 100) + '%' : '0%'
            },
            riskAnalysis: {
                atRiskStudents: atRiskCount,
                silentStudents: silentCount,
                highRiskFlag: atRiskCount > (totalStudents * 0.1) // >10% at risk
            },
            topCourses: coursesSummary,
            topPendingAssignments: assignmentsSummary,
            teachers: teachersOverviewFull.slice(0, 20)
        };

        // 6. Safety Guard
        if (!context.stats) {
            return res.json({ answer: "No active academic data available." });
        }

        // 7. Call LLM
        const workerUrl = process.env.LLM_WORKER_URL;
        const apiKey = process.env.LLM_WORKER_API_KEY;
        if (!workerUrl || !apiKey) return res.json({ answer: 'AI configuration missing.' });

        const systemPrompt = `You are an Academic Analytics Assistant for MIET.
Current Data Context:
- Total Courses: ${context.stats.totalActiveCourses}
- Total Students: ${context.stats.totalStudents}
- At-Risk Students: ${context.riskAnalysis.atRiskStudents} (Inactive >30 days)
- Silent Students: ${context.riskAnalysis.silentStudents} (Inactive 15-30 days)
- Global Submission Rate: ${context.stats.submissionRate}

Rules:
1. Answer strictly based on the provided Context Data.
2. If asked about "low engagement courses", reference courses with low student counts or high pending assignments.
3. If asked about "pending work", refer to the 'topPendingAssignments' list.
4. Do NOT invent data. If a specific course/student is not in the summary, say "I don't have details for that specific record in my summary view."
5. Provide concise, executive-style summaries.`;

        const response = await fetch(workerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Context Data: ${JSON.stringify(context)}\n\nUser Question: ${question}` }
                ]
            })
        });

        if (!response.ok) throw new Error('LLM Worker Error');
        const rawData = await response.json();
        const normalizedAnswer = normalizeAIResponse(rawData);

        res.json({ answer: normalizedAnswer, insights: normalizedAnswer });

    } catch (error) {
        console.error('AI Insights Error:', error);
        res.status(200).json({ answer: 'Error generating insights.', insights: 'Error generating insights.' });
    }
};
