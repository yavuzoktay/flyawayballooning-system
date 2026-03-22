import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Container, Typography, Box, Paper, CircularProgress, Alert, Button, TextField, useMediaQuery, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import CustomerPortalHeader from '../components/CustomerPortal/CustomerPortalHeader';
import RescheduleFlightModal from '../components/CustomerPortal/RescheduleFlightModal';
import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SmsIcon from '@mui/icons-material/Sms';
import '../components/CustomerPortal/CustomerPortalHeader.css';
import CustomerPortalUpsellModal from '../components/CustomerPortal/CustomerPortalUpsellModal';

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

const normalizeInviteFriendsTitle = (title, availableSpaces) => {
    const numericSpaces = Number(availableSpaces);
    const formatTitle = (count) => `🎈 ${count} Space${count === 1 ? '' : 's'} Left on Your Flight`;

    if (Number.isFinite(numericSpaces) && numericSpaces > 0) {
        return formatTitle(numericSpaces);
    }

    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    if (!trimmedTitle) {
        return trimmedTitle;
    }

    const legacyTitleMatch = trimmedTitle.match(/^🎈?\s*Your balloon flight has\s+(\d+)\s+space(?:s)?\s+left$/i);
    if (legacyTitleMatch) {
        return formatTitle(Number(legacyTitleMatch[1]));
    }

    const currentTitleMatch = trimmedTitle.match(/^🎈?\s*(\d+)\s+space(?:s)?\s+left on your flight$/i);
    if (currentTitleMatch) {
        return formatTitle(Number(currentTitleMatch[1]));
    }

    return trimmedTitle;
};

const formatPounds = (value) => `£${Number(value || 0).toFixed(2)}`;

const getPrivateUpgradeDescription = (offer) =>
    `Your flight is eligible for a private upgrade. Enjoy your own private balloon for an additional ${formatPounds(offer?.totalCharge || 0)}.`;

const normalizeUpsellOfferTitle = (offer) => {
    if (!offer) {
        return '';
    }

    if (offer.mode === 'single_discount') {
        return '🎈Bring a Friend & Save';
    }

    if (offer.mode === 'private_upgrade') {
        return '🎈Make it Private';
    }

    if (offer.mode === 'season_saver_upgrade') {
        return '☘️ Upgrade to Standard Flexible Weekday';
    }

    return String(offer.title || '').trim();
};

const normalizeUpsellOfferButtonLabel = (offer) => {
    if (!offer) {
        return '';
    }

    if (offer.mode === 'private_upgrade') {
        return 'Upgrade';
    }

    if (offer.mode === 'single_discount') {
        return 'Add Passenger';
    }

    if (offer.mode === 'season_saver_upgrade') {
        return 'Upgrade';
    }

    return String(offer.buttonLabel || '').trim();
};

