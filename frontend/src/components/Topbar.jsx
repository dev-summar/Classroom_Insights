import { AppBar, Toolbar, Typography, Box } from '@mui/material';

const Topbar = () => {
    return (
        <AppBar position="static" color="default" elevation={0} sx={{
            borderBottom: '4px solid',
            borderColor: 'secondary.main',
            bgcolor: '#002171',
            color: 'white',
            px: 1,
            py: 0.5
        }}>
            <Toolbar>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
                    <Box
                        component="img"
                        src="https://mietjmu.in/wp-content/uploads/2020/11/miet-logo-white.png"
                        alt="MIET Logo"
                        sx={{
                            height: 62,
                            width: 'auto',
                            display: { xs: 'none', sm: 'block' }
                        }}
                    />
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" component="div" sx={{
                            color: 'white',
                            fontWeight: 900,
                            fontSize: '1.25rem',
                            lineHeight: 1.1,
                            letterSpacing: '0.01em',
                            textTransform: 'uppercase'
                        }}>
                            MODEL INSTITUTE OF ENGINEERING AND TECHNOLOGY
                        </Typography>
                        <Typography variant="caption" sx={{
                            color: 'secondary.main',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase'
                        }}>
                            Classroom Insights
                        </Typography>
                    </Box>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Topbar;
