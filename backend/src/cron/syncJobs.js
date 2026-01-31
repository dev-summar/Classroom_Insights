
import cron from 'node-cron';
import { syncInstituteData } from '../services/syncService.js';

/**
 * Scheduled Synchronization Jobs.
 * Note: Automatic sync is currently DISABLED by default to enforce the "Manual Sync Only" rule.
 * To enable, uncomment the line in server.js and configure ENABLE_AUTO_SYNC=true.
 */
const startCronJobs = () => {
    if (process.env.ENABLE_AUTO_SYNC !== 'true') {
        console.log('[CRON] Automatic sync is DISABLED (Manual Sync Only mode active)'.blue);
        return;
    }

    // Default: Sync every night at 3 AM
    const schedule = process.env.SYNC_CRON_SCHEDULE || '0 3 * * *';

    cron.schedule(schedule, async () => {
        console.log('[CRON] Starting scheduled institute-wide synchronization...');

        try {
            const result = await syncInstituteData();
            console.log(`[CRON] Scheduled Sync Success: ${result.stats.uniqueCourses} courses updated.`);
        } catch (error) {
            console.error('[CRON ERROR] Scheduled sync failed:', error.message);
        }
    });

    console.log(`[CRON] Jobs scheduled: ${schedule}`);
};

export default startCronJobs;
