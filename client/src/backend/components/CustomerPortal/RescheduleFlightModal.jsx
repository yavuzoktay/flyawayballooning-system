import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
    Box,
    IconButton,
    Alert
} from '@mui/material';
import dayjs from 'dayjs';
import axios from 'axios';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const RescheduleFlightModal = ({ open, onClose, bookingData, onRescheduleSuccess }) => {
    const [availabilities, setAvailabilities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [error, setError] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
    const [submitting, setSubmitting] = useState(false);

    // Get activity ID, location, and voucher type from booking data
    const activityId = bookingData?.activity_id || bookingData?.activityId;
    const location = bookingData?.location;
    const voucherType = bookingData?.voucher_type || bookingData?.voucher_type_detail;
    const experience = bookingData?.experience || bookingData?.flight_type || bookingData?.flight_type_source;
    
    // Debug logging
    console.log('RescheduleFlightModal - Booking Data:', {
        activityId,
        location,
        voucherType,
        experience,
        bookingData
    });

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

    // Filter availabilities based on voucher type
    const filterByVoucherType = (availability) => {
        if (!voucherType) return true; // No filtering if no voucher type

        const voucherTypeLower = voucherType.toLowerCase();
        
        // Parse availability date safely
        let availabilityDate = null;
        if (availability.date) {
            try {
                // Handle different date formats
                if (typeof availability.date === 'string') {
                    // If date includes time, extract just the date part
                    const datePart = availability.date.split(' ')[0];
                    availabilityDate = new Date(datePart + 'T00:00:00'); // Add time to avoid timezone issues
                } else {
                    availabilityDate = new Date(availability.date);
                }
                
                // Check if date is valid
                if (isNaN(availabilityDate.getTime())) {
                    return true; // Invalid date, don't filter
                }
            } catch (e) {
                console.warn('Error parsing availability date:', availability.date, e);
                return true; // Error parsing, don't filter
            }
        }
        
        if (!availabilityDate) return true; // If no date, don't filter

        // Weekday Morning voucher → Show weekday mornings only
        if (voucherTypeLower.includes('weekday morning')) {
            return isWeekday(availabilityDate) && isMorning(availability.time);
        }
        
        // Flexible Weekday voucher → Show all weekdays (any time)
        if (voucherTypeLower.includes('flexible weekday')) {
            return isWeekday(availabilityDate);
        }
        
        // Anytime voucher (Any Day Flight) → Show all available schedules
        if (voucherTypeLower.includes('any day') || voucherTypeLower.includes('anytime')) {
            return true; // Show all dates
        }

        // Default: show all if voucher type doesn't match known types
        return true;
    };

    // Fetch availabilities when modal opens
    useEffect(() => {
        if (open && location) {
            setLoading(true);
            setError(null);
            setSelectedDate(null);
            setSelectedTime(null);
            setCurrentMonth(dayjs().startOf('month'));

            // First, get activity ID from location if not available in bookingData
            const fetchAvailabilities = async () => {
                try {
                    let finalActivityId = activityId;
                    
                    // If activityId is not available, fetch it from location
                    if (!finalActivityId && location) {
                        const activitiesResponse = await axios.get('/api/activities');
                        if (activitiesResponse.data?.success) {
                            const activities = Array.isArray(activitiesResponse.data.data) ? activitiesResponse.data.data : [];
                            const activityForLocation = activities.find(a => a.location === location && a.status === 'Live');
                            if (activityForLocation) {
                                finalActivityId = activityForLocation.id;
                                console.log('RescheduleFlightModal - Found activity ID from location:', finalActivityId);
                            }
                        }
                    }

                    if (!finalActivityId) {
                        console.error('RescheduleFlightModal - No activity ID found for location:', location);
                        setError('Could not find activity for this location. Please try again later.');
                        setAvailabilities([]);
                        setLoading(false);
                        return;
                    }

                    // Use the same endpoint as Change Flight Location modal for consistency
                    const availResponse = await axios.get(`/api/activity/${finalActivityId}/availabilities`);
                    if (availResponse.data?.success) {
                        const data = Array.isArray(availResponse.data.data) ? availResponse.data.data : [];
                        
                        // Filter based on voucher type and flight type (same logic as Change Flight Location)
                        const bookingFlightType = experience || bookingData?.flight_type || bookingData?.experience || 'Shared Flight';
                        const bookingVoucherType = voucherType || bookingData?.voucher_type || bookingData?.voucher_type_detail || 'Any Day Flight';

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

                        console.log('RescheduleFlightModal - Loaded availabilities:', filtered.length, 'for location:', location, 'voucher type:', bookingVoucherType, 'activityId:', finalActivityId);
                        setAvailabilities(filtered);
                    } else {
                        setAvailabilities([]);
                    }
                } catch (err) {
                    console.error('Error loading availabilities:', err);
                    setError('Could not fetch availabilities. Please try again later.');
                    setAvailabilities([]);
                } finally {
                    setLoading(false);
                }
            };

            fetchAvailabilities();
        } else if (!open) {
            setAvailabilities([]);
            setSelectedDate(null);
            setSelectedTime(null);
            setError(null);
        }
    }, [open, activityId, location, voucherType, experience, bookingData]);

    const getTimesForDate = (date) => {
        if (!date) return [];
        const dateStr = dayjs(date).format('YYYY-MM-DD');
        let matchingSlots = availabilities.filter(a => {
            if (!a.date) return false;
            const slotDate = a.date.includes('T') ? a.date.split('T')[0] : a.date;
            return slotDate === dateStr;
        });
        
        // Apply additional voucher type filtering for Weekday Morning (must be morning times)
        if (voucherType) {
            const voucherTypeLower = voucherType.toLowerCase();
            if (voucherTypeLower.includes('weekday morning')) {
                // Filter to only show morning times (before 12:00 PM)
                matchingSlots = matchingSlots.filter(a => isMorning(a.time));
            }
        }
        
        return matchingSlots.sort((a, b) => a.time.localeCompare(b.time));
    };

    const buildDayCells = () => {
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
            
            // Aggregate availability for this date
            // Handle both date formats: "2025-11-14" or "2025-11-14T00:00:00.000Z"
            const dateStr = d.format('YYYY-MM-DD');
            const slots = availabilities.filter(a => {
                if (!a.date) return false;
                const slotDate = a.date.includes('T') ? a.date.split('T')[0] : a.date;
                return slotDate === dateStr;
            });
            const totalAvailable = slots.reduce((acc, s) => acc + (Number(s.available) || Number(s.calculated_available) || 0), 0);
            const soldOut = slots.length > 0 && totalAvailable <= 0;
            
            // Apply voucher type filtering for calendar display
            let shouldShowDate = true;
            const voucherTypeLower = (voucherType || '').toLowerCase();
            
            // If no voucher type or "Any Day Flight", show all dates
            if (!voucherType || voucherTypeLower.includes('any day') || voucherTypeLower.includes('anytime')) {
                shouldShowDate = true;
            } else if (slots.length > 0) {
                const dateObj = d.toDate();
                
                // Weekday Morning voucher → Show weekday mornings only
                if (voucherTypeLower.includes('weekday morning')) {
                    // Must be weekday AND have morning slots available
                    const isWeekdayDate = isWeekday(dateObj);
                    if (isWeekdayDate) {
                        // Check if there are any morning slots for this date
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
            }
            
            // Only show date if it has available slots and matches voucher type filter
            // Use same logic as Change Flight Location modal - check if slots exist and not sold out
            const hasAvailableSlots = slots.length > 0 && !soldOut;
            // If voucher type filtering says we shouldn't show this date, mark it as not selectable
            // But still show it if it has slots (just make it non-selectable)
            const isSelectable = inCurrentMonth && !isPast && shouldShowDate && hasAvailableSlots;
            
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
                                    : hasAvailableSlots
                                        ? '#22c55e'  // Green for available dates
                                        : '#f0f0f0',  // Light grey for dates with no slots
                        color: isSelected
                            ? '#fff'
                            : isPast
                                ? '#999'
                                : soldOut
                                    ? '#fff'
                                    : hasAvailableSlots
                                        ? '#fff'
                                        : '#999',
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
    };

    const monthLabel = currentMonth.format('MMMM YYYY');

    const handleConfirm = async () => {
        if (!selectedDate || !selectedTime) return;

        setSubmitting(true);
        try {
            // Format the selected date and time
            const formattedDate = dayjs(selectedDate).format('YYYY-MM-DD');
            const selectedDateTime = `${formattedDate} ${selectedTime}`;

            // Call reschedule API
            const response = await axios.patch(`/api/customer-portal-reschedule/${bookingData.id}`, {
                flight_date: selectedDateTime,
                location: bookingData.location,
                activity_id: activityId
            });

            if (response.data.success) {
                if (onRescheduleSuccess) {
                    onRescheduleSuccess(response.data.data);
                }
                onClose();
            } else {
                setError(response.data.message || 'Failed to reschedule flight. Please try again.');
            }
        } catch (err) {
            console.error('Error rescheduling flight:', err);
            setError(err.response?.data?.message || 'Failed to reschedule flight. Please try again later.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
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
                Reschedule Your Flight
            </DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {loading ? (
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
                                    {monthLabel}
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
                                {buildDayCells()}
                            </Box>
                        </Box>

                        {/* Time Selection */}
                        {selectedDate && (
                            <Box sx={{ mt: 3 }}>
                                <Typography variant="h6" sx={{ mb: 2, fontSize: 18, fontWeight: 600 }}>
                                    Select Time for {dayjs(selectedDate).format('DD MMMM YYYY')}
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                                    {getTimesForDate(selectedDate).length === 0 ? (
                                        <Box sx={{ p: 2, textAlign: 'center', width: '100%' }}>
                                            <Typography color="text.secondary" sx={{ fontSize: 16, fontWeight: 500 }}>
                                                No available times for this date
                                            </Typography>
                                        </Box>
                                    ) : (
                                        getTimesForDate(selectedDate).map(slot => {
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
                                        })
                                    )}
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
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 2, justifyContent: 'flex-end' }}>
                <Button
                    onClick={handleConfirm}
                    disabled={!selectedDate || !selectedTime || submitting}
                    variant="contained"
                    sx={{
                        backgroundColor: '#22c55e',
                        '&:hover': {
                            backgroundColor: '#16a34a'
                        },
                        fontWeight: 600
                    }}
                >
                    {submitting ? <CircularProgress size={20} /> : 'Confirm'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RescheduleFlightModal;

