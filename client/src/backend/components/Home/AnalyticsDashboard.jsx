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
    count: 0,
    averageBookingValue: 0
};

const operationalMetricFallback = {
    flights: 0,
    passengers: 0,
    revenue: 0,
    revenuePerPassenger: 0
};

const timingMetricFallback = {
    averageDays: 0,
    count: 0
};

const refundTrackingFallback = {
    total: { amount: 0, count: 0 },
    bookings: { amount: 0, count: 0 },
    vouchers: { amount: 0, count: 0 },
    other: { amount: 0, count: 0 }
};

const nonRedemptionFallback = {
    value: 0,
    count: 0,
    bookings: { value: 0, count: 0 },
    vouchers: { value: 0, count: 0 }
};

const getGrossMetric = (grossSalesData, key) => grossSalesData?.[key] || grossMetricFallback;
const formatMoney = (value) => `£${formatGbp(value || 0)}`;
const formatSoldCount = (value) => `${integerFormatter.format(Number(value) || 0)} sold`;
const formatBookingCount = (value) => integerFormatter.format(Number(value) || 0);
const formatSeatCount = (value) => integerFormatter.format(Number(value) || 0);
const formatCountWithLabel = (value, singularLabel, pluralLabel) => {
    const count = Number(value) || 0;
    return `${integerFormatter.format(count)} ${count === 1 ? singularLabel : pluralLabel}`;
};
const formatFlightCount = (value) => formatCountWithLabel(value, 'flight', 'flights');
const formatPassengerCount = (value) => formatCountWithLabel(value, 'passenger', 'passengers');
const getRevenuePerPassenger = (metric = {}) => {
    if (metric?.revenuePerPassenger !== undefined) {
        return Number(metric.revenuePerPassenger) || 0;
    }

    const passengers = Number(metric?.passengers) || 0;
    if (passengers <= 0) return 0;
    return (Number(metric?.revenue) || 0) / passengers;
};
const formatDayCount = (value) => {
    const numericValue = Number(value) || 0;
    const formattedValue = Number.isInteger(numericValue) ? numericValue : numericValue.toFixed(1);
    return `${formattedValue} ${numericValue === 1 ? 'day' : 'days'}`;
};
const formatTimingSampleCount = (value, singularLabel = 'booking', pluralLabel = 'bookings') =>
    `from ${formatCountWithLabel(value, singularLabel, pluralLabel)}`;

const formatUtilisationPercent = (value) => {
    const numericValue = Number(value) || 0;
    return `${Number.isInteger(numericValue) ? numericValue : numericValue.toFixed(1)}%`;
};

const getAverageBookingValueFromMetric = (metric) => {
    if (metric?.averageBookingValue !== undefined) return Number(metric.averageBookingValue) || 0;
    const count = Number(metric?.count) || 0;
    if (count <= 0) return 0;
    return (Number(metric?.revenue) || 0) / count;
};

const getFinancialTracking = (grossSalesData) => {
    if (grossSalesData?.financialTracking) return grossSalesData.financialTracking;

    const total = getGrossMetric(grossSalesData, 'total');
    const shared = getGrossMetric(grossSalesData, 'shared');
    const privateMetric = getGrossMetric(grossSalesData, 'private');

    return {
        averageBookingValue: {
            total: getAverageBookingValueFromMetric(total),
            shared: getAverageBookingValueFromMetric(shared),
            private: getAverageBookingValueFromMetric(privateMetric)
        },
        bookings: {
            total: Number(total.count) || 0,
            shared: Number(shared.count) || 0,
            private: Number(privateMetric.count) || 0
        }
    };
};

const getOperationalMetric = (operationalData, key) =>
    operationalData?.flightsFlown?.[key] || operationalMetricFallback;

const getSharedSeatUtilisation = (operationalData) =>
    operationalData?.seatUtilisation?.shared || {
        percent: 0,
        passengers: 0,
        capacity: 0,
        flights: 0
    };

const getTimingMetric = (bookingTimingData, groupKey, metricKey) =>
    bookingTimingData?.[groupKey]?.[metricKey] || timingMetricFallback;

