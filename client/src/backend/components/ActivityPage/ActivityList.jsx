import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import axios from 'axios';

const ActivityList = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    duration: '',
    price: '',
    maxCapacity: '',
    location: '',
    type: ''
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await axios.get('/api/activities');
      setActivities(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setError('Failed to fetch activities');
      setLoading(false);
    }
  };

  const handleEditClick = (activity) => {
    setSelectedActivity(activity);
    setEditFormData({
      name: activity.name,
      description: activity.description,
      duration: activity.duration,
      price: activity.price,
      maxCapacity: activity.maxCapacity,
      location: activity.location,
      type: activity.type
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      await axios.put(`/api/activities/${selectedActivity.id}`, editFormData);
      setEditDialogOpen(false);
      setSuccessMessage('Activity updated successfully');
      fetchActivities();
    } catch (error) {
      console.error('Error updating activity:', error);
      setError('Failed to update activity');
    }
  };

  const handleDeleteClick = (activity) => {
    setActivityToDelete(activity);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(`/api/activities/${activityToDelete.id}`);
      setDeleteDialogOpen(false);
      setSuccessMessage('Activity deleted successfully');
      fetchActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
      setError('Failed to delete activity');
    }
  };

  const handleInputChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return <Typography>Loading activities...</Typography>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Activities</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {/* Add new activity logic */}}
        >
          Add Activity
        </Button>
      </Box>

      <Grid container spacing={3}>
        {activities.map((activity) => (
          <Grid item xs={12} sm={6} md={4} key={activity.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box flex={1}>
                    <Typography variant="h6" gutterBottom>
                      {activity.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {activity.description}
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      <Chip label={`${activity.duration} hours`} size="small" />
                      <Chip label={`$${activity.price}`} size="small" color="primary" />
                      <Chip label={`Max: ${activity.maxCapacity}`} size="small" />
                    </Box>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      Location: {activity.location}
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => handleEditClick(activity)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteClick(activity)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Activity</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Name"
              value={editFormData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              fullWidth
            />
            <TextField
              label="Description"
              value={editFormData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
            <Box display="flex" gap={2}>
              <TextField
                label="Duration (hours)"
                value={editFormData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value)}
                type="number"
                fullWidth
              />
              <TextField
                label="Price"
                value={editFormData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                type="number"
                fullWidth
              />
            </Box>
            <Box display="flex" gap={2}>
              <TextField
                label="Max Capacity"
                value={editFormData.maxCapacity}
                onChange={(e) => handleInputChange('maxCapacity', e.target.value)}
                type="number"
                fullWidth
              />
              <TextField
                label="Location"
                value={editFormData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                fullWidth
              />
            </Box>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={editFormData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                label="Type"
              >
                <MenuItem value="balloon">Balloon Flight</MenuItem>
                <MenuItem value="tour">Tour</MenuItem>
                <MenuItem value="experience">Experience</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{activityToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Messages */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ActivityList;