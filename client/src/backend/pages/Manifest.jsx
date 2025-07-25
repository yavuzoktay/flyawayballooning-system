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
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import RebookAvailabilityModal from '../components/BookingPage/RebookAvailabilityModal';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

dayjs.extend(utc);
dayjs.extend(timezone);

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
        
        const oldStatus = flight.manual_status_override === 1 || (flight.manual_status_override === null && getFlightStatus(flight) === "Open") ? "Open" : "Closed";
        const newStatus = oldStatus === "Open" ? "Closed" : "Open";
        
        try {
            // Call new endpoint that updates both booking status and availability
            await axios.patch("/api/updateManifestStatus", {
                booking_id: flightId,
                old_status: oldStatus,
                new_status: newStatus,
                flight_date: flight.flight_date,
                location: flight.location
            });
            
            // Update local state for instant UI feedback
            setFlights(prevFlights => prevFlights.map(f =>
                f.id === flightId ? { 
                    ...f, 
                    manual_status_override: newStatus === "Closed" ? 0 : 1 
                } : f
            ));
            
            // Optionally, also refetch from backend for consistency
            if (typeof bookingHook.refetch === 'function') {
                await bookingHook.refetch();
            }
        } catch (err) {
            console.error("Status update failed:", err);
            alert("Status update failed: " + (err.response?.data?.message || err.message));
        }
        handleMenuClose();
    };

    const filteredFlights = flights.filter(flight => 
        flight.flight_date && flight.flight_date.substring(0, 10) === selectedDate && flight.status !== 'Cancelled'
    );

    // flights'i location, flight_type ve flight time bazında grupla
    const groupBy = (arr, keyFn) => arr.reduce((acc, item) => {
        const key = keyFn(item);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    const groupedFlights = groupBy(filteredFlights, f => `${f.location}||${f.flight_type}||${f.time_slot || (f.flight_date && f.flight_date.length >= 16 ? f.flight_date.substring(11,16) : '')}`);

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
        // Add each guest
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
        // Fetch updated passengers
        const res = await axios.get(`/api/getBookingDetail?booking_id=${bookingDetail.booking.id}`);
        const updatedPassengers = res.data.passengers;
        // Recalculate prices
        const paid = parseFloat(res.data.booking.paid) || 0;
        const n = updatedPassengers.length;
        const perPassenger = n > 0 ? parseFloat((paid / n).toFixed(2)) : 0;
        // Update all passenger prices in backend
        await Promise.all(updatedPassengers.map((p) =>
            axios.patch('/api/updatePassengerField', {
                passenger_id: p.id,
                field: 'price',
                value: perPassenger
            })
        ));
        // Refetch passengers to update UI
        await fetchBookingDetail(bookingDetail.booking.id);
        setAddGuestDialogOpen(false);
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
            if (editField === 'paid') {
                await axios.patch('/api/updateBookingField', {
                    booking_id: bookingDetail.booking.id,
                    field: 'paid',
                    value: editValue
                });
                setBookingDetail(prev => ({
                    ...prev,
                    booking: {
                        ...prev.booking,
                        paid: editValue
                    }
                }));
                setFlights(prev => prev.map(f => f.id === bookingDetail.booking.id ? { ...f, paid: editValue } : f));
                setEditField(null);
                setEditValue('');
                setSavingEdit(false);
                return;
            }
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

    const handleRebookSlotSelect = async (date, time, activityId, selectedActivity, selectedLocation) => {
        if (!bookingDetail || !bookingDetail.booking) return;
        setRebookLoading(true);
        try {
            // Get activity details to determine flight type and pricing
            const activityResponse = await axios.get(`/api/activity/${activityId}`);
            const activity = activityResponse.data.data;
            
            // Determine flight type based on passenger count
            const passengerCount = bookingDetail.booking.pax || 1;
            const flightType = passengerCount === 1 ? 'Shared Flight' : 'Private Flight';
            
            // Calculate price based on flight type
            let totalPrice = bookingDetail.booking.paid || 0;
            if (activity) {
                if (flightType === 'Shared Flight') {
                    totalPrice = activity.shared_price * passengerCount;
                } else {
                    // For private flights, use the group price
                    totalPrice = activity.private_price;
                }
            }
            
            const payload = {
                activitySelect: flightType,
                chooseLocation: selectedLocation || bookingDetail.booking.location,
                chooseFlightType: { type: flightType, passengerCount: passengerCount },
                activity_id: activityId,
                passengerData: [
                    {
                        firstName: bookingDetail.booking.name?.split(' ')[0] || '',
                        lastName: bookingDetail.booking.name?.split(' ').slice(1).join(' ') || '',
                        weight: bookingDetail.passengers?.[0]?.weight || '',
                        email: bookingDetail.booking.email || '',
                        phone: bookingDetail.booking.phone || '',
                        ticketType: flightType,
                        weatherRefund: bookingDetail.passengers?.[0]?.weather_refund || false
                    }
                ],
                selectedDate: dayjs(date).format('YYYY-MM-DD') + ' ' + time,
                totalPrice: totalPrice,
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
    const [editingPassenger, setEditingPassenger] = useState(null);
    const [editPassengerFirstName, setEditPassengerFirstName] = useState("");
    const [editPassengerLastName, setEditPassengerLastName] = useState("");
    const [editPassengerWeight, setEditPassengerWeight] = useState("");
    const [editPassengerPrice, setEditPassengerPrice] = useState("");
    const [savingPassengerEdit, setSavingPassengerEdit] = useState(false);

    // Add state for tracking passenger prices in edit mode
    const [editPassengerPrices, setEditPassengerPrices] = useState([]);

    const handleEditPassengerClick = (p) => {
        setEditPassengerFirstName(p.first_name || "");
        setEditPassengerLastName(p.last_name || "");
        setEditPassengerWeight(p.weight || "");
        setEditPassengerPrice(p.price || "");
        setEditingPassenger(p.id);
    };
    const handleCancelPassengerEdit = () => {
        setEditingPassenger(null);
        setEditPassengerPrice("");
    };
    const handleSavePassengerEdit = async (p) => {
        setSavingPassengerEdit(true);
        try {
            if (editPassengerFirstName !== p.first_name) {
                await axios.patch('/api/updatePassengerField', {
                    passenger_id: p.id,
                    field: 'first_name',
                    value: editPassengerFirstName
                });
            }
            if (editPassengerLastName !== p.last_name) {
                await axios.patch('/api/updatePassengerField', {
                    passenger_id: p.id,
                    field: 'last_name',
                    value: editPassengerLastName
                });
            }
            if (editPassengerWeight !== p.weight) {
                await axios.patch('/api/updatePassengerField', {
                    passenger_id: p.id,
                    field: 'weight',
                    value: editPassengerWeight
                });
            }
            if (editPassengerPrice !== p.price) {
                await axios.patch('/api/updatePassengerField', {
                    passenger_id: p.id,
                    field: 'price',
                    value: editPassengerPrice
                });
            }
            await fetchBookingDetail(bookingDetail.booking.id);
            setEditingPassenger(null);
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

    // Add state for status update loading
    const [statusLoadingGroup, setStatusLoadingGroup] = useState(null);

    // Add handler to toggle status for a group
    const handleToggleGroupStatus = async (groupFlights) => {
      if (!groupFlights || groupFlights.length === 0) return;
      setStatusLoadingGroup(groupFlights[0].id);
      const first = groupFlights[0];
      const currentStatus = getFlightStatus(first);
      const newStatus = currentStatus === 'Closed' ? 1 : 0; // 1=Open, 0=Closed
      const newStatusText = newStatus === 1 ? 'Open' : 'Closed';
      const oldStatusText = currentStatus === 'Open' ? 'Open' : 'Closed';
      try {
        // 1. Önce booking status'u güncelle
        await Promise.all(groupFlights.map(f =>
          axios.post('/api/updateBookingStatus', {
            booking_id: f.id,
            manual_status_override: newStatus
          })
        ));
        // 2. Tüm groupFlights için toplam pax hesapla
        const totalPax = groupFlights.reduce((sum, f) => sum + (f.passengers ? f.passengers.length : 0), 0);
        // 3. Sadece bir kez availability güncelle (toplam pax ile)
        await axios.patch('/api/updateManifestStatus', {
          booking_id: first.id, // referans booking id
          old_status: oldStatusText,
          new_status: newStatusText,
          flight_date: first.flight_date,
          location: first.location,
          total_pax: totalPax
        });
        // 4. UI state güncelle
        setFlights(prev => prev.map(f =>
          groupFlights.some(gf => gf.id === f.id)
            ? { ...f, manual_status_override: newStatus }
            : f
        ));
        // 5. Availabilities tekrar fetch et
        if (Array.isArray(activity)) {
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
      } catch (err) {
        alert('Status update failed!');
      }
      setStatusLoadingGroup(null);
    };

    // When opening dialog, initialize editPassengerPrices
    useEffect(() => {
      if (detailDialogOpen && bookingDetail?.passengers) {
        setEditPassengerPrices(bookingDetail.passengers.map(p => p.price ? parseFloat(p.price) : 0));
      }
    }, [detailDialogOpen, bookingDetail]);

    // Add state for booking modal
    const [bookingModalOpen, setBookingModalOpen] = useState(false);
    const [bookingModalLoading, setBookingModalLoading] = useState(false);
    const [bookingAvailabilities, setBookingAvailabilities] = useState([]);
    const [bookingModalError, setBookingModalError] = useState("");
    const [bookingModalDate, setBookingModalDate] = useState(null);
    const [bookingModalTimes, setBookingModalTimes] = useState([]);
    const [bookingModalGroup, setBookingModalGroup] = useState(null);
    // Add state for passenger count in booking modal
    const [bookingModalPax, setBookingModalPax] = useState(1);

    // Add state for selected time slot and contact information fields in booking modal
    const [bookingModalSelectedTime, setBookingModalSelectedTime] = useState(null);
    const [bookingModalContactInfos, setBookingModalContactInfos] = useState([
      { firstName: '', lastName: '', phone: '', email: '', weight: '' }
    ]);

    // Reset contact info and selected time when modal opens or date changes
    useEffect(() => {
      if (!bookingModalOpen) {
        setBookingModalSelectedTime(null);
        setBookingModalContactInfos([{ firstName: '', lastName: '', phone: '', email: '', weight: '' }]);
      }
    }, [bookingModalOpen]);
    useEffect(() => {
      setBookingModalSelectedTime(null);
      setBookingModalContactInfos([{ firstName: '', lastName: '', phone: '', email: '', weight: '' }]);
    }, [bookingModalDate]);

    // Handler to update a field in a contact info object
    const handleContactInfoChange = (idx, field, value) => {
      setBookingModalContactInfos(prev => prev.map((info, i) => i === idx ? { ...info, [field]: value } : info));
    };

    // Handler for Book button
    const handleOpenBookingModal = async (group) => {
      setBookingModalGroup(group);
      setBookingModalOpen(true);
      setBookingModalLoading(true);
      setBookingModalError("");
      setBookingAvailabilities([]);
      setBookingModalDate(null);
      setBookingModalTimes([]);
      setBookingModalPax(1); // Reset pax
      try {
        // Fetch activity id by location and flight_type
        const res = await axios.post("/api/getActivityId", { location: group.location });
        const activity = res.data.activity;
        // Fetch availabilities for this activity
        const availRes = await axios.get(`/api/activity/${activity.id}/availabilities`);
        setBookingAvailabilities(availRes.data.data || []);
      } catch (err) {
        setBookingModalError("Failed to fetch availabilities");
      } finally {
        setBookingModalLoading(false);
      }
    };

    // When pax count changes, update the contact info array length
    useEffect(() => {
      setBookingModalContactInfos(prev => {
        if (bookingModalPax > prev.length) {
          // Add new empty contact infos
          return [
            ...prev,
            ...Array.from({ length: bookingModalPax - prev.length }, () => ({ firstName: '', lastName: '', phone: '', email: '', weight: '' }))
          ];
        } else if (bookingModalPax < prev.length) {
          // Remove extra contact infos
          return prev.slice(0, bookingModalPax);
        }
        return prev;
      });
    }, [bookingModalPax]);

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
                            const normalizeTime = t => t ? t.slice(0,5) : '';
                            let found = null;
                            if (availabilities.length > 0) {
                                const dateStr = first.flight_date ? first.flight_date.substring(0,10) : null;
                                // Try to match by time_slot, fallback to 09:00 if not set
                                let timeStr = null;
                                if (first.time_slot) {
                                    timeStr = first.time_slot.slice(0,5);
                                } else if (first.flight_date && first.flight_date.length >= 16) {
                                    timeStr = first.flight_date.substring(11,16);
                                } else {
                                    timeStr = '09:00'; // fallback default
                                }
                                found = availabilities.find(a => {
                                    const aDate = a.date && a.date.length >= 10 ? a.date.substring(0,10) : null;
                                    const aTime = a.time ? a.time.slice(0,5) : null;
                                    return a.activity_id == first.activity_id && aDate === dateStr && aTime === timeStr;
                                });
                            }
                            // GÜNCELLEME: Pax Booked kesin olarak capacity - available / capacity olacak
                            let paxBooked = 0;
                            let paxTotal = 0;
                            if (found) {
                                paxBooked = found.capacity - found.available;
                                paxTotal = found.capacity;
                            } else {
                                paxBooked = '-';
                                paxTotal = '-';
                            }
                            const status = found ? (found.available > 0 ? "Open" : "Closed") : getFlightStatus(first);
                            const balloonResource = first.balloon_resources || 'N/A';
                            const timeSlot = first.time_slot || 'N/A';
                            // Find the correct flight time from availability if found, always show as local time
                            let displayFlightTime = '';
                            if (found && found.time) {
                                // Try to parse as local time
                                displayFlightTime = dayjs(found.time, 'HH:mm:ss').format('HH:mm');
                            } else if (first.time_slot) {
                                displayFlightTime = dayjs(first.time_slot, 'HH:mm').format('HH:mm');
                            } else if (first.flight_date && first.flight_date.length >= 16) {
                                // Try to parse as local time
                                const timePart = first.flight_date.substring(11, 16);
                                displayFlightTime = dayjs(timePart, 'HH:mm').format('HH:mm');
                            }
                            return (
                                <Card key={groupKey} sx={{ marginBottom: 2 }}>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                            <Box display="flex" flexDirection="column" alignItems="flex-start">
                                                {/* Section başlığında activityName ve flight time birlikte gösterilecek */}
                                                <Typography variant="h6">{activityName} - Flight Time: {displayFlightTime}</Typography>
                                                <Box display="flex" alignItems="center" gap={3} mt={1}>
                                                    <Typography>Pax Booked: {paxBooked} / {paxTotal}</Typography>
                                                    <Typography>Balloon Resource: {balloonResource}</Typography>
                                                    <Typography>Status: <span
  style={{ color: status === 'Closed' ? 'red' : 'green', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
  onClick={() => handleToggleGroupStatus(groupFlights)}
>{status}{statusLoadingGroup === first.id ? '...' : ''}</span></Typography>
                                                    <Typography>Type: {first.flight_type}</Typography>
                                                </Box>
                                            </Box>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Button variant="contained" color="primary" sx={{ minWidth: 90, fontWeight: 600, textTransform: 'none' }} onClick={() => handleOpenBookingModal(first)}>Book</Button>
                                                <IconButton size="large" onClick={e => handleGlobalMenuOpen(e, first, groupFlights)}>
                                                    <MoreVertIcon />
                                                </IconButton>
                                            </Box>
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
                                                    {/* Her booking için sadece bir satır (ilk passenger) göster */}
                                                    {groupFlights.map((flight, idx) => {
                                                        // Sadece ilk passenger'ı al
                                                        const firstPassenger = Array.isArray(flight.passengers) && flight.passengers.length > 0 ? flight.passengers[0] : null;
                                                        return (
                                                            <TableRow key={flight.id}>
                                                                <TableCell>
                                                                    <span style={{ color: '#3274b4', cursor: 'pointer', textDecoration: 'underline' }}
                                                                        onClick={() => handleNameClick(flight.id)}>
                                                                        {flight.id || ''}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <span style={{ color: '#3274b4', cursor: 'pointer', textDecoration: 'underline' }}
                                                                        onClick={() => handleNameClick(flight.id)}>
                                                                        {firstPassenger ? `${firstPassenger.first_name || ''} ${firstPassenger.last_name || ''}`.trim() : (flight.name || '')}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell>{firstPassenger ? firstPassenger.weight : ''}</TableCell>
                                                                <TableCell>{flight.phone || ''}</TableCell>
                                                                <TableCell>{flight.email || ''}</TableCell>
                                                                <TableCell>{displayFlightTime}</TableCell>
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
                                                        );
                                                    })}
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
                                        <Typography><b>Paid:</b> {editField === 'paid' ? (
  <>
    <input value={editValue} onChange={e => setEditValue(e.target.value.replace(/[^0-9.]/g, ''))} style={{marginRight: 8}} />
    <Button size="small" onClick={async () => {
      // Split paid equally among passengers
      const paid = parseFloat(editValue) || 0;
      const n = bookingDetail.passengers.length;
      const perPassenger = n > 0 ? parseFloat((paid / n).toFixed(2)) : 0;
      // Update all passengers in backend
      await Promise.all(bookingDetail.passengers.map((p, idx) =>
        axios.patch('/api/updatePassengerField', {
          passenger_id: p.id,
          field: 'price',
          value: perPassenger
        })
      ));
      // Update paid in backend
      await axios.patch('/api/updateBookingField', {
        booking_id: bookingDetail.booking.id,
        field: 'paid',
        value: paid
      });
      // Update UI
      setBookingDetail(prev => ({
        ...prev,
        booking: { ...prev.booking, paid },
        passengers: prev.passengers.map(p => ({ ...p, price: perPassenger }))
      }));
      setEditPassengerPrices(bookingDetail.passengers.map(() => perPassenger));
      setEditField(null);
      setEditValue('');
    }} disabled={savingEdit}>Save</Button>
    <Button size="small" onClick={handleEditCancel}>Cancel</Button>
  </>
) : (
  <>
    £{bookingDetail.booking.paid}
    <IconButton size="small" onClick={() => handleEditClick('paid', bookingDetail.booking.paid)}><EditIcon fontSize="small" /></IconButton>
  </>
)}</Typography>
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
                                                    <select value={editPrefValue} onChange={e => setEditPrefValue(e.target.value)} style={{ marginRight: 8, width: 220 }} disabled={savingPref}>
                                                        <option value="">Select...</option>
                                                        <option value="Weekend Only">Weekend Only</option>
                                                        <option value="Weekday & Weekend">Weekday & Weekend</option>
                                                    </select>
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
                                                    <select value={editPrefValue} onChange={e => setEditPrefValue(e.target.value)} style={{ marginRight: 8, width: 220 }} disabled={savingPref}>
                                                        <option value="">Select...</option>
                                                        <option value="Bath">Bath</option>
                                                        <option value="Taunton & South Somerset">Taunton & South Somerset</option>
                                                        <option value="Exeter & Tiverton">Exeter & Tiverton</option>
                                                    </select>
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
                                                    <select value={editPrefValue} onChange={e => setEditPrefValue(e.target.value)} style={{ marginRight: 8, width: 220 }} disabled={savingPref}>
                                                        <option value="">Select...</option>
                                                        <option value="Morning">Morning</option>
                                                        <option value="Afternoon & Evening">Afternoon & Evening</option>
                                                    </select>
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
                                                {bookingDetail.booking.status !== 'Cancelled' && (
                                                    <Typography><b>Booked For:</b> {bookingDetail.booking.flight_date ? (
                                                        <a
                                                            href={`http://3.95.28.43:3000/manifest?date=${dayjs(bookingDetail.booking.flight_date).format('YYYY-MM-DD')}&time=${dayjs(bookingDetail.booking.flight_date).format('HH:mm')}`}
                                                            style={{ color: '#3274b4', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                                                        >
                                                            {dayjs(bookingDetail.booking.flight_date).format('DD/MM/YYYY HH:mm')}
                                                        </a>
                                                    ) : '-'}</Typography>
                                                )}
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
                                                    {bookingDetail.passengers.map((p, i) => (
                                                        <Typography key={p.id}>
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
                                                                    <input
                                                                        value={editPassengerPrice}
                                                                        onChange={e => setEditPassengerPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                                                                        placeholder="Price (£)"
                                                                        style={{ marginRight: 4, width: 70 }}
                                                                    />
                                                                    <Button size="small" onClick={() => handleSavePassengerEdit(p)} disabled={savingPassengerEdit}>Save</Button>
                                                                    <Button size="small" onClick={handleCancelPassengerEdit} disabled={savingPassengerEdit}>Cancel</Button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {p.first_name || '-'} {p.last_name || '-'}{p.weight ? ` (${p.weight}kg${p.price ? ' £' + p.price : ''})` : ''}
                                                                    <IconButton size="small" onClick={() => handleEditPassengerClick(p)}><EditIcon fontSize="small" /></IconButton>
                                                                </>
                                                            )}
                                                        </Typography>
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
                            <TextField label="Weight (kg)" value={g.weight} onChange={e => handleGuestFormChange(idx, 'weight', e.target.value)} fullWidth margin="dense" />
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
                flightType={bookingDetail?.booking?.flight_type || ''}
            />
            {/* Booking Modal */}
            <Dialog open={bookingModalOpen} onClose={() => setBookingModalOpen(false)} maxWidth="md" fullWidth>
              <DialogTitle style={{ fontWeight: 700, fontSize: 22 }}>
                Create Booking<br/>{bookingModalGroup ? `${bookingModalGroup.location} - ${bookingModalGroup.flight_type}` : ''}
              </DialogTitle>
              <DialogContent>
                {bookingModalLoading ? (
                  <Typography>Loading availabilities...</Typography>
                ) : bookingModalError ? (
                  <Typography color="error">{bookingModalError}</Typography>
                ) : (
                  <Box>
                    {/* Flight info and pax selector, calendar, and time slots */}
                    {bookingAvailabilities.length > 0 && (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              {bookingModalGroup?.flight_type || ''} £{bookingAvailabilities[0].price || ''}
                            </Typography>
                            <Typography sx={{ color: '#888' }}>£{bookingAvailabilities[0].price || ''} Per Person</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Button variant="contained" color="primary" onClick={() => setBookingModalPax(p => Math.max(1, p - 1))} sx={{ minWidth: 40, fontSize: 22, fontWeight: 700 }}>-</Button>
                            <Typography sx={{ minWidth: 32, textAlign: 'center', fontSize: 22 }}>{bookingModalPax}</Typography>
                            <Button variant="contained" color="primary" onClick={() => setBookingModalPax(p => p + 1)} sx={{ minWidth: 40, fontSize: 22, fontWeight: 700 }}>+</Button>
                          </Box>
                        </Box>
                        {/* Calendar grid by date */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                          {[...new Set(bookingAvailabilities.map(a => a.date))].map(date => (
                            <Button
                              key={date}
                              variant={bookingModalDate === date ? 'contained' : 'outlined'}
                              onClick={() => {
                                setBookingModalDate(date);
                                setBookingModalTimes(bookingAvailabilities.filter(a => a.date === date));
                                setBookingModalSelectedTime(null); // reset time selection on date change
                                setBookingModalContactInfos([{ firstName: '', lastName: '', phone: '', email: '', weight: '' }]);
                              }}
                              sx={{ minWidth: 90, mb: 1 }}
                            >
                              {dayjs(date).isValid() ? dayjs(date).format('DD/MM/YYYY') : date}
                            </Button>
                          ))}
                        </Box>
                        {/* Time slots for selected date */}
                        {bookingModalDate && (
                          <Box>
                            <Typography variant="h6">Times for {dayjs(bookingModalDate).isValid() ? dayjs(bookingModalDate).format('DD/MM/YYYY') : bookingModalDate}</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                              {bookingModalTimes.map(slot => (
                                <Button
                                  key={slot.id}
                                  variant={bookingModalSelectedTime && bookingModalSelectedTime.id === slot.id ? 'contained' : 'outlined'}
                                  sx={{ minWidth: 120, mb: 1 }}
                                  onClick={() => setBookingModalSelectedTime(slot)}
                                >
                                  {slot.time} {slot.status === 'Open' ? '' : '(Full)'}
                                </Button>
                              ))}
                            </Box>
                            {/* Contact Information Form */}
                            {bookingModalSelectedTime && (
                              <Box sx={{ mt: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, background: '#fafbfc' }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Contact Information</Typography>
                                {bookingModalContactInfos.map((info, idx) => (
                                  <Box key={idx} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, background: '#fff' }}>
                                    <Typography sx={{ fontWeight: 600, mb: 2 }}>Passenger {idx + 1}</Typography>
                                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                      <TextField
                                        label="First Name"
                                        value={info.firstName}
                                        onChange={e => handleContactInfoChange(idx, 'firstName', e.target.value)}
                                        fullWidth
                                        placeholder="First"
                                      />
                                      <TextField
                                        label="Last Name"
                                        value={info.lastName}
                                        onChange={e => handleContactInfoChange(idx, 'lastName', e.target.value)}
                                        fullWidth
                                        placeholder="Last"
                                      />
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                      <TextField
                                        label="Phone"
                                        value={info.phone}
                                        onChange={e => handleContactInfoChange(idx, 'phone', e.target.value)}
                                        fullWidth
                                        placeholder="Phone number"
                                      />
                                      <TextField
                                        label="Email"
                                        value={info.email}
                                        onChange={e => handleContactInfoChange(idx, 'email', e.target.value)}
                                        fullWidth
                                        placeholder="john@gmail.com"
                                      />
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                      <TextField
                                        label="Weight (kg)"
                                        value={info.weight}
                                        onChange={e => handleContactInfoChange(idx, 'weight', e.target.value.replace(/[^0-9.]/g, ''))}
                                        fullWidth
                                        placeholder="Weight"
                                      />
                                    </Box>
                                  </Box>
                                ))}
                              </Box>
                            )}
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setBookingModalOpen(false)}>Close</Button>
              </DialogActions>
            </Dialog>
        </div>
    );
};

export default Manifest;
