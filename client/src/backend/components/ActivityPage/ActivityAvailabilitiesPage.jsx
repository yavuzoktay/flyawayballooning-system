import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Table, TableHead, TableRow, TableCell, TableBody, Container, Chip, Box, Typography, FormGroup, FormControlLabel } from '@mui/material';
import CreateAvailabilitiesModal from './CreateAvailabilitiesModal';
import axios from 'axios';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
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

const MONTH_OPTIONS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

const DAY_OPTIONS = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
];

const MERIDIEM_OPTIONS = ['AM', 'PM'];

const EXPERIENCE_TYPE_ORDER = ['Shared', 'Private', 'Private Charter', 'Proposal'];

const parseAvailabilityDate = (dateValue) => {
    if (!dateValue) return null;
    const parsedDate = dayjs(dateValue);
    return parsedDate.isValid() ? parsedDate : null;
};

const getAvailabilityMonthLabel = (availability) => {
    const parsedDate = parseAvailabilityDate(availability?.date);
    return parsedDate ? MONTH_OPTIONS[parsedDate.month()] : '';
};

const getAvailabilityDayLabel = (availability) => {
    const parsedDate = parseAvailabilityDate(availability?.date);
    return parsedDate ? parsedDate.format('dddd') : '';
};

const getAvailabilityMeridiem = (availability) => {
    const timeValue = String(availability?.time || '').trim();
    if (!timeValue) return '';

    const hour = Number.parseInt(timeValue.split(':')[0], 10);
    if (Number.isNaN(hour)) return '';

    return hour >= 12 ? 'PM' : 'AM';
};

const getAvailabilityExperienceTypes = (availability) => {
    const experienceTypes = new Set();

    if (availability?.flight_types && availability.flight_types !== 'All') {
        availability.flight_types
            .split(',')
            .map((type) => type.trim())
            .filter(Boolean)
            .forEach((type) => experienceTypes.add(type));
    }

    if (availability?.voucher_types) {
        const voucherTypes = typeof availability.voucher_types === 'string'
            ? availability.voucher_types.split(',').map((type) => type.trim()).filter(Boolean)
            : availability.voucher_types;

        voucherTypes.forEach((voucherType) => {
            const lowerVoucherType = voucherType.toLowerCase();
            if (lowerVoucherType.includes('private charter')) {
                experienceTypes.add('Private Charter');
            }
            if (lowerVoucherType.includes('proposal')) {
                experienceTypes.add('Proposal');
            }
        });
    }

    return Array.from(experienceTypes).sort((first, second) => {
        const firstIndex = EXPERIENCE_TYPE_ORDER.indexOf(first);
        const secondIndex = EXPERIENCE_TYPE_ORDER.indexOf(second);

        if (firstIndex === -1 && secondIndex === -1) {
            return first.localeCompare(second);
        }
        if (firstIndex === -1) return 1;
        if (secondIndex === -1) return -1;
        return firstIndex - secondIndex;
    });
};

const ActivityAvailabilitiesPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [activityName, setActivityName] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [availabilities, setAvailabilities] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [filterDialogOpen, setFilterDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedFlightTypesForDelete, setSelectedFlightTypesForDelete] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        monthMulti: [],
        dayOfWeekMulti: [],
        meridiemMulti: [],
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

    const uniqueMonths = useMemo(() => {
        const months = new Set();
        availabilities.forEach((availability) => {
            const monthLabel = getAvailabilityMonthLabel(availability);
            if (monthLabel) {
                months.add(monthLabel);
            }
        });

        return MONTH_OPTIONS.filter((month) => months.has(month));
    }, [availabilities]);

    const uniqueDaysOfWeek = useMemo(() => {
        const days = new Set();
        availabilities.forEach((availability) => {
            const dayLabel = getAvailabilityDayLabel(availability);
            if (dayLabel) {
                days.add(dayLabel);
            }
        });

        return DAY_OPTIONS.filter((day) => days.has(day));
    }, [availabilities]);

    const uniqueMeridiems = useMemo(() => {
        const meridiems = new Set();
        availabilities.forEach((availability) => {
            const meridiem = getAvailabilityMeridiem(availability);
            if (meridiem) {
                meridiems.add(meridiem);
            }
        });

        return MERIDIEM_OPTIONS.filter((meridiem) => meridiems.has(meridiem));
    }, [availabilities]);

    const uniqueExperiences = useMemo(() => {
        const experiences = new Set();
        availabilities.forEach((availability) => {
            getAvailabilityExperienceTypes(availability).forEach((experienceType) => {
                experiences.add(experienceType);
            });
        });

        return Array.from(experiences).sort((first, second) => {
            const firstIndex = EXPERIENCE_TYPE_ORDER.indexOf(first);
            const secondIndex = EXPERIENCE_TYPE_ORDER.indexOf(second);

            if (firstIndex === -1 && secondIndex === -1) {
                return first.localeCompare(second);
            }
            if (firstIndex === -1) return 1;
            if (secondIndex === -1) return -1;
            return firstIndex - secondIndex;
        });
    }, [availabilities]);

    const filteredAvailabilities = useMemo(() => {
        const today = dayjs().startOf('day');
        const currentMonthIndex = today.month();
        const selectedPastMonths = new Set(
            filters.monthMulti.filter((monthLabel) => MONTH_OPTIONS.indexOf(monthLabel) !== -1 && MONTH_OPTIONS.indexOf(monthLabel) < currentMonthIndex)
        );

        return availabilities.filter((availability) => {
            const availabilityDate = parseAvailabilityDate(availability.date);
            const availabilityMonth = getAvailabilityMonthLabel(availability);
            const availabilityDay = getAvailabilityDayLabel(availability);
            const availabilityMeridiem = getAvailabilityMeridiem(availability);
            const availabilityExperienceTypes = getAvailabilityExperienceTypes(availability);

            if (availabilityDate && availabilityDate.isBefore(today, 'day')) {
                const monthOverridesTodayCutoff = availabilityMonth && selectedPastMonths.has(availabilityMonth);
                if (!monthOverridesTodayCutoff) {
                    return false;
                }
            }

            if (filters.monthMulti.length > 0 && !filters.monthMulti.includes(availabilityMonth)) {
                return false;
            }

            if (filters.dayOfWeekMulti.length > 0 && !filters.dayOfWeekMulti.includes(availabilityDay)) {
                return false;
            }

            if (filters.meridiemMulti.length > 0 && !filters.meridiemMulti.includes(availabilityMeridiem)) {
                return false;
            }

            if (
                filters.experienceMulti.length > 0 &&
                !availabilityExperienceTypes.some((experienceType) => filters.experienceMulti.includes(experienceType))
            ) {
                return false;
            }

            return true;
        });
    }, [availabilities, filters]);

    const activeFilterCount = useMemo(() => (
        filters.monthMulti.length +
        filters.dayOfWeekMulti.length +
        filters.meridiemMulti.length +
        filters.experienceMulti.length
    ), [filters]);

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
            monthMulti: [],
            dayOfWeekMulti: [],
            meridiemMulti: [],
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
        <Container maxWidth="lg" style={{ marginTop: 40 }} className="availabilities-page-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }} className="availabilities-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }} className="availabilities-title-section">
                    <Button 
                        variant="outlined" 
                        onClick={() => navigate(-1)}
                        sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        className="availabilities-back-button"
                    >
                        &larr; Back
                    </Button>
                    <h2 style={{ margin: 0 }} className="availabilities-title">Availabilities{activityName ? ` - ${activityName}` : ''}</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="availabilities-actions">
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
                            borderColor: activeFilterCount > 0 ? 'primary.main' : 'grey.400',
                            color: activeFilterCount > 0 ? 'primary.main' : 'inherit'
                        }}
                    >
                        Filter
                        {activeFilterCount > 0 && (
                            <Chip 
                                label={activeFilterCount} 
                                size="small" 
                                sx={{ ml: 1, height: 20, minWidth: 20 }}
                            />
                        )}
                    </Button>
                    {/* Show active filters as chips */}
                    {activeFilterCount > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {filters.monthMulti.map((month) => (
                                <Chip
                                    key={`month-${month}`}
                                    size="small"
                                    label={`Month: ${month}`}
                                    onDelete={() => handleCheckboxFilterChange('monthMulti', month)}
                                    color="primary"
                                    variant="outlined"
                                />
                            ))}
                            {filters.dayOfWeekMulti.map((day) => (
                                <Chip
                                    key={`day-${day}`}
                                    size="small"
                                    label={`Day: ${day}`}
                                    onDelete={() => handleCheckboxFilterChange('dayOfWeekMulti', day)}
                                    color="primary"
                                    variant="outlined"
                                />
                            ))}
                            {filters.meridiemMulti.map((meridiem) => (
                                <Chip
                                    key={`meridiem-${meridiem}`}
                                    size="small"
                                    label={`AM/PM: ${meridiem}`}
                                    onDelete={() => handleCheckboxFilterChange('meridiemMulti', meridiem)}
                                    color="primary"
                                    variant="outlined"
                                />
                            ))}
                            {filters.experienceMulti.map((experience) => (
                                <Chip
                                    key={`exp-${experience}`}
                                    size="small"
                                    label={`Experience: ${experience}`}
                                    onDelete={() => handleCheckboxFilterChange('experienceMulti', experience)}
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
            <div className="availabilities-table-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
            <Table className="availabilities-table">
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
                        <TableRow key={row.id} hover>
                            <TableCell padding="checkbox">
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
                                    const experienceTypes = getAvailabilityExperienceTypes(row);

                                    if (experienceTypes.length === 0) {
                                        return (
                                            <Chip 
                                                label="All" 
                                                size="small" 
                                                color="default" 
                                                variant="outlined"
                                            />
                                        );
                                    }

                                    return (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {experienceTypes.map((experienceType) => (
                                                <Chip
                                                    key={`${row.id}-${experienceType}`}
                                                    label={experienceType}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            ))}
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
            </div>
            )}
            <CreateAvailabilitiesModal open={modalOpen} onClose={() => setModalOpen(false)} activityName={activityName} activityId={id} onCreated={() => {
                setLoading(true);
                axios.get(`/api/activity/${id}/availabilities`, { timeout: 60000 }).then(res => {
                    if (res.data.success) setAvailabilities(res.data.data);
                }).catch(error => {
                    console.error('Error refreshing availabilities:', error);
                }).finally(() => {
                    setLoading(false);
                });
            }} />
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
                        Month
                    </Typography>
                    <FormGroup sx={{ mb: 2 }}>
                        {uniqueMonths.map((month) => (
                            <FormControlLabel
                                key={month}
                                control={
                                    <Checkbox
                                        checked={filters.monthMulti.includes(month)}
                                        onChange={() => handleCheckboxFilterChange('monthMulti', month)}
                                    />
                                }
                                label={month}
                            />
                        ))}
                    </FormGroup>

                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        Day of Week
                    </Typography>
                    <FormGroup sx={{ mb: 2 }}>
                        {uniqueDaysOfWeek.map((day) => (
                            <FormControlLabel
                                key={day}
                                control={
                                    <Checkbox
                                        checked={filters.dayOfWeekMulti.includes(day)}
                                        onChange={() => handleCheckboxFilterChange('dayOfWeekMulti', day)}
                                    />
                                }
                                label={day}
                            />
                        ))}
                    </FormGroup>

                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        AM / PM
                    </Typography>
                    <FormGroup sx={{ mb: 2 }}>
                        {uniqueMeridiems.map((meridiem) => (
                            <FormControlLabel
                                key={meridiem}
                                control={
                                    <Checkbox
                                        checked={filters.meridiemMulti.includes(meridiem)}
                                        onChange={() => handleCheckboxFilterChange('meridiemMulti', meridiem)}
                                    />
                                }
                                label={meridiem}
                            />
                        ))}
                    </FormGroup>

                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        Experience Type
                    </Typography>
                    <FormGroup>
                        {uniqueExperiences.map((experience) => (
                            <FormControlLabel
                                key={experience}
                                control={
                                    <Checkbox
                                        checked={filters.experienceMulti.includes(experience)}
                                        onChange={() => handleCheckboxFilterChange('experienceMulti', experience)}
                                    />
                                }
                                label={experience}
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
