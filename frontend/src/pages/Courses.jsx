import { Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Skeleton } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const Courses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const res = await axios.get('/api/courses');
                setCourses(res.data);
            } catch (err) {
                console.error('Error fetching courses', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>All Courses</Typography>

            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="courses table">
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Course Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Subject</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Teachers</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Students Count</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton /></TableCell>
                                    <TableCell><Skeleton /></TableCell>
                                    <TableCell><Skeleton /></TableCell>
                                    <TableCell><Skeleton /></TableCell>
                                </TableRow>
                            ))
                        ) : (
                            courses.map((course) => (
                                <TableRow
                                    key={course._id}
                                    hover
                                    onClick={() => navigate(`/courses/${course.id}`)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    <TableCell>{course.name}</TableCell>
                                    <TableCell>{course.section || 'N/A'}</TableCell>
                                    <TableCell>{course.teachers ? course.teachers.length : 0}</TableCell>
                                    <TableCell>{course.students ? course.students.length : 0}</TableCell>
                                </TableRow>
                            ))
                        )}
                        {!loading && courses.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center">No courses found</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default Courses;
