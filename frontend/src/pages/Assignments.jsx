import { Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, LinearProgress, Skeleton, Pagination } from '@mui/material';
import { useEffect, useState } from 'react';
import axios from '../api/axios';

const Assignments = () => {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const limit = 20;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            console.time('assignments_render');
            try {
                // Using paginated API
                const res = await axios.get(`/api/assignments?page=${page}&limit=${limit}`);
                // Robust data reading
                const data = res.data.items || [];

                if (Array.isArray(data)) {
                    setAssignments(data);
                    setTotalPages(res.data.pagination ? res.data.pagination.totalPages : 1);
                    if (data.length === 0) {
                        console.warn('[UI] Assignments list is empty from DB', res);
                    }
                } else {
                    console.error('[UI] Unexpected assignments API response format', res);
                    setAssignments([]);
                }
            } catch (err) {
                console.error('Error fetching assignments', err);
            } finally {
                setLoading(false);
                console.timeEnd('assignments_render');
            }
        };
        fetchData();
    }, [page]);

    const handlePageChange = (event, value) => {
        setPage(value);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const formatDueDate = (dueDate) => {
        if (!dueDate || !dueDate.year) return 'No Due Date';
        const { year, month, day } = dueDate;
        return `${day}/${month}/${year}`;
    };

    return (
        <Box sx={{ pb: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em' }}>
                    Assignments
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    List of all assignments across all active courses.
                </Typography>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Title</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Course</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Due Date</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#475569', textAlign: 'center' }}>Submissions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton width={200} /></TableCell>
                                    <TableCell><Skeleton width={150} /></TableCell>
                                    <TableCell><Skeleton width={100} /></TableCell>
                                    <TableCell align="center"><Skeleton width={50} sx={{ mx: 'auto' }} /></TableCell>
                                </TableRow>
                            ))
                        ) : (
                            assignments.map((a) => (
                                <TableRow key={a.assignmentId} hover>
                                    <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{a.title}</TableCell>
                                    <TableCell>{a.courseName}</TableCell>
                                    <TableCell>{formatDueDate(a.dueDate)}</TableCell>
                                    <TableCell align="center">
                                        <Box sx={{
                                            display: 'inline-block',
                                            px: 1.5,
                                            py: 0.5,
                                            borderRadius: 1,
                                            bgcolor: '#f5f3ff',
                                            color: '#5b21b6',
                                            fontWeight: 700,
                                            fontSize: '0.875rem'
                                        }}>
                                            {a.submissionsCount || 0}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                        {!loading && assignments.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                                    <Typography variant="body1" color="text.secondary">No assignments found</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                    count={totalPages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    shape="rounded"
                    showFirstButton
                    showLastButton
                />
            </Box>
        </Box>
    );
};

export default Assignments;
