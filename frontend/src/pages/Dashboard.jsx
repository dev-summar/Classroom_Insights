import { Grid, Typography, Box, Paper, LinearProgress, Divider, Avatar, Card, CardContent, Button, Snackbar, Alert } from '@mui/material';
import { Class, Assignment, People, PendingActions, InfoOutlined, TrendingUp, Warning, ArrowForward, AccessTime as clockIcon, Sync, SupervisorAccount as TeacherIcon } from '@mui/icons-material';
import StatCard from '../components/StatCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        courses: 0,
        assignments: 0,
        students: 0,
        teachers: 0,
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
    const [syncing, setSyncing] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    const handleSnackbarClose = () => setSnackbar({ ...snackbar, open: false });

    const fetchData = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const [statsRes, chartsRes] = await Promise.all([
                axios.get('/api/dashboard/stats'),
                axios.get('/api/dashboard/charts')
            ]);

            const data = statsRes.data;
            const charts = chartsRes.data;

            setStats({
                courses: data.courses || 0,
                assignments: data.assignments || 0,
                students: data.students || 0,
                teachers: data.teachers || 0,
                pending: data.pending || 0,
                submitted: data.submitted || 0,
                atRisk: data.atRisk || 0,
                silent: data.silent || 0,
                maxInactivity: data.maxInactivity || 0
            });

            setChartData(charts.engagement || []);
            setTopAssignments(charts.topAssignments || []);

            setCompletionData([
                { name: 'Submitted', value: data.submitted || 0 },
                { name: 'Pending', value: data.pending || 0 }
            ]);

            setLoading(false);
        } catch (err) {
            console.error('Error fetching dashboard data', err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Refetch on tab focus to ensure data persistence across tabs (Rule 2)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchData(true);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        setSnackbar({ open: true, message: 'Institutional sync started in background...', severity: 'info' });
        try {
            // Rule: Sync is background only, dashboard must stay fast
            await axios.post('/api/sync/institute');

            // Poll for updates every 10 seconds during sync
            const pollInterval = setInterval(async () => {
                await fetchData(true);
            }, 10000);

            // Stop polling after 1 minute (assuming sync finishes or we just stop)
            setTimeout(() => {
                clearInterval(pollInterval);
                setSyncing(false);
                setSnackbar({ open: true, message: 'Sync cycle completed.', severity: 'success' });
            }, 60000);

        } catch (error) {
            console.error('Sync failed', error);
            setSyncing(false);
            setSnackbar({ open: true, message: 'Sync failed. Check console for details.', severity: 'error' });
        }
    };

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
                        MIET Google Classroom Analytics
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Institute-wide insights derived from Google Classroom data, providing a unified view of active courses, students, teachers, assignments, submissions, and engagement across MIET.
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Sync />}
                        onClick={handleSync}
                        disabled={syncing}
                        sx={{ fontWeight: 'bold' }}
                    >
                        {syncing ? 'Syncing...' : 'Sync Data'}
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Row 1 */}
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Courses"
                        value={stats.courses}
                        icon={<Class />}
                        color="#2563eb"
                        onClick={() => navigate('/courses')}
                        cta
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Assignments"
                        value={stats.assignments}
                        icon={<Assignment />}
                        color="#7c3aed"
                        onClick={() => navigate('/assignments')}
                        cta
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Students"
                        value={stats.students}
                        icon={<People />}
                        color="#0891b2"
                        onClick={() => navigate('/students')}
                        cta
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Teachers"
                        value={stats.teachers}
                        icon={<TeacherIcon />}
                        color="#10b981"
                        subtext="Active course instructors"
                        onClick={() => navigate('/teachers-overview')}
                        cta
                    />
                </Grid>

                {/* Row 2 */}
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Pending Tasks"
                        value={stats.pending}
                        icon={<PendingActions />}
                        color="#ea580c"
                        subtext="Submissions awaiting review"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="At-Risk Students"
                        value={stats.atRisk}
                        icon={<Warning />}
                        color="#ef4444"
                        subtext="Need attention"
                        onClick={() => navigate('/at-risk-students')}
                        cta
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Silent Students"
                        value={stats.silent}
                        icon={<clockIcon />}
                        color="#f59e0b"
                        subtext="Early warning"
                        onClick={() => navigate('/silent-students')}
                        cta
                    />
                </Grid>
            </Grid>

            {stats.courses === 0 && !loading && (
                <Paper sx={{ p: 4, textAlign: 'center', mb: 4, bgcolor: '#f1f5f9' }}>
                    <Typography variant="h6" color="text.secondary">No data available</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Click the 'Sync Data' button to fetch latest Classroom data from authorized institute accounts.</Typography>
                    <Button variant="outlined" startIcon={<Sync />} onClick={handleSync} disabled={syncing}>Sync Now</Button>
                </Paper>
            )}

            <Grid container spacing={3}>
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
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="submitted" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                                <Bar dataKey="total" fill="#e5e7eb" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6} lg={4}>
                    <Paper sx={{ p: 4, borderRadius: 4, height: '100%', minHeight: 450, border: '1px solid', borderColor: 'divider' }} elevation={0}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Submission Completion</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Overall institute-wide submission ratio</Typography>
                        <Box sx={{ height: 260, position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={completionData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value">
                                        {completionData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#f43f5e'} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.submitted + stats.pending > 0 ? Math.round((stats.submitted / (stats.submitted + stats.pending)) * 100) : 0}%</Typography>
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
                                        <LinearProgress variant="determinate" value={assignment.percentage} sx={{ flexGrow: 1, height: 8, borderRadius: 4, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: assignment.percentage > 70 ? '#10b981' : assignment.percentage > 40 ? '#3b82f6' : '#f59e0b' } }} />
                                        <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 40, textAlign: 'right' }}>{assignment.percentage}%</Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Grid>

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

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose}>
                <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Dashboard;
