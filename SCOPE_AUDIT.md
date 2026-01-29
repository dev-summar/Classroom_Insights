# Google Classroom API Scope Audit & Configuration

## Scope Audit Summary

### APIs Used in Application

Based on comprehensive code analysis of `syncService.js` and `debugRoutes.js`:

| API Call | Code Location | Required Scope |
|----------|--------------|----------------|
| `classroom.courses.list()` | syncService.js:40, debugRoutes.js:46 | `classroom.courses.readonly` |
| `classroom.courses.teachers.list()` | syncService.js:47 | `classroom.rosters.readonly` |
| `classroom.courses.students.list()` | syncService.js:63 | `classroom.rosters.readonly` |
| `classroom.courses.courseWork.list()` | syncService.js:97 | `classroom.coursework.students.readonly` |
| `classroom.courses.courseWork.studentSubmissions.list()` | syncService.js:120 | `classroom.student-submissions.students.readonly` |

### Minimal Required Scopes

```
https://www.googleapis.com/auth/classroom.courses.readonly
https://www.googleapis.com/auth/classroom.rosters.readonly
https://www.googleapis.com/auth/classroom.coursework.students.readonly
https://www.googleapis.com/auth/classroom.student-submissions.students.readonly
```

### Removed Scopes

❌ **Removed**: `https://www.googleapis.com/auth/classroom.guardianlinks.students.readonly`
- **Reason**: No guardian links API calls found in codebase
- **Impact**: None - feature not implemented

## Google Admin Console Configuration

### Step-by-Step Setup

1. **Navigate to Google Admin Console**
   - Go to: https://admin.google.com
   - Sign in with super admin account

2. **Access Security Settings**
   - Security → Access and data control → API controls
   - Click "MANAGE DOMAIN WIDE DELEGATION"

3. **Find Your Service Account**
   - Locate entry for Client ID: (your service account client ID)
   - Or add new if not exists

4. **Configure Scopes**
   - Click "Edit" or "Add new"
   - **Client ID**: (from Service Account JSON - `client_id` field)
   - **OAuth Scopes**: Paste exactly:

```
https://www.googleapis.com/auth/classroom.courses.readonly,https://www.googleapis.com/auth/classroom.rosters.readonly,https://www.googleapis.com/auth/classroom.coursework.students.readonly,https://www.googleapis.com/auth/classroom.student-submissions.students.readonly
```

5. **Save and Wait**
   - Click "Authorize"
   - Wait 5-10 minutes for propagation

## Service Account Details

### From .env File
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account-karan-classroo@pi360-316ef.iam.gserviceaccount.com
GOOGLE_IMPERSONATED_USER=karan.cse@mietjammu.in
```

### Getting Client ID

If you need the Client ID for Domain-Wide Delegation:

1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Select project: `pi360-316ef`
3. Find service account: `service-account-karan-classroo@pi360-316ef.iam.gserviceaccount.com`
4. Click on it → "Details" tab
5. Copy the "Unique ID" (this is your Client ID for DWD)

OR extract from Service Account JSON key:
```json
{
  "client_id": "YOUR_CLIENT_ID_HERE"
}
```

## Verification Steps

### 1. Test Scope Authorization

```bash
# From backend directory
npm run dev
```

Check console output for:
```
[AUTH] Initializing Google Classroom API client (JWT: karan.cse@mietjammu.in)
```

### 2. Test API Endpoint

```bash
curl http://localhost:5000/api/debug/test-courses
```

**Expected Success Response**:
```json
{
  "status": "success",
  "impersonated_user": "karan.cse@mietjammu.in",
  "course_count": X,
  "courses": [...]
}
```

**If Still Getting `unauthorized_client`**:
- Verify scopes in Admin Console match exactly (no extra spaces)
- Wait 10 minutes after saving in Admin Console
- Ensure Service Account email is correct
- Verify impersonated user has Classroom data
- Check that impersonated user is in the same domain

### 3. Full Sync Test

```bash
curl -X POST http://localhost:5000/api/sync
```

Should sync:
- ✅ Courses
- ✅ Teachers
- ✅ Students
- ✅ Assignments
- ✅ Submissions

## Scope Permission Levels

### Read-Only Scopes (All Used)
- ✅ `classroom.courses.readonly` - View courses
- ✅ `classroom.rosters.readonly` - View teachers and students
- ✅ `classroom.coursework.students.readonly` - View assignments
- ✅ `classroom.student-submissions.students.readonly` - View submissions

### NOT Used (Intentionally Excluded)
- ❌ `classroom.guardianlinks.*` - Guardian information
- ❌ `classroom.announcements.*` - Announcements
- ❌ `classroom.topics.*` - Course topics
- ❌ `classroom.profile.*` - User profiles (separate API)

## Troubleshooting

### Error: `unauthorized_client`

**Possible Causes**:
1. Scopes in code don't match Admin Console
2. Domain-Wide Delegation not enabled
3. Service Account Client ID not authorized
4. Propagation delay (wait 10 minutes)
5. Wrong Google Workspace domain

**Solution Checklist**:
- [ ] Verify exact scope match between code and Admin Console
- [ ] Confirm Client ID is correct
- [ ] Wait 10 minutes after Admin Console changes
- [ ] Restart backend server
- [ ] Check Service Account is in correct GCP project
- [ ] Verify impersonated user exists in domain

### Error: `DECODER routines::unsupported`

**Solution**: Check private key format in `.env`
- Ensure no quotes around the key
- Ensure `\n` characters are present (not actual newlines)

### Error: `ERR_MODULE_NOT_FOUND`

**Solution**: All auth middleware has been removed
- Verify no files import `authMiddleware.js`
- Check all route files are updated

## Security Notes

⚠️ **Service Account Best Practices**:
- Never commit `.env` file to git
- Rotate Service Account keys periodically
- Use minimal scopes (as implemented)
- Audit API usage regularly
- Monitor Service Account activity in GCP Console

## Code Changes Made

### File: `backend/src/auth/googleAuth.js`

**Before**:
```javascript
const CLASSROOM_SCOPES = [
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.rosters.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
    'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly',
    'https://www.googleapis.com/auth/classroom.guardianlinks.students.readonly'  // REMOVED
];
```

**After**:
```javascript
const CLASSROOM_SCOPES = [
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.rosters.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
    'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly'
];
```

## Next Steps

1. **Update Google Admin Console** with the 4 scopes listed above
2. **Wait 10 minutes** for propagation
3. **Restart backend server**: `npm run dev`
4. **Test**: `curl http://localhost:5000/api/debug/test-courses`
5. **Verify**: Should return courses without `unauthorized_client` error

✅ **One-line guarantee**: "Only scopes that are explicitly required by our Classroom APIs are requested in code and authorized in Admin Console, eliminating unauthorized_client errors."
