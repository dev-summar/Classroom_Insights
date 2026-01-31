
import { Paper, Typography, Box } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';

const StatCard = ({ title, value, icon, color, trend, onClick, subtext, cta }) => {
    return (
        <Paper
            elevation={0}
            onClick={onClick}
            sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'white',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                height: '100%',
                '&:hover': {
                    boxShadow: '0 12px 24px rgba(0,0,0,0.06)',
                    borderColor: onClick ? color : 'primary.light',
                    transform: onClick ? 'translateY(-4px)' : 'none',
                    '& .cta-text': {
                        color: color,
                        gap: 1
                    }
                },
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{
                    p: 1.2,
                    borderRadius: 2,
                    bgcolor: `${color}10`,
                    color: color,
                    display: 'flex',
                    border: '1px solid',
                    borderColor: `${color}20`
                }}>
                    {icon}
                </Box>
                {trend && (
                    <Typography variant="caption" sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: 'success.light',
                        color: 'success.dark',
                        fontWeight: 700,
                        fontSize: '0.7rem'
                    }}>
                        +{trend}
                    </Typography>
                )}
            </Box>

            <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', mb: 0.5 }}>
                    {title}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    {value}
                </Typography>
                {subtext && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontSize: '0.75rem', fontWeight: 500 }}>
                        {subtext}
                    </Typography>
                )}
            </Box>

            {cta && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'grey.50', display: 'flex', alignItems: 'center' }}>
                    <Typography
                        className="cta-text"
                        variant="caption"
                        sx={{
                            fontWeight: 700,
                            color: 'text.secondary',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            transition: 'all 0.2s ease'
                        }}
                    >
                        View Details <ArrowForward sx={{ fontSize: 14 }} />
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};

export default StatCard;
