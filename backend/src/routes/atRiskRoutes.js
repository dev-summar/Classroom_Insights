import express from 'express';
import { getAtRiskStudents, explainAtRiskStatus } from '../controllers/atRiskController.js';

const router = express.Router();

router.get('/', getAtRiskStudents);
router.post('/explain', explainAtRiskStatus);

export default router;
