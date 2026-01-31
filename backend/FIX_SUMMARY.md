# Fix Summary: Google Classroom no-email-* Issue & Assignments Sync

## Date: 2026-01-30

## Problem Statement

The system was experiencing issues with:
1. Many Classroom users appearing as `no-email-xxxx@google.com`
2. Assignments & submissions sync failing or being skipped
3. Logic incorrectly depending on `emailAddress` presence
4. Teacher model using email-based unique constraints

## Root Causes Identified

1. **Email-based unique constraints**: Teacher model used `(emailAddress + courseId)` as unique key, which fails for `no-email-*` users
2. **Hardcoded skip logic**: Assignments/submissions sync was disabled with hardcoded warning messages
3. **Email-based aggregations**: Dashboard and AI controllers grouped teachers by `emailAddress` instead of `userId`
4. **Missing feature flag**: `ENABLE_ASSIGNMENTS_SYNC` was not set in `.env`
5. **Lack of documentation**: No clear guidance on handling Google Classroom's privacy behavior

## Changes Implemented

### 1. Teacher Model (`src/models/Teacher.js`)
- ✅ Changed unique index from `(emailAddress + courseId)` to `(userId + courseId)`
- ✅ Made `emailAddress` optional (removed `required: true`)
- ✅ Added comprehensive documentation about no-email behavior

### 2. Sync Service (`src/services/syncService.js`)
- ✅ Added critical documentation about Google Classroom email visibility
- ✅ Removed hardcoded skip logic for assignments/submissions
- ✅ Implemented proper assignments and submissions sync controlled by feature flag
- ✅ Fixed Teacher upsert to use `userId` instead of `emailAddress` as unique key
- ✅ Added safe navigation (`?.`) for optional fields like `t.profile.name?.fullName`

### 3. Dashboard Controller (`src/controllers/dashboardController.js`)
- ✅ Fixed teacher aggregation to group by `userId` instead of `emailAddress`
- ✅ Updated `getTeachersOverview` to use `userId`-based grouping
- ✅ Changed `getTeacherCourses` endpoint from `/teachers/:email/courses` to `/teachers/:userId/courses`
- ✅ Added `userId` to response objects for proper identification

### 4. AI Controller (`src/controllers/aiController.js`)
- ✅ Fixed teacher aggregation to group by `userId` instead of `emailAddress`
- ✅ Ensured AI insights use correct teacher counts

### 5. Course Model (`src/models/Course.js`)
- ✅ Added documentation clarifying that `ownerId`, `teachers`, and `students` arrays contain User IDs, not emails
- ✅ Documented that `syncedBy` is for authorization only

### 6. Assignment Model (`src/models/Assignment.js`)
- ✅ Added documentation about `syncedBy` being authorization-only

### 7. Submission Model (`src/models/Submission.js`)
- ✅ Added documentation about `userId` being the primary identifier
- ✅ Clarified `syncedBy` usage

### 8. Environment Configuration (`.env`)
- ✅ Added `ENABLE_ASSIGNMENTS_SYNC=true` feature flag

### 9. Documentation
- ✅ Created comprehensive guide: `GOOGLE_CLASSROOM_NO_EMAIL_GUIDE.md`

## Technical Details

### Before (❌ WRONG):
```javascript
// Teacher Model
teacherSchema.index({ emailAddress: 1, courseId: 1 }, { unique: true });

// Dashboard Controller
$group: {
    _id: "$emailAddress",  // Fails for no-email-* users
    name: { $first: "$fullName" },
    totalCourses: { $sum: 1 }
}

// Sync Service
// SKIPPED: Scope 'classroom.coursework.students.readonly' is not authorized.
console.warn(`[SYNC WARNING] CourseWork/Submissions sync skipped...`);
```

### After (✅ CORRECT):
```javascript
// Teacher Model
teacherSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// Dashboard Controller
$group: {
    _id: "$userId",  // Works for all users
    name: { $first: "$fullName" },
    email: { $first: "$emailAddress" },  // Display only
    totalCourses: { $sum: 1 }
}

// Sync Service
if (enableAssignments) {
    const courseworkRes = await classroom.courses.courseWork.list({...});
    // Actual sync logic
}
```

## Database Migration Required

⚠️ **IMPORTANT**: The old unique index on Teacher collection must be dropped:

```javascript
// MongoDB Shell or Compass
db.teachers.dropIndex("emailAddress_1_courseId_1")

// The new index (userId_1_courseId_1) will be created automatically on server restart
```

## Testing Checklist

- [ ] Server starts without errors
- [ ] Sync runs without skipping assignments/submissions
- [ ] Teachers with `no-email-*` addresses are stored correctly
- [ ] Dashboard shows accurate teacher counts
- [ ] No duplicate key errors on Teacher upsert
- [ ] AI insights include teacher data
- [ ] `/api/dashboard/stats` returns `teachersOverview` with `userId` field
- [ ] `/api/dashboard/teachers/:userId/courses` works correctly

## Expected Behavior After Fix

✅ Courses continue to sync  
✅ Assignments sync for all impersonated teachers  
✅ Submissions sync correctly  
✅ No `no-email-*` logic breaks anything  
✅ Dashboard shows correct counts  
✅ AI insights are factually accurate  
✅ System works fully from MongoDB data  

## Configuration

### Required Environment Variables
```bash
ENABLE_ASSIGNMENTS_SYNC=true
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
GOOGLE_IMPERSONATED_USER=admin@yourdomain.com
```

### Required Scopes (Google Admin Console)
```
https://www.googleapis.com/auth/classroom.courses.readonly
https://www.googleapis.com/auth/classroom.rosters.readonly
https://www.googleapis.com/auth/classroom.coursework.students.readonly
https://www.googleapis.com/auth/classroom.student-submissions.students.readonly
```

## Files Modified

1. `backend/src/models/Teacher.js`
2. `backend/src/models/Course.js`
3. `backend/src/models/Assignment.js`
4. `backend/src/models/Submission.js`
5. `backend/src/services/syncService.js`
6. `backend/src/controllers/dashboardController.js`
7. `backend/src/controllers/aiController.js`
8. `backend/.env`

## Files Created

1. `backend/GOOGLE_CLASSROOM_NO_EMAIL_GUIDE.md` - Comprehensive documentation
2. `backend/FIX_SUMMARY.md` - This file

## Next Steps

1. **Drop old database index**:
   ```bash
   # Connect to MongoDB
   mongosh "mongodb+srv://classroom_admin:DeVOGBBL4FNFD0Yd@cluster0.owmev2q.mongodb.net/"
   
   # Switch to database
   use test  # or your database name
   
   # Drop old index
   db.teachers.dropIndex("emailAddress_1_courseId_1")
   ```

2. **Trigger a fresh sync**:
   - Use the "Sync Now" button in the dashboard, OR
   - Call `POST /api/sync/institute` endpoint

3. **Verify the fix**:
   - Check server logs for successful assignment/submission sync
   - Verify dashboard shows teacher counts
   - Check that no errors occur with `no-email-*` users

4. **Monitor**:
   - Watch for any duplicate key errors (should not occur)
   - Verify assignment and submission counts increase
   - Confirm AI insights include teacher data

## Support

For questions or issues, refer to:
- `GOOGLE_CLASSROOM_NO_EMAIL_GUIDE.md` - Detailed explanation
- Google Classroom API docs: https://developers.google.com/classroom
- Domain-Wide Delegation: https://developers.google.com/identity/protocols/oauth2/service-account

---

**Status**: ✅ COMPLETE  
**Tested**: Server starts successfully  
**Ready for**: Database migration and sync testing
