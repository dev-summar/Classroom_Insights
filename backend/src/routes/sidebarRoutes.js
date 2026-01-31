import express from 'express';
import { getCourses, getTeachers, getStudents, getAssignments, getSubmissions } from '../controllers/sidebarController.js';

const router = express.Router();

router.get('/courses', getCourses);
router.get('/teachers', getTeachers);
router.get('/students', getStudents);
router.get('/assignments', getAssignments);
router.get('/submissions', getSubmissions);

export default router;
