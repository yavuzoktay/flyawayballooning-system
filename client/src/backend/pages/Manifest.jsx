import React, { useState, useEffect, useMemo } from "react";
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    TextField,
    IconButton,
    Divider,
    Menu,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Container,
    Select,
    Button,
} from "@mui/material";
import { MoreVert as MoreVertIcon, Edit as EditIcon } from "@mui/icons-material";
import useBooking from "../api/useBooking";
import usePessanger from "../api/usePessanger";
import useActivity from "../api/useActivity";
import axios from "axios";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import dayjs from 'dayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';


const Manifest = () => {
    // Hook'lar her zaman bir dizi döndürsün, yoksa boş dizi olsun
    const bookingHook = useBooking() || {};
    const pessangerHook = usePessanger() || {};
    const activityHook = useActivity();

    // HOOKLAR KOŞULSUZ OLARAK EN ÜSTE ALINDI
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [flights, setFlights] = useState([]);
    const [menuAnchorEl, setMenuAnchorEl] = useState(null);
    const [selectedFlightId, setSelectedFlightId] = useState(null);
    const [error, setError] = useState(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState(null);
    const [bookingDetail, setBookingDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [detailError, setDetailError] = useState(null);
    const [addGuestDialogOpen, setAddGuestDialogOpen] = useState(false);
    const [guestCount, setGuestCount] = useState(0);
    const [guestType, setGuestType] = useState('Shared Flight');
    const [guestForms, setGuestForms] = useState([]);
    const [editField, setEditField] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [addingNote, setAddingNote] = useState(false);

    const booking = useMemo(() => Array.isArray(bookingHook.booking) ? bookingHook.booking : [], [bookingHook.booking]);
    const bookingLoading = typeof bookingHook.loading === 'boolean' ? bookingHook.loading : true;
    const passenger = useMemo(() => Array.isArray(pessangerHook.passenger) ? pessangerHook.passenger : [], [pessangerHook.passenger]);
    const passengerLoading = typeof pessangerHook.loading === 'boolean' ? pessangerHook.loading : true;
    const activity = Array.isArray(activityHook && activityHook.activity) ? activityHook.activity : [];
    const activityLoading = activityHook && typeof activityHook.loading === 'boolean' ? activityHook.loading : true;

    // Hatalı veri durumunu kontrol et
    useEffect(() => {
        if (!Array.isArray(booking) || !Array.isArray(passenger)) {
            setError("Data could not be retrieved. Please try again later.");
        }
    }, [booking, passenger]);

    useEffect(() => {
        if (!bookingLoading && !passengerLoading) {
            const combinedFlights = booking.map((b) => ({
                ...b,
                passengers: passenger.filter((p) => p.booking_id === b.id),
                totalWeight: passenger
                    .filter((p) => p.booking_id === b.id)
                    .reduce((sum, p) => sum + parseFloat(p.weight || 0), 0),
            }));
            setFlights(combinedFlights);
        }
    }, [booking, passenger, bookingLoading, passengerLoading]);

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    const handleMenuOpen = (event, flightId) => {
        setMenuAnchorEl(event.currentTarget);
        setSelectedFlightId(flightId);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
        setSelectedFlightId(null);
    };

    const cancelFlight = (flightId) => {
        setFlights((prevFlights) => prevFlights.filter((flight) => flight.id !== flightId));
        handleMenuClose();
    };

    const sendMessageToPassengers = (flightId) => {
        alert(`Message sent to passengers of Flight ID: ${flightId}`);
        handleMenuClose();
    };

    const getFlightStatus = (flight) => {
        if (flight.manual_status_override !== null && flight.manual_status_override !== undefined) {
            return flight.manual_status_override ? "Open" : "Closed";
        }
        const currentDate = new Date(selectedDate);
        const flightDate = new Date(flight.flight_date);
        const maxCapacity = activity.find((a) => a.activity_sku === flight.activity_id)?.seats || 0;
        if (flightDate < currentDate) {
            return "Closed";
        }
        return flight.passengers.length < maxCapacity ? "Open" : "Closed";
    };

    const toggleFlightStatus = async (flightId) => {
        const flight = flights.find(f => f.id === flightId);
        if (!flight) return;
        let newStatus;
        if (flight.manual_status_override === 1 || (flight.manual_status_override === null && getFlightStatus(flight) === "Open")) {
            newStatus = 0; // Close slot
        } else {
            newStatus = 1; // Open slot
        }
        try {
            await axios.post("/api/updateBookingStatus", {
                booking_id: flightId,
                manual_status_override: newStatus
            });
            // Update local state for instant UI feedback
            setFlights(prevFlights => prevFlights.map(f =>
                f.id === flightId ? { ...f, manual_status_override: newStatus } : f
            ));
            // Optionally, also refetch from backend for consistency
            if (typeof bookingHook.refetch === 'function') {
                await bookingHook.refetch();
            }
        } catch (err) {
            alert("Status update failed");
        }
        handleMenuClose();
    };

    const filteredFlights = flights.filter(flight => 
        flight.flight_date && flight.flight_date.substring(0, 10) === selectedDate && flight.status !== 'Cancelled'
    );

    // flights'i location ve flight_date bazında grupla
    const groupBy = (arr, keyFn) => arr.reduce((acc, item) => {
        const key = keyFn(item);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    const groupedFlights = groupBy(filteredFlights, f => `${f.location}||${f.flight_date.substring(0,10)}`);

    const handleNameClick = (bookingId) => {
        setSelectedBookingId(bookingId);
        setDetailDialogOpen(true);
    };

    useEffect(() => {
        if (detailDialogOpen && selectedBookingId) {
            setLoadingDetail(true);
            setDetailError(null);
            axios.get(`/api/getBookingDetail?booking_id=${selectedBookingId}`)
                .then(res => {
                    setBookingDetail(res.data);
                })
                .catch(err => {
                    setDetailError('Detaylar alınamadı');
                })
                .finally(() => setLoadingDetail(false));
        } else {
            setBookingDetail(null);
        }
    }, [detailDialogOpen, selectedBookingId]);

    const handleAddGuestClick = () => {
        setGuestType(bookingDetail?.booking?.flight_type || 'Shared Flight');
        setGuestCount(0);
        setGuestForms([]);
        setAddGuestDialogOpen(true);
    };

    useEffect(() => {
        if (guestCount > 0) {
            setGuestForms(Array.from({ length: guestCount }, (_, i) => ({ firstName: '', lastName: '', email: '', phone: '', ticketType: guestType, weight: '' })));
        } else {
            setGuestForms([]);
        }
    }, [guestCount, guestType]);

    const handleGuestFormChange = (idx, field, value) => {
        setGuestForms(prev => prev.map((g, i) => i === idx ? { ...g, [field]: value } : g));
    };

    const handleSaveGuests = async () => {
        if (!bookingDetail?.booking?.id) return;
        for (const g of guestForms) {
            await axios.post('/api/addPassenger', {
                booking_id: bookingDetail.booking.id,
                first_name: g.firstName,
                last_name: g.lastName,
                email: g.email,
                phone: g.phone,
                ticket_type: g.ticketType,
                weight: g.weight
            });
        }
        setAddGuestDialogOpen(false);
        fetchBookingDetail(bookingDetail.booking.id);
    };

    const fetchBookingDetail = async (bookingId) => {
        setLoadingDetail(true);
        setDetailError(null);
        try {
            const res = await axios.get(`/api/getBookingDetail?booking_id=${bookingId}`);
            setBookingDetail(res.data);
        } catch (err) {
            setDetailError('Detaylar alınamadı');
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleEditClick = (field, currentValue) => {
        setEditField(field);
        setEditValue(currentValue || '');
    };

    const handleEditCancel = () => {
        setEditField(null);
        setEditValue('');
    };

    const handleEditSave = async () => {
        if (!bookingDetail?.booking?.id || !editField) return;
        setSavingEdit(true);
        try {
            await axios.patch('/api/updateBookingField', {
                booking_id: bookingDetail.booking.id,
                field: editField,
                value: editValue
            });
            if (editField === 'weight' && bookingDetail.passengers && bookingDetail.passengers.length > 0) {
                // Local state güncelle
                setBookingDetail(prev => ({
                    ...prev,
                    passengers: prev.passengers.map((p, i) => i === 0 ? { ...p, weight: editValue } : p)
                }));
                // flights state'ini de güncelle
                setFlights(prevFlights => prevFlights.map(f => {
                    if (f.id === bookingDetail.booking.id && Array.isArray(f.passengers) && f.passengers.length > 0) {
                        return {
                            ...f,
                            passengers: f.passengers.map((p, i) => i === 0 ? { ...p, weight: editValue } : p)
                        };
                    }
                    return f;
                }));
            } else {
                await fetchBookingDetail(bookingDetail.booking.id);
            }
            if (typeof bookingHook.refetch === 'function') {
                await bookingHook.refetch();
            }
            setEditField(null);
            setEditValue('');
        } catch (err) {
            alert('Update failed');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim() || !bookingDetail?.booking?.id) return;
        setAddingNote(true);
        try {
            await axios.post('/api/addAdminNotes', {
                date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                note: newNote,
                booking_id: bookingDetail.booking.id
            });
            setNewNote('');
            await fetchBookingDetail(bookingDetail.booking.id);
        } catch (err) {
            alert('Note eklenemedi');
        } finally {
            setAddingNote(false);
        }
    };

    const handleCancelFlight = async () => {
        if (!bookingDetail?.booking?.id) return;
        try {
            // flight_attempts +1
            const newAttempts = (parseInt(bookingDetail.booking.flight_attempts || 0, 10) + 1).toString();
            // Status'u Cancelled yap
            await axios.patch('/api/updateBookingField', {
                booking_id: bookingDetail.booking.id,
                field: 'status',
                value: 'Cancelled'
            });
            // flight_attempts güncelle
            await axios.patch('/api/updateBookingField', {
                booking_id: bookingDetail.booking.id,
                field: 'flight_attempts',
                value: newAttempts
            });
            // Local state güncelle
            setBookingDetail(prev => ({
                ...prev,
                booking: {
                    ...prev.booking,
                    status: 'Cancelled',
                    flight_attempts: newAttempts
                }
            }));
            // flights state'ini güncelle
            setFlights(prev => prev.map(f => f.id === bookingDetail.booking.id ? { ...f, status: 'Cancelled', flight_attempts: newAttempts } : f));
        } catch (err) {
            alert('Cancel işlemi başarısız!');
        }
    };

    return (
        <div className="final-menifest-wrap">
            <Container maxWidth="xl">
                <div className="heading-wrap">
                    <h2>MANIFEST PAGE</h2>
                    <hr />
                </div>
                <Box sx={{ padding: 2 }}>
                    {/* Header Section */}
                    <Box sx={{ marginBottom: 3 }}>
                        <Box display="flex" alignItems="center" gap={2}>
                            <TextField
                                type="date"
                                value={selectedDate}
                                onChange={handleDateChange}
                                label="Select Date"
                                InputLabelProps={{ shrink: true }}
                            />
                        </Box>
                    </Box>

                    {bookingLoading || passengerLoading || activityLoading ? (
                        <Typography>Yükleniyor...</Typography>
                    ) : error ? (
                        <Typography color="error">{error}</Typography>
                    ) : filteredFlights.length > 0 ? (
                        Object.entries(groupedFlights).map(([groupKey, groupFlights]) => {
                            // Ortak başlık bilgileri
                            const first = groupFlights[0];
                            const activityName = first.location + ' - ' + first.flight_type;
                            const paxBooked = groupFlights.reduce((sum, f) => sum + (f.passengers?.length || 0), 0);
                            const paxTotal = groupFlights.reduce((sum, f) => sum + (parseInt(f.pax) || 0), 0);
                            const status = getFlightStatus(first);
                            const balloonResource = first.balloon_resources || 'N/A';
                            const timeSlot = first.time_slot || 'N/A';
                            return (
                                <Card key={groupKey} sx={{ marginBottom: 2 }}>
                                    <CardContent>
                                        <Grid container spacing={2} alignItems="center">
                                            <Grid item xs={12} md={3}>
                                                <Typography variant="h6">{activityName}</Typography>
                                            </Grid>
                                            <Grid item xs={12} md={3}>
                                                <Typography>Pax Booked: {paxBooked} / {paxTotal}</Typography>
                                                <Typography>Balloon Resource: {balloonResource}</Typography>
                                            </Grid>
                                            <Grid item xs={12} md={3}>
                                                <Typography>
                                                    Status: <span style={{color: status === 'Open' ? 'green' : 'red', fontWeight: 'bold'}}>{status}</span>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ ml: 2 }}
                                                        onClick={async () => {
                                                            // Yeni status'ü belirle
                                                            const newStatus = status === 'Open' ? 0 : 1; // 1: Open, 0: Closed
                                                            // Tüm booking'ler için güncelle
                                                            await Promise.all(groupFlights.map(async (flight) => {
                                                                await axios.post('/api/updateBookingStatus', {
                                                                    booking_id: flight.id,
                                                                    manual_status_override: newStatus
                                                                });
                                                            }));
                                                            // Local state'i güncelle
                                                            setFlights(prev => prev.map(f =>
                                                                groupFlights.some(gf => gf.id === f.id)
                                                                    ? { ...f, manual_status_override: newStatus }
                                                                    : f
                                                            ));
                                                        }}
                                                    >
                                                        {status === 'Open' ? 'Close Slot' : 'Open Slot'}
                                                    </Button>
                                                </Typography>
                                                <Typography>Type: {first.flight_type}</Typography>
                                            </Grid>
                                        </Grid>
                                        <Divider sx={{ marginY: 2 }} />
                                        <TableContainer component={Paper} sx={{ marginTop: 2 }}>
                                            <Table>
                                                <TableHead sx={{ marginTop: 2, background: "#d3d3d3", color: "#000" }}>
                                                    <TableRow>
                                                        <TableCell>Booking ID</TableCell>
                                                        <TableCell>Name</TableCell>
                                                        <TableCell>Weight</TableCell>
                                                        <TableCell>Mobile</TableCell>
                                                        <TableCell>Email</TableCell>
                                                        <TableCell>Flight Time</TableCell>
                                                        <TableCell>WX Ins</TableCell>
                                                        <TableCell>Add On's</TableCell>
                                                        <TableCell>Notes</TableCell>
                                                        <TableCell>Status</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {groupFlights.map((flight, idx) => (
                                                        <React.Fragment key={flight.id}>
                                                            {flight.passengers.map((passenger, index) => (
                                                                <TableRow key={index}>
                                                                    <TableCell>
                                                                        <span style={{ color: '#3274b4', cursor: 'pointer', textDecoration: 'underline' }}
                                                                            onClick={() => handleNameClick(passenger.booking_id)}>
                                                                            {passenger.booking_id || ''}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <span style={{ color: '#3274b4', cursor: 'pointer', textDecoration: 'underline' }}
                                                                            onClick={() => handleNameClick(passenger.booking_id)}>
                                                                            {flight.name || ''}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell>{passenger.weight || ''}</TableCell>
                                                                    <TableCell>{flight.phone || ''}</TableCell>
                                                                    <TableCell>{flight.email || ''}</TableCell>
                                                                    <TableCell>{(() => {
                                                                        if (flight.time_slot) return flight.time_slot;
                                                                        if (flight.flight_date && flight.flight_date.length >= 16) {
                                                                            return flight.flight_date.substring(11, 16);
                                                                        }
                                                                        return '';
                                                                    })()}</TableCell>
                                                                    <TableCell>{passenger.weatherRefund || passenger.weather_refund ? 'Yes' : 'No'}</TableCell>
                                                                    <TableCell>{(() => {
                                                                        if (Array.isArray(flight.choose_add_on)) {
                                                                            return flight.choose_add_on.join(', ');
                                                                        }
                                                                        if (typeof flight.choose_add_on === 'string') {
                                                                            try {
                                                                                const parsed = JSON.parse(flight.choose_add_on);
                                                                                if (Array.isArray(parsed)) {
                                                                                    return parsed.join(', ');
                                                                                }
                                                                                return flight.choose_add_on;
                                                                            } catch {
                                                                                return flight.choose_add_on;
                                                                            }
                                                                        }
                                                                        return '';
                                                                    })()}</TableCell>
                                                                    <TableCell>{flight.additional_notes || ''}</TableCell>
                                                                    <TableCell>
                                                                        <Select
                                                                            value={flight.status || 'Scheduled'}
                                                                            onChange={async (e) => {
                                                                                const newStatus = e.target.value;
                                                                                await axios.patch('/api/updateBookingField', {
                                                                                    booking_id: flight.id,
                                                                                    field: 'status',
                                                                                    value: newStatus
                                                                                });
                                                                                setFlights(prev => prev.map(f => f.id === flight.id ? { ...f, status: newStatus } : f));
                                                                            }}
                                                                            size="small"
                                                                            variant="standard"
                                                                            sx={{ minWidth: 120 }}
                                                                        >
                                                                            <MenuItem value="Scheduled">Scheduled</MenuItem>
                                                                            <MenuItem value="Checked In">Checked In</MenuItem>
                                                                            <MenuItem value="Flown">Flown</MenuItem>
                                                                            <MenuItem value="No Show">No Show</MenuItem>
                                                                        </Select>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                            {/* Toplam ağırlık satırı */}
                                                            <TableRow>
                                                                <TableCell colSpan={10} style={{ textAlign: 'right', fontWeight: 600, background: '#f5f5f5' }}>
                                                                    Total Weight: {flight.passengers.reduce((sum, p) => sum + (parseFloat(p.weight) || 0), 0)} kg
                                                                </TableCell>
                                                            </TableRow>
                                                        </React.Fragment>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                        <Divider sx={{ marginY: 2 }} />
                                        <Box display="flex" justifyContent="flex-end">
                                            <Typography variant="h6">{groupFlights.reduce((sum, f) => sum + (parseFloat(f.paid) || 0), 0)}</Typography>
                                        </Box>
                                    </CardContent>
                                </Card>
                            );
                        })
                    ) : (
                        <Typography>No flights scheduled for the selected date.</Typography>
                    )}
                </Box>
            </Container>
            <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle style={{ background: '#2d4263', color: '#fff', fontWeight: 700, fontSize: 22 }}>Booking Details</DialogTitle>
                <DialogContent style={{ background: '#f7f7f7', minHeight: 500 }}>
                    {loadingDetail ? (
                        <Typography>Loading...</Typography>
                    ) : detailError ? (
                        <Typography color="error">{detailError}</Typography>
                    ) : bookingDetail && bookingDetail.success ? (
                        <Box>
                            <Grid container spacing={2}>
                                {/* Personal Details */}
                                <Grid item xs={12} md={4}>
                                    <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Personal Details</Typography>
                                        <Typography><b>Booking Name:</b> {editField === 'name' ? (
                                            <>
                                                <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{marginRight: 8}} />
                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                            </>
                                        ) : (
                                            <>
                                                {bookingDetail.booking.name || '-'}
                                                <IconButton size="small" onClick={() => handleEditClick('name', bookingDetail.booking.name)}><EditIcon fontSize="small" /></IconButton>
                                            </>
                                        )}</Typography>
                                        <Typography><b>Booking Created:</b> {bookingDetail.booking.created_at ? dayjs(bookingDetail.booking.created_at).format('DD/MM/YYYY') : '-'}</Typography>
                                        <Typography><b>Phone:</b> {editField === 'phone' ? (
                                            <>
                                                <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{marginRight: 8}} />
                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                            </>
                                        ) : (
                                            <>
                                                {bookingDetail.booking.phone || '-'}
                                                <IconButton size="small" onClick={() => handleEditClick('phone', bookingDetail.booking.phone)}><EditIcon fontSize="small" /></IconButton>
                                            </>
                                        )}</Typography>
                                        <Typography><b>Email:</b> {editField === 'email' ? (
                                            <>
                                                <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{marginRight: 8}} />
                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                            </>
                                        ) : (
                                            <>
                                                {bookingDetail.booking.email || '-'}
                                                <IconButton size="small" onClick={() => handleEditClick('email', bookingDetail.booking.email)}><EditIcon fontSize="small" /></IconButton>
                                            </>
                                        )}</Typography>
                                        <Typography><b>Flight Attempts:</b> -</Typography>
                                        <Typography><b>Expires:</b> {editField === 'expires' ? (
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
) : (
  <>
    {bookingDetail.booking.expires ? dayjs(bookingDetail.booking.expires).format('DD/MM/YYYY') : '-'}
    <IconButton size="small" onClick={() => handleEditClick('expires', bookingDetail.booking.expires)}><EditIcon fontSize="small" /></IconButton>
  </>
)}</Typography>
                                        <Typography><b>Paid:</b> £{bookingDetail.booking.paid}</Typography>
                                        <Typography><b>Weight:</b> {editField === 'weight' ? (
  <>
    <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{marginRight: 8}} />
    <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
    <Button size="small" onClick={handleEditCancel}>Cancel</Button>
  </>
) : (
  <>
    {bookingDetail.passengers && bookingDetail.passengers[0]?.weight ? bookingDetail.passengers[0].weight + 'kg' : '-'}
    <IconButton size="small" onClick={() => handleEditClick('weight', bookingDetail.passengers && bookingDetail.passengers[0]?.weight)}><EditIcon fontSize="small" /></IconButton>
  </>
)}</Typography>
                                    </Box>
                                    {/* Additional */}
                                    <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Additional</Typography>
                                        <Typography><b>Booking Notes:</b> {bookingDetail.booking.additional_notes ? bookingDetail.booking.additional_notes : ''}</Typography>
                                    </Box>
                                    {/* Add On */}
                                    <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Add On's</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Typography><b>Fab Cap:</b> {bookingDetail.booking.choose_add_on && bookingDetail.booking.choose_add_on.includes('Fab Cap') ? 'Yes' : 'No'}</Typography>
                                            <Button variant="outlined" size="small" onClick={async () => {
                                                let newAddOn = bookingDetail.booking.choose_add_on || [];
                                                if (typeof newAddOn === 'string') {
                                                    try { newAddOn = JSON.parse(newAddOn); } catch { newAddOn = []; }
                                                }
                                                if (!Array.isArray(newAddOn)) newAddOn = [];
                                                if (!newAddOn.includes('Fab Cap')) newAddOn.push('Fab Cap');
                                                await axios.patch('/api/updateBookingField', {
                                                    booking_id: bookingDetail.booking.id,
                                                    field: 'choose_add_on',
                                                    value: JSON.stringify(newAddOn)
                                                });
                                                setBookingDetail(prev => ({
                                                    ...prev,
                                                    booking: {
                                                        ...prev.booking,
                                                        choose_add_on: newAddOn
                                                    }
                                                }));
                                                setFlights(prev => prev.map(f => f.id === bookingDetail.booking.id ? { ...f, choose_add_on: newAddOn } : f));
                                            }}>FAB Add On</Button>
                                        </Box>
                                        <Typography><b>WX Refundable:</b> {bookingDetail.passengers && bookingDetail.passengers.some(p => p.weather_refund === 1) ? 'Yes' : 'No'}</Typography>
                                        <Typography><b>Marketing:</b> {bookingDetail.booking.hear_about_us || 'N/A'}</Typography>
                                        <Typography><b>Reason for Ballooning:</b> {bookingDetail.booking.ballooning_reason || 'N/A'}</Typography>
                                    </Box>
                                </Grid>
                                {/* Main Details */}
                                <Grid item xs={12} md={8}>
                                    <Box sx={{ background: '#fff', borderRadius: 2, p: 2, boxShadow: 1 }}>
                                        {/* Current Booking */}
                                        <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                            <Box>
                                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Current Booking</Typography>
                                                <Typography><b>Activity:</b> {bookingDetail.booking.flight_type} - {bookingDetail.booking.location}</Typography>
                                                <Typography><b>Booked For:</b> {bookingDetail.booking.flight_date ? dayjs(bookingDetail.booking.flight_date).format('DD/MM/YYYY HH:mm') : '-'}</Typography>
                                                <Typography>
                                                    <b>Redeemed Voucher:</b> {bookingDetail.booking.voucher_code ? <span style={{ color: 'green', fontWeight: 600 }}>Yes</span> : <span style={{ color: 'red', fontWeight: 600 }}>No</span>} <span style={{ fontWeight: 500 }}>{bookingDetail.booking.voucher_code || ''}</span>
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 140 }}>
                                                <Button variant="contained" color="primary" sx={{ mb: 1, borderRadius: 2, fontWeight: 600, textTransform: 'none' }}>Rebook</Button>
                                                <Button variant="contained" color="primary" sx={{ mb: 1, borderRadius: 2, fontWeight: 600, textTransform: 'none' }} onClick={handleAddGuestClick}>Add Guest</Button>
                                                <Button variant="contained" color="info" sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', background: '#6c757d' }} onClick={handleCancelFlight}>Cancel Flight</Button>
                                            </Box>
                                        </Box>
                                        <Divider sx={{ my: 2 }} />
                                        {/* Passenger Details */}
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Passenger Details</Typography>
                                            {bookingDetail.passengers && bookingDetail.passengers.length > 0 ? bookingDetail.passengers.map((p, i) => (
                                                <Typography key={i}>Passenger {i + 1}: {p.first_name || '-'} {p.last_name || '-'}{p.weight ? ` (${p.weight}kg)` : ''}</Typography>
                                            )) : null}
                                        </Box>
                                        <Divider sx={{ my: 2 }} />
                                        {/* Notes */}
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Notes</Typography>
                                            <Box sx={{ mb: 2, background: '#f7f7f7', p: 2, borderRadius: 2 }}>
                                                <TextField
                                                    multiline
                                                    minRows={2}
                                                    maxRows={6}
                                                    fullWidth
                                                    placeholder="Type your message here..."
                                                    value={newNote}
                                                    onChange={e => setNewNote(e.target.value)}
                                                    disabled={addingNote}
                                                />
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    sx={{ mt: 1 }}
                                                    onClick={handleAddNote}
                                                    disabled={addingNote || !newNote.trim()}
                                                >
                                                    {addingNote ? 'Adding...' : 'Add Note'}
                                                </Button>
                                            </Box>
                                            {bookingDetail.notes && bookingDetail.notes.length > 0 ? bookingDetail.notes.map((n, i) => (
                                                <Box key={i} sx={{ mb: 1, p: 1, background: '#fff', borderRadius: 1, boxShadow: 0 }}>
                                                    <Typography variant="body2" sx={{ color: '#888', fontSize: 12 }}>{n.date ? dayjs(n.date).format('DD/MM/YYYY HH:mm') : ''}</Typography>
                                                    <Typography>{n.notes}</Typography>
                                                </Box>
                                            )) : <Typography>No notes</Typography>}
                                        </Box>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>
                    ) : null}
                </DialogContent>
                <DialogActions sx={{ background: '#f7f7f7' }}>
                    <Button onClick={() => setDetailDialogOpen(false)} color="primary" variant="contained">Close</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={addGuestDialogOpen} onClose={() => setAddGuestDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Guest</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>Flight Type: <b>{guestType}</b></Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Typography>How many guests to add?</Typography>
                        <Button variant="outlined" onClick={() => setGuestCount(Math.max(guestCount - 1, 0))}>-</Button>
                        <Typography>{guestCount}</Typography>
                        <Button variant="outlined" onClick={() => setGuestCount(guestCount + 1)}>+</Button>
                    </Box>
                    {guestForms.map((g, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 2 }}>
                            <Typography sx={{ fontWeight: 600, mb: 1 }}>Guest {idx + 1}</Typography>
                            <TextField label="First Name" value={g.firstName} onChange={e => handleGuestFormChange(idx, 'firstName', e.target.value)} fullWidth margin="dense" />
                            <TextField label="Last Name" value={g.lastName} onChange={e => handleGuestFormChange(idx, 'lastName', e.target.value)} fullWidth margin="dense" />
                            <TextField label="Email" value={g.email} onChange={e => handleGuestFormChange(idx, 'email', e.target.value)} fullWidth margin="dense" />
                            <TextField label="Phone" value={g.phone} onChange={e => handleGuestFormChange(idx, 'phone', e.target.value)} fullWidth margin="dense" />
                            <TextField label="Weight (kg)" value={g.weight} onChange={e => handleGuestFormChange(idx, 'weight', e.target.value)} fullWidth margin="dense" />
                            <TextField label="Ticket Type" value={g.ticketType} select fullWidth margin="dense" onChange={e => handleGuestFormChange(idx, 'ticketType', e.target.value)}>
                                <MenuItem value="Shared Flight">Shared Flight</MenuItem>
                                <MenuItem value="Private Flight">Private Flight</MenuItem>
                            </TextField>
                        </Box>
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddGuestDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveGuests} variant="contained" color="primary">Save</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default Manifest;
