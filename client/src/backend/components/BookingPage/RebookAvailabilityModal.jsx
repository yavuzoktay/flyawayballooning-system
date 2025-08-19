import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, CircularProgress, FormControl, InputLabel, Select, MenuItem, Box, Checkbox, FormControlLabel, FormGroup, IconButton } from '@mui/material';
import dayjs from 'dayjs';
import axios from 'axios';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

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

    // Calendar state (Live Availability style)
    const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));

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
                        if (location) {
                            setSelectedLocation(location);
                        }
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
            // Reset previous state to avoid stale calendar when changing activity/location
            setAvailabilities([]);
            setFilteredAvailabilities([]);
            setAvailableDates([]);
            setSelectedDate(null);
            setSelectedTime(null);

            setLoading(true);
            setError(null);
            const activity = activities.find(a => a.activity_name === selectedActivity && a.location === selectedLocation);
            if (activity) {
                setActivityId(activity.id);
                axios.get(`/api/activity/${activity.id}/availabilities`)
                    .then(res => {
                        if (res.data.success) {
                            const data = Array.isArray(res.data.data) ? res.data.data : [];
                            setAvailabilities(data);
                            const flightTypes = ['private', 'shared'];
                            setSelectedFlightTypes(flightTypes);
                            const voucherTypes = ['weekday morning', 'flexible weekday', 'any day flight'];
                            setSelectedVoucherTypes(voucherTypes);
                            const firstDate = data?.[0]?.date;
                            if (firstDate) setCurrentMonth(dayjs(firstDate).startOf('month'));
                        } else {
                            setAvailabilities([]);
                        }
                    })
                    .catch(() => setError('Could not fetch availabilities'))
                    .finally(() => setLoading(false));
            }
        }
    }, [selectedActivity, selectedLocation, activities]);

    // Flight type değişince sadece filtrele
    useEffect(() => {
        // If no flight types selected, clear
        if (selectedFlightTypes.length === 0) {
            setFilteredAvailabilities([]);
            setAvailableDates([]);
            setSelectedDate(null);
            setSelectedTime(null);
            return;
        }

        const normalizeType = t => t.replace(' Flight', '').trim().toLowerCase();
        const selectedTypes = selectedFlightTypes.map(t => normalizeType(t));
 
        const filtered = availabilities.filter(a => {
            if (a.status && a.status.toLowerCase() !== 'open') return false;
            if (a.available !== undefined && a.available <= 0) return false;
            const slotDateTime = dayjs(`${a.date} ${a.time}`);
            if (slotDateTime.isBefore(dayjs())) return false;
            if (!a.flight_types || a.flight_types.toLowerCase() === 'all') return true;
            const typesArr = a.flight_types.split(',').map(t => normalizeType(t));
            return selectedTypes.some(selectedType => typesArr.includes(selectedType));
        });
 
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
        const times = filteredAvailabilities.filter(a => a.date === dateStr);
        return times;
    };

    // Live Availability helpers
    const monthLabel = currentMonth.format('MMMM YYYY');
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const startDay = startOfMonth.day(); // 0-6 (Sun-Sat)

    const buildDayCells = () => {
        const cells = [];
        // Create a 6-week grid (42 cells)
        const firstCellDate = startOfMonth.startOf('week');
        for (let i = 0; i < 42; i++) {
            const d = firstCellDate.add(i, 'day');
            const inCurrentMonth = d.isSame(currentMonth, 'month');
            const isPast = d.isBefore(dayjs(), 'day');
            const isSelected = selectedDate && dayjs(selectedDate).isSame(d, 'day');
            // Aggregate availability for this date
            const slots = filteredAvailabilities.filter(a => a.date === d.format('YYYY-MM-DD'));
            const totalAvailable = slots.reduce((acc, s) => acc + (Number(s.available) || 0), 0);
            const soldOut = slots.length > 0 && totalAvailable <= 0;
            const isSelectable = inCurrentMonth && !isPast && slots.length > 0 && !soldOut;

            cells.push(
                <div
                    key={d.format('YYYY-MM-DD')}
                    onClick={() => isSelectable && (setSelectedDate(d.toDate()), setSelectedTime(null))}
                    style={{
                        width: 'calc((100% - 4px * 6) / 7)',
                        aspectRatio: '1 / 1',
                        borderRadius: 10,
                        background: isSelected ? '#56C1FF' : (isSelectable ? '#22c55e' : '#f0f0f0'),
                        color: isSelected ? '#fff' : (isSelectable ? '#fff' : '#999'),
                        display: inCurrentMonth ? 'flex' : 'none',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        cursor: isSelectable ? 'pointer' : 'default',
                        userSelect: 'none',
                        fontSize: 14
                    }}
                >
                    <div>{d.date()}</div>
                    <div style={{ fontSize: 10, fontWeight: 600 }}>
                        {slots.length === 0 ? '' : (soldOut ? 'Sold Out' : `${totalAvailable} Spaces`)}
                    </div>
                </div>
            );
        }
        return cells;
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
                                            const activity = activities.find(a => a.activity_name === activityName);
                                            if (activity) {
                                                setSelectedLocation(activity.location);
                                                setCurrentMonth(dayjs().startOf('month'));
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
                                            activities
                                                .filter(a => a.activity_name === selectedActivity)
                                                .map((activity) => (
                                                    <MenuItem key={activity.id} value={activity.location}>
                                                        {activity.location}
                                                    </MenuItem>
                                                ))
                                            : 
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
                                        {/* Live Availability style calendar */}
                                        <Box sx={{ mb: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                                <IconButton onClick={() => setCurrentMonth(prev => prev.subtract(1, 'month'))} size="small"><ChevronLeftIcon fontSize="small" /></IconButton>
                                                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>{monthLabel}</Typography>
                                                <IconButton onClick={() => setCurrentMonth(prev => prev.add(1, 'month'))} size="small"><ChevronRightIcon fontSize="small" /></IconButton>
                                            </Box>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', mb: 1 }}>
                                                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(w => (
                                                    <div key={w} style={{ textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: 12 }}>{w}</div>
                                                ))}
                                            </Box>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {buildDayCells()}
                                            </div>
                                        </Box>

                                        {selectedDate && (
                                            <>
                                                <Typography variant="subtitle1" sx={{ mb: 1 }}>Available Times for {dayjs(selectedDate).format('DD/MM/YYYY')}:</Typography>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                                    {getTimesForDate(selectedDate).length === 0 && (
                                                        <Box>
                                                            <Typography color="text.secondary">No available times</Typography>
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
                        onSlotSelect(selectedDate, selectedTime, activityId, selectedActivity, selectedLocation, selectedFlightTypes, selectedVoucherTypes);
                    }}
                    disabled={!selectedDate || !selectedTime || !selectedActivity || !selectedLocation}
                    variant="contained"
                >
                    Confirm
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RebookAvailabilityModal; 