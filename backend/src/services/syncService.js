import getClassroomClient from './googleClassroomService.js';
import Course from '../models/Course.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';

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
    // Service Account Sync
    const classroom = getClassroomClient();

    // Validation & Debugging (as requested)
    const authType = classroom.context._options.auth?.constructor.name || 'Unknown';
    const subject = process.env.GOOGLE_IMPERSONATED_USER;

    console.log(`[SYNC START] Auth Client Type: ${authType}`);
    console.log(`[SYNC START] Impersonated Subject: ${subject}`);

    if (authType !== 'JWT') {
        throw new Error(`SECURITY ALERT: Non-JWT auth client detected during sync (${authType}). Aborting sync.`);
    }

    // 1. Sync Courses (Using 'me' which refers to the impersonated subject)
    const coursesRes = await classroom.courses.list({ teacherId: 'me', pageSize: 100 });
    const courses = coursesRes.data.courses || [];

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

        // Upsert Course
        await Course.findOneAndUpdate(
            { id: course.id },
            {
                ...course,
                ownerId: course.ownerId,
                teachers: teachers, // Normalized teacher data
                students: students, // Normalized student data
                raw: course
            },
            { upsert: true, new: true, strict: false }
        );

        // 2. Sync CourseWork (Assignments)
        let pageToken = null;
        do {
            const workRes = await classroom.courses.courseWork.list({
                courseId: course.id,
                pageSize: 100,
                pageToken
            });

            const courseWorks = workRes.data.courseWork || [];

            for (const work of courseWorks) {
                await Assignment.findOneAndUpdate(
                    { id: work.id },
                    {
                        ...work,
                        courseId: course.id, // Ensure strict linking
                        raw: work
                    },
                    { upsert: true, new: true, strict: false }
                );

                // 3. Sync Student Submissions
                // Note: For a teacher, this lists all submissions for the coursework
                let subPageToken = null;
                do {
                    const subRes = await classroom.courses.courseWork.studentSubmissions.list({
                        courseId: course.id,
                        courseWorkId: work.id,
                        pageSize: 100,
                        pageToken: subPageToken
                    });

                    const submissions = subRes.data.studentSubmissions || [];

                    for (const sub of submissions) {
                        await Submission.findOneAndUpdate(
                            { id: sub.id },
                            {
                                ...sub,
                                courseId: course.id,
                                courseWorkId: work.id,
                                state: sub.state,
                                studentUserId: sub.userId,
                                raw: sub
                            },
                            { upsert: true, new: true, strict: false }
                        );
                    }
                    subPageToken = subRes.data.nextPageToken;
                } while (subPageToken);
            }
            pageToken = workRes.data.nextPageToken;
        } while (pageToken);
    }

    return { success: true, message: `Synced ${courses.length} courses` };
};