const getRefundTracking = (refundTrackingData) => ({
    ...refundTrackingFallback,
    ...(refundTrackingData || {}),
    total: refundTrackingData?.total || refundTrackingFallback.total,
    bookings: refundTrackingData?.bookings || refundTrackingFallback.bookings,
    vouchers: refundTrackingData?.vouchers || refundTrackingFallback.vouchers,
    other: refundTrackingData?.other || refundTrackingFallback.other
});

const getNonRedemption = (nonRedemptionData) => ({
    ...nonRedemptionFallback,
    ...(nonRedemptionData || {}),
    bookings: nonRedemptionData?.bookings || nonRedemptionFallback.bookings,
    vouchers: nonRedemptionData?.vouchers || nonRedemptionFallback.vouchers
});

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
            <Typography sx={{ color: '#1c3458', fontWeight: 600, fontSize: 14 }}>
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
                        <Typography sx={{ color: '#667b98', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Gross Sales
                        </Typography>
                        <Typography sx={{ color: '#1c3458', fontSize: { xs: 20, md: 22 }, fontWeight: 700, lineHeight: 1.15 }}>
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
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {label}
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1.25, mb: 1.5 }}>
                    <Typography sx={{ color: '#102844', fontSize: { xs: 30, md: 36 }, fontWeight: 700, lineHeight: 1 }}>
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
                        <ComparisonPill label="Previous Month" comparison={comparisons.previousMonth || comparisons.previousMonthToDate} />
                        <ComparisonPill label="Same Period LY" comparison={comparisons.samePeriodLastYear} />
                    </Box>
                ) : null}
            </CardContent>
        </Card>
    );
};

const FinancialTrackingRow = ({ label, value, supportingValue, accentColor }) => (
    <Box
        sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) auto' },
            gap: { xs: 0.5, sm: 1.5 },
            alignItems: 'center',
            py: 1.35,
            borderTop: '1px solid #e7eef7'
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
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
        <Box sx={{ textAlign: { xs: 'left', lg: 'right' }, minWidth: 0 }}>
            <Typography sx={{ color: '#102844', fontWeight: 700, fontSize: 20, lineHeight: 1.1 }}>
                {value}
            </Typography>
            {supportingValue ? (
                <Typography sx={{ color: '#667b98', fontWeight: 700, fontSize: 12, mt: 0.25, overflowWrap: 'anywhere' }}>
                    {supportingValue}
                </Typography>
            ) : null}
        </Box>
    </Box>
);

const AverageBookingValueCard = ({ todayData, monthToDateData }) => {
    const today = getFinancialTracking(todayData);
    const monthToDate = getFinancialTracking(monthToDateData);

    return (
        <Card sx={grossSalesCardSx}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'flex-start', mb: 1.75 }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: '#667b98', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Financial Tracking
                        </Typography>
                        <Typography sx={{ color: '#1c3458', fontSize: { xs: 20, md: 22 }, fontWeight: 700, lineHeight: 1.15 }}>
                            Average Booking Value
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            color: '#8a5b12',
                            background: '#fff3df',
                            border: '1px solid #f3d7aa',
                            borderRadius: '999px',
                            px: 1.25,
                            py: 0.5,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        MTD
                    </Box>
                </Box>
                <FinancialTrackingRow
                    label="Shared flight ABV"
                    value={formatMoney(monthToDate.averageBookingValue.shared)}
                    supportingValue={`Today ${formatMoney(today.averageBookingValue.shared)}`}
                    accentColor="#2d69c5"
                />
                <FinancialTrackingRow
                    label="Private flight ABV"
                    value={formatMoney(monthToDate.averageBookingValue.private)}
                    supportingValue={`Today ${formatMoney(today.averageBookingValue.private)}`}
                    accentColor="#d78d38"
                />
            </CardContent>
        </Card>
    );
};

