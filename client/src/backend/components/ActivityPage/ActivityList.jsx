import { Box, Button, Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import React, { useState, useEffect } from "react";
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHighOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import { Checkbox, FormControlLabel, FormGroup, Switch } from '@mui/material';
import CreateAvailabilitiesModal from './CreateAvailabilitiesModal';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

const arrayMove = (list, fromIndex, toIndex) => {
    const next = [...list];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    return next;
};

const parseNestedPricingMap = (value) => {
    let parsed = value;

    for (let attempt = 0; attempt < 3; attempt += 1) {
        if (typeof parsed !== 'string') {
            break;
        }

        try {
            parsed = JSON.parse(parsed);
        } catch (error) {
            break;
        }
    }

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
};

const getTieredPriceValue = (pricingMap, title, tier) => {
    if (!pricingMap || !title) return '';
    const entry = pricingMap[title];

    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        // Keep explicit 0 values (e.g. user sets £0 sale) instead of treating them as "empty".
        return entry[String(tier)] ?? '';
    }

    if (tier === 2) {
        // Preserve 0 (falsy) but still meaningful for controlled inputs.
        return entry ?? '';
    }

    return '';
};

const isSelectedPrivateVoucherType = (selectedValues, voucherId) => {
    if (Array.isArray(selectedValues)) {
        return selectedValues.includes(voucherId.toString());
    }

    if (typeof selectedValues === 'string') {
        return selectedValues.split(',').map(item => item.trim()).includes(voucherId.toString());
    }

    return false;
};

const SALE_PRICE_FIELDS = [
    'weekday_morning_sale_price',
    'flexible_weekday_sale_price',
    'any_day_flight_sale_price',
    'shared_flight_from_sale_price',
    'private_charter_from_sale_price'
];

