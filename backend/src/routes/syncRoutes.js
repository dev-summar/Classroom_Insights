import express from 'express';
import { syncAllData } from '../services/syncService.js';

const router = express.Router();

router.post('/sync', async (req, res) => {
    try {
        const result = await syncAllData();
        res.json(result);
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({
            message: 'Sync failed',
            error: error.message
        });
    }
});

export default router;
