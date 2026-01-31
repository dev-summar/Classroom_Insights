import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress } from '@mui/material';
import { Warning, InfoOutlined, TrendingDown, History, EventBusy } from '@mui/icons-material';
import axios from '../api/axios';

const AtRiskStudents = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [explanation, setExplanation] = useState('');
    const [explainingId, setExplainingId] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1 });
    const limit = 25;

    useEffect(() => {
        const fetchAtRisk = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/api/at-risk?page=${page}&limit=${limit}`);
                const data = res.data.items || [];
                setStudents(data);
                setPagination(res.data.pagination || { page, limit, totalItems: data.length, totalPages: 1 });
                setLoading(false);
            } catch (err) {
                console.error('Error fetching at-risk students', err);
                setLoading(false);
            }
        };
        fetchAtRisk();
    }, [page]);

    const handleExplain = async (student) => {
        setExplainingId(student.studentId);
        setExplanation('');
        setOpenDialog(true);
        try {
            const res = await axios.post('/api/at-risk/explain', { studentData: student });
            setExplanation(res.data.explanation);
        } catch (err) {
            setExplanation('Unable to generate explanation at this time.');
        } finally {
            setExplainingId(null);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ p: 1 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Warning color="error" fontSize="large" /> At-Risk Students
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Students identified as needing academic attention based on submission activity and completion rates.
                </Typography>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Course</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Missed</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Rate</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Inactivity</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {students.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                                    <Typography variant="body1" color="text.secondary">No students currently identified as at-risk.</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            students.map((student, idx) => (
                                <TableRow key={`${student.studentId}-${idx}`} sx={{ '&:hover': { bgcolor: '#f1f5f9' } }}>
                                    <TableCell sx={{ fontWeight: 600 }}>{student.studentName}</TableCell>
                                    <TableCell>{student.courseName}</TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={student.status || 'AT_RISK'}
                                            size="small"
                                            sx={{
                                                bgcolor: '#fee2e2',
                                                color: '#991b1b',
                                                fontWeight: 700,
                                                fontSize: '0.7rem',
                                                px: 1
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={student.missedAssignments}
                                            size="small"
                                            color={student.missedAssignments >= 3 ? "error" : "warning"}
                                            icon={<EventBusy style={{ fontSize: 14 }} />}
                                            sx={{ fontWeight: 600 }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                            <TrendingDown sx={{ fontSize: 16, color: student.submissionRate < 30 ? 'error.main' : 'warning.main' }} />
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{student.submissionRate}%</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                            {student.daysSinceLastActivity === null ? 'Never' : `${student.daysSinceLastActivity}d`}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="View academic explanation">
                                            <IconButton size="small" onClick={() => handleExplain(student)} color="primary">
                                                <InfoOutlined />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                {/* Pagination Controls */}
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">
                        Showing {students.length} of {pagination.totalItems} students
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            sx={{ borderRadius: 2 }}
                        >
                            Previous
                        </Button>
                        <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                Page {page} of {pagination.totalPages}
                            </Typography>
                        </Box>
                        <Button
                            variant="outlined"
                            size="small"
                            disabled={page >= pagination.totalPages}
                            onClick={() => setPage(page + 1)}
                            sx={{ borderRadius: 2 }}
                        >
                            Next
                        </Button>
                    </Box>
                </Box>
            </TableContainer>

            {/* Explanation Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth borderRadius={4}>
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <InfoOutlined color="primary" /> Academic Logic Explanation
                </DialogTitle>
                <DialogContent dividers>
                    {explainingId ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
                            <CircularProgress size={30} />
                            <Typography variant="body2" color="text.secondary">Generating neutral academic interpretation...</Typography>
                        </Box>
                    ) : (
                        <Typography variant="body1" sx={{ lineHeight: 1.7, color: 'text.primary' }}>
                            {explanation}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenDialog(false)} variant="contained" disableElevation sx={{ borderRadius: 10 }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            <Box sx={{ mt: 4, p: 3, bgcolor: '#fef2f2', borderRadius: 4, border: '1px solid', borderColor: '#fecaca' }}>
                <Typography variant="subtitle2" sx={{ color: '#991b1b', fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <History fontSize="small" /> Compliance & Logic Note
                </Typography>
                <Typography variant="caption" sx={{ color: '#991b1b', display: 'block' }}>
                    Criteria for At-Risk identification: Must be in an ACTIVE course with assignments having valid due dates.
                    Student is flagged if they have missed tasks, submitted late, or have been inactive for ≥ 30 days.
                    Students in courses without expectations are marked NOT_APPLICABLE and hidden.
                </Typography>
            </Box>
        </Box>
    );
};

// Internal components to avoid large file scope issues
const Stack = ({ children, direction = 'row', spacing = 1, sx = {} }) => (
    <Box sx={{ display: 'flex', flexDirection: direction, gap: spacing, ...sx }}>
        {children}
    </Box>
);

export default AtRiskStudents;
