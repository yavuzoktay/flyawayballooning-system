import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const CreateAvailabilitiesModal = ({ open, onClose, activityId, onSuccess }) => {
  const [formData, setFormData] = useState({
    startTime: dayjs(),
    endTime: dayjs().add(2, 'hour'),
    maxCapacity: '',
    price: '',
    type: 'shared'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/availabilities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityId,
          ...formData,
          startTime: formData.startTime.toISOString(),
          endTime: formData.endTime.toISOString()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        onSuccess();
        onClose();
        setFormData({
          startTime: dayjs(),
          endTime: dayjs().add(2, 'hour'),
          maxCapacity: '',
          price: '',
          type: 'shared'
        });
      } else {
        setError(data.message || 'Failed to create availability');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'shared':
        return 'Shared Flight';
      case 'private':
        return 'Private Flight';
      case 'group':
        return 'Group Flight';
      default:
        return 'Unknown Type';
    }
  };

  const getPriceLabel = (type) => {
    switch (type) {
      case 'shared':
        return 'Per Person Price';
      case 'private':
        return 'Total Group Price';
      case 'group':
        return 'Per Person Price';
      default:
        return 'Price';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Availability</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateTimePicker
              label="Start Time"
              value={formData.startTime}
              onChange={(newValue) => handleInputChange('startTime', newValue)}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
            <DateTimePicker
              label="End Time"
              value={formData.endTime}
              onChange={(newValue) => handleInputChange('endTime', newValue)}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </LocalizationProvider>
          
          <FormControl fullWidth>
            <InputLabel>Flight Type</InputLabel>
            <Select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              label="Flight Type"
            >
              <MenuItem value="shared">Shared Flight</MenuItem>
              <MenuItem value="private">Private Flight</MenuItem>
              <MenuItem value="group">Group Flight</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Max Capacity"
            value={formData.maxCapacity}
            onChange={(e) => handleInputChange('maxCapacity', e.target.value)}
            type="number"
            fullWidth
          />

          <TextField
            label={getPriceLabel(formData.type)}
            value={formData.price}
            onChange={(e) => handleInputChange('price', e.target.value)}
            type="number"
            fullWidth
          />

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Availability'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateAvailabilitiesModal; 