const BookingVolumeCard = ({ todayData, monthToDateData }) => {
    const today = getFinancialTracking(todayData);
    const monthToDate = getFinancialTracking(monthToDateData);

    return (
        <Card sx={grossSalesCardSx}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'flex-start', mb: 1.75 }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: '#667b98', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Booking Behaviour
                        </Typography>
                        <Typography sx={{ color: '#1c3458', fontSize: { xs: 20, md: 22 }, fontWeight: 700, lineHeight: 1.15 }}>
                            Number of Bookings
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            color: '#0f5f8a',
                            background: '#e8f3fb',
                            border: '1px solid #cfe3f3',
                            borderRadius: '999px',
                            px: 1.25,
                            py: 0.5,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Live
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1.25, mb: 0.75 }}>
                    <Typography sx={{ color: '#102844', fontSize: { xs: 34, md: 40 }, fontWeight: 700, lineHeight: 1 }}>
                        {formatBookingCount(monthToDate.bookings.total)}
                    </Typography>
                    <Typography sx={{ color: '#617694', fontSize: 14, fontWeight: 700 }}>
                        total bookings MTD · {formatBookingCount(today.bookings.total)} today
                    </Typography>
                </Box>
                <FinancialTrackingRow
                    label="Shared bookings"
                    value={formatBookingCount(monthToDate.bookings.shared)}
                    supportingValue={`${formatBookingCount(today.bookings.shared)} today`}
                    accentColor="#2d69c5"
                />
                <FinancialTrackingRow
                    label="Private bookings"
                    value={formatBookingCount(monthToDate.bookings.private)}
                    supportingValue={`${formatBookingCount(today.bookings.private)} today`}
                    accentColor="#d78d38"
                />
            </CardContent>
        </Card>
    );
};

const RefundTrackingCard = ({ refundTrackingData }) => {
    const refundTracking = getRefundTracking(refundTrackingData);
    const total = refundTracking.total;

    return (
        <Card sx={grossSalesCardSx}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'flex-start', mb: 1.75 }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: '#667b98', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Financial Tracking
                        </Typography>
                        <Typography sx={{ color: '#1c3458', fontSize: { xs: 20, md: 22 }, fontWeight: 700, lineHeight: 1.15 }}>
                            Refund Tracking
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            color: '#8a2f1f',
                            background: '#fff0eb',
                            border: '1px solid #f3c4b7',
                            borderRadius: '999px',
                            px: 1.25,
                            py: 0.5,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Period
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1.25, mb: 0.5 }}>
                    <Typography sx={{ color: '#102844', fontSize: { xs: 34, md: 40 }, fontWeight: 700, lineHeight: 1 }}>
                        {formatMoney(total.amount)}
                    </Typography>
                    <Typography sx={{ color: '#617694', fontSize: 14, fontWeight: 700 }}>
                        {formatCountWithLabel(total.count, 'refund issued', 'refunds issued')}
                    </Typography>
                </Box>
                <FinancialTrackingRow
                    label="Booking refunds"
                    value={formatMoney(refundTracking.bookings.amount)}
                    supportingValue={formatCountWithLabel(refundTracking.bookings.count, 'refund', 'refunds')}
                    accentColor="#bd4a2f"
                />
                <FinancialTrackingRow
                    label="Voucher refunds"
                    value={formatMoney(refundTracking.vouchers.amount)}
                    supportingValue={formatCountWithLabel(refundTracking.vouchers.count, 'refund', 'refunds')}
                    accentColor="#d78d38"
                />
                {refundTracking.other.count > 0 ? (
                    <FinancialTrackingRow
                        label="Other refunds"
                        value={formatMoney(refundTracking.other.amount)}
                        supportingValue={formatCountWithLabel(refundTracking.other.count, 'refund', 'refunds')}
                        accentColor="#667b98"
                    />
                ) : null}
            </CardContent>
        </Card>
    );
};

