import cron from 'node-cron';
import { syncAllData } from '../services/syncService.js';

const startCronJobs = () => {
    // Sync every night at 3 AM or as configured
    const schedule = process.env.SYNC_CRON_SCHEDULE || '0 3 * * *';

    cron.schedule(schedule, async () => {
        console.log('[CRON] Starting scheduled Google Classroom synchronization...');
        console.log('[CRON] Identity: Service Account (Domain-Wide Delegation)');

        try {
            const result = await syncAllData();
            console.log(`[CRON] Sync success: ${result.message}`);
        } catch (error) {
            console.error('[CRON ERROR] Scheduled sync failed:', error.message);
        }
    });

    console.log(`[CRON] Jobs scheduled: ${schedule}`);
};

export default startCronJobs;
