import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, CircularProgress, FormControl, InputLabel, Select, MenuItem, Box, Checkbox, FormControlLabel, FormGroup } from '@mui/material';
import dayjs from 'dayjs';
import axios from 'axios';

const RebookAvailabilityModal = ({ open, onClose, location, onSlotSelect, flightType, onFlightTypesChange, onVoucherTypesChange }) => {
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
    const [selectedFlightTypes, setSelectedFlightTypes] = useState([]);
    const [selectedVoucherTypes, setSelectedVoucherTypes] = useState([]);

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
                            // Initialize flight types based on activity data
                            const flightTypes = ['private', 'shared'];
                            setSelectedFlightTypes(flightTypes);
                            // Initialize voucher types
                            const voucherTypes = ['weekday morning', 'flexible weekday', 'any day flight'];
                            setSelectedVoucherTypes(voucherTypes);
                        }
                    })
                    .catch(() => setError('Could not fetch availabilities'))
                    .finally(() => setLoading(false));
            }
        }
    }, [selectedActivity, selectedLocation, activities]);

    // Flight type değişince sadece filtrele
    useEffect(() => {
        if (selectedFlightTypes.length === 0 || availabilities.length === 0) return;

        const normalizeType = t => t.replace(' Flight', '').trim().toLowerCase();
        const selectedTypes = selectedFlightTypes.map(t => normalizeType(t));
 
        const filtered = availabilities.filter(a => {
            if (a.status && a.status.toLowerCase() !== 'open') return false;
            if (a.available !== undefined && a.available <= 0) return false;
            // Filter out past dates and times
            const slotDateTime = dayjs(`${a.date} ${a.time}`);
            if (slotDateTime.isBefore(dayjs())) return false;
            if (!a.flight_types || a.flight_types.toLowerCase() === 'all') return true;
            // Her bir flight_types'ı normalize et ve includes ile kontrol et
            const typesArr = a.flight_types.split(',').map(t => normalizeType(t));
            return selectedTypes.some(selectedType => typesArr.includes(selectedType));
        });
 
        console.log('DEBUG: selectedFlightTypes:', selectedFlightTypes, 'availabilities:', availabilities, 'filtered:', filtered);
 
        setFilteredAvailabilities(filtered);
        setSelectedDate(null);
        setSelectedTime(null);
        setAvailableDates(Array.from(new Set(filtered.map(a => a.date))).filter(date => date));
    }, [selectedFlightTypes, availabilities]);

    // Flight type değişince selectedDate ve selectedTime sıfırlansın
    useEffect(() => {
        setSelectedDate(null);
        setSelectedTime(null);
    }, [selectedFlightTypes]);

    // Notify parent component when flight types change
    useEffect(() => {
        if (onFlightTypesChange) {
            onFlightTypesChange(selectedFlightTypes);
        }
    }, [selectedFlightTypes, onFlightTypesChange]);

    // Notify parent component when voucher types change
    useEffect(() => {
        if (onVoucherTypesChange) {
            onVoucherTypesChange(selectedVoucherTypes);
        }
    }, [selectedVoucherTypes, onVoucherTypesChange]);

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
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="h6" sx={{ mb: 2 }}>Flight Type:</Typography>
                                    <FormGroup row>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={selectedFlightTypes.includes('private')}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedFlightTypes(prev => [...prev, 'private']);
                                                        } else {
                                                            setSelectedFlightTypes(prev => prev.filter(t => t !== 'private'));
                                                        }
                                                    }}
                                                />
                                            }
                                            label="Private"
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={selectedFlightTypes.includes('shared')}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedFlightTypes(prev => [...prev, 'shared']);
                                                        } else {
                                                            setSelectedFlightTypes(prev => prev.filter(t => t !== 'shared'));
                                                        }
                                                    }}
                                                />
                                            }
                                            label="Shared"
                                        />
                                    </FormGroup>
                                </Box>

                                {/* Voucher Type Selector */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="h6" sx={{ mb: 2 }}>Voucher Type:</Typography>
                                    <FormGroup row>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={selectedVoucherTypes.includes('weekday morning')}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedVoucherTypes(prev => [...prev, 'weekday morning']);
                                                        } else {
                                                            setSelectedVoucherTypes(prev => prev.filter(t => t !== 'weekday morning'));
                                                        }
                                                    }}
                                                />
                                            }
                                            label="Weekday Morning"
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={selectedVoucherTypes.includes('flexible weekday')}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedVoucherTypes(prev => [...prev, 'flexible weekday']);
                                                        } else {
                                                            setSelectedVoucherTypes(prev => prev.filter(t => t !== 'flexible weekday'));
                                                        }
                                                    }}
                                                />
                                            }
                                            label="Flexible Weekday"
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={selectedVoucherTypes.includes('any day flight')}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedVoucherTypes(prev => [...prev, 'any day flight']);
                                                        } else {
                                                            setSelectedVoucherTypes(prev => prev.filter(t => t !== 'any day flight'));
                                                        }
                                                    }}
                                                />
                                            }
                                            label="Any Day Flight"
                                        />
                                    </FormGroup>
                                </Box>
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
                                                    const isPastDate = d.isBefore(dayjs(), 'day');
                                                    const hasAvailableTimes = getTimesForDate(d.toDate()).some(slot => {
                                                        const slotDateTime = dayjs(`${dateStr} ${slot.time}`);
                                                        return slotDateTime.isAfter(dayjs()) && slot.available > 0;
                                                    });
                                                    const isDisabled = isPastDate || !hasAvailableTimes;
                                                    return (
                                                        <Button
                                                            key={dateStr}
                                                            variant={isSelected ? 'contained' : 'outlined'}
                                                            onClick={() => !isDisabled && setSelectedDate(d.toDate())}
                                                            disabled={isDisabled}
                                                            sx={{
                                                                opacity: isDisabled ? 0.5 : 1,
                                                                backgroundColor: isDisabled ? '#f5f5f5' : 'inherit',
                                                                color: isDisabled ? '#999' : 'inherit',
                                                                cursor: isDisabled ? 'not-allowed' : 'pointer'
                                                            }}
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
                                                        const slotDateTime = dayjs(`${dayjs(selectedDate).format('YYYY-MM-DD')} ${slot.time}`);
                                                        const isPastTime = slotDateTime.isBefore(dayjs());
                                                        const isDisabled = !isAvailable || isPastTime;
                                                        return (
                                                            <Button
                                                                key={slot.id}
                                                                variant={isSelected ? 'contained' : 'outlined'}
                                                                color={isAvailable ? 'primary' : 'inherit'}
                                                                disabled={isDisabled}
                                                                onClick={() => !isDisabled && setSelectedTime(slot.time)}
                                                                sx={{
                                                                    opacity: isDisabled ? 0.5 : 1,
                                                                    backgroundColor: isDisabled ? '#f5f5f5' : 'inherit',
                                                                    color: isDisabled ? '#999' : 'inherit',
                                                                    cursor: isDisabled ? 'not-allowed' : 'pointer'
                                                                }}
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
                        onSlotSelect(selectedDate, selectedTime, activityId, selectedActivity, selectedLocation, selectedFlightTypes, selectedVoucherTypes);
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