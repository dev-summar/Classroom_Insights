/**
 * DEPRECATED: This service is no longer used and has been replaced by syncService.js
 * to enforce strictly Service Account-based synchronization via Domain-Wide Delegation.
 * 
 * ALL Classrom API calls must go through syncService.js using getClassroomClient().
 */

throw new Error('GoogleClassroomService (googleClassroom.js) is DEPRECATED. Use syncService.js instead.');

export default {
    syncCourses: () => { throw new Error('DEPRECATED'); }
};
