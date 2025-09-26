import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import React, { useState, useEffect } from "react";
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
import EditIcon from '@mui/icons-material/EditOutlined';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHighOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import { Checkbox, FormControlLabel, FormGroup } from '@mui/material';
import CreateAvailabilitiesModal from './CreateAvailabilitiesModal';

const ActivityList = ({ activity }) => {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        activity_name: '',
        capacity: '',
        location: '',
        flight_type: [], // now array
        voucher_type: [], // voucher types array
        private_charter_voucher_types: [], // private charter voucher types array
        private_charter_pricing: {}, // individual pricing for each voucher type
        weekday_morning_price: '',
        flexible_weekday_price: '',
        any_day_flight_price: '',
        shared_flight_from_price: '',
        private_charter_from_price: '',
        status: 'Live',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        private_charter_pricing: {}
    });
    const [editId, setEditId] = useState(null);
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [editImage, setEditImage] = useState(null);
    const [editImagePreview, setEditImagePreview] = useState(null);
    const [availModalOpen, setAvailModalOpen] = useState(false);
    const [availActivity, setAvailActivity] = useState(null);
    const [privateCharterVoucherTypes, setPrivateCharterVoucherTypes] = useState([]);
    const [privateCharterVoucherTypesLoading, setPrivateCharterVoucherTypesLoading] = useState(false);
    // Passenger tier selection for group pricing (Create form)
    const [groupPassengerTier, setGroupPassengerTier] = useState(2);
    // Passenger tier selection for group pricing (Edit form)
    const [editGroupPassengerTier, setEditGroupPassengerTier] = useState(2);
    const navigate = useNavigate();

    // Fetch private charter voucher types on component mount
    useEffect(() => {
        const fetchPrivateCharterVoucherTypes = async () => {
            setPrivateCharterVoucherTypesLoading(true);
            try {
                const response = await fetch('/api/private-charter-voucher-types');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setPrivateCharterVoucherTypes(data.data);
                    }
                }
            } catch (error) {
                console.error('Error fetching private charter voucher types:', error);
            } finally {
                setPrivateCharterVoucherTypesLoading(false);
            }
        };

        fetchPrivateCharterVoucherTypes();
    }, []);

    const handleOpen = () => setOpen(true);
    const handleClose = () => {
        setOpen(false);
        setForm({
            activity_name: '', capacity: '', location: '', flight_type: [], voucher_type: [], private_charter_voucher_types: [], private_charter_pricing: {}, weekday_morning_price: '', flexible_weekday_price: '', any_day_flight_price: '', shared_flight_from_price: '', private_charter_from_price: '', status: 'Live'
        });
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
        } else if (name === 'private_charter_voucher_types') {
            let newTypes = [...form.private_charter_voucher_types];
            if (checked) {
                newTypes.push(value);
            } else {
                newTypes = newTypes.filter(t => t !== value);
            }
            setForm({ ...form, private_charter_voucher_types: newTypes });
        } else if (name.startsWith('private_charter_price_')) {
            const voucherTypeId = name.replace('private_charter_price_', '');
            // Find the voucher type by ID to get the title
            const voucherType = privateCharterVoucherTypes.find(vt => vt.id.toString() === voucherTypeId);
            if (voucherType) {
                // Ensure nested structure for tiered pricing
                const existingForTitle = form.private_charter_pricing[voucherType.title];
                const pricingForTitle = (existingForTitle && typeof existingForTitle === 'object') ? { ...existingForTitle } : {};
                const tierKey = String(groupPassengerTier);
                pricingForTitle[tierKey] = value;
                setForm({
                    ...form,
                    private_charter_pricing: {
                        ...form.private_charter_pricing,
                        [voucherType.title]: pricingForTitle // Store by title with passenger tiers
                    }
                });
            }
        } else {
            setForm({ ...form, [name]: value });
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
                if (key === 'flight_type' || key === 'voucher_type' || key === 'private_charter_voucher_types') {
                    formData.append(key, value.join(','));
                } else if (key === 'private_charter_pricing') {
                    formData.append(key, JSON.stringify(value));
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
                // Parse private_charter_pricing if it's a string
                let parsedData = data.data;
                if (parsedData.private_charter_pricing && typeof parsedData.private_charter_pricing === 'string') {
                    try {
                        parsedData.private_charter_pricing = JSON.parse(parsedData.private_charter_pricing);
                    } catch (e) {
                        parsedData.private_charter_pricing = {};
                    }
                }
                setEditForm(parsedData);
                setEditImagePreview(parsedData.image ? parsedData.image : null);
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
        } else if (name === 'private_charter_voucher_types') {
            let newTypes = Array.isArray(editForm.private_charter_voucher_types) ? [...editForm.private_charter_voucher_types] : (typeof editForm.private_charter_voucher_types === 'string' ? editForm.private_charter_voucher_types.split(',') : []);
            if (checked) {
                newTypes.push(value);
            } else {
                newTypes = newTypes.filter(t => t !== value);
            }
            setEditForm({ ...editForm, private_charter_voucher_types: newTypes });
        } else if (name.startsWith('private_charter_price_')) {
            const voucherTypeId = name.replace('private_charter_price_', '');
            // Find the voucher type by ID to get the title
            const voucherType = privateCharterVoucherTypes.find(vt => vt.id.toString() === voucherTypeId);
            if (voucherType) {
                const existingForTitle = editForm.private_charter_pricing ? editForm.private_charter_pricing[voucherType.title] : undefined;
                const pricingForTitle = (existingForTitle && typeof existingForTitle === 'object') ? { ...existingForTitle } : {};
                const tierKey = String(editGroupPassengerTier);
                pricingForTitle[tierKey] = value;
                setEditForm({
                    ...editForm,
                    private_charter_pricing: {
                        ...editForm.private_charter_pricing,
                        [voucherType.title]: pricingForTitle // Store by title with passenger tiers
                    }
                });
            }
        } else {
            setEditForm({ ...editForm, [name]: value });
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
                if (key === 'flight_type' || key === 'voucher_type' || key === 'private_charter_voucher_types') {
                    formData.append(key, Array.isArray(value) ? value.join(',') : value);
                } else if (key === 'private_charter_pricing') {
                    formData.append(key, JSON.stringify(value));
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
    
    const handleSyncPricing = async () => {
        if (!editId) return;
        
        setEditSaving(true);
        try {
            const response = await fetch('/api/sync-activity-pricing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ activity_id: editId })
            });
            
            const data = await response.json();
            if (data.success) {
                alert(`Successfully synced ${data.updatedCount} voucher types with group pricing!`);
                // Refresh the voucher types to show updated pricing
                window.location.reload();
            } else {
                alert('Error syncing pricing: ' + data.message);
            }
        } catch (err) {
            alert('Error syncing pricing: ' + err.message);
        } finally {
            setEditSaving(false);
        }
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
                    <div style={{ 
                        marginBottom: 20, 
                        padding: '16px', 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '8px', 
                        border: '1px solid #dee2e6' 
                    }}>
                        <div style={{ 
                            marginBottom: 12, 
                            fontWeight: 600, 
                            fontSize: '16px', 
                            color: '#495057',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '18px' }}>📋</span>
                            Basic Information
                        </div>
                        <div style={{ 
                            fontSize: '13px', 
                            color: '#6c757d', 
                            marginBottom: '12px', 
                            fontStyle: 'italic' 
                        }}>
                            General activity details and configuration
                        </div>
                        <TextField margin="dense" label="Activity Name" name="activity_name" value={form.activity_name} onChange={handleChange} fullWidth required />
                        <TextField margin="dense" label="Capacity" name="capacity" value={form.capacity} onChange={handleChange} type="number" fullWidth required />
                        <TextField margin="dense" label="Location" name="location" value={form.location} onChange={handleChange} fullWidth required />
                    </div>
                    
                    <div style={{ 
                        marginTop: 20, 
                        marginBottom: 16, 
                        padding: '16px', 
                        backgroundColor: '#e3f2fd', 
                        borderRadius: '8px', 
                        border: '1px solid #bbdefb' 
                    }}>
                        <div style={{ 
                            marginBottom: 12, 
                            fontWeight: 600, 
                            fontSize: '16px', 
                            color: '#1565c0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '18px' }}>🛩️</span>
                            Flight Type
                        </div>
                        <div style={{ 
                            fontSize: '13px', 
                            color: '#1565c0', 
                            marginBottom: '12px', 
                            fontStyle: 'italic' 
                        }}>
                            Select which types of flights this activity supports
                        </div>
                        <FormGroup row sx={{ mb: 0, mt: 1 }}>
                            <FormControlLabel
                                control={<Checkbox checked={form.flight_type.includes('Private')} onChange={handleChange} name="flight_type" value="Private" />}
                                label="Private"
                            />
                            <FormControlLabel
                                control={<Checkbox checked={form.flight_type.includes('Shared')} onChange={handleChange} name="flight_type" value="Shared" />}
                                label="Shared"
                            />
                        </FormGroup>
                    </div>
                    
                    {/* Experience: Shared Flight Section */}
                    <div style={{ 
                        marginTop: 24, 
                        marginBottom: 16, 
                        padding: '20px', 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '12px', 
                        border: '2px solid #e9ecef',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ 
                            marginBottom: 20, 
                            fontWeight: 700, 
                            fontSize: '18px', 
                            color: '#1976d2',
                            borderBottom: '3px solid #1976d2',
                            paddingBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '20px' }}>✈️</span>
                            Experience: Shared Flight
                        </div>
                        <div style={{ 
                            fontSize: '14px', 
                            color: '#666', 
                            marginBottom: '20px', 
                            fontStyle: 'italic',
                            padding: '12px',
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            border: '1px solid #dee2e6'
                        }}>
                            ℹ️ These fields are specifically for Shared Flight experiences only. They control pricing and voucher options for shared balloon flights.
                        </div>
                        
                        <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 500 }}>From Price</div>
                        <TextField margin="dense" label="Shared Flight From Price" name="shared_flight_from_price" value={form.shared_flight_from_price} onChange={handleChange} type="number" fullWidth required />
                        
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
                        
                        <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 500 }}>Per Person Pricing</div>
                        <TextField margin="dense" label="Weekday Morning Price" name="weekday_morning_price" value={form.weekday_morning_price} onChange={handleChange} type="number" fullWidth required />
                        <TextField margin="dense" label="Flexible Weekday Price" name="flexible_weekday_price" value={form.flexible_weekday_price} onChange={handleChange} type="number" fullWidth required />
                        <TextField margin="dense" label="Any Day Flight Price" name="any_day_flight_price" value={form.any_day_flight_price} onChange={handleChange} type="number" fullWidth required />
                    </div>
                    
                    {/* Private Charter From Price - Separate section */}
                    <div style={{ 
                        marginTop: 24, 
                        marginBottom: 16, 
                        padding: '16px', 
                        backgroundColor: '#fff3cd', 
                        borderRadius: '8px', 
                        border: '1px solid #ffeaa7' 
                    }}>
                        <div style={{ 
                            marginBottom: 12, 
                            fontWeight: 600, 
                            fontSize: '16px', 
                            color: '#856404',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '18px' }}>🎈</span>
                            Private Charter From Price
                        </div>
                        <div style={{ 
                            fontSize: '13px', 
                            color: '#856404', 
                            marginBottom: '12px', 
                            fontStyle: 'italic' 
                        }}>
                            This field is for Private Charter experiences only
                        </div>
                        <TextField margin="dense" label="Private Charter From Price" name="private_charter_from_price" value={form.private_charter_from_price} onChange={handleChange} type="number" fullWidth required />
                    </div>

                    {/* Private Charter Voucher Types Section */}
                    <div style={{ 
                        marginTop: 24, 
                        marginBottom: 16, 
                        padding: '20px', 
                        backgroundColor: '#fff3cd', 
                        borderRadius: '12px', 
                        border: '2px solid #ffeaa7',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ 
                            marginBottom: 20, 
                            fontWeight: 700, 
                            fontSize: '18px', 
                            color: '#856404',
                            borderBottom: '3px solid #f39c12',
                            paddingBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '20px' }}>🎫</span>
                            Private Charter Voucher Types
                        </div>
                        <div style={{ 
                            fontSize: '14px', 
                            color: '#856404', 
                            marginBottom: '20px', 
                            fontStyle: 'italic',
                            padding: '12px',
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            border: '1px solid #ffeaa7'
                        }}>
                            ℹ️ Select which private charter voucher types this activity supports. These options come from the Private Charter Voucher Types settings.
                        </div>
                        
                        {privateCharterVoucherTypesLoading ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#856404' }}>
                                Loading voucher types...
                            </div>
                        ) : privateCharterVoucherTypes.length > 0 ? (
                            <>
                                <FormGroup row sx={{ mb: 2, mt: 1 }}>
                                    {privateCharterVoucherTypes.map((voucherType) => (
                                        <FormControlLabel
                                            key={voucherType.id}
                                            control={
                                                <Checkbox 
                                                    checked={form.private_charter_voucher_types.includes(voucherType.id.toString())} 
                                                    onChange={handleChange} 
                                                    name="private_charter_voucher_types" 
                                                    value={voucherType.id.toString()} 
                                                />
                                            }
                                            label={voucherType.title}
                                        />
                                    ))}
                                </FormGroup>
                                
                                {/* Individual Pricing Fields */}
                                <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
                                    <div style={{ marginBottom: '16px', fontWeight: '600', color: '#856404' }}>
                                        Group Pricing for Selected Voucher Types
                                    </div>
                                    {/* Passenger tier selector */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                        <label style={{ color: '#856404', fontWeight: 500 }}>Passengers</label>
                                        <TextField select size="small" value={groupPassengerTier} onChange={(e) => setGroupPassengerTier(Number(e.target.value))} style={{ width: 180 }}>
                                            <MenuItem value={2}>2 passengers</MenuItem>
                                            <MenuItem value={3}>3 passengers</MenuItem>
                                            <MenuItem value={4}>4 passengers</MenuItem>
                                            <MenuItem value={8}>8 passengers</MenuItem>
                                        </TextField>
                                    </div>
                                    {privateCharterVoucherTypes.map((voucherType) => (
                                        <div key={voucherType.id} style={{ marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <Checkbox 
                                                    checked={form.private_charter_voucher_types.includes(voucherType.id.toString())} 
                                                    disabled
                                                    style={{ color: '#856404' }}
                                                />
                                                <label style={{ fontWeight: '500', color: '#856404', minWidth: '200px' }}>
                                                    Group Pricing: {voucherType.title}
                                                </label>
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    name={`private_charter_price_${voucherType.id}`}
                                                    value={(typeof form.private_charter_pricing[voucherType.title] === 'object' ? (form.private_charter_pricing[voucherType.title][String(groupPassengerTier)] || '') : (groupPassengerTier === 2 ? (form.private_charter_pricing[voucherType.title] || '') : ''))}
                                                    onChange={handleChange}
                                                    placeholder="0.00"
                                                    min="0"
                                                    step="0.01"
                                                    style={{ width: '120px' }}
                                                    disabled={!form.private_charter_voucher_types.includes(voucherType.id.toString())}
                                                />
                                                <span style={{ color: '#856404', fontSize: '14px' }}>£</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#856404', fontStyle: 'italic' }}>
                                No private charter voucher types available. Please create some in the settings first.
                            </div>
                        )}
                    </div>
                    
                    <div style={{ 
                        marginTop: 20, 
                        marginBottom: 16, 
                        padding: '16px', 
                        backgroundColor: '#e8f5e8', 
                        borderRadius: '8px', 
                        border: '1px solid #c8e6c9' 
                    }}>
                        <div style={{ 
                            marginBottom: 12, 
                            fontWeight: 600, 
                            fontSize: '16px', 
                            color: '#2e7d32',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '18px' }}>✅</span>
                            Status & Configuration
                        </div>
                        <div style={{ 
                            fontSize: '13px', 
                            color: '#2e7d32', 
                            marginBottom: '12px', 
                            fontStyle: 'italic' 
                        }}>
                            Set the activity status and upload any images
                        </div>
                        
                        {/* Sync Pricing Button for Create Form */}
                        {form.private_charter_pricing && Object.keys(form.private_charter_pricing).length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontStyle: 'italic' }}>
                                    💡 After saving the activity, you can sync the group pricing to voucher types using the edit form
                                </div>
                            </div>
                        )}
                        
                        <TextField margin="dense" label="Status" name="status" value={form.status} onChange={handleChange} select fullWidth required>
                            <MenuItem value="Live">Live</MenuItem>
                            <MenuItem value="Draft">Draft</MenuItem>
                            <MenuItem value="Closed">Closed</MenuItem>
                        </TextField>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            style={{ marginTop: '16px' }}
                        />
                        {imagePreview && (
                            <img
                                src={imagePreview}
                                alt="Preview"
                                style={{ width: '100px', height: '100px', objectFit: 'cover', marginTop: '8px', borderRadius: '4px' }}
                            />
                        )}
                    </div>
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
                                    <AutoFixHighIcon
                                        titleAccess="Edit Availabilities"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => navigate(`/activity/${item.id}/availabilities`)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <AutoFixHighIcon style={{ cursor: 'pointer' }} onClick={() => alert(`Resources for activity: ${item.activity_name}`)} />
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
                    <div style={{ 
                        marginBottom: 20, 
                        padding: '16px', 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '8px', 
                        border: '1px solid #dee2e6' 
                    }}>
                        <div style={{ 
                            marginBottom: 12, 
                            fontWeight: 600, 
                            fontSize: '16px', 
                            color: '#495057',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '18px' }}>📋</span>
                            Basic Information
                        </div>
                        <div style={{ 
                            fontSize: '13px', 
                            color: '#6c757d', 
                            marginBottom: '12px', 
                            fontStyle: 'italic' 
                        }}>
                            General activity details and configuration
                        </div>
                        <TextField margin="dense" label="Activity Name" name="activity_name" value={editForm.activity_name || ''} onChange={handleEditChange} fullWidth required />
                        <TextField margin="dense" label="Capacity" name="capacity" value={editForm.capacity || ''} onChange={handleEditChange} type="number" fullWidth required />
                        <TextField margin="dense" label="Location" name="location" value={editForm.location || ''} onChange={handleEditChange} fullWidth required />
                    </div>
                    
                    <div style={{ 
                        marginTop: 20, 
                        marginBottom: 16, 
                        padding: '16px', 
                        backgroundColor: '#e3f2fd', 
                        borderRadius: '8px', 
                        border: '1px solid #bbdefb' 
                    }}>
                        <div style={{ 
                            marginBottom: 12, 
                            fontWeight: 600, 
                            fontSize: '16px', 
                            color: '#1565c0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '18px' }}>🛩️</span>
                            Flight Type
                        </div>
                        <div style={{ 
                            fontSize: '13px', 
                            color: '#1565c0', 
                            marginBottom: '12px', 
                            fontStyle: 'italic' 
                        }}>
                            Select which types of flights this activity supports
                        </div>
                        <FormGroup row sx={{ mb: 0, mt: 1 }}>
                            <FormControlLabel
                                control={<Checkbox checked={Array.isArray(editForm.flight_type) ? editForm.flight_type.includes('Private') : (typeof editForm.flight_type === 'string' ? editForm.flight_type.split(',').includes('Private') : false)} onChange={handleEditChange} name="flight_type" value="Private" />}
                                label="Private"
                            />
                            <FormControlLabel
                                control={<Checkbox checked={Array.isArray(editForm.flight_type) ? editForm.flight_type.includes('Shared') : (typeof editForm.flight_type === 'string' ? editForm.flight_type.split(',').includes('Shared') : false)} onChange={handleEditChange} name="flight_type" value="Shared" />}
                                label="Shared"
                            />
                        </FormGroup>
                    </div>
                    
                    {/* Experience: Shared Flight Section */}
                    <div style={{ 
                        marginTop: 24, 
                        marginBottom: 16, 
                        padding: '20px', 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '12px', 
                        border: '2px solid #e9ecef',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ 
                            marginBottom: 20, 
                            fontWeight: 700, 
                            fontSize: '18px', 
                            color: '#1976d2',
                            borderBottom: '3px solid #1976d2',
                            paddingBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '20px' }}>✈️</span>
                            Experience: Shared Flight
                        </div>
                        <div style={{ 
                            fontSize: '14px', 
                            color: '#666', 
                            marginBottom: '20px', 
                            fontStyle: 'italic',
                            padding: '12px',
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            border: '1px solid #dee2e6'
                        }}>
                            ℹ️ These fields are specifically for Shared Flight experiences only. They control pricing and voucher options for shared balloon flights.
                        </div>
                        
                        <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 500 }}>From Price</div>
                        <TextField margin="dense" label="Shared Flight From Price" name="shared_flight_from_price" value={editForm.shared_flight_from_price || ''} onChange={handleEditChange} type="number" fullWidth required />
                        
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
                        
                        <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 500 }}>Per Person Pricing</div>
                        <TextField margin="dense" label="Weekday Morning Price" name="weekday_morning_price" value={editForm.weekday_morning_price || ''} onChange={handleEditChange} type="number" fullWidth required />
                        <TextField margin="dense" label="Flexible Weekday Price" name="flexible_weekday_price" value={editForm.flexible_weekday_price || ''} onChange={handleEditChange} type="number" fullWidth required />
                        <TextField margin="dense" label="Any Day Flight Price" name="any_day_flight_price" value={editForm.any_day_flight_price || ''} onChange={handleEditChange} type="number" fullWidth required />
                    </div>
                    
                    {/* Private Charter From Price - Separate section */}
                    <div style={{ 
                        marginTop: 24, 
                        marginBottom: 16, 
                        padding: '16px', 
                        backgroundColor: '#fff3cd', 
                        borderRadius: '8px', 
                        border: '1px solid #ffeaa7' 
                    }}>
                        <div style={{ 
                            marginBottom: 12, 
                            fontWeight: 600, 
                            fontSize: '16px', 
                            color: '#856404',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '18px' }}>🎈</span>
                            Private Charter From Price
                        </div>
                        <div style={{ 
                            fontSize: '13px', 
                            color: '#856404', 
                            marginBottom: '12px', 
                            fontStyle: 'italic' 
                        }}>
                            This field is for Private Charter experiences only
                        </div>
                        <TextField margin="dense" label="Private Charter From Price" name="private_charter_from_price" value={editForm.private_charter_from_price || ''} onChange={handleEditChange} type="number" fullWidth required />
                    </div>

                    {/* Private Charter Voucher Types Section */}
                    <div style={{ 
                        marginTop: 24, 
                        marginBottom: 16, 
                        padding: '20px', 
                        backgroundColor: '#fff3cd', 
                        borderRadius: '12px', 
                        border: '2px solid #ffeaa7',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ 
                            marginBottom: 20, 
                            fontWeight: 700, 
                            fontSize: '18px', 
                            color: '#856404',
                            borderBottom: '3px solid #f39c12',
                            paddingBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '20px' }}>🎫</span>
                            Private Charter Voucher Types
                        </div>
                        <div style={{ 
                            fontSize: '14px', 
                            color: '#856404', 
                            marginBottom: '20px', 
                            fontStyle: 'italic',
                            padding: '12px',
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            border: '1px solid #ffeaa7'
                        }}>
                            ℹ️ Select which private charter voucher types this activity supports. These options come from the Private Charter Voucher Types settings.
                        </div>
                        
                        {privateCharterVoucherTypesLoading ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#856404' }}>
                                Loading voucher types...
                            </div>
                        ) : privateCharterVoucherTypes.length > 0 ? (
                            <>
                                <FormGroup row sx={{ mb: 2, mt: 1 }}>
                                    {privateCharterVoucherTypes.map((voucherType) => (
                                        <FormControlLabel
                                            key={voucherType.id}
                                            control={
                                                <Checkbox 
                                                    checked={Array.isArray(editForm.private_charter_voucher_types) ? editForm.private_charter_voucher_types.includes(voucherType.id.toString()) : (typeof editForm.private_charter_voucher_types === 'string' ? editForm.private_charter_voucher_types.split(',') : [])} 
                                                    onChange={handleEditChange} 
                                                    name="private_charter_voucher_types" 
                                                    value={voucherType.id.toString()} 
                                                />
                                            }
                                            label={voucherType.title}
                                        />
                                    ))}
                                </FormGroup>
                                
                                {/* Individual Pricing Fields */}
                                <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
                                    <div style={{ marginBottom: '16px', fontWeight: '600', color: '#856404' }}>
                                        Group Pricing for Selected Voucher Types
                                    </div>
                                    {/* Passenger tier selector */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                        <label style={{ color: '#856404', fontWeight: 500 }}>Passengers</label>
                                        <TextField select size="small" value={editGroupPassengerTier} onChange={(e) => setEditGroupPassengerTier(Number(e.target.value))} style={{ width: 180 }}>
                                            <MenuItem value={2}>2 passengers</MenuItem>
                                            <MenuItem value={3}>3 passengers</MenuItem>
                                            <MenuItem value={4}>4 passengers</MenuItem>
                                            <MenuItem value={8}>8 passengers</MenuItem>
                                        </TextField>
                                    </div>
                                    {privateCharterVoucherTypes.map((voucherType) => (
                                        <div key={voucherType.id} style={{ marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <Checkbox 
                                                    checked={Array.isArray(editForm.private_charter_voucher_types) ? editForm.private_charter_voucher_types.includes(voucherType.id.toString()) : (typeof editForm.private_charter_voucher_types === 'string' ? editForm.private_charter_voucher_types.split(',') : [])} 
                                                    disabled
                                                    style={{ color: '#856404' }}
                                                />
                                                <label style={{ fontWeight: '500', color: '#856404', minWidth: '200px' }}>
                                                    Group Pricing: {voucherType.title}
                                                </label>
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    name={`private_charter_price_${voucherType.id}`}
                                                    value={(editForm.private_charter_pricing && typeof editForm.private_charter_pricing[voucherType.title] === 'object')
                                                        ? (editForm.private_charter_pricing[voucherType.title][String(editGroupPassengerTier)] || '')
                                                        : ((editGroupPassengerTier === 2 && editForm.private_charter_pricing && editForm.private_charter_pricing[voucherType.title]) ? editForm.private_charter_pricing[voucherType.title] : '')}
                                                    onChange={handleEditChange}
                                                    placeholder="0.00"
                                                    min="0"
                                                    step="0.01"
                                                    style={{ width: '120px' }}
                                                    disabled={!Array.isArray(editForm.private_charter_voucher_types) ? (typeof editForm.private_charter_voucher_types === 'string' ? editForm.private_charter_voucher_types.split(',').includes(voucherType.id.toString()) : false) : editForm.private_charter_voucher_types.includes(voucherType.id.toString())}
                                                />
                                                <span style={{ color: '#856404', fontSize: '14px' }}>£</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#856404', fontStyle: 'italic' }}>
                                No private charter voucher types available. Please create some in the settings first.
                            </div>
                        )}
                    </div>
                    
                    <div style={{ 
                        marginTop: 20, 
                        marginBottom: 16, 
                        padding: '16px', 
                        backgroundColor: '#e8f5e8', 
                        borderRadius: '8px', 
                        border: '1px solid #c8e6c9' 
                    }}>
                        <div style={{ 
                            marginBottom: 12, 
                            fontWeight: 600, 
                            fontSize: '16px', 
                            color: '#2e7d32',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '18px' }}>✅</span>
                            Status & Configuration
                        </div>
                        <div style={{ 
                            fontSize: '13px', 
                            color: '#2e7d32', 
                            marginBottom: '12px', 
                            fontStyle: 'italic' 
                        }}>
                            Set the activity status and upload any images
                        </div>
                        
                        {/* Sync Pricing Button */}
                        {editForm.private_charter_pricing && Object.keys(editForm.private_charter_pricing).length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={handleSyncPricing}
                                    disabled={editSaving}
                                    startIcon={<span>🔄</span>}
                                    fullWidth
                                >
                                    Sync Group Pricing to Voucher Types
                                </Button>
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', fontStyle: 'italic' }}>
                                    This will update the private charter voucher types with the group pricing set above
                                </div>
                            </div>
                        )}
                        
                        <TextField margin="dense" label="Status" name="status" value={editForm.status || ''} onChange={handleEditChange} select fullWidth required>
                            <MenuItem value="Live">Live</MenuItem>
                            <MenuItem value="Draft">Draft</MenuItem>
                            <MenuItem value="Closed">Closed</MenuItem>
                        </TextField>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleEditImageChange}
                            style={{ marginTop: '16px' }}
                        />
                        {editImagePreview && (
                            <img
                                src={editImagePreview}
                                alt="Preview"
                                style={{ width: '100px', height: '100px', objectFit: 'cover', marginTop: '8px', borderRadius: '4px' }}
                            />
                        )}
                    </div>
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