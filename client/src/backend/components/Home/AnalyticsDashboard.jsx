import React, { useEffect, useState } from 'react';
import { Box, Grid, Card, CardContent, Typography } from '@mui/material';
import axios from 'axios';
import config from '../../../config';
import { formatGbp } from '../../utils/formatGbp';

const ANALYTICS_REFRESH_INTERVAL_MS = 30000;
const integerFormatter = new Intl.NumberFormat('en-GB');

const grossSalesCardSx = {
    borderRadius: '14px',
    border: '1px solid #d8e4f1',
    boxShadow: 'none',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
    height: '100%'
};

const grossMetricFallback = {
    revenue: 0,
    count: 0
};

const getGrossMetric = (grossSalesData, key) => grossSalesData?.[key] || grossMetricFallback;
const formatMoney = (value) => `£${formatGbp(value || 0)}`;
const formatSoldCount = (value) => `${integerFormatter.format(Number(value) || 0)} sold`;

const formatUpdatedAt = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getChangeColor = (value) => {
    if (value > 0) return '#0f8a5f';
    if (value < 0) return '#bd4a2f';
    return '#52657f';
};

const formatPercentChange = (percentValue, deltaValue) => {
    if (percentValue === null || percentValue === undefined) {
        return deltaValue > 0 ? 'new activity' : 'no baseline';
    }

    if (percentValue === 0) return 'flat';
    return `${percentValue > 0 ? '+' : ''}${percentValue}%`;
};

const GrossSalesTypeRow = ({ label, metric, accentColor }) => (
    <Box
        sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr auto auto' },
            gap: { xs: 0.5, sm: 2 },
            alignItems: 'center',
            py: 1.25,
            borderTop: '1px solid #e7eef7'
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
                sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: accentColor,
                    flex: '0 0 auto'
                }}
            />
            <Typography sx={{ color: '#1c3458', fontWeight: 700, fontSize: 14 }}>
                {label}
            </Typography>
        </Box>
        <Typography sx={{ color: '#23395d', fontWeight: 700, fontSize: 15, textAlign: { xs: 'left', sm: 'right' } }}>
            {formatMoney(metric?.revenue)}
        </Typography>
        <Typography sx={{ color: '#6a7d99', fontWeight: 600, fontSize: 13, textAlign: { xs: 'left', sm: 'right' } }}>
            {formatSoldCount(metric?.count)}
        </Typography>
    </Box>
);

const ComparisonPill = ({ label, comparison }) => {
    const metric = comparison?.total || grossMetricFallback;
    const deltaPercent = metric.revenueDeltaPercent;
    const delta = Number(metric.revenueDelta || 0);

    return (
        <Box
            sx={{
                border: '1px solid #dfe8f3',
                borderRadius: '10px',
                background: '#ffffff',
                px: 1.5,
                py: 1,
                minWidth: 0
            }}
        >
            <Typography sx={{ color: '#667b98', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                {label}
            </Typography>
            <Typography sx={{ color: '#1c3458', fontSize: 13, fontWeight: 700, mt: 0.25 }}>
                {formatMoney(metric.revenue)} · {formatSoldCount(metric.count)}
            </Typography>
            <Typography sx={{ color: getChangeColor(delta), fontSize: 12, fontWeight: 700, mt: 0.25 }}>
                {formatPercentChange(deltaPercent, delta)} revenue
            </Typography>
        </Box>
    );
};

const GrossSalesCard = ({ title, label, grossSalesData, comparisons }) => {
    const totalMetric = getGrossMetric(grossSalesData, 'total');
    const privateMetric = getGrossMetric(grossSalesData, 'private');
    const sharedMetric = getGrossMetric(grossSalesData, 'shared');

    return (
        <Card sx={grossSalesCardSx}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: '#667b98', fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Gross Sales
                        </Typography>
                        <Typography sx={{ color: '#1c3458', fontSize: { xs: 20, md: 22 }, fontWeight: 800, lineHeight: 1.15 }}>
                            {title}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            color: '#0f8a5f',
                            background: '#e8f6ef',
                            border: '1px solid #ccebdc',
                            borderRadius: '999px',
                            px: 1.25,
                            py: 0.5,
                            fontSize: 11,
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {label}
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1.25, mb: 1.5 }}>
                    <Typography sx={{ color: '#102844', fontSize: { xs: 30, md: 36 }, fontWeight: 800, lineHeight: 1 }}>
                        {formatMoney(totalMetric.revenue)}
                    </Typography>
                    <Typography sx={{ color: '#617694', fontSize: 14, fontWeight: 700 }}>
                        {formatSoldCount(totalMetric.count)} bookings/vouchers
                    </Typography>
                </Box>

                <GrossSalesTypeRow label="Private" metric={privateMetric} accentColor="#d78d38" />
                <GrossSalesTypeRow label="Shared" metric={sharedMetric} accentColor="#2d69c5" />

                {comparisons ? (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                            gap: 1,
                            mt: 1.5
                        }}
                    >
                        <ComparisonPill label="Previous MTD" comparison={comparisons.previousMonthToDate} />
                        <ComparisonPill label="Same Period LY" comparison={comparisons.samePeriodLastYear} />
                    </Box>
                ) : null}
            </CardContent>
        </Card>
    );
};

