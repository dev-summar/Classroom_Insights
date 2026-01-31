import { Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Skeleton, Pagination } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const Courses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const navigate = useNavigate();

    const limit = 20;

    useEffect(() => {
        const fetchCourses = async () => {
            setLoading(true);
            console.time('courses_render');
            try {
                // Using paginated API
                const res = await axios.get(`/api/courses?page=${page}&limit=${limit}`);
                if (res.data && res.data.items) {
                    setCourses(res.data.items);
                    setTotalPages(res.data.pagination.totalPages || 1);
                } else {
                    setCourses([]);
                }
            } catch (err) {
                console.error('Error fetching courses', err);
            } finally {
                setLoading(false);
                console.timeEnd('courses_render');
            }
        };
        fetchCourses();
    }, [page]);

    const handlePageChange = (event, value) => {
        setPage(value);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <Box sx={{ pb: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em' }}>
                    Institutional Courses
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    List of all ACTIVE courses currently being tracked in the system.
                </Typography>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Table sx={{ minWidth: 650 }} aria-label="courses table">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Course Name</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Section / Subject</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#475569', textAlign: 'center' }}>Teachers</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#475569', textAlign: 'center' }}>Students</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#475569', textAlign: 'center' }}>Assignments</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton width={250} /></TableCell>
                                    <TableCell><Skeleton width={150} /></TableCell>
                                    <TableCell><Skeleton width={50} sx={{ mx: 'auto' }} /></TableCell>
                                    <TableCell><Skeleton width={50} sx={{ mx: 'auto' }} /></TableCell>
                                    <TableCell><Skeleton width={50} sx={{ mx: 'auto' }} /></TableCell>
                                </TableRow>
                            ))
                        ) : (
                            courses.map((course) => (
                                <TableRow
                                    key={course.courseId}
                                    hover
                                    onClick={() => navigate(`/courses/${course.courseId}`)}
                                    sx={{
                                        cursor: 'pointer',
                                        '&:last-child td, &:last-child th': { border: 0 },
                                        transition: 'background-color 0.2s',
                                        '&:hover': { bgcolor: '#f1f5f9' }
                                    }}
                                >
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                            {course.name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{course.section || 'N/A'}</TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'inline-block', px: 1.2, py: 0.4, borderRadius: 1, bgcolor: '#f0fdf4', color: '#166534', fontWeight: 700, fontSize: '0.75rem' }}>
                                            {course.teachersCount || 0}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'inline-block', px: 1.2, py: 0.4, borderRadius: 1, bgcolor: '#eff6ff', color: '#1e40af', fontWeight: 700, fontSize: '0.75rem' }}>
                                            {course.studentsCount || 0}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'inline-block', px: 1.2, py: 0.4, borderRadius: 1, bgcolor: '#f5f3ff', color: '#5b21b6', fontWeight: 700, fontSize: '0.75rem' }}>
                                            {course.assignmentsCount || 0}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                        {!loading && courses.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                    <Typography variant="body1" color="text.secondary">No courses found</Typography>
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

export default Courses;
