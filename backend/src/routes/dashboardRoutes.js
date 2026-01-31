
import express from 'express';
import { getDashboardStats, getTeachersOverview, getTeacherCourses, getDashboardCharts } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/stats', getDashboardStats);
router.get('/charts', getDashboardCharts);
router.get('/teachers-overview', getTeachersOverview);
router.get('/teachers/:userId/courses', getTeacherCourses);

export default router;
