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
import DeleteIcon from '@mui/icons-material/Delete';
import { Checkbox, FormControlLabel, FormGroup } from '@mui/material';
import CreateAvailabilitiesModal from './CreateAvailabilitiesModal';

const ActivityList = ({ activity }) => {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        activity_name: '',
        shared_price: '',
        private_price: '',
        capacity: '',
        location: '',
        flight_type: [], // now array
        voucher_type: [], // voucher types array
        status: 'Live',
    });
    const [priceFieldLabel, setPriceFieldLabel] = useState('Price');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [editPriceFieldLabel, setEditPriceFieldLabel] = useState('Price');
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
            activity_name: '', shared_price: '', private_price: '', capacity: '', location: '', flight_type: [], voucher_type: [], status: 'Live'
        });
        setPriceFieldLabel('Price');
        setError('');
        setSuccess(false);
    };
    // Update price field label based on flight type
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'flight_type') {
            let newTypes = [...form.flight_type];
            if (checked) {
                newTypes.push(value);
            } else {
                newTypes = newTypes.filter(t => t !== value);
            }
            setForm({ ...form, flight_type: newTypes });
        } else if (name === 'voucher_type') {
            let newTypes = [...form.voucher_type];
            if (checked) {
                newTypes.push(value);
            } else {
                newTypes = newTypes.filter(t => t !== value);
            }
            setForm({ ...form, voucher_type: newTypes });
        } else {
            setForm({ ...form, [name]: value });
            if (name === 'flight_type') {
                setPriceFieldLabel(value === 'Private' ? 'Group Price' : 'Price');
            }
        }
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
            Object.entries(form).forEach(([key, value]) => {
                if (key === 'flight_type' || key === 'voucher_type') {
                    formData.append(key, value.join(','));
                } else {
                    formData.append(key, value);
                }
            });
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
    // Update edit price field label based on flight type
    const handleEditChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'flight_type') {
            let newTypes = Array.isArray(editForm.flight_type) ? [...editForm.flight_type] : (typeof editForm.flight_type === 'string' ? editForm.flight_type.split(',') : []);
            if (checked) {
                newTypes.push(value);
            } else {
                newTypes = newTypes.filter(t => t !== value);
            }
            setEditForm({ ...editForm, flight_type: newTypes });
        } else if (name === 'voucher_type') {
            let newTypes = Array.isArray(editForm.voucher_type) ? [...editForm.voucher_type] : (typeof editForm.voucher_type === 'string' ? editForm.voucher_type.split(',') : []);
            if (checked) {
                newTypes.push(value);
            } else {
                newTypes = newTypes.filter(t => t !== value);
            }
            setEditForm({ ...editForm, voucher_type: newTypes });
        } else {
            setEditForm({ ...editForm, [name]: value });
            if (name === 'flight_type') {
                setEditPriceFieldLabel(value === 'Private' ? 'Group Price' : 'Price');
            }
        }
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
            Object.entries(editForm).forEach(([key, value]) => {
                if (key === 'flight_type' || key === 'voucher_type') {
                    formData.append(key, Array.isArray(value) ? value.join(',') : value);
                } else {
                    formData.append(key, value);
                }
            });
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
    const handleDeleteActivity = async () => {
        if (!window.confirm('Are you sure you want to delete this activity? This action cannot be undone.')) return;
        setEditSaving(true);
        setEditError('');
        try {
            const res = await fetch(`/api/activity/${editId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setEditOpen(false);
                window.location.reload();
            } else {
                setEditError(data.message || 'Error deleting activity');
            }
        } catch (err) {
            setEditError('Error deleting activity');
        }
        setEditSaving(false);
    };
    const handleOpenAvailModal = (activity) => {
        setAvailActivity(activity);
        setAvailModalOpen(true);
    };

    // Ensure activity is always an array
    const safeActivity = Array.isArray(activity) ? activity : [];

    return (
        <div className="activity-list-wrap">
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16 }}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen} sx={{ backgroundColor: '#1976d2', color: 'white' }}>
                    CREATE
                </Button>
            </div>
            
            {/* Create Activity Dialog */}
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>Create Activity</DialogTitle>
                <DialogContent>
                    <TextField margin="dense" label="Activity Name" name="activity_name" value={form.activity_name} onChange={handleChange} fullWidth required />
                    <TextField margin="dense" label="Capacity" name="capacity" value={form.capacity} onChange={handleChange} type="number" fullWidth required />
                    <TextField margin="dense" label="Location" name="location" value={form.location} onChange={handleChange} fullWidth required />
                    <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 500 }}>Flight Type</div>
                    <FormGroup row sx={{ mb: 2, mt: 1 }}>
                        <FormControlLabel
                            control={<Checkbox checked={form.flight_type.includes('Private')} onChange={handleChange} name="flight_type" value="Private" />}
                            label="Private"
                        />
                        <FormControlLabel
                            control={<Checkbox checked={form.flight_type.includes('Shared')} onChange={handleChange} name="flight_type" value="Shared" />}
                            label="Shared"
                        />
                    </FormGroup>
                    <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 500 }}>Voucher Type</div>
                    <FormGroup row sx={{ mb: 2, mt: 1 }}>
                        <FormControlLabel
                            control={<Checkbox checked={form.voucher_type.includes('Weekday Morning')} onChange={handleChange} name="voucher_type" value="Weekday Morning" />}
                            label="Weekday Morning"
                        />
                        <FormControlLabel
                            control={<Checkbox checked={form.voucher_type.includes('Flexible Weekday')} onChange={handleChange} name="voucher_type" value="Flexible Weekday" />}
                            label="Flexible Weekday"
                        />
                        <FormControlLabel
                            control={<Checkbox checked={form.voucher_type.includes('Any Day Flight')} onChange={handleChange} name="voucher_type" value="Any Day Flight" />}
                            label="Any Day Flight"
                        />
                    </FormGroup> 
                    <TextField margin="dense" label="Shared Flight Price" name="shared_price" value={form.shared_price} onChange={handleChange} type="number" fullWidth required />
                    <TextField margin="dense" label="Private Flight Group Price" name="private_price" value={form.private_price} onChange={handleChange} type="number" fullWidth required />
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

            {/* Activity Table */}
            <TableContainer component={Paper} style={{ marginTop: "0px" }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>S. No.</TableCell>
                            <TableCell>Activity Name</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Action</TableCell>
                            <TableCell>Availabilities</TableCell>
                            <TableCell>Resources</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {safeActivity.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{item?.activity_name}</TableCell>
                                <TableCell>{item?.status || 'Live'}</TableCell>
                                <TableCell>
                                    <Link to="#" className="edit-activity" onClick={() => openEditModal(item.id)}>
                                        <EditNoteIcon />
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    <EditIcon style={{ cursor: 'pointer' }} onClick={() => handleOpenAvailModal(item)} />
                                </TableCell>
                                <TableCell>
                                    <EditIcon style={{ cursor: 'pointer' }} onClick={() => alert(`Resources for activity: ${item.activity_name}`)} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Edit Activity Dialog */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Activity</DialogTitle>
                <DialogContent>
                    <TextField margin="dense" label="Activity Name" name="activity_name" value={editForm.activity_name || ''} onChange={handleEditChange} fullWidth required />
                    <TextField margin="dense" label="Capacity" name="capacity" value={editForm.capacity || ''} onChange={handleEditChange} type="number" fullWidth required />
                    <TextField margin="dense" label="Location" name="location" value={editForm.location || ''} onChange={handleEditChange} fullWidth required />
                    <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 500 }}>Flight Type</div>
                    <FormGroup row sx={{ mb: 2, mt: 1 }}>
                        <FormControlLabel
                            control={<Checkbox checked={Array.isArray(editForm.flight_type) ? editForm.flight_type.includes('Private') : (typeof editForm.flight_type === 'string' ? editForm.flight_type.split(',').includes('Private') : false)} onChange={handleEditChange} name="flight_type" value="Private" />}
                            label="Private"
                        />
                        <FormControlLabel
                            control={<Checkbox checked={Array.isArray(editForm.flight_type) ? editForm.flight_type.includes('Shared') : (typeof editForm.flight_type === 'string' ? editForm.flight_type.split(',').includes('Shared') : false)} onChange={handleEditChange} name="flight_type" value="Shared" />}
                            label="Shared"
                        />
                    </FormGroup>
                    <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 500 }}>Voucher Type</div>
                    <FormGroup row sx={{ mb: 2, mt: 1 }}>
                        <FormControlLabel
                            control={<Checkbox checked={Array.isArray(editForm.voucher_type) ? editForm.voucher_type.includes('Weekday Morning') : (typeof editForm.voucher_type === 'string' ? editForm.voucher_type.split(',').includes('Weekday Morning') : false)} onChange={handleEditChange} name="voucher_type" value="Weekday Morning" />}
                            label="Weekday Morning"
                        />
                        <FormControlLabel
                            control={<Checkbox checked={Array.isArray(editForm.voucher_type) ? editForm.voucher_type.includes('Flexible Weekday') : (typeof editForm.voucher_type === 'string' ? editForm.voucher_type.split(',').includes('Flexible Weekday') : false)} onChange={handleEditChange} name="voucher_type" value="Flexible Weekday" />}
                            label="Flexible Weekday"
                        />
                        <FormControlLabel
                            control={<Checkbox checked={Array.isArray(editForm.voucher_type) ? editForm.voucher_type.includes('Any Day Flight') : (typeof editForm.voucher_type === 'string' ? editForm.voucher_type.split(',').includes('Any Day Flight') : false)} onChange={handleEditChange} name="voucher_type" value="Any Day Flight" />}
                            label="Any Day Flight"
                        />
                    </FormGroup>
                    <TextField margin="dense" label="Shared Flight Price" name="shared_price" value={editForm.shared_price || ''} onChange={handleEditChange} type="number" fullWidth required />
                    <TextField margin="dense" label="Private Flight Group Price" name="private_price" value={editForm.private_price || ''} onChange={handleEditChange} type="number" fullWidth required />
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
                    <Button onClick={handleDeleteActivity} color="error" startIcon={<DeleteIcon />} disabled={editSaving} style={{marginRight: 'auto'}}>
                        Delete
                    </Button>
                    <Button onClick={handleEditSave} variant="contained" color="primary" disabled={editSaving}>Save</Button>
                </DialogActions>
            </Dialog>

            {/* Create Availabilities Modal */}
            <CreateAvailabilitiesModal 
                open={availModalOpen} 
                onClose={() => setAvailModalOpen(false)} 
                activityName={availActivity?.activity_name} 
                activityId={availActivity?.id} 
                onCreated={() => {
                    setAvailModalOpen(false);
                    setAvailActivity(null);
                }} 
            />
        </div>
    )
}

export default ActivityList;