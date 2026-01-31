# MIET Google Classroom Analytics

## Project Overview
MIET Google Classroom Analytics is a centralized institutional intelligence platform developed for the Model Institute of Engineering and Technology (MIET). It provides a unified, data-driven perspective on academic activity by aggregating data from Google Classroom into a high-performance MongoDB environment. The platform is designed to offer administrators and academic leaders a single source of truth for tracking course engagement, teacher workloads, and student participation across the entire institute.

## Key Features
*   **Centralized Institutional Dashboard**: A macro-view of all active academic operations.
*   **Automated Data Sync**: Securely migrates data from Google Cloud to local storage using Service Accounts.
*   **Teacher Workload Analytics**: Detailed insights into teacher-course assignments and student reach.
*   **Dedicated Student Tracking**: Unique student identification and cross-course enrollment analysis.
*   **AI-Powered Academic Insights**: Evidence-based analysis of institutional performance using Large Language Models (LLMs) grounded in local database facts.
*   **Persistence & Offline Availability**: All dashboard metrics and insights are available without requiring live Google API connectivity.

## Architecture Overview
The system follows a Decoupled Sync Architecture:
*   **Persistence Layer**: MongoDB serves as the backbone for all analytical queries, ensuring fast access to historical and current data.
*   **Sync Layer**: A backend service utilizing `google-auth-library` and `googleapis` to fetch institutional data via Service Account authentication.
*   **Presentation Layer**: A modern React-based frontend that communicates exclusively with the backend API to query MongoDB.
*   **AI Layer**: An analytics engine that processes database aggregations to provide objective, hallucination-free summaries.

## Authentication & Security
*   **Domain-Wide Delegation (DWD)**: The platform utilizes a Google Cloud Service Account authorized with DWD at the Google Workspace level.
*   **Impersonation Protocol**: The backend impersonates institutional admin/teacher accounts to fetch data across the domain, eliminating the need for individual user OAuth consent.
*   **Minimal Privilege Scopes**: Operates under strict read-only scopes (`classroom.courses.readonly`, `classroom.rosters.readonly`) to ensure data integrity and security.

## Sync Workflow
The sync process is deliberate and deterministic:
1.  **Initiation**: A manual manual "Sync Now" trigger starts the process.
2.  **Impersonation**: The system cycles through configured institutional accounts.
3.  **Extraction**: Google Classroom APIs are queried for courses, rosters, assignments, and submissions.
4.  **Transformation**: Data is normalized and deduplicated based on Google-issued unique identifiers.
5.  **Upsert Logic**: Existing records are updated with the latest activity, while new records are appended.
6.  **Completion**: The dashboard and all analytical views are updated to reflect the new database state.

## Data Model Summary
*   **Courses**: Stores course metadata, IDs, and state (ACTIVE, ARCHIVED, PROVISIONED).
*   **Teachers**: Derived from course ownership and teacher rosters; stored with unique email identifiers.
*   **Students**: Unique user profiles derived from course enrollments (course.students[]).
*   **Assignments**: Coursework metadata including due dates and creation times.
*   **Submissions**: Student submission states (TURNED_IN, RETURNED, etc.) and timestamps.

## Dashboard Metrics Explained
The dashboard represents the **Institutional Active Footprint**:
*   **Total Active Courses**: Count of deduplicated courses where `courseState === "ACTIVE"`.
*   **Total Students**: Count of unique Google User IDs enrolled in active courses.
*   **Teachers**: Total unique instructors identified across the active course roster.
*   **Assignments & Submissions**: Cumulative metrics representing material distribution and completion rates within active courses.
*   **Interactive KPIs**: Key cards act as navigation shortcuts providing seamless transitions to detailed lists (e.g., clicking "Total Students" opens the Student Registry).

## Teachers Overview Explained
The Teachers Overview is a high-level aggregation view:
*   **Aggregation**: Utilizes MongoDB `$group` pipelines on the Teacher and Course collections.
*   **Metrics**: Displays the teacher's name, email, and the total count of ACTIVE courses they currently manage.
*   **Sorting**: Prioritizes teachers with higher course loads (DESC) to assist in resource management.
*   **Drill-down**: Supports viewing the specific active course list associated with a selected teacher.

