
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Assignments from './pages/Assignments';
import Submissions from './pages/Submissions';
import SilentStudents from './pages/SilentStudents';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import CourseDetail from './pages/CourseDetail';
import AIInsights from './pages/AIInsights';
import AtRiskStudents from './pages/AtRiskStudents';
import TeachersOverview from './pages/TeachersOverview';
import TeacherDetail from './pages/TeacherDetail';
import Students from './pages/Students';
import { Box } from '@mui/material';

const Layout = ({ children }) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Topbar />
            <Box sx={{ display: 'flex', flexGrow: 1 }}>
                <Sidebar />
                <Box component="main" sx={{ p: 3, flexGrow: 1 }}>
                    {children}
                </Box>
            </Box>
        </Box>
    );
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
                <Route path="/teachers-overview" element={<Layout><TeachersOverview /></Layout>} />
                <Route path="/dashboard/teachers/:userId" element={<Layout><TeacherDetail /></Layout>} />
                <Route path="/courses" element={<Layout><Courses /></Layout>} />
                <Route path="/courses/:courseId" element={<Layout><CourseDetail /></Layout>} />
                <Route path="/assignments" element={<Layout><Assignments /></Layout>} />
                <Route path="/submissions" element={<Layout><Submissions /></Layout>} />
                <Route path="/ai-insights" element={<Layout><AIInsights /></Layout>} />
                <Route path="/at-risk-students" element={<Layout><AtRiskStudents /></Layout>} />
                <Route path="/silent-students" element={<Layout><SilentStudents /></Layout>} />
                <Route path="/students" element={<Layout><Students /></Layout>} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
