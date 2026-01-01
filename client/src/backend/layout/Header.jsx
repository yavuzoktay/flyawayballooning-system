import React, { useState, useEffect } from 'react';
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
import axios from 'axios';

const Header = () => {
  const [activeMenuItem, setActiveMenuItem] = useState('Home'); // Track active menu
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hasNewBookings, setHasNewBookings] = useState(false);
  const [hasNewVouchers, setHasNewVouchers] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
   

  const handleMenuClick = (menuItem, path) => {
    setActiveMenuItem(menuItem); // Update active menu item
    
    // If navigating to Booking page, mark bookings and vouchers as viewed
    if (menuItem === 'Booking' && path === '/booking') {
      // Mark as viewed when user clicks Booking button
      checkNewBookingsAndVouchers(true); // true = mark as viewed
    }
    
    navigate(path); // Navigate to the corresponding path
    setDrawerOpen(false); // Close drawer (for mobile)
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Check for new bookings and vouchers
  const checkNewBookingsAndVouchers = async (markAsViewed = false) => {
    try {
      // Get last viewed IDs from localStorage
      const savedBookingIds = localStorage.getItem('lastViewedBookingIds');
      const savedVoucherIds = localStorage.getItem('lastViewedVoucherIds');
      
      const lastViewedBookings = savedBookingIds ? JSON.parse(savedBookingIds) : [];
      const lastViewedVouchers = savedVoucherIds ? JSON.parse(savedVoucherIds) : [];

      // Fetch current bookings and vouchers
      const [bookingsResponse, vouchersResponse] = await Promise.all([
        axios.get('/api/getAllBookingData'),
        axios.get('/api/getAllVoucherData')
      ]);

      const currentBookings = bookingsResponse.data?.data || [];
      const currentVouchers = vouchersResponse.data?.data || [];

      const currentBookingIds = currentBookings.map(b => b.id).filter(id => id != null);
      const currentVoucherIds = currentVouchers.map(v => v.id).filter(id => id != null);

      // Check for new bookings
      if (lastViewedBookings.length > 0) {
        const newBookings = currentBookingIds.filter(id => !lastViewedBookings.includes(id));
        setHasNewBookings(newBookings.length > 0);
      } else {
        setHasNewBookings(false);
      }

      // Check for new vouchers
      if (lastViewedVouchers.length > 0) {
        const newVouchers = currentVoucherIds.filter(id => !lastViewedVouchers.includes(id));
        setHasNewVouchers(newVouchers.length > 0);
      } else {
        setHasNewVouchers(false);
      }

      // If markAsViewed is true, update localStorage (mark all current items as viewed)
      if (markAsViewed) {
        localStorage.setItem('lastViewedBookingIds', JSON.stringify(currentBookingIds));
        localStorage.setItem('lastViewedVoucherIds', JSON.stringify(currentVoucherIds));
        setHasNewBookings(false);
        setHasNewVouchers(false);
      }
    } catch (error) {
      console.error('Error checking new bookings/vouchers:', error);
      // Don't show notifications on error
      setHasNewBookings(false);
      setHasNewVouchers(false);
    }
  };

  // Check for new bookings/vouchers on mount and periodically
  useEffect(() => {
    // Initial check
    checkNewBookingsAndVouchers();

    // Check every 30 seconds
    const interval = setInterval(() => {
      checkNewBookingsAndVouchers();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // When user navigates to Booking page, mark as viewed
  useEffect(() => {
    if (location.pathname === '/booking') {
      // Mark as viewed when user is on Booking page
      checkNewBookingsAndVouchers(true);
    }
  }, [location.pathname]);

  const menuItems = [
    { label: 'Home', path: '/' },
    { label: 'Booking', path: '/booking' },
    { label: 'Manifest', path: '/manifest' },
    { label: 'Activity', path: '/activity' },
    { label: 'Settings', path: '/settings' },
    { label: 'Logs', path: '/logs' },
  ];

  return (
    <>
      {/* Add pulse animation for notification badges */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.8;
            }
          }
        `}
      </style>
      <AppBar position="sticky">
        <Container maxWidth="xl">
          <Toolbar>
          <Grid container alignItems="center" justifyContent="space-between">
            {/* Left/Right spacer on mobile, right-aligned logo on desktop */}
            {!isMobile && (
              <Grid item>
                <img 
                  src={process.env.PUBLIC_URL + '/FAB_Logo_DarkBlue.png'} 
                  alt="Fly Away Ballooning" 
                  style={{ 
                    height: 36, 
                    objectFit: 'contain',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setActiveMenuItem('Home');
                    navigate('/');
                  }}
                />
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
                          sx={{ position: 'relative' }}
                        >
                          <ListItemText primary={item.label} sx={{ color: '#000' }} />
                          {/* Show notification badge for Booking menu item */}
                          {item.label === 'Booking' && (hasNewBookings || hasNewVouchers) && (
                            <span style={{
                              position: "absolute",
                              top: "12px",
                              right: "16px",
                              width: "12px",
                              height: "12px",
                              background: "#ff0000",
                              borderRadius: "50%",
                              border: "2px solid white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              animation: "pulse 2s infinite"
                            }}>
                            </span>
                          )}
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
                          position: 'relative',
                        }}
                      >
                        {item.label}
                        {/* Show notification badge for Booking menu item */}
                        {item.label === 'Booking' && (hasNewBookings || hasNewVouchers) && (
                          <span style={{
                            position: "absolute",
                            top: "8px",
                            right: "8px",
                            width: "12px",
                            height: "12px",
                            background: "#ff0000",
                            borderRadius: "50%",
                            border: "2px solid white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            animation: "pulse 2s infinite"
                          }}>
                          </span>
                        )}
                      </MenuItem>
                    ))}
                  </Box>
                </div>
              </Grid>
            )}
            {isMobile && (
              <Grid item>
                <img 
                  src={process.env.PUBLIC_URL + '/FAB_Logo_DarkBlue.png'} 
                  alt="Fly Away Ballooning" 
                  style={{ 
                    height: 28, 
                    objectFit: 'contain',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setActiveMenuItem('Home');
                    navigate('/');
                    setDrawerOpen(false);
                  }}
                />
              </Grid>
            )}
          </Grid>
        </Toolbar>
      </Container>
    </AppBar>
    </>
  );
};

export default Header;
