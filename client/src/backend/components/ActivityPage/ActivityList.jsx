import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import React, { useState } from "react";
import EditNoteIcon from '@mui/icons-material/EditNote';
import {Link, useNavigate} from 'react-router-dom';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import dayjs from 'dayjs';
import EditIcon from '@mui/icons-material/Edit';

const ActivityList = ({ activity }) => {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        activity_name: '',
        price: '',
        capacity: '',
        start_date: '',
        end_date: '',
        event_time: '',
        location: '',
        flight_type: '',
        status: 'Live',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [editId, setEditId] = useState(null);
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [editImage, setEditImage] = useState(null);
    const [editImagePreview, setEditImagePreview] = useState(null);
    const [availModalOpen, setAvailModalOpen] = useState(false);
    const [availActivity, setAvailActivity] = useState(null);
    const navigate = useNavigate();

    const handleOpen = () => setOpen(true);
    const handleClose = () => {
        setOpen(false);
        setForm({
            activity_name: '', price: '', capacity: '', start_date: '', end_date: '', event_time: '', location: '', flight_type: '', status: 'Live'
        });
        setError('');
        setSuccess(false);
    };
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        setImage(file);
        if (file) {
            setImagePreview(URL.createObjectURL(file));
        } else {
            setImagePreview(null);
        }
    };
    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccess(false);
        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => formData.append(key, value));
            if (image) formData.append('image', image);
            const res = await fetch('/api/createActivity', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                handleClose();
                window.location.reload();
            } else {
                setError(data.message || 'Error');
            }
        } catch (err) {
            setError('Error saving activity');
        }
        setSaving(false);
    };
    const openEditModal = async (id) => {
        setEditError('');
        setEditId(id);
        setEditOpen(true);
        setEditImage(null);
        setEditImagePreview(null);
        try {
            const res = await fetch(`/api/activity/${id}`);
            const data = await res.json();
            if (data.success) {
                setEditForm(data.data);
                setEditImagePreview(data.data.image ? data.data.image : null);
            } else {
                setEditForm({});
                setEditError('Not found');
            }
        } catch (err) {
            setEditForm({});
            setEditError('Error fetching activity');
        }
    };
    const handleEditChange = (e) => {
        setEditForm({ ...editForm, [e.target.name]: e.target.value });
    };
    const handleEditImageChange = (e) => {
        const file = e.target.files[0];
        setEditImage(file);
        if (file) {
            setEditImagePreview(URL.createObjectURL(file));
        } else {
            setEditImagePreview(null);
        }
    };
    const handleEditSave = async () => {
        setEditSaving(true);
        setEditError('');
        try {
            const formData = new FormData();
            Object.entries(editForm).forEach(([key, value]) => formData.append(key, value));
            if (editImage) formData.append('image', editImage);
            const res = await fetch(`/api/activity/${editId}`, {
                method: 'PUT',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setEditOpen(false);
                window.location.reload();
            } else {
                setEditError(data.message || 'Error');
            }
        } catch (err) {
            setEditError('Error saving activity');
        }
        setEditSaving(false);
    };
    const handleOpenAvailModal = (activity) => {
        navigate(`/activity/${activity.id}/availabilities`);
    };

    return (
        <div className="activity-list-wrap">
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16 }}>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={handleOpen}>
                    Create
                </Button>
            </div>
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>Create Activity</DialogTitle>
                <DialogContent>
                    <TextField margin="dense" label="Activity Name" name="activity_name" value={form.activity_name} onChange={handleChange} fullWidth required />
                    <TextField margin="dense" label="Price" name="price" value={form.price} onChange={handleChange} type="number" fullWidth required />
                    <TextField margin="dense" label="Capacity" name="capacity" value={form.capacity} onChange={handleChange} type="number" fullWidth required />
                    <TextField margin="dense" label="Start Date" name="start_date" value={form.start_date} onChange={handleChange} type="date" fullWidth required InputLabelProps={{ shrink: true }} />
                    <TextField margin="dense" label="End Date" name="end_date" value={form.end_date} onChange={handleChange} type="date" fullWidth required InputLabelProps={{ shrink: true }} />
                    <TextField margin="dense" label="Event Time" name="event_time" value={form.event_time} onChange={handleChange} type="time" fullWidth required InputLabelProps={{ shrink: true }} />
                    <TextField margin="dense" label="Location" name="location" value={form.location} onChange={handleChange} fullWidth required />
                    <TextField margin="dense" label="Flight Type" name="flight_type" value={form.flight_type} onChange={handleChange} select fullWidth required>
                        <MenuItem value="Private">Private</MenuItem>
                        <MenuItem value="Shared">Shared</MenuItem>
                    </TextField>
                    <TextField margin="dense" label="Status" name="status" value={form.status} onChange={handleChange} select fullWidth required>
                        <MenuItem value="Live">Live</MenuItem>
                        <MenuItem value="Inactive">Inactive</MenuItem>
                    </TextField>
                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ marginTop: 16 }} />
                    {imagePreview && <img src={imagePreview} alt="Preview" style={{ maxWidth: 120, marginTop: 8 }} />}
                    {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} disabled={saving}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" color="primary" disabled={saving}>Save</Button>
                </DialogActions>
            </Dialog>
            <TableContainer component={Paper} style={{ marginTop: "0px" }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>S. No.</TableCell>
                            <TableCell>Activity Name</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Action</TableCell>
                            <TableCell>Availabilities</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {
                            activity.map((item, index) => {
                                return(
                                    <TableRow key={index}>
                                        <TableCell>{index+1}</TableCell>
                                        <TableCell>{item?.activity_name}</TableCell>
                                        <TableCell>{item?.status}</TableCell>
                                        <TableCell><Link to="#" className="edit-activity" onClick={() => openEditModal(item.id)}><EditNoteIcon /></Link></TableCell>
                                        <TableCell>
                                            <EditIcon style={{ cursor: 'pointer' }} onClick={() => handleOpenAvailModal(item)} />
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        }
                    </TableBody>
                </Table>
            </TableContainer>
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Activity</DialogTitle>
                <DialogContent>
                    <TextField margin="dense" label="Activity Name" name="activity_name" value={editForm.activity_name || ''} onChange={handleEditChange} fullWidth required />
                    <TextField margin="dense" label="Price" name="price" value={editForm.price || ''} onChange={handleEditChange} type="number" fullWidth required />
                    <TextField margin="dense" label="Capacity" name="capacity" value={editForm.capacity || ''} onChange={handleEditChange} type="number" fullWidth required />
                    <TextField margin="dense" label="Start Date" name="start_date" value={editForm.start_date || ''} onChange={handleEditChange} type="date" fullWidth required InputLabelProps={{ shrink: true }} />
                    <TextField margin="dense" label="End Date" name="end_date" value={editForm.end_date || ''} onChange={handleEditChange} type="date" fullWidth required InputLabelProps={{ shrink: true }} />
                    <TextField margin="dense" label="Event Time" name="event_time" value={editForm.event_time || ''} onChange={handleEditChange} type="time" fullWidth required InputLabelProps={{ shrink: true }} />
                    <TextField margin="dense" label="Location" name="location" value={editForm.location || ''} onChange={handleEditChange} fullWidth required />
                    <TextField margin="dense" label="Flight Type" name="flight_type" value={editForm.flight_type || ''} onChange={handleEditChange} select fullWidth required>
                        <MenuItem value="Private">Private</MenuItem>
                        <MenuItem value="Shared">Shared</MenuItem>
                    </TextField>
                    <TextField margin="dense" label="Status" name="status" value={editForm.status || ''} onChange={handleEditChange} select fullWidth required>
                        <MenuItem value="Live">Live</MenuItem>
                        <MenuItem value="Inactive">Inactive</MenuItem>
                    </TextField>
                    <input type="file" accept="image/*" onChange={handleEditImageChange} style={{ marginTop: 16 }} />
                    {editImagePreview && <img src={editImagePreview} alt="Preview" style={{ maxWidth: 120, marginTop: 8 }} />}
                    {editError && <div style={{ color: 'red', marginTop: 8 }}>{editError}</div>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditOpen(false)} disabled={editSaving}>Cancel</Button>
                    <Button onClick={handleEditSave} variant="contained" color="primary" disabled={editSaving}>Save</Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}

export default ActivityList;