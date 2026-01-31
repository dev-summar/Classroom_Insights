/**
 * Verification Script
 * 
 * Tests that the no-email fixes are working correctly
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const verifyFixes = async () => {
    try {
        console.log('[VERIFY] Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('[VERIFY] Connected successfully\n');

        const db = mongoose.connection.db;

        // 1. Check Teacher Index
        console.log('=== 1. TEACHER INDEX VERIFICATION ===');
        const teachersCollection = db.collection('teachers');
        const teacherIndexes = await teachersCollection.indexes();

        const hasOldIndex = teacherIndexes.some(idx => idx.name === 'emailAddress_1_courseId_1');
        const hasNewIndex = teacherIndexes.some(idx => idx.name === 'userId_1_courseId_1');

        console.log(`Old email-based index (emailAddress_1_courseId_1): ${hasOldIndex ? '❌ STILL EXISTS' : '✅ REMOVED'}`);
        console.log(`New userId-based index (userId_1_courseId_1): ${hasNewIndex ? '✅ EXISTS' : '❌ MISSING'}`);

        // 2. Check for no-email teachers
        console.log('\n=== 2. NO-EMAIL TEACHERS CHECK ===');
        const noEmailTeachers = await teachersCollection.countDocuments({
            emailAddress: { $regex: /^no-email-/ }
        });
        const totalTeachers = await teachersCollection.countDocuments({});

        console.log(`Total teachers in database: ${totalTeachers}`);
        console.log(`Teachers with no-email addresses: ${noEmailTeachers}`);

        if (noEmailTeachers > 0) {
            console.log('✅ System is handling no-email users correctly');

            // Show sample
            const sample = await teachersCollection.findOne({
                emailAddress: { $regex: /^no-email-/ }
            });
            console.log('\nSample no-email teacher:');
            console.log(`  - userId: ${sample.userId}`);
            console.log(`  - email: ${sample.emailAddress}`);
            console.log(`  - name: ${sample.fullName}`);
        } else {
            console.log('ℹ️  No no-email teachers found yet (may appear after next sync)');
        }

        // 3. Check Assignments
        console.log('\n=== 3. ASSIGNMENTS CHECK ===');
        const assignmentsCollection = db.collection('assignments');
        const totalAssignments = await assignmentsCollection.countDocuments({});

        console.log(`Total assignments in database: ${totalAssignments}`);

        if (totalAssignments > 0) {
            console.log('✅ Assignments sync is working');

            const recentAssignment = await assignmentsCollection.findOne(
                {},
                { sort: { syncedAt: -1 } }
            );
            console.log(`Most recent assignment synced at: ${recentAssignment?.syncedAt || 'N/A'}`);
            console.log(`Synced by: ${recentAssignment?.syncedBy || 'N/A'}`);
        } else {
            console.log('⚠️  No assignments found. Ensure ENABLE_ASSIGNMENTS_SYNC=true and trigger sync');
        }

        // 4. Check Submissions
        console.log('\n=== 4. SUBMISSIONS CHECK ===');
        const submissionsCollection = db.collection('submissions');
        const totalSubmissions = await submissionsCollection.countDocuments({});

        console.log(`Total submissions in database: ${totalSubmissions}`);

        if (totalSubmissions > 0) {
            console.log('✅ Submissions sync is working');

            const recentSubmission = await submissionsCollection.findOne(
                {},
                { sort: { syncedAt: -1 } }
            );
            console.log(`Most recent submission synced at: ${recentSubmission?.syncedAt || 'N/A'}`);
            console.log(`Student userId: ${recentSubmission?.userId || 'N/A'}`);
        } else {
            console.log('⚠️  No submissions found. Ensure ENABLE_ASSIGNMENTS_SYNC=true and trigger sync');
        }

        // 5. Check Courses
        console.log('\n=== 5. COURSES CHECK ===');
        const coursesCollection = db.collection('courses');
        const totalCourses = await coursesCollection.countDocuments({});
        const activeCourses = await coursesCollection.countDocuments({ courseState: 'ACTIVE' });

        console.log(`Total courses: ${totalCourses}`);
        console.log(`Active courses: ${activeCourses}`);

        // 6. Environment Check
        console.log('\n=== 6. ENVIRONMENT CONFIGURATION ===');
        console.log(`ENABLE_ASSIGNMENTS_SYNC: ${process.env.ENABLE_ASSIGNMENTS_SYNC || '❌ NOT SET'}`);
        console.log(`GOOGLE_IMPERSONATED_USER: ${process.env.GOOGLE_IMPERSONATED_USER || '❌ NOT SET'}`);
        console.log(`GOOGLE_SERVICE_ACCOUNT_EMAIL: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? '✅ SET' : '❌ NOT SET'}`);

        // 7. Summary
        console.log('\n=== VERIFICATION SUMMARY ===');
        const allGood = hasNewIndex && !hasOldIndex &&
            (process.env.ENABLE_ASSIGNMENTS_SYNC === 'true') &&
            process.env.GOOGLE_IMPERSONATED_USER &&
            process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

        if (allGood) {
            console.log('✅ All critical fixes are in place!');
            console.log('\nRecommended next steps:');
            console.log('1. Trigger a fresh sync using the dashboard "Sync Now" button');
            console.log('2. Verify assignments and submissions appear in the database');
            console.log('3. Check dashboard for accurate teacher counts');
            console.log('4. Test AI insights to ensure teacher data is included');
        } else {
            console.log('⚠️  Some issues detected. Review the output above.');
        }

        console.log('\n[VERIFY] Verification complete! 🎉\n');

    } catch (error) {
        console.error('\n[VERIFY ERROR]', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

// Run verification
verifyFixes();
