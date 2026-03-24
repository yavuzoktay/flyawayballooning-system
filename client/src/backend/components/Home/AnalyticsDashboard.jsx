import React, { useEffect, useState } from 'react';
import { Box, Grid, Card, CardContent, Typography } from '@mui/material';
import axios from 'axios';
import config from '../../../config';
import { formatGbp } from '../../utils/formatGbp';


const AnalyticsDashboard = ({ dateRange }) => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const cardSx = {
        borderRadius: '14px',
        border: '1px solid #e1e8f3',
        boxShadow: 'none',
        background: '#ffffff',
        height: '100%'
    };
    const cardTitleSx = {
        fontSize: 24,
        fontWeight: 700,
        color: '#1c3458',
        mb: 1.25
    };
    const bodyTextSx = {
        fontSize: 14,
        color: '#465a79',
        lineHeight: 1.45
    };

    useEffect(() => {
        setLoading(true);
        axios.get(`${config.API_BASE_URL}/api/analytics`, {
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
        <Box sx={{ mt: 3 }}>
            <Grid container spacing={2}>
                {/* Booking Attempts */}
                <Grid item xs={12} md={2.4}>
                    <Card sx={cardSx}>
                        <CardContent>
                            <Typography sx={cardTitleSx}>Booking Attempts</Typography>
                            <Typography sx={bodyTextSx}>1st attempt: <span style={{color:'#2ecc71'}}>{analytics?.bookingAttempts?.first || 0}%</span></Typography>
                            <Typography sx={bodyTextSx}>2nd attempt: <span style={{color:'#27ae60'}}>{analytics?.bookingAttempts?.second || 0}%</span></Typography>
                            <Typography sx={bodyTextSx}>3rd attempt: <span style={{color:'#f1c40f'}}>{analytics?.bookingAttempts?.third || 0}%</span></Typography>
                            <Typography sx={bodyTextSx}>4th attempt: <span style={{color:'#e67e22'}}>{analytics?.bookingAttempts?.fourth || 0}%</span></Typography>
                            <Typography sx={bodyTextSx}>5th attempt: <span style={{color:'#e74c3c'}}>{analytics?.bookingAttempts?.fifth || 0}%</span></Typography>
                            <Typography sx={bodyTextSx}>6+ attempts: <span style={{color:'#c0392b'}}>{analytics?.bookingAttempts?.sixthPlus || 0}%</span></Typography>
                        </CardContent>
                    </Card>
                </Grid>
                {/* Sales by Source */}
                <Grid item xs={12} md={2.4}>
                    <Card sx={cardSx}>
                        <CardContent>
                            <Typography sx={cardTitleSx}>Sales by Source</Typography>
                            {analytics?.salesBySource?.map((s, i) => (
                                <Typography key={i} sx={bodyTextSx}>{s.source}: <span style={{color:'#2980b9'}}>{s.percent}%</span></Typography>
                            )) || <Typography sx={bodyTextSx}>No data available</Typography>}
                        </CardContent>
                    </Card>
                </Grid>
                {/* Non Redemption & Add Ons */}
                <Grid item xs={12} md={2.4}>
                    <Card sx={cardSx}>
                        <CardContent>
                            <Typography sx={cardTitleSx}>Non Redemption</Typography>
                            <Typography sx={bodyTextSx}>{analytics?.nonRedemption?.value || 0} ({analytics?.nonRedemption?.percent || 0}%)</Typography>
                            <Typography sx={{ ...cardTitleSx, mt: 2 }}>Add On's</Typography>
                            {analytics?.addOns?.length > 0 ? (
                                <>
                                    {analytics.addOns.map((a, i) => (
                                        <Typography key={i} sx={bodyTextSx}>{a.name}: <span style={{color:'#16a085'}}>£{formatGbp(a.value)}</span></Typography>
                                    ))}
                                    <Typography sx={{ ...bodyTextSx, mt: 1, fontWeight: 700 }}>
                                        Total: <span style={{color:'#16a085'}}>£{formatGbp(analytics?.addOnsTotal)}</span>
                                    </Typography>
                                </>
                            ) : (
                                <Typography sx={bodyTextSx}>No data available</Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
                {/* Sales by Location & Booking Type */}
                <Grid item xs={12} md={2.4}>
                    <Card sx={cardSx}>
                        <CardContent>
                            <Typography sx={cardTitleSx}>Sales by Location</Typography>
                            {analytics?.salesByLocation?.map((l, i) => (
                                <Typography key={i} sx={bodyTextSx}>{l.location}: <span style={{color:'#8e44ad'}}>{l.percent}%</span></Typography>
                            )) || <Typography sx={bodyTextSx}>No data available</Typography>}
                            <Typography sx={{ ...cardTitleSx, mt: 2 }}>Sales by Booking Type</Typography>
                            {analytics?.salesByBookingType?.map((b, i) => (
                                <Typography key={i} sx={bodyTextSx}>{b.type}: <span style={{color:'#27ae60'}}>{b.percent}%</span></Typography>
                            )) || <Typography sx={bodyTextSx}>No data available</Typography>}
                        </CardContent>
                    </Card>
                </Grid>
                {/* Liability & Flown Flights */}
                <Grid item xs={12} md={2.4}>
                    <Card sx={cardSx}>
                        <CardContent>
                            <Typography sx={cardTitleSx}>Liability by Location</Typography>
                            {analytics?.liabilityByLocation?.map((l, i) => (
                                <Typography key={i} sx={bodyTextSx}>{l.location}: <span style={{color:'#e67e22'}}>£{formatGbp(l.value)}</span></Typography>
                            )) || <Typography sx={bodyTextSx}>No data available</Typography>}
                            <Typography sx={{ ...cardTitleSx, mt: 2 }}>Liability by Flight Type</Typography>
                            {analytics?.liabilityByFlightType?.map((l, i) => (
                                <Typography key={i} sx={bodyTextSx}>{l.type}: <span style={{color:'#e67e22'}}>£{formatGbp(l.value)}</span></Typography>
                            )) || <Typography sx={bodyTextSx}>No data available</Typography>}
                            <Typography sx={{ ...cardTitleSx, mt: 2 }}>Refundable Liability</Typography>
                            <Typography sx={bodyTextSx}><span style={{color:'#16a085'}}>£{formatGbp(analytics?.refundableLiability)}</span></Typography>
                            <Typography sx={{ ...cardTitleSx, mt: 2 }}>Voucher Liability</Typography>
                            <Typography sx={bodyTextSx}>
                                <span style={{color:'#2980b9'}}>
                                    £{formatGbp(analytics?.voucherLiability)}
                                </span>
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AnalyticsDashboard; 