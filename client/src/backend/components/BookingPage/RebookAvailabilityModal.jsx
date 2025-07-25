import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, CircularProgress, FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material';
import dayjs from 'dayjs';
import axios from 'axios';

const RebookAvailabilityModal = ({ open, onClose, location, onSlotSelect, flightType }) => {
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

    // Yeni: Modalda flight type seçici için state
    const [availableFlightTypes, setAvailableFlightTypes] = useState([]);
    const [selectedFlightType, setSelectedFlightType] = useState('');

    // availableDates state'i
    const [availableDates, setAvailableDates] = useState([]);
    const [filteredAvailabilities, setFilteredAvailabilities] = useState([]);

    // Load activities and locations on modal open
    useEffect(() => {
        if (open) {
            setLoadingActivities(true);
            axios.get('/api/activitiesForRebook')
                .then(res => {
                    if (res.data.success) {
                        setActivities(res.data.data);
                        const uniqueLocations = [...new Set(res.data.data.map(a => a.location))];
                        setLocations(uniqueLocations.map(loc => ({ location: loc })));
                        // Varsayılan olarak prop ile gelen activity/location seçili olsun
                        if (location) {
                            setSelectedLocation(location);
                        }
                        // Eğer activityId prop ile gelirse, activity_name'i bulup seç
                        if (location && res.data.data.length > 0) {
                            const found = res.data.data.find(a => a.location === location);
                            if (found) {
                                setSelectedActivity(found.activity_name);
                            }
                        }
                    }
                })
                .catch(err => console.error('Error loading activities:', err))
                .finally(() => setLoadingActivities(false));
        } else {
            setAvailabilities([]);
            setSelectedDate(null);
            setSelectedTime(null);
            setActivityId(null);
            setSelectedActivity('');
            setSelectedLocation('');
        }
    }, [open, location]);

    // Fetch availabilities (sadece activity/location değişince)
    useEffect(() => {
        if (selectedActivity && selectedLocation) {
            setLoading(true);
            setError(null);
            const activity = activities.find(a => a.activity_name === selectedActivity && a.location === selectedLocation);
            if (activity) {
                setActivityId(activity.id);
                axios.get(`/api/activity/${activity.id}/availabilities`)
                    .then(res => {
                        if (res.data.success) {
                            setAvailabilities(res.data.data);
                            // Flight types dropdown için sadece flight_types alanı kullanılacak
                            const normalizeType = t => t.replace(' Flight', '').trim().toLowerCase();
                            const allTypes = Array.from(new Set(
                                res.data.data
                                    .map(a => a.flight_types || 'All')
                                    .flatMap(types => types.split(',').map(t => normalizeType(t)))
                                    .filter(t => t && t !== 'all')
                            ));
                            setAvailableFlightTypes(allTypes);
                            if (allTypes.length > 0) setSelectedFlightType(allTypes[0]);
                        }
                    })
                    .catch(() => setError('Could not fetch availabilities'))
                    .finally(() => setLoading(false));
            }
        }
    }, [selectedActivity, selectedLocation, activities]);

    // Flight type değişince sadece filtrele
    useEffect(() => {
        // Flight type seçili değilse, ilk uygun flight type otomatik seç
        if (!selectedFlightType && availableFlightTypes.length > 0) {
            setSelectedFlightType(availableFlightTypes[0]);
            return;
        }

        const normalizeType = t => t.replace(' Flight', '').trim().toLowerCase();
        const bookingType = normalizeType(selectedFlightType || '');

        const filtered = availabilities.filter(a => {
            if (a.status && a.status.toLowerCase() !== 'open') return false;
            if (a.available !== undefined && a.available <= 0) return false;
            if (!a.flight_types || a.flight_types.toLowerCase() === 'all') return true;
            // Her bir flight_types'ı normalize et ve includes ile kontrol et
            const typesArr = a.flight_types.split(',').map(t => normalizeType(t));
            return typesArr.includes(bookingType);
        });

        console.log('DEBUG: selectedFlightType:', selectedFlightType, 'bookingType:', bookingType, 'availabilities:', availabilities, 'filtered:', filtered);

        setFilteredAvailabilities(filtered);
        setSelectedDate(null);
        setSelectedTime(null);
        setAvailableDates(Array.from(new Set(filtered.map(a => a.date))).filter(date => date));
    }, [selectedFlightType, availabilities, availableFlightTypes]);

    // Flight type değişince selectedDate ve selectedTime sıfırlansın
    useEffect(() => {
        setSelectedDate(null);
        setSelectedTime(null);
    }, [selectedFlightType]);

    const getTimesForDate = (date) => {
        const dateStr = dayjs(date).format('YYYY-MM-DD');
        console.log('Looking for times for date:', dateStr);
        
        const times = filteredAvailabilities.filter(a => a.date === dateStr);
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
                                {/* Flight Type Selector */}
                                {availableFlightTypes.length > 0 && (
                                    <Box sx={{ mb: 2 }}>
                                        {selectedFlightType && (
                                            <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>
                                                Selected Flight Type: <b>{selectedFlightType.charAt(0).toUpperCase() + selectedFlightType.slice(1)}</b>
                                            </Typography>
                                        )}
                                        <FormControl fullWidth>
                                            <InputLabel>Flight Type</InputLabel>
                                            <Select
                                                value={selectedFlightType}
                                                onChange={e => setSelectedFlightType(e.target.value)}
                                                label="Flight Type"
                                            >
                                                {availableFlightTypes.map(type => (
                                                    <MenuItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Box>
                                )}
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
                                                <Typography color="text.secondary">No available dates. Lütfen seçtiğiniz aktivite, lokasyon ve uçuş tipi için uygun uçuş ekleyin veya filtreleri kontrol edin.</Typography>
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