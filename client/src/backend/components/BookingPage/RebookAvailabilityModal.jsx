import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, CircularProgress } from '@mui/material';
import dayjs from 'dayjs';
import axios from 'axios';

const RebookAvailabilityModal = ({ open, onClose, location, onSlotSelect }) => {
    const [availabilities, setAvailabilities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [error, setError] = useState(null);
    const [activityId, setActivityId] = useState(null);

    useEffect(() => {
        if (open && location) {
            setLoading(true);
            setError(null);
            axios.post('/api/getActivityId', { location })
                .then(res => {
                    console.log('getActivityId response:', res.data);
                    setAvailabilities(res.data.availabilities || []);
                    setActivityId(res.data.activity?.id || null);
                    console.log('Activity ID set to:', res.data.activity?.id);
                })
                .catch(() => setError('Could not fetch availabilities'))
                .finally(() => setLoading(false));
        } else {
            setAvailabilities([]);
            setSelectedDate(null);
            setSelectedTime(null);
            setActivityId(null);
        }
    }, [open, location]);

    // Takvimde gösterilecek günler
    const availableDates = Array.from(new Set(availabilities.map(a => {
        if (a.date && a.date.includes('/')) {
            const [day, month, year] = a.date.split('/');
            return `${year}-${month}-${day}`;
        }
        return a.date;
    })));

    const getTimesForDate = (date) => {
        const dateStr = dayjs(date).format('YYYY-MM-DD');
        return availabilities.filter(a => {
            if (a.date && a.date.includes('/')) {
                const [day, month, year] = a.date.split('/');
                return `${year}-${month}-${day}` === dateStr;
            }
            return a.date === dateStr;
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Rebook - Select New Date & Time</DialogTitle>
            <DialogContent>
                {loading ? <CircularProgress /> : error ? <Typography color="error">{error}</Typography> : (
                    <>
                        <Typography variant="subtitle1" sx={{ mb: 2 }}>Select a date:</Typography>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                            {availableDates.map(dateStr => {
                                const d = dayjs(dateStr, 'YYYY-MM-DD');
                                const isSelected = selectedDate && dayjs(selectedDate).isSame(d, 'day');
                                return (
                                    <Button
                                        key={dateStr}
                                        variant={isSelected ? 'contained' : 'outlined'}
                                        onClick={() => { setSelectedDate(d.toDate()); setSelectedTime(null); }}
                                    >
                                        {d.format('DD/MM/YYYY')}
                                    </Button>
                                );
                            })}
                        </div>
                        {selectedDate && (
                            <>
                                <Typography variant="subtitle1" sx={{ mb: 1 }}>Available Times for {dayjs(selectedDate).format('DD/MM/YYYY')}:</Typography>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                    {getTimesForDate(selectedDate).length === 0 && <Typography color="text.secondary">No available times</Typography>}
                                    {getTimesForDate(selectedDate).map(slot => {
                                        const isAvailable = slot.available > 0;
                                        const isSelected = selectedTime === slot.time;
                                        return (
                                            <Button
                                                key={slot.id}
                                                variant={isSelected ? 'contained' : 'outlined'}
                                                color={isAvailable ? 'primary' : 'inherit'}
                                                disabled={!isAvailable}
                                                onClick={() => isAvailable && setSelectedTime(slot.time)}
                                            >
                                                {slot.time} ({slot.available}/{slot.capacity})
                                            </Button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={() => {
                        console.log('Confirming slot with activityId:', activityId);
                        onSlotSelect(selectedDate, selectedTime, activityId);
                    }}
                    disabled={!selectedDate || !selectedTime}
                    variant="contained"
                    color="primary"
                >
                    Confirm
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RebookAvailabilityModal; 