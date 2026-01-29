import { Grid, Typography, Box, Paper, LinearProgress, Divider, Avatar, Card, CardContent, Button } from '@mui/material';
import { Class, Assignment, People, PendingActions, InfoOutlined, TrendingUp, Warning, ArrowForward, PersonOff as SilentIcon } from '@mui/icons-material';
import StatCard from '../components/StatCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        courses: 0,
        assignments: 0,
        students: 0,
        pending: 0,
        submitted: 0,
        atRisk: 0,
        silent: 0,
        maxInactivity: 0
    });
    const [chartData, setChartData] = useState([]);
    const [completionData, setCompletionData] = useState([]);
    const [topAssignments, setTopAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [coursesRes, assignmentsRes, submissionsRes, atRiskRes, silentRes] = await Promise.all([
                    axios.get('/api/courses'),
                    axios.get('/api/assignments'),
                    axios.get('/api/submissions'),
                    axios.get('/api/at-risk'),
                    axios.get('/api/silent-students')
                ]);

                const totalCourses = coursesRes.data.length;
                const totalAssignments = assignmentsRes.data.length;
                const totalAtRisk = atRiskRes.data.length;
                const totalSilent = silentRes.data.length;

                const maxInactivity = silentRes.data.length > 0
                    ? Math.max(...silentRes.data.map(s => s.daysSinceLastActivity || 0))
                    : 0;

                // Unique students
                const studentSet = new Set();
                coursesRes.data.forEach(course => {
                    if (course.students && Array.isArray(course.students)) {
                        course.students.forEach(s => studentSet.add(s));
                    }
                });
                const totalStudents = studentSet.size;

                const submittedSubmissions = submissionsRes.data.filter(s => s.state === 'TURNED_IN' || s.state === 'RETURNED').length;
                const pendingSubmissions = submissionsRes.data.length - submittedSubmissions;

                setStats({
                    courses: totalCourses,
                    assignments: totalAssignments,
                    students: totalStudents,
                    pending: pendingSubmissions,
                    submitted: submittedSubmissions,
                    atRisk: totalAtRisk,
                    silent: totalSilent,
                    maxInactivity
                });

                // Completion Donut Data
                setCompletionData([
                    { name: 'Submitted', value: submittedSubmissions },
                    { name: 'Pending', value: pendingSubmissions }
                ]);

                // Assignment Engagement (Bar Chart)
                const engagement = assignmentsRes.data.slice(0, 6).map(a => {
                    const subs = submissionsRes.data.filter(s => s.courseWorkId === a.id);
                    const submitted = subs.filter(s => s.state === 'TURNED_IN' || s.state === 'RETURNED').length;
                    return {
                        name: a.title.length > 15 ? a.title.substring(0, 12) + '...' : a.title,
                        fullTitle: a.title,
                        submitted: submitted,
                        total: subs.length || 0
                    };
                });
                setChartData(engagement);

                // Top Assignments Progress
                const topOnes = assignmentsRes.data.slice(0, 4).map(a => {
                    const subs = submissionsRes.data.filter(s => s.courseWorkId === a.id);
                    const completed = subs.filter(s => s.state === 'TURNED_IN' || s.state === 'RETURNED').length;
                    return {
                        id: a.id,
                        title: a.title,
                        percentage: subs.length > 0 ? Math.round((completed / subs.length) * 100) : 0,
                        count: `${completed}/${subs.length}`
                    };
                });
                setTopAssignments(topOnes);

                setLoading(false);
            } catch (err) {
                console.error('Error fetching dashboard data', err);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <Paper sx={{ p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: 'none' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>{payload[0].payload.fullTitle || label}</Typography>
                    <Divider sx={{ mb: 1 }} />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Typography variant="body2" color="primary">Submitted: <strong>{payload[0].value}</strong></Typography>
                        <Typography variant="body2" color="text.secondary">Total: <strong>{payload[1].value}</strong></Typography>
                    </Box>
                </Paper>
            );
        }
        return null;
    };

    return (
        <Box sx={{ pb: 6 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em' }}>
                        Institute Analytics
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Comprehensive overview of academic performance and engagement.
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    {stats.atRisk > 0 && (
                        <Card sx={{
                            bgcolor: '#fef2f2',
                            border: '1px solid',
                            borderColor: '#fecaca',
                            borderRadius: 3,
                            boxShadow: 'none',
                        }}>
                            <CardContent sx={{ py: '12px !important', px: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: '#ef4444', width: 36, height: 36 }}>
                                    <Warning sx={{ color: 'white', fontSize: 20 }} />
                                </Avatar>
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#991b1b', lineHeight: 1.2 }}>
                                        At-Risk Alert
                                    </Typography>
                                    <Typography variant="caption" color="#b91c1c" sx={{ fontWeight: 600 }}>
                                        {stats.atRisk} students need attention
                                    </Typography>
                                </Box>
                                <Button
                                    size="small"
                                    color="error"
                                    variant="text"
                                    endIcon={<ArrowForward />}
                                    onClick={() => navigate('/at-risk')}
                                    sx={{ ml: 1, fontWeight: 700, fontSize: '0.75rem' }}
                                >
                                    Details
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {stats.silent > 0 && (
                        <Card sx={{
                            bgcolor: '#f8fafc',
                            border: '1px solid',
                            borderColor: '#e2e8f0',
                            borderRadius: 3,
                            boxShadow: 'none',
                        }}>
                            <CardContent sx={{ py: '12px !important', px: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: '#475569', width: 36, height: 36 }}>
                                    <SilentIcon sx={{ color: 'white', fontSize: 20 }} />
                                </Avatar>
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>
                                        Silent Students
                                    </Typography>
                                    <Typography variant="caption" color="#475569" sx={{ fontWeight: 600 }}>
                                        {stats.silent} students inactive (Max: {stats.maxInactivity}d)
                                    </Typography>
                                </Box>
                                <Button
                                    size="small"
                                    color="inherit"
                                    variant="text"
                                    endIcon={<ArrowForward />}
                                    onClick={() => navigate('/silent-students')}
                                    sx={{ ml: 1, fontWeight: 700, fontSize: '0.75rem', color: '#1e293b' }}
                                >
                                    Details
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </Box>
            </Box>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Total Courses" value={stats.courses} icon={<Class />} color="#2563eb" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Total Assignments" value={stats.assignments} icon={<Assignment />} color="#7c3aed" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Total Students" value={stats.students} icon={<People />} color="#0891b2" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Pending Tasks" value={stats.pending} icon={<PendingActions />} color="#ea580c" />
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                {/* Main Engagement Chart */}
                <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 4, borderRadius: 4, height: '100%', minHeight: 450, border: '1px solid', borderColor: 'divider' }} elevation={0}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>Assignment Submission Analysis</Typography>
                                <Typography variant="body2" color="text.secondary">Submitted vs Expected submissions for the latest assignments</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#3b82f6' }} />
                                    <Typography variant="caption">Submitted</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#e5e7eb' }} />
                                    <Typography variant="caption">Expected</Typography>
                                </Box>
                            </Box>
                        </Box>

                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="submitted" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                                <Bar dataKey="total" fill="#e5e7eb" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Completion Donut */}
                <Grid item xs={12} md={6} lg={4}>
                    <Paper sx={{ p: 4, borderRadius: 4, height: '100%', minHeight: 450, border: '1px solid', borderColor: 'divider' }} elevation={0}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Submission Completion</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Overall institute-wide submission ratio</Typography>

                        <Box sx={{ height: 260, position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={completionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {completionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#f43f5e'} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <Box sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                textAlign: 'center'
                            }}>
                                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                                    {stats.submitted + stats.pending > 0
                                        ? Math.round((stats.submitted / (stats.submitted + stats.pending)) * 100)
                                        : 0}%
                                </Typography>
                                <Typography variant="caption" color="text.secondary">Completion</Typography>
                            </Box>
                        </Box>

                        <Box sx={{ mt: 2 }}>
                            {completionData.map((item, index) => (
                                <Box key={item.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: index === 0 ? '#3b82f6' : '#f43f5e' }} />
                                        <Typography variant="body2">{item.name}</Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.value}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Grid>

                {/* Top Assignments Progress */}
                <Grid item xs={12} md={6} lg={6}>
                    <Paper sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider' }} elevation={0}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>Assignment Progress</Typography>
                            <InfoOutlined color="action" fontSize="small" />
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {topAssignments.map(assignment => (
                                <Box key={assignment.id}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{assignment.title}</Typography>
                                        <Typography variant="caption" color="text.secondary">{assignment.count} Submissions</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <LinearProgress
                                            variant="determinate"
                                            value={assignment.percentage}
                                            sx={{
                                                flexGrow: 1,
                                                height: 8,
                                                borderRadius: 4,
                                                bgcolor: '#f1f5f9',
                                                '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: assignment.percentage > 70 ? '#10b981' : assignment.percentage > 40 ? '#3b82f6' : '#f59e0b' }
                                            }}
                                        />
                                        <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 40, textAlign: 'right' }}>
                                            {assignment.percentage}%
                                        </Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Grid>

                {/* Participation Snapshot */}
                <Grid item xs={12} md={12} lg={6}>
                    <Paper sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider' }} elevation={0}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Participation Snapshot</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Breakdown of student engagement levels</Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Card sx={{ bgcolor: '#eff6ff', border: 'none', borderRadius: 3 }} elevation={0}>
                                    <CardContent>
                                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase' }}>Active Students</Typography>
                                        <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>{stats.students}</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
                                            <TrendingUp sx={{ fontSize: 16, color: '#10b981' }} />
                                            <Typography variant="caption" sx={{ color: '#10b981' }}>Across {stats.courses} courses</Typography>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6}>
                                <Card sx={{ bgcolor: '#fdf2f8', border: 'none', borderRadius: 3 }} elevation={0}>
                                    <CardContent>
                                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#db2777', textTransform: 'uppercase' }}>Resource Load</Typography>
                                        <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>{stats.assignments}</Typography>
                                        <Typography variant="caption" color="text.secondary">Total assignments published</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>

                        <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: '#f8fafc', border: '1px dashed', borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: '#3b82f6', width: 32, height: 32 }}>
                                    <InfoOutlined sx={{ fontSize: 20 }} />
                                </Avatar>
                                <Typography variant="body2" color="text.primary">
                                    Overall submission activity is <strong>{stats.submitted + stats.pending > 0 ? Math.round((stats.submitted / (stats.submitted + stats.pending)) * 100) : 0}%</strong>.
                                    {stats.pending > stats.submitted ? " High number of pending tasks detected." : " Good engagement levels maintained."}
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;
