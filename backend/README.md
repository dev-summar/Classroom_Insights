# Google Classroom Analytics Backend

Production-grade backend for collecting and analyzing Google Classroom data. Built with Node.js, Express, and MongoDB.

## Features

- **Google OAuth 2.0 Integration**: Secure authentication with refresh token storage.
- **Data Synchronization**:
  - Fetches Courses, Rosters (Teachers/Students), Assignments, and Submissions.
  - Nightly Cron Job (`src/cron/syncJobs.js`) keeps data up-to-date.
  - Manual sync trigger via API (implicit in login or specialized endpoints if added).
- **Analytics Ready**:
  - Stores historical data in MongoDB to enable trend analysis (e.g., submission lateness over time).
  - "Silent Students" report endpoint.
- **Security**:
  - AES-256 encryption for stored Google Refresh Tokens.
  - JWT for frontend session management.
  - Role-Based Access Control (Admin vs Viewer).
  - Helmet & CORS security headers.

## Architecture

The project follows a layered architecture:

- **`src/config`**: Configuration files (DB connection, env vars).
- **`src/auth`**: Google OAuth specific logic (login URL generation, token exchange).
- **`src/middlewares`**: Authentication (`protect`) and Error handling.
- **`src/controllers`**: Request handlers. separating Auth logic from Business logic.
- **`src/services`**: External API wrappers (Google Classroom API). Handles complexity of pagination and rate limiting.
- **`src/models`**: Mongoose schemas.
- **`src/cron`**: Scheduled tasks.
- **`src/utils`**: Helpers (Encryption, JWT).

### Database Choice: MongoDB
MongoDB was chosen for its flexibility with nested JSON structures returned by Google APIs (e.g., `materials` in assignments, `gradeHistory` in submissions) and ease of schema evolution.

## Setup Instructions

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Google Cloud Console Project with "Google Classroom API" enabled.

### 2. Google Cloud Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project.
3. Enable **Google Classroom API** and **Google People API** (for user profiles).
4. Create **OAuth 2.0 Client ID Credentials**.
5. Set Redirect URI to `http://localhost:5000/auth/callback` (or your production URL).
6. Copy Client ID and Client Secret.

### 3. Environment Variables
Copy `.env.example` to `.env` and fill in the values:
```bash
cp .env.example .env
```
- `MONGO_URI`: Connection string.
- `GOOGLE_CLIENT_ID` / `SECRET`: From Google Cloud.
- `JWT_SECRET`: Random string for signing sessions.

### 4. Installation
```bash
cd backend
npm install
```

### 5. Running the App
- **Development**:
  ```bash
  npm run dev
  ```
- **Production**:
  ```bash
  npm start
  ```

## API Endpoints

### Auth
- `GET /auth/login`: Redirects to Google Login.
- `GET /auth/callback`: Handles OAuth callback, creates user, returns JWT.

### Analytics Data
- `GET /api/courses`: List courses for logged-in user.
- `GET /api/courses/:id/students`: List students in a course.
- `GET /api/assignments`: List all assignments.
- `GET /api/submissions`: List submissions (filterable).
- `GET /api/reports/silent-students`: Identify at-risk students.

## Security Notes
- Refresh tokens are encrypted at rest using `src/utils/encryption.js`.
- JWTs expire in 7 days (configurable).
- API is CORS-enabled for frontend integration.
