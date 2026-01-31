
import Course from '../models/Course.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import Teacher from '../models/Teacher.js';

import { ACTIVE_COURSE_FILTER } from '../utils/courseFilters.js';
import { getUniqueActiveCourseIds } from '../utils/dashboardMetrics.js';

/**
 * API Controller - Institutional View.
 * All queries use the shared ACTIVE_COURSE_FILTER to ensure consistency with the Dashboard.
 * Sync-user filtering is removed to present a unified institute-wide footprint.
 */

export const getCourses = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 20);
        const skip = (page - 1) * limit;

        console.log(`[API] Fetching active courses page ${page} with limit ${limit}...`);

        const pipeline = [
            { $match: ACTIVE_COURSE_FILTER },
            {
                $lookup: {
                    from: 'assignments',
                    localField: 'id',
                    foreignField: 'courseId',
                    as: 'assignmentDocs'
                }
            },
            {
                $addFields: {
                    teachersCount: { $size: { $ifNull: [{ $setUnion: ["$teachers", []] }, []] } },
                    studentsCount: { $size: { $ifNull: [{ $setUnion: ["$students", []] }, []] } },
                    assignmentsCount: { $size: "$assignmentDocs" }
                }
            },
            {
                $facet: {
                    metadata: [{ $count: "totalItems" }],
                    data: [
                        { $sort: { name: 1 } },
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $project: {
                                _id: 0,
                                courseId: "$id",
                                name: 1,
                                section: 1,
                                teachersCount: 1,
                                studentsCount: 1,
                                assignmentsCount: 1
                            }
                        }
                    ]
                }
            }
        ];

        const results = await Course.aggregate(pipeline);

        const metadata = results[0].metadata[0] || { totalItems: 0 };
        const items = results[0].data;

        res.json({
            items,
            pagination: {
                page,
                limit,
                totalItems: metadata.totalItems,
                totalPages: Math.ceil(metadata.totalItems / limit)
            }
        });

    } catch (error) {
        console.error('Error in getCourses:', error);
        res.status(500).json({ message: 'Error fetching courses' });
    }
};

// Get single course details with expanded teacher and student info
export const getCourseById = async (req, res) => {
    try {
        const course = await Course.findOne({
            id: req.params.id,
            ...ACTIVE_COURSE_FILTER
        });

        if (!course) {
            const archivedCourse = await Course.findOne({ id: req.params.id });
            if (archivedCourse) {
                return res.status(403).json({
                    message: 'Access Denied: This course is archived.',
                    courseState: archivedCourse.courseState
                });
            }
            return res.status(404).json({ message: 'Course not found or archived' });
        }

        const teachersData = await Teacher.find({ courseId: req.params.id });
        const teacherIds = teachersData.map(t => t.userId);
        const users = await User.find({ googleId: { $in: teacherIds } });

        const teachers = teachersData.map(td => {
            const user = users.find(u => u.googleId === td.userId);
            return {
                googleId: td.userId,
                name: td.fullName,
                email: td.emailAddress,
                picture: user?.picture
            };
        });

        const students = await User.find({
            googleId: { $in: course.students || [] }
        }).select('name email picture googleId');

        res.json({
            course,
            teachers,
            teacherCount: teachers.length,
            students
        });
    } catch (error) {
        console.error('Error in getCourseById:', error);
        res.status(500).json({ message: 'Error fetching course details' });
    }
};

export const getCourseTeachers = async (req, res) => {
    try {
        const course = await Course.findOne({ id: req.params.id, ...ACTIVE_COURSE_FILTER });
        if (!course) return res.status(404).json({ message: 'Course not found or inactive' });

        const teachers = await Teacher.find({ courseId: req.params.id });
        res.json(teachers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching teachers' });
    }
};

export const getCourseStudents = async (req, res) => {
    try {
        const course = await Course.findOne({ id: req.params.id, ...ACTIVE_COURSE_FILTER });
        if (!course) return res.status(404).json({ message: 'Course not found or inactive' });

        const students = await User.find({ googleId: { $in: course.students } }).select('name email picture');
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students' });
    }
};

export const getAssignments = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 20);
        const skip = (page - 1) * limit;

        console.log(`[API] Fetching assignments page ${page} with limit ${limit}...`);

        const pipeline = [
            // 1. Join with Course to filter ACTIVE courses and get course name
            {
                $lookup: {
                    from: 'courses',
                    localField: 'courseId',
                    foreignField: 'id',
                    as: 'course'
                }
            },
            { $unwind: "$course" },
            { $match: { "course.courseState": "ACTIVE" } },
            // 2. Join with Submissions to count ONLY persisted submissions
            {
                $lookup: {
                    from: 'submissions',
                    let: { googleCourseWorkId: "$id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$courseWorkId", "$$googleCourseWorkId"] } } }
                    ],
                    as: 'submissions'
                }
            },
            {
                $addFields: {
                    submissionsCount: { $size: "$submissions" }
                }
            },
            {
                $facet: {
                    metadata: [{ $count: "totalItems" }],
                    data: [
                        { $sort: { creationTime: -1 } },
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $project: {
                                _id: 0,
                                assignmentId: "$id",
                                title: 1,
                                courseId: 1,
                                courseName: "$course.name",
                                dueDate: 1,
                                submissionsCount: 1
                            }
                        }
                    ]
                }
            }
        ];

        const results = await Assignment.aggregate(pipeline);

        const metadata = results[0].metadata[0] || { totalItems: 0 };
        const items = results[0].data;

        res.json({
            items,
            pagination: {
                page,
                limit,
                totalItems: metadata.totalItems,
                totalPages: Math.ceil(metadata.totalItems / limit)
            }
        });

    } catch (error) {
        console.error('Error in getAssignments:', error);
        res.status(500).json({ message: 'Error fetching assignments' });
    }
};

