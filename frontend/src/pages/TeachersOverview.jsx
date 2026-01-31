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
    Skeleton,
    Pagination
} from '@mui/material';
import { Person as PersonIcon, NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const TeachersOverview = () => {
    const navigate = useNavigate();
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [orderBy, setOrderBy] = useState('totalCourses');
    const [order, setOrder] = useState('desc');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const limit = 10;

    useEffect(() => {
        const fetchTeachers = async () => {
            setLoading(true);
            console.time('teachers_render');
            try {
                // Using optimized sidebar API with pagination
                const response = await axios.get(`/api/sidebar/teachers?page=${page}&limit=${limit}`);
                // Robust data reading as per requirements
                const data = response.data.items || response.data.data || response.data;

                if (Array.isArray(data)) {
                    setTeachers(data);
                    setTotalPages(response.data.pagination ? response.data.pagination.totalPages : 1);
                    if (data.length === 0) {
                        console.warn('[UI] Teachers list is empty from DB', response);
                    }
                } else {
                    console.error('[UI] Unexpected teachers API response format', response);
                    setTeachers([]);
                }
            } catch (error) {
                console.error('Error fetching teachers overview', error);
            } finally {
                setLoading(false);
                console.timeEnd('teachers_render');
            }
        };
        fetchTeachers();
    }, [page]);

    const handleSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handlePageChange = (event, value) => {
        setPage(value);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const sortedTeachers = [...teachers].sort((a, b) => {
        let valA = a[orderBy] || 0;
        let valB = b[orderBy] || 0;

        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (order === 'asc') {
            return valA > valB ? 1 : -1;
        } else {
            return valA < valB ? 1 : -1;
        }
    });

    return (
        <Box sx={{ p: 4 }}>
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                <Link color="inherit" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', textDecoration: 'none' }}>
                    Dashboard
                </Link>
                <Typography color="text.primary">Teachers Overview</Typography>
            </Breadcrumbs>

            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em' }}>
                    Teachers Overview
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Total active courses associated per teacher across the institute.
                </Typography>
            </Box>

            <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }} elevation={0}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Teacher Name</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>
                                <TableSortLabel
                                    active={orderBy === 'email'}
                                    direction={orderBy === 'email' ? order : 'asc'}
                                    onClick={() => handleSort('email')}
                                >
                                    Email
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                                <TableSortLabel
                                    active={orderBy === 'totalCourses'}
                                    direction={orderBy === 'totalCourses' ? order : 'asc'}
                                    onClick={() => handleSort('totalCourses')}
                                >
                                    Total Active Courses
                                </TableSortLabel>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton variant="circular" width={40} height={40} sx={{ display: 'inline-block', mr: 2 }} /><Skeleton width={200} sx={{ display: 'inline-block', verticalAlign: 'middle' }} /></TableCell>
                                    <TableCell><Skeleton width={200} /></TableCell>
                                    <TableCell align="right"><Skeleton width={50} sx={{ ml: 'auto' }} /></TableCell>
                                </TableRow>
                            ))
                        ) : sortedTeachers.length === 0 ? (
                            <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4 }}>No teacher data found.</TableCell></TableRow>
                        ) : sortedTeachers.map((teacher) => (
                            <TableRow
                                key={teacher.googleId}
                                onClick={() => navigate(`/dashboard/teachers/${teacher.googleId}`)}
                                sx={{
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                    '&:hover': { bgcolor: '#f1f5f9' }
                                }}
                            >
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar src={teacher.picture} sx={{ bgcolor: '#eff6ff', color: '#3b82f6' }}>
                                            {teacher.name ? teacher.name.charAt(0) : <PersonIcon />}
                                        </Avatar>
                                        <Typography sx={{ fontWeight: 600 }}>{teacher.name || 'Unknown Teacher'}</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell color="text.secondary">{teacher.email}</TableCell>
                                <TableCell align="right">
                                    <Box sx={{
                                        display: 'inline-flex',
                                        px: 2,
                                        py: 0.5,
                                        borderRadius: 2,
                                        bgcolor: '#f0f9ff',
                                        color: '#0369a1',
                                        fontWeight: 800,
                                        fontSize: '0.875rem'
                                    }}>
                                        {teacher.totalCourses || 0}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
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

export default TeachersOverview;
