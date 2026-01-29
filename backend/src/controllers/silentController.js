import Course from '../models/Course.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';

const SILENCE_THRESHOLDS = {
    INACTIVITY_DAYS: 14 // Default 14 days
};

export const getSilentStudents = async (req, res) => {
    try {
        const user = await User.findById(req.user.id || req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

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
        const silentStudents = [];

        for (const course of courses) {
            const studentIds = course.students || [];
            const courseAssignments = assignments.filter(a => a.courseId === course.id);

            // For a student to be silent, they must have zero submissions 
            // OR no activity in last SILENCE_THRESHOLDS.INACTIVITY_DAYS.

            for (const studentId of studentIds) {
                const student = await User.findOne({ googleId: studentId }).select('name email');
                const studentSubs = submissions.filter(s => s.courseId === course.id && s.studentUserId === studentId);

                const turnedInSubs = studentSubs.filter(s => s.state === 'TURNED_IN' || s.state === 'RETURNED');
                let lastActivityDate = null;

                turnedInSubs.forEach(sub => {
                    const subDate = new Date(sub.updateTime || sub.creationTime);
                    if (!lastActivityDate || subDate > lastActivityDate) {
                        lastActivityDate = subDate;
                    }
                });

                const daysSinceLastActivity = lastActivityDate
                    ? Math.floor((now - lastActivityDate) / (1000 * 60 * 60 * 24))
                    : Infinity;

                // Silent criteria: Has zero submissions OR inactive for X days
                const isSilent = turnedInSubs.length === 0 || daysSinceLastActivity >= SILENCE_THRESHOLDS.INACTIVITY_DAYS;

                if (isSilent) {
                    // Count missed assignments (due date passed but no turned-in submission)
                    const missedAssignments = courseAssignments.filter(a => {
                        if (!a.dueDate || !a.dueDate.year) return false;
                        const hours = a.dueTime?.hours ?? 23;
                        const minutes = a.dueTime?.minutes ?? 59;
                        const dueUTC = Date.UTC(a.dueDate.year, a.dueDate.month - 1, a.dueDate.day, hours, minutes, 59);
                        const sub = turnedInSubs.find(s => s.courseWorkId === a.id);
                        return now.getTime() > dueUTC && !sub;
                    }).length;

                    silentStudents.push({
                        studentId,
                        studentName: student?.name || 'Unknown',
                        courseName: course.name,
                        daysSinceLastActivity: daysSinceLastActivity === Infinity ? null : daysSinceLastActivity,
                        missedAssignments,
                        lastSubmissionDate: lastActivityDate ? lastActivityDate.toISOString().split('T')[0] : null
                    });
                }
            }
        }

        res.json(silentStudents);
    } catch (error) {
        console.error('Error fetching silent students:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const explainSilence = async (req, res) => {
    try {
        const { studentData } = req.body;
        if (!studentData) return res.status(400).json({ message: 'Student data required' });

        const workerUrl = process.env.LLM_WORKER_URL;
        const apiKey = process.env.LLM_WORKER_API_KEY;

        if (!workerUrl || !apiKey) {
            return res.json({ explanation: "AI explanation service is unconfigured." });
        }

        const systemPrompt = `You are an academic analyst. Explain the patterns of a "Silent Student" using neutral language. 
        Focus on inactivity markers and missed deadlines. Do not assume intent or performance quality.
        Do not use bold/markdown.`;

        const userContent = `Student: ${studentData.studentName}
        Course: ${studentData.courseName}
        Days Inactive: ${studentData.daysSinceLastActivity ?? 'Never Active'}
        Missed Assignments: ${studentData.missedAssignments}
        Last Submission: ${studentData.lastSubmissionDate || 'None'}`;

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
        const raw = data.response || data.message?.content || data.content || data.answer || JSON.stringify(data);
        const explanation = String(raw).replace(/[#*`_~]/g, '').trim();

        res.json({ explanation });
    } catch (error) {
        res.status(500).json({ explanation: "Unable to generate explanation." });
    }
};
