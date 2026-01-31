import { Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, FormControl, InputLabel, Select, MenuItem, Chip, Skeleton } from '@mui/material';
import { useEffect, useState } from 'react';
import axios from '../api/axios';

const Submissions = () => {
    const [submissions, setSubmissions] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    const [filterCourse, setFilterCourse] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        const fetchBaseData = async () => {
            try {
                // Fetch courses for the filter dropdown (using optimized API)
                const coursesRes = await axios.get('/api/sidebar/courses');
                setCourses(coursesRes.data || []);
            } catch (err) {
                console.error('Error fetching courses list', err);
            }
        };
        fetchBaseData();
    }, []);

    useEffect(() => {
        const fetchSubmissions = async () => {
            console.time('submissions_render');
            setLoading(true);
            try {
                // Using optimized sidebar API with query params
                const res = await axios.get('/api/sidebar/submissions', {
                    params: {
                        courseId: filterCourse,
                        status: filterStatus
                    }
                });

                // Robust data reading as per requirements
                const data = res.data.items || res.data.data || res.data;

                if (Array.isArray(data)) {
                    setSubmissions(data);
                    if (data.length === 0) {
                        console.warn('[UI] Submissions list is empty from DB', res);
                    }
                } else {
                    console.error('[UI] Unexpected submissions API response format', res);
                    setSubmissions([]);
                }
            } catch (err) {
                console.error('Error fetching submissions', err);
            } finally {
                setLoading(false);
                console.timeEnd('submissions_render');
            }
        };
        fetchSubmissions();
    }, [filterCourse, filterStatus]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'SUBMITTED': return 'success';
            case 'PENDING': return 'warning';
            case 'MISSED': return 'error';
            default: return 'default';
        }
    };

    const formatStatus = (status) => {
        // Capitalize only first letter
        if (!status) return 'Unknown';
        return status.charAt(0) + status.slice(1).toLowerCase();
    };

    return (
        <Box sx={{ pb: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', mb: 1 }}>
                    Submission Records
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Detailed record of student submissions across all institutional courses.
                </Typography>
            </Box>

            <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Filter by Course</InputLabel>
                    <Select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} label="Filter by Course">
                        <MenuItem value="all">All Courses</MenuItem>
                        {courses.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Filter by Status</InputLabel>
                    <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} label="Filter by Status">
                        <MenuItem value="all">All Statuses</MenuItem>
                        <MenuItem value="SUBMITTED">Submitted</MenuItem>
                        <MenuItem value="PENDING">Pending</MenuItem>
                        <MenuItem value="MISSED">Missed</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Student Name</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Course</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Assignment</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Submission Date</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            [...Array(10)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton width={200} /></TableCell>
                                    <TableCell><Skeleton width={150} /></TableCell>
                                    <TableCell><Skeleton width={200} /></TableCell>
                                    <TableCell><Skeleton width={80} /></TableCell>
                                    <TableCell><Skeleton width={120} /></TableCell>
                                </TableRow>
                            ))
                        ) : (
                            submissions.map((s) => (
                                <TableRow key={s.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {s.studentName || 'Unknown'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {s.studentEmail}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{s.courseName}</TableCell>
                                    <TableCell>{s.assignmentTitle}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={formatStatus(s.derivedStatus)}
                                            color={getStatusColor(s.derivedStatus)}
                                            size="small"
                                            sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                                        {s.creationTime ? new Date(s.creationTime).toLocaleString() : '-'}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                        {!loading && submissions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                    <Typography variant="body1" color="text.secondary">No submissions found matching filters</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default Submissions;
