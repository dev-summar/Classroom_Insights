import Course from '../models/Course.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';

/**
 * Normalizes responses from various AI providers into a single string.
 * Handles plain text, base64, and complex JSON shapes.
 */
const normalizeAIResponse = (data) => {
    if (!data) return "Required data is not available in the system.";

    let raw = data;

    // 1. Extract from object if provider returned a JSON object
    if (typeof data === 'object' && data !== null) {
        raw = data.answer || data.insights || data.response || data.output || data.content || data.message?.content || data.choices?.[0]?.message?.content || JSON.stringify(data);
    }

    // 2. Detect and unwrap stringified JSON (Handles nested output issues)
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                const parsed = JSON.parse(trimmed);
                raw = parsed.output || parsed.answer || parsed.insights || parsed.response || parsed.content || raw;
            } catch (e) {
                // Keep as raw if not valid JSON
            }
        }
    }

    // 3. Final formatting and Markdown stripping
    let text = String(raw);

    // Strip headings, emphasis, backticks, and other Markdown artifacts
    text = text
        .replace(/[#*`_~]/g, '')                // Remove #, *, `, _, ~
        .replace(/^>+ /gm, '')                   // Remove blockquote markers
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Resolve [links](url) to just the label
        .replace(/\s+/g, ' ')                   // Collapse excessive whitespace
        .trim();

    return text || "Required data is not available in the system.";
};

export const getAIInsights = async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ message: 'Question is required' });
        }

        const user = await User.findById(req.user.id || req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 1. Fetch Context Data (Stable logic)
        const courses = await Course.find({
            $or: [
                { ownerId: user.googleId },
                { teachers: user.googleId }
            ]
        });
        const courseIds = courses.map(c => c.id);
        const assignments = await Assignment.find({ courseId: { $in: courseIds } });
        const assignmentIds = assignments.map(a => a.id);
        const submissions = await Submission.find({ courseWorkId: { $in: assignmentIds } })
            .select('state courseId courseWorkId studentUserId');

        const dataSummary = {
            overview: {
                totalCourses: courses.length,
                totalAssignments: assignments.length,
                totalSubmissions: submissions.length
            },
            courses: courses.map(c => ({
                name: c.name,
                id: c.id,
                studentCount: c.students?.length || 0
            })),
            assignments: assignments.map(a => {
                const subs = submissions.filter(s => s.courseWorkId === a.id);
                const turnedIn = subs.filter(s => s.state === 'TURNED_IN' || s.state === 'RETURNED').length;
                return {
                    title: a.title,
                    courseId: a.courseId,
                    dueDate: a.dueDate ? `${a.dueDate.year}-${a.dueDate.month}-${a.dueDate.day}` : 'No due date',
                    submissionStats: {
                        turnedIn,
                        totalExpected: courses.find(c => c.id === a.courseId)?.students?.length || 0
                    }
                };
            })
        };

        // 2. LLM Worker Call
        const workerUrl = process.env.LLM_WORKER_URL;
        const apiKey = process.env.LLM_WORKER_API_KEY;

        if (!workerUrl || !apiKey) {
            return res.json({ answer: 'Required data is not available in the system.' });
        }

        const systemPrompt = `You are "MIET AI Insights Assistant". Analyze classroom data for MIET faculty.
        Answer ONLY based on the provided data. If data is insufficient, say: "Required data is not available in the system."
        No hallucinations. Professional tone. Markdown format.`;

        const userContent = `
        Context Data: ${JSON.stringify(dataSummary)}
        User Question: ${question}
        User Info: ${user.name} (${user.email})
        `;

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

        // 3. Robust Error Handling & Normalization
        if (!response.ok) {
            return res.json({ answer: 'Required data is not available in the system.' });
        }

        const rawData = await response.json();
        const normalizedAnswer = normalizeAIResponse(rawData);

        // 4. Final Response Contract (Dual compatibility for UI and Contract)
        res.json({
            answer: normalizedAnswer,
            insights: normalizedAnswer
        });

    } catch (error) {
        console.error('AI Insights Normalization Error:', error);
        res.status(200).json({
            answer: 'Required data is not available in the system.',
            insights: 'Required data is not available in the system.'
        });
    }
};
