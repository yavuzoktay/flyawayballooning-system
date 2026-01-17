import axios from "axios";
import React, { useEffect, useState, useMemo } from "react";
import { 
    Container, 
    Typography, 
    Box, 
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    useTheme,
    useMediaQuery,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Divider,
    IconButton
} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import PaginatedTable from "../components/BookingPage/PaginatedTable";
import { getAssignedResourceInfo } from '../utils/resourceAssignment';

const FlownFlights = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    const [flownFlights, setFlownFlights] = useState([]);
    const [filteredFlights, setFilteredFlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [experienceFilter, setExperienceFilter] = useState('');
    const [pilotFilter, setPilotFilter] = useState('');
    const [operationalFields, setOperationalFields] = useState([]);
    
    // Booking Details popup states
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState(null);
    const [bookingDetail, setBookingDetail] = useState(null);
    const assignedResource = useMemo(() => {
        if (!bookingDetail?.booking) return null;
        return getAssignedResourceInfo(bookingDetail);
    }, [bookingDetail]);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [detailError, setDetailError] = useState(null);
    const [bookingHistory, setBookingHistory] = useState([]);
    
    // Edit states
    const [editField, setEditField] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    
    // Passenger edit states
    const [editingPassenger, setEditingPassenger] = useState(null);
    const [editPassengerFirstName, setEditPassengerFirstName] = useState('');
    const [editPassengerLastName, setEditPassengerLastName] = useState('');
    const [editPassengerWeight, setEditPassengerWeight] = useState('');
    const [editPassengerPrice, setEditPassengerPrice] = useState('');
    const [savingPassengerEdit, setSavingPassengerEdit] = useState(false);
    
    // Passenger edit functions
    const handleEditPassengerClick = (passenger) => {
        setEditingPassenger(passenger.id);
        setEditPassengerFirstName(passenger.first_name || '');
        setEditPassengerLastName(passenger.last_name || '');
        setEditPassengerWeight(passenger.weight || '');
        setEditPassengerPrice(passenger.price || '');
    };
    
    const handleCancelPassengerEdit = () => {
        setEditingPassenger(null);
        setEditPassengerFirstName('');
        setEditPassengerLastName('');
        setEditPassengerWeight('');
        setEditPassengerPrice('');
    };
    
    const handleDeletePassenger = async (passengerId) => {
        if (!selectedBookingId || !passengerId) return;
        if (!window.confirm('Are you sure you want to delete this passenger?')) return;
        
        try {
            await axios.delete(`/api/deletePassenger?passenger_id=${passengerId}`);
            // Refetch booking details
            const res = await axios.get(`/api/getBookingDetail?booking_id=${selectedBookingId}`);
            setBookingDetail(res.data);
        } catch (err) {
            console.error('Error deleting passenger:', err);
            alert('Failed to delete passenger');
        }
    };
    
    // Helper function to calculate expires date based on flight_attempts
    const calculateExpiresDate = (expiresDate, flightAttempts) => {
        if (!expiresDate) return expiresDate;

        const formatOut = 'DD/MM/YY';
        const attempts = parseInt(flightAttempts, 10) || 0;

        const parseDate = (val) => {
            if (typeof val === 'string' && val.includes('/')) {
                const parts = val.split('/');
                if (parts.length === 3) {
                    return dayjs(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
                }
            }
            return dayjs(val);
        };

        let parsedDate = parseDate(expiresDate);
        if (!parsedDate.isValid()) return expiresDate;

        // Add 6 months if flight_attempts is a multiple of 3
        if (attempts > 0 && attempts % 3 === 0) {
            parsedDate = parsedDate.add(6, 'month');
        }

        return parsedDate.isValid() ? parsedDate.format(formatOut) : expiresDate;
    };
    
    // Edit functions
    const handleEditClick = (field, currentValue) => {
        setEditField(field);
        setEditValue(currentValue || '');
    };

    const handleEditCancel = () => {
        setEditField(null);
        setEditValue('');
    };

    const handleEditSave = async () => {
        if (!editField || !selectedBookingId) return;
        setSavingEdit(true);
        try {
            await axios.patch('/api/updateBookingField', {
                booking_id: selectedBookingId,
                field: editField,
                value: editValue
            });
            
            // Update local state
            setBookingDetail(prev => ({
                ...prev,
                booking: {
                    ...prev.booking,
                    [editField]: editValue
                }
            }));
            
            setEditField(null);
            setEditValue('');
        } catch (err) {
            console.error('Error updating booking field:', err);
            alert('Failed to update field');
        } finally {
            setSavingEdit(false);
        }
    };

    useEffect(() => {
        fetchFlownFlights();
    }, []);
    
    // Fetch booking details when popup opens
    useEffect(() => {
        if (detailDialogOpen && selectedBookingId) {
            setLoadingDetail(true);
            setDetailError(null);
            
            axios.get(`/api/getBookingDetail?booking_id=${selectedBookingId}`)
                .then(async res => {
                    setBookingDetail(res.data);
                    // Also fetch booking history
                    const historyRes = await axios.get(`/api/getBookingHistory?booking_id=${selectedBookingId}`);
                    setBookingHistory(historyRes.data.history || []);
                })
                .catch(err => {
                    console.error('Error loading booking details:', err);
                    setDetailError('Detaylar alınamadı');
                })
                .finally(() => setLoadingDetail(false));
        } else if (!detailDialogOpen) {
            // Dialog kapandığında sıfırla
            setBookingDetail(null);
            setBookingHistory([]);
        }
    }, [detailDialogOpen, selectedBookingId]);
    
    const handleBookingIdClick = (item) => {
        const bookingId = item.id || item.passenger_booking_id;
        if (bookingId) {
            setSelectedBookingId(bookingId);
            setDetailDialogOpen(true);
        }
    };

    const fetchFlownFlights = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/flown-flights');
            if (response.data?.success) {
                setFlownFlights(response.data.data || []);
                setFilteredFlights(response.data.data || []);
                // Set operational fields from response
                if (response.data.operational_fields && response.data.operational_fields.length > 0) {
                    setOperationalFields(response.data.operational_fields);
                } else {
                    // Default fields if not provided
                    setOperationalFields(['Refuel Location', 'Land Owner Gift', 'Landing Fee', 'Vehicle Used']);
                }
            }
        } catch (error) {
            console.error('Error fetching flown flights:', error);
            setFlownFlights([]);
            setFilteredFlights([]);
        } finally {
            setLoading(false);
        }
    };

    // Filter flights based on search term and filters
    useEffect(() => {
        let filtered = [...flownFlights];

        // Search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(flight => 
                (flight.name && flight.name.toLowerCase().includes(search)) ||
                (flight.booking_id && flight.booking_id.toString().includes(search)) ||
                (flight.location && flight.location.toLowerCase().includes(search)) ||
                (flight.flight_type && flight.flight_type.toLowerCase().includes(search)) ||
                (flight.voucher_code && flight.voucher_code.toLowerCase().includes(search)) ||
                (flight.email && flight.email.toLowerCase().includes(search))
            );
        }

        // Location filter
        if (locationFilter) {
            filtered = filtered.filter(flight => flight.location === locationFilter);
        }

        // Experience filter
        if (experienceFilter) {
            filtered = filtered.filter(flight => {
                const flightType = (flight.flight_type || '').toLowerCase();
                if (experienceFilter === 'Private') {
                    return flightType.includes('private');
                } else if (experienceFilter === 'Shared') {
                    return flightType.includes('shared');
                }
                return true;
            });
        }

        // Pilot filter
        if (pilotFilter) {
            filtered = filtered.filter(flight => {
                const pilot = (flight.pilot || '').trim();
                return pilot !== '-' && pilot === pilotFilter;
            });
        }

        setFilteredFlights(filtered);
    }, [searchTerm, locationFilter, experienceFilter, pilotFilter, flownFlights]);

    // Get unique locations for filter
    const locations = useMemo(() => {
        const uniqueLocations = [...new Set(flownFlights.map(f => f.location).filter(Boolean))];
        return uniqueLocations.sort();
    }, [flownFlights]);


    // Get unique pilots for filter
    const pilots = useMemo(() => {
        const uniquePilots = [...new Set(flownFlights.map(f => {
            const pilot = (f.pilot || '').trim();
            return pilot !== '-' ? pilot : null;
        }).filter(Boolean))];
        return uniquePilots.sort();
    }, [flownFlights]);

    return (
        <div className="flown-flights-page-wrap">
            <Container maxWidth={false}>
                <div className="heading-wrap">
                    <h2>FLOWN FLIGHTS PAGE</h2>
                    <hr />
                </div>
                <Box sx={{ padding: isMobile ? 1 : 2 }}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="body1" color="text.secondary">
                            View and manage completed flights
                        </Typography>
                    </Box>

            {/* Filters */}
            <Box sx={{ mb: 3, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}
                    size="small"
                />
                <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
                    <InputLabel>Experience</InputLabel>
                    <Select
                        value={experienceFilter}
                        label="Experience"
                        onChange={(e) => setExperienceFilter(e.target.value)}
                    >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="Shared">Shared</MenuItem>
                        <MenuItem value="Private">Private</MenuItem>
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
                    <InputLabel>Pilot</InputLabel>
                    <Select
                        value={pilotFilter}
                        label="Pilot"
                        onChange={(e) => setPilotFilter(e.target.value)}
                    >
                        <MenuItem value="">All</MenuItem>
                        {pilots.map(pilot => (
                            <MenuItem key={pilot} value={pilot}>{pilot}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
                    <InputLabel>Location</InputLabel>
                    <Select
                        value={locationFilter}
                        label="Location"
                        onChange={(e) => setLocationFilter(e.target.value)}
                    >
                        <MenuItem value="">All</MenuItem>
                        {locations.map(loc => (
                            <MenuItem key={loc} value={loc}>{loc}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {/* Table */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <PaginatedTable
                    itemsPerPage={10}
                    data={filteredFlights.map((item, index) => {
                        const baseData = {
                            row_id: index + 1, // Auto-incrementing ID starting from 1
                            id: item.id || '',
                            passenger_booking_id: item.id || '',
                            location: item.location || '',
                            flight_date: item.flight_date_display || (item.flight_date ? dayjs(item.flight_date).format('DD/MM/YYYY HH:mm A') : ''),
                            pax: item.pax || item.passenger_count || 0,
                            paid: item.paid || '0/0',
                            pilot: item.pilot || '-',
                            crew: item.crew || '-',
                            flight_period: item.flight_period || '-',
                            flight_type_display: item.flight_type_display || '-',
                            balloon_resource: item.balloon_resource || 'N/A',
                            aircraft_defects: item.aircraft_defects || '-',
                            vehicle_trailer_defects: item.vehicle_trailer_defects || '-',
                            flight_start_time: item.flight_start_time || '-',
                            flight_end_time: item.flight_end_time || '-',
                            total_flight_time: item.total_flight_time || '-'
                        };
                        
                        // Helper function to convert field name to column key
                        const fieldToColumnKey = (fieldName) => {
                            return fieldName.toLowerCase().replace(/\s+/g, '_');
                        };
                        
                        // Add operational selections as columns
                        if (item.operational_selections) {
                            operationalFields.forEach(field => {
                                const columnKey = fieldToColumnKey(field);
                                baseData[columnKey] = item.operational_selections[field] || '-';
                            });
                        } else {
                            // If no operational_selections, set all to '-'
                            operationalFields.forEach(field => {
                                const columnKey = fieldToColumnKey(field);
                                baseData[columnKey] = '-';
                            });
                        }
                        
                        return baseData;
                    })}
                    columns={[
                        "row_id",
                        "location",
                        "flight_date",
                        "passenger_booking_id",
                        "flight_period",
                        "flight_type_display",
                        "balloon_resource",
                        "pax",
                        "paid",
                        "flight_start_time",
                        "flight_end_time",
                        "total_flight_time",
                        "pilot",
                        "crew",
                        "aircraft_defects",
                        "vehicle_trailer_defects",
                        ...operationalFields.map(field => field.toLowerCase().replace(/\s+/g, '_'))
                    ]}
                    selectable={false}
                    onBookingIdClick={handleBookingIdClick}
                />
            )}

            {/* Booking Details Dialog - Same as BookingPage */}
            <Dialog 
                open={detailDialogOpen} 
                onClose={() => { setDetailDialogOpen(false); setSelectedBookingId(null); setBookingDetail(null); }} 
                maxWidth="md" 
                fullWidth
                PaperProps={{
                    sx: isMobile ? {
                        margin: '8px',
                        maxHeight: 'calc(100% - 16px)',
                        height: 'calc(100% - 16px)'
                    } : {}
                }}
            >
                <DialogTitle style={{ background: '#2d4263', color: '#fff', fontWeight: 700, fontSize: isMobile ? 18 : 22 }}>
                    Booking Details
                </DialogTitle>
                <DialogContent style={{ background: '#f7f7f7', minHeight: isMobile ? 'auto' : 500, padding: isMobile ? '12px' : '24px' }}>
                    {loadingDetail ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                            <CircularProgress />
                        </Box>
                    ) : detailError ? (
                        <Typography color="error">{detailError}</Typography>
                    ) : bookingDetail && bookingDetail.success ? (
                        <Box>
                            <Grid container spacing={2}>
                                {/* Personal Details */}
                                <Grid item xs={12} md={4}>
                                    <Box sx={{ 
                                        background: '#fff', 
                                        borderRadius: 2, 
                                        p: isMobile ? 1 : 1, 
                                        mb: 0.75, 
                                        boxShadow: 1 
                                    }}>
                                        <Typography variant="h6" sx={{ 
                                            fontWeight: 700, 
                                            mb: isMobile ? 0.25 : 0,
                                            fontSize: isMobile ? '16px' : 'inherit'
                                        }}>
                                            Personal Details
                                        </Typography>
                                        <Typography sx={{ 
                                            mb: isMobile ? 0 : 1,
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        }}><b>Booking Name:</b> {editField === 'name' ? (
                                            <>
                                                <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{marginRight: 8}} />
                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                            </>
                                        ) : (
                                            <>
                                                {(() => {
                                                    const passenger1 = bookingDetail.passengers && bookingDetail.passengers.length > 0 
                                                        ? bookingDetail.passengers[0] 
                                                        : null;
                                                    const passenger1Name = passenger1 
                                                        ? `${passenger1.first_name || ''} ${passenger1.last_name || ''}`.trim() 
                                                        : '';
                                                    return passenger1Name || bookingDetail.booking.name || '-';
                                                })()}
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => {
                                                        const passenger1 = bookingDetail.passengers && bookingDetail.passengers.length > 0 
                                                            ? bookingDetail.passengers[0] 
                                                            : null;
                                                        const passenger1Name = passenger1 
                                                            ? `${passenger1.first_name || ''} ${passenger1.last_name || ''}`.trim() 
                                                            : '';
                                                        handleEditClick('name', passenger1Name || bookingDetail.booking.name || '');
                                                    }}
                                                    sx={{ 
                                                        padding: isMobile ? '2px' : '8px',
                                                        '& .MuiSvgIcon-root': {
                                                            fontSize: isMobile ? '12px' : 'inherit'
                                                        }
                                                    }}
                                                >
                                                    <EditIcon fontSize={isMobile ? '12px' : 'small'} />
                                                </IconButton>
                                            </>
                                        )}</Typography>
                                        <Typography sx={{ 
                                            mb: isMobile ? 0 : 1,
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        }}><b>Booking ID:</b> {bookingDetail.booking.id || '-'}</Typography>
                                        <Typography sx={{ 
                                            mb: isMobile ? 0 : 1,
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        }}><b>Booking Created:</b> {bookingDetail.booking.created_at ? dayjs(bookingDetail.booking.created_at).format('DD/MM/YYYY') : '-'}</Typography>
                                        <Typography sx={{ 
                                            mb: isMobile ? 0 : 1,
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        }}><b>Phone:</b> {editField === 'phone' ? (
                                            <>
                                                <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{marginRight: 8}} />
                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                            </>
                                        ) : (
                                            <>
                                                {(() => {
                                                    const phoneValue = bookingDetail.booking.phone || '-';
                                                    if (phoneValue && phoneValue !== '-') {
                                                        const cleanPhone = phoneValue.replace(/[\s\-()]/g, '');
                                                        return (
                                                            <a 
                                                                href={`tel:${cleanPhone}`}
                                                                style={{ 
                                                                    color: '#3274b4',
                                                                    textDecoration: 'underline',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                {phoneValue}
                                                            </a>
                                                        );
                                                    }
                                                    return phoneValue;
                                                })()}
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => handleEditClick('phone', bookingDetail.booking.phone)}
                                                    sx={{ 
                                                        padding: isMobile ? '2px' : '8px',
                                                        '& .MuiSvgIcon-root': {
                                                            fontSize: isMobile ? '12px' : 'inherit'
                                                        }
                                                    }}
                                                >
                                                    <EditIcon fontSize={isMobile ? '12px' : 'small'} />
                                                </IconButton>
                                            </>
                                        )}</Typography>
                                        <Typography sx={{ 
                                            mb: isMobile ? 0 : 1,
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        }}><b>Email:</b> {editField === 'email' ? (
                                            <>
                                                <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{marginRight: 8}} />
                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                            </>
                                        ) : (
                                            <>
                                                {(() => {
                                                    const emailValue = bookingDetail.booking.email || '-';
                                                    if (emailValue && emailValue !== '-') {
                                                        return (
                                                            <a 
                                                                href={`mailto:${emailValue}`}
                                                                style={{ 
                                                                    color: '#3274b4',
                                                                    textDecoration: 'underline',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                {emailValue}
                                                            </a>
                                                        );
                                                    }
                                                    return emailValue;
                                                })()}
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => handleEditClick('email', bookingDetail.booking.email)}
                                                    sx={{ 
                                                        padding: isMobile ? '2px' : '8px',
                                                        '& .MuiSvgIcon-root': {
                                                            fontSize: isMobile ? '12px' : 'inherit'
                                                        }
                                                    }}
                                                >
                                                    <EditIcon fontSize={isMobile ? '12px' : 'small'} />
                                                </IconButton>
                                            </>
                                        )}</Typography>
                                        <Typography sx={{ 
                                            mb: isMobile ? 0 : 1,
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        }}><b>Flight Attempts:</b> {bookingDetail.booking.flight_attempts ?? 0}</Typography>
                                        <Typography sx={{ 
                                            mb: isMobile ? 0 : 1,
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        }}><b>Voucher Type:</b> {bookingDetail.booking.voucher_type || '-'}</Typography>
                                        <Typography sx={{ 
                                            mb: isMobile ? 0 : 1,
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        }}><b>Paid:</b> {editField === 'paid' ? (
                                            <>
                                                <input value={editValue} onChange={e => setEditValue(e.target.value.replace(/[^0-9.]/g, ''))} style={{marginRight: 8}} />
                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                            </>
                                        ) : (
                                            <>
                                                £{bookingDetail.booking.paid}
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => handleEditClick('paid', bookingDetail.booking.paid)}
                                                    sx={{ 
                                                        padding: isMobile ? '2px' : '8px',
                                                        '& .MuiSvgIcon-root': {
                                                            fontSize: isMobile ? '12px' : 'inherit'
                                                        }
                                                    }}
                                                >
                                                    <EditIcon fontSize={isMobile ? '12px' : 'small'} />
                                                </IconButton>
                                            </>
                                        )}</Typography>
                                        <Typography sx={{ 
                                            mb: isMobile ? 0 : 1,
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        }}><b>Due:</b> {editField === 'due' ? (
                                            <>
                                                <input value={editValue} onChange={e => setEditValue(e.target.value.replace(/[^0-9.]/g, ''))} style={{marginRight: 8}} />
                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                            </>
                                        ) : (
                                            <>
                                                <span style={{ color: bookingDetail.booking.due > 0 ? '#d32f2f' : '#666', fontWeight: bookingDetail.booking.due > 0 ? 600 : 400 }}>
                                                    £{parseFloat(bookingDetail.booking.due || 0).toFixed(2)}
                                                </span>
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => handleEditClick('due', bookingDetail.booking.due)}
                                                    sx={{ 
                                                        padding: isMobile ? '2px' : '8px',
                                                        '& .MuiSvgIcon-root': {
                                                            fontSize: isMobile ? '12px' : 'inherit'
                                                        }
                                                    }}
                                                >
                                                    <EditIcon fontSize={isMobile ? '12px' : 'small'} />
                                                </IconButton>
                                            </>
                                        )}</Typography>
                                        <Typography sx={{ 
                                            mb: isMobile ? 0 : 1,
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        }}><b>Expires:</b> {editField === 'expires' ? (
                                            <>
                                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                    <DatePicker
                                                        value={editValue ? dayjs(editValue) : null}
                                                        onChange={date => setEditValue(date ? date.format('YYYY-MM-DD') : '')}
                                                        format="DD/MM/YYYY"
                                                        slotProps={{ textField: { size: 'small' } }}
                                                    />
                                                    <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                    <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                                </LocalizationProvider>
                                            </>
                                        ) : (
                                            <>
                                                {bookingDetail.booking.expires ? (
                                                    (() => {
                                                        const flightAttempts = bookingDetail.booking.flight_attempts ?? 0;
                                                        return calculateExpiresDate(bookingDetail.booking.expires, flightAttempts);
                                                    })()
                                                ) : '-'}
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => handleEditClick('expires', bookingDetail.booking.expires)}
                                                    sx={{ 
                                                        padding: isMobile ? '2px' : '8px',
                                                        '& .MuiSvgIcon-root': {
                                                            fontSize: isMobile ? '12px' : 'inherit'
                                                        }
                                                    }}
                                                >
                                                    <EditIcon fontSize={isMobile ? '12px' : 'small'} />
                                                </IconButton>
                                            </>
                                        )}</Typography>
                                    </Box>
                                    {/* Add On's */}
                                    <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Add On's</Typography>
                                        <Typography>
                                            <b>WX Refundable:</b>{' '}
                                            {(() => {
                                                let weatherRefundTotalPrice = 0;
                                                const rawValue = bookingDetail.booking?.weather_refund_total_price || null;
                                                if (rawValue !== null && rawValue !== undefined) {
                                                    const parsed = parseFloat(rawValue);
                                                    if (!isNaN(parsed)) {
                                                        weatherRefundTotalPrice = parsed;
                                                    }
                                                }
                                                if (weatherRefundTotalPrice > 0) {
                                                    return (
                                                        <span>
                                                            <span style={{ color: '#10b981', fontWeight: 'bold', marginRight: '4px' }}>✔</span>
                                                            Yes
                                                        </span>
                                                    );
                                                } else {
                                                    return 'No';
                                                }
                                            })()}
                                        </Typography>
                                    </Box>
                                </Grid>
                                
                                {/* Main Details */}
                                <Grid item xs={12} md={8}>
                                    <Box sx={{ background: '#fff', borderRadius: 2, p: 2, boxShadow: 1 }}>
                                        {/* Current Booking */}
                                        <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                            <Box>
                                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Current Booking</Typography>
                                                <Typography><b>Activity:</b> {bookingDetail.booking?.experience || bookingDetail.booking?.flight_type || '-'} - {bookingDetail.booking?.location || '-'}</Typography>
                                                {bookingDetail.booking?.status !== 'Cancelled' && (
                                                    <Typography><b>Booked For:</b> {bookingDetail.booking?.flight_date ? (
                                                        <a
                                                            href={`https://flyawayballooning-system.com/manifest?date=${dayjs(bookingDetail.booking.flight_date).format('YYYY-MM-DD')}&time=${dayjs(bookingDetail.booking.flight_date).format('HH:mm')}`}
                                                            style={{ color: '#3274b4', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                                                        >
                                                            {(() => {
                                                                const flightDateStr = bookingDetail.booking.flight_date;
                                                                if (typeof flightDateStr === 'string' && flightDateStr.match(/^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}/)) {
                                                                    const [datePart, timePart] = flightDateStr.split(/[\sT]/);
                                                                    const [year, month, day] = datePart.split('-');
                                                                    const [hour, minute] = (timePart || '00:00').split(':');
                                                                    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
                                                                    return dayjs(localDate).format('DD/MM/YYYY HH:mm');
                                                                }
                                                                return dayjs(bookingDetail.booking.flight_date).format('DD/MM/YYYY HH:mm');
                                                            })()}
                                                        </a>
                                                    ) : '-'}</Typography>
                                                )}
                                                {(() => {
                                                    const b = bookingDetail.booking || {};
                                                    const redeemed = (b.redeemed === true) || (b.voucher_redeemed === 1) || (typeof b.redeemed_at === 'string' && b.redeemed_at) || (b.redeemed_voucher === 'Yes');
                                                    const voucherCodeToDisplay = b.originalRedeemedVoucherCode || b.voucher_code || '';
                                                    return (
                                                        <Typography>
                                                            <b>Redeemed Voucher:</b> {redeemed ? <span style={{ color: 'green', fontWeight: 600 }}>Yes</span> : <span style={{ color: 'red', fontWeight: 600 }}>No</span>} <span style={{ fontWeight: 500 }}>{voucherCodeToDisplay}</span>
                                                        </Typography>
                                                    );
                                                })()}
                                                {assignedResource && (
                                                    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, border: '1px solid #e0e7ff', background: '#f7f9ff' }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1d4ed8', mb: 0.5 }}>
                                                            Assigned Resources
                                                        </Typography>
                                                        <Typography sx={{ fontWeight: 600 }}>
                                                            {assignedResource.resourceName}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {assignedResource.assignmentType}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                            <Box sx={{ 
                                                display: 'flex', 
                                                flexDirection: isMobile ? 'row' : 'column', 
                                                flexWrap: isMobile ? 'wrap' : 'nowrap',
                                                gap: isMobile ? '8px' : 1, 
                                                minWidth: isMobile ? 'auto' : 140,
                                                width: isMobile ? '100%' : 'auto'
                                            }}>
                                                <Button 
                                                    variant="contained" 
                                                    color="primary" 
                                                    sx={{ 
                                                        mb: isMobile ? 0 : 1, 
                                                        borderRadius: 2, 
                                                        fontWeight: 600, 
                                                        textTransform: 'none',
                                                        flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                                        minWidth: isMobile ? 'auto' : 'auto',
                                                        fontSize: isMobile ? '12px' : '14px',
                                                        padding: isMobile ? '6px 8px' : '8px 16px',
                                                        background: '#2ECC71',
                                                        '&:hover': {
                                                            background: '#27AE60'
                                                        }
                                                    }} 
                                                    disabled={true}
                                                >
                                                    Rebook
                                                </Button>
                                                <Button 
                                                    variant="contained" 
                                                    color="primary" 
                                                    sx={{ 
                                                        mb: isMobile ? 0 : 1, 
                                                        borderRadius: 2, 
                                                        fontWeight: 600, 
                                                        textTransform: 'none',
                                                        flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                                        minWidth: isMobile ? 'auto' : 'auto',
                                                        fontSize: isMobile ? '12px' : '14px',
                                                        padding: isMobile ? '6px 8px' : '8px 16px',
                                                        background: '#1ABC9C',
                                                        '&:hover': {
                                                            background: '#16A085'
                                                        }
                                                    }} 
                                                    disabled={true}
                                                >
                                                    Add Guest
                                                </Button>
                                                <Button 
                                                    variant="contained" 
                                                    color="info" 
                                                    sx={{ 
                                                        mb: isMobile ? 0 : 1, 
                                                        borderRadius: 2, 
                                                        fontWeight: 600, 
                                                        textTransform: 'none', 
                                                        background: '#E74C3C',
                                                        flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                                        minWidth: isMobile ? 'auto' : 'auto',
                                                        fontSize: isMobile ? '12px' : '14px',
                                                        padding: isMobile ? '6px 8px' : '8px 16px',
                                                        '&:hover': {
                                                            background: '#C0392B'
                                                        }
                                                    }} 
                                                    disabled={true}
                                                >
                                                    Cancel Flight
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    sx={{ 
                                                        borderRadius: 2, 
                                                        fontWeight: 600, 
                                                        textTransform: 'none', 
                                                        background: '#3498DB',
                                                        mb: isMobile ? 0 : 1,
                                                        flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                                        minWidth: isMobile ? 'auto' : 'auto',
                                                        fontSize: isMobile ? '12px' : '14px',
                                                        padding: isMobile ? '6px 8px' : '8px 16px',
                                                        '&:hover': {
                                                            background: '#2980B9'
                                                        }
                                                    }}
                                                    disabled={!bookingDetail?.booking?.email}
                                                >
                                                    Email | SMS
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    color="secondary"
                                                    sx={{ 
                                                        borderRadius: 2, 
                                                        fontWeight: 600, 
                                                        textTransform: 'none', 
                                                        background: '#5B6CFF',
                                                        mb: isMobile ? 0 : 1,
                                                        flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                                        minWidth: isMobile ? 'auto' : 'auto',
                                                        fontSize: isMobile ? '12px' : '14px',
                                                        padding: isMobile ? '6px 8px' : '8px 16px',
                                                        '&:hover': {
                                                            background: '#4A5AE8'
                                                        }
                                                    }}
                                                    disabled={!bookingDetail?.booking}
                                                >
                                                    Messages
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    color="info"
                                                    sx={{ 
                                                        borderRadius: 2, 
                                                        fontWeight: 600, 
                                                        textTransform: 'none', 
                                                        background: '#8E44AD', 
                                                        mt: isMobile ? 0 : 1,
                                                        mb: isMobile ? 0 : 1,
                                                        flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                                        minWidth: isMobile ? 'auto' : 'auto',
                                                        fontSize: isMobile ? '12px' : '14px',
                                                        padding: isMobile ? '6px 8px' : '8px 16px',
                                                        '&:hover': {
                                                            background: '#7D3C98'
                                                        }
                                                    }}
                                                    disabled={!bookingDetail?.booking?.id}
                                                >
                                                    Payment History
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    color="info"
                                                    sx={{ 
                                                        borderRadius: 2, 
                                                        fontWeight: 600, 
                                                        textTransform: 'none', 
                                                        background: '#7F8C8D', 
                                                        mt: isMobile ? 0 : 1,
                                                        flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                                        minWidth: isMobile ? 'auto' : 'auto',
                                                        fontSize: isMobile ? '12px' : '14px',
                                                        padding: isMobile ? '6px 8px' : '8px 16px',
                                                        '&:hover': {
                                                            background: '#6C7A7B'
                                                        }
                                                    }}
                                                    disabled={!bookingDetail?.booking?.id}
                                                >
                                                    More
                                                </Button>
                                            </Box>
                                        </Box>
                                        <Divider sx={{ my: 2 }} />
                                        
                                        {/* Passenger Details */}
                                        {bookingDetail.passengers && bookingDetail.passengers.length > 0 && (
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Passenger Details</Typography>
                                                <Box>
                                                    {bookingDetail.passengers.map((p, i) => (
                                                        <Typography key={p.id} sx={{ mb: 1 }}>
                                                            Passenger {i + 1}: {editingPassenger === p.id ? (
                                                                <>
                                                                    <input
                                                                        value={editPassengerFirstName}
                                                                        onChange={e => setEditPassengerFirstName(e.target.value)}
                                                                        placeholder="First Name"
                                                                        style={{ marginRight: 4, width: 90 }}
                                                                    />
                                                                    <input
                                                                        value={editPassengerLastName}
                                                                        onChange={e => setEditPassengerLastName(e.target.value)}
                                                                        placeholder="Last Name"
                                                                        style={{ marginRight: 4, width: 90 }}
                                                                    />
                                                                    <input
                                                                        value={editPassengerWeight}
                                                                        onChange={e => setEditPassengerWeight(e.target.value.replace(/[^0-9.]/g, ''))}
                                                                        placeholder="Weight (kg)"
                                                                        style={{ marginRight: 4, width: 70 }}
                                                                    />
                                                                    {bookingDetail.booking?.experience !== 'Private Charter' && (
                                                                        <input
                                                                            value={editPassengerPrice}
                                                                            onChange={e => setEditPassengerPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                                                                            placeholder="Price (£)"
                                                                            style={{ marginRight: 4, width: 70 }}
                                                                        />
                                                                    )}
                                                                    <Button
                                                                        size="small"
                                                                        onClick={async () => {
                                                                            try {
                                                                                setSavingPassengerEdit(true);
                                                                                const fieldUpdates = [];
                                                                                if (editPassengerFirstName !== (p.first_name || '')) {
                                                                                    fieldUpdates.push({ field: 'first_name', value: editPassengerFirstName });
                                                                                }
                                                                                if (editPassengerLastName !== (p.last_name || '')) {
                                                                                    fieldUpdates.push({ field: 'last_name', value: editPassengerLastName });
                                                                                }
                                                                                if (editPassengerWeight !== (p.weight || '')) {
                                                                                    fieldUpdates.push({ field: 'weight', value: editPassengerWeight });
                                                                                }
                                                                                if (fieldUpdates.length > 0) {
                                                                                    await Promise.all(
                                                                                        fieldUpdates.map(update =>
                                                                                            axios.patch('/api/updatePassengerField', {
                                                                                                passenger_id: p.id,
                                                                                                field: update.field,
                                                                                                value: update.value
                                                                                            })
                                                                                        )
                                                                                    );
                                                                                }
                                                                                if (editPassengerPrice !== (p.price || '')) {
                                                                                    await axios.patch('/api/updatePassengerField', {
                                                                                        passenger_id: p.id,
                                                                                        field: 'price',
                                                                                        value: parseFloat(editPassengerPrice) || 0
                                                                                    });
                                                                                }
                                                                                const res = await axios.get(`/api/getBookingDetail?booking_id=${selectedBookingId}`);
                                                                                setBookingDetail(res.data);
                                                                                setEditingPassenger(null);
                                                                                setEditPassengerFirstName('');
                                                                                setEditPassengerLastName('');
                                                                                setEditPassengerWeight('');
                                                                                setEditPassengerPrice('');
                                                                            } catch (error) {
                                                                                console.error('Failed to save passenger details:', error);
                                                                                alert('Failed to update passenger details');
                                                                            } finally {
                                                                                setSavingPassengerEdit(false);
                                                                            }
                                                                        }}
                                                                        disabled={savingPassengerEdit}
                                                                    >
                                                                        Save
                                                                    </Button>
                                                                    <Button size="small" onClick={handleCancelPassengerEdit} disabled={savingPassengerEdit}>Cancel</Button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {p.first_name || '-'} {p.last_name || '-'}
                                                                    {p.weight ? (
                                                                        bookingDetail.booking?.experience === 'Private Charter' 
                                                                            ? ` (${p.weight}kg)` 
                                                                            : ` (${p.weight}kg £${parseFloat(p.price || 0).toFixed(2)})`
                                                                    ) : (
                                                                        p.price ? ` (£${parseFloat(p.price || 0).toFixed(2)})` : ''
                                                                    )}
                                                                    <IconButton 
                                                                        size="small" 
                                                                        onClick={() => handleEditPassengerClick(p)}
                                                                        sx={{ 
                                                                            padding: isMobile ? '2px' : '8px',
                                                                            '& .MuiSvgIcon-root': {
                                                                                fontSize: isMobile ? '12px' : 'inherit'
                                                                            }
                                                                        }}
                                                                    >
                                                                        <EditIcon fontSize={isMobile ? '12px' : 'small'} />
                                                                    </IconButton>
                                                                    {i > 0 && (
                                                                        <IconButton 
                                                                            size="small" 
                                                                            onClick={() => handleDeletePassenger(p.id)}
                                                                            sx={{ 
                                                                                color: 'red',
                                                                                padding: isMobile ? '2px' : '8px',
                                                                                '& .MuiSvgIcon-root': {
                                                                                    fontSize: isMobile ? '12px' : 'inherit'
                                                                                }
                                                                            }}
                                                                        >
                                                                            <DeleteIcon fontSize={isMobile ? '12px' : 'small'} />
                                                                        </IconButton>
                                                                    )}
                                                                </>
                                                            )}
                                                        </Typography>
                                                    ))}
                                                </Box>
                                            </Box>
                                        )}
                                        
                                        {/* Notes */}
                                        <Box sx={{ mt: 2 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Notes</Typography>
                                            <TextField
                                                fullWidth
                                                multiline
                                                rows={4}
                                                placeholder="Type your message here..."
                                                variant="outlined"
                                                sx={{ background: 'white' }}
                                            />
                                        </Box>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>
                    ) : (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="h6" color="text.secondary">
                                Booking details not available
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ background: '#f7f7f7' }}>
                    <Button 
                        onClick={() => { setDetailDialogOpen(false); setSelectedBookingId(null); setBookingDetail(null); }} 
                        color="primary" 
                        variant="contained"
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

                </Box>
            </Container>
        </div>
    );
};

export default FlownFlights;
