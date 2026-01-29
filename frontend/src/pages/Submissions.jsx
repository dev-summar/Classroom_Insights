import { Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material';
import { useEffect, useState } from 'react';
import axios from '../api/axios';

const Submissions = () => {
    const [submissions, setSubmissions] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    const [filterCourse, setFilterCourse] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [subsRes, coursesRes] = await Promise.all([
                    axios.get('/api/submissions'),
                    axios.get('/api/courses')
                ]);
                setSubmissions(subsRes.data);
                setCourses(coursesRes.data);
            } catch (err) {
                console.error('Error fetching submissions', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredSubmissions = submissions.filter(s => {
        const courseMatch = filterCourse === 'all' || s.courseId === filterCourse;
        const statusMatch = filterStatus === 'all' || s.state === filterStatus;
        return courseMatch && statusMatch;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'Turned In': return 'success';
            case 'Assigned': return 'warning';
            case 'Missing': return 'error';
            default: return 'default';
        }
    };

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>Submission Records</Typography>

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
                        <MenuItem value="Turned In">Turned In</MenuItem>
                        <MenuItem value="Assigned">Assigned</MenuItem>
                        <MenuItem value="Missing">Missing</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Student Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Course</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Assignment</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Submission Date</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} align="center">Loading...</TableCell></TableRow>
                        ) : (
                            filteredSubmissions.map((s) => (
                                <TableRow key={s._id} hover>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                            {s.student?.name || 'Unknown'}
                                        </Typography>
                                        {s.student?.email && s.student.email.startsWith('no-email-') ? (
                                            <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                                                Email not shared
                                            </Typography>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">
                                                {s.student?.email || '-'}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>{s.courseName}</TableCell>
                                    <TableCell>{s.assignmentTitle}</TableCell>
                                    <TableCell>
                                        <Chip label={s.displayStatus} color={getStatusColor(s.displayStatus)} size="small" sx={{ fontWeight: 'bold' }} />
                                    </TableCell>
                                    <TableCell>{s.creationTime ? new Date(s.creationTime).toLocaleString() : '-'}</TableCell>
                                </TableRow>
                            ))
                        )}
                        {!loading && filteredSubmissions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">No submissions found matching filters</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default Submissions;
