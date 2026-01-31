import Course from '../models/Course.js';
import Teacher from '../models/Teacher.js';
import User from '../models/User.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import { ACTIVE_COURSE_FILTER } from '../utils/courseFilters.js';
import NodeCache from 'node-cache';

const sidebarCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

/**
 * Sidebar APIs - optimized for instant reads (< 200ms).
 * Rules:
 * - find() only (no aggregations)
 * - Indexed queries
 * - Pre-computed metrics only
 */

export const getCourses = async (req, res) => {
    console.time('sidebar_courses');
    try {
        const cached = sidebarCache.get('courses');
        if (cached) return res.json(cached);

        const courses = await Course.find(
            { courseState: 'ACTIVE' },
            {
                id: 1,
                name: 1,
                section: 1,
                studentCount: 1,
                teacherCount: 1,
                assignmentCount: 1,
                alternateLink: 1
            }
        ).sort({ name: 1 }).limit(100);

        sidebarCache.set('courses', courses);
        console.timeEnd('sidebar_courses');
        res.json(courses);
    } catch (error) {
        console.timeEnd('sidebar_courses');
        console.error('Sidebar Courses Error:', error);
        res.status(500).json({ message: 'Error fetching optimized courses list' });
    }
};

export const getTeachers = async (req, res) => {
    console.time('sidebar_teachers');
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 10); // Default to 10 as per requirements
        const skip = (page - 1) * limit;

        const cacheKey = `teachers_page_${page}_limit_${limit}`;
        const cached = sidebarCache.get(cacheKey);
        if (cached) return res.json(cached);

        // Fetch ACTIVE course IDs first to ensure count accuracy
        // Rule: Apply filter BEFORE grouping
        const activeCourses = await Course.find({ courseState: 'ACTIVE' }).select('id');
        const activeCourseIds = activeCourses.map(c => c.id);

        // CRITICAL FIX: Aggregate from Teacher collection (actual classroom data)
        // Filter by ACTIVE courses to match Dashboard totals
        const result = await Teacher.aggregate([
            {
                $match: {
                    courseId: { $in: activeCourseIds }
                }
            },
            // Group by userId to get unique teachers and count their ACTIVE courses
            {
                $group: {
                    _id: "$userId",
                    totalCourses: { $sum: 1 },
                    fullName: { $first: "$fullName" },
                    emailAddress: { $first: "$emailAddress" }
                }
            },
            // Join with User collection to get profile picture & resolved name
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'googleId',
                    as: 'userProfile'
                }
            },
            {
                $unwind: {
                    path: "$userProfile",
                    preserveNullAndEmptyArrays: true
                }
            },
            // Project final structure matching frontend expectations
            {
                $project: {
                    _id: 0,
                    googleId: "$_id",
                    name: { $ifNull: ["$userProfile.name", "$fullName"] }, // Resolve name from users collection
                    email: "$emailAddress",
                    totalCourses: 1,
                    picture: "$userProfile.picture"
                }
            },
            { $sort: { totalCourses: -1, name: 1 } },
            {
                $facet: {
                    metadata: [{ $count: "totalItems" }],
                    data: [
                        { $skip: skip },
                        { $limit: limit }
                    ]
                }
            }
        ]);

        const metadata = result[0].metadata[0] || { totalItems: 0 };
        const teachers = result[0].data;

        const response = {
            items: teachers,
            pagination: {
                page,
                limit,
                total: metadata.totalItems,
                totalPages: Math.ceil(metadata.totalItems / limit)
            }
        };

        sidebarCache.set(cacheKey, response);
        console.timeEnd('sidebar_teachers');
        console.log(`[SIDEBAR] Returned ${teachers.length} teachers (Page ${page})`);
        res.json(response);
    } catch (error) {
        console.timeEnd('sidebar_teachers');
        console.error('Sidebar Teachers Error:', error);
        res.status(500).json({ message: 'Error fetching optimized teachers list' });
    }
};