const normalizeUpsellOfferDescription = (offer) => {
    if (!offer) {
        return '';
    }

    if (offer.mode === 'single_discount') {
        return `Add another passenger to your flight for ${formatPounds(offer.discountedSeatPrice || offer.totalCharge)} and save ${formatPounds(offer.discountAmount)}.`;
    }

    if (offer.mode === 'private_upgrade') {
        return String(offer.description || getPrivateUpgradeDescription(offer)).trim();
    }

    if (offer.mode === 'season_saver_upgrade') {
        return `Upgrade your Season Saver voucher to a Standard Flexible Weekday for ${formatPounds(offer.totalCharge || 0)}.`;
    }

    return String(offer.description || '').trim();
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
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [isFullyRefunded, setIsFullyRefunded] = useState(false);
    const [upsellModalOpen, setUpsellModalOpen] = useState(false);
    const [submittingUpsell, setSubmittingUpsell] = useState(false);
    const [inviteFriendsExpanded, setInviteFriendsExpanded] = useState(false);
    const [inviteFriendsCopyMessage, setInviteFriendsCopyMessage] = useState('');

    // Responsive helpers
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('768'));
    const mobileHeaderOffset = 'calc(env(safe-area-inset-top, 0px) + 72px)';
    const portalContainerSx = {
        py: 4,
        pt: isMobile ? mobileHeaderOffset : 4
    };

    // Passenger edit states
    const [editingPassenger, setEditingPassenger] = useState(null);
    const [editPassengerFirstName, setEditPassengerFirstName] = useState('');
    const [editPassengerLastName, setEditPassengerLastName] = useState('');
    const [editPassengerWeight, setEditPassengerWeight] = useState('');
    const [savingPassengerEdit, setSavingPassengerEdit] = useState(false);

    // Extract token from URL - handle both /customerPortal/:token and /customerPortal/:token/index
    const token = tokenParam ? tokenParam.split('/')[0] : null;

    // Determine portal context:
    // - If the token decodes to an id starting with "voucher-", we are viewing the Voucher portal
    //   (even if that voucher was redeemed into a booking).
    // - Additionally allow forcing voucher view via URL param: ?view=voucher
    const forceVoucherView = (() => {
        try {
            if (typeof window !== 'undefined') {
                const qs = new URLSearchParams(window.location.search || '');
                if ((qs.get('view') || '').toLowerCase() === 'voucher') return true;
            }
        } catch {}
        try {
            if (!token || typeof window === 'undefined') return false;
            // token is base64; decode and check first part (idToUse)
            const decoded = window.atob(token.replace(/-/g, '+').replace(/_/g, '/'));
            const firstPart = String(decoded || '').split('|')[0] || '';
            return firstPart.startsWith('voucher-');
        } catch {
            return false;
        }
    })();
    const bookingVoucherRedeemed =
        bookingData?.is_voucher_redeemed === true || bookingData?.is_voucher_redeemed === 1;
    const bookingBookFlight = (bookingData?.book_flight || '').toString().trim().toLowerCase();
    const bookingVoucherType = (bookingData?.voucher_type || '').toString().trim().toLowerCase();
    const isFlightVoucherBase = Boolean(
        bookingData?.is_flight_voucher ||
        bookingBookFlight === 'flight voucher' ||
        bookingVoucherType === 'flight voucher'
    );
    const isFlightVoucherSection = Boolean(
        bookingData && isFlightVoucherBase && (!bookingVoucherRedeemed || forceVoucherView)
    );
    const inviteSectionPalette = {
        background: '#f4f5fb',
        border: '#e4e7f0',
        heading: '#5f6368',
        body: '#7b8088',
        link: '#35a8f3',
        linkHover: '#1d92df',
        buttonText: '#35a8f3',
        buttonBackground: '#ffffff',
        buttonBorder: '#bfe8ff',
        disabledBackground: '#eef1f5',
        disabledText: '#a1a8b3'
    };
    const actionGreenPalette = {
        background: '#22c55e',
        hover: '#16a34a',
        border: '#22c55e',
        disabledBackground: '#f3f4f6',
        disabledBorder: '#d1d5db',
        disabledText: '#9ca3af'
    };
    const pageTitleSx = {
        fontWeight: 600,
        color: inviteSectionPalette.heading
    };
    const primaryActionButtonSx = {
        py: 1.5,
        fontSize: '1rem',
        fontWeight: 600,
        textTransform: 'none',
        borderRadius: 2,
        border: '1px solid',
        borderColor: actionGreenPalette.border,
        boxShadow: 'none',
        backgroundColor: actionGreenPalette.background,
        color: '#fff',
        '&:hover': {
            boxShadow: 'none',
            backgroundColor: actionGreenPalette.hover,
            borderColor: actionGreenPalette.hover
        },
        '&.Mui-disabled': {
            backgroundColor: `${actionGreenPalette.disabledBackground} !important`,
            color: `${actionGreenPalette.disabledText} !important`,
            borderColor: `${actionGreenPalette.disabledBorder} !important`,
            boxShadow: 'none',
            opacity: 0.6,
            cursor: 'not-allowed'
        }
    };
    const mobileBookingDetailSx = (order, extraMobileSx = {}) => ({
        '@media (max-width:768px)': {
            order,
            ...extraMobileSx
        }
    });

    const fetchBookingData = async ({ silent = false, refreshPaymentHistory = true } = {}) => {
        if (!token) {
            if (!silent) {
                setError('Invalid token');
                setLoading(false);
            }
            return { success: false, error: new Error('Invalid token') };
        }

        try {
            if (!silent) {
                setLoading(true);
                setError(null);
            }
            // URL encode the token to handle special characters like =
            const encodedToken = encodeURIComponent(token);
            console.log('🔍 Customer Portal - Fetching booking data with token:', token);
            console.log('🔍 Customer Portal - Encoded token:', encodedToken);
            const response = await axios.get(buildApiUrl(`/api/customer-portal-booking/${encodedToken}`));

            console.log('✅ Customer Portal - Response received:', response.data);
            if (response.data.success) {
                const bookingDataResponse = response.data.data;
                setBookingData(bookingDataResponse);
                // Fetch payment history after booking data is loaded
                // Only fetch if we have a valid booking_id (not just voucher ID for Flight Voucher)
                // For Flight Voucher, payment history might not exist or might be linked differently
                // We'll still try to fetch, but the endpoint should handle Flight Voucher cases gracefully
                if (refreshPaymentHistory && bookingDataResponse?.id) {
                    // Pass bookingData to fetchPaymentHistory so it can check if it's a Flight Voucher
                    fetchPaymentHistory(bookingDataResponse.id, bookingDataResponse);
                } else if (!bookingDataResponse?.id) {
                    // If no booking ID, ensure isFullyRefunded is false
                    setIsFullyRefunded(false);
                }
                return { success: true, data: bookingDataResponse };
            } else {
                console.error('❌ Customer Portal - API returned error:', response.data);
                if (!silent) {
                    setError(response.data.message || 'Failed to load booking data');
                }
                return {
                    success: false,
                    error: new Error(response.data.message || 'Failed to load booking data')
                };
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
            if (!silent) {
                setError(errorMessage);
            }
            return { success: false, error: err };
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    const fetchPaymentHistory = async (bookingId, bookingDataParam = null) => {
        if (!bookingId) {
            // If no booking ID, ensure isFullyRefunded is false
            setIsFullyRefunded(false);
            return;
        }
        
        // Use passed bookingDataParam or fallback to state (state might not be updated yet)
        const currentBookingData = bookingDataParam || bookingData;
        
        // Check if this is a Flight Voucher
        const isFlightVoucher = currentBookingData?.is_flight_voucher || currentBookingData?.book_flight === 'Flight Voucher';
        
        // For Flight Voucher, we should NOT rely on payment_history table for refund status
        // Flight Voucher refund status should be determined by all_vouchers table (redeemed, paid fields)
        // Since we don't have direct access to all_vouchers in frontend, we'll assume NOT refunded
        // unless we have explicit payment history showing refunds
        if (isFlightVoucher) {
            console.log('[CustomerPortal] Flight Voucher detected, checking payment history with extra caution');
            // For Flight Voucher, only mark as refunded if we have explicit refund records
            // Otherwise, assume NOT refunded (safer default for Flight Vouchers)
            try {
                const voucherRef = currentBookingData?.voucher_ref || currentBookingData?.voucher_code;
                let paymentData = [];
                
                if (voucherRef) {
                    try {
                        // Try fetching payment history by voucher_ref
                        const voucherResponse = await axios.get(`/api/voucher-payment-history/${voucherRef}`);
                        if (voucherResponse.data?.success && voucherResponse.data?.data?.length > 0) {
                            paymentData = voucherResponse.data.data;
                            console.log('[CustomerPortal] Found payment history by voucher_ref:', voucherRef, paymentData.length, 'records');
                        }
                    } catch (voucherError) {
                        console.warn('[CustomerPortal] Error fetching voucher payment history:', voucherError);
                    }
                }
                
                // Also try booking_id as fallback
                if (paymentData.length === 0) {
                    try {
                        const bookingResponse = await axios.get(`/api/booking-payment-history/${bookingId}`);
                        paymentData = bookingResponse.data?.data || [];
                        console.log('[CustomerPortal] Fallback to booking payment history:', bookingId, paymentData.length, 'records');
                    } catch (bookingError) {
                        console.warn('[CustomerPortal] Error fetching booking payment history:', bookingError);
                    }
                }
                
                setPaymentHistory(paymentData);
                
                // For Flight Voucher, only mark as fully refunded if we have explicit refund records
                // AND the refunds are greater than or equal to payments
                let totalPayments = 0;
                let totalRefunds = 0;
                
                paymentData.forEach(payment => {
                    const amount = parseFloat(payment.amount || 0);
                    if (payment.payment_status === 'refunded' || amount < 0) {
                        totalRefunds += Math.abs(amount);
                    } else if (payment.payment_status === 'succeeded' && amount > 0) {
                        totalPayments += amount;
                    }
                });
                
                // For Flight Voucher: Check paid field from bookingData
                // If paid > 0 and no refunds in payment history, assume NOT refunded
                const paidAmount = parseFloat(currentBookingData?.paid || 0);
                
                // For Flight Voucher: Only mark as refunded if:
                // 1. We have payment data AND refunds >= payments, OR
                // 2. paid is 0 or null (indicating full refund)
                // If paid > 0 and no payment history or no refunds, assume NOT refunded
                let fullyRefunded = false;
                if (paymentData.length > 0 && totalPayments > 0) {
                    // We have payment history, check if refunds >= payments
                    fullyRefunded = totalRefunds >= totalPayments;
                } else if (paidAmount <= 0) {
                    // No payment history but paid is 0 or negative, might be refunded
                    // But this is less reliable, so we'll be conservative
                    fullyRefunded = false; // Don't assume refunded just because paid is 0
                } else {
                    // paid > 0 and no payment history or no refunds, definitely NOT refunded
                    fullyRefunded = false;
                }
                
                setIsFullyRefunded(fullyRefunded);
                
                console.log('[CustomerPortal] Flight Voucher payment history:', {
                    bookingId,
                    voucherRef,
                    paymentDataCount: paymentData.length,
                    totalPayments,
                    totalRefunds,
                    paidAmount,
                    fullyRefunded
                });
            } catch (error) {
                console.error('[CustomerPortal] Error fetching Flight Voucher payment history:', error);
                setPaymentHistory([]);
                // For Flight Voucher, if error occurs, assume NOT refunded (safer default)
                setIsFullyRefunded(false);
            }
            return;
        }
        
        // For regular bookings (non-Flight Voucher), use normal payment history check
        try {
            const response = await axios.get(`/api/booking-payment-history/${bookingId}`);
            const paymentData = response.data?.data || [];
            setPaymentHistory(paymentData);
            
            // Calculate total payments and total refunds
            let totalPayments = 0;
            let totalRefunds = 0;
            
            paymentData.forEach(payment => {
                const amount = parseFloat(payment.amount || 0);
                if (payment.payment_status === 'refunded' || amount < 0) {
                    // Refund (negative amount or refunded status)
                    totalRefunds += Math.abs(amount);
                } else if (payment.payment_status === 'succeeded' && amount > 0) {
                    // Payment (positive amount with succeeded status)
                    totalPayments += amount;
                }
            });
            
            // Check if fully refunded (total refunds >= total payments)
            // IMPORTANT: Only mark as fully refunded if we have actual payment data
            // If payment history is empty or has no payments, assume NOT refunded
            const fullyRefunded = paymentData.length > 0 && totalPayments > 0 && totalRefunds >= totalPayments;
            setIsFullyRefunded(fullyRefunded);
            
            console.log('[CustomerPortal] Payment history:', {
                bookingId,
                paymentDataCount: paymentData.length,
                totalPayments,
                totalRefunds,
                fullyRefunded
            });
        } catch (error) {
            console.error('[CustomerPortal] Error fetching payment history:', error);
            setPaymentHistory([]);
            // If error occurs, assume NOT refunded (safer default)
            setIsFullyRefunded(false);
        }
    };

    useEffect(() => {
        // Check for payment success from Stripe redirect
        const urlParams = new URLSearchParams(window.location.search);
        const paymentSuccess = urlParams.get('payment') === 'success';
        const paymentType = urlParams.get('type');
        const paymentSessionId = urlParams.get('session_id');
        
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
        } else if (paymentSuccess && paymentType === 'customer_portal_upsell') {
            handleCustomerPortalUpsellPaymentSuccess(paymentSessionId);
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

    const refreshBookingAfterPortalPayment = async (maxAttempts = 4) => {
        let lastError = null;

        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            if (attempt > 0) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
            }

            const result = await fetchBookingData();
            if (result?.success) {
                return result.data;
            }

            lastError = result?.error || new Error('Booking refresh failed');
        }

        if (lastError) {
            throw lastError;
        }
    };

    const waitForUpsellSessionProcessing = async (sessionId, maxAttempts = 6) => {
        if (!sessionId) {
            return false;
        }

        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            if (attempt > 0) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
            }

            try {
                const statusResponse = await axios.get(buildApiUrl('/api/session-status'), {
                    params: { session_id: sessionId }
                });

                if (statusResponse.data?.processed) {
                    return true;
                }
            } catch (statusError) {
                console.warn('Customer Portal - Could not poll upsell session status:', statusError);
            }
        }

        return false;
    };

    const handleSubmitUpsell = async (passengers) => {
        if (!bookingData?.upsell_offer || !token) {
            alert('This offer is no longer available. Please refresh the page and try again.');
            return;
        }

        setSubmittingUpsell(true);
        try {
            const sessionRes = await axios.post(buildApiUrl('/api/customer-portal-upsell/create-session'), {
                token,
                offerMode: bookingData.upsell_offer.mode,
                passengers
            });

            if (!sessionRes.data?.success) {
                alert(sessionRes.data?.message || 'Payment could not be initiated.');
                return;
            }

            if (sessionRes.data.sessionUrl) {
                setUpsellModalOpen(false);
                window.location.href = sessionRes.data.sessionUrl;
                return;
            }

            if (sessionRes.data.sessionId) {
                setUpsellModalOpen(false);
                window.location.href = `https://checkout.stripe.com/c/pay/${sessionRes.data.sessionId}`;
                return;
            }

            alert('Payment session could not be created. Please try again.');
        } catch (error) {
            console.error('Customer Portal - Error creating upsell session:', error);
            alert(error.response?.data?.message || 'Failed to initiate payment. Please try again later.');
        } finally {
            setSubmittingUpsell(false);
        }
    };

    const handleCustomerPortalUpsellPaymentSuccess = async (sessionId) => {
        const processedKey = sessionId ? `fab_customer_portal_upsell_${sessionId}` : null;
        const alreadyProcessed = processedKey && typeof window !== 'undefined'
            ? window.localStorage.getItem(processedKey) === '1'
            : false;

        try {
            if (sessionId && !alreadyProcessed) {
                let sessionProcessed = await waitForUpsellSessionProcessing(sessionId, 1);

                if (!sessionProcessed) {
                    try {
                        await axios.post(buildApiUrl('/api/createBookingFromSession'), {
                            session_id: sessionId,
                            type: 'customer_portal_upsell'
                        });
                    } catch (createError) {
                        if (createError.response?.status !== 202) {
                            throw createError;
                        }
                    }
                }

                if (!sessionProcessed) {
                    sessionProcessed = await waitForUpsellSessionProcessing(sessionId, 6);
                }

                if (!sessionProcessed) {
                    throw new Error('Your payment is still being processed. Please refresh the page in a moment.');
                }

                if (sessionProcessed && processedKey && typeof window !== 'undefined') {
                    window.localStorage.setItem(processedKey, '1');
                }
            }

            await refreshBookingAfterPortalPayment();
            alert('Payment successful! Your booking has been updated.');
        } catch (error) {
            console.error('Customer Portal - Error finalising upsell payment:', error);

            try {
                await refreshBookingAfterPortalPayment(2);
            } catch (refreshError) {
                console.warn('Customer Portal - Booking refresh failed after upsell:', refreshError);
            }

            alert(error.response?.data?.message || 'Payment was received, but we could not refresh your booking automatically. Please reload the page in a few moments.');
        } finally {
            if (typeof window !== 'undefined') {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    };

    const handleInviteFriendsAction = async (channel, inviteData) => {
        if (!inviteData?.enabled) {
            return;
        }

        try {
            if (channel === 'copy') {
                if (!navigator?.clipboard?.writeText) {
                    throw new Error('Clipboard is not available');
                }

                await navigator.clipboard.writeText(inviteData.bookingUrl || '');
                setInviteFriendsCopyMessage('Booking link copied.');
                return;
            }

            const shareUrl = inviteData?.shareLinks?.[channel];
            if (!shareUrl) {
                return;
            }

            if (channel === 'email' || channel === 'sms') {
                window.location.href = shareUrl;
                return;
            }

            window.open(shareUrl, '_blank', 'noopener,noreferrer');
        } catch (error) {
            console.error('Customer Portal - Invite Friends action failed:', error);
            alert('We could not complete that share action. Please try again.');
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

    useEffect(() => {
        if (!token || !bookingData?.invite_friends?.visible) {
            return undefined;
        }

        const pollId = window.setInterval(() => {
            fetchBookingData({ silent: true, refreshPaymentHistory: false });
        }, 45000);

        return () => window.clearInterval(pollId);
    }, [token, bookingData?.id, bookingData?.invite_friends?.visible]);

    const hasScheduledFlightDate = Boolean(
        bookingData?.status &&
        String(bookingData.status).toLowerCase() !== 'cancelled' &&
        bookingData?.flight_date
    );
    const inviteFriendsEnabled = Boolean(bookingData?.invite_friends?.enabled && hasScheduledFlightDate);

    useEffect(() => {
        if (!inviteFriendsEnabled && inviteFriendsExpanded) {
            setInviteFriendsExpanded(false);
            setInviteFriendsCopyMessage('');
        }
    }, [inviteFriendsEnabled, inviteFriendsExpanded]);

    if (loading) {
        return (
            <>
                <CustomerPortalHeader />
                <Container maxWidth="md" sx={{ ...portalContainerSx, textAlign: 'center' }}>
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
                <Container maxWidth="md" sx={portalContainerSx}>
                    <Alert severity="error">{error}</Alert>
                </Container>
            </>
        );
    }

    if (!bookingData) {
        return (
            <>
                <CustomerPortalHeader />
                <Container maxWidth="md" sx={portalContainerSx}>
                    <Alert severity="info">No booking data found.</Alert>
                </Container>
            </>
        );
    }

    const inviteFriendsTitle = normalizeInviteFriendsTitle(
        bookingData?.invite_friends?.title,
        bookingData?.invite_friends?.availableSpaces
    );
    const upsellOffer = bookingData?.upsell_offer || null;
    const isPrivateUpgradeOffer = upsellOffer?.mode === 'private_upgrade';
    const isSeasonSaverUpgradeOffer = upsellOffer?.mode === 'season_saver_upgrade';
    const upsellOfferTitle = normalizeUpsellOfferTitle(upsellOffer);
    const upsellOfferButtonLabel = normalizeUpsellOfferButtonLabel(upsellOffer);
    const upsellOfferDescription = normalizeUpsellOfferDescription(upsellOffer);
    const baseInviteFriendsDescription = bookingData?.invite_friends?.description === 'Share a ready-made invite so your friends can join the same shared balloon flight.'
        ? 'Share an invite and give your friends 10% off their balloon flight.'
        : bookingData?.invite_friends?.description;
    const inviteFriendsDescription = hasScheduledFlightDate
        ? baseInviteFriendsDescription
        : 'Invite Friends becomes available once your shared flight has been scheduled.';
    const inviteFriendsActions = [
        {
            channel: 'whatsapp',
            label: 'WhatsApp',
            icon: <WhatsAppIcon fontSize="small" />
        },
        {
            channel: 'sms',
            label: 'SMS',
            icon: <SmsIcon fontSize="small" />
        }
    ];
    const shouldInlineFlightAttemptMessage = Boolean(
        bookingData?.flight_attempt_notification?.visible &&
        !isFlightVoucherSection &&
        !isFullyRefunded
    );
    const shouldHideInviteFriends = ['single_discount', 'private_upgrade', 'season_saver_upgrade'].includes(upsellOffer?.mode);
    const shouldShowInviteFriends = Boolean(
        bookingData?.invite_friends?.visible &&
        bookingData?.invite_friends?.availableSpaces !== 0 &&
        !shouldHideInviteFriends &&
        !isFullyRefunded &&
        hasScheduledFlightDate
    );

    return (
            <>
            <CustomerPortalHeader />
            <Container maxWidth="lg" sx={portalContainerSx}>
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
                        <Typography variant="h5" component="h2" sx={{ ...pageTitleSx, mb: 1 }}>
                            Welcome, {bookingData.name ? bookingData.name.split(' ')[0] : 'Guest'}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            We look forward to flying you.
                        </Typography>
                    </Box>
                </Box>

                <Paper id="scroll-target-booking" elevation={2} sx={{ p: 3, mb: 3, scrollMarginTop: '100px' }}>
                    <Typography variant="h5" sx={{ ...pageTitleSx, mb: 3 }}>
                        {(() => {
                            const bookFlight = (bookingData.book_flight || '').toString().trim().toLowerCase();
                            const voucherType = (bookingData.voucher_type || '').toString().trim().toLowerCase();
                            const isVoucherRedeemed =
                                bookingData.is_voucher_redeemed === true || bookingData.is_voucher_redeemed === 1;
                            const isFlightVoucherBase =
                                bookingData.is_flight_voucher ||
                                bookFlight === 'flight voucher' ||
                                voucherType === 'flight voucher';
                            // If voucher has been redeemed into a booking, show standard "Your Booking" portal
                            const isFlightVoucherSection = isFlightVoucherBase && (!isVoucherRedeemed || forceVoucherView);
                            return isFlightVoucherSection ? 'Your Flight Voucher' : 'Your Booking';
                        })()}
                    </Typography>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            columnGap: 2,
                            rowGap: isMobile ? 1.5 : 2,
                            '& > *': {
                                minWidth: 0
                            }
                        }}
                    >
                        <Box sx={mobileBookingDetailSx(1)}>
                            <Typography variant="body2" color="text.secondary">
                                {(() => {
                                    const bookFlight = (bookingData.book_flight || '').toString().trim().toLowerCase();
                                    const voucherType = (bookingData.voucher_type || '').toString().trim().toLowerCase();
                                    const isVoucherRedeemed =
                                        bookingData.is_voucher_redeemed === true || bookingData.is_voucher_redeemed === 1;
                                    const isFlightVoucherBase =
                                        bookingData.is_flight_voucher ||
                                        bookFlight === 'flight voucher' ||
                                        voucherType === 'flight voucher';
                                    const isFlightVoucherSection = isFlightVoucherBase && (!isVoucherRedeemed || forceVoucherView);
                                    
                                    // Flight Voucher view: show "Voucher Reference"
                                    if (isFlightVoucherSection) {
                                        return 'Voucher Reference';
                                    }
                                    // Regular booking view: show "Booking ID"
                                    return 'Booking ID';
                                })()}
                            </Typography>
                            {(() => {
                                const bookFlight = (bookingData.book_flight || '').toString().trim().toLowerCase();
                                const voucherType = (bookingData.voucher_type || '').toString().trim().toLowerCase();
                                const isVoucherRedeemed =
                                    bookingData.is_voucher_redeemed === true || bookingData.is_voucher_redeemed === 1;
                                const isFlightVoucherBase =
                                    bookingData.is_flight_voucher ||
                                    bookFlight === 'flight voucher' ||
                                    voucherType === 'flight voucher';
                                const isFlightVoucherSection = isFlightVoucherBase && (!isVoucherRedeemed || forceVoucherView);

                                if (isFlightVoucherSection) {
                                    // Only show voucher reference value under "Voucher Reference"
                                    return (
                                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                                            {bookingData.voucher_ref || bookingData.booking_reference || bookingData.id || 'N/A'}
                                        </Typography>
                                    );
                                }

                                // Regular bookings: show booking reference under "Booking ID"
                                return (
                                    <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                                        {bookingData.booking_reference || bookingData.id || 'N/A'}
                                    </Typography>
                                );
                            })()}
                        </Box>
                        <Box sx={mobileBookingDetailSx(2)}>
                            <Typography variant="body2" color="text.secondary">Status</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                                {bookingData.status || 'Open'}
                            </Typography>
                        </Box>
                        <Box sx={mobileBookingDetailSx(3)}>
                            <Typography variant="body2" color="text.secondary">Flight Date</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                                {(() => {
                                    if (bookingData.status && bookingData.status.toLowerCase() === 'cancelled') {
                                        return 'Not Scheduled';
                                    }
                                    if (bookingData.flight_date) {
                                        try {
                                            // Try to parse and format the flight_date
                                            const flightDate = dayjs(bookingData.flight_date);
                                            if (flightDate.isValid()) {
                                                return flightDate.format('DD/MM/YYYY HH:mm');
                                            } else {
                                                // If dayjs can't parse, try to format the string directly
                                                console.warn('⚠️ Customer Portal - Invalid flight_date format:', bookingData.flight_date);
                                                return String(bookingData.flight_date);
                                            }
                                        } catch (e) {
                                            console.error('⚠️ Customer Portal - Error formatting flight_date:', e, bookingData.flight_date);
                                            return String(bookingData.flight_date || 'Not Scheduled');
                                        }
                                    }
                                    return 'Not Scheduled';
                                })()}
                            </Typography>
                        </Box>
                        <Box sx={mobileBookingDetailSx(4)}>
                            <Typography variant="body2" color="text.secondary">Location</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {bookingData.location
                                        ? bookingData.location
                                        : (bookingData.is_flight_voucher ? 'Not Scheduled' : 'TBD')}
                                </Typography>
                                {(() => {
                                    const hasFlightDate = Boolean(bookingData.flight_date);
                                    const flightDate = hasFlightDate ? dayjs(bookingData.flight_date) : null;
                                    const now = dayjs();
                                    const isCancelled = bookingData.status && String(bookingData.status).toLowerCase() === 'cancelled';
                                    const isFlightDatePassed = flightDate ? flightDate.isBefore(now, 'day') : false;
                                    
                                    // When cancelled, allow location changes because there is no active flight slot anymore.
                                    const hoursUntilFlight = flightDate ? flightDate.diff(now, 'hour') : 999999;
                                    
                                    // Check if expiry date has passed (compare by day to avoid time-of-day edge cases)
                                    const expiryDate = bookingData.expires ? dayjs(bookingData.expires) : null;
                                    const isExpired = expiryDate ? expiryDate.isBefore(now, 'day') : false;
                                    
                                    const isVoucherRedeemed = bookingData.is_voucher_redeemed === true || bookingData.is_voucher_redeemed === 1;
                                    // Only apply redeemed check for Flight Voucher section (not yet redeemed)
                                    const bookFlight = (bookingData.book_flight || '').toString().trim().toLowerCase();
                                    const isFlightVoucherBase = bookingData.is_flight_voucher || bookFlight === 'flight voucher';
                                    const isFlightVoucherSection = isFlightVoucherBase && (!isVoucherRedeemed || forceVoucherView);
                                    const shouldApplyRedeemedCheck = isFlightVoucherSection;
                                    const flightRestrictions = isFlightDatePassed || hoursUntilFlight <= 120;
                                    const isDisabled = changingLocation || isFullyRefunded || (isVoucherRedeemed && shouldApplyRedeemedCheck) || isExpired || (!isCancelled && flightRestrictions);
                                    
                                    return (
                                        <Tooltip
                                            title={
                                                isExpired
                                                    ? "Voucher / Booking has expired. Location cannot be changed."
                                                    : (isVoucherRedeemed && shouldApplyRedeemedCheck)
                                                        ? "Voucher has been redeemed. Location cannot be changed."
                                                        : isFullyRefunded
                                                            ? "Full refund has been processed. Location cannot be changed."
                                                            : !isCancelled && isFlightDatePassed
                                                                ? "Flight date has passed. Location cannot be changed."
                                                                : !isCancelled && hoursUntilFlight <= 120
                                                                    ? "Less than 120 hours remaining until your flight"
                                                                    : ""
                                            }
                                            arrow
                                        >
                                            <Typography
                                                component="span"
                                                role="button"
                                                tabIndex={isDisabled ? -1 : 0}
                                                onClick={isDisabled ? undefined : () => {
                                                    setSelectedNewLocation(bookingData.location || '');
                                                    setChangeLocationModalOpen(true);
                                                }}
                                                onKeyDown={isDisabled ? undefined : (e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        setSelectedNewLocation(bookingData.location || '');
                                                        setChangeLocationModalOpen(true);
                                                    }
                                                }}
                                                sx={{
                                                    color: isDisabled ? '#9ca3af' : '#1d4ed8',
                                                    fontWeight: 600,
                                                    fontSize: '0.9rem',
                                                    cursor: isDisabled ? 'default' : 'pointer',
                                                    textDecoration: 'underline',
                                                    padding: '4px 0',
                                                    WebkitTapHighlightColor: 'transparent',
                                                    '&:hover': isDisabled ? {} : {
                                                        color: '#1e40af'
                                                    },
                                                    '&:active': isDisabled ? {} : {
                                                        color: '#1e40af'
                                                    }
                                                }}
                                            >
                                                {changingLocation ? 'Processing...' : 'Change'}
                                            </Typography>
                                        </Tooltip>
                                    );
                                })()}
                            </Box>
                        </Box>
                        <Box sx={mobileBookingDetailSx(7, { gridColumn: '1 / -1' })}>
                            <Typography variant="body2" color="text.secondary">Flight Attempts</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500, mb: shouldInlineFlightAttemptMessage ? 0.35 : 2 }}>
                                {bookingData.flight_attempts !== undefined && bookingData.flight_attempts !== null
                                    ? bookingData.flight_attempts
                                    : 0}
                            </Typography>
                            {shouldInlineFlightAttemptMessage && (
                                <Box
                                    sx={{
                                        mb: 2,
                                        color: '#475569',
                                        '& p': {
                                            mt: 0,
                                            mb: 1,
                                            lineHeight: 1.6
                                        },
                                        '& p:last-child': {
                                            mb: 0
                                        },
                                        '& strong': {
                                            color: '#0f172a',
                                            fontWeight: 700
                                        }
                                    }}
                                    dangerouslySetInnerHTML={{ __html: bookingData.flight_attempt_notification.bodyHtml }}
                                />
                            )}
                        </Box>
                        <Box sx={mobileBookingDetailSx(6)}>
                            <Typography variant="body2" color="text.secondary">Voucher Type</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                                {(() => {
                                    const normalizeDisplayValue = (value) => {
                                        if (value === null || value === undefined) return '';
                                        return String(value).trim();
                                    };
                                    const isGenericVoucherType = (value) => {
                                        const normalized = normalizeDisplayValue(value).toLowerCase();
                                        return !normalized || [
                                            'shared',
                                            'shared flight',
                                            'private',
                                            'private charter',
                                            'book flight',
                                            'flight voucher',
                                            'gift voucher',
                                            'buy gift',
                                            'buy gift voucher'
                                        ].includes(normalized);
                                    };
                                    const flightType = normalizeDisplayValue(bookingData.flight_type || bookingData.experience || '');
                                    const voucherCandidates = [
                                        normalizeDisplayValue(bookingData.voucher_type_detail),
                                        normalizeDisplayValue(bookingData.voucher_type)
                                    ].filter(Boolean);
                                    const specificVoucherType = voucherCandidates.find((value) => !isGenericVoucherType(value));
                                    const fallbackVoucherType = voucherCandidates[0] || '';

                                    // Normalize flight type (remove "Flight" or "Charter" if present)
                                    let normalizedFlightType = flightType;
                                    if (normalizedFlightType) {
                                        normalizedFlightType = normalizedFlightType
                                            .replace(/\s*Flight\s*/gi, '')
                                            .replace(/\s*Charter\s*/gi, '')
                                            .trim();
                                    }

                                    // Prefer specific voucher types like "Flexible Weekday" over generic labels
                                    // such as "Shared Flight" or "Book Flight".
                                    if (normalizedFlightType && specificVoucherType) {
                                        return normalizedFlightType.toLowerCase() === specificVoucherType.toLowerCase()
                                            ? normalizedFlightType
                                            : `${normalizedFlightType} - ${specificVoucherType}`;
                                    } else if (normalizedFlightType) {
                                        return normalizedFlightType;
                                    } else if (specificVoucherType) {
                                        return specificVoucherType;
                                    } else if (fallbackVoucherType) {
                                        return fallbackVoucherType;
                                    } else {
                                        return 'Standard';
                                    }
                                })()}
                                {(bookingData.season_saver === 1 || bookingData.season_saver === '1' || bookingData.season_saver === true) && ' ☘️'}
                            </Typography>
                        </Box>
                        <Box sx={mobileBookingDetailSx(5)}>
                            <Typography variant="body2" color="text.secondary">Expiry Date</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {(() => {
                                        if (!bookingData.expires) return 'No expiry date';
                                        const persistedExpiry = dayjs(bookingData.expires);
                                        if (!persistedExpiry.isValid()) return bookingData.expires;
                                        return persistedExpiry.format('DD/MM/YYYY');
                                    })()}
                                </Typography>
                                {(() => {
                                    const hasFlightDate = Boolean(bookingData.flight_date);
                                    const flightDate = hasFlightDate ? dayjs(bookingData.flight_date) : null;
                                    const now = dayjs();
                                    const isCancelled = bookingData.status && String(bookingData.status).toLowerCase() === 'cancelled';
                                    const isFlightDatePassed = flightDate ? flightDate.isBefore(now, 'day') : false;
                                    
                                    // Calculate hours until flight for 120-hour rule (skip for cancelled - no active flight)
                                    const hoursUntilFlight = flightDate ? flightDate.diff(now, 'hour') : 999999;
                                    
                                    // Check if expiry date has passed (compare by day to avoid time-of-day edge cases)
                                    const expiryDate = bookingData.expires ? dayjs(bookingData.expires) : null;
                                    const isExpired = expiryDate ? expiryDate.isBefore(now, 'day') : false;
                                    
                                    const isVoucherRedeemed = bookingData.is_voucher_redeemed === true || bookingData.is_voucher_redeemed === 1;
                                    // Only apply redeemed check for Flight Voucher section (not yet redeemed)
                                    const bookFlight = (bookingData.book_flight || '').toString().trim().toLowerCase();
                                    const isFlightVoucherBase = bookingData.is_flight_voucher || bookFlight === 'flight voucher';
                                    const isFlightVoucherSection = isFlightVoucherBase && (!isVoucherRedeemed || forceVoucherView);
                                    const shouldApplyRedeemedCheck = isFlightVoucherSection;
                                    // When cancelled, allow Extend (bypass flight-date/120h rules - no active flight)
                                    const flightRestrictions = isFlightDatePassed || hoursUntilFlight <= 120;
                                    const isDisabled = extendingVoucher || (!isCancelled && flightRestrictions);
                                    
                                    const isExtendDisabled = isDisabled || isFullyRefunded || (isVoucherRedeemed && shouldApplyRedeemedCheck) || isExpired;
                                    
                                    return (
                                        <Tooltip
                                            title={
                                                isExpired
                                                    ? "Voucher / Booking has expired. Voucher cannot be extended."
                                                    : (isVoucherRedeemed && shouldApplyRedeemedCheck)
                                                        ? "Voucher has been redeemed. Voucher cannot be extended."
                                                        : isFullyRefunded
                                                            ? "Full refund has been processed. Voucher cannot be extended."
                                                            : !isCancelled && isFlightDatePassed
                                                                ? "Flight date has passed. Voucher cannot be extended."
                                                                : !isCancelled && hoursUntilFlight <= 120
                                                                    ? "Less than 120 hours remaining until your flight"
                                                                    : ""
                                            }
                                            arrow
                                        >
                                            <Typography
                                                component="span"
                                                role="button"
                                                tabIndex={isExtendDisabled ? -1 : 0}
                                                onClick={isExtendDisabled ? undefined : handleExtendVoucher}
                                                onKeyDown={isExtendDisabled ? undefined : (e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        handleExtendVoucher();
                                                    }
                                                }}
                                                sx={{
                                                    color: isExtendDisabled ? '#9ca3af' : '#1d4ed8',
                                                    fontWeight: 600,
                                                    fontSize: '0.9rem',
                                                    cursor: isExtendDisabled ? 'default' : 'pointer',
                                                    textDecoration: 'underline',
                                                    padding: '4px 0',
                                                    WebkitTapHighlightColor: 'transparent',
                                                    '&:hover': isExtendDisabled ? {} : {
                                                        color: '#1e40af'
                                                    },
                                                    '&:active': isExtendDisabled ? {} : {
                                                        color: '#1e40af'
                                                    }
                                                }}
                                            >
                                                {extendingVoucher ? 'Processing...' : 'Extend'}
                                            </Typography>
                                        </Tooltip>
                                    );
                                })()}
                            </Box>
                        </Box>
                    </Box>

                    {/* Action Buttons - Reschedule, Change Location, Cancel */}
                    {(() => {
                        const hasFlightDate = Boolean(bookingData.flight_date);
                        const flightDate = hasFlightDate ? dayjs(bookingData.flight_date) : null;
                        const now = dayjs();
                        const isCancelled = bookingData.status && bookingData.status.toLowerCase() === 'cancelled';

                        // Check if flight date has passed (compare by day to avoid time-of-day edge cases)
                        const isFlightDatePassed = flightDate ? flightDate.isBefore(now, 'day') : false;

                        // If cancelled (admin side), allow customer to pick a new date/location immediately
                        // by treating hoursUntilFlight as "far in future" when no upcoming flight is set.
                        const hoursUntilFlight = flightDate ? flightDate.diff(now, 'hour') : 999999;

                        // Check if expiry date has passed (compare by day to avoid time-of-day edge cases)
                        const expiryDate = bookingData.expires ? dayjs(bookingData.expires) : null;
                        const isExpired = expiryDate ? expiryDate.isBefore(now, 'day') : false;

                        // Check if voucher is redeemed (for Flight Voucher)
                        const isVoucherRedeemed =
                            bookingData.is_voucher_redeemed === true || bookingData.is_voucher_redeemed === 1;
                        // Determine if this is a Flight Voucher-based booking
                        const bookFlight = (bookingData.book_flight || '').toString().trim().toLowerCase();
                        const isFlightVoucherBase = bookingData.is_flight_voucher || bookFlight === 'flight voucher';
                        
                        // IMPORTANT:
                        // - "Your Booking Flight Voucher" section (voucher not yet redeemed) => redeemed durumu butonları kilitler
                        // - Redeemed voucher'dan oluşan normal booking ("Your Booking" bölümü) => redeemed, butonları KİLİTLEMEZ
                        const isFlightVoucherSection = isFlightVoucherBase && (!isVoucherRedeemed || forceVoucherView);
                        const shouldApplyRedeemedCheck = isFlightVoucherSection;

                        // If voucher / booking has expired, ALL actions in the portal must be disabled
                        // regardless of flight date / 120-hour rules.
                        // If voucher is redeemed (Flight Voucher ONLY), disable Reschedule and Cancel buttons
                        // If fully refunded, disable Change, Extend, and Reschedule buttons
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
                        } else if (isFullyRefunded) {
                            // If fully refunded, disable Change, Extend, Reschedule, and Cancel buttons
                            canReschedule = false;
                            canChangeLocation = false;
                            canExtendVoucher = false;
                            canCancel = false;
                            // Resend Confirmation can still be available
                            canResendConfirmation = !resendingConfirmation;
                        } else if (isVoucherRedeemed && shouldApplyRedeemedCheck) {
                            // If voucher is redeemed AND this is a Flight Voucher section, disable Reschedule, Cancel, Change Location, and Extend buttons
                            // For regular bookings, redeemed status should NOT disable buttons
                            canReschedule = false;
                            canCancel = false;
                            canChangeLocation = false;
                            canExtendVoucher = false;
                            // Resend Confirmation can still be available
                            canResendConfirmation = !resendingConfirmation;
                        } else if (isFlightDatePassed) {
                            // If flight date has passed, disable Change Location and Extend Voucher
                            canReschedule = isCancelled || hoursUntilFlight > 120;
                            canChangeLocation = false; // Disabled if flight date passed
                            canCancel = false; // Can't cancel past flights
                            canResendConfirmation = !resendingConfirmation;
                            canExtendVoucher = false; // Disabled if flight date passed
                        } else {
                            // Normal (non-expired and flight date not passed) behaviour:
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
                                {/* Action Buttons Row - Reschedule / Cancel side by side on desktop */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: { xs: 'column', sm: 'row' },
                                        gap: 1.5,
                                        alignItems: 'stretch',
                                        width: '100%',
                                    }}
                                >
                                    {/* Reschedule Flight Button - Disabled if expired, cancelled, or within 120 hours */}
                                    <Tooltip 
                                        title={
                                            isExpired 
                                                ? "Voucher / Booking has expired"
                                                : isFullyRefunded
                                                    ? "Full refund has been processed. This booking cannot be rescheduled."
                                                : (isVoucherRedeemed && shouldApplyRedeemedCheck)
                                                    ? "Voucher has been redeemed and cannot be rescheduled"
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
                                                    ...primaryActionButtonSx
                                                }}
                                            >
                                                {isFlightVoucherSection ? 'Schedule Your Flight' : 'Reschedule Your Flight'}
                                            </Button>
                                        </span>
                                    </Tooltip>


                                    {/* Cancel Flight Button - Always visible, but disabled if cancelled or less than 120 hours */}
                                    <Tooltip
                                        title={
                                            isExpired
                                                ? "Voucher / Booking has expired"
                                                : isFullyRefunded
                                                    ? "Full refund has been processed. This booking cannot be cancelled."
                                                : (isVoucherRedeemed && shouldApplyRedeemedCheck)
                                                    ? "Voucher has been redeemed and cannot be cancelled"
                                                : (isCancelled
                                                    ? "Flight is cancelled"
                                                    : (!canCancel ? "Less than 120 hours remaining until your flight" : ""))
                                        }
                                        arrow
                                    >
                                        <span style={{ display: 'block', width: '100%' }}>
                                            <Button
                                                variant="outlined"
                                                fullWidth
                                                disabled={!canCancel}
                                                onClick={() => canCancel && setCancelFlightDialogOpen(true)}
                                                sx={{
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
                                </Box>

                            </Box>
                        );
                    })()}
                </Paper>

                {upsellOffer && !isFullyRefunded && (
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            mb: 3,
                            borderRadius: 4,
                            border: '1px solid',
                            borderColor: isSeasonSaverUpgradeOffer
                                ? '#2e7d32'
                                : isPrivateUpgradeOffer ? '#243244' : inviteSectionPalette.border,
                            background: isSeasonSaverUpgradeOffer
                                ? 'linear-gradient(135deg, rgba(232,245,233,0.97) 0%, rgba(200,230,201,0.97) 100%)'
                                : isPrivateUpgradeOffer
                                    ? 'linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.96) 100%)'
                                    : inviteSectionPalette.background
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: { xs: 'column', md: 'row' },
                                alignItems: { xs: 'flex-start', md: 'center' },
                                justifyContent: 'space-between',
                                gap: 2
                            }}
                        >
                            <Box sx={{ maxWidth: '760px' }}>
                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 700,
                                        mb: 1,
                                        color: isSeasonSaverUpgradeOffer
                                            ? '#1b5e20'
                                            : isPrivateUpgradeOffer ? '#f8fafc' : inviteSectionPalette.heading
                                    }}
                                >
                                    {upsellOfferTitle}
                                </Typography>
                                {Boolean(upsellOfferDescription) && (
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            mb: 1.5,
                                            color: isSeasonSaverUpgradeOffer
                                                ? '#33691e'
                                                : isPrivateUpgradeOffer
                                                    ? 'rgba(248,250,252,0.88)'
                                                    : inviteSectionPalette.body
                                        }}
                                    >
                                        {upsellOfferDescription}
                                    </Typography>
                                )}
                            </Box>
                            <Button
                                variant="contained"
                                onClick={() => setUpsellModalOpen(true)}
                                disabled={submittingUpsell}
                                sx={{
                                    minWidth: { xs: '100%', md: 220 },
                                    ...primaryActionButtonSx,
                                    py: 1.4,
                                    px: 2.5,
                                    borderRadius: 2.5,
                                    fontWeight: 700,
                                    '&:hover': {
                                        boxShadow: 'none',
                                        backgroundColor: actionGreenPalette.hover,
                                        borderColor: actionGreenPalette.hover
                                    }
                                }}
                            >
                                {submittingUpsell ? 'Redirecting...' : upsellOfferButtonLabel}
                            </Button>
                        </Box>
                    </Paper>
                )}

                {shouldShowInviteFriends && (
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            mb: 3,
                            borderRadius: 4,
                            border: '1px solid',
                            borderColor: inviteSectionPalette.border,
                            backgroundColor: inviteFriendsEnabled
                                ? inviteSectionPalette.background
                                : inviteSectionPalette.disabledBackground,
                            boxShadow: 'none'
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: { xs: 'column', md: 'row' },
                                alignItems: { xs: 'flex-start', md: 'center' },
                                justifyContent: 'space-between',
                                gap: 2
                            }}
                        >
                            <Box sx={{ maxWidth: '760px' }}>
                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 700,
                                        mb: 1,
                                        color: inviteFriendsEnabled
                                            ? inviteSectionPalette.heading
                                            : '#818792'
                                    }}
                                >
                                    {inviteFriendsTitle}
                                </Typography>
                                <Typography
                                    variant="body1"
                                    sx={{
                                        mb: 1,
                                        color: inviteFriendsEnabled
                                            ? inviteSectionPalette.body
                                            : '#98a0ab'
                                    }}
                                >
                                    {inviteFriendsDescription}
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                onClick={() => {
                                    setInviteFriendsExpanded((current) => !current);
                                    setInviteFriendsCopyMessage('');
                                }}
                                disabled={!inviteFriendsEnabled}
                                sx={{
                                    minWidth: { xs: '100%', md: 220 },
                                    ...primaryActionButtonSx,
                                    py: 1.4,
                                    px: 2.5,
                                    borderRadius: 2.5,
                                    fontWeight: 700,
                                    '&:hover': {
                                        boxShadow: 'none',
                                        backgroundColor: inviteFriendsEnabled ? actionGreenPalette.hover : actionGreenPalette.disabledBackground,
                                        borderColor: inviteFriendsEnabled ? actionGreenPalette.hover : actionGreenPalette.disabledBorder
                                    }
                                }}
                            >
                                {bookingData.invite_friends.buttonLabel}
                            </Button>
                        </Box>

                        {inviteFriendsExpanded && inviteFriendsEnabled && (
                            <Box sx={{ mt: 2.5 }}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        mb: 2,
                                        borderRadius: 2,
                                        border: `1px solid ${inviteSectionPalette.buttonBorder}`,
                                        backgroundColor: 'rgba(255,255,255,0.92)'
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            whiteSpace: 'pre-wrap',
                                            color: inviteSectionPalette.body,
                                            lineHeight: 1.7
                                        }}
                                    >
                                        {bookingData.invite_friends.shareMessage}
                                    </Typography>
                                </Paper>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 1.25
                                    }}
                                >
                                    {inviteFriendsActions.map(({ channel, label, icon }) => (
                                        <Button
                                            key={channel}
                                            variant={channel === 'copy' ? 'outlined' : 'contained'}
                                            onClick={() => handleInviteFriendsAction(channel, bookingData.invite_friends)}
                                            aria-label={label}
                                            sx={{
                                                textTransform: 'none',
                                                fontWeight: 700,
                                                borderRadius: 2,
                                                minWidth: icon ? 56 : undefined,
                                                px: icon ? 0 : undefined,
                                                ...(channel === 'copy'
                                                    ? {
                                                        borderColor: inviteSectionPalette.link,
                                                        color: inviteSectionPalette.link,
                                                        '&:hover': {
                                                            borderColor: inviteSectionPalette.linkHover,
                                                            backgroundColor: '#edf8ff'
                                                        }
                                                    }
                                                    : {
                                                        backgroundColor: actionGreenPalette.background,
                                                        color: '#fff',
                                                        border: `1px solid ${actionGreenPalette.border}`,
                                                        '&:hover': {
                                                            backgroundColor: actionGreenPalette.hover,
                                                            borderColor: actionGreenPalette.hover
                                                        }
                                                    })
                                            }}
                                        >
                                            {icon || label}
                                        </Button>
                                    ))}
                                </Box>
                                {inviteFriendsCopyMessage && (
                                    <Alert severity="success" sx={{ mt: 2 }}>
                                        {inviteFriendsCopyMessage}
                                    </Alert>
                                )}
                            </Box>
                        )}
                    </Paper>
                )}

                {bookingData.passengers && bookingData.passengers.length > 0 && (
                    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                        <Typography
                            variant="h5"
                            sx={{
                                ...pageTitleSx,
                                mb: 3,
                                '@media (max-width:600px)': {
                                    fontSize: '1.5rem'
                                }
                            }}
                        >
                            Passengers
                        </Typography>
                        {bookingData.passengers.map((passenger, index) => {
                            // For Flight Voucher section (not yet redeemed), disable editing - only display passenger info
                            // For redeemed vouchers (normal bookings), allow editing
                            const isVoucherRedeemed = bookingData.is_voucher_redeemed === true || bookingData.is_voucher_redeemed === 1;
                            const bookFlight = (bookingData.book_flight || '').toString().trim().toLowerCase();
                            const isFlightVoucherBase = bookingData.is_flight_voucher || bookFlight === 'flight voucher';
                            const isFlightVoucherSection = isFlightVoucherBase && (!isVoucherRedeemed || forceVoucherView);
                            const isEditing = !isFlightVoucherSection && editingPassenger === passenger.id;
                            return (
                                <Box key={passenger.id || index} sx={{ mb: 2, p: 2, borderRadius: 1 }}>
                                    {/* Name Section - title, edit icon and Resend Confirmation on same line */}
                                    <Box sx={{
                                        mb: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        flexWrap: 'nowrap'
                                    }}>
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
                                                <Typography
                                                    variant="body1"
                                                    sx={{
                                                        fontWeight: 500,
                                                        minWidth: 0,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        '@media (max-width:600px)': {
                                                            fontSize: '0.875rem'
                                                        }
                                                    }}
                                                >
                                                    {passenger.first_name} {passenger.last_name}
                                                </Typography>
                                                {!isFlightVoucherSection && (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleEditPassengerClick(passenger)}
                                                        sx={{ color: '#3274b4', ml: 0.5, flexShrink: 0 }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                                {/* Resend Confirmation - only for first passenger, same line as name and edit icon */}
                                                {index === 0 && (
                                                    <Typography
                                                        component="span"
                                                        onClick={resendingConfirmation ? undefined : handleResendConfirmation}
                                                        sx={{
                                                            color: resendingConfirmation ? '#9ca3af' : '#1d4ed8',
                                                            fontWeight: 600,
                                                            fontSize: '0.85rem',
                                                            cursor: resendingConfirmation ? 'default' : 'pointer',
                                                            textDecoration: 'underline',
                                                            ml: 1.5,
                                                            whiteSpace: 'nowrap',
                                                            flexShrink: 0,
                                                            '&:hover': resendingConfirmation ? {} : {
                                                                color: '#1e40af'
                                                            }
                                                        }}
                                                    >
                                                        {resendingConfirmation ? 'Sending...' : 'Resend Confirmation'}
                                                    </Typography>
                                                )}
                                            </>
                                        )}
                                    </Box>

                                    {/* Phone (only for first passenger) */}
                                    {index === 0 && (bookingData.phone || passenger.phone) && (
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                mb: 0.5,
                                                '@media (max-width:600px)': {
                                                    fontSize: '0.875rem'
                                                }
                                            }}
                                        >
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
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                        sx={{
                                                            flex: 1,
                                                            '@media (max-width:600px)': {
                                                                fontSize: '0.875rem'
                                                            }
                                                        }}
                                                    >
                                                        Weight: {passenger.weight} kg
                                                    </Typography>
                                                )}
                                            </>
                                        )}
                                    </Box>

                                    {/* Email (only for first passenger) */}
                                    {index === 0 && passenger.email && (
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                mb: 0.5,
                                                '@media (max-width:600px)': {
                                                    fontSize: '0.875rem'
                                                }
                                            }}
                                        >
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
                            <Typography variant="h5" sx={{ ...pageTitleSx, mb: 2 }}>
                                {content.header}
                            </Typography>
                        )}
                        {content.body && (
                            <Box
                                sx={{
                                    color: 'text.secondary',
                                    '& h1, & h2, & h3, & h4, & h5, & h6': {
                                        color: inviteSectionPalette.heading,
                                        fontWeight: 600,
                                        mb: 1.5
                                    },
                                    '& p': { mb: 1.5 },
                                    '& ul, & ol': { pl: 2, mb: 1.5 },
                                    '& li': { mb: 0.5 }
                                }}
                                dangerouslySetInnerHTML={{ __html: content.body }}
                            />
                        )}
                    </Paper>
                ))}

                <Box
                    sx={{
                        py: 1,
                        textAlign: 'center',
                        color: inviteSectionPalette.heading
                    }}
                >
                    <Typography
                        variant="body1"
                        sx={{
                            fontSize: { xs: '1rem', sm: '1.05rem' },
                            fontWeight: 500,
                            letterSpacing: '0.01em'
                        }}
                    >
                        Powered by Fly Away Ballooning 🎈
                    </Typography>
                </Box>
            </Container>

            <CustomerPortalUpsellModal
                open={upsellModalOpen}
                offer={bookingData?.upsell_offer || null}
                submitting={submittingUpsell}
                onClose={() => {
                    if (!submittingUpsell) {
                        setUpsellModalOpen(false);
                    }
                }}
                onSubmit={handleSubmitUpsell}
            />

            {/* Reschedule Flight Modal */}
            <RescheduleFlightModal
                open={rescheduleModalOpen}
                onClose={() => setRescheduleModalOpen(false)}
                bookingData={bookingData}
                onRescheduleSuccess={async (updatedData) => {
                    // Close the modal first
                    setRescheduleModalOpen(false);
                    
                    // Immediately update bookingData state with the updated data for instant UI update
                    // This ensures Flight Date, Location, and Status are updated instantly without waiting for backend fetch
                    if (updatedData) {
                        console.log('🔄 Customer Portal - Updating bookingData with reschedule result:', updatedData);
                        setBookingData(prevData => {
                            // For Flight Voucher redeem, use updatedData as the primary source since it contains the new booking
                            // For regular reschedule, merge with prevData but prioritize updatedData fields
                            const isFlightVoucherRedeem = updatedData?.is_voucher_redeemed === true;
                            
                            let mergedData;
                            if (isFlightVoucherRedeem) {
                                // For Flight Voucher redeem, updatedData is the complete new booking
                                // Use it as-is, only fallback to prevData for fields that might be missing
                                mergedData = {
                                    ...prevData,
                                    ...updatedData,
                                    // Explicitly set critical fields from updatedData (don't use || fallback)
                                    flight_date: updatedData.flight_date !== undefined && updatedData.flight_date !== null 
                                        ? updatedData.flight_date 
                                        : prevData?.flight_date,
                                    location: updatedData.location !== undefined && updatedData.location !== null 
                                        ? updatedData.location 
                                        : prevData?.location,
                                    status: updatedData.status || 'Scheduled', // Always 'Scheduled' when rescheduled
                                    is_voucher_redeemed: true, // Always true for redeem flow
                                    // Preserve Flight Voucher flags
                                    book_flight: updatedData.book_flight || prevData?.book_flight || 'Flight Voucher',
                                    is_flight_voucher: true,
                                    // Preserve voucher information
                                    voucher_ref: updatedData.voucher_ref || prevData?.voucher_ref,
                                    voucher_code: updatedData.voucher_code || prevData?.voucher_code,
                                    // Preserve expiry date from original voucher
                                    expires: updatedData.expires !== undefined 
                                        ? updatedData.expires 
                                        : prevData?.expires
                                };
                            } else {
                                // For regular booking reschedule, merge with prevData
                                mergedData = {
                                    ...prevData,
                                    ...updatedData,
                                    // Ensure flight_date, location, and status are updated
                                    flight_date: updatedData.flight_date !== undefined && updatedData.flight_date !== null 
                                        ? updatedData.flight_date 
                                        : prevData?.flight_date,
                                    location: updatedData.location !== undefined && updatedData.location !== null 
                                        ? updatedData.location 
                                        : prevData?.location,
                                    status: updatedData.status || (updatedData.flight_date ? 'Scheduled' : (prevData?.status || 'Open'))
                                };
                            }
                            
                            console.log('🔄 Customer Portal - Merged bookingData:', mergedData);
                            console.log('🔄 Customer Portal - Status update:', {
                                'isFlightVoucherRedeem': isFlightVoucherRedeem,
                                'updatedData.status': updatedData.status,
                                'updatedData.flight_date': updatedData.flight_date,
                                'updatedData.location': updatedData.location,
                                'updatedData.is_voucher_redeemed': updatedData.is_voucher_redeemed,
                                'final status': mergedData.status,
                                'final flight_date': mergedData.flight_date,
                                'final location': mergedData.location,
                                'final is_voucher_redeemed': mergedData.is_voucher_redeemed
                            });
                            return mergedData;
                        });
                    }
                    
                    // For Flight Voucher redeem flow, skip fetchBookingData() because:
                    // 1. Token is for the original voucher booking, not the new redeemed booking
                    // 2. fetchBookingData() would fetch the old booking and overwrite our updates
                    // 3. enhancedBooking already contains all the new booking information we need
                    const isFlightVoucherRedeem = updatedData?.is_voucher_redeemed === true;
                    
                    if (isFlightVoucherRedeem) {
                        console.log('🔄 Customer Portal - Flight Voucher redeemed, skipping fetchBookingData() to preserve updated booking info');
                        // Don't fetch - the enhancedBooking data is already set in state
                        // The server endpoint would return the old voucher booking, not the new redeemed booking
                    } else {
                        // For regular booking reschedule, fetch fresh data from backend
                        // Add a small delay to ensure backend has finished processing
                        setTimeout(async () => {
                            console.log('🔄 Customer Portal - Fetching fresh booking data after reschedule...');
                            await fetchBookingData();
                        }, 500);
                    }
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
                maxWidth={isMobile ? "sm" : "sm"}
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        maxHeight: '90vh',
                        ...(isMobile ? {
                            margin: '8px',
                            width: 'calc(100% - 16px)',
                            maxWidth: 'calc(100% - 16px)'
                        } : {})
                    }
                }}
            >
                <DialogTitle sx={{ 
                    fontWeight: 700, 
                    fontSize: isMobile ? 16 : 20, 
                    pb: 1.5,
                    padding: isMobile ? '12px 16px' : '20px 24px'
                }}>
                    Change Flight Location
                </DialogTitle>
                <DialogContent sx={{ padding: isMobile ? '12px 16px' : '24px' }}>
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
                                {availableLocations.map((location) => (
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
                                    <Box sx={{ mb: 3, maxWidth: isMobile ? '100%' : '500px', mx: 'auto', px: isMobile ? 1 : 0 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: isMobile ? 0.5 : 1.5 }}>
                                            <IconButton
                                                onClick={() => setCurrentMonth(prev => prev.subtract(1, 'month'))}
                                                size="small"
                                                sx={{ padding: isMobile ? '4px' : '8px' }}
                                            >
                                                <ChevronLeftIcon fontSize={isMobile ? 'small' : 'medium'} />
                                            </IconButton>
                                            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: isMobile ? 14 : 16 }}>
                                                {currentMonth.format('MMMM YYYY')}
                                            </Typography>
                                            <IconButton
                                                onClick={() => setCurrentMonth(prev => prev.add(1, 'month'))}
                                                size="small"
                                                sx={{ padding: isMobile ? '4px' : '8px' }}
                                            >
                                                <ChevronRightIcon fontSize={isMobile ? 'small' : 'medium'} />
                                            </IconButton>
                                        </Box>

                                        {/* Calendar Grid */}
                                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? '2px' : '2px', mb: isMobile ? 0.5 : 1 }}>
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                                <div
                                                    key={day}
                                                    style={{
                                                        textAlign: 'center',
                                                        fontWeight: 700,
                                                        color: '#64748b',
                                                        fontSize: isMobile ? 9 : 11
                                                    }}
                                                >
                                                    {day}
                                                </div>
                                            ))}
                                        </Box>

                                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? '2px' : '2px' }}>
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
                                                    // Get passenger count from booking data
                                                    const passengerCount = bookingData?.passengers?.length || bookingData?.pax || 1;
                                                    // Check if there's enough space for all passengers
                                                    const hasEnoughSpace = totalAvailable >= passengerCount;
                                                    const soldOut = slots.length > 0 && (totalAvailable <= 0 || !hasEnoughSpace);
                                                    
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
                                                    
                                                    // Date is selectable only if there's enough space for all passengers
                                                    const isSelectable = inCurrentMonth && !isPast && shouldShowDate && slots.length > 0 && !soldOut && hasEnoughSpace;

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
                                                                borderRadius: isMobile ? 6 : 10,
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
                                                                fontSize: isMobile ? 11 : 12,
                                                                zIndex: 1,
                                                                position: 'relative',
                                                                transition: 'all 0.2s ease',
                                                                minHeight: '40px',
                                                                padding: isMobile ? '2px' : '4px'
                                                            }}
                                                        >
                                                            <div style={{ fontSize: isMobile ? 11 : 13, lineHeight: 1.2, fontWeight: 700 }}>{d.date()}</div>
                                                            <div style={{ fontSize: isMobile ? 7 : 9, fontWeight: 600, lineHeight: 1.2, textAlign: 'center' }}>
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

                                                    // Get passenger count from booking data
                                                    const passengerCount = bookingData?.passengers?.length || bookingData?.pax || 1;
                                                    
                                                    return times.map(slot => {
                                                        const availableSpaces = Number(slot.available) || Number(slot.calculated_available) || 0;
                                                        const isAvailable = availableSpaces > 0;
                                                        // Check if there's enough space for all passengers
                                                        const hasEnoughSpace = availableSpaces >= passengerCount;
                                                        const isSelected = selectedTime === slot.time;
                                                        const slotDateTime = dayjs(`${dayjs(selectedDate).format('YYYY-MM-DD')} ${slot.time}`);
                                                        const isPastTime = slotDateTime.isBefore(dayjs());
                                                        const isDisabled = !isAvailable || isPastTime || !hasEnoughSpace;

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
                                                                {!hasEnoughSpace && ` - Insufficient space for ${passengerCount} passenger${passengerCount > 1 ? 's' : ''}`}
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
                    {selectedNewLocation && selectedDate && selectedTime && !isFullyRefunded && (
                        <Button
                            onClick={async () => {
                                if (!selectedNewLocation || !selectedDate || !selectedTime) {
                                    return;
                                }

                                if (!selectedActivityId) {
                                    setError('Activity ID not found for selected location. Please try selecting the location again.');
                                    return;
                                }

                                // Validate passenger count vs available spaces
                                const passengerCount = bookingData?.passengers?.length || bookingData?.pax || 1;
                                const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
                                const selectedSlot = locationAvailabilities.find(a => {
                                    if (!a.date) return false;
                                    const slotDate = a.date.includes('T') ? a.date.split('T')[0] : a.date;
                                    return slotDate === dateStr && a.time === selectedTime;
                                });

                                if (selectedSlot) {
                                    const availableSpaces = Number(selectedSlot.available) || Number(selectedSlot.calculated_available) || 0;
                                    if (availableSpaces < passengerCount) {
                                        setError(`Insufficient space: This time slot has only ${availableSpaces} space${availableSpaces !== 1 ? 's' : ''} available, but you have ${passengerCount} passenger${passengerCount !== 1 ? 's' : ''}. Please select a different time slot with enough space.`);
                                        return;
                                    }
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
