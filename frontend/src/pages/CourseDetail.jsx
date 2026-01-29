import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from '../api/axios';
import {
    Typography, Box, Paper, Grid, Avatar, Card, CardContent, Divider,
    List, ListItem, ListItemText, ListItemAvatar, CircularProgress, IconButton, Chip
} from '@mui/material';
import { ArrowBack, Email, Person, Class } from '@mui/icons-material';

const CourseDetail = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await axios.get(`/api/courses/${courseId}`);
                setData(res.data);
            } catch (err) {
                console.error('Error fetching course detail', err);
                setError('Failed to load course details. You may not have permission.');
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [courseId]);

    const renderEmail = (email) => {
        if (email && email.startsWith('no-email-')) {
            return (
                <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                    Email not shared
                </Typography>
            );
        }
        return <Typography variant="body2">{email}</Typography>;
    };

    const getRoleBadge = (userGoogleId, course) => {
        let label = '';
        let color = '';
        let textColor = '';

        if (userGoogleId === course.ownerId) {
            label = 'Course Owner';
            color = '#e3f2fd';
            textColor = '#1976d2';
        } else if (course.teachers && course.teachers.includes(userGoogleId)) {
            label = 'Teacher';
            color = '#e8f5e9';
            textColor = '#2e7d32';
        } else if (course.students && course.students.includes(userGoogleId)) {
            label = 'Student';
            color = '#fffde7';
            textColor = '#fbc02d';
        } else {
            return null;
        }

        return (
            <Chip
                label={label}
                size="small"
                sx={{
                    ml: 1,
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    bgcolor: color,
                    color: textColor,
                    borderRadius: '4px',
                    '& .MuiChip-label': { px: 1 }
                }}
            />
        );
    };

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <CircularProgress />
        </Box>
    );

    if (error) return (
        <Box sx={{ p: 3 }}>
            <Typography color="error">{error}</Typography>
            <IconButton onClick={() => navigate('/courses')} sx={{ mt: 2 }}><ArrowBack /> Back to Courses</IconButton>
        </Box>
    );

    const { course, teachers, students } = data;

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <IconButton onClick={() => navigate('/courses')} color="primary">
                    <ArrowBack />
                </IconButton>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{course.name}</Typography>
            </Box>

            <Grid container spacing={4}>
                {/* Course Info */}
                <Grid item xs={12} md={4}>
                    <Card elevation={2}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Class color="primary" />
                                <Typography variant="h6">Course Information</Typography>
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="body2" color="text.secondary">Section/Subject</Typography>
                            <Typography variant="body1" sx={{ mb: 2 }}>{course.section || 'N/A'}</Typography>

                            <Typography variant="body2" color="text.secondary">Enrollment Code</Typography>
                            <Typography variant="body1" sx={{ mb: 2, fontFamily: 'monospace', fontWeight: 'bold' }}>{course.enrollmentCode || 'N/A'}</Typography>

                            <Typography variant="body2" color="text.secondary">Status</Typography>
                            <Typography variant="body1" sx={{ mb: 2 }}>{course.courseState}</Typography>

                            <Typography variant="body2" color="text.secondary">Room</Typography>
                            <Typography variant="body1">{course.room || 'N/A'}</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Teachers */}
                <Grid item xs={12} md={8}>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>Teachers</Typography>
                    <Grid container spacing={2}>
                        {teachers.map((t) => (
                            <Grid item xs={12} sm={6} key={t.googleId}>
                                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar src={t.picture} sx={{ width: 56, height: 56 }}>
                                            <Person />
                                        </Avatar>
                                        <Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{t.name}</Typography>
                                                {getRoleBadge(t.googleId, course)}
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', mt: 0.5 }}>
                                                <Email fontSize="small" />
                                                {renderEmail(t.email)}
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                        {teachers.length === 0 && (
                            <Grid item xs={12}>
                                <Typography color="text.secondary">No teacher records found in database.</Typography>
                            </Grid>
                        )}
                    </Grid>

                    <Typography variant="h5" sx={{ mt: 6, mb: 2, fontWeight: 600 }}>Students ({students.length})</Typography>
                    <Paper elevation={1} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                        <List>
                            {students.map((s, index) => (
                                <Box key={s.googleId}>
                                    <ListItem>
                                        <ListItemAvatar>
                                            <Avatar src={s.picture}>
                                                <Person />
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    {s.name}
                                                    {getRoleBadge(s.googleId, course)}
                                                </Box>
                                            }
                                            secondary={renderEmail(s.email)}
                                        />
                                    </ListItem>
                                    {index < students.length - 1 && <Divider component="li" />}
                                </Box>
                            ))}
                            {students.length === 0 && (
                                <ListItem>
                                    <ListItemText primary="No students enrolled or synced yet." />
                                </ListItem>
                            )}
                        </List>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default CourseDetail;