export const getStudents = async (req, res) => {
    console.time('sidebar_students');
    try {
        const cached = sidebarCache.get('students_with_status');
        if (cached) {
            console.timeEnd('sidebar_students');
            return res.json(cached);
        }

        const activeCourses = await Course.find({ courseState: 'ACTIVE' }, { id: 1, students: 1 }).lean();
        const activeCourseIds = activeCourses.map(c => c.id);

        const [allAssignments, allSubs] = await Promise.all([
            Assignment.find({ courseId: { $in: activeCourseIds } }, { id: 1, courseId: 1, dueDate: 1 }).lean(),
            Submission.find({ courseId: { $in: activeCourseIds }, state: { $in: ['TURNED_IN', 'RETURNED'] } }, { userId: 1, creationTime: 1 }).sort({ userId: 1, creationTime: -1 }).lean()
        ]);

        // Pre-process
        const lastSubMap = new Map();
        allSubs.forEach(s => {
            if (!lastSubMap.has(s.userId)) lastSubMap.set(s.userId, s.creationTime);
        });

        const courseHasExpectations = new Map();
        allAssignments.forEach(a => {
            if (a.dueDate?.year) courseHasExpectations.set(a.courseId, true);
        });

        const now = new Date();

        const students = await Course.aggregate([
            { $match: { courseState: 'ACTIVE' } },
            { $unwind: "$students" },
            {
                $group: {
                    _id: "$students",
                    totalCourses: { $sum: 1 },
                    courseIds: { $push: "$id" }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'googleId',
                    as: 'userProfile'
                }
            },
            {
                $unwind: {
                    path: "$userProfile",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 0,
                    googleId: "$_id",
                    name: { $ifNull: ["$userProfile.name", "Unknown Student"] },
                    email: { $ifNull: ["$userProfile.email", "Not Available"] },
                    totalCourses: 1,
                    courseIds: 1,
                    picture: "$userProfile.picture"
                }
            },
            { $sort: { name: 1 } },
            { $limit: 200 } // Increased limit for general list
        ]);

        // Post-process statuses
        const items = students.map(s => {
            const lastDate = lastSubMap.get(s.googleId);
            const daysInactive = lastDate ? Math.floor((now - lastDate) / (1000 * 60 * 60 * 24)) : null;

            const hasExpectations = s.courseIds.some(cId => courseHasExpectations.has(cId));

            let status = 'ACTIVE';
            if (!hasExpectations) {
                status = 'NOT_APPLICABLE';
            } else if (!lastDate || daysInactive >= 30) {
                status = 'AT_RISK';
            } else if (daysInactive >= 15) {
                status = 'SILENT';
            }

            return { ...s, status, daysSinceLastActivity: daysInactive };
        });

        sidebarCache.set('students_with_status', items);
        console.timeEnd('sidebar_students');
        res.json(items);
    } catch (error) {
        console.timeEnd('sidebar_students');
        console.error('Sidebar Students Error:', error);
        res.status(500).json({ message: 'Error fetching students with status' });
    }
};

export const getAssignments = async (req, res) => {
    console.time('sidebar_assignments');
    try {
        const { courseId } = req.query;
        const cacheKey = `assignments_${courseId || 'all'}`;
        const cached = sidebarCache.get(cacheKey);
        if (cached) return res.json(cached);

        let matchQuery = {};
        if (courseId && courseId !== 'all') {
            matchQuery.courseId = courseId;
        } else {
            const activeCourses = await Course.find({ courseState: 'ACTIVE' }).select('id');
            const activeCourseIds = activeCourses.map(c => c.id);
            matchQuery.courseId = { $in: activeCourseIds };
        }

        const assignments = await Assignment.aggregate([
            { $match: matchQuery },
            { $sort: { creationTime: -1 } },
            { $limit: 100 },
            // Join with User collection to resolve creator name
            {
                $lookup: {
                    from: 'users',
                    localField: 'creatorUserId',
                    foreignField: 'googleId',
                    as: 'creatorInfo'
                }
            },
            { $unwind: { path: '$creatorInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    id: 1,
                    courseId: 1,
                    title: 1,
                    courseName: 1,
                    dueDate: 1,
                    submissionCount: 1,
                    alternateLink: 1,
                    creationTime: 1,
                    creatorName: { $ifNull: ['$creatorInfo.name', 'Unknown Teacher'] },
                    creatorPicture: '$creatorInfo.picture'
                }
            }
        ]);

        sidebarCache.set(cacheKey, assignments);
        console.timeEnd('sidebar_assignments');
        console.log(`[SIDEBAR] Returned ${assignments.length} assignments`);
        res.json(assignments);
    } catch (error) {
        console.timeEnd('sidebar_assignments');
        console.error('Sidebar Assignments Error:', error);
        res.status(500).json({ message: 'Error fetching optimized assignments list', error: error.message });
    }
};

