import { Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar, Typography, Box, Divider, ListItemButton } from '@mui/material';
import { Dashboard, Class, Assignment, Send, PersonOff, School, AutoAwesome as Sparkles, Warning } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 260; // Slightly wider for better spacing

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
        { text: 'Courses', icon: <Class />, path: '/courses' },
        { text: 'Students', icon: <School />, path: '/students' },
        { text: 'Assignments', icon: <Assignment />, path: '/assignments' },
        { text: 'Submissions', icon: <Send />, path: '/submissions' },
        { text: 'AI Insights', icon: <Sparkles />, path: '/ai-insights' },
        { text: 'At-Risk Students', icon: <Warning />, path: '/at-risk-students' },
        { text: 'Silent Students', icon: <PersonOff />, path: '/silent-students' },
    ];

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                [`& .MuiDrawer-paper`]: {
                    width: drawerWidth,
                    boxSizing: 'border-box',
                    backgroundColor: '#002171', // Official MIET Dark Blue
                    color: 'rgba(255,255,255,0.7)',
                    borderRight: 'none',
                    boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
                    position: 'relative',
                    height: '100%'
                },
            }}
        >
            <Box sx={{ overflow: 'auto', px: 1.5, mt: 2 }}>
                <List sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                                <ListItemButton
                                    onClick={() => navigate(item.path)}
                                    sx={{
                                        minHeight: 48,
                                        justifyContent: 'initial',
                                        px: 2.5,
                                        borderRadius: 2,
                                        transition: 'all 0.2s ease',
                                        color: isActive ? 'white' : 'inherit',
                                        background: isActive
                                            ? 'rgba(255, 255, 255, 0.08)'
                                            : 'transparent',
                                        '&:hover': {
                                            background: 'rgba(255, 255, 255, 0.12)',
                                            color: 'white',
                                            '& .MuiListItemIcon-root': {
                                                color: '#ffc107',
                                            }
                                        },
                                    }}
                                >
                                    {isActive && (
                                        <Box sx={{
                                            position: 'absolute',
                                            left: 0,
                                            top: '25%',
                                            bottom: '25%',
                                            width: 3,
                                            bgcolor: '#ffc107', // MIET Gold active indicator
                                            borderRadius: '0 2px 2px 0',
                                        }} />
                                    )}
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 0,
                                            mr: 2,
                                            justifyContent: 'center',
                                            color: isActive ? '#ffc107' : 'rgba(255,255,255,0.5)',
                                            transition: 'color 0.2s ease'
                                        }}
                                    >
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.text}
                                        primaryTypographyProps={{
                                            fontWeight: isActive ? 700 : 500,
                                            fontSize: '0.95rem'
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
            </Box>
        </Drawer>
    );
};

export default Sidebar;