const NonRedemptionCard = ({ nonRedemptionData }) => {
    const nonRedemption = getNonRedemption(nonRedemptionData);

    return (
        <Card sx={grossSalesCardSx}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'flex-start', mb: 1.75 }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: '#667b98', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Booking Behaviour
                        </Typography>
                        <Typography sx={{ color: '#1c3458', fontSize: { xs: 20, md: 22 }, fontWeight: 700, lineHeight: 1.15 }}>
                            Non-Redemption
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            color: '#6d4d00',
                            background: '#fff7d8',
                            border: '1px solid #efe1a4',
                            borderRadius: '999px',
                            px: 1.25,
                            py: 0.5,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Expired
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1.25, mb: 0.5 }}>
                    <Typography sx={{ color: '#102844', fontSize: { xs: 34, md: 40 }, fontWeight: 700, lineHeight: 1 }}>
                        {formatMoney(nonRedemption.value)}
                    </Typography>
                    <Typography sx={{ color: '#617694', fontSize: 14, fontWeight: 700 }}>
                        {formatCountWithLabel(nonRedemption.count, 'expired booking/voucher', 'expired bookings/vouchers')}
                    </Typography>
                </Box>
                <FinancialTrackingRow
                    label="Expired bookings"
                    value={formatMoney(nonRedemption.bookings.value)}
                    supportingValue={formatCountWithLabel(nonRedemption.bookings.count, 'booking', 'bookings')}
                    accentColor="#2d69c5"
                />
                <FinancialTrackingRow
                    label="Expired vouchers"
                    value={formatMoney(nonRedemption.vouchers.value)}
                    supportingValue={formatCountWithLabel(nonRedemption.vouchers.count, 'voucher', 'vouchers')}
                    accentColor="#d78d38"
                />
            </CardContent>
        </Card>
    );
};

const OperationalPerformanceRow = ({ label, metric, accentColor }) => (
    <Box
        sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) auto' },
            gap: { xs: 0.5, sm: 1.5 },
            alignItems: 'center',
            py: 1.35,
            borderTop: '1px solid #e7eef7'
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
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
        <Box sx={{ textAlign: { xs: 'left', lg: 'right' }, minWidth: 0 }}>
            <Typography sx={{ color: '#102844', fontWeight: 700, fontSize: 18, lineHeight: 1.1 }}>
                {formatMoney(metric.revenue)}
            </Typography>
            <Typography sx={{ color: '#667b98', fontWeight: 600, fontSize: 12, mt: 0.25, overflowWrap: 'anywhere' }}>
                {formatFlightCount(metric.flights)} · {formatPassengerCount(metric.passengers)} · {formatMoney(getRevenuePerPassenger(metric))} per passenger
            </Typography>
        </Box>
    </Box>
);

const FlightsFlownCard = ({ operationalData }) => {
    const total = getOperationalMetric(operationalData, 'total');
    const privateMetric = getOperationalMetric(operationalData, 'private');
    const sharedMetric = getOperationalMetric(operationalData, 'shared');

    return (
        <Card sx={grossSalesCardSx}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'flex-start', mb: 1.75 }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: '#667b98', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Operational Performance
                        </Typography>
                        <Typography sx={{ color: '#1c3458', fontSize: { xs: 20, md: 22 }, fontWeight: 700, lineHeight: 1.15 }}>
                            Flights Flown + Passenger Count
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            color: '#6d4d00',
                            background: '#fff7d8',
                            border: '1px solid #efe1a4',
                            borderRadius: '999px',
                            px: 1.25,
                            py: 0.5,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Flown
                    </Box>
                </Box>
                <Box sx={{ mb: 0.75, minWidth: 0 }}>
                    <Typography sx={{ color: '#102844', fontSize: { xs: 34, md: 40 }, fontWeight: 700, lineHeight: 1 }}>
                        {formatBookingCount(total.flights)}
                    </Typography>
                    <Typography sx={{ color: '#617694', fontSize: 14, fontWeight: 700, mt: 0.5, width: '100%', maxWidth: '100%', minWidth: 0, overflowWrap: 'anywhere' }}>
                        flights flown · {formatPassengerCount(total.passengers)} · {formatMoney(total.revenue)} revenue
                    </Typography>
                </Box>
                <OperationalPerformanceRow
                    label="Private flights"
                    metric={privateMetric}
                    accentColor="#d78d38"
                />
                <OperationalPerformanceRow
                    label="Shared flights"
                    metric={sharedMetric}
                    accentColor="#2d69c5"
                />
            </CardContent>
        </Card>
    );
};