const parseSalePriceValue = (value) => {
    if (value === undefined || value === null || value === '') return null;

    const normalized = String(value).trim().replace(/\s+/g, '').replace(/,/g, '.');
    if (!normalized) return null;

    const parsed = parseFloat(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;

    return parsed;
};

const normalizeSaleFieldValue = (value) => (parseSalePriceValue(value) === null ? '' : value);

const normalizeTieredSalePricingMap = (pricingMap) => {
    if (!pricingMap || typeof pricingMap !== 'object' || Array.isArray(pricingMap)) {
        return {};
    }

    return Object.entries(pricingMap).reduce((acc, [title, tierValues]) => {
        if (tierValues && typeof tierValues === 'object' && !Array.isArray(tierValues)) {
            const normalizedTiers = Object.entries(tierValues).reduce((tierAcc, [tier, value]) => {
                tierAcc[tier] = normalizeSaleFieldValue(value);
                return tierAcc;
            }, {});

            acc[title] = normalizedTiers;
            return acc;
        }

        acc[title] = normalizeSaleFieldValue(tierValues);
        return acc;
    }, {});
};

const normalizeActivitySaleFields = (activityData = {}) => {
    const normalized = { ...activityData };

    SALE_PRICE_FIELDS.forEach((field) => {
        normalized[field] = normalizeSaleFieldValue(activityData[field]);
    });

    normalized.private_charter_sale_pricing = normalizeTieredSalePricingMap(
        parseNestedPricingMap(activityData.private_charter_sale_pricing)
    );

    return normalized;
};

const sanitizeActivityFormForSubmit = (formState = {}) => {
    const sanitized = { ...formState };

    SALE_PRICE_FIELDS.forEach((field) => {
        sanitized[field] = normalizeSaleFieldValue(formState[field]);
    });

    sanitized.private_charter_sale_pricing = normalizeTieredSalePricingMap(formState.private_charter_sale_pricing);

    return sanitized;
};

const DIALOG_TONE_MAP = {
    neutral: {
        background: 'linear-gradient(180deg, #ffffff 0%, #f9fbff 100%)',
        border: 'rgba(203, 213, 225, 0.65)',
        title: '#334155',
        description: '#7c8798',
        iconBackground: '#eef4ff',
        iconColor: '#355fa8',
        helperBackground: '#ffffff',
        helperBorder: 'rgba(203, 213, 225, 0.72)',
        helperText: '#7c8798',
        divider: 'linear-gradient(90deg, #2563eb 0%, rgba(37, 99, 235, 0.08) 100%)'
    },
    info: {
        background: 'linear-gradient(180deg, #edf6ff 0%, #e3f0ff 100%)',
        border: 'rgba(96, 165, 250, 0.34)',
        title: '#2563eb',
        description: '#6a97d8',
        iconBackground: '#ffffff',
        iconColor: '#2563eb',
        helperBackground: 'rgba(255,255,255,0.82)',
        helperBorder: 'rgba(96, 165, 250, 0.24)',
        helperText: '#5d86c4',
        divider: 'linear-gradient(90deg, #2563eb 0%, rgba(37, 99, 235, 0.08) 100%)'
    },
    warm: {
        background: 'linear-gradient(180deg, #fff9ea 0%, #fff2cf 100%)',
        border: 'rgba(245, 158, 11, 0.30)',
        title: '#a16207',
        description: '#b7842a',
        iconBackground: '#ffffff',
        iconColor: '#b45309',
        helperBackground: 'rgba(255,255,255,0.9)',
        helperBorder: 'rgba(245, 158, 11, 0.22)',
        helperText: '#9a7421',
        divider: 'linear-gradient(90deg, #f59e0b 0%, rgba(245, 158, 11, 0.08) 100%)'
    },
    success: {
        background: 'linear-gradient(180deg, #eefbf3 0%, #e2f7e8 100%)',
        border: 'rgba(16, 185, 129, 0.28)',
        title: '#15803d',
        description: '#4d8b65',
        iconBackground: '#ffffff',
        iconColor: '#15803d',
        helperBackground: 'rgba(255,255,255,0.88)',
        helperBorder: 'rgba(16, 185, 129, 0.20)',
        helperText: '#5b7f68',
        divider: 'linear-gradient(90deg, #16a34a 0%, rgba(22, 163, 74, 0.08) 100%)'
    },
    rose: {
        background: 'linear-gradient(180deg, #fff4f7 0%, #fee8ef 100%)',
        border: 'rgba(244, 114, 182, 0.26)',
        title: '#be185d',
        description: '#b05e7f',
        iconBackground: '#ffffff',
        iconColor: '#be185d',
        helperBackground: 'rgba(255,255,255,0.9)',
        helperBorder: 'rgba(244, 114, 182, 0.22)',
        helperText: '#8f5a70',
        divider: 'linear-gradient(90deg, #ec4899 0%, rgba(236, 72, 153, 0.08) 100%)'
    }
};

const ACTIVITY_FONT_WEIGHTS = {
    pageTitle: 700,
    sectionTitle: 700,
    tableHeader: 700,
    chip: 700,
    primaryButton: 700,
    actionButton: 600,
    rowTitle: 700,
    label: 600,
    subtleLabel: 500,
    dialogTitle: 700
};

const ActivityDialogSection = ({ tone = 'neutral', icon, title, description, helper, divider = false, children }) => {
    const palette = DIALOG_TONE_MAP[tone] || DIALOG_TONE_MAP.neutral;

    return (
        <Box
            sx={{
                mb: 2.5,
                px: { xs: 2, md: 2.25 },
                py: { xs: 2, md: 2.35 },
                borderRadius: '20px',
                background: palette.background,
                border: `1px solid ${palette.border}`,
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)'
            }}
        >
            <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: description || divider || helper ? 1.75 : 0.5 }}>
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '14px',
                        bgcolor: palette.iconBackground,
                        color: palette.iconColor,
                        border: `1px solid ${palette.border}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        boxShadow: '0 8px 18px rgba(15, 23, 42, 0.05)'
                    }}
                >
                    {icon}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '16px', fontWeight: ACTIVITY_FONT_WEIGHTS.sectionTitle, color: palette.title, mb: 0.5 }}>
                        {title}
                    </Typography>
                    {description ? (
                        <Typography sx={{ fontSize: '13px', color: palette.description, fontStyle: 'italic', lineHeight: 1.45 }}>
                            {description}
                        </Typography>
                    ) : null}
                </Box>
            </Stack>

            {divider ? (
                <Box sx={{ height: 3, borderRadius: 999, background: palette.divider, mb: 2 }} />
            ) : null}

            {helper ? (
                <Box
                    sx={{
                        mb: 2,
                        px: 1.5,
                        py: 1.25,
                        borderRadius: '14px',
                        background: palette.helperBackground,
                        border: `1px solid ${palette.helperBorder}`
                    }}
                >
                    <Typography sx={{ fontSize: '13px', color: palette.helperText, fontStyle: 'italic', lineHeight: 1.5 }}>
                        {helper}
                    </Typography>
                </Box>
            ) : null}

            <Box
                sx={{
                    '& .MuiTextField-root': { mb: 1.5 },
                    '& .MuiFormGroup-root': { mt: 0.25 },
                    '& .MuiFormControlLabel-root': { mr: 2.5, my: 0.25 }
                }}
            >
                {children}
            </Box>
        </Box>
    );
};

const ActivityList = ({ activity, setActivity }) => {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        activity_name: '',
        capacity: '',
        location: '',
        flight_type: [], // now array
        voucher_type: [], // voucher types array
        private_charter_voucher_types: [], // private charter voucher types array
        private_charter_pricing: {}, // individual pricing for each voucher type
        private_charter_sale_pricing: {}, // sale pricing for each voucher type
        weekday_morning_price: '',
        weekday_morning_sale_price: '',
        flexible_weekday_price: '',
        flexible_weekday_sale_price: '',
        any_day_flight_price: '',
        any_day_flight_sale_price: '',
        shared_flight_from_price: '',
        shared_flight_from_sale_price: '',
        private_charter_from_price: '',
        private_charter_from_sale_price: '',
        status: 'Live',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        private_charter_pricing: {},
        private_charter_sale_pricing: {}
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

    const [rows, setRows] = useState(() => (Array.isArray(activity) ? [...activity] : []));
    const [draggingId, setDraggingId] = useState(null);
    const [dropTargetId, setDropTargetId] = useState(null);
    const [reorderError, setReorderError] = useState('');

    useEffect(() => {
        setRows(Array.isArray(activity) ? [...activity] : []);
    }, [activity]);

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
            activity_name: '',
            capacity: '',
            location: '',
            flight_type: [],
            voucher_type: [],
            private_charter_voucher_types: [],
            private_charter_pricing: {},
            private_charter_sale_pricing: {},
            weekday_morning_price: '',
            weekday_morning_sale_price: '',
            flexible_weekday_price: '',
            flexible_weekday_sale_price: '',
            any_day_flight_price: '',
            any_day_flight_sale_price: '',
            shared_flight_from_price: '',
            shared_flight_from_sale_price: '',
            private_charter_from_price: '',
            private_charter_from_sale_price: '',
            status: 'Live'
        });
        setError('');
    };
    // Update price field label based on flight type
    const handleChange = (e) => {
        const { name, value, checked } = e.target;
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
        } else if (name.startsWith('private_charter_sale_price_')) {
            const voucherTypeId = name.replace('private_charter_sale_price_', '');
            const voucherType = privateCharterVoucherTypes.find(vt => vt.id.toString() === voucherTypeId);
            if (voucherType) {
                const existingForTitle = form.private_charter_sale_pricing[voucherType.title];
                const pricingForTitle = (existingForTitle && typeof existingForTitle === 'object') ? { ...existingForTitle } : {};
                const tierKey = String(groupPassengerTier);
                pricingForTitle[tierKey] = value;
                setForm({
                    ...form,
                    private_charter_sale_pricing: {
                        ...form.private_charter_sale_pricing,
                        [voucherType.title]: pricingForTitle
                    }
                });
            }
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
        try {
            const formData = new FormData();
            const sanitizedForm = sanitizeActivityFormForSubmit(form);

            Object.entries(sanitizedForm).forEach(([key, value]) => {
                if (key === 'flight_type' || key === 'voucher_type' || key === 'private_charter_voucher_types') {
                    formData.append(key, value.join(','));
                } else if (key === 'private_charter_pricing' || key === 'private_charter_sale_pricing') {
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
                parsedData.private_charter_pricing = parseNestedPricingMap(parsedData.private_charter_pricing);
                parsedData.private_charter_sale_pricing = parseNestedPricingMap(parsedData.private_charter_sale_pricing);
                setEditForm(normalizeActivitySaleFields(parsedData));
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
        const { name, value, checked } = e.target;
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
        } else if (name.startsWith('private_charter_sale_price_')) {
            const voucherTypeId = name.replace('private_charter_sale_price_', '');
            const voucherType = privateCharterVoucherTypes.find(vt => vt.id.toString() === voucherTypeId);
            if (voucherType) {
                const existingForTitle = editForm.private_charter_sale_pricing ? editForm.private_charter_sale_pricing[voucherType.title] : undefined;
                const pricingForTitle = (existingForTitle && typeof existingForTitle === 'object') ? { ...existingForTitle } : {};
                const tierKey = String(editGroupPassengerTier);
                pricingForTitle[tierKey] = value;
                setEditForm({
                    ...editForm,
                    private_charter_sale_pricing: {
                        ...editForm.private_charter_sale_pricing,
                        [voucherType.title]: pricingForTitle
                    }
                });
            }
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
            const sanitizedEditForm = sanitizeActivityFormForSubmit(editForm);

            Object.entries(sanitizedEditForm).forEach(([key, value]) => {
                if (key === 'flight_type' || key === 'voucher_type' || key === 'private_charter_voucher_types') {
                    formData.append(key, Array.isArray(value) ? value.join(',') : value);
                } else if (key === 'private_charter_pricing' || key === 'private_charter_sale_pricing') {
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
    
    const handleActivityDragStart = (e, id) => {
        e.dataTransfer.setData('text/plain', String(id));
        e.dataTransfer.effectAllowed = 'move';
        setDraggingId(id);
    };

    const handleActivityDragEnd = () => {
        setDraggingId(null);
        setDropTargetId(null);
    };

    const handleActivityDragOverRow = (e, rowId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (rowId !== draggingId) {
            setDropTargetId(rowId);
        }
    };

    const handleActivityDragLeaveRow = (e) => {
        const related = e.relatedTarget;
        if (related && e.currentTarget.contains(related)) {
            return;
        }
        setDropTargetId(null);
    };

    const handleActivityDropOnRow = async (e, targetId) => {
        e.preventDefault();
        setDropTargetId(null);
        const sourceId = Number(e.dataTransfer.getData('text/plain'));
        if (!Number.isFinite(sourceId)) {
            setDraggingId(null);
            return;
        }
        const fromIndex = rows.findIndex((r) => r.id === sourceId);
        const toIndex = rows.findIndex((r) => r.id === targetId);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
            setDraggingId(null);
            return;
        }
        const previous = [...rows];
        const newRows = arrayMove(rows, fromIndex, toIndex);
        setRows(newRows);
        setReorderError('');
        setDraggingId(null);
        try {
            const res = await fetch('/api/activities/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: newRows.map((r) => r.id) }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to save order');
            }
            if (typeof setActivity === 'function') {
                setActivity(newRows);
            }
        } catch (err) {
            setRows(previous);
            setReorderError(err.message || 'Could not save order');
        }
    };

    const pageActionButtonSx = {
        height: 44,
        px: 2.5,
        borderRadius: '12px',
        textTransform: 'uppercase',
        fontSize: '12px',
        fontWeight: ACTIVITY_FONT_WEIGHTS.primaryButton,
        letterSpacing: '0.06em',
        boxShadow: '0 16px 30px rgba(37, 99, 235, 0.22)'
    };

    const actionButtonSx = {
        minWidth: 0,
        borderRadius: '12px',
        px: 1.5,
        py: 0.9,
        fontWeight: ACTIVITY_FONT_WEIGHTS.actionButton,
        textTransform: 'none',
        boxShadow: 'none',
        whiteSpace: 'nowrap'
    };

    const activityDialogSx = {
        '& .MuiDialog-paper': {
            width: '100%',
            borderRadius: '28px',
            overflow: 'hidden',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
            border: '1px solid rgba(203, 213, 225, 0.8)',
            boxShadow: '0 35px 90px rgba(15, 23, 42, 0.22)'
        },
        '& .MuiOutlinedInput-root': {
            borderRadius: '14px',
            backgroundColor: '#ffffff',
            transition: 'all 0.2s ease',
            '& fieldset': {
                borderColor: '#d5dfeb'
            },
            '&:hover fieldset': {
                borderColor: '#9eb4d1'
            },
            '&.Mui-focused fieldset': {
                borderColor: '#2563eb',
                boxShadow: '0 0 0 4px rgba(37, 99, 235, 0.08)'
            }
        },
        '& .MuiInputLabel-root': {
            color: '#64748b',
            fontWeight: 600
        },
        '& .MuiInputBase-input': {
            fontWeight: 500
        },
        '& .MuiFormControlLabel-label': {
            color: '#334155',
            fontWeight: 600
        },
        '& .MuiCheckbox-root.Mui-checked': {
            color: '#2563eb'
        },
        '& .MuiSwitch-switchBase.Mui-checked': {
            color: '#2563eb'
        },
        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            backgroundColor: '#60a5fa'
        }
    };

    const dialogTitleSx = {
        px: { xs: 2.5, md: 3.5 },
        pt: { xs: 2.5, md: 3.25 },
        pb: 2,
        borderBottom: '1px solid rgba(226, 232, 240, 0.9)',
        background: 'linear-gradient(180deg, rgba(248, 251, 255, 0.98) 0%, rgba(255,255,255,0.95) 100%)'
    };

    const dialogContentSx = {
        px: { xs: 2.5, md: 3 },
        py: { xs: 2.5, md: 3 },
        background: 'transparent'
    };

    const dialogActionsSx = {
        px: { xs: 2.5, md: 3.5 },
        py: 2.5,
        gap: 1.25,
        borderTop: '1px solid rgba(226, 232, 240, 0.95)',
        background: '#ffffff'
    };

    const dialogSecondaryButtonSx = {
        minWidth: 110,
        height: 44,
        borderRadius: '14px',
        px: 2.5,
        color: '#64748b',
        fontWeight: ACTIVITY_FONT_WEIGHTS.primaryButton,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        '&:hover': {
            backgroundColor: '#eef2f7'
        }
    };

    const dialogPrimaryButtonSx = {
        minWidth: 118,
        height: 44,
        borderRadius: '14px',
        px: 2.75,
        fontWeight: ACTIVITY_FONT_WEIGHTS.primaryButton,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        background: 'linear-gradient(135deg, #004ac6 0%, #2563eb 100%)',
        boxShadow: '0 16px 28px rgba(37, 99, 235, 0.22)',
        '&:hover': {
            background: 'linear-gradient(135deg, #003a9d 0%, #1d4ed8 100%)'
        }
    };

    const dialogDangerButtonSx = {
        minWidth: 120,
        height: 44,
        borderRadius: '14px',
        px: 2.5,
        fontWeight: ACTIVITY_FONT_WEIGHTS.primaryButton,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderColor: 'rgba(225, 29, 72, 0.24)',
        color: '#be123c',
        backgroundColor: '#fff1f2',
        '&:hover': {
            borderColor: 'rgba(225, 29, 72, 0.35)',
            backgroundColor: '#ffe4e6'
        }
    };

    const getStatusChipSx = (status) => {
        const normalizedStatus = String(status || 'Live').toLowerCase();

        if (normalizedStatus === 'draft') {
            return {
                bgcolor: '#fff7ed',
                color: '#c2410c',
                border: '1px solid rgba(251, 146, 60, 0.28)'
            };
        }

        if (normalizedStatus === 'closed') {
            return {
                bgcolor: '#fef2f2',
                color: '#b91c1c',
                border: '1px solid rgba(248, 113, 113, 0.25)'
            };
        }

        return {
            bgcolor: '#ecfdf3',
            color: '#047857',
            border: '1px solid rgba(16, 185, 129, 0.24)'
        };
    };

    return (
        <div className="activity-list-wrap">
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', md: 'center' },
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: 2,
                    mb: 3
                }}
                className="activity-create-button-wrap"
            >
                <Stack direction="row" spacing={1.25} alignItems="center">
                    <Chip
                        label={`${rows.length} activities`}
                        sx={{
                            height: 34,
                            fontWeight: ACTIVITY_FONT_WEIGHTS.label,
                            bgcolor: '#e8f0ff',
                            color: '#2450a6',
                            borderRadius: '999px'
                        }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleOpen}
                        sx={{
                            ...pageActionButtonSx,
                            background: 'linear-gradient(135deg, #004ac6 0%, #2563eb 100%)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #003a9d 0%, #1d4ed8 100%)'
                            }
                        }}
                    >
                        Create
                    </Button>
                </Stack>
            </Box>
            
            {/* Create Activity Dialog */}
            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth sx={activityDialogSx}>
                <DialogTitle sx={dialogTitleSx}>
                    <Typography sx={{ fontSize: { xs: '24px', md: '28px' }, fontWeight: ACTIVITY_FONT_WEIGHTS.dialogTitle, letterSpacing: '-0.04em', color: '#0f172a', mb: 0.5 }}>
                        Create Activity
                    </Typography>
                    <Typography sx={{ color: '#64748b', fontSize: '14px', maxWidth: '520px' }}>
                        Add a new location, configure pricing and prepare the activity for live availability in one polished flow.
                    </Typography>
                </DialogTitle>
                <DialogContent sx={dialogContentSx}>
                    <ActivityDialogSection
                        tone="neutral"
                        icon="📋"
                        title="Basic Information"
                        description="General activity details and configuration"
                    >
                        <TextField margin="dense" label="Activity Name" name="activity_name" value={form.activity_name} onChange={handleChange} fullWidth required />
                        <TextField margin="dense" label="Capacity" name="capacity" value={form.capacity} onChange={handleChange} type="number" fullWidth required />
                        <TextField margin="dense" label="Location" name="location" value={form.location} onChange={handleChange} fullWidth required />
                    </ActivityDialogSection>

                    <ActivityDialogSection
                        tone="info"
                        icon="🛩️"
                        title="Flight Type"
                        description="Select which types of flights this activity supports"
                    >
                        <FormGroup row sx={{ mb: 0 }}>
                            <FormControlLabel
                                control={<Checkbox checked={form.flight_type.includes('Private')} onChange={handleChange} name="flight_type" value="Private" />}
                                label="Private"
                            />
                            <FormControlLabel
                                control={<Checkbox checked={form.flight_type.includes('Shared')} onChange={handleChange} name="flight_type" value="Shared" />}
                                label="Shared"
                            />
                        </FormGroup>
                    </ActivityDialogSection>

                    <ActivityDialogSection
                        tone="neutral"
                        icon="✈️"
                        title="Experience: Shared Flight"
                        helper="These fields are specifically for Shared Flight experiences only. They control pricing and voucher options for shared balloon flights."
                        divider
                    >
                        <Typography sx={{ mt: 0.5, mb: 1, fontWeight: ACTIVITY_FONT_WEIGHTS.label, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            From Price
                        </Typography>
                        <TextField margin="dense" label="Shared Flight From Price" name="shared_flight_from_price" value={form.shared_flight_from_price} onChange={handleChange} type="number" fullWidth required />
                        <TextField margin="dense" label="Shared Flight Sale Price" name="shared_flight_from_sale_price" value={form.shared_flight_from_sale_price} onChange={handleChange} type="number" fullWidth />

                        <Typography sx={{ mt: 1, mb: 1, fontWeight: ACTIVITY_FONT_WEIGHTS.label, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Voucher Type
                        </Typography>
                        <FormGroup row sx={{ mb: 1 }}>
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

                        <Typography sx={{ mt: 1, mb: 1, fontWeight: ACTIVITY_FONT_WEIGHTS.label, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Per Person Pricing
                        </Typography>
                        <TextField margin="dense" label="Weekday Morning Price" name="weekday_morning_price" value={form.weekday_morning_price} onChange={handleChange} type="number" fullWidth required />
                        <TextField margin="dense" label="Weekday Morning Sale Price" name="weekday_morning_sale_price" value={form.weekday_morning_sale_price} onChange={handleChange} type="number" fullWidth />
                        <TextField margin="dense" label="Flexible Weekday Price" name="flexible_weekday_price" value={form.flexible_weekday_price} onChange={handleChange} type="number" fullWidth required />
                        <TextField margin="dense" label="Flexible Weekday Sale Price" name="flexible_weekday_sale_price" value={form.flexible_weekday_sale_price} onChange={handleChange} type="number" fullWidth />
                        <TextField margin="dense" label="Any Day Flight Price" name="any_day_flight_price" value={form.any_day_flight_price} onChange={handleChange} type="number" fullWidth required />
                        <TextField margin="dense" label="Any Day Flight Sale Price" name="any_day_flight_sale_price" value={form.any_day_flight_sale_price} onChange={handleChange} type="number" fullWidth />
                    </ActivityDialogSection>

                    <ActivityDialogSection
                        tone="warm"
                        icon="🎈"
                        title="Private Charter From Price"
                        description="This field is for Private Charter experiences only"
                    >
                        <TextField margin="dense" label="Private Charter From Price" name="private_charter_from_price" value={form.private_charter_from_price} onChange={handleChange} type="number" fullWidth required />
                        <TextField margin="dense" label="Private Charter From Sale Price" name="private_charter_from_sale_price" value={form.private_charter_from_sale_price} onChange={handleChange} type="number" fullWidth />
                    </ActivityDialogSection>

                    <ActivityDialogSection
                        tone="warm"
                        icon="🎫"
                        title="Private Charter Voucher Types"
                        helper="Select which private charter voucher types this activity supports. These options come from the Private Charter Voucher Types settings."
                        divider
                    >
                        {privateCharterVoucherTypesLoading ? (
                            <Typography sx={{ textAlign: 'center', py: 2.5, color: '#9a7421', fontStyle: 'italic' }}>
                                Loading voucher types...
                            </Typography>
                        ) : privateCharterVoucherTypes.length > 0 ? (
                            <>
                                <FormGroup row sx={{ mb: 1 }}>
                                    {privateCharterVoucherTypes.map((voucherType) => (
                                        <FormControlLabel
                                            key={voucherType.id}
                                            control={
                                                <Checkbox
                                                    checked={isSelectedPrivateVoucherType(form.private_charter_voucher_types, voucherType.id)}
                                                    onChange={handleChange}
                                                    name="private_charter_voucher_types"
                                                    value={voucherType.id.toString()}
                                                />
                                            }
                                            label={voucherType.title}
                                        />
                                    ))}
                                </FormGroup>

                                <Box
                                    sx={{
                                        mt: 2,
                                        p: 2,
                                        backgroundColor: 'rgba(255,255,255,0.92)',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(245, 158, 11, 0.18)'
                                    }}
                                >
                                    <Typography sx={{ mb: 1.5, fontWeight: ACTIVITY_FONT_WEIGHTS.label, color: '#9a7421', fontSize: '14px' }}>
                                        Group Pricing for Selected Voucher Types
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
                                        <Typography sx={{ color: '#9a7421', fontWeight: ACTIVITY_FONT_WEIGHTS.label, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            Passengers
                                        </Typography>
                                        <TextField select size="small" value={groupPassengerTier} onChange={(e) => setGroupPassengerTier(Number(e.target.value))} sx={{ width: 200 }}>
                                            <MenuItem value={2}>2 passengers</MenuItem>
                                            <MenuItem value={3}>3 passengers</MenuItem>
                                            <MenuItem value={4}>4 passengers</MenuItem>
                                            <MenuItem value={8}>8 passengers</MenuItem>
                                        </TextField>
                                    </Box>
                                    {privateCharterVoucherTypes.map((voucherType) => (
                                        <Box key={voucherType.id} sx={{ mb: 1.25 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                                <Checkbox
                                                    checked={isSelectedPrivateVoucherType(form.private_charter_voucher_types, voucherType.id)}
                                                    disabled
                                                    sx={{ color: '#9a7421' }}
                                                />
                                                <Typography sx={{ fontWeight: ACTIVITY_FONT_WEIGHTS.label, color: '#8a6518', minWidth: 210 }}>
                                                    Group Pricing: {voucherType.title}
                                                </Typography>
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    name={`private_charter_price_${voucherType.id}`}
                                                    value={getTieredPriceValue(form.private_charter_pricing, voucherType.title, groupPassengerTier)}
                                                    onChange={handleChange}
                                                    placeholder="Original"
                                                    min="0"
                                                    step="0.01"
                                                    sx={{ width: 132, mb: '0 !important' }}
                                                    disabled={!isSelectedPrivateVoucherType(form.private_charter_voucher_types, voucherType.id)}
                                                />
                                                <Typography sx={{ color: '#8a6518', fontSize: '14px', fontWeight: ACTIVITY_FONT_WEIGHTS.label }}>£</Typography>
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    name={`private_charter_sale_price_${voucherType.id}`}
                                                    value={getTieredPriceValue(form.private_charter_sale_pricing, voucherType.title, groupPassengerTier)}
                                                    onChange={handleChange}
                                                    placeholder="Sale"
                                                    min="0"
                                                    step="0.01"
                                                    sx={{ width: 132, mb: '0 !important' }}
                                                    disabled={!isSelectedPrivateVoucherType(form.private_charter_voucher_types, voucherType.id)}
                                                />
                                                <Typography sx={{ color: '#8a6518', fontSize: '14px', fontWeight: ACTIVITY_FONT_WEIGHTS.label }}>£ sale</Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </>
                        ) : (
                            <Typography sx={{ textAlign: 'center', py: 2.5, color: '#9a7421', fontStyle: 'italic' }}>
                                No private charter voucher types available. Please create some in the settings first.
                            </Typography>
                        )}
                    </ActivityDialogSection>

                    <ActivityDialogSection
                        tone="success"
                        icon="✅"
                        title="Status & Configuration"
                        description="Set the activity status and upload any images"
                    >
                        {form.private_charter_pricing && Object.keys(form.private_charter_pricing).length > 0 ? (
                            <Box sx={{ mb: 2, px: 1.5, py: 1.25, borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.18)', bgcolor: 'rgba(255,255,255,0.82)' }}>
                                <Typography sx={{ fontSize: '13px', color: '#5b7f68', fontStyle: 'italic' }}>
                                    After saving the activity, you can sync the group pricing to voucher types from the edit form.
                                </Typography>
                            </Box>
                        ) : null}

                        <TextField margin="dense" label="Status" name="status" value={form.status} onChange={handleChange} select fullWidth required>
                            <MenuItem value="Live">Live</MenuItem>
                            <MenuItem value="Draft">Draft</MenuItem>
                            <MenuItem value="Closed">Closed</MenuItem>
                        </TextField>
                        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                style={{ marginTop: '8px' }}
                            />
                            {imagePreview ? (
                                <Box
                                    component="img"
                                    src={imagePreview}
                                    alt="Preview"
                                    sx={{
                                        width: 120,
                                        height: 120,
                                        objectFit: 'cover',
                                        borderRadius: '18px',
                                        border: '1px solid rgba(148, 163, 184, 0.28)',
                                        boxShadow: '0 12px 24px rgba(15, 23, 42, 0.10)'
                                    }}
                                />
                            ) : null}
                        </Box>
                    </ActivityDialogSection>

                    {error ? (
                        <Box sx={{ color: '#b91c1c', mt: 1, fontWeight: ACTIVITY_FONT_WEIGHTS.label, fontSize: '14px' }}>
                            {error}
                        </Box>
                    ) : null}
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={handleClose} disabled={saving} sx={dialogSecondaryButtonSx}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} variant="contained" disabled={saving} sx={dialogPrimaryButtonSx}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Activity Table */}
            {reorderError ? (
                <Box
                    role="alert"
                    sx={{
                        mb: 2,
                        px: 2,
                        py: 1.5,
                        borderRadius: '14px',
                        border: '1px solid rgba(248, 113, 113, 0.24)',
                        bgcolor: '#fef2f2',
                        color: '#b91c1c',
                        fontSize: 14,
                        fontWeight: 600
                    }}
                >
                    {reorderError}
                </Box>
            ) : null}
            <TableContainer
                component={Paper}
                className="activity-table-container"
                sx={{
                    mt: 0,
                    borderRadius: '24px',
                    overflow: 'hidden',
                    border: '1px solid rgba(148, 163, 184, 0.16)',
                    boxShadow: '0 20px 46px rgba(15, 23, 42, 0.08)'
                }}
            >
                <Table className="activity-table">
                    <TableHead>
                        <TableRow
                            sx={{
                                '& th': {
                                    background: 'linear-gradient(135deg, #2f5ea8 0%, #4f82c5 100%)',
                                    color: '#f8fbff',
                                    fontSize: '12px',
                                    fontWeight: ACTIVITY_FONT_WEIGHTS.tableHeader,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    borderBottom: 'none',
                                    py: 2.25
                                }
                            }}
                        >
                            <TableCell width={150}>Order</TableCell>
                            <TableCell>Activity</TableCell>
                            <TableCell width={160}>Status</TableCell>
                            <TableCell width={170}>Edit</TableCell>
                            <TableCell width={190}>Availabilities</TableCell>
                            <TableCell width={180}>Resources</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((item, index) => (
                            <TableRow
                                key={item.id}
                                hover
                                onDragOver={(e) => handleActivityDragOverRow(e, item.id)}
                                onDragLeave={handleActivityDragLeaveRow}
                                onDrop={(e) => handleActivityDropOnRow(e, item.id)}
                                className={[
                                    draggingId === item.id ? 'activity-table-row--dragging' : '',
                                    dropTargetId === item.id ? 'activity-table-row--drop-target' : '',
                                ].filter(Boolean).join(' ')}
                                sx={{
                                    transition: 'background-color 0.18s ease, transform 0.18s ease',
                                    '& td': {
                                        borderBottom: '1px solid rgba(226, 232, 240, 0.9)',
                                        py: 2.25,
                                        verticalAlign: 'middle'
                                    },
                                    '&:hover': {
                                        bgcolor: '#f8fbff'
                                    }
                                }}
                            >
                                <TableCell>
                                    <Stack direction="row" spacing={1.25} alignItems="center">
                                        <Box
                                            component="span"
                                            className="activity-drag-handle"
                                            draggable
                                            onDragStart={(e) => handleActivityDragStart(e, item.id)}
                                            onDragEnd={handleActivityDragEnd}
                                            title="Drag to reorder"
                                            aria-label="Drag to reorder row"
                                            sx={{
                                                width: 38,
                                                height: 38,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '12px',
                                                bgcolor: '#edf4ff',
                                                color: '#3867b2',
                                                border: '1px solid rgba(37, 99, 235, 0.10)',
                                                cursor: 'grab'
                                            }}
                                        >
                                            <DragIndicatorIcon fontSize="small" />
                                        </Box>
                                        <Box
                                            sx={{
                                                minWidth: 36,
                                                height: 36,
                                                borderRadius: '12px',
                                                bgcolor: '#f8fafc',
                                                border: '1px solid rgba(148, 163, 184, 0.22)',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: ACTIVITY_FONT_WEIGHTS.label,
                                                color: '#334155'
                                            }}
                                        >
                                            {index + 1}
                                        </Box>
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    <Typography sx={{ fontWeight: ACTIVITY_FONT_WEIGHTS.rowTitle, color: '#0f172a', fontSize: '15px', mb: 0.35 }}>
                                        {item?.activity_name}
                                    </Typography>
                                    <Typography sx={{ color: '#64748b', fontSize: '13px' }}>
                                        {item?.location || 'Location not set'}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={item?.status || 'Live'}
                                        sx={{
                                            borderRadius: '999px',
                                            fontWeight: ACTIVITY_FONT_WEIGHTS.chip,
                                            fontSize: '12px',
                                            ...getStatusChipSx(item?.status)
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button
                                        onClick={() => openEditModal(item.id)}
                                        startIcon={<ModeEditOutlineOutlinedIcon />}
                                        variant="outlined"
                                        sx={{
                                            ...actionButtonSx,
                                            color: '#2450a6',
                                            borderColor: 'rgba(37, 99, 235, 0.25)',
                                            bgcolor: '#eef4ff',
                                            '&:hover': {
                                                borderColor: 'rgba(37, 99, 235, 0.42)',
                                                bgcolor: '#dfeafe'
                                            }
                                        }}
                                    >
                                        Edit
                                    </Button>
                                </TableCell>
                                <TableCell>
                                    <Button
                                        startIcon={<AutoFixHighIcon />}
                                        variant="contained"
                                        onClick={() => navigate(`/activity/${item.id}/availabilities`)}
                                        sx={{
                                            ...actionButtonSx,
                                            background: 'linear-gradient(135deg, #0f9f75 0%, #18b88b 100%)',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #0d8764 0%, #139a75 100%)'
                                            }
                                        }}
                                    >
                                        Manage
                                    </Button>
                                </TableCell>
                                <TableCell>
                                    <Tooltip title="Resource setup area">
                                        <Button
                                            startIcon={<AutoFixHighIcon />}
                                            variant="outlined"
                                            onClick={() => alert(`Resources for activity: ${item.activity_name}`)}
                                            sx={{
                                                ...actionButtonSx,
                                                color: '#5b21b6',
                                                borderColor: 'rgba(124, 58, 237, 0.20)',
                                                bgcolor: '#f6f0ff',
                                                '&:hover': {
                                                    borderColor: 'rgba(124, 58, 237, 0.36)',
                                                    bgcolor: '#efe4ff'
                                                }
                                            }}
                                        >
                                            Open
                                        </Button>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Edit Activity Dialog */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth sx={activityDialogSx}>
                <DialogTitle sx={dialogTitleSx}>
                    <Typography sx={{ fontSize: { xs: '24px', md: '28px' }, fontWeight: ACTIVITY_FONT_WEIGHTS.dialogTitle, letterSpacing: '-0.04em', color: '#0f172a', mb: 0.5 }}>
                        Edit Activity
                    </Typography>
                    <Typography sx={{ color: '#64748b', fontSize: '14px', maxWidth: '560px' }}>
                        Refine pricing, voucher availability and configuration while keeping the activity layout aligned with the rest of the admin panel.
                    </Typography>
                </DialogTitle>
                <DialogContent sx={dialogContentSx}>
                    <ActivityDialogSection
                        tone="neutral"
                        icon="📋"
                        title="Basic Information"
                        description="General activity details and configuration"
                    >
                        <TextField margin="dense" label="Activity Name" name="activity_name" value={editForm.activity_name || ''} onChange={handleEditChange} fullWidth required />
                        <TextField margin="dense" label="Capacity" name="capacity" value={editForm.capacity || ''} onChange={handleEditChange} type="number" fullWidth required />
                        <TextField margin="dense" label="Location" name="location" value={editForm.location || ''} onChange={handleEditChange} fullWidth required />
                    </ActivityDialogSection>

                    <ActivityDialogSection
                        tone="info"
                        icon="🛩️"
                        title="Flight Type"
                        description="Select which types of flights this activity supports"
                    >
                        <FormGroup row sx={{ mb: 0 }}>
                            <FormControlLabel
                                control={<Checkbox checked={Array.isArray(editForm.flight_type) ? editForm.flight_type.includes('Private') : (typeof editForm.flight_type === 'string' ? editForm.flight_type.split(',').includes('Private') : false)} onChange={handleEditChange} name="flight_type" value="Private" />}
                                label="Private"
                            />
                            <FormControlLabel
                                control={<Checkbox checked={Array.isArray(editForm.flight_type) ? editForm.flight_type.includes('Shared') : (typeof editForm.flight_type === 'string' ? editForm.flight_type.split(',').includes('Shared') : false)} onChange={handleEditChange} name="flight_type" value="Shared" />}
                                label="Shared"
                            />
                        </FormGroup>
                    </ActivityDialogSection>

                    <ActivityDialogSection
                        tone="neutral"
                        icon="✈️"
                        title="Experience: Shared Flight"
                        helper="These fields are specifically for Shared Flight experiences only. They control pricing and voucher options for shared balloon flights."
                        divider
                    >
                        <Typography sx={{ mt: 0.5, mb: 1, fontWeight: ACTIVITY_FONT_WEIGHTS.label, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            From Price
                        </Typography>
                        <TextField margin="dense" label="Shared Flight From Price" name="shared_flight_from_price" value={editForm.shared_flight_from_price || ''} onChange={handleEditChange} type="number" fullWidth required />
                        <TextField margin="dense" label="Shared Flight Sale Price" name="shared_flight_from_sale_price" value={editForm.shared_flight_from_sale_price || ''} onChange={handleEditChange} type="number" fullWidth />

                        <Typography sx={{ mt: 1, mb: 1, fontWeight: ACTIVITY_FONT_WEIGHTS.label, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Voucher Type
                        </Typography>
                        <FormGroup row sx={{ mb: 1 }}>
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

                        <Typography sx={{ mt: 1, mb: 1, fontWeight: ACTIVITY_FONT_WEIGHTS.label, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Per Person Pricing
                        </Typography>
                        <TextField margin="dense" label="Weekday Morning Price" name="weekday_morning_price" value={editForm.weekday_morning_price || ''} onChange={handleEditChange} type="number" fullWidth required />
                        <TextField margin="dense" label="Weekday Morning Sale Price" name="weekday_morning_sale_price" value={editForm.weekday_morning_sale_price || ''} onChange={handleEditChange} type="number" fullWidth />
                        <TextField margin="dense" label="Flexible Weekday Price" name="flexible_weekday_price" value={editForm.flexible_weekday_price || ''} onChange={handleEditChange} type="number" fullWidth required />
                        <TextField margin="dense" label="Flexible Weekday Sale Price" name="flexible_weekday_sale_price" value={editForm.flexible_weekday_sale_price || ''} onChange={handleEditChange} type="number" fullWidth />
                        <TextField margin="dense" label="Any Day Flight Price" name="any_day_flight_price" value={editForm.any_day_flight_price || ''} onChange={handleEditChange} type="number" fullWidth required />
                        <TextField margin="dense" label="Any Day Flight Sale Price" name="any_day_flight_sale_price" value={editForm.any_day_flight_sale_price || ''} onChange={handleEditChange} type="number" fullWidth />
                    </ActivityDialogSection>

                    <ActivityDialogSection
                        tone="warm"
                        icon="🎈"
                        title="Private Charter From Price"
                        description="This field is for Private Charter experiences only"
                    >
                        <TextField margin="dense" label="Private Charter From Price" name="private_charter_from_price" value={editForm.private_charter_from_price || ''} onChange={handleEditChange} type="number" fullWidth required />
                        <TextField margin="dense" label="Private Charter From Sale Price" name="private_charter_from_sale_price" value={editForm.private_charter_from_sale_price || ''} onChange={handleEditChange} type="number" fullWidth />
                    </ActivityDialogSection>

                    <ActivityDialogSection
                        tone="warm"
                        icon="🎫"
                        title="Private Charter Voucher Types"
                        helper="Select which private charter voucher types this activity supports. These options come from the Private Charter Voucher Types settings."
                        divider
                    >
                        {privateCharterVoucherTypesLoading ? (
                            <Typography sx={{ textAlign: 'center', py: 2.5, color: '#9a7421', fontStyle: 'italic' }}>
                                Loading voucher types...
                            </Typography>
                        ) : privateCharterVoucherTypes.length > 0 ? (
                            <>
                                <FormGroup row sx={{ mb: 1 }}>
                                    {privateCharterVoucherTypes.map((voucherType) => (
                                        <FormControlLabel
                                            key={voucherType.id}
                                            control={
                                                <Checkbox
                                                    checked={isSelectedPrivateVoucherType(editForm.private_charter_voucher_types, voucherType.id)}
                                                    onChange={handleEditChange}
                                                    name="private_charter_voucher_types"
                                                    value={voucherType.id.toString()}
                                                />
                                            }
                                            label={voucherType.title}
                                        />
                                    ))}
                                </FormGroup>

                                <Box
                                    sx={{
                                        mt: 2,
                                        p: 2,
                                        backgroundColor: 'rgba(255,255,255,0.92)',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(245, 158, 11, 0.18)'
                                    }}
                                >
                                    <Typography sx={{ mb: 1.5, fontWeight: ACTIVITY_FONT_WEIGHTS.label, color: '#9a7421', fontSize: '14px' }}>
                                        Group Pricing for Selected Voucher Types
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
                                        <Typography sx={{ color: '#9a7421', fontWeight: ACTIVITY_FONT_WEIGHTS.label, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            Passengers
                                        </Typography>
                                        <TextField select size="small" value={editGroupPassengerTier} onChange={(e) => setEditGroupPassengerTier(Number(e.target.value))} sx={{ width: 200 }}>
                                            <MenuItem value={2}>2 passengers</MenuItem>
                                            <MenuItem value={3}>3 passengers</MenuItem>
                                            <MenuItem value={4}>4 passengers</MenuItem>
                                            <MenuItem value={8}>8 passengers</MenuItem>
                                        </TextField>
                                    </Box>
                                    {privateCharterVoucherTypes.map((voucherType) => (
                                        <Box key={voucherType.id} sx={{ mb: 1.25 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                                <Checkbox
                                                    checked={isSelectedPrivateVoucherType(editForm.private_charter_voucher_types, voucherType.id)}
                                                    disabled
                                                    sx={{ color: '#9a7421' }}
                                                />
                                                <Typography sx={{ fontWeight: ACTIVITY_FONT_WEIGHTS.label, color: '#8a6518', minWidth: 210 }}>
                                                    Group Pricing: {voucherType.title}
                                                </Typography>
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    name={`private_charter_price_${voucherType.id}`}
                                                    value={getTieredPriceValue(editForm.private_charter_pricing, voucherType.title, editGroupPassengerTier)}
                                                    onChange={handleEditChange}
                                                    placeholder="Original"
                                                    min="0"
                                                    step="0.01"
                                                    sx={{ width: 132, mb: '0 !important' }}
                                                />
                                                <Typography sx={{ color: '#8a6518', fontSize: '14px', fontWeight: ACTIVITY_FONT_WEIGHTS.label }}>£</Typography>
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    name={`private_charter_sale_price_${voucherType.id}`}
                                                    value={getTieredPriceValue(editForm.private_charter_sale_pricing, voucherType.title, editGroupPassengerTier)}
                                                    onChange={handleEditChange}
                                                    placeholder="Sale"
                                                    min="0"
                                                    step="0.01"
                                                    sx={{ width: 132, mb: '0 !important' }}
                                                />
                                                <Typography sx={{ color: '#8a6518', fontSize: '14px', fontWeight: ACTIVITY_FONT_WEIGHTS.label }}>£ sale</Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </>
                        ) : (
                            <Typography sx={{ textAlign: 'center', py: 2.5, color: '#9a7421', fontStyle: 'italic' }}>
                                No private charter voucher types available. Please create some in the settings first.
                            </Typography>
                        )}
                    </ActivityDialogSection>

                    <ActivityDialogSection
                        tone="rose"
                        icon="🏷️"
                        title="Season Saver"
                        description="Configure Season Saver pricing for this activity"
                    >
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={editForm.season_saver_enabled === 1 || editForm.season_saver_enabled === true || editForm.season_saver_enabled === '1'}
                                    onChange={(e) => setEditForm({ ...editForm, season_saver_enabled: e.target.checked ? 1 : 0 })}
                                    name="season_saver_enabled"
                                    color="primary"
                                />
                            }
                            label="Enable Season Saver"
                        />
                        <TextField
                            margin="dense"
                            label="Season Saver Price"
                            name="season_saver_price"
                            value={editForm.season_saver_price || ''}
                            onChange={handleEditChange}
                            type="number"
                            fullWidth
                            inputProps={{ step: '0.01', min: '0' }}
                            placeholder="e.g. 175.00"
                        />
                    </ActivityDialogSection>

                    <ActivityDialogSection
                        tone="success"
                        icon="✅"
                        title="Status & Configuration"
                        description="Set the activity status and upload any images"
                    >
                        {editForm.private_charter_pricing && Object.keys(editForm.private_charter_pricing).length > 0 ? (
                            <Box sx={{ mb: 2 }}>
                                <Button
                                    variant="outlined"
                                    onClick={handleSyncPricing}
                                    disabled={editSaving}
                                    startIcon={<span>🔄</span>}
                                    fullWidth
                                sx={{
                                        height: 46,
                                        borderRadius: '14px',
                                        color: '#15803d',
                                        borderColor: 'rgba(22, 163, 74, 0.22)',
                                        bgcolor: 'rgba(255,255,255,0.92)',
                                        fontWeight: ACTIVITY_FONT_WEIGHTS.primaryButton,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        '&:hover': {
                                            borderColor: 'rgba(22, 163, 74, 0.34)',
                                            bgcolor: '#ffffff'
                                        }
                                    }}
                                >
                                    Sync Group Pricing to Voucher Types
                                </Button>
                                <Typography sx={{ fontSize: '12px', color: '#5b7f68', mt: 1, fontStyle: 'italic' }}>
                                    This updates the private charter voucher types with the group pricing set above.
                                </Typography>
                            </Box>
                        ) : null}

                        <TextField margin="dense" label="Status" name="status" value={editForm.status || ''} onChange={handleEditChange} select fullWidth required>
                            <MenuItem value="Live">Live</MenuItem>
                            <MenuItem value="Draft">Draft</MenuItem>
                            <MenuItem value="Closed">Closed</MenuItem>
                        </TextField>
                        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleEditImageChange}
                                style={{ marginTop: '8px' }}
                            />
                            {editImagePreview ? (
                                <Box
                                    component="img"
                                    src={editImagePreview}
                                    alt="Preview"
                                    sx={{
                                        width: 120,
                                        height: 120,
                                        objectFit: 'cover',
                                        borderRadius: '18px',
                                        border: '1px solid rgba(148, 163, 184, 0.28)',
                                        boxShadow: '0 12px 24px rgba(15, 23, 42, 0.10)'
                                    }}
                                />
                            ) : null}
                        </Box>
                    </ActivityDialogSection>

                    {editError ? (
                        <Box sx={{ color: '#b91c1c', mt: 1, fontWeight: ACTIVITY_FONT_WEIGHTS.label, fontSize: '14px' }}>
                            {editError}
                        </Box>
                    ) : null}
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => setEditOpen(false)} disabled={editSaving} sx={dialogSecondaryButtonSx}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteActivity}
                        variant="outlined"
                        startIcon={<DeleteIcon />}
                        disabled={editSaving}
                        sx={{ ...dialogDangerButtonSx, mr: 'auto' }}
                    >
                        Delete
                    </Button>
                    <Button onClick={handleEditSave} variant="contained" disabled={editSaving} sx={dialogPrimaryButtonSx}>
                        Save
                    </Button>
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
