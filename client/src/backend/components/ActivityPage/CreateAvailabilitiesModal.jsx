/* webpackChunkName: "CreateAvailabilitiesModal" */
import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Select, InputLabel, FormControl, OutlinedInput, Chip, Box, Typography, Checkbox, FormControlLabel, FormGroup } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import dayjs from 'dayjs';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const repeatOptions = [
    { value: 'once', label: 'Just Once' },
    { value: 'everyday', label: 'Repeat Daily' },
    { value: 'weekdays', label: 'Repeat Weekdays' },
    { value: 'weekends', label: 'Repeat Weekends' },
];

const visibilityOptions = [
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
];

const CreateAvailabilitiesModal = ({ open, onClose, activityName, activityId, onCreated }) => {
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [selectedActivity, setSelectedActivity] = useState(activityId || '');
    const [repeat, setRepeat] = useState('once');
    const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(dayjs().add(6, 'month').format('YYYY-MM-DD'));

    // When repeat is 'once', set endDate to startDate
    useEffect(() => {
        if (repeat === 'once') {
            setEndDate(startDate);
        }
    }, [repeat, startDate]);
    const [startTime, setStartTime] = useState('09:00');
    const [visibility, setVisibility] = useState('open');
    const [name, setName] = useState('');
    const [capacity, setCapacity] = useState(8);
    const [available, setAvailable] = useState(8);
    const [flightTypes, setFlightTypes] = useState(['Shared']); // Default to Shared
    const [voucherTypes, setVoucherTypes] = useState([]); // Default to empty array
    const [availabilityCount, setAvailabilityCount] = useState(0);

    useEffect(() => {
        if (open) {
            axios.get('/api/activities').then(res => {
                if (res.data.success) setActivities(res.data.data);
            });
        }
    }, [open]);

    // Set selectedActivity when modal opens with activityId
    useEffect(() => {
        if (open && activityId) {
            setSelectedActivity(activityId);
        }
    }, [open, activityId]);

    // Calculate how many availabilities will be created
    useEffect(() => {
        if (!startDate || !endDate) {
            setAvailabilityCount(0);
            return;
        }

        const availabilities = [];
        let currentDate = new Date(startDate);
        const endDateObj = new Date(endDate);

        while (currentDate <= endDateObj) {
            const dayOfWeek = currentDate.getDay();
            let shouldCreate = false;

            switch (repeat) {
                case 'once':
                    shouldCreate = currentDate.getTime() === new Date(startDate).getTime();
                    break;
                case 'everyday':
                    shouldCreate = true;
                    break;
                case 'weekdays':
                    shouldCreate = dayOfWeek >= 1 && dayOfWeek <= 5;
                    break;
                case 'weekends':
                    shouldCreate = dayOfWeek === 0 || dayOfWeek === 6;
                    break;
            }

            if (shouldCreate) {
                // Create date string in local timezone to prevent 1-day offset
                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                const localDateString = `${year}-${month}-${day}`;
                
                availabilities.push({
                    schedule: name,
                    date: localDateString,
                    day_of_week: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
                    time: startTime,
                    capacity: parseInt(capacity),
                    available: parseInt(available),
                    status: visibility,
                    channels: 'All',
                    flight_types: flightTypes.length > 0 ? flightTypes.join(',') : 'All',
                    voucher_types: voucherTypes.length > 0 ? voucherTypes.join(',') : 'All'
                });
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        setAvailabilityCount(availabilities.length);
    }, [startDate, endDate, repeat]);

    const handleSubmit = async () => {
        // For 'once' repeat, endDate is not required as it's set to startDate
        const isEndDateRequired = repeat !== 'once';
        if (!name || !selectedActivity || !startDate || (isEndDateRequired && !endDate) || !startTime || !capacity || !available) {
            alert('Please fill in all required fields');
            return;
        }

        const availabilities = [];
        let currentDate = new Date(startDate);
        const endDateObj = new Date(endDate);

        while (currentDate <= endDateObj) {
            const dayOfWeek = currentDate.getDay();
            let shouldCreate = false;

            switch (repeat) {
                case 'once':
                    shouldCreate = currentDate.getTime() === new Date(startDate).getTime();
                    break;
                case 'everyday':
                    shouldCreate = true;
                    break;
                case 'weekdays':
                    shouldCreate = dayOfWeek >= 1 && dayOfWeek <= 5;
                    break;
                case 'weekends':
                    shouldCreate = dayOfWeek === 0 || dayOfWeek === 6;
                    break;
            }

            if (shouldCreate) {
                // Create date string in local timezone to prevent 1-day offset
                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                const localDateString = `${year}-${month}-${day}`;
                
                availabilities.push({
                    schedule: name,
                    date: localDateString,
                    day_of_week: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
                    time: startTime,
                    capacity: parseInt(capacity),
                    available: parseInt(available),
                    status: visibility,
                    channels: 'All',
                    flight_types: flightTypes.length > 0 ? flightTypes.join(',') : 'All',
                    voucher_types: voucherTypes.length > 0 ? voucherTypes.join(',') : 'All'
                });
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        try {
            await axios.post(`/api/activity/${selectedActivity}/availabilities`, { availabilities });
            onCreated();
            onClose();
            // Redirect to availabilities page after successful creation
            navigate(`/activity/${selectedActivity}/availabilities`);
        } catch (error) {
            alert('Failed to create availabilities');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Create Availabilities{activityName ? ` - ${activityName}` : ''}
                <IconButton onClick={onClose}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent>
                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField
                        label="Name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        helperText="Choose a name for this group of availabilities. Later, you'll be able to re-use this definition each year, and report on this group of availabilities."
                        fullWidth
                        margin="dense"
                    />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Choose how often to repeat</InputLabel>
                        <Select
                            value={repeat}
                            onChange={e => setRepeat(e.target.value)}
                            label="Choose how often to repeat"
                        >
                            {repeatOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label={repeat === 'once' ? 'Date' : 'Starting On'}
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                        {repeat !== 'once' && (
                            <TextField
                                label="Ending On"
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Time"
                            type="time"
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Capacity"
                            type="number"
                            value={capacity}
                            onChange={e => setCapacity(e.target.value)}
                            fullWidth
                            margin="dense"
                        />
                        <TextField
                            label="Available"
                            type="number"
                            value={available}
                            onChange={e => setAvailable(e.target.value)}
                            fullWidth
                            margin="dense"
                        />
                    </Box>
                    <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 500 }}>Flight Types</div>
                    <FormGroup row sx={{ mb: 2, mt: 1 }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={flightTypes.includes('Shared')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setFlightTypes(prev => [...prev, 'Shared']);
                                        } else {
                                            setFlightTypes(prev => prev.filter(type => type !== 'Shared'));
                                        }
                                    }}
                                />
                            }
                            label="Shared Flight"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={flightTypes.includes('Private')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setFlightTypes(prev => [...prev, 'Private']);
                                        } else {
                                            setFlightTypes(prev => prev.filter(type => type !== 'Private'));
                                        }
                                    }}
                                />
                            }
                            label="Private Flight"
                        />
                    </FormGroup>
                    <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 500 }}>Voucher Type</div>
                    <FormGroup row sx={{ mb: 2, mt: 1 }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={voucherTypes.includes('Weekday Morning')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setVoucherTypes(prev => [...prev, 'Weekday Morning']);
                                        } else {
                                            setVoucherTypes(prev => prev.filter(type => type !== 'Weekday Morning'));
                                        }
                                    }}
                                />
                            }
                            label="Weekday Morning"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={voucherTypes.includes('Flexible Weekday')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setVoucherTypes(prev => [...prev, 'Flexible Weekday']);
                                        } else {
                                            setVoucherTypes(prev => prev.filter(type => type !== 'Flexible Weekday'));
                                        }
                                    }}
                                />
                            }
                            label="Flexible Weekday"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={voucherTypes.includes('Any Day Flight')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setVoucherTypes(prev => [...prev, 'Any Day Flight']);
                                        } else {
                                            setVoucherTypes(prev => prev.filter(type => type !== 'Any Day Flight'));
                                        }
                                    }}
                                />
                            }
                            label="Any Day Flight"
                        />
                    </FormGroup>
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Visibility</InputLabel>
                        <Select
                            value={visibility}
                            onChange={e => setVisibility(e.target.value)}
                            label="Visibility"
                        >
                            {visibilityOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                        </Select>
                    </FormControl>
                    
                    {availabilityCount > 0 && (
                        <Box sx={{ 
                            mt: 2, 
                            p: 2, 
                            bgcolor: 'info.light', 
                            borderRadius: 1,
                            textAlign: 'center'
                        }}>
                            <Typography variant="body2" color="info.contrastText">
                                {availabilityCount} availability slot{availabilityCount !== 1 ? 's' : ''} will be created
                            </Typography>
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button variant="contained" color="primary" fullWidth size="large" onClick={handleSubmit}>
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateAvailabilitiesModal; 