const AnalyticsDashboard = ({ dateRange }) => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
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
        let cancelled = false;

        const fetchAnalytics = (showLoading = false) => {
            if (showLoading) setLoading(true);
            axios.get(`${config.API_BASE_URL}/api/analytics`, {
                params: {
                    start_date: dateRange.start,
                    end_date: dateRange.end
                }
            }).then(res => {
                if (cancelled) return;
                setAnalytics(res.data);
                setLastUpdated(new Date());
                setError(null);
            }).catch((fetchError) => {
                if (cancelled) return;
                console.error('Error fetching analytics:', fetchError);
                setError('Analytics could not be loaded.');
            }).finally(() => {
                if (!cancelled && showLoading) setLoading(false);
            });
        };

        fetchAnalytics(true);
        const refreshTimer = window.setInterval(() => fetchAnalytics(false), ANALYTICS_REFRESH_INTERVAL_MS);

        return () => {
            cancelled = true;
            window.clearInterval(refreshTimer);
        };
    }, [dateRange]);

    if (error && !analytics) return <Typography>{error}</Typography>;
    if (loading || !analytics) return <Typography>Loading analytics...</Typography>;

    const renderList = (items, renderItem) => {
        if (!Array.isArray(items) || items.length === 0) {
            return <Typography sx={bodyTextSx}>No data available</Typography>;
        }

        return items.map(renderItem);
    };
    const grossSales = analytics?.grossSales || {};
    const lastUpdatedLabel = formatUpdatedAt(lastUpdated);

    return (
        <Box sx={{ mt: 3 }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: 1.5,
                    flexDirection: { xs: 'column', sm: 'row' },
                    mb: 1.5
                }}
            >
                <Box>
                    <Typography sx={{ color: '#1c3458', fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
                        Real-time Sales Overview
                    </Typography>
                    <Typography sx={{ color: '#667b98', fontSize: 13, mt: 0.5 }}>
                        Completed purchases only, with fully refunded orders excluded.
                    </Typography>
                </Box>
                <Typography sx={{ color: '#667b98', fontSize: 12, fontWeight: 700 }}>
                    {lastUpdatedLabel ? `Updated ${lastUpdatedLabel}` : ''}
                </Typography>
            </Box>
            {error ? (
                <Typography sx={{ color: '#bd4a2f', fontSize: 13, mb: 1.5 }}>
                    {error}
                </Typography>
            ) : null}
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                    <GrossSalesCard
                        title="Today"
                        label="Live"
                        grossSalesData={grossSales.today}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <GrossSalesCard
                        title="Month to Date"
                        label="MTD"
                        grossSalesData={grossSales.monthToDate}
                        comparisons={grossSales.monthToDate?.comparisons}
                    />
                </Grid>
            </Grid>
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
