import React, { useEffect, useState } from 'react';
import { Box, Grid, Card, CardContent, Typography } from '@mui/material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;


const AnalyticsDashboard = ({ dateRange }) => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        axios.get(`${API_BASE_URL}/api/analytics`, {
            params: {
                start_date: dateRange.start,
                end_date: dateRange.end
            }
        }).then(res => {
            setAnalytics(res.data);
        }).finally(() => setLoading(false));
    }, [dateRange]);

    if (loading || !analytics) return <Typography>Loading analytics...</Typography>;

    return (
        <Box sx={{ mt: 4 }}>
            <Grid container spacing={2}>
                {/* Booking Attempts */}
                <Grid item xs={12} md={2.4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Booking Attempts</Typography>
                            <Typography>1st attempt: <span style={{color:'#2ecc71'}}>{analytics?.bookingAttempts?.first || 0}%</span></Typography>
                            <Typography>2nd attempt: <span style={{color:'#27ae60'}}>{analytics?.bookingAttempts?.second || 0}%</span></Typography>
                            <Typography>3rd attempt: <span style={{color:'#f1c40f'}}>{analytics?.bookingAttempts?.third || 0}%</span></Typography>
                            <Typography>4th attempt: <span style={{color:'#e67e22'}}>{analytics?.bookingAttempts?.fourth || 0}%</span></Typography>
                            <Typography>5th attempt: <span style={{color:'#e74c3c'}}>{analytics?.bookingAttempts?.fifth || 0}%</span></Typography>
                            <Typography>6+ attempts: <span style={{color:'#c0392b'}}>{analytics?.bookingAttempts?.sixthPlus || 0}%</span></Typography>
                        </CardContent>
                    </Card>
                </Grid>
                {/* Sales by Source */}
                <Grid item xs={12} md={2.4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Sales by Source</Typography>
                            {analytics?.salesBySource?.map((s, i) => (
                                <Typography key={i}>{s.source}: <span style={{color:'#2980b9'}}>{s.percent}%</span></Typography>
                            )) || <Typography>No data available</Typography>}
                        </CardContent>
                    </Card>
                </Grid>
                {/* Non Redemption & Add Ons */}
                <Grid item xs={12} md={2.4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Non Redemption</Typography>
                            <Typography>{analytics?.nonRedemption?.value || 0} ({analytics?.nonRedemption?.percent || 0}%)</Typography>
                            <Typography variant="h6" sx={{ mt: 2 }}>Add On's</Typography>
                            {analytics?.addOns?.map((a, i) => (
                                <Typography key={i}>{a.name}: <span style={{color:'#16a085'}}>£{a.value}</span></Typography>
                            )) || <Typography>No data available</Typography>}
                        </CardContent>
                    </Card>
                </Grid>
                {/* Sales by Location & Booking Type */}
                <Grid item xs={12} md={2.4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Sales by Location</Typography>
                            {analytics?.salesByLocation?.map((l, i) => (
                                <Typography key={i}>{l.location}: <span style={{color:'#8e44ad'}}>{l.percent}%</span></Typography>
                            )) || <Typography>No data available</Typography>}
                            <Typography variant="h6" sx={{ mt: 2 }}>Sales by Booking Type</Typography>
                            {analytics?.salesByBookingType?.map((b, i) => (
                                <Typography key={i}>{b.type}: <span style={{color:'#27ae60'}}>{b.percent}%</span></Typography>
                            )) || <Typography>No data available</Typography>}
                        </CardContent>
                    </Card>
                </Grid>
                {/* Liability & Flown Flights */}
                <Grid item xs={12} md={2.4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Liability by Location</Typography>
                            {analytics?.liabilityByLocation?.map((l, i) => (
                                <Typography key={i}>{l.location}: <span style={{color:'#e67e22'}}>£{l.value}</span></Typography>
                            )) || <Typography>No data available</Typography>}
                            <Typography variant="h6" sx={{ mt: 2 }}>Liability by Flight Type</Typography>
                            {analytics?.liabilityByFlightType?.map((l, i) => (
                                <Typography key={i}>{l.type}: <span style={{color:'#e67e22'}}>£{l.value}</span></Typography>
                            )) || <Typography>No data available</Typography>}
                            <Typography variant="h6" sx={{ mt: 2 }}>Refundable Liability</Typography>
                            <Typography><span style={{color:'#16a085'}}>£{analytics?.refundableLiability || 0}</span></Typography>
                            <Typography variant="h6" sx={{ mt: 2 }}>Flown Flights by Location</Typography>
                            {analytics?.flownFlightsByLocation?.map((f, i) => (
                                <Typography key={i}>{f.location}: <span style={{color:'#2980b9'}}>{f.count}</span></Typography>
                            )) || <Typography>No data available</Typography>}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AnalyticsDashboard; 