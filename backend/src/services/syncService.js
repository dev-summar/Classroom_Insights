
import getClassroomClient from './googleClassroomService.js';
import Course from '../models/Course.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import Teacher from '../models/Teacher.js';

import { INSTITUTE_SYNC_USERS, INSTITUTE_NAME } from '../config/instituteSyncUsers.js';
import dashboardCache from '../utils/cache.js';

/**
 * CRITICAL NOTES ABOUT GOOGLE CLASSROOM EMAIL VISIBILITY:
 * 
 * Google Classroom may return users with emailAddress as "no-email-<userId>@google.com".
 * This is EXPECTED and CORRECT behavior based on:
 * - Privacy settings of the user's Google Workspace domain
 * - Classroom API's privacy model
 * - The relationship between the requesting user and the target user
 * 
 * RULES (NON-NEGOTIABLE):
 * ✅ ALWAYS use userId as the primary identifier
 * ✅ ALWAYS use impersonated email ONLY for JWT subject (authorization)
 * ✅ NEVER skip courses, teachers, or students due to missing/no-email addresses
 * ✅ NEVER assume email visibility can be "fixed" via scopes
 * ❌ NEVER use emailAddress for unique constraints or identity matching
 * ❌ NEVER skip sync operations due to no-email-* patterns
 */

const upsertClassroomUser = async (profile, role) => {
    if (!profile || !profile.id) return;

    const existingUser = await User.findOne({ googleId: profile.id });
    if (existingUser) return; // Do nothing if user exists

    // Create minimal user
    await User.create({
        googleId: profile.id,
        name: profile.name?.fullName || 'Unknown User',
        email: profile.emailAddress || `no-email-${profile.id}@google.com`, // Email might be hidden depending on scopes
        picture: profile.photoUrl,
        role: role,
        source: 'classroom'
    });
};

export const syncAllData = async () => {
    // Lightweight DB Existence Check (Prevent Unnecessary Re-Sync)
    const existingCount = await Course.estimatedDocumentCount();
    if (existingCount > 0) {
        console.log('[SYNC] Data validation check: Data already exists. Skipping sync.');
        return { success: true, message: 'Data already exists, sync skipped.' };
    }

    // Service Account Sync
    const classroom = getClassroomClient();

    // Validation & Debugging
    const authType = classroom.context._options.auth?.constructor.name || 'Unknown';
    const subject = process.env.GOOGLE_IMPERSONATED_USER;
    const syncedAt = new Date(); // Uniform timestamp for this sync cycle

    console.log(`[SYNC START] Auth Client Type: ${authType}`);
    console.log(`[SYNC START] Impersonated Subject: ${subject}`);

    if (authType !== 'JWT') {
        throw new Error(`SECURITY ALERT: Non-JWT auth client detected during sync (${authType}). Aborting sync.`);
    }

    if (!subject) {
        throw new Error('CONFIG ERROR: GOOGLE_IMPERSONATED_USER is missing in .env');
    }

    let stats = {
        courses: 0,
        assignments: 0,
        submissions: 0
    };

    // 1. Sync Courses (Using 'me' which refers to the impersonated subject)
    const coursesRes = await classroom.courses.list({ teacherId: 'me', pageSize: 100 });
    const courses = coursesRes.data.courses || [];
    stats.courses = courses.length;

    console.log(`[SYNC] Fetched ${courses.length} courses for ${subject}`);

    for (const course of courses) {
        // Fetch teachers
        let teachers = [];
        try {
            const teachersRes = await classroom.courses.teachers.list({ courseId: course.id });
            const teacherList = teachersRes.data.teachers || [];

            for (const t of teacherList) {
                await upsertClassroomUser(t.profile, 'teacher');
                teachers.push(t.userId);
            }
        } catch (err) {
            console.error(`Failed to fetch teachers for course ${course.id}:`, err.message);
        }

        // Fetch students
        let students = [];
        try {
            let studentPageToken = null;
            do {
                const studentsRes = await classroom.courses.students.list({
                    courseId: course.id,
                    pageSize: 100,
                    pageToken: studentPageToken
                });
                const studentList = studentsRes.data.students || [];

                for (const s of studentList) {
                    await upsertClassroomUser(s.profile, 'student');
                    students.push(s.userId);
                }

                studentPageToken = studentsRes.data.nextPageToken;
            } while (studentPageToken);
        } catch (err) {
            console.error(`Failed to fetch students for course ${course.id}:`, err.message);
        }

        // Upsert Course with Audit Metadata
        await Course.findOneAndUpdate(
            { id: course.id },
            {
                ...course,
                ownerId: course.ownerId,
                teachers: teachers,
                students: students,
                raw: course,
                syncedBy: subject,
                syncedAt: syncedAt
            },
            { upsert: true, new: true, strict: false }
        );

        // 2. Sync CourseWork (Assignments) - Controlled by ENABLE_ASSIGNMENTS_SYNC flag
        const enableAssignments = process.env.ENABLE_ASSIGNMENTS_SYNC === 'true';

        if (enableAssignments) {
            try {
                const courseworkRes = await classroom.courses.courseWork.list({
                    courseId: course.id,
                    pageSize: 100
                });
                const courseWork = courseworkRes.data.courseWork || [];

                for (const work of courseWork) {
                    await Assignment.findOneAndUpdate(
                        { courseId: course.id, id: work.id },
                        {
                            $set: {
                                ...work,
                                syncedBy: subject,
                                syncedAt: syncedAt
                            }
                        },
                        { upsert: true, new: true, strict: false }
                    );
                    stats.assignments++;

                    // 3. Sync Submissions for this assignment
                    try {
                        const submissionsRes = await classroom.courses.courseWork.studentSubmissions.list({
                            courseId: course.id,
                            courseWorkId: work.id,
                            pageSize: 100
                        });
                        const submissions = submissionsRes.data.studentSubmissions || [];

                        for (const sub of submissions) {
                            await Submission.findOneAndUpdate(
                                { courseId: course.id, courseWorkId: work.id, userId: sub.userId },
                                {
                                    $set: {
                                        ...sub,
                                        studentUserId: sub.userId, // Maintain legacy field
                                        syncedBy: subject,
                                        syncedAt: syncedAt
                                    }
                                },
                                { upsert: true, new: true, strict: false }
                            );
                            stats.submissions++;
                        }
                    } catch (subErr) {
                        console.warn(`[SYNC] Failed submissions for assignment ${work.id}: ${subErr.message}`);
                    }
                }
            } catch (workErr) {
                console.warn(`[SYNC] Failed coursework for course ${course.id}: ${workErr.message}`);
            }
        } else {
            console.log(`[SYNC] Assignments & Submissions sync disabled (set ENABLE_ASSIGNMENTS_SYNC=true to enable)`);
        }
    }

    console.log(`[SYNC COMPLETE] Courses: ${stats.courses}, Assignments: ${stats.assignments}, Submissions: ${stats.submissions}`);

    // Invalidate dashboard cache
    dashboardCache.flushAll();

    return {
        success: true,
        message: `Synced ${stats.courses} courses, ${stats.assignments} assignments, ${stats.submissions} submissions`,
        stats
    };
};

