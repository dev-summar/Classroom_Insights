import express from 'express';
import { getCourses, getCourseById, getCourseStudents, getAssignments, getSubmissions, getCourseSilentStudents } from '../controllers/apiController.js';

const router = express.Router();

router.get('/courses', getCourses);
router.get('/courses/:id', getCourseById);
router.get('/courses/:id/students', getCourseStudents);
router.get('/courses/:id/silent-students', getCourseSilentStudents);
router.get('/assignments', getAssignments);
router.get('/submissions', getSubmissions);

export default router;
