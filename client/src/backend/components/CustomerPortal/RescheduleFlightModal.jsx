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

    // Get activity ID from booking data
    const activityId = bookingData?.activity_id || bookingData?.activityId;

    // Fetch availabilities when modal opens
    useEffect(() => {
        if (open && activityId) {
            setLoading(true);
            setError(null);
            setSelectedDate(null);
            setSelectedTime(null);
            setCurrentMonth(dayjs().startOf('month'));

            axios.get(`/api/activity/${activityId}/availabilities`)
                .then(res => {
                    if (res.data.success) {
                        const data = Array.isArray(res.data.data) ? res.data.data : [];
                        // Filter only open/available slots
                        const filtered = data.filter(slot => {
                            const status = slot.status || slot.calculated_status || '';
                            const available = Number(slot.available) || Number(slot.calculated_available) || 0;
                            const slotDateTime = dayjs(`${slot.date} ${slot.time}`);
                            return (status.toLowerCase() === 'open' || available > 0) && slotDateTime.isAfter(dayjs());
                        });
                        setAvailabilities(filtered);
                    } else {
                        setAvailabilities([]);
                    }
                })
                .catch(err => {
                    console.error('Error loading availabilities:', err);
                    setError('Could not fetch availabilities. Please try again later.');
                    setAvailabilities([]);
                })
                .finally(() => setLoading(false));
        } else if (!open) {
            setAvailabilities([]);
            setSelectedDate(null);
            setSelectedTime(null);
            setError(null);
        }
    }, [open, activityId]);

    const getTimesForDate = (date) => {
        if (!date) return [];
        const dateStr = dayjs(date).format('YYYY-MM-DD');
        return availabilities.filter(a => {
            if (!a.date) return false;
            const slotDate = a.date.includes('T') ? a.date.split('T')[0] : a.date;
            return slotDate === dateStr;
        }).sort((a, b) => a.time.localeCompare(b.time));
    };

    const buildDayCells = () => {
        const cells = [];
        const startOfMonth = currentMonth.startOf('month');
        const firstDayOfMonth = startOfMonth.day();
        
        // Calculate offset to previous Monday
        // Monday (1): 0 days back
        // Tuesday (2): 1 day back  
        // Wednesday (3): 2 days back
        // Thursday (4): 3 days back
        // Friday (5): 4 days back
        // Saturday (6): 5 days back
        // Sunday (0): 6 days back
        let daysBack;
        if (firstDayOfMonth === 0) {
            daysBack = 6; // Sunday -> go back to Monday
        } else {
            daysBack = firstDayOfMonth - 1; // Other days -> go back to Monday
        }
        
        const firstCellDate = startOfMonth.subtract(daysBack, 'day');
        
        for (let i = 0; i < 42; i++) {
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
            
            // Tarih seçilebilir olmalı eğer:
            // 1. Mevcut ay içinde
            // 2. Geçmiş değil
            const isSelectable = inCurrentMonth && !isPast;
            
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
                        display: 'flex',  // Always flex for Grid - use opacity for visibility
                        opacity: !inCurrentMonth ? 0 : (isSelectable ? 1 : 0.6),  // Hide other months, dim unselectable dates
                        pointerEvents: inCurrentMonth && isSelectable ? 'auto' : 'none',  // Disable interaction for hidden/unselectable dates
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
                Reschedule Flight
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