const getSubmissionStatus = (state, dueDate, dueTime) => {
    if (["TURNED_IN", "RETURNED"].includes(state)) return "Turned In";
    if (!dueDate || !dueDate.year) return "Assigned";
    const now = new Date();
    const hours = dueTime?.hours ?? 23;
    const minutes = dueTime?.minutes ?? 59;
    const dueUTC = Date.UTC(dueDate.year, dueDate.month - 1, dueDate.day, hours, minutes, 59);
    return now.getTime() < dueUTC ? "Assigned" : "Missing";
};

export const getSubmissions = async (req, res) => {
    try {
        const { assignmentId, studentId, courseId } = req.query;

        let query = {};

        if (courseId) {
            const course = await Course.findOne({ id: courseId, ...ACTIVE_COURSE_FILTER });
            if (!course) return res.json([]);
            query.courseId = courseId;
        } else {
            const activeCourses = await Course.find(ACTIVE_COURSE_FILTER).select('id');
            query.courseId = { $in: activeCourses.map(c => c.id) };
        }

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
        const course = await Course.findOne({ id, ...ACTIVE_COURSE_FILTER });
        if (!course) return res.status(404).json({ message: 'Course not found or inactive' });

        const studentGoogleIds = course.students || [];
        const assignments = await Assignment.find({ courseId: id });
        const submissions = await Submission.find({ courseId: id });

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
            let turnedInCount = 0;

            assignments.forEach(a => {
                const sub = studentSubs.find(s => s.courseWorkId === a.id);
                const status = getSubmissionStatus(sub ? sub.state : null, a.dueDate, a.dueTime);
                if (status === 'Turned In') turnedInCount++;
                else if (status === 'Missing') missingCount++;
            });

            return {
                studentId: gid,
                name: student?.name || 'Unknown',
                email: student?.email || 'N/A',
                picture: student?.picture,
                missingCount,
                turnedInCount,
                silent: assignments.length > 0 && hasPassedAssignments && turnedInCount === 0 && missingCount > 0
            };
        }));

        res.json(report);
    } catch (error) {
        res.status(500).json({ message: 'Error generating report' });
    }
};

export const getStudents = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 20);
        const skip = (page - 1) * limit;

        console.log(`[API] Fetching students page ${page} with limit ${limit}...`);

        const pipeline = [
            { $match: ACTIVE_COURSE_FILTER },
            { $unwind: "$students" },
            {
                $group: {
                    _id: "$students",
                    enrolledCoursesCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'googleId',
                    as: 'user'
                }
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    userId: "$_id",
                    name: { $ifNull: ["$user.name", "Unknown"] },
                    email: { $ifNull: ["$user.email", "Unknown"] },
                    academicStatus: { $ifNull: ["$user.academicStatus", "ACTIVE"] },
                    enrolledCoursesCount: 1
                }
            },
            {
                $facet: {
                    metadata: [{ $count: "totalItems" }],
                    data: [
                        { $sort: { name: 1 } },
                        { $skip: skip },
                        { $limit: limit }
                    ]
                }
            }
        ];

        const results = await Course.aggregate(pipeline);

        const metadata = results[0].metadata[0] || { totalItems: 0 };
        const items = results[0].data;

        res.json({
            items,
            pagination: {
                page,
                limit,
                totalItems: metadata.totalItems,
                totalPages: Math.ceil(metadata.totalItems / limit)
            }
        });

    } catch (error) {
        console.error('Error in getStudents:', error);
        res.status(500).json({ message: 'Error fetching students' });
    }
};
