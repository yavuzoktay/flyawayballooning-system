import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Select, InputLabel, FormControl, OutlinedInput, Chip, Box, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import dayjs from 'dayjs';
import axios from 'axios';

const repeatOptions = [
    { value: 'once', label: 'Just Once' }
];

const visibilityOptions = [
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
];

const CreateAvailabilitiesModal = ({ open, onClose, activityName, activityId, onCreated }) => {
    const [activities, setActivities] = useState([]);
    const [selectedActivity, setSelectedActivity] = useState(activityId || '');
    const [repeat, setRepeat] = useState('once');
    const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(dayjs().add(6, 'month').format('YYYY-MM-DD'));
    const [startTime, setStartTime] = useState('09:00');
    const [visibility, setVisibility] = useState('open');
    const [name, setName] = useState('');
    const [capacity, setCapacity] = useState(8);
    const [available, setAvailable] = useState(8);

    useEffect(() => {
        if (open) {
            axios.get('/api/activities').then(res => {
                if (res.data.success) setActivities(res.data.data);
            });
        }
    }, [open]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Örnek: Tek bir availability kaydı oluşturuluyor
        const dayOfWeek = startDate ? new Date(startDate).toLocaleDateString('en-US', { weekday: 'long' }) : '';
        const payload = {
            name,
            schedule: name,
            date: startDate,
            day_of_week: dayOfWeek,
            time: startTime,
            capacity: Number(capacity),
            available: Number(available),
            status: visibility === 'open' ? 'Open' : 'Closed',
            channels: 'All',
        };
        try {
            await axios.post(`/api/activity/${selectedActivity}/availabilities`, payload);
            if (onCreated) onCreated();
            onClose();
        } catch (err) {
            alert('Error creating availability');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Create Availabilities
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
                        <InputLabel>Choose one or more Activities</InputLabel>
                        <Select
                            value={selectedActivity}
                            onChange={e => setSelectedActivity(e.target.value)}
                            label="Choose one or more Activities"
                            renderValue={selected => {
                                const found = activities.find(a => a.id === selected);
                                return found ? found.activity_name : '';
                            }}
                        >
                            {activities.map(a => (
                                <MenuItem key={a.id} value={a.id}>{a.activity_name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
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
                            label="Starting On"
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                        <TextField
                            label="Ending On"
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Starting At"
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