const SeatUtilisationCard = ({ operationalData }) => {
    const sharedUtilisation = getSharedSeatUtilisation(operationalData);
    const utilisationPercent = Math.max(0, Math.min(100, Number(sharedUtilisation.percent) || 0));

    return (
        <Card sx={grossSalesCardSx}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'flex-start', mb: 1.75 }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: '#667b98', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Shared Flight Efficiency
                        </Typography>
                        <Typography sx={{ color: '#1c3458', fontSize: { xs: 20, md: 22 }, fontWeight: 700, lineHeight: 1.15 }}>
                            Seat Utilisation
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            color: '#0f5f8a',
                            background: '#e8f3fb',
                            border: '1px solid #cfe3f3',
                            borderRadius: '999px',
                            px: 1.25,
                            py: 0.5,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Shared
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1.25, mb: 1.5 }}>
                    <Typography sx={{ color: '#102844', fontSize: { xs: 34, md: 40 }, fontWeight: 700, lineHeight: 1 }}>
                        {formatUtilisationPercent(sharedUtilisation.percent)}
                    </Typography>
                    <Typography sx={{ color: '#617694', fontSize: 14, fontWeight: 700 }}>
                        completed shared flights
                    </Typography>
                </Box>
                <Box sx={{ height: 10, borderRadius: '999px', background: '#e7eef7', overflow: 'hidden', mb: 1.25 }}>
                    <Box
                        sx={{
                            width: `${utilisationPercent}%`,
                            height: '100%',
                            borderRadius: '999px',
                            background: 'linear-gradient(90deg, #2d69c5 0%, #67b8a7 100%)'
                        }}
                    />
                </Box>
                <FinancialTrackingRow
                    label="Shared passengers flown"
                    value={formatSeatCount(sharedUtilisation.passengers)}
                    supportingValue={`${formatFlightCount(sharedUtilisation.flights)}`}
                    accentColor="#2d69c5"
                />
                <FinancialTrackingRow
                    label="Shared seat capacity"
                    value={formatSeatCount(sharedUtilisation.capacity)}
                    supportingValue="completed flight seats"
                    accentColor="#67b8a7"
                />
            </CardContent>
        </Card>
    );
};

const TimingMetricRow = ({ label, metric, accentColor, countLabel = ['booking', 'bookings'] }) => (
    <Box
        sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) auto' },
            gap: { xs: 0.5, sm: 1.5 },
            alignItems: 'center',
            py: 1.35,
            borderTop: '1px solid #e7eef7'
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
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
        <Box sx={{ textAlign: { xs: 'left', lg: 'right' }, minWidth: 0 }}>
            <Typography sx={{ color: '#102844', fontWeight: 700, fontSize: 20, lineHeight: 1.1 }}>
                {formatDayCount(metric.averageDays)}
            </Typography>
            <Typography sx={{ color: '#667b98', fontWeight: 700, fontSize: 12, mt: 0.25, overflowWrap: 'anywhere' }}>
                {formatTimingSampleCount(metric.count, countLabel[0], countLabel[1])}
            </Typography>
        </Box>
    </Box>
);

