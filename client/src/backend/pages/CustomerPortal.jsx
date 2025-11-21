import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Container, Typography, Box, Paper, CircularProgress, Alert } from '@mui/material';
import dayjs from 'dayjs';
import CustomerPortalHeader from '../components/CustomerPortal/CustomerPortalHeader';
import '../components/CustomerPortal/CustomerPortalHeader.css';

const CustomerPortal = () => {
    const { token: tokenParam } = useParams();
    const [bookingData, setBookingData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Extract token from URL - handle both /customerPortal/:token and /customerPortal/:token/index
    const token = tokenParam ? tokenParam.split('/')[0] : null;

    useEffect(() => {
        if (!token) {
            setError('Invalid token');
            setLoading(false);
            return;
        }

        const fetchBookingData = async () => {
            try {
                setLoading(true);
                setError(null);
                // URL encode the token to handle special characters like =
                const encodedToken = encodeURIComponent(token);
                const response = await axios.get(`/api/customer-portal-booking/${encodedToken}`);
                
                if (response.data.success) {
                    setBookingData(response.data.data);
                } else {
                    setError(response.data.message || 'Failed to load booking data');
                }
            } catch (err) {
                console.error('Error fetching customer portal booking data:', err);
                setError(err.response?.data?.message || 'Error loading booking data. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchBookingData();
    }, [token]);

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
                <Box id="portal-main" sx={{ mb: 4, textAlign: 'center', scrollMarginTop: '100px' }}>
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
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
                        Your Ballooning Adventure
                    </Typography>
                    <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 1, color: '#0f172a' }}>
                        Welcome, {bookingData.name ? bookingData.name.split(' ')[0] : 'Guest'}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        You can manage your booking with us here.
                    </Typography>
                </Box>

            {/* Booking/Voucher Information Section */}
            <Paper elevation={2} sx={{ p: 3, mb: 3, backgroundColor: '#f8f9fa' }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: '#0f172a' }}>
                    Booking & Voucher Information
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                            Booking ID or Voucher Ref
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1.1rem', color: '#0f172a' }}>
                            {bookingData.booking_id || bookingData.voucher_ref || bookingData.voucher_code || bookingData.id || 'N/A'}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                            Voucher Type Purchased
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1.1rem', color: '#0f172a' }}>
                            {bookingData.voucher_type || 'Standard'}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                            Booking Created Date
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1.1rem', color: '#0f172a' }}>
                            {bookingData.created_at 
                                ? dayjs(bookingData.created_at).format('DD/MM/YYYY HH:mm')
                                : 'N/A'}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                            Voucher Expiry Date
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1.1rem', color: '#0f172a' }}>
                            {bookingData.expires 
                                ? dayjs(bookingData.expires).format('DD/MM/YYYY')
                                : 'No expiry date'}
                        </Typography>
                    </Box>
                    <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                            Number of Flight Attempts Made
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1.1rem', color: '#0f172a' }}>
                            {bookingData.flight_attempts !== undefined && bookingData.flight_attempts !== null 
                                ? bookingData.flight_attempts 
                                : 0}
                        </Typography>
                    </Box>
                </Box>
            </Paper>

            <Paper id="scroll-target-booking" elevation={2} sx={{ p: 3, mb: 3, scrollMarginTop: '100px' }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                    Booking Overview
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
                </Box>
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
                    {bookingData.passengers.map((passenger, index) => (
                        <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {passenger.first_name} {passenger.last_name}
                            </Typography>
                            {passenger.weight && (
                                <Typography variant="body2" color="text.secondary">
                                    Weight: {passenger.weight} kg
                                </Typography>
                            )}
                            {passenger.email && (
                                <Typography variant="body2" color="text.secondary">
                                    Email: {passenger.email}
                                </Typography>
                            )}
                        </Box>
                    ))}
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

            <Paper id="additional-info" elevation={2} sx={{ p: 3, scrollMarginTop: '100px' }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                    Important Information
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Please read the following before your flight:
                </Typography>
                <Box component="ul" sx={{ pl: 2 }}>
                    <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                        Weather dependent activity
                    </Typography>
                    <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                        Arrive 30 minutes before scheduled flight
                    </Typography>
                    <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                        Wear comfortable clothing
                    </Typography>
                </Box>
            </Paper>
            </Container>
        </>
    );
};

export default CustomerPortal;

