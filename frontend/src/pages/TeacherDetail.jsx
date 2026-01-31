
import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Breadcrumbs,
    Link,
    Avatar,
    Divider,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Person as PersonIcon,
    NavigateNext as NavigateNextIcon,
    ArrowBack as ArrowBackIcon,
    OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../api/axios';

const TeacherDetail = () => {
    const navigate = useNavigate();
    const { userId } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [orderBy, setOrderBy] = useState('studentsCount');
    const [order, setOrder] = useState('desc');

    useEffect(() => {
        const fetchTeacherCourses = async () => {
            try {
                const response = await axios.get(`/api/dashboard/teachers/${userId}/courses`);
                setData(response.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching teacher courses', error);
                setLoading(false);
            }
        };
        fetchTeacherCourses();
    }, [userId]);

    const handleSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const sortedCourses = data ? [...data.courses].sort((a, b) => {
        let valA = a[orderBy];
        let valB = b[orderBy];

        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (order === 'asc') {
            return valA > valB ? 1 : -1;
        } else {
            return valA < valB ? 1 : -1;
        }
    }) : [];

    if (loading) return <Box sx={{ p: 4 }}><Typography>Loading...</Typography></Box>;
    if (!data) return <Box sx={{ p: 4 }}><Typography>Teacher not found.</Typography></Box>;

    return (
        <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <IconButton onClick={() => navigate('/teachers-overview')} sx={{ bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}>
                    <ArrowBackIcon />
                </IconButton>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
                    <Link color="inherit" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', textDecoration: 'none' }}>
                        Dashboard
                    </Link>
                    <Link color="inherit" href="/teachers-overview" onClick={(e) => { e.preventDefault(); navigate('/teachers-overview'); }} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', textDecoration: 'none' }}>
                        Teachers Overview
                    </Link>
                    <Typography color="text.primary">{data.teacher.name}</Typography>
                </Breadcrumbs>
            </Box>

            <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider', mb: 4, bgcolor: 'white' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Avatar sx={{ width: 80, height: 80, bgcolor: '#eff6ff', color: '#3b82f6', fontSize: '2rem' }}>
                        {data.teacher.name.charAt(0)}
                    </Avatar>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', mb: 0.5 }}>
                            {data.teacher.name}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, mb: 1 }}>
                            {data.teacher.email}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Box sx={{
                                px: 1.5, py: 0.5, borderRadius: 2, bgcolor: '#f0fdf4', color: '#166534', fontWeight: 700, fontSize: '0.75rem', border: '1px solid #bbf7d0'
                            }}>
                                {data.totalActiveCourses} Active Courses
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Paper>

            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Associated Courses</Typography>
                <Typography variant="body2" color="text.secondary">List of all active courses where {data.teacher.name} is an instructor.</Typography>
            </Box>

            <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }} elevation={0}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Course Name</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Section</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                                <TableSortLabel
                                    active={orderBy === 'studentsCount'}
                                    direction={orderBy === 'studentsCount' ? order : 'asc'}
                                    onClick={() => handleSort('studentsCount')}
                                >
                                    Students
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                                <TableSortLabel
                                    active={orderBy === 'assignmentCount'}
                                    direction={orderBy === 'assignmentCount' ? order : 'asc'}
                                    onClick={() => handleSort('assignmentCount')}
                                >
                                    Assignments
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedCourses.length === 0 ? (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>No active courses found for this teacher.</TableCell></TableRow>
                        ) : sortedCourses.map((course) => (
                            <TableRow key={course.courseId} sx={{ '&:hover': { bgcolor: '#f1f5f9' } }}>
                                <TableCell>
                                    <Typography sx={{ fontWeight: 600 }}>{course.name}</Typography>
                                </TableCell>
                                <TableCell color="text.secondary">{course.section || 'N/A'}</TableCell>
                                <TableCell align="right">
                                    <Box sx={{
                                        display: 'inline-flex', px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: '#f0f9ff', color: '#0369a1', fontWeight: 700, fontSize: '0.75rem'
                                    }}>
                                        {course.studentsCount}
                                    </Box>
                                </TableCell>
                                <TableCell align="right">
                                    <Box sx={{
                                        display: 'inline-flex', px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: '#f5f3ff', color: '#5b21b6', fontWeight: 700, fontSize: '0.75rem'
                                    }}>
                                        {course.assignmentCount}
                                    </Box>
                                </TableCell>
                                <TableCell align="right">
                                    <Tooltip title="View Course Details">
                                        <IconButton size="small" onClick={() => navigate(`/courses/${course.courseId}`)} color="primary">
                                            <OpenInNewIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default TeacherDetail;
