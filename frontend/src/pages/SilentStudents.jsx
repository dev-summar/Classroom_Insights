import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Divider } from '@mui/material';
import { PersonOff as SilentIcon, InfoOutlined, Warning, ShowChart, GridView, History } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import axios from '../api/axios';

const SilentStudents = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [explanation, setExplanation] = useState('');
    const [explainingId, setExplainingId] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1 });
    const limit = 25;

    useEffect(() => {
        const fetchSilent = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/api/silent-students?page=${page}&limit=${limit}`);
                const data = res.data.items || [];
                setStudents(data);
                setPagination(res.data.pagination || { page, limit, totalItems: data.length, totalPages: 1 });
                setLoading(false);
            } catch (err) {
                console.error('Error fetching silent students', err);
                setLoading(false);
            }
        };
        fetchSilent();
    }, [page]);

    const handleExplain = async (student) => {
        setExplainingId(student.studentId);
        setExplanation('');
        setOpenDialog(true);
        try {
            const res = await axios.post('/api/silent-students/explain', { studentData: student });
            setExplanation(res.data.explanation);
        } catch (err) {
            setExplanation('Unable to generate explanation.');
        } finally {
            setExplainingId(null);
        }
    };

    // --- Derived Visualizations ---

    // 1. Course-wise Heatmap Data
    const generateHeatmapData = () => {
        const courseMap = {};
        students.forEach(s => {
            if (!courseMap[s.courseName]) {
                courseMap[s.courseName] = { '0-7': 0, '8-14': 0, '15+': 0 };
            }
            const days = s.daysSinceLastActivity === null ? 100 : s.daysSinceLastActivity;
            if (days <= 7) courseMap[s.courseName]['0-7']++;
            else if (days <= 14) courseMap[s.courseName]['8-14']++;
            else courseMap[s.courseName]['15+']++;
        });
        return Object.keys(courseMap).map(course => ({
            name: course,
            ...courseMap[course]
        }));
    };

    // 2. Inactivity Timeline Data
    const generateTimelineData = () => {
        const dayCounts = {};
        students.forEach(s => {
            const days = s.daysSinceLastActivity === null ? 30 : Math.min(s.daysSinceLastActivity, 30);
            dayCounts[days] = (dayCounts[days] || 0) + 1;
        });
        const timeline = [];
        for (let i = 0; i <= 30; i++) {
            timeline.push({ day: i, count: dayCounts[i] || 0 });
        }
        return timeline;
    };

    const heatmapData = generateHeatmapData();
    const timelineData = generateTimelineData();

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ pb: 6 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SilentIcon color="action" fontSize="large" /> Silent Students Report
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Visual insights into student inactivity and engagement benchmarks across institutional courses.
                </Typography>
            </Box>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Heatmap Section */}
                <Grid item xs={12} lg={7}>
                    <Paper sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider', height: '100%' }} elevation={0}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <GridView color="primary" fontSize="small" />
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>Inactivity Distribution by Course</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: 'rgba(71, 85, 105, 0.4)' }} />
                                    <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>0-7d</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: 'rgba(245, 158, 11, 0.4)' }} />
                                    <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>8-14d</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: 'rgba(239, 68, 68, 0.4)' }} />
                                    <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>15d+</Typography>
                                </Box>
                            </Box>
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Course</TableCell>
                                        <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 600 }}>0-7 Days</TableCell>
                                        <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 600 }}>8-14 Days</TableCell>
                                        <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 600 }}>15+ Days</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {heatmapData.map((row) => (
                                        <TableRow key={row.name}>
                                            <TableCell sx={{ fontWeight: 500 }}>{row.name}</TableCell>
                                            <TableCell align="center" sx={{
                                                bgcolor: row['0-7'] > 0 ? `rgba(71, 85, 105, ${Math.min(row['0-7'] * 0.2, 0.8)})` : 'transparent',
                                                color: row['0-7'] > 2 ? 'white' : 'text.primary',
                                                fontWeight: 700, borderRadius: 1
                                            }}>{row['0-7']}</TableCell>
                                            <TableCell align="center" sx={{
                                                bgcolor: row['8-14'] > 0 ? `rgba(245, 158, 11, ${Math.min(row['8-14'] * 0.2, 0.8)})` : 'transparent',
                                                color: row['8-14'] > 2 ? 'white' : 'text.primary',
                                                fontWeight: 700, borderRadius: 1
                                            }}>{row['8-14']}</TableCell>
                                            <TableCell align="center" sx={{
                                                bgcolor: row['15+'] > 0 ? `rgba(239, 68, 68, ${Math.min(row['15+'] * 0.2, 0.8)})` : 'transparent',
                                                color: row['15+'] > 2 ? 'white' : 'text.primary',
                                                fontWeight: 700, borderRadius: 1
                                            }}>{row['15+']}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>

                {/* Timeline Section */}
                <Grid item xs={12} lg={5}>
                    <Paper sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider', height: '100%' }} elevation={0}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <ShowChart color="primary" fontSize="small" />
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Inactivity Timeline</Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    Distribution of students by consecutive days of inactivity
                                </Typography>
                            </Box>
                            {timelineData.length > 0 && Math.max(...timelineData.map(d => d.count)) > 0 && (
                                <Chip
                                    label={`Peak: Day ${timelineData.reduce((prev, current) => (prev.count > current.count) ? prev : current).day}`}
                                    size="small"
                                    sx={{ fontWeight: 700, fontSize: '0.65rem', bgcolor: '#f1f5f9', border: '1px solid', borderColor: 'divider' }}
                                />
                            )}
                        </Box>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={timelineData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <RechartsTooltip />
                                <Area type="monotone" dataKey="count" stroke="#475569" fill="#f1f5f9" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* Detailed Table */}
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Course</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Days Inactive</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Assignments Missed</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Last Activity</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Analysis</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {students.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                    No silent students identified at current thresholds.
                                </TableCell>
                            </TableRow>
                        ) : (
                            students.map((student, idx) => (
                                <TableRow key={`${student.studentId}-${idx}`} hover>
                                    <TableCell sx={{ fontWeight: 600 }}>{student.studentName}</TableCell>
                                    <TableCell>{student.courseName}</TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={student.status || 'SILENT'}
                                            size="small"
                                            sx={{
                                                bgcolor: '#fef3c7',
                                                color: '#92400e',
                                                fontWeight: 700,
                                                fontSize: '0.7rem',
                                                px: 1
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Typography variant="body2" sx={{
                                            fontWeight: 700,
                                            color: student.daysSinceLastActivity >= 14 ? 'error.main' : student.daysSinceLastActivity >= 7 ? 'warning.main' : 'text.primary'
                                        }}>
                                            {student.daysSinceLastActivity === null ? '∞' : `${student.daysSinceLastActivity}d`}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={student.missedAssignments}
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontWeight: 600 }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Typography variant="body2" color="text.secondary">
                                            {student.lastSubmissionDate || 'No record'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton size="small" onClick={() => handleExplain(student)} color="primary">
                                            <InfoOutlined />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                {/* Pagination Controls */}
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">
                        Showing {students.length} of {pagination.totalItems} students
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            sx={{ borderRadius: 2 }}
                        >
                            Previous
                        </Button>
                        <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                Page {page} of {pagination.totalPages}
                            </Typography>
                        </Box>
                        <Button
                            variant="outlined"
                            size="small"
                            disabled={page >= pagination.totalPages}
                            onClick={() => setPage(page + 1)}
                            sx={{ borderRadius: 2 }}
                        >
                            Next
                        </Button>
                    </Box>
                </Box>
            </TableContainer>

            {/* Explanation Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Inactivity Analysis</DialogTitle>
                <DialogContent dividers>
                    {explainingId ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
                            <CircularProgress size={30} />
                            <Typography variant="body2" color="text.secondary">Analyzing inactivity markers...</Typography>
                        </Box>
                    ) : (
                        <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
                            {explanation}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenDialog(false)} variant="contained" disableElevation sx={{ borderRadius: 10 }}>
                        Done
                    </Button>
                </DialogActions>
            </Dialog>

            <Box sx={{ mt: 4, p: 3, bgcolor: '#f8fafc', borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <History fontSize="small" /> Definitions & Compliance
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Criteria for "Silent Student": Must be in an ACTIVE course with existing assignments.
                    Student is flagged if their last submission was ≥ 15 days ago (or never, if assignments exist).
                    Students in courses without assignments are marked NOT_APPLICABLE.
                </Typography>
            </Box>
        </Box>
    );
};

export default SilentStudents;
