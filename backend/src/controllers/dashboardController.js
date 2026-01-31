
import Course from '../models/Course.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import Teacher from '../models/Teacher.js';
import { getUniqueActiveCourseIds } from '../utils/dashboardMetrics.js';
import { ACTIVE_COURSE_FILTER } from '../utils/courseFilters.js';

import dashboardCache from '../utils/cache.js';

/**
 * Dashboard KPIs - Dedicated to Institutional Deduplicated View.
 * Enforces ACTIVE_COURSE_FILTER as the first stage and deduplicates by Google Course ID.
 */
export const getDashboardStats = async (req, res) => {
    try {
        // 0. Check Cache First (Rule: Fast Dashboard Load)
        const cachedData = dashboardCache.get('dashboard_stats');
        if (cachedData) {
            console.log("[DASHBOARD] Serving stats from cache");
            return res.json(cachedData);
        }

        // 1. Get Unique Active Course IDs (Source of Truth)
        const activeCourseIds = await getUniqueActiveCourseIds();
        const totalCourses = activeCourseIds.length;

        // 2. DEDUPLICATED STUDENT COUNT
        const studentAggregation = await Course.aggregate([
            { $match: { id: { $in: activeCourseIds } } },
            { $unwind: "$students" },
            { $group: { _id: "$students" } },
            { $count: "count" }
        ]);
        const totalStudents = studentAggregation[0]?.count || 0;

        // 3. DEDUPLICATED TEACHER COUNT & OVERVIEW 
        const teachersOverview = await Teacher.aggregate([
            { $match: { courseId: { $in: activeCourseIds } } },
            {
                $group: {
                    _id: "$userId",
                    name: { $first: "$fullName" },
                    email: { $first: "$emailAddress" },
                    totalCourses: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    userId: "$_id",
                    email: 1,
                    name: 1,
                    totalCourses: 1
                }
            },
            { $sort: { totalCourses: -1, name: 1 } }
        ]);
        const totalTeachers = teachersOverview.length;

        // 4. ASSIGNMENTS & SUBMISSIONS (Aggregation from DB) (Rule 3)
        // We aggregate relative to assignments belonging to active courses
        const assignmentMetrics = await Assignment.aggregate([
            { $match: { courseId: { $in: activeCourseIds } } },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'courseId',
                    foreignField: 'id',
                    as: 'course'
                }
            },
            { $unwind: "$course" },
            {
                $lookup: {
                    from: 'submissions',
                    let: { cId: "$courseId", aId: "$id" },
                    pipeline: [
                        { $match: { $expr: { $and: [{ $eq: ["$courseId", "$$cId"] }, { $eq: ["$courseWorkId", "$$aId"] }] } } }
                    ],
                    as: 'subs'
                }
            },
            {
                $project: {
                    expected: { $size: { $ifNull: ["$course.students", []] } },
                    submitted: {
                        $size: {
                            $filter: {
                                input: "$subs",
                                as: "s",
                                cond: { $in: ["$$s.state", ["TURNED_IN", "RETURNED"]] }
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAssignments: { $sum: 1 },
                    totalExpected: { $sum: "$expected" },
                    totalSubmitted: { $sum: "$submitted" }
                }
            }
        ]);

        const metricData = assignmentMetrics[0] || { totalAssignments: 0, totalExpected: 0, totalSubmitted: 0 };
        const totalAssignments = metricData.totalAssignments;
        const submittedCount = metricData.totalSubmitted;
        const pendingCount = Math.max(0, metricData.totalExpected - submittedCount);

        // DEDUPLICATED STUDENT LIST & SUBMISSIONS
        const [activeCoursesWithStudents, allActiveAssignments, allStudentSubs] = await Promise.all([
            Course.find({ courseState: 'ACTIVE' }, { id: 1, students: 1 }).lean(),
            Assignment.find({ courseId: { $in: activeCourseIds } }).lean(),
            Submission.find({ courseId: { $in: activeCourseIds }, state: { $in: ['TURNED_IN', 'RETURNED'] } }, { userId: 1, creationTime: 1, late: 1, courseWorkId: 1 }).lean()
        ]);

        const totalUniqueStudents = totalStudents;
        const now = new Date();
        const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const subMap = new Map();
        const lastSubMap = new Map();
        allStudentSubs.forEach(s => {
            if (!subMap.has(s.userId)) subMap.set(s.userId, new Set());
            subMap.get(s.userId).add(s.courseWorkId);
            if (!lastSubMap.has(s.userId) || s.creationTime > lastSubMap.get(s.userId)) lastSubMap.set(s.userId, s.creationTime);
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
            if (courseAssigns.length === 0) return;

            const courseWithDueDates = courseAssigns.filter(a => a.dueDate?.year);
            const assignmentsDueInLast30 = courseWithDueDates.filter(a => {
                const dueUTC = Date.UTC(a.dueDate.year, a.dueDate.month - 1, a.dueDate.day, a.dueTime?.hours ?? 23, a.dueTime?.minutes ?? 59, 59);
                return dueUTC >= thirtyDaysAgo.getTime();
            });

            (course.students || []).forEach(studentId => {
                const lastDate = lastSubMap.get(studentId);
                const daysInactive = lastDate ? Math.floor((now - lastDate) / (1000 * 60 * 60 * 24)) : null;

                // Improved Academic Status Logic
                const hasExpectations = courseWithDueDates.length > 0;

                if (hasExpectations) {
                    const isAtRisk = (!lastDate || daysInactive >= 30);

                    if (isAtRisk) {
                        atRiskSet.add(studentId);
                    } else {
                        // Check for Extended Silent Logic
                        const isSilentInactivity = (daysInactive >= 15 && daysInactive < 30);

                        // Chronic Missed check
                        const userSubs = subMap.get(studentId) || new Set();
                        const missedInLast30 = assignmentsDueInLast30.filter(a => !userSubs.has(a.courseWorkId));
                        const isChronicMissed = (courseWithDueDates.length >= 4) && (missedInLast30.length >= 4);

                        if (isSilentInactivity || isChronicMissed) {
                            silentSet.add(studentId);
                        }
                    }
                }
            });
        });

        // 5. VERIFICATION LOG
        console.log("[DASHBOARD VERIFY]", {
            activeCourses: totalCourses,
            uniqueTeachers: totalTeachers,
            uniqueStudents: totalStudents,
            totalAssignments: totalAssignments,
            submitted: submittedCount
        });

        const responseData = {
            courses: totalCourses,
            students: totalStudents,
            teachers: totalTeachers,
            assignments: totalAssignments,
            submitted: submittedCount,
            pending: pendingCount,
            atRisk: atRiskSet.size,
            silent: silentSet.size,
            maxInactivity: Math.max(...Array.from(lastSubMap.values()).map(d => Math.floor((now - d) / (1000 * 60 * 60 * 24))), 0),
            stats: {
                totalActiveCourses: totalCourses,
                totalStudents: totalStudents,
                totalTeachers: totalTeachers
            },
            teachersOverview: teachersOverview
        };

        // Cache the result
        dashboardCache.set('dashboard_stats', responseData);

        res.json(responseData);

    } catch (error) {
        console.error('[DASHBOARD ERROR]', error);
        res.status(500).json({ message: 'Error fetching deduplicated dashboard metrics' });
    }
};

/**
 * GET /api/dashboard/charts
 * Provides aggregated chart data for the dashboard (engagement, top assignments).
 */
export const getDashboardCharts = async (req, res) => {
    try {
        const cachedCharts = dashboardCache.get('dashboard_charts');
        if (cachedCharts) {
            return res.json(cachedCharts);
        }

        const activeCourseIds = await getUniqueActiveCourseIds();

        // 1. Engagement Data (Latest 6 Assignments)
        const engagementAgg = await Assignment.aggregate([
            { $match: { courseId: { $in: activeCourseIds } } },
            { $sort: { creationTime: -1 } },
            { $limit: 6 },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'courseId',
                    foreignField: 'id',
                    as: 'course'
                }
            },
            { $unwind: "$course" },
            {
                $lookup: {
                    from: 'submissions',
                    let: { cId: "$courseId", aId: "$id" },
                    pipeline: [
                        { $match: { $expr: { $and: [{ $eq: ["$courseId", "$$cId"] }, { $eq: ["$courseWorkId", "$$aId"] }] } } }
                    ],
                    as: 'subs'
                }
            },
            {
                $project: {
                    _id: 0,
                    id: 1,
                    title: 1,
                    submitted: {
                        $size: {
                            $filter: {
                                input: "$subs",
                                as: "s",
                                cond: { $in: ["$$s.state", ["TURNED_IN", "RETURNED"]] }
                            }
                        }
                    },
                    total: { $size: { $ifNull: ["$course.students", []] } }
                }
            }
        ]);

        const chartData = engagementAgg.map(a => ({
            name: a.title.length > 15 ? a.title.substring(0, 12) + '...' : a.title,
            fullTitle: a.title,
            submitted: a.submitted,
            total: a.total
        }));

        // 2. Top Assignments Progress (Sorted by percentage or just latest)
        const topAssignments = engagementAgg.slice(0, 4).map(a => ({
            id: a.id,
            title: a.title,
            percentage: a.total > 0 ? Math.round((a.submitted / a.total) * 100) : 0,
            count: `${a.submitted}/${a.total}`
        }));

        const responseData = {
            engagement: chartData,
            topAssignments: topAssignments
        };

        dashboardCache.set('dashboard_charts', responseData);

        res.json(responseData);
    } catch (error) {
        console.error('[CHARTS ERROR]', error);
        res.status(500).json({ message: 'Error fetching chart data' });
    }
};

