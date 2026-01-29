import Course from '../models/Course.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';

const RISK_THRESHOLDS = {
    MISSED_ASSIGNMENTS: 2,
    INACTIVITY_DAYS: 7,
    COMPLETION_RATE: 50
};

export const getAtRiskStudents = async (req, res) => {
    try {
        const user = await User.findById(req.user.id || req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // 1. Fetch accessible courses
        const courses = await Course.find({
            $or: [
                { ownerId: user.googleId },
                { teachers: user.googleId }
            ]
        });

        const courseIds = courses.map(c => c.id);
        const assignments = await Assignment.find({ courseId: { $in: courseIds } });
        const submissions = await Submission.find({ courseId: { $in: courseIds } });

        const now = new Date();
        const atRiskList = [];

        // 2. Iterate through each course to analyze students
        for (const course of courses) {
            const studentIds = course.students || [];
            const courseAssignments = assignments.filter(a => a.courseId === course.id);
            const passedAssignments = courseAssignments.filter(a => {
                if (!a.dueDate || !a.dueDate.year) return false;
                const hours = a.dueTime?.hours ?? 23;
                const minutes = a.dueTime?.minutes ?? 59;
                const dueUTC = Date.UTC(a.dueDate.year, a.dueDate.month - 1, a.dueDate.day, hours, minutes, 59);
                return now.getTime() > dueUTC;
            });

            if (passedAssignments.length === 0) continue;

            for (const studentId of studentIds) {
                const student = await User.findOne({ googleId: studentId }).select('name email');
                const studentSubs = submissions.filter(s => s.courseId === course.id && s.studentUserId === studentId);

                let missedCount = 0;
                let turnedInCount = 0;
                let lastActivityDate = null;

                passedAssignments.forEach(a => {
                    const sub = studentSubs.find(s => s.courseWorkId === a.id);
                    const isTurnedIn = sub && (sub.state === 'TURNED_IN' || sub.state === 'RETURNED');

                    if (isTurnedIn) {
                        turnedInCount++;
                        const subDate = new Date(sub.updateTime || sub.creationTime);
                        if (!lastActivityDate || subDate > lastActivityDate) {
                            lastActivityDate = subDate;
                        }
                    } else {
                        missedCount++;
                    }
                });

                const submissionRate = Math.round((turnedInCount / passedAssignments.length) * 100);
                const daysSinceLastActivity = lastActivityDate
                    ? Math.floor((now - lastActivityDate) / (1000 * 60 * 60 * 24))
                    : Infinity;

                const riskReasons = [];
                if (missedCount >= RISK_THRESHOLDS.MISSED_ASSIGNMENTS) {
                    riskReasons.push(`Missed ${missedCount} assignments`);
                }
                if (daysSinceLastActivity >= RISK_THRESHOLDS.INACTIVITY_DAYS) {
                    riskReasons.push(daysSinceLastActivity === Infinity
                        ? 'No recorded submission activity'
                        : `Inactive for ${daysSinceLastActivity} days`);
                }
                if (submissionRate < RISK_THRESHOLDS.COMPLETION_RATE) {
                    riskReasons.push(`Low submission rate (${submissionRate}%)`);
                }

                if (riskReasons.length > 0) {
                    atRiskList.push({
                        studentId,
                        studentName: student?.name || 'Unknown',
                        courseName: course.name,
                        missedAssignments: missedCount,
                        submissionRate,
                        daysSinceLastActivity: daysSinceLastActivity === Infinity ? null : daysSinceLastActivity,
                        riskReasons
                    });
                }
            }
        }

        res.json(atRiskList);
    } catch (error) {
        console.error('Error fetching at-risk students:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const explainAtRiskStatus = async (req, res) => {
    // Optional AI Explanation endpoint as requested
    // This will be used to generate a human-readable explanation using the same data
    try {
        const { studentData } = req.body;
        if (!studentData) return res.status(400).json({ message: 'Student data required' });

        const workerUrl = process.env.LLM_WORKER_URL;
        const apiKey = process.env.LLM_WORKER_API_KEY;

        if (!workerUrl || !apiKey) {
            return res.json({ explanation: "AI explanation service is currently unavailable." });
        }

        const systemPrompt = `You are an academic advisor. Explain why a student is flagged as "At-Risk" based on the data provided. 
        Use neutral, professional academic language. Do not predict outcomes or recommend disciplinary actions. 
        Focus strictly on the provided metrics. Do not use bold/markdown formatting.`;

        const userContent = `Student: ${studentData.studentName}
        Course: ${studentData.courseName}
        Missed Assignments: ${studentData.missedAssignments}
        Submission Rate: ${studentData.submissionRate}%
        Days since last activity: ${studentData.daysSinceLastActivity || 'N/A'}
        Risk Reasons: ${studentData.riskReasons.join(', ')}`;

        const response = await fetch(workerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'user',
                        content: `${systemPrompt}\n\n${userContent}`
                    }
                ]
            })
        });

        if (!response.ok) throw new Error('LLM Error');
        const data = await response.json();

        // Use normalization logic similar to aiController
        const raw = data.response || data.message?.content || data.content || data.answer || JSON.stringify(data);
        const explanation = String(raw).replace(/[#*`_~]/g, '').trim();

        res.json({ explanation });
    } catch (error) {
        res.status(500).json({ explanation: "Unable to generate explanation at this time." });
    }
};
