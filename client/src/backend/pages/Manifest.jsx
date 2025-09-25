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
import DeleteIcon from '@mui/icons-material/Delete';
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
    
    // Email modal state
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [selectedBookingForEmail, setSelectedBookingForEmail] = useState(null);
    const [emailForm, setEmailForm] = useState({
        to: '',
        subject: '',
        message: ''
    });
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailLogs, setEmailLogs] = useState([]);
    const [emailLogsPollId, setEmailLogsPollId] = useState(null);

    // SMS state
    const [smsModalOpen, setSmsModalOpen] = useState(false);
    const [smsForm, setSmsForm] = useState({ to: '', message: '' });
    const [smsSending, setSmsSending] = useState(false);
    const [smsLogs, setSmsLogs] = useState([]);
    const [smsPollId, setSmsPollId] = useState(null);
    
    // Additional information state
    const [additionalInformation, setAdditionalInformation] = useState(null);
    const [additionalInfoLoading, setAdditionalInfoLoading] = useState(false);

    // Add state for global menu anchor
    const [globalMenuAnchorEl, setGlobalMenuAnchorEl] = useState(null);
    // Add state for the current group (first) for which the menu is open
    const [globalMenuGroup, setGlobalMenuGroup] = useState(null);
    // Add state for the current group's flights
    const [globalMenuGroupFlights, setGlobalMenuGroupFlights] = useState([]);
    // Confirm cancel-all dialog state
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
    const [confirmCancelLoading, setConfirmCancelLoading] = useState(false);
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
        // Open confirmation dialog instead of immediate action
        setConfirmCancelOpen(true);
        return;
      }
      console.log('Action:', action);
      handleGlobalMenuClose();
    };

    // Confirm cancel all - update status to cancelled and increment flight_attempts
    const handleConfirmCancelAll = async () => {
      if (!globalMenuGroup?.id) { setConfirmCancelOpen(false); return; }
      setConfirmCancelLoading(true);
      try {
        const groupBookingIds = globalMenuGroupFlights.map(f => f.id);
        
        // Update each booking: set status to 'cancelled' and increment flight_attempts
        await Promise.all(groupBookingIds.map(async (id) => {
          // First, get current flight_attempts
          const currentBooking = globalMenuGroupFlights.find(f => f.id === id);
          const currentAttempts = currentBooking?.flight_attempts || 0;
          const newAttempts = currentAttempts + 1;
          
          // Update status to cancelled
          await axios.patch('/api/updateBookingField', {
            booking_id: id,
            field: 'status',
            value: 'Cancelled'
          });
          
          // Increment flight_attempts
          await axios.patch('/api/updateBookingField', {
            booking_id: id,
            field: 'flight_attempts',
            value: newAttempts
          });
        }));
        
        // Remove from manifest view only (not from database)
        setFlights(prev => prev.filter(f => !groupBookingIds.includes(f.id)));
        setConfirmCancelOpen(false);
        handleGlobalMenuClose();
        
        // Show success message
        alert(`Successfully cancelled ${groupBookingIds.length} booking(s) and incremented flight attempts.`);
      } catch (err) {
        alert('Failed to cancel all guests: ' + (err?.response?.data?.message || err.message || 'Unknown error'));
      } finally {
        setConfirmCancelLoading(false);
      }
    };
    const handleConfirmCancelClose = () => {
      setConfirmCancelOpen(false);
    };

    // Email handlers
    const handleEmailClick = (booking) => {
        setSelectedBookingForEmail(booking);
        setEmailForm({
            to: booking.email || '',
            subject: '',
            message: ''
        });
        setEmailModalOpen(true);
        
        // Fetch email logs
        (async () => {
            try {
                const resp = await axios.get(`/api/bookingEmails/${booking.id}`);
                setEmailLogs(resp.data?.data || []);
            } catch (err) {
                console.error('Error fetching email logs:', err);
            }
        })();
    };

    const handleSendEmail = async () => {
        if (!emailForm.to || !emailForm.subject || !emailForm.message) {
            alert('Please fill all fields');
            return;
        }
        
        setSendingEmail(true);
        try {
            const response = await axios.post('/api/sendBookingEmail', {
                bookingId: selectedBookingForEmail?.id,
                to: emailForm.to,
                subject: emailForm.subject,
                message: emailForm.message,
                template: 'custom',
                bookingData: selectedBookingForEmail
            });
            
            if (response.data?.success) {
                alert('Email sent successfully!');
                setEmailModalOpen(false);
                // Refresh email logs by booking id for sync
                if (selectedBookingForEmail?.id) {
                    try {
                        const resp = await axios.get(`/api/bookingEmails/${selectedBookingForEmail.id}`);
                        setEmailLogs(resp.data?.data || []);
                    } catch {}
                }
            } else {
                alert('Failed to send email: ' + (response.data?.message || 'Unknown error'));
            }
        } catch (err) {
            alert('Failed to send email: ' + (err?.response?.data?.message || err.message));
        } finally {
            setSendingEmail(false);
        }
    };

    // SMS handlers
    const handleSmsClick = (booking) => {
        setSelectedBookingForEmail(booking);
        setSmsForm({ to: booking.phone || '', message: '' });
        setSmsModalOpen(true);
        
        // Fetch SMS logs
        (async () => {
            try {
                const resp = await axios.get(`/api/bookingSms/${booking.id}`);
                setSmsLogs(resp.data?.data || []);
            } catch (err) {
                console.error('Error fetching SMS logs:', err);
            }
        })();
    };

    const handleSendSms = async () => {
        if (!smsForm.to || !smsForm.message) {
            alert('Please fill phone and message');
            return;
        }
        
        setSmsSending(true);
        try {
            const resp = await axios.post('/api/sendBookingSms', {
                bookingId: selectedBookingForEmail?.id,
                to: smsForm.to,
                body: smsForm.message
            });
            
            if (resp.data?.success) {
                alert('SMS sent successfully!');
                setSmsModalOpen(false);
                // Refresh SMS logs by booking id for sync
                if (selectedBookingForEmail?.id) {
                    try {
                        const r = await axios.get(`/api/bookingSms/${selectedBookingForEmail.id}`);
                        setSmsLogs(r.data?.data || []);
                    } catch {}
                }
            } else {
                alert('Failed to send SMS: ' + (resp.data?.message || 'Unknown error'));
            }
        } catch (err) {
            alert('Failed to send SMS: ' + (err?.response?.data?.message || err.message));
        } finally {
            setSmsSending(false);
        }
    };

    const booking = useMemo(() => Array.isArray(bookingHook.booking) ? bookingHook.booking : [], [bookingHook.booking]);
    const bookingLoading = typeof bookingHook.loading === 'boolean' ? bookingHook.loading : true;
    const passenger = useMemo(() => Array.isArray(pessangerHook.passenger) ? pessangerHook.passenger : [], [pessangerHook.passenger]);
    const passengerLoading = typeof pessangerHook.loading === 'boolean' ? pessangerHook.loading : true;
    const activity = Array.isArray(activityHook && activityHook.activity) ? activityHook.activity : [];
    const activityLoading = activityHook && typeof activityHook.loading === 'boolean' ? activityHook.loading : true;

    // Helper: fetch capacity for a slot
    const [availabilities, setAvailabilities] = useState([]);
    const [locationToActivityId, setLocationToActivityId] = useState({});
    const [nameToActivityId, setNameToActivityId] = useState({});
    
    // Fetch availabilities for the selected date and location
    const fetchAllAvailabilities = async () => {
        try {
            // Use activitiesForRebook to ensure location is provided
            const activitiesRes = await axios.get('/api/activitiesForRebook');
            if (activitiesRes.data.success && Array.isArray(activitiesRes.data.data)) {
                const activities = activitiesRes.data.data;
                const map = activities.reduce((acc, a) => { if (a.location) acc[a.location] = a.id; return acc; }, {});
                setLocationToActivityId(map);
                const nameMap = activities.reduce((acc, a) => { if (a.activity_name) acc[a.activity_name] = a.id; return acc; }, {});
                setNameToActivityId(nameMap);

                let allAvailabilities = [];
                for (const act of activities) {
                    try {
                        const availRes = await axios.get(`/api/activity/${act.id}/availabilities`);
                        if (availRes.data.success && Array.isArray(availRes.data.data)) {
                            const withMeta = availRes.data.data.map(avail => ({
                                ...avail,
                                activity_id: act.id,
                                location: act.location,
                                activity_name: act.activity_name,
                                flight_type: act.flight_type,
                                capacity: avail.capacity
                            }));
                            allAvailabilities = allAvailabilities.concat(withMeta);
                        }
                    } catch (error) {
                        console.error(`Error fetching availabilities for activity ${act.id}:`, error);
                    }
                }
                console.log('All availabilities loaded:', allAvailabilities);
                setAvailabilities(allAvailabilities);
            }
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
    };
    
    useEffect(() => {
        fetchAllAvailabilities();
    }, [flights, selectedDate, activity]);

    // Hatalı veri durumunu kontrol et
    useEffect(() => {
        if (!Array.isArray(booking) || !Array.isArray(passenger)) {
            setError("Data could not be retrieved. Please try again later.");
        }
    }, [booking, passenger]);

    useEffect(() => {
        if (!bookingLoading && !passengerLoading) {
            // Filter out cancelled bookings before combining with passenger data
            const activeBookings = booking.filter((b) => 
                b.status !== 'Cancelled'
            );
            
            const combinedFlights = activeBookings.map((b) => ({
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
        const newDate = e.target.value;
        console.log('Date changed to:', newDate);
        setSelectedDate(newDate);
        
        // Clear crew assignments for the old date and fetch for the new date
        setCrewAssignmentsBySlot({});
        
        // Fetch crew assignments for the new date
        if (newDate) {
            axios.get('/api/crew-assignments', { params: { date: newDate } })
                .then(res => {
                    if (res.data?.success && Array.isArray(res.data.data)) {
                        const map = {};
                        for (const row of res.data.data) {
                            const key = slotKey(row.activity_id, dayjs(row.date).format('YYYY-MM-DD'), row.time.substring(0,5));
                            map[key] = row.crew_id;
                        }
                        console.log('Crew assignments loaded for new date:', map);
                        setCrewAssignmentsBySlot(map);
                    }
                })
                .catch((err) => {
                    console.error('Error fetching crew assignments for new date:', err);
                });
        }
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
        if (flightDate < currentDate) {
            return "Closed";
        }
        
        // Calculate total passengers for this flight group
        const totalPassengers = flights.filter(f => 
            f.flight_date === flight.flight_date && 
            f.location === flight.location && 
            f.flight_type === flight.flight_type &&
            f.time_slot === flight.time_slot
        ).reduce((sum, f) => sum + (f.passengers ? f.passengers.length : 0), 0);
        
        // Get capacity from activity
        const maxCapacity = activity.find((a) => a.id == flight.activity_id)?.capacity || 0;
        
        // Simple logic: if total passengers equals or exceeds capacity, then closed
        if (totalPassengers >= maxCapacity && maxCapacity > 0) {
            return "Closed";
        }
        
        return "Open";
    };

    // Helper function to display passenger status with emojis
    const getStatusWithEmoji = (status) => {
        switch (status) {
            case 'Scheduled':
                return 'Scheduled';
            case 'Checked In':
                return '✅ Checked In';
            case 'Flown':
                return '🎈 Flown';
            case 'No Show':
                return '❌ No Show';
            default:
                return status;
        }
    };

    // Function to automatically update flight status based on passenger count
    const autoUpdateFlightStatus = async (flight) => {
        try {
            // Calculate total passengers for this flight group
            const totalPassengers = flights.filter(f => 
                f.flight_date === flight.flight_date && 
                f.location === flight.location && 
                f.flight_type === flight.flight_type &&
                f.time_slot === flight.time_slot
            ).reduce((sum, f) => sum + (f.passengers ? f.passengers.length : 0), 0);
            
            // Get capacity from activity
            const maxCapacity = activity.find((a) => a.id == flight.activity_id)?.capacity || 0;
            
            console.log(`autoUpdateFlightStatus - Flight ${flight.id}: passengers ${totalPassengers}/${maxCapacity}, current status: ${getFlightStatus(flight)}`);
            
            // Eğer total passengers capacity'yi geçiyorsa, otomatik olarak flight'ı kapat
            if (totalPassengers >= maxCapacity && maxCapacity > 0) {
                const currentStatus = getFlightStatus(flight);
                if (currentStatus === "Open") {
                    console.log(`Auto-closing flight: ${flight.id} - passengers: ${totalPassengers}/${maxCapacity}`);
                    
                    // Update the flight status to Closed
                    await axios.patch('/api/updateManifestStatus', {
                        booking_id: flight.id,
                        old_status: 'Open',
                        new_status: 'Closed',
                        flight_date: flight.flight_date,
                        location: flight.location,
                        total_pax: totalPassengers
                    });
                    
                    // Update local state
                    setFlights(prevFlights => prevFlights.map(f =>
                        f.flight_date === flight.flight_date && 
                        f.location === flight.location && 
                        f.flight_type === flight.flight_type &&
                        f.time_slot === flight.time_slot
                            ? { ...f, manual_status_override: 0 } // 0 = Closed
                            : f
                    ));
                    
                    console.log(`Flight ${flight.id} status updated to Closed`);
                }
            } else if (totalPassengers < maxCapacity && maxCapacity > 0) {
                // Eğer total passengers capacity'nin altındaysa ve status "Closed" ise, "Open" yapılabilir
                const currentStatus = getFlightStatus(flight);
                if (currentStatus === "Closed" && flight.manual_status_override === 0) {
                    console.log(`Auto-opening flight: ${flight.id} - passengers: ${totalPassengers}/${maxCapacity}`);
                    
                    // Update the flight status to Open
                    await axios.patch('/api/updateManifestStatus', {
                        booking_id: flight.id,
                        old_status: 'Closed',
                        new_status: 'Open',
                        flight_date: flight.flight_date,
                        location: flight.location,
                        total_pax: totalPassengers
                    });
                    
                    // Update local state
                    setFlights(prevFlights => prevFlights.map(f =>
                        f.flight_date === flight.flight_date && 
                        f.location === flight.location && 
                        f.flight_type === flight.flight_type &&
                        f.time_slot === flight.time_slot
                            ? { ...f, manual_status_override: 1 } // 1 = Open
                            : f
                    ));
                    
                    console.log(`Flight ${flight.id} status updated to Open`);
                }
            }
        } catch (error) {
            console.error('Error auto-updating flight status:', error);
        }
    };

    const toggleFlightStatus = async (flightId) => {
        const flight = flights.find(f => f.id === flightId);
        if (!flight) return;
        
        // Calculate total passengers for this flight group
        const totalPassengers = flights.filter(f => 
            f.flight_date === flight.flight_date && 
            f.location === flight.location && 
            f.flight_type === flight.flight_type &&
            f.time_slot === flight.time_slot
        ).reduce((sum, f) => sum + (f.passengers ? f.passengers.length : 0), 0);
        
        // Get capacity from activity
        const maxCapacity = activity.find((a) => a.id == flight.activity_id)?.capacity || 0;
        
        console.log(`toggleFlightStatus - Flight ${flightId}: passengers ${totalPassengers}/${maxCapacity}`);
        
        const oldStatus = flight.manual_status_override === 1 || (flight.manual_status_override === null && getFlightStatus(flight) === "Open") ? "Open" : "Closed";
        
        // Eğer pax booked capacity'yi geçiyorsa ve status "Closed" ise, "Open" yapılamaz
        if (totalPassengers >= maxCapacity && maxCapacity > 0 && oldStatus === "Closed") {
            alert(`This flight is full with ${totalPassengers}/${maxCapacity} passengers. Status cannot be set to "Open".`);
            return;
        }
        
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
        (acc[key] = acc[key] || []).push(item);
        return acc;
    }, {});

    // Normalize group key so the same activity/time collapses to a single section
    const normalizeTime = (f) => {
        const formatTime = (val) => {
            try {
                const raw = String(val ?? '').trim();
                if (!raw) return '';
                const parts = raw.split(':');
                const hh = parts[0] ? parts[0].padStart(2, '0') : '00';
                const mm = parts[1] ? parts[1].padStart(2, '0') : '00';
                return `${hh}:${mm}`;
            } catch (_) { return ''; }
        };
        try {
            if (f.time_slot) return formatTime(f.time_slot);
            if (f.flight_date && typeof f.flight_date === 'string') {
                const t = f.flight_date.length >= 16 ? f.flight_date.substring(11,16) : f.flight_date;
                return formatTime(t);
            }
        } catch (_) {}
        return '';
    };
    const normalizeText = (v) => (v ? String(v).trim().toLowerCase() : '');

    const groupedFlights = groupBy(filteredFlights, f => {
        const loc = normalizeText(f.location);
        const type = normalizeText(f.flight_type);
        const time = normalizeTime(f);
        const key = `${loc}||${type}||${time}`;
        return key;
    });

    const handleNameClick = (bookingId) => {
        setSelectedBookingId(bookingId);
        setDetailDialogOpen(true);
    };

    useEffect(() => {
        if (detailDialogOpen && selectedBookingId) {
            setLoadingDetail(true);
            setDetailError(null);
            axios.get(`/api/getBookingDetail?booking_id=${selectedBookingId}`)
                .then(async res => {
                    setBookingDetail(res.data);
                    // Ayrıca booking history'yi çek
                    const historyRes = await axios.get(`/api/getBookingHistory?booking_id=${selectedBookingId}`);
                    setBookingHistory(historyRes.data.history || []);
                    
                    // Set additional information from the booking detail response
                    if (res.data.additional_information) {
                        setAdditionalInformation(res.data.additional_information);
                    } else {
                        setAdditionalInformation(null);
                    }
                })
                .catch(err => {
                    setDetailError('Detaylar alınamadı');
                })
                .finally(() => setLoadingDetail(false));
        } else {
            setBookingDetail(null);
            setBookingHistory([]);
            setAdditionalInformation(null);
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
        const existingCount = Array.isArray(bookingDetail?.passengers) ? bookingDetail.passengers.length : 0;
        // Add each guest (auto-fill names if missing)
        for (let idx = 0; idx < guestForms.length; idx++) {
            const g = guestForms[idx];
            const firstName = (g.firstName || '').trim() || `Guest ${existingCount + idx + 1}`;
            const lastName = (g.lastName || '').trim() || 'Guest';
            try {
                await axios.post('/api/addPassenger', {
                    booking_id: bookingDetail.booking.id,
                    first_name: firstName,
                    last_name: lastName,
                    email: (g.email || '').trim() || null,
                    phone: (g.phone || '').trim() || null,
                    ticket_type: g.ticketType,
                    weight: (g.weight || '').toString().trim() || null
                });
            } catch (err) {
                console.error('Failed to add guest passenger', err);
            }
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
        // Also refresh overall flights state to recalc Pax Booked
        setFlights(prev => prev.map(f => f.id === bookingDetail.booking.id ? { ...f, passengers: updatedPassengers } : f));
        
        // Auto-update flight status based on new passenger count
        const updatedFlight = flights.find(f => f.id === bookingDetail.booking.id);
        if (updatedFlight) {
            await autoUpdateFlightStatus(updatedFlight);
        }
        
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

    // Delete passenger function
    const handleDeletePassenger = async (passengerId) => {
        if (!bookingDetail?.booking?.id || !passengerId) return;
        
        if (!window.confirm('Are you sure you want to delete this passenger?')) {
            return;
        }
        
        try {
            const response = await axios.delete('/api/deletePassenger', {
                data: {
                    passenger_id: passengerId,
                    booking_id: bookingDetail.booking.id
                }
            });
            
            if (response.data.success) {
                // Refetch passengers to update UI
                await fetchBookingDetail(bookingDetail.booking.id);
                
                // Update flights state to reflect the new pax count
                setFlights(prevFlights => prevFlights.map(flight => {
                    if (flight.id === bookingDetail.booking.id) {
                        // Update the pax count for this specific flight
                        return {
                            ...flight,
                            pax: (flight.pax || 0) - 1
                        };
                    }
                    return flight;
                }));
                
                // Also update the grouped flights if they exist
                setFlights(prevFlights => {
                    const updatedFlights = [...prevFlights];
                    // Find and update all flights with the same activity_id, flight_date, and flight_type
                    const targetFlight = updatedFlights.find(f => f.id === bookingDetail.booking.id);
                    if (targetFlight) {
                        const { activity_id, flight_date, flight_type } = targetFlight;
                        updatedFlights.forEach(flight => {
                            if (flight.activity_id === activity_id && 
                                flight.flight_date === flight_date && 
                                flight.flight_type === flight_type) {
                                flight.pax = (flight.pax || 0) - 1;
                            }
                        });
                    }
                    return updatedFlights;
                });
                
                // Show success message
                console.log('Passenger deleted successfully. Updated pax count.');
            }
        } catch (error) {
            console.error('Error deleting passenger:', error);
            alert('Failed to delete passenger. Please try again.');
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
            console.log('Cancel Flight - Cancelling booking:', bookingDetail.booking.id);
            console.log('Cancel Flight - Current status:', bookingDetail.booking.status);
            
            // Debug: Mevcut flight_attempts değerini logla
            console.log('Cancel Flight - Mevcut flight_attempts:', bookingDetail.booking.flight_attempts);
            
            // flight_attempts +1
            const currentAttempts = parseInt(bookingDetail.booking.flight_attempts || 0, 10);
            const newAttempts = (currentAttempts + 1).toString();
            
            console.log('Cancel Flight - Yeni flight_attempts:', newAttempts);
            
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
            
            console.log('Cancel Flight - Database güncellemeleri tamamlandı');
            
            // Local state güncelle
            setBookingDetail(prev => ({
                ...prev,
                booking: {
                    ...prev.booking,
                    status: 'Cancelled',
                    flight_attempts: newAttempts
                }
            }));
            
            // Remove cancelled booking from manifest view (don't just update status)
            setFlights(prev => prev.filter(f => f.id !== bookingDetail.booking.id));
            
            console.log('Cancel Flight - Local state güncellemeleri tamamlandı');
            
            // Auto-update flight status based on new passenger count (cancelled passengers don't count)
            const updatedFlight = flights.find(f => f.id === bookingDetail.booking.id);
            if (updatedFlight) {
                await autoUpdateFlightStatus(updatedFlight);
            }
            
            // Success message
            alert('Flight successfully cancelled! Flight attempts: ' + newAttempts);
        } catch (err) {
            console.error('Cancel Flight Error:', err);
            alert('Cancel operation failed! Error: ' + err.message);
        }
    };

    const handleRebook = () => {
        setRebookModalOpen(true);
    };

    const handleRebookSlotSelect = async (date, time, activityId, selectedActivity, selectedLocation, selectedFlightTypes, selectedVoucherTypes) => {
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
            // First delete the old booking
            await axios.delete(`/api/deleteBooking/${bookingDetail.booking.id}`);
            // Then create the new booking
            const createResponse = await axios.post('/api/createBooking', payload);
            
            // Clear all states
            setRebookModalOpen(false);
            setDetailDialogOpen(false);
            setSelectedBookingId(null);
            setBookingDetail(null);
            setBookingHistory([]);
            
            // Force refresh all data
            if (typeof bookingHook.refetch === 'function') {
                await bookingHook.refetch();
            }
            
            // Also refresh passenger data
            if (typeof pessangerHook.refetch === 'function') {
                await pessangerHook.refetch();
            }
            
            // Refresh availabilities
            await fetchAllAvailabilities();
            
            // Force re-render by updating flights state
            setTimeout(() => {
                if (typeof bookingHook.refetch === 'function') {
                    bookingHook.refetch();
                }
            }, 500);
            
            // Show success message
            alert('Booking successfully rebooked!');
        } catch (err) {
            alert('Rebooking failed!');
        } finally {
            setRebookLoading(false);
        }
    };

    // Booking notes state removed - now handled in Additional Information section

    // Notes handling removed - now handled in Additional Information section

    // Notes handling functions removed - now handled in Additional Information section
    // Notes handling functions removed - now handled in Additional Information section

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
            const isPlaceholder = typeof p.id !== 'number' || (typeof p.id === 'string' && p.id.startsWith('placeholder-'));
            if (isPlaceholder) {
                // Create real passenger row first
                const createResp = await axios.post('/api/addPassenger', {
                    booking_id: bookingDetail.booking.id,
                    first_name: editPassengerFirstName || '',
                    last_name: editPassengerLastName || '',
                    email: bookingDetail.booking.email || null,
                    phone: bookingDetail.booking.phone || null,
                    ticket_type: p.ticket_type || bookingDetail.booking.flight_type,
                    weight: editPassengerWeight || null
                });
                // If price was entered, set it after creation
                if (editPassengerPrice) {
                    const newPassengerId = createResp?.data?.passengerId;
                    if (newPassengerId) {
                        await axios.patch('/api/updatePassengerField', {
                            passenger_id: newPassengerId,
                            field: 'price',
                            value: editPassengerPrice
                        });
                    }
                }
            } else {
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
            }
            await fetchBookingDetail(bookingDetail.booking.id);
            setEditingPassenger(null);
        } catch (e) {
            console.error('Failed to save passenger edit', e);
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

    // Booking modal: Live Availability-like filters and calendar state
    const [bookingSelectedFlightTypes, setBookingSelectedFlightTypes] = useState(['private', 'shared']);
    const [bookingSelectedVoucherTypes, setBookingSelectedVoucherTypes] = useState(['weekday morning', 'flexible weekday', 'any day flight']);
    const [bookingFilteredAvailabilities, setBookingFilteredAvailabilities] = useState([]);
    const [calendarMonth, setCalendarMonth] = useState(dayjs().startOf('month'));

    // Helper to get times for selected date from filtered list
    const getBookingTimesForDate = (dateStr) => {
      return bookingFilteredAvailabilities.filter(a => a.date === dateStr);
    };

    // Build day cells for calendar
    const buildBookingDayCells = () => {
      const cells = [];
      const startOfMonth = calendarMonth.startOf('month');
      const firstCellDate = startOfMonth.startOf('week');
      for (let i = 0; i < 42; i++) {
        const d = firstCellDate.add(i, 'day');
        const inCurrentMonth = d.isSame(calendarMonth, 'month');
        const isPast = d.isBefore(dayjs(), 'day');
        const isSelected = bookingModalDate && dayjs(bookingModalDate).isSame(d, 'day');
        const dateStr = d.format('YYYY-MM-DD');
        const slots = getBookingTimesForDate(dateStr);
        const totalAvailable = slots.reduce((acc, s) => acc + (Number(s.available) || 0), 0);
        const soldOut = slots.length > 0 && totalAvailable <= 0;
        const isSelectable = inCurrentMonth && !isPast && slots.length > 0 && !soldOut;
        cells.push(
          <div
            key={dateStr}
            onClick={() => isSelectable && (setBookingModalDate(dateStr), setBookingModalTimes(getBookingTimesForDate(dateStr)), setBookingModalSelectedTime(null), setBookingModalContactInfos([{ firstName: '', lastName: '', phone: '', email: '', weight: '' }]))}
            style={{
              width: 'calc((100% - 3px * 6) / 7)',
              aspectRatio: '1 / 1',
              borderRadius: 8,
              background: isSelected ? '#56C1FF' : (isSelectable ? '#22c55e' : '#f0f0f0'),
              color: isSelected ? '#fff' : (isSelectable ? '#fff' : '#999'),
              display: inCurrentMonth ? 'flex' : 'none',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              cursor: isSelectable ? 'pointer' : 'default',
              userSelect: 'none',
              fontSize: 12,
              marginBottom: 3
            }}
          >
            <div>{d.date()}</div>
            <div style={{ fontSize: 9, fontWeight: 600 }}>
              {slots.length === 0 ? '' : (soldOut ? 'Sold Out' : `${totalAvailable} Spaces`)}
            </div>
          </div>
        );
      }
      return cells;
    };

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
        // Fetch only open availabilities for this activity
        const availRes = await axios.get(`/api/activity/${activity.id}/rebook-availabilities`);
        const list = (availRes.data.data || []).map(a => ({
          ...a,
          date: dayjs(a.date).format('YYYY-MM-DD')
        }));
        setBookingAvailabilities(list);
        if (list.length > 0) {
          setCalendarMonth(dayjs(list[0].date).startOf('month'));
        }
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

    // Auto-update flight statuses when flights data changes
    useEffect(() => {
        if (flights.length > 0 && activity.length > 0) {
            console.log('Flights or activity changed, checking for auto-status updates');
            // Group flights by normalized location, type, and time
            const flightGroups = {};
            flights.forEach(flight => {
                const loc = normalizeText(flight.location);
                const type = normalizeText(flight.flight_type);
                const time = normalizeTime(flight);
                const key = `${loc}||${type}||${time}`;
                (flightGroups[key] = flightGroups[key] || []).push(flight);
            });
            Object.values(flightGroups).forEach(groupFlights => {
                if (groupFlights.length > 0) {
                    const firstFlight = groupFlights[0];
                    autoUpdateFlightStatus(firstFlight);
                }
            });
        }
    }, [flights, activity]);

    // Auto-update flight statuses when availabilities change
    useEffect(() => {
        if (availabilities.length > 0 && flights.length > 0) {
            console.log('Availabilities changed, checking for auto-status updates');
            // Group flights by normalized location, type, and time
            const flightGroups = {};
            flights.forEach(flight => {
                const loc = normalizeText(flight.location);
                const type = normalizeText(flight.flight_type);
                const time = normalizeTime(flight);
                const key = `${loc}||${type}||${time}`;
                (flightGroups[key] = flightGroups[key] || []).push(flight);
            });
            Object.values(flightGroups).forEach(groupFlights => {
                if (groupFlights.length > 0) {
                    const firstFlight = groupFlights[0];
                    autoUpdateFlightStatus(firstFlight);
                }
            });
        }
    }, [availabilities, flights]);

    useEffect(() => {
      const normalizeType = (t) => t.replace(' Flight', '').trim().toLowerCase();
      const selectedTypes = bookingSelectedFlightTypes.map(normalizeType);
      const filtered = (bookingAvailabilities || []).filter((a) => {
        if (a.status && a.status.toLowerCase() !== 'open') return false;
        if (a.available !== undefined && a.available <= 0) return false;
        const slotDateTime = dayjs(`${a.date} ${a.time}`);
        if (slotDateTime.isBefore(dayjs())) return false;
        if (!a.flight_types || a.flight_types.toLowerCase() === 'all') return true;
        const typesArr = a.flight_types.split(',').map(normalizeType);
        return selectedTypes.some((t) => typesArr.includes(t));
      });
      setBookingFilteredAvailabilities(filtered);
      // Reset selections when data changes
      setBookingModalDate(null);
      setBookingModalTimes([]);
      setBookingModalSelectedTime(null);
    }, [bookingAvailabilities, bookingSelectedFlightTypes, bookingSelectedVoucherTypes]);

    const [crewList, setCrewList] = useState([]);
    const [crewAssignmentsBySlot, setCrewAssignmentsBySlot] = useState({}); // key: `${activityId}_${date}_${time}` => crew_id
    const lastCrewFetchRef = React.useRef({ date: null, inFlight: false });
    const [crewNotification, setCrewNotification] = useState({ show: false, message: '', type: 'success' });

    const slotKey = (activityId, date, time) => `${activityId}_${date}_${time}`;

    const refreshCrewAssignments = async (date) => {
        if (!date) return;
        // Prevent duplicate, rapid calls for the same date
        if (lastCrewFetchRef.current.inFlight && lastCrewFetchRef.current.date === date) return;
        if (lastCrewFetchRef.current.date === date && Object.keys(crewAssignmentsBySlot || {}).length > 0) return;
        try {
            lastCrewFetchRef.current = { date, inFlight: true };
            const res = await axios.get('/api/crew-assignments', { params: { date } });
            if (res.data?.success && Array.isArray(res.data.data)) {
                const map = {};
                for (const row of res.data.data) {
                    const key = slotKey(row.activity_id, dayjs(row.date).format('YYYY-MM-DD'), row.time.substring(0,5));
                    map[key] = row.crew_id;
                }
                setCrewAssignmentsBySlot(map);
            } else {
                setCrewAssignmentsBySlot({});
            }
        } catch (err) {
            console.error('Error refreshing crew assignments:', err);
            setCrewAssignmentsBySlot({});
        } finally {
            lastCrewFetchRef.current.inFlight = false;
        }
    };

    // Helper function to get crew member name by ID
    const getCrewMemberName = (crewId) => {
        if (!crewId || !crewList.length) return 'None';
        const crewMember = crewList.find(c => c.id == crewId);
        return crewMember ? `${crewMember.first_name} ${crewMember.last_name}` : `ID: ${crewId}`;
    };

    // Function to clear crew assignment
    const clearCrewAssignment = async (activityId, flightDateStr) => {
        let date = null; let time = null;
        if (typeof flightDateStr === 'string') {
            const parts = flightDateStr.split(' ');
            date = parts[0];
            time = (parts[1] || '').substring(0,5) + ':00';
        }
        if (!date || !time) return;
        
        try {
            // Set crew_id to null or delete the record
            await axios.post('/api/crew-assignment', { 
                activity_id: activityId, 
                date, 
                time, 
                crew_id: null 
            });
            
            const slotKeyValue = slotKey(activityId, date, time.substring(0,5));
            setCrewAssignmentsBySlot(prev => {
                const updated = { ...prev };
                delete updated[slotKeyValue];
                return updated;
            });
            
            setCrewNotification({
                show: true,
                message: 'Crew assignment cleared successfully!',
                type: 'success'
            });
            setTimeout(() => setCrewNotification({ show: false, message: '', type: 'success' }), 3000);
            
        } catch (e) {
            console.error('Failed to clear crew assignment:', e);
            setCrewNotification({
                show: true,
                message: 'Failed to clear crew assignment: ' + (e.response?.data?.message || e.message),
                type: 'error'
            });
            setTimeout(() => setCrewNotification({ show: false, message: '', type: 'error' }), 3000);
        }
    };

    // Fetch crew list once
    useEffect(() => {
        console.log('Fetching crew list...');
        axios.get('/api/crew').then(res => {
            if (res.data?.success) {
                console.log('Crew list loaded:', res.data.data);
                setCrewList(res.data.data || []);
            }
        }).catch((err) => {
            console.error('Error fetching crew list:', err);
        });
    }, []);

    // Initialize crew assignments on mount and when selectedDate changes
    useEffect(() => {
        if (selectedDate) {
            console.log('Initial crew assignments fetch for date:', selectedDate);
            refreshCrewAssignments(selectedDate);
        }
    }, [selectedDate]); // Run when selectedDate changes

    // Ensure crew assignments are loaded on initial mount
    useEffect(() => {
        if (selectedDate && crewList.length > 0) {
            console.log('Component mounted, loading crew assignments for date:', selectedDate);
            refreshCrewAssignments(selectedDate);
        }
    }, [crewList.length]); // Run when crew list is loaded

    // Force refresh crew assignments on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            if (selectedDate) {
                console.log('Force refreshing crew assignments on mount for date:', selectedDate);
                refreshCrewAssignments(selectedDate);
            }
        }, 1000); // Wait 1 second for everything to load
        
        return () => clearTimeout(timer);
    }, []); // Run once on mount

    // Additional effect to ensure crew assignments are loaded
    useEffect(() => {
        if (selectedDate && crewList.length > 0 && Object.keys(crewAssignmentsBySlot).length === 0) {
            console.log('No crew assignments loaded, fetching for date:', selectedDate);
            refreshCrewAssignments(selectedDate);
        }
    }, [selectedDate, crewList.length, crewAssignmentsBySlot]);

    // Debug effect to log crew assignments changes
    useEffect(() => {
        console.log('Crew assignments changed:', crewAssignmentsBySlot);
    }, [crewAssignmentsBySlot]);



    // Also fetch crew assignments when flights change (in case of data refresh)
    useEffect(() => {
        if (!selectedDate || flights.length === 0) return;
        refreshCrewAssignments(selectedDate);
    }, [selectedDate, flights]);

    const handleCrewChange = async (activityId, flightDateStr, crewId) => {
        // flightDateStr like 'YYYY-MM-DD HH:mm:ss' or 'YYYY-MM-DD 17:00:00'
        let date = null; let time = null;
        if (typeof flightDateStr === 'string') {
            const parts = flightDateStr.split(' ');
            date = parts[0];
            time = (parts[1] || '').substring(0,5) + ':00';
        }
        if (!date || !time) {
            console.error('Invalid flight date string:', flightDateStr);
            return;
        }
        
        console.log('Saving crew assignment:', { activityId, date, time, crewId });
        
        try {
            console.log('Saving crew assignment for:', { activityId, date, time, crewId });
            
            const response = await axios.post('/api/crew-assignment', { 
                activity_id: activityId, 
                date, 
                time, 
                crew_id: crewId 
            });
            console.log('Crew assignment saved:', response.data);
            
            const slotKeyValue = slotKey(activityId, date, time.substring(0,5));
            console.log('Updating local state with key:', slotKeyValue, 'value:', crewId);
            
            // Update local state immediately for instant feedback
            setCrewAssignmentsBySlot(prev => {
                const updated = { ...prev, [slotKeyValue]: crewId };
                console.log('Updated crew assignments:', updated);
                return updated;
            });
            
            // Show success message
            console.log('Crew assignment saved successfully!');
            
            // Show success notification
            const crewName = getCrewMemberName(crewId);
            setCrewNotification({
                show: true,
                message: `Crew member ${crewName} assigned successfully!`,
                type: 'success'
            });
            
            // Hide notification after 3 seconds
            setTimeout(() => setCrewNotification({ show: false, message: '', type: 'success' }), 3000);
            
            // Also refresh from server to ensure consistency
            await refreshCrewAssignments(date);
            
            // Force a re-render to ensure UI updates
            setTimeout(() => {
                setCrewAssignmentsBySlot(prev => ({ ...prev }));
            }, 100);
        } catch (e) {
            console.error('Failed to save crew selection:', e);
            setCrewNotification({
                show: true,
                message: 'Failed to save crew selection: ' + (e.response?.data?.message || e.message),
                type: 'error'
            });
            setTimeout(() => setCrewNotification({ show: false, message: '', type: 'error' }), 5000);
        }
    };

    return (
        <div className="final-menifest-wrap">
            <Container maxWidth={false}>
                <div className="heading-wrap">
                    <h2>MANIFEST PAGE</h2>
                    <hr />
                </div>
                <Box sx={{ padding: 2 }}>
                    {/* Header Section */}
                    <Box sx={{ marginBottom: 3 }}>
                        {/* Crew assignment notification */}
                        {crewNotification.show && (
                            <Box sx={{ 
                                mb: 2, 
                                p: 2, 
                                bgcolor: crewNotification.type === 'success' ? '#f0fdf4' : '#fef2f2',
                                color: crewNotification.type === 'success' ? '#166534' : '#dc2626',
                                borderRadius: 1, 
                                border: `1px solid ${crewNotification.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span>{crewNotification.message}</span>
                                <IconButton 
                                    size="small" 
                                    onClick={() => setCrewNotification({ show: false, message: '', type: 'success' })}
                                >
                                    ×
                                </IconButton>
                            </Box>
                        )}
                        
                        {/* Debug info for crew assignments - removed for production */}
                        {/* Intentionally hidden */}
                        <Box display="flex" alignItems="center" gap={2}>
                            <IconButton onClick={() => {
                                const newDate = dayjs(selectedDate).subtract(1, 'day').format('YYYY-MM-DD');
                                console.log('Date navigation: going back to', newDate);
                                setSelectedDate(newDate);
                                setCrewAssignmentsBySlot({});
                                
                                // Fetch crew assignments for the new date
                                axios.get('/api/crew-assignments', { params: { date: newDate } })
                                    .then(res => {
                                        if (res.data?.success && Array.isArray(res.data.data)) {
                                            const map = {};
                                            for (const row of res.data.data) {
                                                const key = slotKey(row.activity_id, dayjs(row.date).format('YYYY-MM-DD'), row.time.substring(0,5));
                                                map[key] = row.crew_id;
                                            }
                                            setCrewAssignmentsBySlot(map);
                                        }
                                    })
                                    .catch((err) => {
                                        console.error('Error fetching crew assignments for previous date:', err);
                                    });
                            }}>
                                <ArrowBackIosNewIcon />
                            </IconButton>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    label="Select Date"
                                    value={dayjs(selectedDate)}
                                    onChange={date => {
                                        const newDate = date ? date.format('YYYY-MM-DD') : selectedDate;
                                        console.log('Date picker changed to:', newDate);
                                        setSelectedDate(newDate);
                                        setCrewAssignmentsBySlot({});
                                        
                                        // Fetch crew assignments for the new date
                                        if (newDate) {
                                            axios.get('/api/crew-assignments', { params: { date: newDate } })
                                                .then(res => {
                                                    if (res.data?.success && Array.isArray(res.data.data)) {
                                                        const map = {};
                                                        for (const row of res.data.data) {
                                                            const key = slotKey(row.activity_id, dayjs(row.date).format('YYYY-MM-DD'), row.time.substring(0,5));
                                                            map[key] = row.crew_id;
                                                        }
                                                        setCrewAssignmentsBySlot(map);
                                                    }
                                                })
                                                .catch((err) => {
                                                    console.error('Error fetching crew assignments for picked date:', err);
                                                });
                                        }
                                    }}
                                    format="DD.MM.YYYY"
                                    views={["year", "month", "day"]}
                                    slotProps={{ textField: { size: 'small', sx: { minWidth: 180, background: '#fff', borderRadius: 1 } } }}
                                    componentsProps={{
                                        // Hide default calendar arrows
                                        popper: { style: { zIndex: 1300 } },
                                    }}
                                />
                            </LocalizationProvider>
                            <IconButton onClick={() => {
                                const newDate = dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DD');
                                console.log('Date navigation: going forward to', newDate);
                                setSelectedDate(newDate);
                                setCrewAssignmentsBySlot({});
                                
                                // Fetch crew assignments for the new date
                                axios.get('/api/crew-assignments', { params: { date: newDate } })
                                    .then(res => {
                                        if (res.data?.success && Array.isArray(res.data.data)) {
                                            const map = {};
                                            for (const row of res.data.data) {
                                                const key = slotKey(row.activity_id, dayjs(row.date).format('YYYY-MM-DD'), row.time.substring(0,5));
                                                map[key] = row.crew_id;
                                            }
                                            setCrewAssignmentsBySlot(map);
                                        }
                                    })
                                    .catch((err) => {
                                        console.error('Error fetching crew assignments for next date:', err);
                                    });
                            }}>
                                <ArrowForwardIosIcon />
                            </IconButton>
                        </Box>
                    </Box>

                    {bookingLoading || passengerLoading || activityLoading ? (
                        <Typography>Loading...</Typography>
                    ) : error ? (
                        <Typography color="error">{error}</Typography>
                    ) : filteredFlights.length > 0 ? (
                        Object.entries(groupedFlights)
                          .sort((a, b) => {
                            // groupKey format: "location||flight_type||HH:MM"
                            const timeA = (a[0]?.split('||')[2] || '').padStart(5, '0');
                            const timeB = (b[0]?.split('||')[2] || '').padStart(5, '0');
                            // If times are missing, push them to the end
                            if (!timeA && !timeB) return 0;
                            if (!timeA) return 1;
                            if (!timeB) return -1;
                            return timeA.localeCompare(timeB);
                          })
                          .map(([groupKey, groupFlights]) => {
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
                                
                                // Determine target activity id from location using prebuilt map
                                const targetActivityId = (nameToActivityId && first.location) ? (nameToActivityId[first.location] ?? first.activity_id) : first.activity_id;
                                
                                // Debug logging to understand the matching issue
                                console.log('Trying to match availability:', {
                                    flightDate: dateStr,
                                    flightTime: timeStr,
                                    flightActivityId: first.activity_id,
                                    targetActivityId,
                                    flightLocation: first.location,
                                    availabilitiesCount: availabilities.length,
                                    availabilities: availabilities.filter(a => (a.location === first.location) || (targetActivityId && a.activity_id == targetActivityId)),
                                    allAvailabilities: availabilities
                                });
                                
                                found = availabilities.find(a => {
                                    const aDate = a.date && a.date.length >= 10 ? a.date.substring(0,10) : null;
                                    const aTime = a.time ? a.time.slice(0,5) : null;
                                    const dateMatch = aDate === dateStr;
                                    const timeMatch = aTime === timeStr;
                                    
                                    // Match by (activity_id OR location), date, and time
                                    const locationMatch = a.location === first.location;
                                    const activityIdMatch = targetActivityId ? (a.activity_id == targetActivityId) : false;
                                    
                                    if ((locationMatch || activityIdMatch) && dateMatch && timeMatch) {
                                        console.log('Found exact availability match:', a);
                                        return true;
                                    }
                                    
                                    // Debug: log what we're comparing
                                    console.log('Comparing:', {
                                        availability: { activity_id: a.activity_id, location: a.location, date: aDate, time: aTime },
                                        flight: { activity_id: first.activity_id, targetActivityId, location: first.location, date: dateStr, time: timeStr },
                                        matches: { location: locationMatch, activityId: activityIdMatch, date: dateMatch, time: timeMatch }
                                    });
                                    
                                    return false;
                                });
                                
                                if (!found) {
                                    console.log('No availability found for:', {
                                        dateStr,
                                        timeStr,
                                        activityId: first.activity_id,
                                        location: first.location
                                    });
                                }
                            }
                            // GÜNCELLEME: Pax Booked kesin olarak capacity - available / capacity olacak
                            let paxBooked = 0;
                            let paxTotal = 0;
                            if (found) {
                                paxBooked = found.capacity - found.available;
                                paxTotal = found.capacity;
                                console.log('Using availability data for Pax Booked:', { paxBooked, paxTotal, found });
                            } else {
                                // Fallback: try to get capacity from activity data or directly from availability endpoint
                                console.log('No availability found, trying fallback with activity data:', {
                                    activityLength: activity.length,
                                    firstActivityId: first.activity_id,
                                    firstLocation: first.location,
                                    activityData: activity
                                });
                                
                                const activityData = activity.find(a => a.location === first.location);
                                console.log('Found activity data:', activityData);
                                
                                if (activityData && activityData.capacity) {
                                    paxTotal = activityData.capacity;
                                    // Calculate booked passengers from the current group
                                    paxBooked = groupFlights.reduce((total, flight) => {
                                        return total + (flight.passengers ? flight.passengers.length : 0);
                                    }, 0);
                                    console.log('Using fallback calculation:', { paxBooked, paxTotal, groupFlightsLength: groupFlights.length });
                                } else {
                                    // Last resort: set to default since we can't make async calls here
                                    console.log('No activity data found, setting to default');
                                    paxBooked = '-';
                                    paxTotal = '-';
                                }
                            }
                            
                            console.log('Final Pax Booked values:', { paxBooked, paxTotal });
                            // DISPLAY LOGIC UPDATE: Compare availability count vs actual passenger count and use the larger to include newly added guests immediately
                            const passengerCountDisplay = groupFlights.reduce((sum, f) => sum + (f.passengers ? f.passengers.length : 0), 0);
                            const availabilityCountDisplay = (found && typeof found.capacity === 'number' && typeof found.available === 'number')
                                ? (found.capacity - found.available)
                                : passengerCountDisplay;
                            const paxBookedDisplay = Math.max(availabilityCountDisplay, passengerCountDisplay);
                            // Prefer capacity directly from matched availability; otherwise try to re-match using map
                            let paxTotalDisplay = '-';
                            if (found && typeof found.capacity === 'number') {
                                paxTotalDisplay = found.capacity;
                            } else {
                                const dateStr = first.flight_date ? first.flight_date.substring(0,10) : null;
                                let timeStr = null;
                                if (first.time_slot) timeStr = first.time_slot.slice(0,5);
                                else if (first.flight_date && first.flight_date.length >= 16) timeStr = first.flight_date.substring(11,16);
                                else timeStr = '09:00';

                                const aid = locationToActivityId[first.location] || first.activity_id;
                                const reFound = availabilities.find(a => {
                                    const aDate = a.date && a.date.length >= 10 ? a.date.substring(0,10) : null;
                                    const aTime = a.time ? a.time.slice(0,5) : null;
                                    const idMatch = aid ? (a.activity_id == aid) : false;
                                    return (a.location === first.location || idMatch) && aDate === dateStr && aTime === timeStr;
                                });
                                if (reFound && typeof reFound.capacity === 'number') {
                                    paxTotalDisplay = reFound.capacity;
                                }
                            }
                            
                            // STATUS LOGIC: If Pax Booked equals capacity, status should be Closed
                            let status;
                            
                            // Simple logic: if pax booked equals capacity, then closed
                            if (paxBookedDisplay === paxTotalDisplay && paxTotalDisplay !== '-') {
                                status = "Closed";
                            } else {
                                // Fallback to availability data or getFlightStatus
                                if (found) {
                                    status = found.available === 0 ? "Closed" : "Open";
                                } else {
                                    status = getFlightStatus(first);
                                }
                            }
                            
                            // Compute total weight using passengers if present, otherwise fallback to booking weight
                            const totalWeightDisplay = groupFlights.reduce((sum, f) => {
                                const passengerWeight = Array.isArray(f.passengers) && f.passengers.length > 0
                                    ? f.passengers.reduce((s, p) => s + (parseFloat(p.weight) || 0), 0)
                                    : (parseFloat(f.weight) || 0);
                                return sum + passengerWeight;
                            }, 0);
                            
                            // Auto-update status to Closed if Pax Booked equals capacity
                            if (status === "Closed" && paxBookedDisplay === paxTotalDisplay && paxTotalDisplay !== '-') {
                                // Check if we need to update the database
                                const currentFlightStatus = getFlightStatus(first);
                                if (currentFlightStatus === "Open") {
                                    console.log(`Auto-updating flight ${first.id} status to Closed (${paxBookedDisplay}/${paxTotalDisplay})`);
                                    
                                    // Update the flight status to Closed in the database
                                    axios.patch("/api/updateManifestStatus", {
                                        booking_id: first.id,
                                        old_status: "Open",
                                        new_status: "Closed",
                                        flight_date: first.flight_date,
                                        location: first.location,
                                        total_pax: paxBookedDisplay
                                    }).then(() => {
                                        console.log(`Flight ${first.id} status updated to Closed in database`);
                                        // Update local state
                                        setFlights(prevFlights => prevFlights.map(f =>
                                            f.flight_date === first.flight_date && 
                                            f.location === first.location && 
                                            f.flight_type === first.flight_type &&
                                            f.time_slot === first.time_slot
                                                ? { ...f, manual_status_override: 0 } // 0 = Closed
                                                : f
                                        ));
                                    }).catch(error => {
                                        console.error(`Error updating flight ${first.id} status:`, error);
                                    });
                                }
                            }
                            
                            // Debug logging for status calculation
                            console.log('Status calculation:', {
                                paxBookedDisplay,
                                paxTotalDisplay,
                                calculatedStatus: status,
                                flightId: first.id,
                                location: first.location,
                                flightType: first.flight_type
                            });
                             
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
                                                    <Typography>Pax Booked: {paxBookedDisplay} / {paxTotalDisplay}</Typography>
                                                    <Typography>Balloon Resource: {balloonResource}</Typography>
                                                    <Typography>Status: <span
   style={{ color: status === 'Closed' ? 'red' : 'green', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
   onClick={() => handleToggleGroupStatus(groupFlights)}
 >{status}{statusLoadingGroup === first.id ? '...' : ''}</span></Typography>
                                                    <Typography>Type: {first.flight_type}</Typography>
                                                </Box>
                                            </Box>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                {/* Sold Out Badge - Show when flight is fully booked */}
                                                {paxBookedDisplay === paxTotalDisplay && (
                                                    <Box sx={{
                                                        backgroundColor: '#dc2626',
                                                        color: 'white',
                                                        px: 2,
                                                        py: 1,
                                                        borderRadius: 2,
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px',
                                                        boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
                                                        border: '1px solid #b91c1c'
                                                    }}>
                                                        Sold Out
                                                    </Box>
                                                )}
                                                
                                                {/* Crew Selection Dropdown */}
                        {(() => {
                            const slotKeyValue = slotKey(first.activity_id, (first.flight_date||'').substring(0,10), (first.flight_date||'').substring(11,16));
                            const currentCrewId = crewAssignmentsBySlot[slotKeyValue];
                            
                            // Debug logging
                            if (process.env.NODE_ENV === 'development') {
                                console.log('Dropdown for flight:', first.id, 'slotKey:', slotKeyValue, 'currentCrewId:', currentCrewId, 'all assignments:', crewAssignmentsBySlot);
                                console.log('Flight data:', { 
                                    id: first.id, 
                                    activity_id: first.activity_id, 
                                    flight_date: first.flight_date,
                                    date_part: (first.flight_date||'').substring(0,10),
                                    time_part: (first.flight_date||'').substring(11,16)
                                });
                            }
                            
                            return (
                                <>
                                    <Select
                                        native
                                        value={currentCrewId || ''}
                                        onChange={(e) => handleCrewChange(first.activity_id, first.flight_date, e.target.value)}
                                        sx={{ minWidth: 200, mr: 1, background: '#fff' }}
                                    >
                                        <option value="">Crew Selection</option>
                                        {crewList.map(c => (
                                            <option key={c.id} value={c.id}>{`${c.first_name} ${c.last_name}`}</option>
                                        ))}
                                    </Select>
                                    
                                    {/* Crew Assignment Status Display */}
                                    <Box sx={{ 
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        ml: 1,
                                        minWidth: 150
                                    }}>
                                        <Box sx={{ 
                                            fontSize: '12px', 
                                            fontWeight: '500',
                                            color: currentCrewId ? '#10b981' : '#6b7280',
                                            mb: 0.5
                                        }}>
                                            {currentCrewId ? '✓ Assigned' : '○ Not Assigned'}
                                        </Box>
                                        <Box sx={{ 
                                            fontSize: '11px', 
                                            color: '#6b7280',
                                            fontStyle: currentCrewId ? 'normal' : 'italic'
                                        }}>
                                            {currentCrewId ? getCrewMemberName(currentCrewId) : 'No crew selected'}
                                        </Box>
                                    </Box>
                                    
                                    {/* Show selected crew member name */}
                                    {currentCrewId && (
                                        <Box sx={{ 
                                            fontSize: '12px', 
                                            color: '#10b981', 
                                            fontWeight: '500',
                                            ml: 1,
                                            p: 0.5,
                                            bgcolor: '#f0fdf4',
                                            borderRadius: 1,
                                            border: '1px solid #bbf7d0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1
                                        }}>
                                            <span>Crew: {getCrewMemberName(currentCrewId)}</span>
                                            <IconButton 
                                                size="small" 
                                                onClick={() => clearCrewAssignment(first.activity_id, first.flight_date)}
                                                sx={{ p: 0, minWidth: 'auto', color: '#dc2626' }}
                                                title="Clear crew assignment"
                                            >
                                                ×
                                            </IconButton>
                                        </Box>
                                    )}
                                    
                                    {/* Crew info line removed for production */}
                                </>
                            );
                        })()}
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
                                                                  <MenuItem onClick={() => handleGlobalMenuAction('bookCustomerOntoFlight')}>Book Customer onto Flight</MenuItem>
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
                                                        <TableCell>WX Ins</TableCell>
                                                        <TableCell>Add On's</TableCell>
                                                        <TableCell>Notes</TableCell>
                                                        <TableCell>Status</TableCell>
                                                        <TableCell>Actions</TableCell>
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
                                                                    <span style={{ 
                                                                        color: 'rgb(50, 116, 180)', 
                                                                        cursor: 'pointer', 
                                                                        textDecoration: 'underline',
                                                                        fontSize: '14px'
                                                                    }}
                                                                        onClick={() => handleNameClick(flight.id)}>
                                                                        {firstPassenger ? `${firstPassenger.first_name || ''} ${firstPassenger.last_name || ''}`.trim() : (flight.name || '')}
                                                                    </span>
                                                                    {Array.isArray(flight.passengers) && flight.passengers.length > 1 && (
                                                                        <div style={{ marginTop: 4 }}>
                                                                            {flight.passengers.slice(1).map((p, i) => (
                                                                                <div key={`${flight.id}-p-${i+1}`} style={{ 
                                                                                    color: 'rgb(50, 116, 180)', 
                                                                                    fontSize: '14px',
                                                                                    marginTop: '2px'
                                                                                }}>
                                                                                    {`${p.first_name || ''} ${p.last_name || ''}`.trim()}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {Array.isArray(flight.passengers) && flight.passengers.length > 0 ? (
                                                                        <div>
                                                                            {flight.passengers.map((p, i) => (
                                                                                <div key={`${flight.id}-weight-${i}`} style={{ 
                                                                                    fontSize: '14px',
                                                                                    marginBottom: i < flight.passengers.length - 1 ? '2px' : '0'
                                                                                }}>
                                                                                    {p.weight ? `${p.weight}kg` : ''}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        firstPassenger ? firstPassenger.weight : ''
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>{flight.phone || ''}</TableCell>
                                                                <TableCell>{flight.email || ''}</TableCell>
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
                                                                        <MenuItem value="Scheduled">🕓 Scheduled</MenuItem>
                                                                        <MenuItem value="Checked In">✅ Checked In</MenuItem>
                                                                        <MenuItem value="Flown">🎈 Flown</MenuItem>
                                                                        <MenuItem value="No Show">❌ No Show</MenuItem>
                                                                    </Select>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                                                        <button
                                                                            onClick={() => handleEmailClick(flight)}
                                                                            style={{
                                                                                padding: "4px 8px",
                                                                                backgroundColor: "#28a745",
                                                                                color: "white",
                                                                                border: "none",
                                                                                borderRadius: "4px",
                                                                                cursor: "pointer",
                                                                                fontSize: "12px",
                                                                                fontWeight: "500"
                                                                            }}
                                                                            title="Send Email"
                                                                        >
                                                                            📧 Email
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleSmsClick(flight)}
                                                                            style={{
                                                                                padding: "4px 8px",
                                                                                backgroundColor: "#17a2b8",
                                                                                color: "white",
                                                                                border: "none",
                                                                                borderRadius: "4px",
                                                                                cursor: "pointer",
                                                                                fontSize: "12px",
                                                                                fontWeight: "500"
                                                                            }}
                                                                            title="Send SMS"
                                                                        >
                                                                            📱 SMS
                                                                        </button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                    {/* Move the summary row here, inside TableBody */}
                                                    <TableRow>
                                                        <TableCell colSpan={11} style={{ textAlign: 'right', fontWeight: 600, background: '#f5f5f5' }}>
                                                                                                            Total Price: £{groupFlights.reduce((sum, f) => sum + (parseFloat(f.paid) || 0), 0)} &nbsp;&nbsp;|
                                                Total Weight: {totalWeightDisplay} kg &nbsp;&nbsp;|
                                                Total Pax: {passengerCountDisplay}
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
                                        <Typography><b>Flight Attempts:</b> {bookingDetail.booking.flight_attempts || '-'}</Typography>
                                        <Typography><b>Voucher Type:</b> {bookingDetail.booking.voucher_type || '-'}</Typography>
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
                                    {/* Additional section removed - information is now displayed in Additional Information section */}
                                    {/* Add On */}
                                    <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Add On's</Typography>
                                        
                                        {/* Display actual add-ons from choose_add_on field */}
                                        {(() => {
                                            const addOns = bookingDetail.booking?.choose_add_on;
                                            if (addOns) {
                                                let parsedAddOns = [];
                                                if (typeof addOns === 'string') {
                                                    try {
                                                        parsedAddOns = JSON.parse(addOns);
                                                    } catch (e) {
                                                        // If it's not JSON, treat as comma-separated string
                                                        parsedAddOns = addOns.split(',').map(item => item.trim()).filter(Boolean);
                                                    }
                                                } else if (Array.isArray(addOns)) {
                                                    parsedAddOns = addOns;
                                                }
                                                
                                                if (parsedAddOns.length > 0) {
                                                    return parsedAddOns.map((addOn, index) => {
                                                        const addOnName = typeof addOn === 'object' ? addOn.name : addOn;
                                                        return (
                                                            <Typography key={index} sx={{ mb: 1 }}>
                                                                <b>{addOnName}:</b>{' '}
                                                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                                                                    <span style={{ color: '#10b981', fontWeight: 'bold', marginRight: '4px' }}>✔</span>
                                                                    Yes
                                                                </span>
                                                            </Typography>
                                                        );
                                                    });
                                                }
                                            }
                                            return null;
                                        })()}
                                        
                                        <Typography>
                                            <b>WX Refundable:</b>{' '}
                                            {bookingDetail.passengers && bookingDetail.passengers.some(p => p.weather_refund === 1) ? (
                                                <span>
                                                    <span style={{ color: '#10b981', fontWeight: 'bold', marginRight: '4px' }}>✔</span>
                                                    Yes
                                                </span>
                                            ) : 'No'}
                                        </Typography>

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
                                                            href={`https://flyawayballooning-system.com/manifest?date=${dayjs(bookingDetail.booking.flight_date).format('YYYY-MM-DD')}&time=${dayjs(bookingDetail.booking.flight_date).format('HH:mm')}`}
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
                                                                      {i > 0 && ( // Only show delete button for additional passengers (not the first one)
                                                                          <IconButton 
                                                                              size="small" 
                                                                              onClick={() => handleDeletePassenger(p.id)}
                                                                              sx={{ color: 'red' }}
                                                                          >
                                                                              <DeleteIcon fontSize="small" />
                                                                          </IconButton>
                                                                      )}
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
                                        {/* Additional Information Section */}
                                        {additionalInformation && (
                                            <Box>
                                                                                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Additional Information & Notes</Typography>
                                                {additionalInfoLoading ? (
                                                    <Typography>Loading additional information...</Typography>
                                                ) : (
                                                                                                            <Box>
                                                            {/* Booking Notes - Always show if available */}
                                                            {bookingDetail.booking?.additional_notes && (
                                                                <Box sx={{ mb: 2, p: 2, background: '#e3f2fd', borderRadius: 1, border: '1px solid #2196f3' }}>
                                                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1976d2' }}>Booking Notes:</Typography>
                                                                    <Typography>{bookingDetail.booking.additional_notes}</Typography>
                                                                </Box>
                                                            )}
                                                            
                                                            {/* Show all available questions with their answers (or "Not answered") - Only this section */}
                                                            {additionalInformation.questions && additionalInformation.questions.length > 0 && (
                                                                <>
                                                                    {additionalInformation.questions.map((question, index) => {
                                                                        // Find answer from multiple sources to avoid duplication
                                                                        let answer = null;
                                                                        
                                                                        // First try to find in answers array
                                                                        const answerFromAnswers = additionalInformation.answers?.find(a => a.question_id === question.id);
                                                                        if (answerFromAnswers) {
                                                                            answer = answerFromAnswers.answer;
                                                                        }
                                                                        
                                                                        // If not found in answers, try JSON data
                                                                        if (!answer && additionalInformation.additional_information_json) {
                                                                            const jsonKey = `question_${question.id}`;
                                                                            if (additionalInformation.additional_information_json[jsonKey]) {
                                                                                answer = additionalInformation.additional_information_json[jsonKey];
                                                                            }
                                                                        }
                                                                        
                                                                        // If still not found, try legacy fields for specific questions
                                                                        if (!answer && additionalInformation.legacy) {
                                                                            if (question.question_text.toLowerCase().includes('hear about us') && additionalInformation.legacy.hear_about_us) {
                                                                                answer = additionalInformation.legacy.hear_about_us;
                                                                            } else if (question.question_text.toLowerCase().includes('ballooning') && additionalInformation.legacy.ballooning_reason) {
                                                                                answer = additionalInformation.legacy.ballooning_reason;
                                                                            }
                                                                        }
                                                                        
                                                                        return (
                                                                            <Box key={index} sx={{ mb: 2, p: 2, background: '#f0f8ff', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                                                                                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1976d2' }}>
                                                                                    {question.question_text}:
                                                                                </Typography>
                                                                                <Typography sx={{ color: answer ? '#333' : '#999', fontStyle: answer ? 'normal' : 'italic' }}>
                                                                                    {answer ? answer : 'Not answered'}
                                                                                </Typography>
                                                                                {question.help_text && (
                                                                                    <Typography variant="caption" sx={{ color: '#666', mt: 1, display: 'block' }}>
                                                                                        {question.help_text}
                                                                                    </Typography>
                                                                                )}

                                                                            </Box>
                                                                        );
                                                                    })}
                                                                </>
                                                            )}
                                                            
                                                            {/* Show message if no questions available */}
                                                            {(!additionalInformation.questions || additionalInformation.questions.length === 0) && (
                                                                <Typography sx={{ fontStyle: 'italic', color: '#666' }}>No additional information questions available</Typography>
                                                            )}
                                                    </Box>
                                                )}
                                            </Box>
                                        )}
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
                                                        <TableCell>{bookingDetail.booking.flight_date ? dayjs(bookingDetail.booking.flight_date).format('DD/MM/YYYY') : '-'}</TableCell>
                                                        <TableCell>{bookingDetail.booking.flight_type || '-'}</TableCell>
                                                        <TableCell>{bookingDetail.booking.location || '-'}</TableCell>
                                                        <TableCell>Scheduled</TableCell>
                                                    </TableRow>
                                                    {bookingHistory.map((h, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell>{h.changed_at ? dayjs(h.changed_at).format('DD/MM/YYYY HH:mm') : '-'}</TableCell>
                                                            <TableCell>{bookingDetail.booking.flight_type || '-'}</TableCell>
                                                            <TableCell>{bookingDetail.booking.location || '-'}</TableCell>
                                                            <TableCell>{getStatusWithEmoji(h.status)}</TableCell>
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
                bookingDetail={bookingDetail}
            />
            {/* Booking Modal */}
            <Dialog open={bookingModalOpen} onClose={() => setBookingModalOpen(false)} maxWidth="sm" fullWidth>
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

                        {/* Flight Type and Voucher Type filters */}
                        <Box sx={{ mb: 2 }}>
                          <Typography sx={{ fontWeight: 700, mb: 1 }}>Flight Type:</Typography>
                          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                            <Button variant={bookingSelectedFlightTypes.includes('private') ? 'contained' : 'outlined'} onClick={() => setBookingSelectedFlightTypes(prev => prev.includes('private') ? prev.filter(t => t !== 'private') : [...prev, 'private'])}>Private</Button>
                            <Button variant={bookingSelectedFlightTypes.includes('shared') ? 'contained' : 'outlined'} onClick={() => setBookingSelectedFlightTypes(prev => prev.includes('shared') ? prev.filter(t => t !== 'shared') : [...prev, 'shared'])}>Shared</Button>
                          </Box>
                          <Typography sx={{ fontWeight: 700, mb: 1 }}>Voucher Type:</Typography>
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button variant={bookingSelectedVoucherTypes.includes('weekday morning') ? 'contained' : 'outlined'} onClick={() => setBookingSelectedVoucherTypes(prev => prev.includes('weekday morning') ? prev.filter(t => t !== 'weekday morning') : [...prev, 'weekday morning'])}>Weekday Morning</Button>
                            <Button variant={bookingSelectedVoucherTypes.includes('flexible weekday') ? 'contained' : 'outlined'} onClick={() => setBookingSelectedVoucherTypes(prev => prev.includes('flexible weekday') ? prev.filter(t => t !== 'flexible weekday') : [...prev, 'flexible weekday'])}>Flexible Weekday</Button>
                            <Button variant={bookingSelectedVoucherTypes.includes('any day flight') ? 'contained' : 'outlined'} onClick={() => setBookingSelectedVoucherTypes(prev => prev.includes('any day flight') ? prev.filter(t => t !== 'any day flight') : [...prev, 'any day flight'])}>Any Day Flight</Button>
                          </Box>
                        </Box>

                        {/* Live Availability style calendar grid */}
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Button size="small" onClick={() => setCalendarMonth(prev => prev.subtract(1, 'month'))}>{'<'}</Button>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>{calendarMonth.format('MMMM YYYY')}</Typography>
                            <Button size="small" onClick={() => setCalendarMonth(prev => prev.add(1, 'month'))}>{'>'}</Button>
                          </Box>
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', mb: 1 }}>
                            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(w => (
                              <div key={w} style={{ textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: 11 }}>{w}</div>
                            ))}
                          </Box>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {buildBookingDayCells()}
                          </div>
                        </Box>

                        {/* Time slots for selected date */}
                        {bookingModalDate && (
                          <Box>
                            <Typography variant="h6">Times for {dayjs(bookingModalDate).format('DD/MM/YYYY')}</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                              {getBookingTimesForDate(bookingModalDate).map(slot => (
                                <Button
                                  key={slot.id}
                                  variant={bookingModalSelectedTime && bookingModalSelectedTime.id === slot.id ? 'contained' : 'outlined'}
                                  sx={{ minWidth: 120, mb: 1 }}
                                  onClick={() => setBookingModalSelectedTime(slot)}
                                >
                                  {slot.time} ({slot.available}/{slot.capacity})
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
            {/* Confirm Cancel All Guests Dialog */}
            <Dialog open={confirmCancelOpen} onClose={handleConfirmCancelClose} maxWidth="xs" fullWidth>
              <DialogTitle>Confirm Cancellation</DialogTitle>
              <DialogContent>
                <Typography sx={{ mt: 1 }}>
                  Are you sure you want to cancel all guests on this flight?
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleConfirmCancelClose} disabled={confirmCancelLoading}>No</Button>
                <Button color="error" variant="contained" onClick={handleConfirmCancelAll} disabled={confirmCancelLoading}>
                  {confirmCancelLoading ? 'Cancelling...' : 'Yes, Cancel All'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Email Modal */}
            <Dialog 
                open={emailModalOpen} 
                onClose={() => setEmailModalOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Send Email to Customer
                    {selectedBookingForEmail && (
                        <Typography variant="subtitle2" color="textSecondary">
                            Booking: {selectedBookingForEmail.name} ({selectedBookingForEmail.id})
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="To"
                                value={emailForm.to}
                                onChange={(e) => setEmailForm(prev => ({ ...prev, to: e.target.value }))}
                                margin="normal"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Subject"
                                value={emailForm.subject}
                                onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                                margin="normal"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Message"
                                multiline
                                rows={4}
                                value={emailForm.message}
                                onChange={(e) => setEmailForm(prev => ({ ...prev, message: e.target.value }))}
                                margin="normal"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Email History</Typography>
                            {emailLogs.length === 0 ? (
                                <Typography variant="body2">No emails sent yet.</Typography>
                            ) : (
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Date</TableCell>
                                            <TableCell>To</TableCell>
                                            <TableCell>Subject</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {emailLogs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell>{(() => { try { return dayjs(log.sent_at).format('DD/MM/YYYY HH:mm'); } catch { return String(log.sent_at || ''); } })()}</TableCell>
                                                <TableCell>{log.to_email}</TableCell>
                                                <TableCell>{log.subject}</TableCell>
                                                <TableCell>{log.status}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEmailModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSendEmail}
                        variant="contained"
                        disabled={sendingEmail || !emailForm.to || !emailForm.subject || !emailForm.message}
                    >
                        {sendingEmail ? 'Sending...' : 'Send Email'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* SMS Modal */}
            <Dialog open={smsModalOpen} onClose={() => setSmsModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Send SMS to Customer
                    {selectedBookingForEmail && (
                        <Typography variant="subtitle2" color="textSecondary">
                            Booking: {selectedBookingForEmail.name} ({selectedBookingForEmail.id})
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="To"
                                value={smsForm.to}
                                onChange={(e) => setSmsForm(prev => ({ ...prev, to: e.target.value }))}
                                margin="normal"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Message"
                                multiline
                                rows={4}
                                value={smsForm.message}
                                onChange={(e) => setSmsForm(prev => ({ ...prev, message: e.target.value }))}
                                margin="normal"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>SMS History</Typography>
                            {smsLogs.length === 0 ? (
                                <Typography variant="body2">No SMS sent yet.</Typography>
                            ) : (
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Date</TableCell>
                                            <TableCell>To</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {smsLogs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell>{(() => { try { return dayjs(log.sent_at).format('DD/MM/YYYY HH:mm'); } catch { return String(log.sent_at || ''); } })()}</TableCell>
                                                <TableCell>{log.to_number}</TableCell>
                                                <TableCell>{log.status}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSmsModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleSendSms} variant="contained" disabled={smsSending || !smsForm.to || !smsForm.message}>
                        {smsSending ? 'Sending...' : 'Send SMS'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default Manifest;