# Google Classroom "no-email-*" User Guide

## Overview

This document explains Google Classroom's privacy behavior regarding user email visibility and how this system handles it correctly.

## The "no-email-*" Phenomenon

### What is it?

When querying Google Classroom API, you may receive user profiles with email addresses like:
```
no-email-123456789@google.com
```

### Why does this happen?

This is **EXPECTED and CORRECT** behavior from Google Classroom, caused by:

1. **Privacy Settings**: The user's Google Workspace domain has privacy settings that restrict email visibility
2. **API Privacy Model**: Google Classroom's API respects organizational privacy policies
3. **User Relationships**: The requesting user may not have permission to see certain users' email addresses

### What it is NOT:

❌ NOT a bug in your code  
❌ NOT a scope/permission issue  
❌ NOT fixable by adding more OAuth scopes  
❌ NOT an indication of sync failure  

## Critical Rules (NON-NEGOTIABLE)

### ✅ ALWAYS DO:

1. **Use `userId` as the primary identifier**
   - Every Google Classroom user has a unique `userId`
   - This ID is ALWAYS available, regardless of privacy settings
   - Use this for database keys, lookups, and identity matching

2. **Use impersonated email ONLY for authorization**
   - The email in JWT subject is for Domain-Wide Delegation auth
   - It grants permission to access data
   - It is NOT a user identifier

3. **Trust Classroom role + ownership, not email**
   - A teacher is defined by `course.ownerId` or presence in `course.teachers[]`
   - Use `userId` to identify teachers, NOT email addresses

### ❌ NEVER DO:

1. **Skip courses/teachers/students due to missing email**
   ```javascript
   // ❌ WRONG
   if (!teacher.profile.emailAddress) {
       continue; // This will skip valid users!
   }
   
   // ✅ CORRECT
   const email = teacher.profile.emailAddress || `no-email-${teacher.userId}@google.com`;
   ```

2. **Use email for unique constraints**
   ```javascript
   // ❌ WRONG
   teacherSchema.index({ emailAddress: 1, courseId: 1 }, { unique: true });
   
   // ✅ CORRECT
   teacherSchema.index({ userId: 1, courseId: 1 }, { unique: true });
   ```

3. **Assume email visibility can be "fixed"**
   - There are NO additional scopes that will reveal hidden emails
   - This is a domain-level privacy policy, not an API limitation

## Implementation in This System

### Database Models

All models use `userId` as the primary identifier:

#### Course Model
```javascript
{
  ownerId: String,        // Google User ID (PRIMARY IDENTIFIER)
  teachers: [String],     // Array of Google User IDs (NOT emails)
  students: [String],     // Array of Google User IDs (NOT emails)
  syncedBy: String        // Impersonation email (authorization only)
}
```

#### Teacher Model
```javascript
{
  userId: String,         // Google User ID (PRIMARY IDENTIFIER)
  emailAddress: String,   // Optional - may be "no-email-*"
  courseId: String,
  syncedBy: String        // Impersonation email (authorization only)
}
// Unique index: (userId + courseId)
```

#### Assignment Model
```javascript
{
  id: String,             // Google CourseWork ID
  courseId: String,
  syncedBy: String        // Impersonation email (authorization only)
}
```

#### Submission Model
```javascript
{
  userId: String,         // Google User ID (PRIMARY IDENTIFIER)
  courseId: String,
  courseWorkId: String,
  syncedBy: String        // Impersonation email (authorization only)
}
```

### Sync Logic

The sync service (`syncService.js`) implements the correct approach:

```javascript
// ✅ CORRECT: Handle missing emails gracefully
const teacherEmail = t.profile.emailAddress || `no-email-${t.userId}@google.com`;

await Teacher.findOneAndUpdate(
    { userId: t.userId, courseId: course.id }, // Use userId, NOT email
    {
        $set: {
            userId: t.userId,
            fullName: t.profile.name?.fullName || 'Unknown Teacher',
            emailAddress: teacherEmail,
            courseId: course.id,
            syncedBy: syncUser,
            syncedAt: syncedAt
        }
    },
    { upsert: true, new: true }
);
```

### Dashboard Controllers

All aggregations use `userId` for grouping:

```javascript
// ✅ CORRECT: Group by userId
const teachersOverview = await Teacher.aggregate([
    { $match: { courseId: { $in: activeCourseIds } } },
    {
        $group: {
            _id: "$userId", // NOT emailAddress
            name: { $first: "$fullName" },
            email: { $first: "$emailAddress" }, // Include for display only
            totalCourses: { $sum: 1 }
        }
    }
]);
```

## Required Scopes

These are the ONLY scopes needed (no email-related scopes exist):

```
https://www.googleapis.com/auth/classroom.courses.readonly
https://www.googleapis.com/auth/classroom.rosters.readonly
https://www.googleapis.com/auth/classroom.coursework.students.readonly
https://www.googleapis.com/auth/classroom.student-submissions.students.readonly
```

## Configuration

### Environment Variables

```bash
# Feature flag to enable assignments/submissions sync
ENABLE_ASSIGNMENTS_SYNC=true

# Service Account Configuration
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
GOOGLE_IMPERSONATED_USER=admin@yourdomain.com
```

### Multiple Teacher Impersonation

Configure multiple teachers in `config/instituteSyncUsers.js`:

```javascript
export const INSTITUTE_SYNC_USERS = [
    "teacher1@mietjammu.in",
    "teacher2@mietjammu.in",
    "teacher3@mietjammu.in"
];
```

Each impersonated user provides authorization to access their visible courses.

## Success Criteria

✅ Courses sync correctly  
✅ Assignments sync for all impersonated teachers  
✅ Submissions sync correctly  
✅ No `no-email-*` logic breaks anything  
✅ Dashboard shows correct counts  
✅ AI insights are factually accurate  
✅ System works fully from MongoDB data  

## Troubleshooting

### Problem: "Teacher not syncing"

**Check:**
1. Is the teacher in `INSTITUTE_SYNC_USERS`?
2. Does the impersonated user have access to the course?
3. Are you checking `userId` instead of `emailAddress`?

### Problem: "Duplicate key error on Teacher"

**Cause:** Old index using `emailAddress`

**Solution:**
```bash
# Drop old index
db.teachers.dropIndex("emailAddress_1_courseId_1")

# New index is created automatically on restart
```

### Problem: "Assignments not syncing"

**Check:**
1. Is `ENABLE_ASSIGNMENTS_SYNC=true` in `.env`?
2. Are the coursework scopes approved in Google Admin Console?
3. Check server logs for specific API errors

## References

- [Google Classroom API Documentation](https://developers.google.com/classroom)
- [Domain-Wide Delegation Guide](https://developers.google.com/identity/protocols/oauth2/service-account#delegatingauthority)
- [Google Workspace Privacy Settings](https://support.google.com/a/answer/60762)

## Summary

**The Golden Rule:**

> Impersonation email = Authorization only  
> Classroom userId = Identity always

Follow this rule, and your system will handle Google Classroom's privacy model correctly.
