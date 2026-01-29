import { Paper, Typography, Box } from '@mui/material';

const StatCard = ({ title, value, icon, color, trend }) => {
    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'white',
                '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    borderColor: 'primary.light'
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

            <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', mb: 0.5 }}>
                    {title}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    {value}
                </Typography>
            </Box>
        </Paper>
    );
};

export default StatCard;
