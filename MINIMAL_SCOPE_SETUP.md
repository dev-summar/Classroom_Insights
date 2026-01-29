# Minimal Scope Configuration - Phase 1

## Current Status: MINIMAL SCOPE SET

To fix the `unauthorized_client` error, we've reduced to the absolute minimum scopes required for basic Classroom functionality.

## Phase 1: Minimal Scopes (CURRENT)

```
https://www.googleapis.com/auth/classroom.courses.readonly
https://www.googleapis.com/auth/classroom.rosters.readonly
```

### What This Enables
- ✅ List courses
- ✅ View course details
- ✅ List teachers
- ✅ List students

### What This Does NOT Enable (Yet)
- ❌ View assignments (coursework)
- ❌ View submissions

## Google Admin Console Configuration

### Step 1: Update Domain-Wide Delegation

1. Go to: **https://admin.google.com**
2. Navigate to: **Security → API Controls → Domain-Wide Delegation**
3. Find your Service Account entry (or add new)
4. **Client ID**: Get from Service Account details in GCP Console
5. **OAuth Scopes**: Paste EXACTLY (comma-separated, no spaces):

```
https://www.googleapis.com/auth/classroom.courses.readonly,https://www.googleapis.com/auth/classroom.rosters.readonly
```

6. Click **Authorize**
7. **WAIT 10 MINUTES** for propagation

### Step 2: Verify Service Account Details

**Service Account Email**: `service-account-karan-classroo@pi360-316ef.iam.gserviceaccount.com`
**Impersonated User**: `karan.cse@mietjammu.in`
**Project**: `pi360-316ef`

### Step 3: Get Client ID (if needed)

**Option A - From GCP Console**:
1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=pi360-316ef
2. Click on: `service-account-karan-classroo@pi360-316ef.iam.gserviceaccount.com`
3. Go to "Details" tab
4. Copy the **Unique ID** (this is your Client ID for DWD)

**Option B - From Service Account JSON Key**:
```json
{
  "client_id": "YOUR_CLIENT_ID_HERE"
}
```

## Testing Phase 1

### 1. Restart Backend
```bash
cd backend
npm run dev
```

### 2. Test Auth Status
```bash
curl http://localhost:5000/api/debug/auth-status
```

**Expected Output**:
```json
{
  "status": "success",
  "auth_client_type": "JWT",
  "impersonated_subject": "karan.cse@mietjammu.in",
  "is_jwt": true,
  "message": "Verification Passed: Auth is strictly JWT via Service Account."
}
```

### 3. Test Courses API
```bash
curl http://localhost:5000/api/debug/test-courses
```

**Expected Success**:
```json
{
  "status": "success",
  "impersonated_user": "karan.cse@mietjammu.in",
  "course_count": X,
  "courses": [...]
}
```

**If Still Getting Error**:
- Verify scopes in Admin Console are EXACTLY as shown above
- Wait full 10 minutes after saving in Admin Console
- Restart backend server
- Clear any cached tokens (restart fixes this)

## Phase 2: Add Coursework Scopes (AFTER Phase 1 Works)

Once Phase 1 is verified working, add these scopes:

```
https://www.googleapis.com/auth/classroom.coursework.students.readonly
https://www.googleapis.com/auth/classroom.student-submissions.students.readonly
```

**Full Phase 2 Scope String for Admin Console**:
```
https://www.googleapis.com/auth/classroom.courses.readonly,https://www.googleapis.com/auth/classroom.rosters.readonly,https://www.googleapis.com/auth/classroom.coursework.students.readonly,https://www.googleapis.com/auth/classroom.student-submissions.students.readonly
```

Then update code in `backend/src/auth/googleAuth.js`:
```javascript
const CLASSROOM_SCOPES = [
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.rosters.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
    'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly'
];
```

## Troubleshooting

### Error: `unauthorized_client`

**Root Causes**:
1. ❌ Scopes in Admin Console don't match code
2. ❌ Client ID is incorrect
3. ❌ Domain-Wide Delegation not enabled
4. ❌ Propagation delay (need to wait)
5. ❌ Wrong Google Workspace domain

**Solutions**:
- [ ] Double-check scope string is EXACT (no extra spaces, commas correct)
- [ ] Verify Client ID matches Service Account
- [ ] Wait full 10 minutes after Admin Console changes
- [ ] Restart backend server completely
- [ ] Verify impersonated user exists in domain
- [ ] Check Service Account is in correct GCP project

### Error: `invalid_grant`

**Cause**: Impersonated user doesn't exist or isn't in the domain

**Solution**: Verify `karan.cse@mietjammu.in` exists and has Classroom access

### Error: `DECODER routines::unsupported`

**Cause**: Private key format issue in `.env`

**Solution**: 
- Remove quotes around private key
- Ensure `\n` characters (not actual newlines)
- Check key starts with `-----BEGIN PRIVATE KEY-----`

## Important Notes

⚠️ **Scope Order Doesn't Matter** - But exact spelling does!

⚠️ **No Spaces in Scope String** - Commas only, no spaces

⚠️ **Case Sensitive** - Must be exact lowercase

⚠️ **No Profile Scopes** - Never use `classroom.profile.*` scopes with DWD

## Verification Checklist

Phase 1 Complete When:
- [ ] Admin Console updated with 2 scopes
- [ ] Waited 10 minutes
- [ ] Backend restarted
- [ ] `/api/debug/auth-status` returns JWT
- [ ] `/api/debug/test-courses` returns courses
- [ ] No `unauthorized_client` errors

✅ **One-line guarantee**: "Removing classroom.profile.* scopes and using only courses.readonly + rosters.readonly restores Service Account impersonation and eliminates the unauthorized_client error."
