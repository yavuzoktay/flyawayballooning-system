import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Table, TableHead, TableRow, TableCell, TableBody, Container, Chip, Box, Typography, FormGroup, FormControlLabel } from '@mui/material';
import CreateAvailabilitiesModal from './CreateAvailabilitiesModal';
import axios from 'axios';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import Checkbox from '@mui/material/Checkbox';

const columns = [
    { key: 'schedule', label: 'Schedule' },
    { key: 'date', label: 'Date' },
    { key: 'day_of_week', label: 'Day of Week' },
    { key: 'time', label: 'Time' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'available', label: 'Available' },
    { key: 'total_booked', label: 'Booked' },
    { key: 'flight_types', label: 'Flight Type' },
    { key: 'status', label: 'Status' },
    { key: 'channels', label: 'Channels' },
];

const ActivityAvailabilitiesPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [activityName, setActivityName] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [availabilities, setAvailabilities] = useState([]);
    const [selectedRow, setSelectedRow] = useState(null);
    const [editDate, setEditDate] = useState('');
    const [editOpen, setEditOpen] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);
    const [filterDialogOpen, setFilterDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedFlightTypesForDelete, setSelectedFlightTypesForDelete] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        timeMulti: [],
        experienceMulti: [],
    });

    useEffect(() => {
        // Fetch activity details to get the activity name
        axios.get(`/api/activity/${id}`).then(res => {
            if (res.data.success) {
                setActivityName(res.data.data.activity_name || '');
            }
        });

        // Fetch and auto-update availabilities with increased timeout
        const fetchAndUpdateAvailabilities = async () => {
            setLoading(true);
            try {
                // First, auto-update status and available counts
                try {
                    // Auto-update status
                    await axios.post(`/api/activity/${id}/updateAvailabilityStatus`);
                    
                    // Update available counts
                    await axios.post(`/api/activity/${id}/updateAvailableCounts`);
                } catch (updateError) {
                    console.warn('Error auto-updating availabilities (non-critical):', updateError);
                    // Continue even if auto-update fails
                }
                
                // Then fetch updated availabilities with 60 second timeout
                const res = await axios.get(`/api/activity/${id}/availabilities`, {
                    timeout: 60000 // 60 seconds
                });
                if (res.data.success) {
                    setAvailabilities(res.data.data);
                }
            } catch (error) {
                console.error('Error fetching availabilities:', error);
                if (error.code === 'ECONNABORTED') {
                    alert('Request timeout. The query is taking longer than expected. Please try again or contact support.');
                } else {
                    alert('Failed to fetch availabilities. Please try again.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchAndUpdateAvailabilities();
    }, [id]);

    const handleRowClick = (row) => {
        setSelectedRow(row);
        setEditDate(row.date);
        setEditOpen(true);
    };

    const handleEditSave = async () => {
        await axios.put(`/api/availability/${selectedRow.id}`, { date: editDate });
        setEditOpen(false);
        // Tabloyu güncelle
        setLoading(true);
        axios.get(`/api/activity/${id}/availabilities`, { timeout: 60000 }).then(res => {
            if (res.data.success) setAvailabilities(res.data.data);
        }).catch(error => {
            console.error('Error refreshing availabilities:', error);
        }).finally(() => {
            setLoading(false);
        });
    };

    const handleDelete = async () => {
        await axios.delete(`/api/availability/${selectedRow.id}`);
        setEditOpen(false);
        // Tabloyu güncelle
        setLoading(true);
        axios.get(`/api/activity/${id}/availabilities`, { timeout: 60000 }).then(res => {
            if (res.data.success) setAvailabilities(res.data.data);
        }).catch(error => {
            console.error('Error refreshing availabilities:', error);
        }).finally(() => {
            setLoading(false);
        });
    };

    const handleStatusToggle = async (availabilityId, currentStatus, event) => {
        event.stopPropagation(); // Prevent row click
        const newStatus = currentStatus === 'Open' ? 'Closed' : 'Open';
        
        try {
            await axios.patch(`/api/availability/${availabilityId}/status`, { status: newStatus });
            // Update local state immediately for better UX
            setAvailabilities(prev => prev.map(avail => 
                avail.id === availabilityId ? { ...avail, status: newStatus } : avail
            ));
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status. Please try again.');
        }
    };

    const handleCheckboxChange = (id) => {
        setSelectedRows(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]);
    };

    // Get unique time values from availabilities
    const uniqueTimes = useMemo(() => {
        const times = new Set();
        availabilities.forEach(avail => {
            if (avail.time) {
                const timeStr = avail.time.slice(0, 5); // Get HH:mm format
                times.add(timeStr);
            }
        });
        return Array.from(times).sort();
    }, [availabilities]);

    // Get unique experience values from availabilities
    const uniqueExperiences = useMemo(() => {
        const experiences = new Set();
        availabilities.forEach(avail => {
            // Check flight_types
            if (avail.flight_types && avail.flight_types !== 'All') {
                const types = avail.flight_types.split(',').map(t => t.trim()).filter(Boolean);
                types.forEach(type => experiences.add(type));
            }
            // Check voucher_types for Private Charter and Proposal
            if (avail.voucher_types) {
                const voucherTypes = typeof avail.voucher_types === 'string' 
                    ? avail.voucher_types.split(',').map(t => t.trim()) 
                    : avail.voucher_types;
                voucherTypes.forEach(vt => {
                    if (vt.toLowerCase().includes('private charter')) {
                        experiences.add('Private Charter');
                    }
                    if (vt.toLowerCase().includes('proposal')) {
                        experiences.add('Proposal');
                    }
                });
            }
        });
        return Array.from(experiences).sort();
    }, [availabilities]);

    // Filter availabilities based on selected filters
    const filteredAvailabilities = useMemo(() => {
        // If no filters are selected, return all availabilities
        if (filters.timeMulti.length === 0 && filters.experienceMulti.length === 0) {
            return availabilities;
        }

        return availabilities.filter(avail => {
            // Time filter
            if (filters.timeMulti.length > 0) {
                const availTime = avail.time ? avail.time.slice(0, 5) : '';
                if (!filters.timeMulti.includes(availTime)) {
                    return false;
                }
            }

            // Experience filter
            if (filters.experienceMulti.length > 0) {
                let matchesExperience = false;

                // Check flight_types
                if (avail.flight_types && avail.flight_types !== 'All') {
                    const types = avail.flight_types.split(',').map(t => t.trim()).filter(Boolean);
                    if (types.some(type => filters.experienceMulti.includes(type))) {
                        matchesExperience = true;
                    }
                }

                // Check voucher_types for Private Charter and Proposal
                if (!matchesExperience && avail.voucher_types) {
                    const voucherTypes = typeof avail.voucher_types === 'string' 
                        ? avail.voucher_types.split(',').map(t => t.trim()) 
                        : avail.voucher_types;
                    
                    if (filters.experienceMulti.includes('Private Charter') && 
                        voucherTypes.some(vt => vt.toLowerCase().includes('private charter'))) {
                        matchesExperience = true;
                    }
                    if (filters.experienceMulti.includes('Proposal') && 
                        voucherTypes.some(vt => vt.toLowerCase().includes('proposal'))) {
                        matchesExperience = true;
                    }
                }

                if (!matchesExperience) {
                    return false;
                }
            }

            return true;
        });
    }, [availabilities, filters]);

    const handleCheckboxFilterChange = (field, value) => {
        setFilters(prev => {
            const current = Array.isArray(prev[field]) ? prev[field] : [];
            const exists = current.includes(value);
            const next = exists ? current.filter(v => v !== value) : [...current, value];
            return {
                ...prev,
                [field]: next,
            };
        });
    };

    const handleClearFilters = () => {
        setFilters({
            timeMulti: [],
            experienceMulti: [],
        });
    };

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            setSelectedRows(filteredAvailabilities.map(row => row.id));
        } else {
            setSelectedRows([]);
        }
    };

    // Get unique flight types from selected availabilities
    const getFlightTypesFromSelected = useMemo(() => {
        const flightTypesSet = new Set();
        const selectedAvailabilities = availabilities.filter(avail => selectedRows.includes(avail.id));
        
        selectedAvailabilities.forEach(avail => {
            // Get flight_types
            if (avail.flight_types && avail.flight_types !== 'All') {
                const types = avail.flight_types.split(',').map(t => t.trim()).filter(Boolean);
                types.forEach(type => flightTypesSet.add(type));
            }
            // Get voucher_types for Private Charter and Proposal
            if (avail.voucher_types) {
                const voucherTypes = typeof avail.voucher_types === 'string' 
                    ? avail.voucher_types.split(',').map(t => t.trim()) 
                    : avail.voucher_types;
                voucherTypes.forEach(vt => {
                    if (vt.toLowerCase().includes('private charter')) {
                        flightTypesSet.add('Private Charter');
                    }
                    if (vt.toLowerCase().includes('proposal')) {
                        flightTypesSet.add('Proposal');
                    }
                });
            }
        });
        
        return Array.from(flightTypesSet).sort();
    }, [selectedRows, availabilities]);

    const handleDeleteClick = () => {
        if (selectedRows.length === 0) return;
        
        // Reset selected flight types
        setSelectedFlightTypesForDelete([]);
        // Open delete dialog
        setDeleteDialogOpen(true);
    };

    const handleFlightTypeDeleteToggle = (flightType) => {
        setSelectedFlightTypesForDelete(prev => {
            if (prev.includes(flightType)) {
                return prev.filter(ft => ft !== flightType);
            } else {
                return [...prev, flightType];
            }
        });
    };

    const handleSelectAllFlightTypesForDelete = (checked) => {
        if (checked) {
            setSelectedFlightTypesForDelete([...getFlightTypesFromSelected]);
        } else {
            setSelectedFlightTypesForDelete([]);
        }
    };

    const handleConfirmDelete = async () => {
        if (selectedFlightTypesForDelete.length === 0) {
            alert('Please select at least one Flight Type to delete.');
            return;
        }

        // Get selected availabilities
        const selectedAvailabilities = availabilities.filter(avail => selectedRows.includes(avail.id));
        
        if (selectedAvailabilities.length === 0) {
            alert('No availabilities selected.');
            setDeleteDialogOpen(false);
            return;
        }

        try {
            // Update each availability to remove selected flight types
            const updatePromises = selectedAvailabilities.map(async (avail) => {
                let updatedFlightTypes = avail.flight_types || 'All';
                let updatedVoucherTypes = avail.voucher_types || '';

                // Process flight_types
                if (updatedFlightTypes && updatedFlightTypes !== 'All') {
                    const types = updatedFlightTypes.split(',').map(t => t.trim()).filter(Boolean);
                    const remainingTypes = types.filter(type => !selectedFlightTypesForDelete.includes(type));
                    
                    if (remainingTypes.length === 0) {
                        updatedFlightTypes = 'All';
                    } else {
                        updatedFlightTypes = remainingTypes.join(',');
                    }
                }

                // Process voucher_types
                if (updatedVoucherTypes) {
                    const voucherTypes = typeof updatedVoucherTypes === 'string' 
                        ? updatedVoucherTypes.split(',').map(t => t.trim()).filter(Boolean)
                        : updatedVoucherTypes;
                    
                    const remainingVoucherTypes = voucherTypes.filter(vt => {
                        const vtLower = vt.toLowerCase();
                        // Check if this voucher type should be removed
                        if (selectedFlightTypesForDelete.includes('Private Charter') && 
                            vtLower.includes('private charter')) {
                            return false;
                        }
                        if (selectedFlightTypesForDelete.includes('Proposal') && 
                            vtLower.includes('proposal')) {
                            return false;
                        }
                        return true;
                    });
                    
                    updatedVoucherTypes = remainingVoucherTypes.length > 0 
                        ? remainingVoucherTypes.join(',') 
                        : '';
                }

                // Update the availability
                return axios.patch(`/api/availability/${avail.id}/flight-types`, {
                    flight_types: updatedFlightTypes,
                    voucher_types: updatedVoucherTypes || null
                });
            });

            await Promise.all(updatePromises);
            
            setSelectedRows([]);
            setDeleteDialogOpen(false);
            setSelectedFlightTypesForDelete([]);
            
            // Refresh table
            setLoading(true);
            const res = await axios.get(`/api/activity/${id}/availabilities`, { timeout: 60000 });
            if (res.data.success) {
                setAvailabilities(res.data.data);
                alert(`Successfully removed selected Flight Types from ${selectedAvailabilities.length} availability(ies).`);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error removing flight types:', error);
            alert('Failed to remove flight types. Please try again.');
            setLoading(false);
        }
    };


    return (
        <Container maxWidth="lg" style={{ marginTop: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Button 
                        variant="outlined" 
                        onClick={() => navigate(-1)}
                        sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                    >
                        &larr; Back
                    </Button>
                    <h2 style={{ margin: 0 }}>Availabilities{activityName ? ` - ${activityName}` : ''}</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Button
                        variant="contained"
                        color="error"
                        disabled={selectedRows.length === 0}
                        onClick={handleDeleteClick}
                    >
                        Delete
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => setFilterDialogOpen(true)}
                        sx={{ 
                            borderColor: (filters.timeMulti.length > 0 || filters.experienceMulti.length > 0) ? 'primary.main' : 'grey.400',
                            color: (filters.timeMulti.length > 0 || filters.experienceMulti.length > 0) ? 'primary.main' : 'inherit'
                        }}
                    >
                        Filter
                        {(filters.timeMulti.length > 0 || filters.experienceMulti.length > 0) && (
                            <Chip 
                                label={filters.timeMulti.length + filters.experienceMulti.length} 
                                size="small" 
                                sx={{ ml: 1, height: 20, minWidth: 20 }}
                            />
                        )}
                    </Button>
                    {/* Show active filters as chips */}
                    {(filters.timeMulti.length > 0 || filters.experienceMulti.length > 0) && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {filters.timeMulti.map(time => (
                                <Chip
                                    key={`time-${time}`}
                                    size="small"
                                    label={`Time: ${time}`}
                                    onDelete={() => handleCheckboxFilterChange('timeMulti', time)}
                                    color="primary"
                                    variant="outlined"
                                />
                            ))}
                            {filters.experienceMulti.map(exp => (
                                <Chip
                                    key={`exp-${exp}`}
                                    size="small"
                                    label={`Experience: ${exp}`}
                                    onDelete={() => handleCheckboxFilterChange('experienceMulti', exp)}
                                    color="primary"
                                    variant="outlined"
                                />
                            ))}
                        </Box>
                    )}
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={() => setModalOpen(true)}
                        sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                    >
                        Create Availabilities
                    </Button>
                </div>
            </div>
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <Typography variant="h6" color="primary">
                        Loading availabilities...
                    </Typography>
                </Box>
            ) : (
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell padding="checkbox">
                            <Checkbox
                                indeterminate={selectedRows.length > 0 && selectedRows.length < filteredAvailabilities.length}
                                checked={filteredAvailabilities.length > 0 && selectedRows.length === filteredAvailabilities.length}
                                onChange={handleSelectAll}
                            />
                        </TableCell>
                        {columns.map(col => <TableCell key={col.key}>{col.label}</TableCell>)}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {filteredAvailabilities.map(row => (
                        <TableRow key={row.id} hover style={{ cursor: 'pointer' }} onClick={() => handleRowClick(row)}>
                            <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                                <Checkbox
                                    checked={selectedRows.includes(row.id)}
                                    onChange={() => handleCheckboxChange(row.id)}
                                />
                            </TableCell>
                            <TableCell>{row.schedule || ''}</TableCell>
                            <TableCell>
                                {row.date ? (
                                    <a
                                        href={`https://flyawayballooning-system.com/manifest?date=${dayjs(row.date).format('YYYY-MM-DD')}`}
                                        style={{ color: '#3274b4', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {new Date(row.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })}
                                    </a>
                                ) : ''}
                            </TableCell>
                            <TableCell>{row.day_of_week}</TableCell>
                            <TableCell>{row.time ? row.time.slice(0,5) : ''}</TableCell>
                            <TableCell>{row.capacity}</TableCell>
                            <TableCell>{row.available}</TableCell>
                            <TableCell>{row.total_booked}</TableCell>
                            <TableCell>
                                {(() => {
                                    // Check voucher_types to determine which chips to show
                                    const voucherTypes = row.voucher_types ? (typeof row.voucher_types === 'string' ? row.voucher_types.split(',').map(t => t.trim()) : row.voucher_types) : [];
                                    const hasProposalFlight = voucherTypes.some(vt => vt.toLowerCase().includes('proposal flight'));
                                    const hasPrivateCharter = voucherTypes.some(vt => vt.toLowerCase().includes('private charter'));
                                    
                                    // Parse flight_types
                                    const flightTypes = row.flight_types && row.flight_types !== 'All' 
                                        ? row.flight_types.split(',').map(t => t.trim()).filter(Boolean)
                                        : [];
                                    
                                    // Build chips array - show both voucher types AND flight types
                                    const chips = [];
                                    
                                    // Add Private Charter chip if exists
                                    if (hasPrivateCharter) {
                                        chips.push(
                                                <Chip 
                                                    key="private-charter"
                                                    label="Private Charter" 
                                                    size="small" 
                                                    color="primary" 
                                                    variant="outlined"
                                                />
                                        );
                                    }
                                    
                                    // Add Proposal chip if exists
                                    if (hasProposalFlight) {
                                        chips.push(
                                            <Chip 
                                                key="proposal"
                                                label="Proposal" 
                                                size="small" 
                                                color="primary" 
                                                variant="outlined"
                                            />
                                        );
                                    }
                                    
                                    // Add flight types chips (Shared, Private, etc.)
                                    flightTypes.forEach((type, index) => {
                                        chips.push(
                                            <Chip 
                                                key={`flight-type-${index}`}
                                                label={type.trim()} 
                                                size="small" 
                                                color="primary" 
                                                variant="outlined"
                                            />
                                        );
                                    });
                                    
                                    // If no chips, show "All"
                                    if (chips.length === 0) {
                                        return (
                                            <Chip 
                                                label="All" 
                                                size="small" 
                                                color="default" 
                                                variant="outlined"
                                            />
                                        );
                                    }
                                    
                                    // Return chips in a flex container
                                    return (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {chips}
                                        </div>
                                    );
                                })()}
                            </TableCell>
                            <TableCell>
                                <Chip 
                                    label={row.status} 
                                    color={row.status === 'Open' ? 'success' : 'error'} 
                                    size="small"
                                    onClick={(e) => handleStatusToggle(row.id, row.status, e)}
                                    style={{ cursor: 'pointer' }}
                                    title={`Click to toggle status. Current: ${row.status}`}
                                />
                                {row.total_booked >= row.capacity && row.status === 'Closed' && (
                                    <Chip 
                                        label="Full" 
                                        color="warning" 
                                        size="small" 
                                        variant="outlined"
                                        style={{ marginLeft: 4 }}
                                        title="Capacity reached - automatically closed"
                                    />
                                )}
                            </TableCell>
                            <TableCell>
                                <Chip label={row.channels} color="success" size="small" />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            )}
            <CreateAvailabilitiesModal open={modalOpen} onClose={() => setModalOpen(false)} activityName={activityName} activityId={id} onCreated={() => {
                axios.get(`/api/activity/${id}/availabilities`).then(res => {
                    if (res.data.success) setAvailabilities(res.data.data);
                });
            }} onCreated={() => {
                setLoading(true);
                axios.get(`/api/activity/${id}/availabilities`, { timeout: 60000 }).then(res => {
                    if (res.data.success) setAvailabilities(res.data.data);
                }).catch(error => {
                    console.error('Error refreshing availabilities:', error);
                }).finally(() => {
                    setLoading(false);
                });
            }} />
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>
                    Availability for {selectedRow ? `${dayjs(selectedRow.date).format('DD/MM/YYYY')} at ${selectedRow.time ? selectedRow.time.slice(0,5) : ''}` : ''}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        label="Start Date"
                        type="date"
                        value={editDate}
                        onChange={e => setEditDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditOpen(false)}>Back</Button>
                    <IconButton onClick={handleDelete} color="error"><DeleteIcon /></IconButton>
                    <Button onClick={handleEditSave} variant="contained" color="primary">Save</Button>
                </DialogActions>
            </Dialog>
            {/* Filter Dialog */}
            <Dialog
                open={filterDialogOpen}
                onClose={() => setFilterDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 700, fontSize: 22 }}>
                    Filter Availabilities
                </DialogTitle>
                <DialogContent dividers>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        Time
                    </Typography>
                    <FormGroup sx={{ mb: 2 }}>
                        {uniqueTimes.map(time => (
                            <FormControlLabel
                                key={time}
                                control={
                                    <Checkbox
                                        checked={filters.timeMulti.includes(time)}
                                        onChange={() => handleCheckboxFilterChange('timeMulti', time)}
                                    />
                                }
                                label={time}
                            />
                        ))}
                    </FormGroup>

                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        Experience
                    </Typography>
                    <FormGroup>
                        {uniqueExperiences.map(exp => (
                            <FormControlLabel
                                key={exp}
                                control={
                                    <Checkbox
                                        checked={filters.experienceMulti.includes(exp)}
                                        onChange={() => handleCheckboxFilterChange('experienceMulti', exp)}
                                    />
                                }
                                label={exp}
                            />
                        ))}
                    </FormGroup>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClearFilters}>Clear</Button>
                    <Button onClick={() => setFilterDialogOpen(false)} variant="contained" color="primary">
                        Apply
                    </Button>
                </DialogActions>
            </Dialog>
            {/* Delete Confirmation Dialog with Flight Type Selection */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 700, fontSize: 22 }}>
                    Delete Availabilities
                </DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                        {selectedRows.length} availability(ies) selected. Please select the Flight Types you want to delete:
                    </Typography>
                    {getFlightTypesFromSelected.length > 0 ? (
                        <>
                            <Box sx={{ mb: 2 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={selectedFlightTypesForDelete.length === getFlightTypesFromSelected.length}
                                            indeterminate={selectedFlightTypesForDelete.length > 0 && selectedFlightTypesForDelete.length < getFlightTypesFromSelected.length}
                                            onChange={(e) => handleSelectAllFlightTypesForDelete(e.target.checked)}
                                        />
                                    }
                                    label={<Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Select All</Typography>}
                                />
                            </Box>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                Flight Types
                            </Typography>
                            <FormGroup>
                                {getFlightTypesFromSelected.map(flightType => (
                                    <FormControlLabel
                                        key={flightType}
                                        control={
                                            <Checkbox
                                                checked={selectedFlightTypesForDelete.includes(flightType)}
                                                onChange={() => handleFlightTypeDeleteToggle(flightType)}
                                            />
                                        }
                                        label={flightType}
                                    />
                                ))}
                            </FormGroup>
                        </>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            No Flight Types found in selected availabilities.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={handleConfirmDelete} 
                        variant="contained" 
                        color="error"
                        disabled={selectedFlightTypesForDelete.length === 0}
                    >
                        Delete Selected
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default ActivityAvailabilitiesPage; 