/**
 * GET /api/dashboard/teachers-overview
 * Provides a sorted list of teachers and their active course load.
 */
export const getTeachersOverview = async (req, res) => {
    try {
        const activeCourseIds = await getUniqueActiveCourseIds();

        // NOTE: Group by userId (NOT emailAddress) to handle no-email-* users correctly
        const teachersOverview = await Teacher.aggregate([
            { $match: { courseId: { $in: activeCourseIds } } },
            {
                $group: {
                    _id: "$userId", // Changed from emailAddress to userId
                    name: { $first: "$fullName" },
                    email: { $first: "$emailAddress" },
                    totalCourses: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    userId: "$_id",
                    email: "$email",
                    name: "$name",
                    totalCourses: "$totalCourses"
                }
            },
            { $sort: { totalCourses: -1, name: 1 } }
        ]);

        res.json({
            totalTeachers: teachersOverview.length,
            teachers: teachersOverview
        });
    } catch (error) {
        console.error('[TEACHERS OVERVIEW ERROR]', error);
        res.status(500).json({ message: 'Error fetching teachers overview' });
    }
};

/**
 * GET /api/dashboard/teachers/:userId/courses
 * Provides a sorted list of ACTIVE courses associated with a specific teacher.
 * NOTE: Uses userId (NOT email) to handle no-email-* users correctly
 */
