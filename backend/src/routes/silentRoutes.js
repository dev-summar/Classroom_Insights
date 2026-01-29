import express from 'express';
import { getSilentStudents, explainSilence } from '../controllers/silentController.js';

const router = express.Router();

router.get('/', getSilentStudents);
router.post('/explain', explainSilence);

export default router;