const BookingLeadTimeCard = ({ bookingTimingData }) => {
    const total = getTimingMetric(bookingTimingData, 'leadTime', 'total');
    const shared = getTimingMetric(bookingTimingData, 'leadTime', 'shared');
    const privateMetric = getTimingMetric(bookingTimingData, 'leadTime', 'private');

    return (
        <Card sx={grossSalesCardSx}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'flex-start', mb: 1.75 }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: '#667b98', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Booking Behaviour
                        </Typography>
                        <Typography sx={{ color: '#1c3458', fontSize: { xs: 20, md: 22 }, fontWeight: 700, lineHeight: 1.15 }}>
                            Booking Lead Time
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            color: '#8a5b12',
                            background: '#fff3df',
                            border: '1px solid #f3d7aa',
                            borderRadius: '999px',
                            px: 1.25,
                            py: 0.5,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Avg Days
                    </Box>
                </Box>
                <Typography sx={{ color: '#617694', fontSize: 13, fontWeight: 700, mb: 0.75 }}>
                    Booking created date to first booked flight date.
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1.25, mb: 0.5 }}>
                    <Typography sx={{ color: '#102844', fontSize: { xs: 34, md: 40 }, fontWeight: 700, lineHeight: 1 }}>
                        {formatDayCount(total.averageDays)}
                    </Typography>
                    <Typography sx={{ color: '#617694', fontSize: 14, fontWeight: 700 }}>
                        average · {formatBookingCount(total.count)} bookings
                    </Typography>
                </Box>
                <TimingMetricRow
                    label="Shared flight lead time"
                    metric={shared}
                    accentColor="#2d69c5"
                />
                <TimingMetricRow
                    label="Private flight lead time"
                    metric={privateMetric}
                    accentColor="#d78d38"
                />
            </CardContent>
        </Card>
    );
};

const RedemptionTimeCard = ({ bookingTimingData }) => {
    const total = getTimingMetric(bookingTimingData, 'redemptionTime', 'total');
    const shared = getTimingMetric(bookingTimingData, 'redemptionTime', 'shared');
    const privateMetric = getTimingMetric(bookingTimingData, 'redemptionTime', 'private');

    return (
        <Card sx={grossSalesCardSx}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'flex-start', mb: 1.75 }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: '#667b98', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Booking Behaviour
                        </Typography>
                        <Typography sx={{ color: '#1c3458', fontSize: { xs: 20, md: 22 }, fontWeight: 700, lineHeight: 1.15 }}>
                            Redemption Time
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            color: '#6d4d00',
                            background: '#fff7d8',
                            border: '1px solid #efe1a4',
                            borderRadius: '999px',
                            px: 1.25,
                            py: 0.5,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Flown
                    </Box>
                </Box>
                <Typography sx={{ color: '#617694', fontSize: 13, fontWeight: 700, mb: 0.75 }}>
                    Purchase or booking date to flight actually taken.
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1.25, mb: 0.5 }}>
                    <Typography sx={{ color: '#102844', fontSize: { xs: 34, md: 40 }, fontWeight: 700, lineHeight: 1 }}>
                        {formatDayCount(total.averageDays)}
                    </Typography>
                    <Typography sx={{ color: '#617694', fontSize: 14, fontWeight: 700 }}>
                        average redemption time
                    </Typography>
                </Box>
                <TimingMetricRow
                    label="Shared redemption time"
                    metric={shared}
                    accentColor="#2d69c5"
                    countLabel={['flown booking', 'flown bookings']}
                />
                <TimingMetricRow
                    label="Private redemption time"
                    metric={privateMetric}
                    accentColor="#d78d38"
                    countLabel={['flown booking', 'flown bookings']}
                />
            </CardContent>
        </Card>
    );
};