// DEPRECATED: We no longer clear data before sync to ensure dashboard persistence.
// Sync is now strictly UPSERT only.
export const resetAndSync = async () => {
    console.log('[SYNC] resetAndSync called - performing full sync without clearing existing data.');
    return await syncAllData();
};

/**
 * Executes a one-time Data Sync across all authorized institute accounts.
 * Implements strict sequential impersonation and data merging.
 */
/**
 * Executes a comprehensive Institute Data Sync.
 * Iterates through all authorized institute accounts and syncs their visible classrooms.
 * Merges student rosters and ensures data persistence for dashbaords.
 */
export const syncInstituteData = async () => {
    // Lightweight DB Existence Check (Prevent Unnecessary Re-Sync)
    const existingCount = await Course.estimatedDocumentCount();
    if (existingCount > 0) {
        console.log('[INSTITUTE SYNC] Data validation check: Data already exists. Skipping sync.');
        return { success: true, message: 'Data already exists, sync skipped.' };
    }

    console.log(`[INSTITUTE SYNC] Starting sync for ${INSTITUTE_SYNC_USERS.length} accounts...`);

    // Track stats for the entire run
    const overallStats = {
        coursesUpdated: 0,
        assignmentsUpdated: 0,
        submissionsUpdated: 0,
        coursesErrors: 0,
        usersProcessed: 0,
        usersErrors: 0
    };

    const syncedAt = new Date();

    for (const syncUser of INSTITUTE_SYNC_USERS) {
        try {
            console.log(`[SYNC] Impersonating: ${syncUser}`);

            // 1. Get Client for specific user
            const classroom = getClassroomClient(syncUser);

            // 2. Fetch Courses (Including Active, Archived, and Provisioned)
            const coursesRes = await classroom.courses.list({
                teacherId: 'me',
                pageSize: 100,
                courseStates: ['ACTIVE', 'ARCHIVED', 'PROVISIONED']
            });
            const courses = coursesRes.data.courses || [];

            console.log(`[SYNC] Courses fetched for ${syncUser}: ${courses.length}`);

            // 3. Process Each Course
            for (const course of courses) {
                try {
                    // Fetch Roster (Teachers)
                    let courseTeachers = [];
                    try {
                        const teachersRes = await classroom.courses.teachers.list({ courseId: course.id });
                        const teacherList = teachersRes.data.teachers || [];

                        for (const t of teacherList) {
                            // 1. Sync to Teacher collection (as requested with metadata)
                            // NOTE: Use userId as unique key, NOT email (handles no-email-* correctly)
                            const teacherEmail = t.profile.emailAddress || `no-email-${t.userId}@google.com`;
                            await Teacher.findOneAndUpdate(
                                { userId: t.userId, courseId: course.id }, // Changed from emailAddress to userId
                                {
                                    $set: {
                                        userId: t.userId,
                                        fullName: t.profile.name?.fullName || 'Unknown Teacher',
                                        emailAddress: teacherEmail,
                                        courseId: course.id,
                                        syncedBy: syncUser,
                                        syncedAt: syncedAt
                                    }
                                },
                                { upsert: true, new: true }
                            );

                            // 2. Sync to User collection (for authentication/profile)
                            await upsertClassroomUser(t.profile, 'teacher');
                            courseTeachers.push(t.userId);
                        }
                    } catch (err) {
                        console.warn(`[SYNC] Failed to fetch teachers for ${course.id}: ${err.message}`);
                    }

                    // Fetch Roster (Students)
                    let currentStudents = [];
                    try {
                        let pageToken = null;
                        do {
                            const studentsRes = await classroom.courses.students.list({
                                courseId: course.id,
                                pageSize: 100,
                                pageToken
                            });
                            const studentList = studentsRes.data.students || [];

                            for (const s of studentList) {
                                // Upsert student profile in User collection
                                await upsertClassroomUser(s.profile, 'student');
                                currentStudents.push(s.userId);
                            }

                            pageToken = studentsRes.data.nextPageToken;
                        } while (pageToken);
                    } catch (err) {
                        console.warn(`[SYNC] Failed to fetch students for ${course.id}: ${err.message}`);
                    }

                    // Global Merge Logic for Students/Teachers
                    // Check if this course was already synced by another user (e.g. co-teacher)
                    const existingCourse = await Course.findOne({ id: course.id });
                    let finalStudents = [...currentStudents];
                    let finalTeachers = [...courseTeachers];

                    if (existingCourse && existingCourse.students) {
                        const mergedSet = new Set([...existingCourse.students, ...currentStudents]);
                        finalStudents = Array.from(mergedSet);
                    }
                    if (existingCourse && existingCourse.teachers) {
                        const mergedSet = new Set([...existingCourse.teachers, ...courseTeachers]);
                        finalTeachers = Array.from(mergedSet);
                    }

                    // PERSIST COURSE TO DB
                    // This is the CRITICAL step. If this fails, dashboard sees nothing.
                    await Course.findOneAndUpdate(
                        { id: course.id },
                        {
                            $set: {
                                ...course,
                                ownerId: course.ownerId,
                                students: finalStudents,
                                teachers: finalTeachers,
                                // Metadata for provenance
                                syncedBy: syncUser,
                                syncedAt: syncedAt,
                                institute: INSTITUTE_NAME,
                                // Timestamps
                                updateTime: new Date()
                            }
                        },
                        { upsert: true, new: true, strict: false }
                    );

                    overallStats.coursesUpdated++;

                    const enableAssignments = process.env.ENABLE_ASSIGNMENTS_SYNC === 'true';

                    if (enableAssignments) {
                        // 4. SYNC ASSIGNMENTS (CourseWork)
                        try {
                            const courseworkRes = await classroom.courses.courseWork.list({
                                courseId: course.id,
                                pageSize: 100
                            });
                            const courseWork = courseworkRes.data.courseWork || [];

                            for (const work of courseWork) {
                                await Assignment.findOneAndUpdate(
                                    { courseId: course.id, id: work.id },
                                    {
                                        $set: {
                                            ...work,
                                            courseName: course.name,
                                            syncedBy: syncUser,
                                            syncedAt: syncedAt
                                        }
                                    },
                                    { upsert: true, new: true, strict: false }
                                );
                                overallStats.assignmentsUpdated++;

                                // 5. SYNC SUBMISSIONS for this assignment
                                try {
                                    const submissionsRes = await classroom.courses.courseWork.studentSubmissions.list({
                                        courseId: course.id,
                                        courseWorkId: work.id,
                                        pageSize: 100
                                    });
                                    const submissions = submissionsRes.data.studentSubmissions || [];

                                    for (const sub of submissions) {
                                        await Submission.findOneAndUpdate(
                                            { courseId: course.id, courseWorkId: work.id, userId: sub.userId },
                                            {
                                                $set: {
                                                    ...sub,
                                                    syncedBy: syncUser,
                                                    syncedAt: syncedAt
                                                }
                                            },
                                            { upsert: true, new: true, strict: false }
                                        );
                                        overallStats.submissionsUpdated++;
                                    }
                                } catch (subErr) {
                                    console.warn(`[SYNC] Failed submissions for assignment ${work.id} in course ${course.id}: ${subErr.message}`);
                                }
                            }
                        } catch (workErr) {
                            console.warn(`[SYNC] Failed coursework for course ${course.id}: ${workErr.message}`);
                        }
                    } else {
                        console.log(`[SYNC] Assignments & Submissions sync disabled`);
                    }

                } catch (courseError) {
                    console.error(`[SYNC ERROR] Failed to process course ${course.id} for ${syncUser}:`, courseError.message);
                    overallStats.coursesErrors++;
                }
            }

            overallStats.usersProcessed++;

        } catch (userError) {
            console.error(`[SYNC ERROR] Critical failure for user ${syncUser}:`, userError.message);
            overallStats.usersErrors++;
        }
    }

    // Determine unique course count after the full run
    // Filter specifically by the authorized list to ensure we are counting valid data
    const uniqueCourses = await Course.countDocuments({ syncedBy: { $in: INSTITUTE_SYNC_USERS } });

    console.log(`[INSTITUTE SYNC COMPLETE] Unique Courses in DB: ${uniqueCourses}`);
    console.log(`[STATS] Processed: ${overallStats.usersProcessed} users. Course Updates: ${overallStats.coursesUpdated}. Assignments: ${overallStats.assignmentsUpdated}. Submissions: ${overallStats.submissionsUpdated}.`);

    // POST-SYNC DENORMALIZATION (Rule 2)
    await denormalizeAllData();

    // Invalidate dashboard cache
    dashboardCache.flushAll();

    return {
        success: true,
        stats: {
            uniqueCourses,
            ...overallStats
        }
    };
};

