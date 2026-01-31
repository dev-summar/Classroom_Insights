import express from 'express';
import { getCourses, getCourseById, getCourseStudents, getCourseTeachers, getAssignments, getSubmissions, getCourseSilentStudents, getStudents } from '../controllers/apiController.js';

const router = express.Router();

router.get('/courses', getCourses);
router.get('/students', getStudents);
router.get('/courses/:id', getCourseById);
router.get('/courses/:id/students', getCourseStudents);
router.get('/courses/:id/teachers', getCourseTeachers);
router.get('/courses/:id/silent-students', getCourseSilentStudents);
router.get('/assignments', getAssignments);
router.get('/submissions', getSubmissions);

export default router;