const AnalyticsDashboard = ({ dateRange, summary = {} }) => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const cardSx = {
        ...grossSalesCardSx
    };
    const cardTitleSx = {
        fontSize: { xs: 20, md: 22 },
        fontWeight: 700,
        color: '#1c3458',
        lineHeight: 1.15,
        mb: 1.75
    };
    const bodyTextSx = {
        fontSize: 14,
        color: '#465a79',
        lineHeight: 1.45
    };
    const metricSectionTitleSx = {
        color: '#667b98',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        mt: 1.5,
        mb: 0.75
    };
    const metricRowSx = {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 1.5,
        py: 1,
        borderTop: '1px solid #e7eef7'
    };
    const metricLabelSx = {
        color: '#1c3458',
        fontSize: 14,
        fontWeight: 600,
        minWidth: 0
    };
    const metricValueSx = {
        color: '#2d69c5',
        fontSize: 14,
        fontWeight: 700,
        textAlign: 'right',
        whiteSpace: 'nowrap'
    };
    const summaryMetricBoxSx = {
        background: '#f4f8ff',
        border: '1px solid #d8e4f1',
        borderRadius: '12px',
        p: 1.25,
        mb: 1.5
    };
    const summaryMetricLabelSx = {
        color: '#667b98',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        mb: 0.5
    };
    const summaryMetricValueSx = {
        color: '#1c3458',
        fontSize: { xs: 24, md: 26 },
        fontWeight: 700,
        lineHeight: 1
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
    const operationalPerformance = analytics?.operationalPerformance || {};
    const bookingTiming = analytics?.bookingTiming || {};
    const refundTracking = analytics?.refundTracking || {};
    const nonRedemption = analytics?.nonRedemption || {};
    const lastUpdatedLabel = formatUpdatedAt(lastUpdated);
    const totalSales = Number(summary?.totalSales) || 0;
    const totalLiability = Number(summary?.totalLiability ?? analytics?.totalLiability) || 0;
    const voucherLiability = Number(summary?.voucherLiability ?? analytics?.voucherLiability) || 0;
    const vatByQuarter = Array.isArray(summary?.vatByQuarter) ? summary.vatByQuarter : [];
    const totalVat = vatByQuarter.reduce((sum, item) => sum + (Number(item?.vat) || 0), 0) || Number(summary?.totalVAT) || 0;

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
                    <Typography sx={{ color: '#1c3458', fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
                        Real-time Performance Overview
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
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                    <AverageBookingValueCard
                        todayData={grossSales.today}
                        monthToDateData={grossSales.monthToDate}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <BookingVolumeCard
                        todayData={grossSales.today}
                        monthToDateData={grossSales.monthToDate}
                    />
                </Grid>
            </Grid>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                    <RefundTrackingCard refundTrackingData={refundTracking} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <NonRedemptionCard nonRedemptionData={nonRedemption} />
                </Grid>
            </Grid>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                    <BookingLeadTimeCard bookingTimingData={bookingTiming} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <RedemptionTimeCard bookingTimingData={bookingTiming} />
                </Grid>
            </Grid>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                    <FlightsFlownCard operationalData={operationalPerformance} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <SeatUtilisationCard operationalData={operationalPerformance} />
                </Grid>
            </Grid>
            <Grid container spacing={2}>
                {/* Sales */}
                <Grid item xs={12} md={3}>
                    <Card sx={cardSx}>
                        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                            <Typography sx={cardTitleSx}>Sales</Typography>
                            <Box sx={summaryMetricBoxSx}>
                                <Typography sx={summaryMetricLabelSx}>Total sales</Typography>
                                <Typography sx={{ ...summaryMetricValueSx, color: '#8e44ad' }}>
                                    £{formatGbp(totalSales)}
                                </Typography>
                            </Box>
                            <Typography sx={{ ...metricSectionTitleSx, mt: 0 }}>
                                Sales by Location
                            </Typography>
                            {renderList(analytics?.salesByLocation, (locationRow, index) => (
                                <Box key={`sales-location-${index}`} sx={metricRowSx}>
                                    <Typography sx={metricLabelSx}>{locationRow.location}</Typography>
                                    <Typography sx={{ ...metricValueSx, color: '#8e44ad' }}>{locationRow.percent}%</Typography>
                                </Box>
                            ))}
                            <Typography sx={metricSectionTitleSx}>
                                Sales by Booking Type
                            </Typography>
                            {renderList(analytics?.salesByBookingType, (typeRow, index) => (
                                <Box key={`sales-type-${index}`} sx={metricRowSx}>
                                    <Typography sx={metricLabelSx}>{typeRow.type}</Typography>
                                    <Typography sx={{ ...metricValueSx, color: '#0f8a5f' }}>{typeRow.percent}%</Typography>
                                </Box>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>
                {/* Liability */}
                <Grid item xs={12} md={3}>
                    <Card sx={cardSx}>
                        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                            <Typography sx={cardTitleSx}>Liability</Typography>
                            <Box sx={summaryMetricBoxSx}>
                                <Typography sx={summaryMetricLabelSx}>Total liability</Typography>
                                <Typography sx={{ ...summaryMetricValueSx, color: '#d78d38' }}>
                                    £{formatGbp(totalLiability)}
                                </Typography>
                            </Box>
                            <Typography sx={{ ...metricSectionTitleSx, mt: 0 }}>
                                Liability by Location
                            </Typography>
                            {renderList(analytics?.liabilityByLocation, (locationRow, index) => (
                                <Box key={`liability-location-${index}`} sx={metricRowSx}>
                                    <Typography sx={metricLabelSx}>{locationRow.location}</Typography>
                                    <Typography sx={{ ...metricValueSx, color: '#d78d38' }}>£{formatGbp(locationRow.value)}</Typography>
                                </Box>
                            ))}
                            <Typography sx={metricSectionTitleSx}>
                                Liability by Flight Type
                            </Typography>
                            {renderList(analytics?.liabilityByFlightType, (typeRow, index) => (
                                <Box key={`liability-type-${index}`} sx={metricRowSx}>
                                    <Typography sx={metricLabelSx}>{typeRow.type}</Typography>
                                    <Typography sx={{ ...metricValueSx, color: '#d78d38' }}>£{formatGbp(typeRow.value)}</Typography>
                                </Box>
                            ))}
                            <Typography sx={metricSectionTitleSx}>Liability totals</Typography>
                            <Box sx={metricRowSx}>
                                <Typography sx={metricLabelSx}>Refundable</Typography>
                                <Typography sx={{ ...metricValueSx, color: '#16a085' }}>£{formatGbp(analytics?.refundableLiability || 0)}</Typography>
                            </Box>
                            <Box sx={metricRowSx}>
                                <Typography sx={metricLabelSx}>Voucher</Typography>
                                <Typography sx={{ ...metricValueSx }}>£{formatGbp(voucherLiability)}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                {/* VAT */}
                <Grid item xs={12} md={3}>
                    <Card sx={cardSx}>
                        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                            <Typography sx={cardTitleSx}>VAT</Typography>
                            <Box sx={summaryMetricBoxSx}>
                                <Typography sx={summaryMetricLabelSx}>Total VAT</Typography>
                                <Typography sx={{ ...summaryMetricValueSx, color: '#0f8a5f' }}>
                                    £{formatGbp(totalVat)}
                                </Typography>
                            </Box>
                            <Typography sx={{ ...metricSectionTitleSx, mt: 0 }}>
                                VAT by Quarter
                            </Typography>
                            {renderList(vatByQuarter, (quarterRow, index) => (
                                <Box key={quarterRow.key || `vat-quarter-${index}`} sx={metricRowSx}>
                                    <Typography sx={metricLabelSx}>
                                        {quarterRow.label || `Q${quarterRow.quarter} ${quarterRow.year}`}
                                    </Typography>
                                    <Typography sx={{ ...metricValueSx, color: '#0f8a5f' }}>
                                        £{formatGbp(quarterRow.vat)}
                                    </Typography>
                                </Box>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>
                {/* Extras */}
                <Grid item xs={12} md={3}>
                    <Card sx={cardSx}>
                        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                            <Typography sx={cardTitleSx}>Extras</Typography>
                            <Typography sx={{ ...metricSectionTitleSx, mt: 0 }}>
                                Add On's
                            </Typography>
                            {renderList(analytics?.addOns, (addOnRow, index) => (
                                <Box key={`add-on-${index}`} sx={metricRowSx}>
                                    <Typography sx={metricLabelSx}>{addOnRow.name}</Typography>
                                    <Typography sx={{ ...metricValueSx, color: '#16a085' }}>£{formatGbp(addOnRow.value)}</Typography>
                                </Box>
                            ))}
                            <Box sx={{ ...metricRowSx, mt: 1 }}>
                                <Typography sx={{ ...metricLabelSx, fontWeight: 700 }}>Total</Typography>
                                <Typography sx={{ ...metricValueSx, color: '#16a085' }}>£{formatGbp(analytics?.addOnsTotal)}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AnalyticsDashboard; 
