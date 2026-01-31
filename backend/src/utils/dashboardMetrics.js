
import Course from '../models/Course.js';

/**
 * Shared utility to get unique, active course IDs.
 * Used as the source of truth for all dashboard KPIs to prevent double-counting.
 */
export async function getUniqueActiveCourseIds() {
    // Deduplication is based on Google Course ID ('id' in our model)
    return Course.distinct("id", {
        courseState: "ACTIVE"
    });
}