export const getTeacherCourses = async (req, res) => {
    try {
        const { userId } = req.params; // Changed from email to userId

        // 1. Get Teacher Info
        const teacherInfo = await Teacher.findOne({ userId: userId }); // Changed from emailAddress
        if (!teacherInfo) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        // 2. Aggregate Courses (Drill-down logic)
        // Join Teacher collection with Course and Assignment collections
        const teacherCourses = await Teacher.aggregate([
            { $match: { userId: userId } }, // Changed from emailAddress
            {
                $lookup: {
                    from: 'courses',
                    localField: 'courseId',
                    foreignField: 'id',
                    as: 'courseDetails'
                }
            },
            { $unwind: "$courseDetails" },
            { $match: { "courseDetails.courseState": "ACTIVE" } },
            {
                $lookup: {
                    from: 'assignments',
                    localField: 'courseId',
                    foreignField: 'courseId',
                    as: 'assignments'
                }
            },
            {
                $project: {
                    _id: 0,
                    courseId: "$courseId",
                    name: "$courseDetails.name",
                    section: "$courseDetails.section",
                    studentsCount: { $size: { $ifNull: ["$courseDetails.students", []] } },
                    assignmentCount: { $size: "$assignments" }
                }
            },
            { $sort: { studentsCount: -1, name: 1 } }
        ]);

        res.json({
            teacher: {
                userId: teacherInfo.userId,
                name: teacherInfo.fullName,
                email: teacherInfo.emailAddress // Include for display, but userId is the identifier
            },
            totalActiveCourses: teacherCourses.length,
            courses: teacherCourses
        });

    } catch (error) {
        console.error('[TEACHER COURSES ERROR]', error);
        res.status(500).json({ message: 'Error fetching teacher courses' });
    }
};
