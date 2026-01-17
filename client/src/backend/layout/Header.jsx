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
  BottomNavigation,
  BottomNavigationAction,
  Badge,
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Search as SearchIcon,
  Home as HomeIcon,
  Description as BookingIcon,
  FlightTakeoff as FlownFlightsIcon,
  List as ManifestIcon,
  CalendarMonth as ActivityIcon,
  Settings as SettingsIcon,
  History as LogsIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Header = ({ onMenuClick: externalOnMenuClick, onNotificationsChange }) => {
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
    
    // Call external handler if provided (for bottom nav)
    if (externalOnMenuClick) {
      externalOnMenuClick(menuItem, path);
    }
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
      let newBookingsFlag = false;
      if (lastViewedBookings.length > 0) {
        const newBookings = currentBookingIds.filter(id => !lastViewedBookings.includes(id));
        newBookingsFlag = newBookings.length > 0;
        setHasNewBookings(newBookingsFlag);
      } else {
        setHasNewBookings(false);
      }

      // Check for new vouchers
      let newVouchersFlag = false;
      if (lastViewedVouchers.length > 0) {
        const newVouchers = currentVoucherIds.filter(id => !lastViewedVouchers.includes(id));
        newVouchersFlag = newVouchers.length > 0;
        setHasNewVouchers(newVouchersFlag);
      } else {
        setHasNewVouchers(false);
      }
      
      // Notify parent component about notification state changes
      if (onNotificationsChange) {
        onNotificationsChange(newBookingsFlag, newVouchersFlag);
      }

      // If markAsViewed is true, update localStorage (mark all current items as viewed)
      if (markAsViewed) {
        localStorage.setItem('lastViewedBookingIds', JSON.stringify(currentBookingIds));
        localStorage.setItem('lastViewedVoucherIds', JSON.stringify(currentVoucherIds));
        setHasNewBookings(false);
        setHasNewVouchers(false);
        // Notify parent that notifications are cleared
        if (onNotificationsChange) {
          onNotificationsChange(false, false);
        }
      } else {
        // Notify parent component about notification state changes
        if (onNotificationsChange) {
          onNotificationsChange(newBookingsFlag, newVouchersFlag);
        }
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

  const menuItems = [
    { label: 'Home', path: '/', icon: <HomeIcon /> },
    { label: 'Booking', path: '/booking', icon: <BookingIcon /> },
    { label: 'Manifest', path: '/manifest', icon: <ManifestIcon /> },
    { label: 'Activity', path: '/activity', icon: <ActivityIcon /> },
    { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
    { label: 'Flown Flights', path: '/flown-flights', icon: <FlownFlightsIcon /> },
    { label: 'Logs', path: '/logs', icon: <LogsIcon /> },
  ];

  // When user navigates to Booking page, mark as viewed
  useEffect(() => {
    if (location.pathname === '/booking') {
      // Mark as viewed when user is on Booking page
      checkNewBookingsAndVouchers(true);
    }
  }, [location.pathname]);

  // Update active menu item based on current pathname
  useEffect(() => {
    const currentItem = menuItems.find(item => item.path === location.pathname);
    if (currentItem) {
      setActiveMenuItem(currentItem.label);
    }
  }, [location.pathname]);

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
                {/* Mobile: Remove drawer menu button, bottom navigation will handle navigation */}
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

// Bottom Navigation Component for Mobile
export const BottomNav = ({ hasNewBookings, hasNewVouchers, onMenuClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { label: 'Home', path: '/', icon: <HomeIcon /> },
    { label: 'Booking', path: '/booking', icon: <BookingIcon /> },
    { label: 'Manifest', path: '/manifest', icon: <ManifestIcon /> },
    { label: 'Activity', path: '/activity', icon: <ActivityIcon /> },
    { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
    { label: 'Flown Flights', path: '/flown-flights', icon: <FlownFlightsIcon /> },
    { label: 'Logs', path: '/logs', icon: <LogsIcon /> },
  ];

  const handleChange = (event, newValue) => {
    const selectedItem = menuItems.find(item => item.path === newValue);
    if (selectedItem) {
      navigate(selectedItem.path);
      if (onMenuClick) {
        onMenuClick(selectedItem.label, selectedItem.path);
      }
    }
  };

  const getCurrentValue = () => {
    const currentItem = menuItems.find(item => item.path === location.pathname);
    return currentItem ? currentItem.path : '/';
  };

  if (!isMobile) {
    return null; // Don't show on desktop
  }

  return (
    <BottomNavigation
      value={getCurrentValue()}
      onChange={handleChange}
      showLabels
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: '#1e3a8a', // Dark blue background
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        height: '70px',
        '& .MuiBottomNavigationAction-root': {
          color: 'rgba(255, 255, 255, 0.7)',
          minWidth: '60px',
          maxWidth: '80px',
          padding: '6px 4px',
          '&.Mui-selected': {
            color: '#ffffff',
          },
        },
        '& .MuiBottomNavigationAction-label': {
          fontSize: '0.65rem',
          marginTop: '4px',
          fontWeight: 500,
          '&.Mui-selected': {
            fontSize: '0.65rem',
          },
        },
      }}
    >
      {menuItems.map((item, index) => (
        <BottomNavigationAction
          key={index}
          label={item.label}
          value={item.path}
          icon={
            item.label === 'Booking' && (hasNewBookings || hasNewVouchers) ? (
              <Badge
                badgeContent=""
                color="error"
                variant="dot"
                sx={{
                  '& .MuiBadge-badge': {
                    animation: 'pulse 2s infinite',
                  },
                }}
              >
                {item.icon}
              </Badge>
            ) : (
              item.icon
            )
          }
        />
      ))}
    </BottomNavigation>
  );
};

export default Header;
