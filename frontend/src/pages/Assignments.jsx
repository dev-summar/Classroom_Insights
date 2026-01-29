import { Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, LinearProgress, Chip } from '@mui/material';
import { useEffect, useState } from 'react';
import axios from '../api/axios';

const Assignments = () => {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [assignRes, coursesRes, submissionsRes] = await Promise.all([
                    axios.get('/api/assignments'),
                    axios.get('/api/courses'),
                    axios.get('/api/submissions')
                ]);

                const augmentedData = assignRes.data.map(assign => {
                    const course = coursesRes.data.find(c => c.id === assign.courseId);
                    const subs = submissionsRes.data.filter(s => s.courseWorkId === assign.id);
                    const submittedCount = subs.filter(s => s.displayStatus === 'Turned In').length;
                    const totalExpected = subs.length || (course?.students?.length || 0);

                    let dueDateStr = 'No Due Date';
                    if (assign.dueDate && assign.dueDate.year) {
                        const { year, month, day } = assign.dueDate;
                        dueDateStr = `${day}/${month}/${year}`;
                    }

                    return {
                        ...assign,
                        courseName: course ? course.name : 'Unknown Course',
                        submissionRate: totalExpected > 0 ? (submittedCount / totalExpected) * 100 : 0,
                        dueDateFormatted: dueDateStr
                    };
                });

                setAssignments(augmentedData);
            } catch (err) {
                console.error('Error fetching assignments', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>Assignments</Typography>

            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Course</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Due Date</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Submission Rate</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={4}><LinearProgress /></TableCell></TableRow>
                        ) : (
                            assignments.map((a) => (
                                <TableRow key={a._id} hover>
                                    <TableCell>{a.title}</TableCell>
                                    <TableCell>{a.courseName}</TableCell>
                                    <TableCell>{a.dueDateFormatted}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Box sx={{ width: '100%', mr: 1 }}>
                                                <LinearProgress variant="determinate" value={a.submissionRate} color={a.submissionRate > 70 ? 'success' : (a.submissionRate > 40 ? 'warning' : 'error')} />
                                            </Box>
                                            <Box sx={{ minWidth: 35 }}>
                                                <Typography variant="body2" color="text.secondary">{`${Math.round(a.submissionRate)}%`}</Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                        {!loading && assignments.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center">No assignments found</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default Assignments;
