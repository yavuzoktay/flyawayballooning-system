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

    const renderList = (items, renderItem) => {
        if (!Array.isArray(items) || items.length === 0) {
            return <Typography sx={bodyTextSx}>No data available</Typography>;
        }

        return items.map(renderItem);
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Grid container spacing={2}>
                {/* Booking Attempts */}
                <Grid item xs={12} md={3}>
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
                {/* Sales */}
                <Grid item xs={12} md={3}>
                    <Card sx={cardSx}>
                        <CardContent>
                            <Typography sx={cardTitleSx}>Sales</Typography>
                            <Typography sx={{ ...bodyTextSx, fontWeight: 700, color: '#1c3458', mb: 0.5 }}>
                                Sales by Location
                            </Typography>
                            {renderList(analytics?.salesByLocation, (locationRow, index) => (
                                <Typography key={`sales-location-${index}`} sx={bodyTextSx}>
                                    {locationRow.location}: <span style={{color:'#8e44ad'}}>{locationRow.percent}%</span>
                                </Typography>
                            ))}
                            <Typography sx={{ ...bodyTextSx, fontWeight: 700, color: '#1c3458', mt: 2, mb: 0.5 }}>
                                Sales by Booking Type
                            </Typography>
                            {renderList(analytics?.salesByBookingType, (typeRow, index) => (
                                <Typography key={`sales-type-${index}`} sx={bodyTextSx}>
                                    {typeRow.type}: <span style={{color:'#27ae60'}}>{typeRow.percent}%</span>
                                </Typography>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>
                {/* Liability */}
                <Grid item xs={12} md={3}>
                    <Card sx={cardSx}>
                        <CardContent>
                            <Typography sx={cardTitleSx}>Liability</Typography>
                            <Typography sx={{ ...bodyTextSx, fontWeight: 700, color: '#1c3458', mb: 0.5 }}>
                                Liability by Location
                            </Typography>
                            {renderList(analytics?.liabilityByLocation, (locationRow, index) => (
                                <Typography key={`liability-location-${index}`} sx={bodyTextSx}>
                                    {locationRow.location}: <span style={{color:'#e67e22'}}>£{formatGbp(locationRow.value)}</span>
                                </Typography>
                            ))}
                            <Typography sx={{ ...bodyTextSx, fontWeight: 700, color: '#1c3458', mt: 2, mb: 0.5 }}>
                                Liability by Flight Type
                            </Typography>
                            {renderList(analytics?.liabilityByFlightType, (typeRow, index) => (
                                <Typography key={`liability-type-${index}`} sx={bodyTextSx}>
                                    {typeRow.type}: <span style={{color:'#e67e22'}}>£{formatGbp(typeRow.value)}</span>
                                </Typography>
                            ))}
                            <Typography sx={{ ...bodyTextSx, fontWeight: 700, color: '#1c3458', mt: 2, mb: 0.5 }}>
                                Refundable Liability
                            </Typography>
                            <Typography sx={bodyTextSx}>
                                <span style={{color:'#16a085'}}>£{formatGbp(analytics?.refundableLiability || 0)}</span>
                            </Typography>
                            <Typography sx={{ ...bodyTextSx, fontWeight: 700, color: '#1c3458', mt: 2, mb: 0.5 }}>
                                Voucher Liability
                            </Typography>
                            <Typography sx={bodyTextSx}>
                                <span style={{color:'#2980b9'}}>£{formatGbp(analytics?.voucherLiability)}</span>
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                {/* Extras */}
                <Grid item xs={12} md={3}>
                    <Card sx={cardSx}>
                        <CardContent>
                            <Typography sx={cardTitleSx}>Extras</Typography>
                            <Typography sx={{ ...bodyTextSx, fontWeight: 700, color: '#1c3458', mb: 0.5 }}>
                                Non-Redemption
                            </Typography>
                            <Typography sx={bodyTextSx}>
                                Expired unused total: <span style={{color:'#16a085'}}>£{formatGbp(analytics?.nonRedemption?.value || 0)}</span>
                            </Typography>
                            <Typography sx={bodyTextSx}>
                                Records: <span style={{color:'#465a79'}}>{analytics?.nonRedemption?.count || 0}</span>
                            </Typography>
                            <Typography sx={{ ...bodyTextSx, fontWeight: 700, color: '#1c3458', mt: 2, mb: 0.5 }}>
                                Add On's
                            </Typography>
                            {renderList(analytics?.addOns, (addOnRow, index) => (
                                <Typography key={`add-on-${index}`} sx={bodyTextSx}>
                                    {addOnRow.name}: <span style={{color:'#16a085'}}>£{formatGbp(addOnRow.value)}</span>
                                </Typography>
                            ))}
                            <Typography sx={{ ...bodyTextSx, mt: 1, fontWeight: 700 }}>
                                Total: <span style={{color:'#16a085'}}>£{formatGbp(analytics?.addOnsTotal)}</span>
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AnalyticsDashboard; 
