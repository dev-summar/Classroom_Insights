import { Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Skeleton, Avatar, Chip, Pagination } from '@mui/material';
import { useEffect, useState } from 'react';
import axios from '../api/axios';

const Students = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const limit = 20;

    useEffect(() => {
        const fetchStudents = async () => {
            setLoading(true);
            console.time('students_render');
            try {
                // Using paginated API
                const res = await axios.get(`/api/students?page=${page}&limit=${limit}`);
                // Robust data reading
                const data = res.data.items || [];

                if (Array.isArray(data)) {
                    setStudents(data);
                    setTotalPages(res.data.pagination ? res.data.pagination.totalPages : 1);
                    if (data.length === 0) {
                        console.warn('[UI] Students list is empty from DB', res);
                    }
                } else {
                    console.error('[UI] Unexpected students API response format', res);
                    setStudents([]);
                }
            } catch (err) {
                console.error('Error fetching students', err);
            } finally {
                setLoading(false);
                console.timeEnd('students_render');
            }
        };
        fetchStudents();
    }, [page]);

    const handlePageChange = (event, value) => {
        setPage(value);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <Box sx={{ pb: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em' }}>
                    Institutional Students List
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Total unique students enrolled across all ACTIVE courses.
                </Typography>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Table sx={{ minWidth: 650 }} aria-label="students table">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Student Name</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Email</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#475569', textAlign: 'center' }}>Academic Status</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#475569', textAlign: 'center' }}>Enrolled Courses</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            [...Array(8)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Skeleton variant="circular" width={40} height={40} />
                                            <Skeleton width={150} />
                                        </Box>
                                    </TableCell>
                                    <TableCell><Skeleton width={200} /></TableCell>
                                    <TableCell align="center"><Skeleton width={80} sx={{ mx: 'auto' }} /></TableCell>
                                    <TableCell align="center"><Skeleton width={50} sx={{ mx: 'auto' }} /></TableCell>
                                </TableRow>
                            ))
                        ) : (
                            students.map((student, index) => {
                                const statusStyles = {
                                    AT_RISK: { bg: '#fee2e2', text: '#991b1b', label: 'AT RISK' },
                                    SILENT: { bg: '#fef3c7', text: '#92400e', label: 'SILENT' },
                                    ACTIVE: { bg: '#dcfce7', text: '#166534', label: 'ACTIVE' },
                                    NOT_APPLICABLE: { bg: '#f1f5f9', text: '#475569', label: 'N/A' }
                                };
                                // Map academicStatus from API to style key
                                const statusKey = student.academicStatus || 'ACTIVE';
                                const style = statusStyles[statusKey] || statusStyles.ACTIVE;

                                return (
                                    <TableRow
                                        key={student.userId || index}
                                        hover
                                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                    >
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar src={student.picture} sx={{ bgcolor: '#3b82f6', fontSize: '1rem', fontWeight: 600 }}>
                                                    {student.name.charAt(0)}
                                                </Avatar>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {student.name}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {student.email}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={style.label}
                                                size="small"
                                                sx={{
                                                    bgcolor: style.bg,
                                                    color: style.text,
                                                    fontWeight: 800,
                                                    fontSize: '0.65rem',
                                                    letterSpacing: '0.05em',
                                                    borderRadius: 1
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{
                                                display: 'inline-block',
                                                px: 1.5,
                                                py: 0.5,
                                                borderRadius: 1,
                                                bgcolor: '#eff6ff',
                                                color: '#2563eb',
                                                fontWeight: 700,
                                                fontSize: '0.875rem'
                                            }}>
                                                {student.enrolledCoursesCount || 0}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                        {!loading && students.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                                    <Typography variant="body1" color="text.secondary">No students found</Typography>
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

export default Students;
