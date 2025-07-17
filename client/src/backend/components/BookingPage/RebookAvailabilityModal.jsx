import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, CircularProgress, FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material';
import dayjs from 'dayjs';
import axios from 'axios';

const RebookAvailabilityModal = ({ open, onClose, location, onSlotSelect }) => {
    const [availabilities, setAvailabilities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [error, setError] = useState(null);
    const [activityId, setActivityId] = useState(null);
    
    // New state for activity and location selection
    const [activities, setActivities] = useState([]);
    const [locations, setLocations] = useState([]);
    const [selectedActivity, setSelectedActivity] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [loadingActivities, setLoadingActivities] = useState(false);

    // Load activities and locations on modal open
    useEffect(() => {
        if (open) {
            setLoadingActivities(true);
            // Load activities with location and pricing info
            axios.get('/api/activitiesForRebook')
                .then(res => {
                    if (res.data.success) {
                        setActivities(res.data.data);
                        // Extract unique locations from activities
                        const uniqueLocations = [...new Set(res.data.data.map(a => a.location))];
                        setLocations(uniqueLocations.map(loc => ({ location: loc })));
                    }
                })
                .catch(err => console.error('Error loading activities:', err))
                .finally(() => setLoadingActivities(false));
        } else {
            // Reset state when modal closes
            setAvailabilities([]);
            setSelectedDate(null);
            setSelectedTime(null);
            setActivityId(null);
            setSelectedActivity('');
            setSelectedLocation('');
        }
    }, [open]);

    // Load availabilities when activity and location are selected
    useEffect(() => {
        if (selectedActivity && selectedLocation) {
            setLoading(true);
            setError(null);
            
            // Find the activity ID for the selected activity and location
            const activity = activities.find(a => a.activity_name === selectedActivity && a.location === selectedLocation);
            if (activity) {
                setActivityId(activity.id);
                
                // Get availabilities for this activity
                axios.get(`/api/activity/${activity.id}/availabilities`)
                    .then(res => {
                        if (res.data.success) {
                            console.log('Raw availabilities:', res.data.data);
                            // Filtreyi normalize et: location, status, available
                            const filteredAvailabilities = res.data.data.filter(a => 
                                a.status === 'Open' && a.available > 0 &&
                                a.location && selectedLocation &&
                                a.location.trim().toLowerCase() === selectedLocation.trim().toLowerCase()
                            );
                            console.log('Filtered availabilities:', filteredAvailabilities);
                            if (filteredAvailabilities.length === 0) {
                                console.warn('No availabilities found after filtering. Locations in data:', res.data.data.map(a => a.location));
                            }
                            setAvailabilities(filteredAvailabilities);
                        } else {
                            console.error('API did not return success:', res.data);
                            setError('API did not return success.');
                        }
                    })
                    .catch((err) => {
                        console.error('Error fetching availabilities:', err);
                        setError('Could not fetch availabilities');
                    })
                    .finally(() => setLoading(false));
            }
        }
    }, [selectedActivity, selectedLocation, activities]);

    // Get unique dates from availabilities
    const availableDates = Array.from(new Set(availabilities.map(a => a.date))).filter(date => date);
    console.log('Available dates:', availableDates);

    const getTimesForDate = (date) => {
        const dateStr = dayjs(date).format('YYYY-MM-DD');
        console.log('Looking for times for date:', dateStr);
        
        const times = availabilities.filter(a => a.date === dateStr);
        console.log('Found times for date', dateStr, ':', times);
        return times;
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Rebook - Select New Activity, Location, Date & Time</DialogTitle>
            <DialogContent>
                {loadingActivities ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {/* Activity and Location Selection */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>Select Activity and Location:</Typography>
                            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Activity</InputLabel>
                                    <Select
                                        value={selectedActivity}
                                        onChange={(e) => {
                                            const activityName = e.target.value;
                                            setSelectedActivity(activityName);
                                            // Find the activity and auto-select its location
                                            const activity = activities.find(a => a.activity_name === activityName);
                                            if (activity) {
                                                setSelectedLocation(activity.location);
                                            }
                                        }}
                                        label="Activity"
                                    >
                                        {activities.map((activity) => (
                                            <MenuItem key={activity.id} value={activity.activity_name}>
                                                {activity.activity_name} - {activity.location}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <FormControl fullWidth>
                                    <InputLabel>Location</InputLabel>
                                    <Select
                                        value={selectedLocation}
                                        onChange={(e) => setSelectedLocation(e.target.value)}
                                        label="Location"
                                        disabled={selectedActivity === ''}
                                    >
                                        {selectedActivity ? 
                                            // Show only locations for selected activity
                                            activities
                                                .filter(a => a.activity_name === selectedActivity)
                                                .map((activity) => (
                                                    <MenuItem key={activity.id} value={activity.location}>
                                                        {activity.location}
                                                    </MenuItem>
                                                ))
                                            : 
                                            // Show all locations when no activity selected
                                            locations.map((loc) => (
                                                <MenuItem key={loc.location} value={loc.location}>
                                                    {loc.location}
                                                </MenuItem>
                                            ))
                                        }
                                    </Select>
                                </FormControl>
                            </Box>
                        </Box>

                        {/* Date and Time Selection */}
                        {selectedActivity && selectedLocation && (
                            <>
                                {loading ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                        <CircularProgress />
                                    </Box>
                                ) : error ? (
                                    <Typography color="error">{error}</Typography>
                                ) : (
                                    <>
                                        <Typography variant="subtitle1" sx={{ mb: 2 }}>Select a date:</Typography>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                            {availableDates.length === 0 ? (
                                                <Typography color="text.secondary">No available dates. Lütfen seçtiğiniz aktivite ve lokasyon için uygun uçuş ekleyin veya filtreleri kontrol edin.</Typography>
                                            ) : (
                                                availableDates.map(dateStr => {
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
                                                })
                                            )}
                                        </div>
                                                                {selectedDate && (
                            <>
                                <Typography variant="subtitle1" sx={{ mb: 1 }}>Available Times for {dayjs(selectedDate).format('DD/MM/YYYY')}:</Typography>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                    {getTimesForDate(selectedDate).length === 0 && (
                                        <Box>
                                            <Typography color="text.secondary">No available times</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Debug: Selected date: {dayjs(selectedDate).format('YYYY-MM-DD')}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Total availabilities: {availabilities.length}
                                            </Typography>
                                        </Box>
                                    )}
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
                        onSlotSelect(selectedDate, selectedTime, activityId, selectedActivity, selectedLocation);
                    }}
                    disabled={!selectedDate || !selectedTime || !selectedActivity || !selectedLocation}
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