/**
 * Denormalizes counts and relationships for instant sidebar reads.
 * Rule: Compute once during sync, never during read.
 */
export const denormalizeAllData = async () => {
    console.log('[DENORMALIZE] Starting pre-computation of counts...');
    const startTime = Date.now();

    try {
        // 1. Update Course Counts (Student, Teacher, Assignment)
        // Use aggregation pipeline updates for efficiency (Mongo 4.2+)
        await Course.updateMany({}, [
            {
                $set: {
                    studentCount: { $size: { $ifNull: ["$students", []] } },
                    teacherCount: { $size: { $ifNull: ["$teachers", []] } }
                }
            }
        ]);

        // Specific count for assignments per course
        const assignmentCounts = await Assignment.aggregate([
            { $group: { _id: "$courseId", count: { $sum: 1 } } }
        ]);
        for (const item of assignmentCounts) {
            await Course.updateOne({ id: item._id }, { assignmentCount: item.count });
        }

        // 2. Update Assignment Submission Counts
        const submissionCounts = await Submission.aggregate([
            { $match: { state: { $in: ['TURNED_IN', 'RETURNED'] } } },
            { $group: { _id: "$courseWorkId", count: { $sum: 1 } } }
        ]);
        // Reset counts first
        await Assignment.updateMany({}, { submissionCount: 0 });
        for (const item of submissionCounts) {
            await Assignment.updateOne({ id: item._id }, { submissionCount: item.count });
        }

        // 3. Update User Total Courses (Students & Teachers)
        // Students
        const studentCourseCounts = await Course.aggregate([
            { $unwind: "$students" },
            { $group: { _id: "$students", count: { $sum: 1 } } }
        ]);
        // Reset users first
        await User.updateMany({}, { totalCourses: 0 });
        for (const item of studentCourseCounts) {
            await User.updateOne({ googleId: item._id }, { totalCourses: item.count });
        }

        // Teachers (Distinct from students because a user can be both, or just instructor)
        const teacherCourseCounts = await Teacher.aggregate([
            { $group: { _id: "$userId", count: { $sum: 1 } } }
        ]);
        for (const item of teacherCourseCounts) {
            await User.updateOne({ googleId: item._id }, { totalCourses: item.count });
        }

        // 4. Update Submission Details (studentName, studentEmail, courseName, assignmentTitle)
        // Group assignments for easy lookup
        const assignments = await Assignment.find({}, { id: 1, title: 1, courseName: 1 });
        for (const assign of assignments) {
            await Submission.updateMany(
                { courseWorkId: assign.id },
                {
                    $set: {
                        assignmentTitle: assign.title,
                        courseName: assign.courseName
                    }
                }
            );
        }

        const users = await User.find({}, { googleId: 1, name: 1, email: 1 });
        for (const user of users) {
            await Submission.updateMany(
                { userId: user.googleId },
                {
                    $set: {
                        studentName: user.name,
                        studentEmail: user.email
                    }
                }
            );
        }

        console.log(`[DENORMALIZE COMPLETE] Finished in ${Date.now() - startTime}ms`);
    } catch (error) {
        console.error('[DENORMALIZE ERROR]', error);
    }
};
