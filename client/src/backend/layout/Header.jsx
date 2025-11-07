import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Grid,
  IconButton,
  Box,
  InputBase,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemText,
  useTheme,
  useMediaQuery,
  Container,
} from '@mui/material';
import { Menu as MenuIcon, Search as SearchIcon } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

const Header = () => {
  const [activeMenuItem, setActiveMenuItem] = useState('Home'); // Track active menu
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
   

  const handleMenuClick = (menuItem, path) => {
    setActiveMenuItem(menuItem); // Update active menu item
    navigate(path); // Navigate to the corresponding path
    setDrawerOpen(false); // Close drawer (for mobile)
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const menuItems = [
    { label: 'Home', path: '/' },
    { label: 'Booking', path: '/booking' },
    { label: 'Manifest', path: '/manifest' },
    { label: 'Activity', path: '/activity' },
    { label: 'Settings', path: '/settings' },
  ];

  return (
    <AppBar position="sticky">
      <Container maxWidth="xl">
        <Toolbar>
          <Grid container alignItems="center" justifyContent="space-between">
            {/* Left/Right spacer on mobile, right-aligned logo on desktop */}
            {!isMobile && (
              <Grid item>
                <img src={process.env.PUBLIC_URL + '/FAB_Logo_DarkBlue.png'} alt="Fly Away Ballooning" style={{ height: 36, objectFit: 'contain' }} />
              </Grid>
            )}
            {/* Right: Menu Items */}
            {isMobile ? (
              <Grid item>
                <IconButton color="inherit" onClick={handleDrawerToggle}>
                  <MenuIcon />
                </IconButton>
                <Drawer anchor="right" open={drawerOpen} onClose={handleDrawerToggle}>
                  <div className="mob-header-nav-wrap">
                    <List>
                      {menuItems.map((item, index) => (
                        <ListItem
                          button
                          key={index}
                          onClick={() => handleMenuClick(item.label, item.path)}
                          selected={activeMenuItem === item.label}
                        >
                          <ListItemText primary={item.label} sx={{ color: '#000' }} />
                        </ListItem>
                      ))}
                    </List>
                  </div>
                </Drawer>
              </Grid>
            ) : (
              <Grid item>
                <div className="header-nav-wrap">
                  <Box display="flex" justifyContent="center" alignItems="center">
                    {menuItems.map((item, index) => (
                      <MenuItem
                        key={index}
                        onClick={() => handleMenuClick(item.label, item.path)}
                        sx={{
                          fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                          color: '#000',
                        }}
                      >
                        {item.label}
                      </MenuItem>
                    ))}
                  </Box>
                </div>
              </Grid>
            )}
            {isMobile && (
              <Grid item>
                <img src={process.env.PUBLIC_URL + '/FAB_Logo_DarkBlue.png'} alt="Fly Away Ballooning" style={{ height: 28, objectFit: 'contain' }} />
              </Grid>
            )}
          </Grid>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;
