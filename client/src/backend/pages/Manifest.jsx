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
import RebookAvailabilityModal from '../components/BookingPage/RebookAvailabilityModal';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';


const Manifest = () => {
    // Hook'lar her zaman bir dizi döndürsün, yoksa boş dizi olsun
    const bookingHook = useBooking() || {};
    const pessangerHook = usePessanger() || {};
    const activityHook = useActivity();

    // HOOKLAR KOŞULSUZ OLARAK EN ÜSTE ALINDI
    const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
    // On mount, check for date param in URL and set selectedDate
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const dateParam = params.get('date');
        if (dateParam && dayjs(dateParam, 'YYYY-MM-DD', true).isValid()) {
            setSelectedDate(dateParam);
        }
    }, []);
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
    const [rebookModalOpen, setRebookModalOpen] = useState(false);
    const [rebookLoading, setRebookLoading] = useState(false);
    const [bookingHistory, setBookingHistory] = useState([]);

    // Add state for global menu anchor
    const [globalMenuAnchorEl, setGlobalMenuAnchorEl] = useState(null);
    // Add state for the current group (first) for which the menu is open
    const [globalMenuGroup, setGlobalMenuGroup] = useState(null);
    // Add state for the current group's flights
    const [globalMenuGroupFlights, setGlobalMenuGroupFlights] = useState([]);
    const handleGlobalMenuOpen = (event, group, groupFlights) => {
      setGlobalMenuAnchorEl(event.currentTarget);
      setGlobalMenuGroup(group);
      setGlobalMenuGroupFlights(groupFlights);
    };
    const handleGlobalMenuClose = () => {
      setGlobalMenuAnchorEl(null);
      setGlobalMenuGroup(null);
    };
    const handleGlobalMenuAction = async (action) => {
      if (action === 'cancelAllGuests') {
        if (!globalMenuGroup?.id) return;
        try {
          // Find all booking IDs in the group
          const groupBookingIds = globalMenuGroupFlights.map(f => f.id);
          // Cancel all bookings in parallel
          await Promise.all(groupBookingIds.map(id =>
            axios.patch('/api/updateBookingField', {
              booking_id: id,
              field: 'status',
              value: 'Cancelled'
            })
          ));
          // Remove all group bookings from UI
          setFlights(prev => prev.filter(f => !groupBookingIds.includes(f.id)));
        } catch (err) {
          alert('Failed to cancel all guests: ' + (err.message || 'Unknown error'));
        }
        handleGlobalMenuClose();
        return;
      }
      console.log('Action:', action);
      handleGlobalMenuClose();
    };

    const booking = useMemo(() => Array.isArray(bookingHook.booking) ? bookingHook.booking : [], [bookingHook.booking]);
    const bookingLoading = typeof bookingHook.loading === 'boolean' ? bookingHook.loading : true;
    const passenger = useMemo(() => Array.isArray(pessangerHook.passenger) ? pessangerHook.passenger : [], [pessangerHook.passenger]);
    const passengerLoading = typeof pessangerHook.loading === 'boolean' ? pessangerHook.loading : true;
    const activity = Array.isArray(activityHook && activityHook.activity) ? activityHook.activity : [];
    const activityLoading = activityHook && typeof activityHook.loading === 'boolean' ? activityHook.loading : true;

    // Helper: fetch capacity for a slot
    const [availabilities, setAvailabilities] = useState([]);
    useEffect(() => {
        // Fetch all availabilities for all activities on mount
        async function fetchAllAvailabilities() {
            if (!Array.isArray(activity)) return;
            let all = [];
            for (const act of activity) {
                try {
                    const res = await axios.get(`/api/activity/${act.id}/availabilities`);
                    if (res.data.success && Array.isArray(res.data.data)) {
                        all = all.concat(res.data.data.map(a => ({ ...a, activity_id: act.id, location: act.location, flight_type: act.flight_type })));
                    }
                } catch {}
            }
            setAvailabilities(all);
        }
        fetchAllAvailabilities();
    }, [activity]);

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
                    // Ayrıca booking history'yi çek
                    return axios.get(`/api/getBookingHistory?booking_id=${selectedBookingId}`);
                })
                .then(res => {
                    setBookingHistory(res.data.history || []);
                })
                .catch(err => {
                    setDetailError('Detaylar alınamadı');
                })
                .finally(() => setLoadingDetail(false));
        } else {
            setBookingDetail(null);
            setBookingHistory([]);
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

    const handleRebook = () => {
        setRebookModalOpen(true);
    };

    const handleRebookSlotSelect = async (date, time, activityId) => {
        if (!bookingDetail || !bookingDetail.booking) return;
        setRebookLoading(true);
        try {
            const payload = {
                activitySelect: bookingDetail.booking.flight_type,
                chooseLocation: bookingDetail.booking.location,
                chooseFlightType: { type: bookingDetail.booking.flight_type, passengerCount: bookingDetail.booking.pax },
                activity_id: activityId,
                passengerData: [
                    {
                        firstName: bookingDetail.booking.name?.split(' ')[0] || '',
                        lastName: bookingDetail.booking.name?.split(' ').slice(1).join(' ') || '',
                        weight: bookingDetail.passengers?.[0]?.weight || '',
                        email: bookingDetail.booking.email || '',
                        phone: bookingDetail.booking.phone || '',
                        ticketType: bookingDetail.booking.flight_type || '',
                        weatherRefund: bookingDetail.passengers?.[0]?.weather_refund || false
                    }
                ],
                selectedDate: dayjs(date).format('YYYY-MM-DD') + ' ' + time,
                totalPrice: bookingDetail.booking.paid || 0,
                additionalInfo: { notes: bookingDetail.booking.additional_notes || '' },
                voucher_code: bookingDetail.booking.voucher_code || null
            };
            await axios.post('/api/createBooking', payload);
            setRebookModalOpen(false);
            setDetailDialogOpen(false);
            // Tabloyu güncelle
            if (typeof bookingHook.refetch === 'function') {
                await bookingHook.refetch();
            }
        } catch (err) {
            alert('Rebooking failed!');
        } finally {
            setRebookLoading(false);
        }
    };

    // 1. Add state for editing booking notes
    const [editingNotes, setEditingNotes] = useState(false);
    const [notesValue, setNotesValue] = useState("");
    const [savingNotes, setSavingNotes] = useState(false);

    // 2. When opening the dialog, set notesValue to the current notes
    useEffect(() => {
        if (detailDialogOpen && bookingDetail?.booking) {
            setNotesValue(bookingDetail.booking.additional_notes || "");
            setEditingNotes(false);
        }
    }, [detailDialogOpen, bookingDetail]);

    // 3. Add save/cancel logic for notes
    const handleEditNotes = () => setEditingNotes(true);
    const handleCancelNotes = () => {
        setNotesValue(bookingDetail.booking.additional_notes || "");
        setEditingNotes(false);
    };
    const handleSaveNotes = async () => {
        if (!bookingDetail?.booking?.id) return;
        setSavingNotes(true);
        try {
            await axios.patch('/api/updateBookingField', {
                booking_id: bookingDetail.booking.id,
                field: 'additional_notes',
                value: notesValue
            });
            setBookingDetail(prev => ({
                ...prev,
                booking: {
                    ...prev.booking,
                    additional_notes: notesValue
                }
            }));
            setEditingNotes(false);
        } catch (err) {
            alert('Failed to update booking notes');
        } finally {
            setSavingNotes(false);
        }
    };

    // Add state and handlers for passenger edit at the top of the component
    const [editingPassenger, setEditingPassenger] = useState(false);
    const [editPassengerFirstName, setEditPassengerFirstName] = useState("");
    const [editPassengerLastName, setEditPassengerLastName] = useState("");
    const [editPassengerWeight, setEditPassengerWeight] = useState("");
    const [savingPassengerEdit, setSavingPassengerEdit] = useState(false);

    const handleEditPassengerClick = () => {
        if (!bookingDetail.passengers || bookingDetail.passengers.length === 0) return;
        setEditPassengerFirstName(bookingDetail.passengers[0].first_name || "");
        setEditPassengerLastName(bookingDetail.passengers[0].last_name || "");
        setEditPassengerWeight(bookingDetail.passengers[0].weight || "");
        setEditingPassenger(true);
    };
    const handleCancelPassengerEdit = () => {
        setEditingPassenger(false);
    };
    const handleSavePassengerEdit = async () => {
        if (!bookingDetail.passengers || bookingDetail.passengers.length === 0) return;
        const passengerId = bookingDetail.passengers[0].id;
        setSavingPassengerEdit(true);
        try {
            // Update first_name
            if (editPassengerFirstName !== bookingDetail.passengers[0].first_name) {
                await axios.patch('/api/updatePassengerField', {
                    passenger_id: passengerId,
                    field: 'first_name',
                    value: editPassengerFirstName
                });
            }
            // Update last_name
            if (editPassengerLastName !== bookingDetail.passengers[0].last_name) {
                await axios.patch('/api/updatePassengerField', {
                    passenger_id: passengerId,
                    field: 'last_name',
                    value: editPassengerLastName
                });
            }
            // Update weight
            if (editPassengerWeight !== bookingDetail.passengers[0].weight) {
                await axios.patch('/api/updatePassengerField', {
                    passenger_id: passengerId,
                    field: 'weight',
                    value: editPassengerWeight
                });
            }
            // Refresh booking detail
            await fetchBookingDetail(bookingDetail.booking.id);
            setEditingPassenger(false);
        } catch (err) {
            alert('Failed to update passenger details');
        } finally {
            setSavingPassengerEdit(false);
        }
    };

    // Add to component state:
    const [editPrefField, setEditPrefField] = useState(null);
    const [editPrefValue, setEditPrefValue] = useState("");
    const [savingPref, setSavingPref] = useState(false);
    // Add handlers:
    const handleEditPref = (field, value) => {
        setEditPrefField(field);
        setEditPrefValue(value || "");
    };
    const handleCancelPref = () => {
        setEditPrefField(null);
        setEditPrefValue("");
    };
    const handleSavePref = async (field) => {
        setSavingPref(true);
        try {
            await axios.patch('/api/updateBookingField', {
                booking_id: bookingDetail.booking.id,
                field,
                value: editPrefValue
            });
            setBookingDetail(prev => ({
                ...prev,
                booking: {
                    ...prev.booking,
                    [field]: editPrefValue
                }
            }));
            setEditPrefField(null);
            setEditPrefValue("");
        } catch (err) {
            alert('Failed to update.');
        } finally {
            setSavingPref(false);
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
                            <IconButton onClick={() => setSelectedDate(dayjs(selectedDate).subtract(1, 'day').format('YYYY-MM-DD'))}>
                                <ArrowBackIosNewIcon />
                            </IconButton>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    label="Select Date"
                                    value={dayjs(selectedDate)}
                                    onChange={date => setSelectedDate(date ? date.format('YYYY-MM-DD') : selectedDate)}
                                    format="DD.MM.YYYY"
                                    views={["year", "month", "day"]}
                                    slotProps={{ textField: { size: 'small', sx: { minWidth: 180, background: '#fff', borderRadius: 1 } } }}
                                    componentsProps={{
                                        // Hide default calendar arrows
                                        popper: { style: { zIndex: 1300 } },
                                    }}
                                />
                            </LocalizationProvider>
                            <IconButton onClick={() => setSelectedDate(dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DD'))}>
                                <ArrowForwardIosIcon />
                            </IconButton>
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
                            // Find matching availability for this group (activity_id, date, time)
                            let slotCapacity = null;
                            if (availabilities.length > 0) {
                                const dateStr = first.flight_date ? first.flight_date.substring(0,10) : null;
                                const timeStr = first.time_slot || (first.flight_date && first.flight_date.length >= 16 ? first.flight_date.substring(11,16) : null);
                                const found = availabilities.find(a => {
                                    // Compare by activity_id, date, and time
                                    const aDate = a.date && a.date.length >= 10 ? a.date.substring(0,10) : null;
                                    const aTime = a.time && a.time.length >= 5 ? a.time.substring(0,5) : null;
                                    return a.activity_id == first.activity_id && aDate === dateStr && aTime === timeStr;
                                });
                                if (found) slotCapacity = found.capacity;
                            }
                            const paxTotal = slotCapacity ? parseInt(slotCapacity) : groupFlights.reduce((sum, f) => sum + (parseInt(f.pax) || 0), 0);
                            const status = getFlightStatus(first);
                            const balloonResource = first.balloon_resources || 'N/A';
                            const timeSlot = first.time_slot || 'N/A';
                            return (
                                <Card key={groupKey} sx={{ marginBottom: 2 }}>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                            <Box display="flex" flexDirection="column" alignItems="flex-start">
                                                <Typography variant="h6">{activityName}</Typography>
                                                <Box display="flex" alignItems="center" gap={3} mt={1}>
                                                    <Typography>Pax Booked: {paxBooked} / {paxTotal}</Typography>
                                                    <Typography>Balloon Resource: {balloonResource}</Typography>
                                                    <Typography>Status: <span style={{ color: status === 'Closed' ? 'red' : 'green', fontWeight: 600 }}>{status}</span></Typography>
                                                    <Typography>Type: {first.flight_type}</Typography>
                                                </Box>
                                            </Box>
                                            <IconButton size="large" onClick={e => handleGlobalMenuOpen(e, first, groupFlights)}>
                                                <MoreVertIcon />
                                            </IconButton>
                                            <Menu
                                                anchorEl={globalMenuAnchorEl}
                                                open={Boolean(globalMenuAnchorEl)}
                                                onClose={handleGlobalMenuClose}
                                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                            >
                                                <MenuItem onClick={() => handleGlobalMenuAction('cancelAllGuests')}>Cancel All Guests</MenuItem>
                                                <MenuItem onClick={() => handleGlobalMenuAction('sendMessageAllGuests')}>Send Message to All Guests</MenuItem>
                                                <MenuItem onClick={() => handleGlobalMenuAction('changeTimeSlotStatus')}>Change Time Slot Status</MenuItem>
                                                <MenuItem onClick={() => handleGlobalMenuAction('bookCustomerOntoFlight')}>Book Customer onto Flight</MenuItem>
                                                <MenuItem onClick={() => handleGlobalMenuAction('changeAllPassengerStatuses')}>Change all passenger statuses</MenuItem>
                                            </Menu>
                                        </Box>
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
                                                                            value={['Scheduled','Checked In','Flown','No Show'].includes(flight.status) ? flight.status : 'Scheduled'}
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
                                                        </React.Fragment>
                                                    ))}
                                                    {/* Move the summary row here, inside TableBody */}
                                                    <TableRow>
                                                        <TableCell colSpan={10} style={{ textAlign: 'right', fontWeight: 600, background: '#f5f5f5' }}>
                                                            Total Price: £{groupFlights.reduce((sum, f) => sum + (parseFloat(f.paid) || 0), 0)} &nbsp;&nbsp;|
                                                            Total Weight: {groupFlights.reduce((sum, f) => sum + (f.passengers ? f.passengers.reduce((s, p) => s + (parseFloat(p.weight) || 0), 0) : 0), 0)} kg &nbsp;&nbsp;|
                                                            Total Pax: {groupFlights.reduce((sum, f) => sum + (f.passengers ? f.passengers.length : 0), 0)}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
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
                                    </Box>
                                    {/* Additional */}
                                    <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Additional</Typography>
                                        {editingNotes ? (
                                            <>
                                                <TextField
                                                    multiline
                                                    minRows={2}
                                                    maxRows={6}
                                                    fullWidth
                                                    value={notesValue}
                                                    onChange={e => setNotesValue(e.target.value)}
                                                    disabled={savingNotes}
                                                    sx={{ mb: 1 }}
                                                />
                                                <Button variant="contained" color="primary" onClick={handleSaveNotes} disabled={savingNotes || notesValue === (bookingDetail.booking.additional_notes || "")}>Save</Button>
                                                <Button variant="outlined" onClick={handleCancelNotes} sx={{ ml: 1 }} disabled={savingNotes}>Cancel</Button>
                                            </>
                                        ) : (
                                            <>
                                                <Typography><b>Booking Notes:</b> {bookingDetail.booking.additional_notes || '-'}</Typography>
                                                <Button variant="text" size="small" onClick={handleEditNotes} sx={{ mt: 1 }}>Edit</Button>
                                            </>
                                        )}
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
                                    {/* Preferences Section - always visible */}
                                    <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Preferences</Typography>
                                        {/* Preferred Day */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <Typography sx={{ fontWeight: 700, minWidth: 150 }}><b>Preferred Day:</b></Typography>
                                            {editPrefField === 'preferred_day' ? (
                                                <>
                                                    <TextField
                                                        size="small"
                                                        value={editPrefValue}
                                                        onChange={e => setEditPrefValue(e.target.value)}
                                                        sx={{ mr: 1, width: 220 }}
                                                        disabled={savingPref}
                                                    />
                                                    <Button size="small" variant="contained" onClick={() => handleSavePref('preferred_day')} disabled={savingPref}>Save</Button>
                                                    <Button size="small" onClick={handleCancelPref} sx={{ ml: 1 }} disabled={savingPref}>Cancel</Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Typography sx={{ mr: 1 }}>{bookingDetail.booking.preferred_day || '-'}</Typography>
                                                    <Button size="small" onClick={() => handleEditPref('preferred_day', bookingDetail.booking.preferred_day)}>Edit</Button>
                                                </>
                                            )}
                                        </Box>
                                        {/* Preferred Location */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <Typography sx={{ fontWeight: 700, minWidth: 150 }}><b>Preferred Location:</b></Typography>
                                            {editPrefField === 'preferred_location' ? (
                                                <>
                                                    <TextField
                                                        size="small"
                                                        value={editPrefValue}
                                                        onChange={e => setEditPrefValue(e.target.value)}
                                                        sx={{ mr: 1, width: 220 }}
                                                        disabled={savingPref}
                                                    />
                                                    <Button size="small" variant="contained" onClick={() => handleSavePref('preferred_location')} disabled={savingPref}>Save</Button>
                                                    <Button size="small" onClick={handleCancelPref} sx={{ ml: 1 }} disabled={savingPref}>Cancel</Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Typography sx={{ mr: 1 }}>{bookingDetail.booking.preferred_location || '-'}</Typography>
                                                    <Button size="small" onClick={() => handleEditPref('preferred_location', bookingDetail.booking.preferred_location)}>Edit</Button>
                                                </>
                                            )}
                                        </Box>
                                        {/* Preferred Time */}
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Typography sx={{ fontWeight: 700, minWidth: 150 }}><b>Preferred Time:</b></Typography>
                                            {editPrefField === 'preferred_time' ? (
                                                <>
                                                    <TextField
                                                        size="small"
                                                        value={editPrefValue}
                                                        onChange={e => setEditPrefValue(e.target.value)}
                                                        sx={{ mr: 1, width: 220 }}
                                                        disabled={savingPref}
                                                    />
                                                    <Button size="small" variant="contained" onClick={() => handleSavePref('preferred_time')} disabled={savingPref}>Save</Button>
                                                    <Button size="small" onClick={handleCancelPref} sx={{ ml: 1 }} disabled={savingPref}>Cancel</Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Typography sx={{ mr: 1 }}>{bookingDetail.booking.preferred_time || '-'}</Typography>
                                                    <Button size="small" onClick={() => handleEditPref('preferred_time', bookingDetail.booking.preferred_time)}>Edit</Button>
                                                </>
                                            )}
                                        </Box>
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
                                                <Button variant="contained" color="primary" sx={{ mb: 1, borderRadius: 2, fontWeight: 600, textTransform: 'none' }} onClick={handleRebook}>Rebook</Button>
                                                <Button variant="contained" color="primary" sx={{ mb: 1, borderRadius: 2, fontWeight: 600, textTransform: 'none' }} onClick={handleAddGuestClick}>Add Guest</Button>
                                                <Button variant="contained" color="info" sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', background: '#6c757d' }} onClick={handleCancelFlight}>Cancel Flight</Button>
                                            </Box>
                                        </Box>
                                        <Divider sx={{ my: 2 }} />
                                        {/* Passenger Details */}
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Passenger Details</Typography>
                                            {bookingDetail.passengers && bookingDetail.passengers.length > 0 ? (
                                                <Box>
                                                    {/* Passenger 1 Editable */}
                                                    <Typography>
                                                        Passenger 1: {editingPassenger ? (
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
                                                                <Button size="small" onClick={handleSavePassengerEdit} disabled={savingPassengerEdit}>Save</Button>
                                                                <Button size="small" onClick={handleCancelPassengerEdit} disabled={savingPassengerEdit}>Cancel</Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                {bookingDetail.passengers[0].first_name || '-'} {bookingDetail.passengers[0].last_name || '-'}{bookingDetail.passengers[0].weight ? ` (${bookingDetail.passengers[0].weight}kg)` : ''}
                                                                <IconButton size="small" onClick={handleEditPassengerClick}><EditIcon fontSize="small" /></IconButton>
                                                            </>
                                                        )}
                                                    </Typography>
                                                    {/* Diğer yolcular sadece okunur */}
                                                    {bookingDetail.passengers.slice(1).map((p, i) => (
                                                        <Typography key={i+1}>Passenger {i + 2}: {p.first_name || '-'} {p.last_name || '-'}{p.weight ? ` (${p.weight}kg)` : ''}</Typography>
                                                    ))}
                                                </Box>
                                            ) : null}
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
                                        <Divider sx={{ my: 2 }} />
                                        {/* HISTORY SECTION - visually separated */}
                                        <Box sx={{ background: '#e0e0e0', borderRadius: 2, p: 2, mt: 2, mb: 2 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>History</Typography>
                                            <Table>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>Booking Date</TableCell>
                                                        <TableCell>Activity Type</TableCell>
                                                        <TableCell>Location</TableCell>
                                                        <TableCell>Status</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    <TableRow>
                                                        <TableCell>{bookingDetail.booking.created_at ? dayjs(bookingDetail.booking.created_at).format('DD/MM/YYYY HH:mm') : '-'}</TableCell>
                                                        <TableCell>{bookingDetail.booking.flight_type || '-'}</TableCell>
                                                        <TableCell>{bookingDetail.booking.location || '-'}</TableCell>
                                                        <TableCell>Scheduled</TableCell>
                                                    </TableRow>
                                                    {bookingHistory.map((h, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell>{h.changed_at ? dayjs(h.changed_at).format('DD/MM/YYYY HH:mm') : '-'}</TableCell>
                                                            <TableCell>{bookingDetail.booking.flight_type || '-'}</TableCell>
                                                            <TableCell>{bookingDetail.booking.location || '-'}</TableCell>
                                                            <TableCell>{h.status}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
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
            <RebookAvailabilityModal
                open={rebookModalOpen}
                onClose={() => setRebookModalOpen(false)}
                location={bookingDetail?.booking?.location}
                onSlotSelect={handleRebookSlotSelect}
            />
        </div>
    );
};

export default Manifest;