const determineDerivedStatus = (state, dueDate, dueTime) => {
    if (["TURNED_IN", "RETURNED"].includes(state)) {
        return "SUBMITTED";
    }

    if (!dueDate || !dueDate.year) {
        return "PENDING";
    }

    const now = new Date();
    const hours = dueTime?.hours ?? 23;
    const minutes = dueTime?.minutes ?? 59;

    // Create UTC date for comparison
    const dueUTC = Date.UTC(dueDate.year, dueDate.month - 1, dueDate.day, hours, minutes, 59);

    if (now.getTime() <= dueUTC) {
        return "PENDING";
    } else {
        return "MISSED";
    }
};

export const getSubmissions = async (req, res) => {
    console.time('sidebar_submissions');
    try {
        const { courseId, status } = req.query;
        const cacheKey = `submissions_${courseId || 'all'}_${status || 'all'}`;
        const cached = sidebarCache.get(cacheKey);
        if (cached) return res.json(cached);

        let matchQuery = {};
        if (courseId && courseId !== 'all') matchQuery.courseId = courseId;

        // Handle legacy/DB status filters if passed (for backward compatibility)
        if (status && !['all', 'SUBMITTED', 'PENDING', 'MISSED'].includes(status)) {
            matchQuery.state = status;
        }

        // Optimized aggregation with Assignment Lookup for DueDate
        const submissions = await Submission.aggregate([
            { $match: matchQuery },
            { $sort: { creationTime: -1 } },
            { $limit: 200 }, // Fetch more to allow for in-memory filtering of derived statuses
            // Join with Assignment to get Due Date
            {
                $lookup: {
                    from: 'assignments',
                    localField: 'courseWorkId',
                    foreignField: 'id',
                    as: 'assignmentInfo'
                }
            },
            { $unwind: { path: '$assignmentInfo', preserveNullAndEmptyArrays: true } },
            // Join with User collection to resolve student name
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: 'googleId',
                    as: 'studentInfo'
                }
            },
            { $unwind: { path: '$studentInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    id: 1,
                    courseId: 1,
                    courseWorkId: 1,
                    userId: 1,
                    courseName: 1,
                    assignmentTitle: 1,
                    state: 1,
                    creationTime: 1,
                    dueDate: "$assignmentInfo.dueDate", // Project Due Date
                    dueTime: "$assignmentInfo.dueTime", // Project Due Time
                    studentName: { $ifNull: ['$studentInfo.name', { $ifNull: ['$studentName', 'Unknown Student'] }] },
                    studentEmail: { $ifNull: ['$studentInfo.email', { $ifNull: ['$studentEmail', 'Not Shared'] }] },
                    studentPicture: '$studentInfo.picture'
                }
            }
        ]);

        // Post-process to add derivedStatus and optional filtering
        let processedSubmissions = submissions.map(s => {
            const derivedStatus = determineDerivedStatus(s.state, s.dueDate, s.dueTime);
            return { ...s, derivedStatus };
        });

        // Apply derived status filtering if requested
        if (status && ['SUBMITTED', 'PENDING', 'MISSED'].includes(status)) {
            processedSubmissions = processedSubmissions.filter(s => s.derivedStatus === status);
        }

        // Limit back to 100 after filtering
        const finalResults = processedSubmissions.slice(0, 100);

        sidebarCache.set(cacheKey, finalResults);
        console.timeEnd('sidebar_submissions');
        console.log(`[SIDEBAR] Returned ${finalResults.length} submissions (derived)`);
        res.json(finalResults);
    } catch (error) {
        console.timeEnd('sidebar_submissions');
        console.error('Sidebar Submissions Error:', error);
        res.status(500).json({ message: 'Error fetching optimized submissions list' });
    }
};
