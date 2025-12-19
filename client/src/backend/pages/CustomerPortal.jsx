import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Container, Typography, Box, Paper, CircularProgress, Alert, Button, TextField } from '@mui/material';
import dayjs from 'dayjs';
import CustomerPortalHeader from '../components/CustomerPortal/CustomerPortalHeader';
import RescheduleFlightModal from '../components/CustomerPortal/RescheduleFlightModal';
import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import '../components/CustomerPortal/CustomerPortalHeader.css';

const getApiBaseUrl = () => {
    if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim()) {
        return process.env.REACT_APP_API_URL.trim();
    }
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:3002';
    }
    return '';
};

const buildApiUrl = (path) => {
    // If path is already a full URL, return it as is
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    const base = getApiBaseUrl();
    if (!base) {
        return path;
    }
    if (path.startsWith('/')) {
        return `${base}${path}`;
    }
    return `${base}/${path}`;
};

const CustomerPortal = () => {
    const { token: tokenParam } = useParams();
    const [bookingData, setBookingData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
    const [changeLocationModalOpen, setChangeLocationModalOpen] = useState(false);
    const [portalContents, setPortalContents] = useState([]);
    const [availableLocations, setAvailableLocations] = useState([]);
    const [selectedNewLocation, setSelectedNewLocation] = useState('');
    const [changingLocation, setChangingLocation] = useState(false);
    const [locationAvailabilities, setLocationAvailabilities] = useState([]);
    const [loadingAvailabilities, setLoadingAvailabilities] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
    const [selectedActivityId, setSelectedActivityId] = useState(null);
    const [cancelFlightDialogOpen, setCancelFlightDialogOpen] = useState(false);
    const [cancellingFlight, setCancellingFlight] = useState(false);
    const [resendingConfirmation, setResendingConfirmation] = useState(false);
    const [extendingVoucher, setExtendingVoucher] = useState(false);

    // Passenger edit states
    const [editingPassenger, setEditingPassenger] = useState(null);
    const [editPassengerFirstName, setEditPassengerFirstName] = useState('');
    const [editPassengerLastName, setEditPassengerLastName] = useState('');
    const [editPassengerWeight, setEditPassengerWeight] = useState('');
    const [savingPassengerEdit, setSavingPassengerEdit] = useState(false);

    // Extract token from URL - handle both /customerPortal/:token and /customerPortal/:token/index
    const token = tokenParam ? tokenParam.split('/')[0] : null;

    const fetchBookingData = async () => {
        if (!token) {
            setError('Invalid token');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            // URL encode the token to handle special characters like =
            const encodedToken = encodeURIComponent(token);
            console.log('🔍 Customer Portal - Fetching booking data with token:', token);
            console.log('🔍 Customer Portal - Encoded token:', encodedToken);
            const response = await axios.get(`/api/customer-portal-booking/${encodedToken}`);

            console.log('✅ Customer Portal - Response received:', response.data);
            if (response.data.success) {
                setBookingData(response.data.data);
            } else {
                console.error('❌ Customer Portal - API returned error:', response.data);
                setError(response.data.message || 'Failed to load booking data');
            }
        } catch (err) {
            console.error('❌ Customer Portal - Error fetching booking data:', err);
            console.error('❌ Customer Portal - Error response:', err.response);
            console.error('❌ Customer Portal - Error status:', err.response?.status);
            console.error('❌ Customer Portal - Error data:', err.response?.data);
            const errorMessage = err.response?.data?.message ||
                (err.response?.status === 404 ? 'Booking not found. Please check your link.' :
                    err.response?.status === 500 ? 'Server error. Please try again later.' :
                        'Error loading booking data. Please try again later.');
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Check for payment success from Stripe redirect
        const urlParams = new URLSearchParams(window.location.search);
        const paymentSuccess = urlParams.get('payment') === 'success';
        const paymentType = urlParams.get('type');
        
        if (paymentSuccess && paymentType === 'extend_voucher') {
            // Remove query parameters from URL
            window.history.replaceState({}, document.title, window.location.pathname);
            // Show success message
            alert('Payment successful! Your voucher has been extended by 12 months.');
            
            // Async function to handle payment success flow
            const handlePaymentSuccess = async () => {
                // First, fetch current booking data to get the baseline expiry date
                // This ensures we have the previous expiry date even if bookingData state is stale
                let previousExpires = null;
                let currentBookingId = null;
                try {
                    const encodedToken = encodeURIComponent(token);
                    const baselineResponse = await axios.get(`/api/customer-portal-booking/${encodedToken}`);
                    if (baselineResponse.data.success) {
                        previousExpires = baselineResponse.data.data?.expires;
                        currentBookingId = baselineResponse.data.data?.id;
                        setBookingData(baselineResponse.data.data); // Update state with current data
                    }
                } catch (error) {
                    console.error('Error fetching baseline booking data:', error);
                    // Use bookingData state as fallback
                    previousExpires = bookingData?.expires;
                    currentBookingId = bookingData?.id;
                }
                
                // Try to extend voucher directly via API (fallback if webhook doesn't work)
                if (currentBookingId) {
                    try {
                        console.log('🔄 Customer Portal - Attempting to extend voucher directly via API...');
                        const extendResponse = await axios.post('/api/customer-portal-extend-voucher', {
                            bookingId: currentBookingId,
                            months: 12,
                            sessionId: urlParams.get('session_id')
                        });
                        if (extendResponse.data.success) {
                            console.log('✅ Customer Portal - Voucher extended successfully via direct API:', extendResponse.data.data);
                            // Update previousExpires to the new value so retry mechanism knows it's updated
                            previousExpires = extendResponse.data.data.newExpires;
                        }
                    } catch (error) {
                        console.error('❌ Customer Portal - Error extending voucher via direct API:', error);
                        // Continue with retry mechanism as fallback
                    }
                }
            
            // Wait for webhook to process (webhook may take a few seconds to update database)
            // Then fetch booking data with retries to ensure we get the updated expiry date
            const fetchWithRetry = async (retryCount = 0, maxRetries = 5, baselineExpires = previousExpires) => {
                // First wait: 4 seconds to allow webhook to process
                // Subsequent retries: 2 seconds between each
                const delay = retryCount === 0 ? 4000 : 2000;
                
                if (retryCount > 0) {
                    console.log(`🔄 Retrying fetchBookingData (attempt ${retryCount + 1}/${maxRetries + 1})...`);
                } else {
                    console.log('⏳ Waiting for webhook to process (4 seconds)...');
                }
                
                await new Promise(resolve => setTimeout(resolve, delay));
                
                try {
                    // Fetch fresh booking data
                    const encodedToken = encodeURIComponent(token);
                    const response = await axios.get(`/api/customer-portal-booking/${encodedToken}`);
                    
                    if (response.data.success) {
                        const newExpires = response.data.data?.expires;
                        setBookingData(response.data.data);
                        
                        console.log(`📅 Expiry date check - Previous: ${baselineExpires}, New: ${newExpires}`);
                        
                        // Check if expiry date has changed (indicating webhook has processed)
                        // If expiry date hasn't changed and we haven't exhausted retries, retry once more
                        if (baselineExpires && newExpires === baselineExpires && retryCount < maxRetries) {
                            console.log('⚠️ Expiry date not updated yet, retrying...');
                            setTimeout(() => {
                                fetchWithRetry(retryCount + 1, maxRetries, baselineExpires);
                            }, 2000);
                        } else {
                            if (baselineExpires && newExpires !== baselineExpires) {
                                console.log('✅ Expiry date updated successfully!');
                            } else if (!baselineExpires) {
                                console.log('ℹ️ No previous expiry date to compare');
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error fetching booking data on retry:', error);
                    if (retryCount < maxRetries) {
                        setTimeout(() => {
                            fetchWithRetry(retryCount + 1, maxRetries, baselineExpires);
                        }, 2000);
                    }
                }
            };
            
            fetchWithRetry();
            };
            
            // Call the async function
            handlePaymentSuccess();
        } else {
            fetchBookingData();
        }

        // Fetch customer portal contents
        const fetchPortalContents = async () => {
            try {
                const response = await axios.get('/api/customer-portal-contents');
                if (response.data?.success) {
                    // Filter only active contents and sort by sort_order
                    const activeContents = response.data.data
                        .filter(content => content.is_active)
                        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                    setPortalContents(activeContents);
                }
            } catch (error) {
                console.error('Error fetching customer portal contents:', error);
                setPortalContents([]);
            }
        };

        fetchPortalContents();

        // Fetch available locations
        const fetchLocations = async () => {
            try {
                const response = await axios.get('/api/activities');
                if (response.data?.success) {
                    const activities = Array.isArray(response.data.data) ? response.data.data : [];
                    const uniqueLocations = [...new Set(activities
                        .filter(a => a.location && a.status === 'Live')
                        .map(a => a.location)
                    )];
                    setAvailableLocations(uniqueLocations.sort());
                }
            } catch (error) {
                console.error('Error fetching locations:', error);
                // Fallback to default locations
                setAvailableLocations(['Bath', 'Devon', 'Somerset']);
            }
        };

        fetchLocations();

        // Refresh booking data when page becomes visible (user switches back to tab)
        const handleVisibilityChange = () => {
            if (!document.hidden && token) {
                console.log('🔄 Customer Portal - Page visible, refreshing booking data');
                fetchBookingData();
            }
        };

        // Refresh booking data periodically (every 30 seconds) to get latest updates
        const refreshInterval = setInterval(() => {
            if (token && !document.hidden) {
                console.log('🔄 Customer Portal - Periodic refresh of booking data');
                fetchBookingData();
            }
        }, 30000); // 30 seconds

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(refreshInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [token]);

    const handleResendConfirmation = async () => {
        if (!bookingData?.id) {
            alert('Booking information missing. Please refresh the page and try again.');
            return;
        }

        setResendingConfirmation(true);
        try {
            const response = await axios.post(buildApiUrl('/api/customer-portal-resend-confirmation'), {
                bookingId: bookingData.id
            });

            if (response.data?.success) {
                alert(response.data.message || 'Your confirmation email is on its way!');
            } else {
                alert(response.data?.message || 'Failed to resend confirmation email. Please try again.');
            }
        } catch (error) {
            console.error('Customer Portal - Error resending confirmation:', error);
            alert(error.response?.data?.message || 'Failed to resend confirmation email. Please try again later.');
        } finally {
            setResendingConfirmation(false);
        }
    };

    const handleExtendVoucher = async () => {
        if (!bookingData?.id) {
            alert('Booking information missing. Please refresh the page and try again.');
            return;
        }

        const passengerCount = bookingData.passengers?.length || bookingData.pax || 1;
        const totalAmount = 50 * passengerCount;
        
        const confirmMessage = `Extend your voucher by 12 months for £${totalAmount.toFixed(2)} (£50 per passenger × ${passengerCount} passenger${passengerCount > 1 ? 's' : ''})?\n\nYou will be redirected to payment. After successful payment, your voucher expiry date will be extended by 12 months.`;
        
        if (!window.confirm(confirmMessage)) {
            return;
        }

        setExtendingVoucher(true);
        try {
            // Create Stripe checkout session for extend voucher
            const sessionRes = await axios.post(buildApiUrl('/api/create-checkout-session'), {
                totalPrice: totalAmount,
                currency: 'GBP',
                type: 'extend_voucher',
                extendVoucherData: {
                    bookingId: bookingData.id,
                    months: 12,
                    passengerCount: passengerCount,
                    token: token // Include token for redirect back to customer portal
                }
            });

            if (!sessionRes.data.success) {
                alert('Payment could not be initiated: ' + (sessionRes.data.message || 'Unknown error'));
                return;
            }

            // Redirect to Stripe checkout using session URL
            if (sessionRes.data.sessionUrl) {
                window.location.href = sessionRes.data.sessionUrl;
            } else if (sessionRes.data.sessionId) {
                // Fallback: construct URL from sessionId (Stripe standard format)
                const sessionUrl = `https://checkout.stripe.com/c/pay/${sessionRes.data.sessionId}`;
                window.location.href = sessionUrl;
            } else {
                alert('Payment session could not be created. Please try again.');
            }
            // Payment success will be handled by webhook and success URL
        } catch (error) {
            console.error('Customer Portal - Error extending voucher:', error);
            alert(error.response?.data?.message || 'Failed to initiate payment. Please try again later.');
        } finally {
            setExtendingVoucher(false);
        }
    };

    // Passenger edit handlers
    const handleEditPassengerClick = (passenger) => {
        setEditingPassenger(passenger.id);
        setEditPassengerFirstName(passenger.first_name || '');
        setEditPassengerLastName(passenger.last_name || '');
        setEditPassengerWeight(passenger.weight || '');
    };

    const handleCancelPassengerEdit = () => {
        setEditingPassenger(null);
        setEditPassengerFirstName('');
        setEditPassengerLastName('');
        setEditPassengerWeight('');
    };

    const handleSavePassengerEdit = async (passenger) => {
        setSavingPassengerEdit(true);
        try {
            const updates = [];

            if (editPassengerFirstName !== (passenger.first_name || '')) {
                updates.push({ field: 'first_name', value: editPassengerFirstName });
            }
            if (editPassengerLastName !== (passenger.last_name || '')) {
                updates.push({ field: 'last_name', value: editPassengerLastName });
            }
            if (editPassengerWeight !== (passenger.weight || '')) {
                updates.push({ field: 'weight', value: editPassengerWeight });
            }

            // Update each field that has changed
            for (const update of updates) {
                await axios.patch('/api/updatePassengerField', {
                    passenger_id: passenger.id,
                    field: update.field,
                    value: update.value
                });
            }

            // Refresh booking data to get updated passenger information
            await fetchBookingData();
            setEditingPassenger(null);
        } catch (err) {
            console.error('Failed to update passenger details:', err);
            alert('Failed to update passenger details. Please try again.');
        } finally {
            setSavingPassengerEdit(false);
        }
    };

    if (loading) {
        return (
            <>
                <CustomerPortalHeader />
                <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
                    <CircularProgress />
                    <Typography variant="body1" sx={{ mt: 2 }}>Loading customer portal...</Typography>
                </Container>
            </>
        );
    }

    if (error) {
        return (
            <>
                <CustomerPortalHeader />
                <Container maxWidth="md" sx={{ py: 4 }}>
                    <Alert severity="error">{error}</Alert>
                </Container>
            </>
        );
    }

    if (!bookingData) {
        return (
            <>
                <CustomerPortalHeader />
                <Container maxWidth="md" sx={{ py: 4 }}>
                    <Alert severity="info">No booking data found.</Alert>
                </Container>
            </>
        );
    }

    return (
        <>
            <CustomerPortalHeader />
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box id="portal-main" sx={{ mb: 4, scrollMarginTop: '100px' }}>
                    <Box sx={{ mb: 3, borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                        <img
                            src="/uploads/email/emailImage.jpg"
                            alt="Fly Away Ballooning"
                            style={{
                                width: '100%',
                                height: 'auto',
                                maxHeight: '300px',
                                objectFit: 'cover',
                                display: 'block'
                            }}
                        />
                    </Box>
                    <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 1, color: '#0f172a' }}>
                            Welcome, {bookingData.name ? bookingData.name.split(' ')[0] : 'Guest'}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            You can manage your booking with us here.
                        </Typography>
                    </Box>
                </Box>

                <Paper id="scroll-target-booking" elevation={2} sx={{ p: 3, mb: 3, scrollMarginTop: '100px' }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                        {(() => {
                            const bookFlight = (bookingData.book_flight || '').toString().trim().toLowerCase();
                            const voucherType = (bookingData.voucher_type || '').toString().trim().toLowerCase();
                            const isFlightVoucher = bookingData.is_flight_voucher || 
                                bookFlight === 'flight voucher' || 
                                voucherType === 'flight voucher';
                            return isFlightVoucher ? 'Your Booking Flight Voucher' : 'Your Booking';
                        })()}
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <Box>
                            <Typography variant="body2" color="text.secondary">Booking ID or Voucher Reference</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                                {bookingData.booking_reference || bookingData.id || 'N/A'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="body2" color="text.secondary">Status</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                                {bookingData.status || 'Open'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="body2" color="text.secondary">Flight Date</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                                {bookingData.status && bookingData.status.toLowerCase() === 'cancelled'
                                    ? 'Not Scheduled'
                                    : bookingData.flight_date
                                        ? dayjs(bookingData.flight_date).format('DD/MM/YYYY HH:mm')
                                        : (bookingData.is_flight_voucher ? 'Date Not Scheduled' : 'Not Scheduled')}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="body2" color="text.secondary">Location</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                                {bookingData.location 
                                    ? bookingData.location 
                                    : (bookingData.is_flight_voucher ? 'Date Not Scheduled' : 'TBD')}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="body2" color="text.secondary">Booking Created Date</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                                {bookingData.created_at
                                    ? dayjs(bookingData.created_at).format('DD/MM/YYYY HH:mm')
                                    : 'N/A'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="body2" color="text.secondary">Number of Flight Attempts Made</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                                {bookingData.flight_attempts !== undefined && bookingData.flight_attempts !== null
                                    ? bookingData.flight_attempts
                                    : 0}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="body2" color="text.secondary">Voucher Type Purchased</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                                {(() => {
                                    const flightType = bookingData.flight_type || bookingData.experience || '';
                                    const voucherType = bookingData.voucher_type || '';

                                    // Normalize flight type (remove "Flight" or "Charter" if present)
                                    let normalizedFlightType = flightType;
                                    if (normalizedFlightType) {
                                        normalizedFlightType = normalizedFlightType
                                            .replace(/\s*Flight\s*/gi, '')
                                            .replace(/\s*Charter\s*/gi, '')
                                            .trim();
                                    }

                                    // Combine flight type and voucher type
                                    if (normalizedFlightType && voucherType) {
                                        return `${normalizedFlightType} - ${voucherType}`;
                                    } else if (normalizedFlightType) {
                                        return normalizedFlightType;
                                    } else if (voucherType) {
                                        return voucherType;
                                    } else {
                                        return 'Standard';
                                    }
                                })()}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="body2" color="text.secondary">Voucher / Booking Expiry Date</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                                {bookingData.expires
                                    ? dayjs(bookingData.expires).format('DD/MM/YYYY')
                                    : 'No expiry date'}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Action Buttons - Reschedule, Change Location, Cancel */}
                    {(() => {
                        const hasFlightDate = Boolean(bookingData.flight_date);
                        const flightDate = hasFlightDate ? dayjs(bookingData.flight_date) : null;
                        const now = dayjs();
                        const isCancelled = bookingData.status && bookingData.status.toLowerCase() === 'cancelled';

                        // If cancelled (admin side), allow customer to pick a new date/location immediately
                        // by treating hoursUntilFlight as "far in future" when no upcoming flight is set.
                        const hoursUntilFlight = flightDate ? flightDate.diff(now, 'hour') : 999999;

                        // Check if expiry date has passed (compare by day to avoid time-of-day edge cases)
                        const expiryDate = bookingData.expires ? dayjs(bookingData.expires) : null;
                        const isExpired = expiryDate ? expiryDate.isBefore(now, 'day') : false;

                        // If voucher / booking has expired, ALL actions in the portal must be disabled
                        // regardless of flight date / 120-hour rules.
                        let canReschedule;
                        let canChangeLocation;
                        let canCancel;
                        let canResendConfirmation;
                        let canExtendVoucher;

                        if (isExpired) {
                            canReschedule = false;
                            canChangeLocation = false;
                            canCancel = false;
                            canResendConfirmation = false;
                            canExtendVoucher = false;
                        } else {
                            // Normal (non-expired) behaviour:
                            // Reschedule disabled within 120 hours; cancelled overrides the window check
                            canReschedule = isCancelled || hoursUntilFlight > 120;

                            // Change Location disabled only if less than 120 hours; cancelled overrides the window check
                            canChangeLocation = isCancelled || hoursUntilFlight > 120;

                            // Cancel disabled if already cancelled or less than 120 hours
                            canCancel = !isCancelled && hoursUntilFlight > 120;

                            // Resend / Extend actions available while not in a loading state
                            canResendConfirmation = !resendingConfirmation;
                            canExtendVoucher = !extendingVoucher;
                        }

                        return (
                            <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #d1d5db' }}>
                                {/* Reschedule Flight Button - Disabled if expired, cancelled, or within 120 hours */}
                                <Tooltip 
                                    title={
                                        isExpired 
                                            ? "Voucher / Booking has expired"
                                            : (!canReschedule 
                                                ? (isCancelled 
                                                    ? "Flight cancelled - pick a new date"
                                                    : "Less than 120 hours remaining until your flight")
                                                : "")
                                    }
                                    arrow
                                >
                                    <span style={{ display: 'block', width: '100%' }}>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            fullWidth
                                            disabled={!canReschedule}
                                            onClick={() => canReschedule && setRescheduleModalOpen(true)}
                                            sx={{
                                                py: 1.5,
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                textTransform: 'none',
                                                borderRadius: 2,
                                                boxShadow: canReschedule ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                                                backgroundColor: canReschedule ? undefined : '#f3f4f6',
                                                color: canReschedule ? undefined : '#9ca3af',
                                                '&:hover': canReschedule ? {
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                                } : {
                                                    boxShadow: 'none',
                                                    backgroundColor: '#f3f4f6',
                                                },
                                                '&.Mui-disabled': {
                                                    backgroundColor: '#f3f4f6 !important',
                                                    color: '#9ca3af !important',
                                                    opacity: 0.6,
                                                    cursor: 'not-allowed',
                                                }
                                            }}
                                        >
                                            Reschedule Your Flight
                                        </Button>
                                    </span>
                                </Tooltip>

                                {/* Change Flight Location Button - Disabled if cancelled or less than 120 hours */}
                                <Tooltip 
                                    title={
                                        isExpired
                                            ? "Voucher / Booking has expired"
                                            : (!canChangeLocation ? "Less than 120 hours remaining until your flight" : "")
                                    }
                                    arrow
                                >
                                    <span style={{ display: 'block', width: '100%' }}>
                                        <Button
                                            variant="outlined"
                                            color="primary"
                                            fullWidth
                                            disabled={!canChangeLocation}
                                            onClick={() => canChangeLocation && (() => {
                                                setSelectedNewLocation(bookingData.location || '');
                                                setChangeLocationModalOpen(true);
                                            })()}
                                            sx={{
                                                mt: 1.5,
                                                py: 1.5,
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                textTransform: 'none',
                                                borderRadius: 2,
                                                borderWidth: 2,
                                                borderColor: canChangeLocation ? undefined : '#d1d5db',
                                                color: canChangeLocation ? undefined : '#9ca3af',
                                                backgroundColor: canChangeLocation ? 'transparent' : '#f3f4f6',
                                                cursor: canChangeLocation ? 'pointer' : 'not-allowed',
                                                '&:hover': canChangeLocation ? {
                                                    borderWidth: 2,
                                                } : {
                                                    borderWidth: 2,
                                                    borderColor: '#d1d5db',
                                                    backgroundColor: '#f3f4f6',
                                                },
                                                '&.Mui-disabled': {
                                                    borderColor: '#d1d5db',
                                                    color: '#9ca3af',
                                                    backgroundColor: '#f3f4f6',
                                                }
                                            }}
                                        >
                                            Change Flight Location
                                        </Button>
                                    </span>
                                </Tooltip>

                                {/* Cancel Flight Button - Always visible, but disabled if cancelled or less than 120 hours */}
                                <Tooltip
                                    title={
                                        isExpired
                                            ? "Voucher / Booking has expired"
                                            : (isCancelled
                                                ? "Flight is cancelled"
                                                : (!canCancel ? "Less than 120 hours remaining until your flight" : ""))
                                    }
                                    arrow
                                >
                                    <span style={{ display: 'block', width: '100%' }}>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            fullWidth
                                            disabled={!canCancel}
                                            onClick={() => canCancel && setCancelFlightDialogOpen(true)}
                                            sx={{
                                                mt: 1.5,
                                                py: 1.5,
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                textTransform: 'none',
                                                borderRadius: 2,
                                                borderWidth: 2,
                                                borderColor: canCancel ? '#ef4444' : '#d1d5db',
                                                color: canCancel ? '#ef4444' : '#9ca3af',
                                                backgroundColor: canCancel ? 'transparent' : '#f3f4f6',
                                                cursor: canCancel ? 'pointer' : 'not-allowed',
                                                '&:hover': canCancel ? {
                                                    borderWidth: 2,
                                                    borderColor: '#dc2626',
                                                    backgroundColor: '#fef2f2',
                                                } : {
                                                    borderWidth: 2,
                                                    borderColor: '#d1d5db',
                                                    backgroundColor: '#f3f4f6',
                                                },
                                                '&.Mui-disabled': {
                                                    borderColor: '#d1d5db',
                                                    color: '#9ca3af',
                                                    backgroundColor: '#f3f4f6',
                                                }
                                            }}
                                        >
                                            Cancel Flight
                                        </Button>
                                    </span>
                                </Tooltip>

                                {/* Resend Confirmation Button */}
                                <Tooltip
                                    title={isExpired ? "Voucher / Booking has expired" : ""}
                                    arrow
                                >
                                    <span style={{ display: 'block', width: '100%' }}>
                                        <Button
                                            variant="text"
                                            color="primary"
                                            fullWidth
                                            onClick={handleResendConfirmation}
                                            disabled={!canResendConfirmation}
                                            sx={{
                                                mt: 1.5,
                                                py: 1.25,
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                textTransform: 'none',
                                                borderRadius: 2,
                                                color: canResendConfirmation ? '#1d4ed8' : '#9ca3af',
                                                '&:hover': canResendConfirmation ? {
                                                    backgroundColor: '#eff6ff'
                                                } : {
                                                    backgroundColor: 'transparent'
                                                },
                                                '&.Mui-disabled': {
                                                    color: '#9ca3af'
                                                }
                                            }}
                                        >
                                            {resendingConfirmation ? <CircularProgress size={20} /> : 'Resend Confirmation'}
                                        </Button>
                                    </span>
                                </Tooltip>

                                {/* Extend Voucher Button */}
                                <Tooltip
                                    title={isExpired ? "Voucher / Booking has expired" : ""}
                                    arrow
                                >
                                    <span style={{ display: 'block', width: '100%' }}>
                                        <Button
                                            variant="outlined"
                                            color="primary"
                                            fullWidth
                                            onClick={handleExtendVoucher}
                                            disabled={!canExtendVoucher}
                                            sx={{
                                                mt: 1.5,
                                                py: 1.25,
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                textTransform: 'none',
                                                borderRadius: 2,
                                                borderColor: canExtendVoucher ? '#1d4ed8' : '#d1d5db',
                                                color: canExtendVoucher ? '#1d4ed8' : '#9ca3af',
                                                '&:hover': canExtendVoucher ? {
                                                    backgroundColor: '#eff6ff',
                                                    borderColor: '#1d4ed8'
                                                } : {
                                                    backgroundColor: '#f3f4f6',
                                                    borderColor: '#d1d5db'
                                                },
                                                '&.Mui-disabled': {
                                                    borderColor: '#d1d5db',
                                                    color: '#9ca3af'
                                                }
                                            }}
                                        >
                                            {extendingVoucher ? <CircularProgress size={20} /> : 'Extend Voucher 12 Months – £50 per passenger'}
                                        </Button>
                                    </span>
                                </Tooltip>
                            </Box>
                        );
                    })()}
                </Paper>

                {bookingData.passengers && bookingData.passengers.length > 0 && (
                    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                            Passengers
                        </Typography>
                        {bookingData.passengers.map((passenger, index) => {
                            // For Flight Voucher, disable editing - only display passenger info
                            const isFlightVoucher = bookingData.is_flight_voucher || bookingData.book_flight === 'Flight Voucher';
                            const isEditing = !isFlightVoucher && editingPassenger === passenger.id;
                            return (
                                <Box key={passenger.id || index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                    {/* Name Section */}
                                    <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {isEditing ? (
                                            <Box sx={{ display: 'flex', gap: 1, flex: 1, flexWrap: 'wrap' }}>
                                                <TextField
                                                    size="small"
                                                    label="First Name"
                                                    value={editPassengerFirstName}
                                                    onChange={(e) => setEditPassengerFirstName(e.target.value)}
                                                    sx={{ flex: 1, minWidth: '120px' }}
                                                />
                                                <TextField
                                                    size="small"
                                                    label="Last Name"
                                                    value={editPassengerLastName}
                                                    onChange={(e) => setEditPassengerLastName(e.target.value)}
                                                    sx={{ flex: 1, minWidth: '120px' }}
                                                />
                                            </Box>
                                        ) : (
                                            <>
                                                <Typography variant="body1" sx={{ fontWeight: 500, flex: 1 }}>
                                                    {passenger.first_name} {passenger.last_name}
                                                </Typography>
                                                {!isFlightVoucher && (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleEditPassengerClick(passenger)}
                                                        sx={{ color: '#3274b4' }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </>
                                        )}
                                    </Box>

                                    {/* Phone (only for first passenger) */}
                                    {index === 0 && (bookingData.phone || passenger.phone) && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                            Phone: {bookingData.phone || passenger.phone}
                                        </Typography>
                                    )}

                                    {/* Weight Section */}
                                    <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {isEditing ? (
                                            <TextField
                                                size="small"
                                                label="Weight (kg)"
                                                value={editPassengerWeight}
                                                onChange={(e) => setEditPassengerWeight(e.target.value.replace(/[^0-9.]/g, ''))}
                                                sx={{ width: '150px' }}
                                                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                            />
                                        ) : (
                                            <>
                                                {passenger.weight && (
                                                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                                                        Weight: {passenger.weight} kg
                                                    </Typography>
                                                )}
                                            </>
                                        )}
                                    </Box>

                                    {/* Email (only for first passenger) */}
                                    {index === 0 && passenger.email && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                            Email: {passenger.email}
                                        </Typography>
                                    )}

                                    {/* Edit Action Buttons */}
                                    {isEditing && (
                                        <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                            <Button
                                                size="small"
                                                variant="contained"
                                                color="primary"
                                                startIcon={<SaveIcon />}
                                                onClick={() => handleSavePassengerEdit(passenger)}
                                                disabled={savingPassengerEdit}
                                            >
                                                Save
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<CancelIcon />}
                                                onClick={handleCancelPassengerEdit}
                                                disabled={savingPassengerEdit}
                                            >
                                                Cancel
                                            </Button>
                                        </Box>
                                    )}
                                </Box>
                            );
                        })}
                    </Paper>
                )}

                {/* Customer Portal Content Sections */}
                {portalContents.length > 0 && portalContents.map((content, index) => (
                    <Paper
                        key={content.id}
                        elevation={2}
                        sx={{ p: 3, mb: 3, scrollMarginTop: '100px' }}
                    >
                        {content.header && (
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                                {content.header}
                            </Typography>
                        )}
                        {content.body && (
                            <Box
                                sx={{
                                    color: 'text.secondary',
                                    '& p': { mb: 1.5 },
                                    '& ul, & ol': { pl: 2, mb: 1.5 },
                                    '& li': { mb: 0.5 }
                                }}
                                dangerouslySetInnerHTML={{ __html: content.body }}
                            />
                        )}
                    </Paper>
                ))}
            </Container>

            {/* Reschedule Flight Modal */}
            <RescheduleFlightModal
                open={rescheduleModalOpen}
                onClose={() => setRescheduleModalOpen(false)}
                bookingData={bookingData}
                onRescheduleSuccess={(updatedData) => {
                    setBookingData(updatedData);
                    setRescheduleModalOpen(false);
                }}
            />

            {/* Change Flight Location Modal */}
            <Dialog
                open={changeLocationModalOpen}
                onClose={() => {
                    setChangeLocationModalOpen(false);
                    setSelectedNewLocation('');
                    setSelectedDate(null);
                    setSelectedTime(null);
                    setLocationAvailabilities([]);
                    setSelectedActivityId(null);
                    setError(null);
                }}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        maxHeight: '90vh'
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 700, fontSize: 20, pb: 1.5 }}>
                    Change Flight Location
                </DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    {!selectedNewLocation ? (
                        <>
                            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
                                Select a new location for your flight. After selecting a location, you'll be able to choose an available date and time.
                            </Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {availableLocations.filter(location => location !== 'Bristol Fiesta').map((location) => (
                                    <Button
                                        key={location}
                                        variant={selectedNewLocation === location ? 'contained' : 'outlined'}
                                        onClick={async () => {
                                            setSelectedNewLocation(location);
                                            setSelectedDate(null);
                                            setSelectedTime(null);
                                            setLoadingAvailabilities(true);

                                            try {
                                                // Find activity for the selected location
                                                const activitiesResponse = await axios.get('/api/activities');
                                                if (activitiesResponse.data?.success) {
                                                    const activities = Array.isArray(activitiesResponse.data.data) ? activitiesResponse.data.data : [];
                                                    const activityForLocation = activities.find(a => a.location === location && a.status === 'Live');

                                                    if (activityForLocation) {
                                                        setSelectedActivityId(activityForLocation.id);

                                                        // Fetch availabilities for this location
                                                        const availResponse = await axios.get(`/api/activity/${activityForLocation.id}/availabilities`);
                                                        if (availResponse.data?.success) {
                                                            const data = Array.isArray(availResponse.data.data) ? availResponse.data.data : [];

                                                            // Filter based on voucher type and flight type
                                                            const bookingFlightType = bookingData?.flight_type || bookingData?.experience || 'Shared Flight';
                                                            const bookingVoucherType = bookingData?.voucher_type || bookingData?.voucher_type_detail || 'Any Day Flight';

                                                            // Normalize flight type
                                                            const normalizedFlightType = bookingFlightType.toLowerCase().includes('private') ? 'private' : 'shared';

                                                            // Helper function to check if a date is a weekday (Monday-Friday)
                                                            const isWeekday = (date) => {
                                                                const day = date.getDay();
                                                                return day >= 1 && day <= 5; // Monday = 1, Friday = 5
                                                            };

                                                            // Helper function to check if a time is morning (typically before 12:00 PM)
                                                            const isMorning = (time) => {
                                                                if (!time) return false;
                                                                // Parse time string (format: "HH:mm" or "HH:mm:ss")
                                                                const timeParts = time.split(':');
                                                                const hour = parseInt(timeParts[0], 10);
                                                                return hour < 12; // Morning is before 12:00 PM
                                                            };

                                                            // Filter availabilities
                                                            const filtered = data.filter(slot => {
                                                                const status = slot.status || slot.calculated_status || '';
                                                                const available = Number(slot.available) || Number(slot.calculated_available) || 0;
                                                                const slotDateTime = dayjs(`${slot.date} ${slot.time}`);

                                                                // Check if slot is in the future
                                                                if (!slotDateTime.isAfter(dayjs())) return false;

                                                                // Check status and availability
                                                                if (status.toLowerCase() !== 'open' && available <= 0) return false;

                                                                // Filter by flight type if specified
                                                                if (slot.flight_types && slot.flight_types.toLowerCase() !== 'all') {
                                                                    const slotTypes = slot.flight_types.split(',').map(t => t.trim().toLowerCase());
                                                                    if (!slotTypes.includes(normalizedFlightType)) return false;
                                                                }

                                                                // Apply voucher type filtering
                                                                const voucherTypeLower = (bookingVoucherType || '').toLowerCase();
                                                                if (voucherTypeLower && !voucherTypeLower.includes('any day') && !voucherTypeLower.includes('anytime')) {
                                                                    // Parse slot date
                                                                    let slotDate = null;
                                                                    if (slot.date) {
                                                                        try {
                                                                            if (typeof slot.date === 'string') {
                                                                                const datePart = slot.date.split(' ')[0];
                                                                                slotDate = new Date(datePart + 'T00:00:00');
                                                                            } else {
                                                                                slotDate = new Date(slot.date);
                                                                            }
                                                                            if (isNaN(slotDate.getTime())) return true; // Invalid date, don't filter
                                                                        } catch (e) {
                                                                            return true; // Error parsing, don't filter
                                                                        }
                                                                    }
                                                                    
                                                                    if (slotDate) {
                                                                        // Weekday Morning voucher → Show weekday mornings only
                                                                        if (voucherTypeLower.includes('weekday morning')) {
                                                                            if (!isWeekday(slotDate) || !isMorning(slot.time)) return false;
                                                                        }
                                                                        // Flexible Weekday voucher → Show all weekdays (any time)
                                                                        else if (voucherTypeLower.includes('flexible weekday')) {
                                                                            if (!isWeekday(slotDate)) return false;
                                                                        }
                                                                        // Anytime voucher → Show all available schedules (no additional filtering)
                                                                    }
                                                                }

                                                                return true;
                                                            });

                                                            setLocationAvailabilities(filtered);
                                                        }
                                                    }
                                                }
                                            } catch (err) {
                                                console.error('Error loading availabilities:', err);
                                                setError('Could not fetch availabilities. Please try again later.');
                                            } finally {
                                                setLoadingAvailabilities(false);
                                            }
                                        }}
                                        sx={{
                                            py: 1.5,
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            textTransform: 'none',
                                            borderRadius: 2,
                                            justifyContent: 'flex-start',
                                            backgroundColor: selectedNewLocation === location ? 'primary.main' : 'transparent',
                                            color: selectedNewLocation === location ? 'white' : 'primary.main',
                                            borderWidth: 2,
                                            '&:hover': {
                                                borderWidth: 2,
                                                backgroundColor: selectedNewLocation === location ? 'primary.dark' : 'primary.light',
                                                color: selectedNewLocation === location ? 'white' : 'primary.dark'
                                            }
                                        }}
                                    >
                                        {location}
                                    </Button>
                                ))}
                            </Box>
                        </>
                    ) : (
                        <>
                            {/* Selected Location Display */}
                            <Box sx={{ mb: 3, p: 2, backgroundColor: '#f0f9ff', borderRadius: 2, border: '1px solid #0ea5e9' }}>
                                <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                                    Selected Location
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#0ea5e9' }}>
                                    {selectedNewLocation}
                                </Typography>
                                <Button
                                    size="small"
                                    onClick={() => {
                                        setSelectedNewLocation('');
                                        setSelectedDate(null);
                                        setSelectedTime(null);
                                        setLocationAvailabilities([]);
                                        setSelectedActivityId(null);
                                    }}
                                    sx={{ mt: 1, textTransform: 'none' }}
                                >
                                    Change Location
                                </Button>
                            </Box>

                            {loadingAvailabilities ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <>
                                    {/* Calendar */}
                                    <Box sx={{ mb: 3, maxWidth: '500px', mx: 'auto' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                            <IconButton
                                                onClick={() => setCurrentMonth(prev => prev.subtract(1, 'month'))}
                                                size="small"
                                            >
                                                <ChevronLeftIcon />
                                            </IconButton>
                                            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16 }}>
                                                {currentMonth.format('MMMM YYYY')}
                                            </Typography>
                                            <IconButton
                                                onClick={() => setCurrentMonth(prev => prev.add(1, 'month'))}
                                                size="small"
                                            >
                                                <ChevronRightIcon />
                                            </IconButton>
                                        </Box>

                                        {/* Calendar Grid */}
                                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', mb: 1 }}>
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                                <div
                                                    key={day}
                                                    style={{
                                                        textAlign: 'center',
                                                        fontWeight: 700,
                                                        color: '#64748b',
                                                        fontSize: 11
                                                    }}
                                                >
                                                    {day}
                                                </div>
                                            ))}
                                        </Box>

                                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                                            {(() => {
                                                const cells = [];
                                                const startOfMonth = currentMonth.startOf('month');
                                                const endOfMonth = currentMonth.endOf('month');

                                                const firstDayIndex = (startOfMonth.day() + 6) % 7; // Monday = 0
                                                const lastDayIndex = (endOfMonth.day() + 6) % 7;
                                                const daysBack = firstDayIndex;
                                                const daysForward = 6 - lastDayIndex;

                                                const firstCellDate = startOfMonth.subtract(daysBack, 'day');
                                                const totalCells = startOfMonth.daysInMonth() + daysBack + daysForward;

                                                for (let i = 0; i < totalCells; i++) {
                                                    const d = firstCellDate.add(i, 'day');
                                                    const inCurrentMonth = d.isSame(currentMonth, 'month');
                                                    const isPast = d.isBefore(dayjs(), 'day');
                                                    const isSelected = selectedDate && dayjs(selectedDate).isSame(d, 'day');

                                                    const dateStr = d.format('YYYY-MM-DD');
                                                    const slots = locationAvailabilities.filter(a => {
                                                        if (!a.date) return false;
                                                        const slotDate = a.date.includes('T') ? a.date.split('T')[0] : a.date;
                                                        return slotDate === dateStr;
                                                    });
                                                    const totalAvailable = slots.reduce((acc, s) => acc + (Number(s.available) || Number(s.calculated_available) || 0), 0);
                                                    const soldOut = slots.length > 0 && totalAvailable <= 0;
                                                    
                                                    // Apply voucher type filtering for calendar display
                                                    const bookingVoucherType = bookingData?.voucher_type || bookingData?.voucher_type_detail || 'Any Day Flight';
                                                    const voucherTypeLower = (bookingVoucherType || '').toLowerCase();
                                                    
                                                    // Helper function to check if a date is a weekday (Monday-Friday)
                                                    const isWeekday = (date) => {
                                                        const day = date.getDay();
                                                        return day >= 1 && day <= 5; // Monday = 1, Friday = 5
                                                    };
                                                    
                                                    // Helper function to check if a time is morning (typically before 12:00 PM)
                                                    const isMorning = (time) => {
                                                        if (!time) return false;
                                                        const timeParts = time.split(':');
                                                        const hour = parseInt(timeParts[0], 10);
                                                        return hour < 12; // Morning is before 12:00 PM
                                                    };
                                                    
                                                    let shouldShowDate = true;
                                                    if (voucherTypeLower && !voucherTypeLower.includes('any day') && !voucherTypeLower.includes('anytime') && slots.length > 0) {
                                                        const dateObj = d.toDate();
                                                        
                                                        // Weekday Morning voucher → Show weekday mornings only
                                                        if (voucherTypeLower.includes('weekday morning')) {
                                                            const isWeekdayDate = isWeekday(dateObj);
                                                            if (isWeekdayDate) {
                                                                const hasMorningSlots = slots.some(slot => isMorning(slot.time));
                                                                shouldShowDate = hasMorningSlots;
                                                            } else {
                                                                shouldShowDate = false;
                                                            }
                                                        }
                                                        // Flexible Weekday voucher → Show all weekdays (any time)
                                                        else if (voucherTypeLower.includes('flexible weekday')) {
                                                            shouldShowDate = isWeekday(dateObj);
                                                        }
                                                        // Anytime voucher → Show all available schedules (no filtering)
                                                    }
                                                    
                                                    const isSelectable = inCurrentMonth && !isPast && shouldShowDate && slots.length > 0 && !soldOut;

                                                    cells.push(
                                                        <div
                                                            key={d.format('YYYY-MM-DD')}
                                                            onClick={() => {
                                                                if (isSelectable) {
                                                                    setSelectedDate(d.toDate());
                                                                    setSelectedTime(null);
                                                                }
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (isSelectable) {
                                                                    e.target.style.transform = 'scale(1.05)';
                                                                    e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                if (isSelectable) {
                                                                    e.target.style.transform = 'scale(1)';
                                                                    e.target.style.boxShadow = 'none';
                                                                }
                                                            }}
                                                            style={{
                                                                aspectRatio: '1 / 1',
                                                                borderRadius: 10,
                                                                background: isSelected
                                                                    ? '#56C1FF'
                                                                    : isPast
                                                                        ? '#f0f0f0'
                                                                        : soldOut
                                                                            ? '#888'
                                                                            : '#22c55e',
                                                                color: isSelected
                                                                    ? '#fff'
                                                                    : isPast
                                                                        ? '#999'
                                                                        : soldOut
                                                                            ? '#fff'
                                                                            : '#fff',
                                                                display: 'flex',
                                                                opacity: !inCurrentMonth ? 0 : (isSelectable ? 1 : 0.6),
                                                                pointerEvents: inCurrentMonth && isSelectable ? 'auto' : 'none',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontWeight: 700,
                                                                cursor: isSelectable ? 'pointer' : 'default',
                                                                userSelect: 'none',
                                                                fontSize: 12,
                                                                zIndex: 1,
                                                                position: 'relative',
                                                                transition: 'all 0.2s ease',
                                                                minHeight: '40px',
                                                                padding: '4px'
                                                            }}
                                                        >
                                                            <div style={{ fontSize: 13, lineHeight: 1.2 }}>{d.date()}</div>
                                                            <div style={{ fontSize: 9, fontWeight: 600, lineHeight: 1.2 }}>
                                                                {slots.length === 0 ? '' : (soldOut ? 'Sold Out' : `${totalAvailable} Spaces`)}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return cells;
                                            })()}
                                        </Box>
                                    </Box>

                                    {/* Time Selection */}
                                    {selectedDate && (
                                        <Box sx={{ mt: 0 }}>
                                            <Typography variant="h6" sx={{ mb: 1.5, fontSize: 18, fontWeight: 600 }}>
                                                Select Time for {dayjs(selectedDate).format('DD MMMM YYYY')}
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                                                {(() => {
                                                    const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
                                                    let times = locationAvailabilities.filter(a => {
                                                        if (!a.date) return false;
                                                        const slotDate = a.date.includes('T') ? a.date.split('T')[0] : a.date;
                                                        return slotDate === dateStr;
                                                    });
                                                    
                                                    // Apply voucher type filtering for time selection
                                                    const bookingVoucherType = bookingData?.voucher_type || bookingData?.voucher_type_detail || 'Any Day Flight';
                                                    const voucherTypeLower = (bookingVoucherType || '').toLowerCase();
                                                    
                                                    // Helper function to check if a time is morning (typically before 12:00 PM)
                                                    const isMorning = (time) => {
                                                        if (!time) return false;
                                                        const timeParts = time.split(':');
                                                        const hour = parseInt(timeParts[0], 10);
                                                        return hour < 12; // Morning is before 12:00 PM
                                                    };
                                                    
                                                    // Weekday Morning voucher → Show only morning times
                                                    if (voucherTypeLower.includes('weekday morning')) {
                                                        times = times.filter(slot => isMorning(slot.time));
                                                    }
                                                    // Flexible Weekday and Anytime → Show all times (no additional filtering)
                                                    
                                                    times = times.sort((a, b) => a.time.localeCompare(b.time));

                                                    if (times.length === 0) {
                                                        return (
                                                            <Box sx={{ p: 2, textAlign: 'center', width: '100%' }}>
                                                                <Typography color="text.secondary" sx={{ fontSize: 16, fontWeight: 500 }}>
                                                                    No available times for this date
                                                                </Typography>
                                                            </Box>
                                                        );
                                                    }

                                                    return times.map(slot => {
                                                        const isAvailable = (Number(slot.available) || Number(slot.calculated_available) || 0) > 0;
                                                        const isSelected = selectedTime === slot.time;
                                                        const slotDateTime = dayjs(`${dayjs(selectedDate).format('YYYY-MM-DD')} ${slot.time}`);
                                                        const isPastTime = slotDateTime.isBefore(dayjs());
                                                        const isDisabled = !isAvailable || isPastTime;

                                                        return (
                                                            <Button
                                                                key={slot.id}
                                                                variant="outlined"
                                                                disabled={isDisabled}
                                                                onClick={() => !isDisabled && setSelectedTime(slot.time)}
                                                                sx={{
                                                                    opacity: isDisabled ? 0.5 : 1,
                                                                    backgroundColor: isDisabled
                                                                        ? '#f5f5f5'
                                                                        : isSelected
                                                                            ? '#56C1FF'
                                                                            : '#22c55e',
                                                                    color: isDisabled
                                                                        ? '#999'
                                                                        : isSelected
                                                                            ? '#fff'
                                                                            : '#fff',
                                                                    borderColor: isDisabled
                                                                        ? '#ddd'
                                                                        : isSelected
                                                                            ? '#56C1FF'
                                                                            : '#22c55e',
                                                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                                    fontSize: 16,
                                                                    fontWeight: 600,
                                                                    padding: '12px 20px',
                                                                    minWidth: '140px',
                                                                    height: '50px',
                                                                    '&:hover': {
                                                                        backgroundColor: isDisabled
                                                                            ? '#f5f5f5'
                                                                            : isSelected
                                                                                ? '#4AB5FF'
                                                                                : '#16a34a',
                                                                        borderColor: isDisabled
                                                                            ? '#ddd'
                                                                            : isSelected
                                                                                ? '#4AB5FF'
                                                                                : '#16a34a'
                                                                    }
                                                                }}
                                                            >
                                                                {slot.time} ({slot.available || slot.calculated_available || 0}/{slot.capacity})
                                                            </Button>
                                                        );
                                                    });
                                                })()}
                                            </Box>
                                            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#22c55e' }}>
                                                <Typography variant="body2" sx={{ fontSize: 14 }}>
                                                    ✓ Times are set according to sunrise and sunset.
                                                </Typography>
                                            </Box>
                                        </Box>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 2, justifyContent: 'flex-end' }}>
                    <Button
                        onClick={() => {
                            setChangeLocationModalOpen(false);
                            setSelectedNewLocation('');
                            setSelectedDate(null);
                            setSelectedTime(null);
                            setLocationAvailabilities([]);
                            setSelectedActivityId(null);
                            setError(null);
                        }}
                        disabled={changingLocation}
                    >
                        Cancel
                    </Button>
                    {selectedNewLocation && selectedDate && selectedTime && (
                        <Button
                            onClick={async () => {
                                if (!selectedNewLocation || !selectedDate || !selectedTime) {
                                    return;
                                }

                                if (!selectedActivityId) {
                                    setError('Activity ID not found for selected location. Please try selecting the location again.');
                                    return;
                                }

                                setChangingLocation(true);
                                setError(null);
                                try {
                                    const formattedDate = dayjs(selectedDate).format('YYYY-MM-DD');
                                    const selectedDateTime = `${formattedDate} ${selectedTime}`;

                                    const response = await axios.patch(`/api/customer-portal-change-location/${bookingData.id}`, {
                                        location: selectedNewLocation,
                                        flight_date: selectedDateTime,
                                        activity_id: selectedActivityId
                                    });

                                    if (response.data.success) {
                                        setBookingData(response.data.data);
                                        setChangeLocationModalOpen(false);
                                        setSelectedNewLocation('');
                                        setSelectedDate(null);
                                        setSelectedTime(null);
                                        setLocationAvailabilities([]);
                                    } else {
                                        setError(response.data.message || 'Failed to change location. Please try again.');
                                    }
                                } catch (err) {
                                    console.error('Error changing location:', err);
                                    setError(err.response?.data?.message || 'Failed to change location. Please try again later.');
                                } finally {
                                    setChangingLocation(false);
                                }
                            }}
                            disabled={changingLocation}
                            variant="contained"
                            sx={{
                                backgroundColor: '#22c55e',
                                '&:hover': {
                                    backgroundColor: '#16a34a'
                                },
                                fontWeight: 600
                            }}
                        >
                            {changingLocation ? <CircularProgress size={20} /> : 'Confirm'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Cancel Flight Confirmation Dialog */}
            <Dialog
                open={cancelFlightDialogOpen}
                onClose={() => setCancelFlightDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 700, fontSize: 20, pb: 1.5, color: '#ef4444' }}>
                    Cancel Flight
                </DialogTitle>
                <DialogContent />
                <DialogActions sx={{ p: 3, pt: 2, justifyContent: 'flex-end' }}>
                    <Button
                        onClick={() => setCancelFlightDialogOpen(false)}
                        disabled={cancellingFlight}
                    >
                        Keep Booking
                    </Button>
                    <Button
                        onClick={async () => {
                            if (!bookingData?.id) {
                                setError('Booking ID not found');
                                return;
                            }

                            setCancellingFlight(true);
                            setError(null);
                            try {
                                // Update status to Cancelled (skip incrementing flight attempts)
                                await axios.patch('/api/updateBookingField', {
                                    booking_id: bookingData.id,
                                    field: 'status',
                                    value: 'Cancelled',
                                    skip_flight_attempt_increment: true
                                });

                                // Refresh booking data
                                const token = encodeURIComponent(tokenParam);
                                const response = await axios.get(`/api/customer-portal-booking/${token}`);

                                if (response.data.success) {
                                    setBookingData(response.data.data);
                                    setCancelFlightDialogOpen(false);
                                } else {
                                    setError('Failed to refresh booking data. Please reload the page.');
                                }
                            } catch (err) {
                                console.error('Error cancelling flight:', err);
                                setError(err.response?.data?.message || 'Failed to cancel flight. Please try again later.');
                            } finally {
                                setCancellingFlight(false);
                            }
                        }}
                        disabled={cancellingFlight}
                        variant="contained"
                        color="error"
                        sx={{
                            backgroundColor: '#ef4444',
                            '&:hover': {
                                backgroundColor: '#dc2626'
                            },
                            fontWeight: 600
                        }}
                    >
                        {cancellingFlight ? <CircularProgress size={20} color="inherit" /> : 'Yes, Cancel Flight'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default CustomerPortal;

