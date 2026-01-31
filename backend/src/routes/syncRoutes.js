
import express from 'express';
import { syncAllData, resetAndSync, syncInstituteData } from '../services/syncService.js';

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

router.post('/sync/reset', async (req, res) => {
    try {
        console.log('Starting RESET and SYNC...');
        const result = await resetAndSync();
        res.json(result);
    } catch (error) {
        console.error('Reset Sync error:', error);
        res.status(500).json({
            message: 'Reset Sync failed',
            error: error.message
        });
    }
});

// New Endpoint: One-time Institute Sync (Semester Independent)
router.post('/sync/institute', async (req, res) => {
    try {
        console.log('Starting INSTITUTE SYNC...');
        const result = await syncInstituteData();
        res.json(result);
    } catch (error) {
        console.error('Institute Sync error:', error);
        res.status(500).json({
            message: 'Institute Sync failed',
            error: error.message
        });
    }
});

export default router;
