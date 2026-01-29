import Course from '../models/Course.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';

export const getCourses = async (req, res) => {
    try {
        const courses = await Course.find({});
        res.json(courses);
    } catch (error) {
        console.error('Error in getCourses:', error);
        res.status(500).json({ message: 'Error fetching courses' });
    }
};

// Get single course details with expanded teacher and student info
export const getCourseById = async (req, res) => {
    try {
        const course = await Course.findOne({ id: req.params.id });

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const teachers = await User.find({
            googleId: { $in: course.teachers || [] }
        }).select('name email picture googleId');

        const students = await User.find({
            googleId: { $in: course.students || [] }
        }).select('name email picture googleId');

        res.json({
            course,
            teachers,
            students
        });
    } catch (error) {
        console.error('Error in getCourseById:', error);
        res.status(500).json({ message: 'Error fetching course details' });
    }
};

// Get students for a specific course
export const getCourseStudents = async (req, res) => {
    try {
        const course = await Course.findOne({ id: req.params.id }).populate('students', 'name email picture');
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        // Permission check? 
        // If user is not teacher/admin/owner, maybe block access to roster?
        // Assuming middleware handles basic role. but specifically for this course?
        // For MVP, allow if in course.

        res.json(course.students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students' });
    }
};

// Get assignments (optional filter by courseId)
// Get assignments (optional filter by courseId)
export const getAssignments = async (req, res) => {
    try {
        const { courseId } = req.query;
        let query = {};

        if (courseId) {
            query.courseId = courseId;
        }

        const assignments = await Assignment.find(query).sort({ creationTime: -1 });
        res.json(assignments);
    } catch (error) {
        console.error('Error in getAssignments:', error);
        res.status(500).json({ message: 'Error fetching assignments' });
    }
};

// Get submissions (optional filter by assignmentId / studentUserId)
const getSubmissionStatus = (state, dueDate, dueTime) => {
    if (["TURNED_IN", "RETURNED"].includes(state)) {
        return "Turned In";
    }

    if (!dueDate || !dueDate.year) {
        return "Assigned";
    }

    const now = new Date();
    const hours = dueTime?.hours ?? 23;
    const minutes = dueTime?.minutes ?? 59;

    // Classroom months are 1-indexed, JS Date.UTC months are 0-indexed
    const dueUTC = Date.UTC(
        dueDate.year,
        dueDate.month - 1,
        dueDate.day,
        hours,
        minutes,
        59
    );

    // Treat non-terminal states (null, CREATED, NEW, RECLAIMED_BY_STUDENT) as pending
    return now.getTime() < dueUTC ? "Assigned" : "Missing";
};

export const getSubmissions = async (req, res) => {
    try {
        const { assignmentId, studentId } = req.query;
        let query = {};

        if (assignmentId) query.courseWorkId = assignmentId;
        if (studentId) query.studentUserId = studentId;

        const submissions = await Submission.find(query).sort({ creationTime: -1 });

        const enrichedSubmissions = await Promise.all(submissions.map(async (s) => {
            const [student, course, assignment] = await Promise.all([
                User.findOne({ googleId: s.studentUserId }).select('name email'),
                Course.findOne({ id: s.courseId }).select('name'),
                Assignment.findOne({ id: s.courseWorkId }).select('title dueDate dueTime')
            ]);

            return {
                ...s.toObject(),
                student: student ? { name: student.name, email: student.email } : null,
                courseName: course ? course.name : 'Unknown Course',
                assignmentTitle: assignment ? assignment.title : 'Unknown Assignment',
                displayStatus: getSubmissionStatus(s.state, assignment?.dueDate, assignment?.dueTime)
            };
        }));

        res.json(enrichedSubmissions);
    } catch (error) {
        console.error('Error in getSubmissions:', error);
        res.status(500).json({ message: 'Error fetching submissions' });
    }
};

export const getCourseSilentStudents = async (req, res) => {
    try {
        const { id } = req.params;
        const course = await Course.findOne({ id });
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const studentGoogleIds = course.students || [];
        const assignments = await Assignment.find({ courseId: id });
        const submissions = await Submission.find({ courseId: id });

        // Criteria: Has there been at least one assignment where the due date/time has passed?
        const now = new Date();
        const hasPassedAssignments = assignments.some(a => {
            if (!a.dueDate || !a.dueDate.year) return false;
            const hours = a.dueTime?.hours ?? 23;
            const minutes = a.dueTime?.minutes ?? 59;
            const dueUTC = Date.UTC(a.dueDate.year, a.dueDate.month - 1, a.dueDate.day, hours, minutes, 59);
            return now.getTime() > dueUTC;
        });

        const report = await Promise.all(studentGoogleIds.map(async (gid) => {
            const student = await User.findOne({ googleId: gid }).select('name email picture googleId');
            const studentSubs = submissions.filter(s => s.studentUserId === gid);

            let missingCount = 0;
            let assignedCount = 0;
            let turnedInCount = 0;

            assignments.forEach(a => {
                const sub = studentSubs.find(s => s.courseWorkId === a.id);
                // If no record, it's 'CREATED' in Classroom terms but null here to trigger 'Assigned'/'Missing' check
                const state = sub ? sub.state : null;
                const status = getSubmissionStatus(state, a.dueDate, a.dueTime);

                if (status === 'Turned In') turnedInCount++;
                else if (status === 'Missing') missingCount++;
                else assignedCount++;
            });

            // Silent rule: zero turnedIn AND at least one missing AND course has passed assignments
            const isSilent = assignments.length > 0 && hasPassedAssignments && turnedInCount === 0 && missingCount > 0;

            return {
                studentId: gid,
                name: student?.name || 'Unknown',
                email: student?.email || 'N/A',
                picture: student?.picture,
                missingCount,
                assignedCount,
                turnedInCount,
                silent: isSilent
            };
        }));

        res.json(report);
    } catch (error) {
        console.error('Error in getCourseSilentStudents:', error);
        res.status(500).json({ message: 'Error generating report' });
    }
};
