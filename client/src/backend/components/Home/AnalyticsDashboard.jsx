import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Flight as FlightIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import axios from 'axios';

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get('/api/analytics');
      setAnalytics(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!analytics) {
    return (
      <Alert severity="info">
        No analytics data available
      </Alert>
    );
  }

  const metrics = [
    {
      title: 'Total Bookings',
      value: analytics.totalBookings || 0,
      icon: <PeopleIcon />,
      color: '#1976d2'
    },
    {
      title: 'Active Flights',
      value: analytics.activeFlights || 0,
      icon: <FlightIcon />,
      color: '#2e7d32'
    },
    {
      title: 'Revenue',
      value: `$${(analytics.totalRevenue || 0).toLocaleString()}`,
      icon: <MoneyIcon />,
      color: '#ed6c02'
    },
    {
      title: 'Growth Rate',
      value: `${(analytics.growthRate || 0).toFixed(1)}%`,
      icon: <TrendingUpIcon />,
      color: '#9c27b0'
    }
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Analytics Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      {metric.title}
                    </Typography>
                    <Typography variant="h4" component="div">
                      {metric.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      color: metric.color,
                      fontSize: '2rem'
                    }}
                  >
                    {metric.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {analytics.recentBookings && analytics.recentBookings.length > 0 && (
        <Box mt={4}>
          <Typography variant="h5" gutterBottom>
            Recent Bookings
          </Typography>
          <Grid container spacing={2}>
            {analytics.recentBookings.slice(0, 6).map((booking, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {booking.customerName}
                    </Typography>
                    <Typography color="textSecondary">
                      {booking.activityName}
                    </Typography>
                    <Typography variant="body2">
                      {new Date(booking.bookingDate).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default AnalyticsDashboard; 