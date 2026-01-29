import { useState, useRef, useEffect } from 'react';
import { Box, Typography, TextField, Button, Paper, CircularProgress, Divider, Chip, Stack } from '@mui/material';
import { Send, AutoAwesome as Sparkles, Search as SearchIcon, LightbulbOutlined } from '@mui/icons-material';
import axios from '../api/axios';

const AIInsights = () => {
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hello! I am your MIET AI Insights Assistant. I can analyze your classroom data to provide summaries, identify trends, and answer specific questions about courses and assignments. What would you like to know today?'
        }
    ]);
    const scrollRef = useRef(null);

    const suggestions = [
        "Total students overview",
        "Pending submissions count",
        "Low engagement courses",
        "Assignment completion trends"
    ];

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const handleSuggestionClick = (suggestedText) => {
        setQuestion(suggestedText);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!question.trim() || loading) return;

        const currentQuestion = question.trim();
        const userMessage = { role: 'user', content: currentQuestion };
        setMessages(prev => [...prev, userMessage]);
        setQuestion('');
        setLoading(true);

        try {
            const res = await axios.post('/api/ai/insights', { question: currentQuestion });
            // Using insights field as per backward compatibility established in previous migration
            const assistantMessage = { role: 'assistant', content: res.data.insights || res.data.answer };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
            console.error('AI Insights Error:', err);
            const errorMessage = {
                role: 'assistant',
                content: 'Required data is not available in the system. Please ensure the AI services are operational.'
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto', mt: 1, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Sparkles sx={{ color: 'secondary.main', fontSize: 32 }} />
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: '-0.01em' }}>
                        AI Insights
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Analytical Assistant for MIET Academic Data
                    </Typography>
                </Box>
            </Box>

            <Paper elevation={0} sx={{
                height: '72vh',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 4,
                bgcolor: 'transparent',
                overflow: 'hidden'
            }}>
                {/* Insights Panel */}
                <Box ref={scrollRef} sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    scrollBehavior: 'smooth'
                }}>
                    {messages.map((msg, index) => (
                        <Box key={index} sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: msg.role === 'user' ? 'flex-end' : 'center',
                            width: '100%'
                        }}>
                            {msg.role === 'user' ? (
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    bgcolor: '#eef2ff',
                                    color: 'primary.main',
                                    px: 2.5,
                                    py: 1,
                                    borderRadius: 10,
                                    border: '1px solid',
                                    borderColor: 'primary.light',
                                    opacity: 0.9,
                                    maxWidth: 'fit-content'
                                }}>
                                    <SearchIcon sx={{ fontSize: 18 }} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                        {msg.content}
                                    </Typography>
                                </Box>
                            ) : (
                                <Paper elevation={0} sx={{
                                    p: 4,
                                    width: '100%',
                                    maxWidth: 700,
                                    borderRadius: 4,
                                    bgcolor: 'white',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                                    position: 'relative'
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, pb: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                                        <Sparkles sx={{ color: 'secondary.main', fontSize: 18 }} />
                                        <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: 1.5 }}>
                                            Analytical Insight
                                        </Typography>
                                    </Box>
                                    <Typography variant="body1" sx={{
                                        lineHeight: 1.8,
                                        color: 'text.primary',
                                        fontSize: '1rem',
                                        fontWeight: 500,
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {msg.content}
                                    </Typography>
                                </Paper>
                            )}
                        </Box>
                    ))}
                    {loading && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Paper elevation={0} sx={{
                                p: 3,
                                width: '100%',
                                maxWidth: 700,
                                borderRadius: 4,
                                bgcolor: 'rgba(255,255,255,0.6)',
                                border: '1px dashed',
                                borderColor: 'divider',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2
                            }}>
                                <CircularProgress size={20} thickness={5} color="secondary" />
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                    Processing academic records...
                                </Typography>
                            </Paper>
                        </Box>
                    )}
                </Box>

                <Divider sx={{ mb: 1, opacity: 0.5 }} />

                {/* Controls Area */}
                <Box sx={{ px: 3, pb: 2, pt: 1 }}>
                    <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
                        {suggestions.map((s) => (
                            <Chip
                                key={s}
                                icon={<LightbulbOutlined sx={{ fontSize: '1rem !important' }} />}
                                label={s}
                                onClick={() => handleSuggestionClick(s)}
                                sx={{
                                    borderRadius: 2,
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    bgcolor: 'white',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    '&:hover': { bgcolor: '#f8fafc', borderColor: 'primary.light' }
                                }}
                            />
                        ))}
                    </Stack>

                    <Box component="form" onSubmit={handleSubmit} sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: 'white',
                        p: 0.8,
                        borderRadius: 10,
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                        '&:focus-within': { borderColor: 'primary.main', boxShadow: '0 0 0 3px rgba(13, 71, 161, 0.05)' }
                    }}>
                        <TextField
                            fullWidth
                            placeholder="Ask about students, assignments, submissions, or trends..."
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            disabled={loading}
                            variant="standard"
                            autoComplete="off"
                            InputProps={{
                                disableUnderline: true,
                                sx: {
                                    px: 2,
                                    fontSize: '0.95rem',
                                    fontWeight: 500
                                }
                            }}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={loading || !question.trim()}
                            sx={{
                                borderRadius: 10,
                                minWidth: 48,
                                width: 48,
                                height: 48,
                                boxShadow: 'none'
                            }}
                        >
                            {loading ? <CircularProgress size={22} color="inherit" /> : <Send sx={{ fontSize: 20 }} />}
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

export default AIInsights;