## AI Insights Design Rules
The AI Insight module is governed by strict **Fact-Based Prompting**:
*   **Source of Truth**: The AI is provided with a structural context derived strictly from MongoDB aggregations.
*   **Non-Hallucination Policy**: The AI is prohibited from inferring or assuming data not present in the provided context.
*   **Missing Data Handling**: If a specific metric is unavailable in the database, the AI must explicitly report the data gap.
*   **Scope Limitation**: Analysis is strictly confined to the currently synced active data set.

## Performance & Scalability
*   **Query Optimization**: MongoDB collections are indexed by `id`, `googleId`, and `courseState` for sub-second query performance.
*   **Aggregation Pipelines**: All dashboard queries utilize optimized server-side processing rather than large-scale client-side filtering.
*   **Background Syncing**: The sync process runs asynchronously to ensure the UI remains fast and responsive during data updates.
*   **Zero Live Latency**: By eliminating direct Google API calls during dashboard loading, the platform maintains maximum speed.

## Setup & Environment Variables
**Prerequisites**: Node.js v16+, MongoDB, Google Cloud Project with Domain-Wide Delegation.

**Required Environment Variables**:
*   `MONGODB_URI`: Connection string for the MongoDB instance.
*   `GOOGLE_SERVICE_ACCOUNT_EMAIL`: The email of the authorized service account.
*   `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: The RSA private key for JWT signing.
*   `GOOGLE_IMPERSONATED_USER`: The primary institutional account to impersonate.
*   `ENABLE_ASSIGNMENTS_SYNC`: Set to `true` to enable assignments and submissions sync.
*   `CORS_ORIGIN`: Allowed frontend origin for security.

## Google Classroom "no-email-*" Users

### Important Note
Google Classroom may return user profiles with email addresses like `no-email-123456789@google.com`. This is **EXPECTED and CORRECT** behavior based on:
- Privacy settings in your Google Workspace domain
- Google Classroom's API privacy model
- User relationship permissions

### How This System Handles It
✅ **Uses `userId` as the primary identifier** - Every user has a unique Google User ID that is always available  
✅ **Email is optional** - Stored for display purposes only, never used for identity matching  
✅ **No sync failures** - Teachers and students with `no-email-*` addresses are processed correctly  
✅ **Proper database constraints** - All unique indexes use `userId`, not `emailAddress`

### What This Means
- **Impersonation email** = Authorization only (used in JWT subject for Domain-Wide Delegation)
- **Classroom userId** = Identity always (used for all database operations and matching)

For detailed technical information, see `backend/GOOGLE_CLASSROOM_NO_EMAIL_GUIDE.md`.

## Sync Instructions
1.  Navigate to the Dashboard / Home Page.
2.  Ensure the backend server is active and connected to the database.
3.  Click the **"Sync Data"** button in the header.
4.  Wait for the "Sync Started" notification; the process runs in the background.
5.  Once completed, the dashboard will reflect the latest institutional data.

## Design Principles
*   **Institutional Aggregation**: Every metric is calculated at the MIET-wide level.
*   **Data Consistency**: The count shown on any dashboard card must exactly match the number of records in its corresponding detailed view.
*   **Transparency**: Clear differentiation between active data and filtered (Archived/Provisioned) data.
*   **Professional UX**: Clean typography (Inter/Roboto), institutional color palettes, and responsive design.

## Future Enhancements
*   **Trend Snapshots**: Periodic snapshots to visualize growth in engagement over time.
*   **Predictive At-Risk Identification**: Early warning system for courses with low activity.
*   **Automated Export**: Generation of institutional PDF reports for department heads.
*   **Multi-Semester Filtering**: Support for analyzing data across different academic cycles.

## Final Notes
This platform serves as a critical bridge between raw classroom activity and actionable academic leadership. By centralizing Google Classroom data into a dedicated analytics environment, MIET ensures data-driven decision-making and enhanced transparency across its entire educational ecosystem.
