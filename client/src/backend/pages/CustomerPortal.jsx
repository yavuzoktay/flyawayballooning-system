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
        fetchBookingData();
        
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
                setAvailableLocations(['Bath', 'Devon', 'Somerset', 'Bristol Fiesta']);
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

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
                <CustomerPortalHeader onNavigate={scrollToSection} />
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
                <CustomerPortalHeader onNavigate={scrollToSection} />
                <Container maxWidth="md" sx={{ py: 4 }}>
                    <Alert severity="error">{error}</Alert>
                </Container>
            </>
        );
    }

    if (!bookingData) {
        return (
            <>
                <CustomerPortalHeader onNavigate={scrollToSection} />
                <Container maxWidth="md" sx={{ py: 4 }}>
                    <Alert severity="info">No booking data found.</Alert>
                </Container>
            </>
        );
    }

    return (
        <>
            <CustomerPortalHeader onNavigate={scrollToSection} />
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
                    Your Booking
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                    <Box>
                        <Typography variant="body2" color="text.secondary">Booking Reference</Typography>
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
                            {bookingData.flight_date 
                                ? dayjs(bookingData.flight_date).format('DD/MM/YYYY HH:mm')
                                : 'Not Scheduled'}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="body2" color="text.secondary">Location</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                            {bookingData.location || 'TBD'}
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
                            {bookingData.voucher_type || 'Standard'}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="body2" color="text.secondary">Voucher Expiry Date</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                            {bookingData.expires 
                                ? dayjs(bookingData.expires).format('DD/MM/YYYY')
                                : 'No expiry date'}
                        </Typography>
                    </Box>
                </Box>
                
                {/* Action Buttons - Reschedule, Change Location, Cancel */}
                {(() => {
                    if (!bookingData.flight_date) return null;
                    
                    const flightDate = dayjs(bookingData.flight_date);
                    const now = dayjs();
                    const hoursUntilFlight = flightDate.diff(now, 'hour');
                    const isCancelled = bookingData.status && bookingData.status.toLowerCase() === 'cancelled';
                    const canRescheduleOrChange = !isCancelled && hoursUntilFlight > 120;
                    const canCancel = !isCancelled && hoursUntilFlight > 120;
                    
                    return (
                        <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #e0e0e0' }}>
                            {/* Reschedule Flight Button - Disabled if cancelled or less than 120 hours */}
                            <Tooltip 
                                title={isCancelled ? "Flight is cancelled" : (!canRescheduleOrChange ? "Less than 120 hours remaining until your flight" : "")}
                                arrow
                            >
                                <span style={{ display: 'block', width: '100%' }}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        fullWidth
                                        disabled={!canRescheduleOrChange}
                                        onClick={() => canRescheduleOrChange && setRescheduleModalOpen(true)}
                                        sx={{
                                            py: 1.5,
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            textTransform: 'none',
                                            borderRadius: 2,
                                            boxShadow: canRescheduleOrChange ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                                            backgroundColor: canRescheduleOrChange ? undefined : '#f3f4f6',
                                            color: canRescheduleOrChange ? undefined : '#9ca3af',
                                            '&:hover': canRescheduleOrChange ? {
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
                                title={isCancelled ? "Flight is cancelled" : (!canRescheduleOrChange ? "Less than 120 hours remaining until your flight" : "")}
                                arrow
                            >
                                <span style={{ display: 'block', width: '100%' }}>
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        fullWidth
                                        disabled={!canRescheduleOrChange}
                                        onClick={() => canRescheduleOrChange && (() => {
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
                                            borderColor: canRescheduleOrChange ? undefined : '#d1d5db',
                                            color: canRescheduleOrChange ? undefined : '#9ca3af',
                                            backgroundColor: canRescheduleOrChange ? 'transparent' : '#f3f4f6',
                                            cursor: canRescheduleOrChange ? 'pointer' : 'not-allowed',
                                            '&:hover': canRescheduleOrChange ? {
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
                                title={isCancelled ? "Flight is cancelled" : (!canCancel ? "Less than 120 hours remaining until your flight" : "")}
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
                        </Box>
                    );
                })()}
            </Paper>

            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                    Booking Details
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                    <Box>
                        <Typography variant="body2" color="text.secondary">Passengers</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                            {bookingData.pax || 1}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="body2" color="text.secondary">Experience</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                            {bookingData.flight_type || bookingData.experience || 'N/A'}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="body2" color="text.secondary">Name</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                            {bookingData.name || 'N/A'}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="body2" color="text.secondary">Email</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                            {bookingData.email || 'N/A'}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="body2" color="text.secondary">Phone</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                            {bookingData.phone || 'N/A'}
                        </Typography>
                    </Box>
                    {bookingData.voucher_code && (
                        <Box>
                            <Typography variant="body2" color="text.secondary">Voucher Code</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                                {bookingData.voucher_code}
                            </Typography>
                        </Box>
                    )}
                    {bookingData.expires && (
                        <Box>
                            <Typography variant="body2" color="text.secondary">Expires</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                                {dayjs(bookingData.expires).format('DD/MM/YYYY')}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Paper>

            {bookingData.passengers && bookingData.passengers.length > 0 && (
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                        Passengers
                    </Typography>
                    {bookingData.passengers.map((passenger, index) => {
                        const isEditing = editingPassenger === passenger.id;
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
                                            <IconButton
                                                size="small"
                                                onClick={() => handleEditPassengerClick(passenger)}
                                                sx={{ color: '#3274b4' }}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
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

            <Paper id="live-availability" elevation={2} sx={{ p: 3, mb: 3, scrollMarginTop: '100px' }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                    Available Flights
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Check for other available dates and times to reschedule your flight.
                </Typography>
                <Box sx={{ border: '1px dashed #ccc', p: 3, textAlign: 'center', color: '#888', borderRadius: 1 }}>
                    <Typography variant="body2">Availability calendar will be available soon.</Typography>
                </Box>
            </Paper>

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
                                                            const bookingVoucherType = bookingData?.voucher_type || 'Any Day Flight';
                                                            
                                                            // Normalize flight type
                                                            const normalizedFlightType = bookingFlightType.toLowerCase().includes('private') ? 'private' : 'shared';
                                                            
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
                                                const firstDayOfMonth = startOfMonth.day();
                                                
                                                let daysBack;
                                                if (firstDayOfMonth === 0) {
                                                    daysBack = 6;
                                                } else {
                                                    daysBack = firstDayOfMonth - 1;
                                                }
                                                
                                                const firstCellDate = startOfMonth.subtract(daysBack, 'day');
                                                
                                                for (let i = 0; i < 42; i++) {
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
                                                    const isSelectable = inCurrentMonth && !isPast && slots.length > 0 && !soldOut;
                                                    
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
                                        <Box sx={{ mt: 3 }}>
                                            <Typography variant="h6" sx={{ mb: 2, fontSize: 18, fontWeight: 600 }}>
                                                Select Time for {dayjs(selectedDate).format('DD MMMM YYYY')}
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                                                {(() => {
                                                    const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
                                                    const times = locationAvailabilities.filter(a => {
                                                        if (!a.date) return false;
                                                        const slotDate = a.date.includes('T') ? a.date.split('T')[0] : a.date;
                                                        return slotDate === dateStr;
                                                    }).sort((a, b) => a.time.localeCompare(b.time));
                                                    
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
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Are you sure you want to cancel this flight? This action cannot be undone.
                    </Alert>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        <strong>Booking Reference:</strong> {bookingData?.booking_reference || bookingData?.id || 'N/A'}
                    </Typography>
                    {bookingData?.flight_date && (
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            <strong>Flight Date:</strong> {dayjs(bookingData.flight_date).format('DD/MM/YYYY HH:mm')}
                        </Typography>
                    )}
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        <strong>Location:</strong> {bookingData?.location || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Cancelling this flight will update the booking status to "Cancelled" and increment the flight attempts count.
                    </Typography>
                </DialogContent>
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
                                // Get current flight attempts
                                const currentAttempts = parseInt(bookingData.flight_attempts || 0, 10);
                                const newAttempts = (currentAttempts + 1).toString();

                                // Update status to Cancelled
                                await axios.patch('/api/updateBookingField', {
                                    booking_id: bookingData.id,
                                    field: 'status',
                                    value: 'Cancelled'
                                });

                                // Update flight_attempts
                                await axios.patch('/api/updateBookingField', {
                                    booking_id: bookingData.id,
                                    field: 'flight_attempts',
                                    value: newAttempts
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

