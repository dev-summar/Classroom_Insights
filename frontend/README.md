# Institute Google Classroom Analytics Dashboard - Frontend

This is the production-ready frontend for the Institute Google Classroom Analytics Dashboard.

## Tech Stack
- **React + Vite**
- **Material UI (MUI)**: For UI components and styling.
- **Axios**: For API communication with the backend.
- **Recharts**: For data visualization (Dashboard charts).
- **React Router**: For navigation and protected routing.

## Features
- **JWT Authentication**: Secure login flow with Google OAuth redirect.
- **Dashboard**: High-level summary cards and engagement charts.
- **Courses**: Overview of all synced courses.
- **Assignments**: Tracking submission rates across assignments.
- **Submissions**: Detailed submission records with filtering capability.
- **Silent Students**: Identification of at-risk students (NAAC/IQAC friendly).

## Setup & Run

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Configuration**:
    The frontend is pre-configured to connect to the backend at `http://localhost:5000`. If your backend runs on a different port, update `src/api/axios.js`.

3.  **Start Development Server**:
    ```bash
    npm run dev
    ```

4.  **Access**:
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture
- `src/api`: Axios instance with JWT interceptors.
- `src/auth`: Protected routes and auth logic.
- `src/components`: Shared UI components (Sidebar, Topbar, StatCard).
- `src/pages`: Individual page implementations.
