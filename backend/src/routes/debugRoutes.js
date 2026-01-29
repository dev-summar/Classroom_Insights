import express from 'express';
import getClassroomClient from '../services/googleClassroomService.js';
import { getServiceAccountAuth } from '../auth/googleAuth.js';

const router = express.Router();

/**
 * @desc    Debug endpoint to verify Service Account Auth status
 * @route   GET /api/debug/auth-status
 * @access  Public (Temporary for verification)
 */
router.get('/auth-status', (req, res) => {
    try {
        const auth = getServiceAccountAuth();
        const authType = auth.constructor.name;
        const subject = auth.subject;

        res.json({
            status: 'success',
            auth_client_type: authType,
            impersonated_subject: subject,
            is_jwt: authType === 'JWT',
            message: authType === 'JWT'
                ? 'Verification Passed: Auth is strictly JWT via Service Account.'
                : 'Verification Failed: Auth is NOT JWT.'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to initialize Service Account Auth',
            error: error.message
        });
    }
});

/**
 * @desc    Test endpoint to list courses via Service Account (No login needed)
 * @route   GET /api/debug/test-courses
 * @access  Public (Temporary for verification)
 */
router.get('/test-courses', async (req, res) => {
    try {
        const classroom = getClassroomClient();

        // List courses for the impersonated user ('me')
        const coursesRes = await classroom.courses.list({
            teacherId: 'me',
            pageSize: 10
        });

        const courses = coursesRes.data.courses || [];

        res.json({
            status: 'success',
            impersonated_user: process.env.GOOGLE_IMPERSONATED_USER,
            course_count: courses.length,
            courses: courses.map(c => ({
                id: c.id,
                name: c.name,
                section: c.section,
                descriptionHeading: c.descriptionHeading
            }))
        });
    } catch (error) {
        console.error('[DEBUG ERROR] Classroom Test Failed:', error);
        res.status(500).json({
            status: 'error',
            message: 'Classroom API call failed using Service Account',
            error: error.message
        });
    }
});

export default router;
