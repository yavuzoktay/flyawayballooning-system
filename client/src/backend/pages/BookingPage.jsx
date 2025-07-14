import axios from "axios";
import React, { useEffect, useState } from "react";
import PaginatedTable from "../components/BookingPage/PaginatedTable";
import { Container, FormControl, InputLabel, MenuItem, OutlinedInput, Select, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Grid, Typography, Box, Divider, IconButton, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import dayjs from 'dayjs';
import EditIcon from '@mui/icons-material/Edit';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import RebookAvailabilityModal from '../components/BookingPage/RebookAvailabilityModal';

const BookingPage = () => {
    const [activeTab, setActiveTab] = useState("bookings");
    const [booking, setBooking] = useState([]);
    const [dateRequested, setDateRequested] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [voucher, setVoucher] = useState([]);

    // Filters
    const [filters, setFilters] = useState({
        search: "",
        flightType: "",
        status: "",
        location: "",
        voucherType: "",
        redeemedStatus: "",
    });

    const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
    const [voucherForm, setVoucherForm] = useState({
        name: '',
        flight_type: '',
        voucher_type: '',
        email: '',
        phone: '',
        expires: '',
        redeemed: 'No',
        paid: '',
        offer_code: '',
        voucher_ref: ''
    });

    // Popup için state
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState(null);
    const [bookingDetail, setBookingDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [detailError, setDetailError] = useState(null);
    const [bookingHistory, setBookingHistory] = useState([]);

    // Add Guest dialog state
    const [addGuestDialogOpen, setAddGuestDialogOpen] = useState(false);
    const [guestCount, setGuestCount] = useState(0);
    const [guestType, setGuestType] = useState('Shared Flight');
    const [guestForms, setGuestForms] = useState([]);

    // Edit state
    const [editField, setEditField] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    // New note state
    const [newNote, setNewNote] = useState('');
    const [addingNote, setAddingNote] = useState(false);

    // Expires edit state
    const [editExpiresField, setEditExpiresField] = useState(null);
    const [editExpiresValue, setEditExpiresValue] = useState('');
    const [savingExpiresEdit, setSavingExpiresEdit] = useState(false);

    // Rebook modal state
    const [rebookModalOpen, setRebookModalOpen] = useState(false);
    const [rebookLoading, setRebookLoading] = useState(false);

    // 1. Add state for editing booking notes
    const [editingNotes, setEditingNotes] = useState(false);
    const [notesValue, setNotesValue] = useState("");
    const [savingNotes, setSavingNotes] = useState(false);

    // Add state and handlers for passenger edit at the top of the component
    const [editingPassenger, setEditingPassenger] = useState(false);
    const [editPassengerFirstName, setEditPassengerFirstName] = useState("");
    const [editPassengerLastName, setEditPassengerLastName] = useState("");
    const [editPassengerWeight, setEditPassengerWeight] = useState("");
    const [savingPassengerEdit, setSavingPassengerEdit] = useState(false);

    // Add to component state:
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editingNoteText, setEditingNoteText] = useState("");

    // Fetch data
    const voucherData = async () => {
        try {
            const resp = await axios.get(`/api/getAllVoucherData`);
            setVoucher(resp.data.data || []);
        } catch (err) {
            console.error("Error fetching vouchers:", err);
        }
    };

    const dateRequestedData = async () => {
        try {
            const response = await axios.get(`/api/getDateRequestData`);
            setDateRequested(response.data.data || []);
        } catch (err) {
            console.error("Error fetching date requests:", err);
        }
    };

    // Handle Filter Change
    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleVoucherFormChange = (field, value) => {
        setVoucherForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleVoucherCreate = async () => {
        if (!voucherForm.name || voucherForm.name.trim() === '') {
            alert('Name alanı zorunludur. Lütfen yolcu adını giriniz.');
            return;
        }
        try {
            await axios.post('/api/createVoucher', voucherForm);
            setVoucherDialogOpen(false);
            voucherData(); // Tabloyu güncelle
        } catch (err) {
            alert('Error creating voucher');
        }
    };

    // Load data on component mount
    useEffect(() => {
        voucherData();
        dateRequestedData();
    }, []);

    // Tab değiştiğinde veya filters değiştiğinde ilgili veriyi sunucudan çek
    useEffect(() => {
        if (activeTab === "bookings") {
            (async () => {
                try {
                    const response = await axios.get(`/api/getAllBookingData`, { params: filters });
                    setBooking(response.data.data || []);
                    setFilteredData(response.data.data || []);
                } catch (err) {
                    setBooking([]);
                    setFilteredData([]);
                }
            })();
        } else if (activeTab === "vouchers") {
            (async () => {
                try {
                    const resp = await axios.get(`/api/getAllVoucherData`);
                    setVoucher(resp.data.data || []);
                    setFilteredData((resp.data.data || []).map(item => ({
                        created: item.created_at || '',
                        name: item.name || '',
                        flight_type: item.flight_type || '',
                        voucher_type: item.voucher_type || '',
                        email: item.email || '',
                        phone: item.phone || '',
                        expires: item.expires || '',
                        redeemed: item.redeemed || '',
                        paid: item.paid || '',
                        offer_code: item.offer_code || '',
                        voucher_ref: item.voucher_ref || ''
                    })));
                } catch (err) {
                    setVoucher([]);
                    setFilteredData([]);
                }
            })();
        } else if (activeTab === "dateRequests") {
            (async () => {
                try {
                    const response = await axios.get(`/api/getDateRequestData`);
                    setDateRequested(response.data.data || []);
                    setFilteredData((response.data.data || []).map((item) => ({
                        name: item.name || "",
                        number: item.number || item.phone || item.mobile || item.booking_phone || "",
                        email: item.email || item.booking_email || item.contact_email || "",
                        location: item.location || "",
                        date_requested: item.date_requested || item.requested_date || item.created_at || item.created || "",
                        voucher_booking_id: item.voucher_code || item.booking_id || item.id || "",
                        id: item.id || item.voucher_code || item.booking_id || item.voucher_booking_id || ""
                    })));
                } catch (err) {
                    setDateRequested([]);
                    setFilteredData([]);
                }
            })();
        }
    }, [activeTab, filters]);

    // filteredData'yı voucher tablosu için backend key'lerine göre map'le
    useEffect(() => {
        if (activeTab === "vouchers") {
            setFilteredData(voucher.map(item => ({
                created: item.created_at || '',
                name: item.name || '',
                flight_type: item.flight_type || '',
                voucher_type: item.voucher_type || '',
                email: item.email || '',
                phone: item.phone || '',
                expires: item.expires || '',
                redeemed: item.redeemed || '',
                paid: item.paid || '',
                offer_code: item.offer_code || '',
                voucher_ref: item.voucher_ref || ''
            })));
        }
    }, [voucher, activeTab]);

    // Client-side filtering kaldırıldı çünkü artık backend'de yapılıyor

    // Name tıklanınca detayları çek
    const handleNameClick = async (item) => {
        if (activeTab === 'vouchers') {
            setBookingDetail({
                success: true,
                booking: item, // sadece booking olarak set edildi
                passengers: [],
                notes: []
            });
            setDetailDialogOpen(true);
            setLoadingDetail(false);
            setDetailError(null);
        } else {
        setSelectedBookingId(item.id);
        setDetailDialogOpen(true);
        }
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

    // 2. When opening the dialog, set notesValue to the current notes
    useEffect(() => {
        if (detailDialogOpen && bookingDetail?.booking) {
            setNotesValue(bookingDetail.booking.additional_notes || "");
            setEditingNotes(false);
        }
    }, [detailDialogOpen, bookingDetail]);

    // Add Guest butonuna tıklanınca
    const handleAddGuestClick = () => {
        setGuestType(bookingDetail.booking.flight_type || 'Shared Flight');
        setGuestCount(0);
        setGuestForms(Array.from({ length: guestCount }, (_, i) => ({ firstName: '', lastName: '', email: '', phone: '', ticketType: guestType, weight: '' })));
        setAddGuestDialogOpen(true);
    };

    // Kişi sayısı seçilince passenger formu oluştur
    useEffect(() => {
        if (guestCount > 0) {
            setGuestForms(Array.from({ length: guestCount }, (_, i) => ({ firstName: '', lastName: '', email: '', phone: '', ticketType: guestType, weight: '' })));
        } else {
            setGuestForms([]);
        }
    }, [guestCount, guestType]);

    // Passenger formu değişikliği
    const handleGuestFormChange = (idx, field, value) => {
        setGuestForms(prev => prev.map((g, i) => i === idx ? { ...g, [field]: value } : g));
    };

    // Add Guest kaydetme fonksiyonunu güncelle
    const handleSaveGuests = async () => {
        if (!selectedBookingId) return;
        // Her guest için API'ye kaydet
        for (const g of guestForms) {
            await axios.post('/api/addPassenger', {
                booking_id: selectedBookingId,
                first_name: g.firstName,
                last_name: g.lastName,
                email: g.email,
                phone: g.phone,
                ticket_type: g.ticketType,
                weight: g.weight
            });
        }
        // Guest dialogu kapat
        setAddGuestDialogOpen(false);
        // Passenger listesini tekrar çek
        fetchPassengers(selectedBookingId);
    };

    // Passenger listesini güncelleyen fonksiyon
    const fetchPassengers = async (bookingId) => {
        const res = await axios.get(`/api/getBookingDetail?booking_id=${bookingId}`);
        setBookingDetail(res.data);
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
        if (!bookingDetail?.booking?.id || !editField) return;
        setSavingEdit(true);
        try {
            await axios.patch('/api/updateBookingField', {
                booking_id: bookingDetail.booking.id,
                field: editField,
                value: editValue
            });
            if (editField === 'weight' && bookingDetail.passengers && bookingDetail.passengers.length > 0) {
                setBookingDetail(prev => ({
                    ...prev,
                    passengers: prev.passengers.map((p, i) => i === 0 ? { ...p, weight: editValue } : p)
                }));
                setFilteredData(prevData => prevData.map(f => {
                    if (f.id === bookingDetail.booking.id && Array.isArray(f.passengers) && f.passengers.length > 0) {
                        return {
                            ...f,
                            passengers: f.passengers.map((p, i) => i === 0 ? { ...p, weight: editValue } : p)
                        };
                    }
                    return f;
                }));
            } else {
            await fetchPassengers(bookingDetail.booking.id);
            }
            // Tabloyu anında güncelle
            setBooking(prev => prev.map(b => b.id === bookingDetail.booking.id ? { ...b, [editField]: editValue } : b));
            setFilteredData(prev => prev.map(b => b.id === bookingDetail.booking.id ? { ...b, [editField]: editValue } : b));
            // Eğer aktif tab dateRequests ise, dateRequestedData ile tabloyu güncelle
            if (activeTab === 'dateRequests') {
                await dateRequestedData();
            }
            setEditField(null);
            setEditValue('');
        } catch (err) {
            alert('Update failed');
        } finally {
            setSavingEdit(false);
        }
    };

    // New note functions
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
            await fetchPassengers(bookingDetail.booking.id);
        } catch (err) {
            alert('Note eklenemedi');
        } finally {
            setAddingNote(false);
        }
    };

    // Date Requests için isim tıklanınca detayları çek
    const handleDateRequestNameClick = (item) => {
        // booking_id veya voucher_booking_id veya id'den birini kullan
        const bookingId = item.voucher_booking_id || item.id || item.booking_id;
        if (bookingId) {
            setSelectedBookingId(bookingId);
            setDetailDialogOpen(true);
        }
    };

    console.log("PaginatedTable data:", filteredData);
    console.log("PaginatedTable columns:", [
        "created_at",
        "name",
        "flight_type",
        "flight_date",
        "pax",
        "email",
        "location",
        "status",
        "paid",
        "due",
        "voucher_code",
        "flight_attempts",
        "expires"
    ]);

    // CSV export fonksiyonu
    function handleExportCSV() {
        if (!filteredData.length) {
            alert('Export edilecek veri yok!');
            return;
        }
        // Tüm kolonları otomatik al
        const columns = Object.keys(filteredData[0]);
        const csvRows = [columns.join(",")];
        filteredData.forEach(row => {
            const values = columns.map(col => {
                let val = row[col];
                if (val === null || val === undefined) return '';
                val = String(val).replace(/"/g, '""');
                if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                    val = `"${val}"`;
                }
                return val;
            });
            csvRows.push(values.join(","));
        });
        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = activeTab === 'vouchers' ? 'vouchers_export.csv' : 'bookings_export.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

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
            // Tabloyu güncellemek için tekrar veri çek
            // (veya setBooking ile localde güncelle)
            setBooking(prev => prev.map(b => b.id === bookingDetail.booking.id ? { ...b, status: 'Cancelled', flight_attempts: newAttempts } : b));
            setFilteredData(prev => prev.map(b => b.id === bookingDetail.booking.id ? { ...b, status: 'Cancelled', flight_attempts: newAttempts } : b));
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
            // Yeni booking için gerekli verileri hazırla
            const payload = {
                activitySelect: bookingDetail.booking.flight_type,
                chooseLocation: bookingDetail.booking.location,
                chooseFlightType: { type: bookingDetail.booking.flight_type, passengerCount: bookingDetail.booking.pax },
                activity_id: activityId, // Modal'dan gelen activity_id kullan
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
            console.log('Rebook payload:', payload); // Debug için
            await axios.post('/api/createBooking', payload);
            setRebookModalOpen(false);
            setDetailDialogOpen(false);
            // Tabloyu güncelle
            if (activeTab === 'bookings') {
                const response = await axios.get(`/api/getAllBookingData`, { params: filters });
                setBooking(response.data.data || []);
                setFilteredData(response.data.data || []);
            }
            alert('Rebooking successful!');
        } catch (err) {
            console.error('Rebooking error:', err);
            alert('Rebooking failed!');
        } finally {
            setRebookLoading(false);
        }
    };

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
            await fetchPassengers(bookingDetail.booking.id);
            setEditingPassenger(false);
        } catch (err) {
            alert('Failed to update passenger details');
        } finally {
            setSavingPassengerEdit(false);
        }
    };



    // Add these handlers:
    const handleEditNoteClick = (id, text) => {
      setEditingNoteId(id);
      setEditingNoteText(text);
    };
    const handleCancelNoteEdit = () => {
      setEditingNoteId(null);
      setEditingNoteText("");
    };
    const handleSaveNoteEdit = async (id) => {
      if (!editingNoteText.trim()) return;
      await axios.patch('/api/updateAdminNote', { id, note: editingNoteText });
      // Refresh notes (or update local state)
      const res = await axios.get(`/api/getBookingDetail?booking_id=${bookingDetail.booking.id}`);
      setBookingDetail(prev => ({ ...prev, notes: res.data.notes }));
      setEditingNoteId(null);
      setEditingNoteText("");
    };
    const handleDeleteNote = async (id) => {
      if (!window.confirm('Are you sure you want to delete this note?')) return;
      await axios.delete('/api/deleteAdminNote', { data: { id } });
      // Refresh notes (or update local state)
      const res = await axios.get(`/api/getBookingDetail?booking_id=${bookingDetail.booking.id}`);
      setBookingDetail(prev => ({ ...prev, notes: res.data.notes }));
    };

    return (
        <div className="booking-page-wrap">
            <Container maxWidth="xl">
                <div className="heading-wrap">
                    <h2>
                        BOOKING PAGE
                    </h2>
                    <hr />
                </div>
                <div style={{ padding: "50px", background: "#f9f9f9", borderRadius: "20px" }}>
                    {/* Tabs */}
                    <div style={{ marginBottom: "20px" }}>
                        <button
                            onClick={() => setActiveTab("bookings")}
                            style={{
                                marginRight: "10px",
                                background: activeTab === "bookings" ? "#3274b4" : "#A6A6A6",
                                color: "#FFF",
                                padding: "8px",
                                border: "none",
                                cursor: "pointer"
                            }}
                        >
                            All Bookings
                        </button>
                        <button
                            onClick={() => setActiveTab("vouchers")}
                            style={{
                                marginRight: "10px",
                                background: activeTab === "vouchers" ? "#3274b4" : "#A6A6A6",
                                color: "#FFF",
                                padding: "8px",
                                border: "none",
                                cursor: "pointer"
                            }}
                        >
                            All Vouchers
                        </button>
                        <button
                            onClick={() => setActiveTab("dateRequests")}
                            style={{
                                background: activeTab === "dateRequests" ? "#3274b4" : "#A6A6A6",
                                color: "#FFF",
                                padding: "8px",
                                border: "none",
                                cursor: "pointer"
                            }}
                        >
                            Date Requests
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div>
                        {activeTab === "bookings" && (
                            <>
                                <div className="booking-top-wrap">
                                    <div className="booking-filter-heading">
                                        <h3 style={{ fontFamily: "Gilroy Light" }}>All Bookings</h3>
                                    </div>
                                    <div className="booking-search-booking" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Button variant="outlined" color="primary" onClick={handleExportCSV} style={{ height: 40 }}>
                                            Export
                                        </Button>
                                        <OutlinedInput placeholder="Search here" value={filters.search}
                                            onChange={(e) => handleFilterChange("search", e.target.value)} />
                                    </div>
                                    <div className="booking-filter-wrap">
                                        <div className="booking-filter-field">
                                            <FormControl sx={{ m: 1, minWidth: 120 }} size="small" className="booking-filter-field">
                                                <InputLabel id="book-flight-type-label">Flight Type</InputLabel>
                                                <Select
                                                    labelId="book-flight-type-label"
                                                    value={filters.flightType}
                                                    label="Flight Type"
                                                    onChange={(e) => handleFilterChange("flightType", e.target.value)}
                                                >
                                                    <MenuItem value="">
                                                        <em>Select</em>
                                                    </MenuItem>
                                                    <MenuItem value="Private Flight">Private</MenuItem>
                                                    <MenuItem value="Shared Flight">Shared</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </div>
                                        <div className="booking-filter-field">
                                            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                                                <InputLabel id="book-Select-label">Status</InputLabel>
                                                <Select
                                                    labelId="book-Select-label"
                                                    value={filters.status}
                                                    onChange={(e) => handleFilterChange("status", e.target.value)}
                                                    label="Status"
                                                >
                                                    <MenuItem value="">
                                                        <em>Select</em>
                                                    </MenuItem>
                                                    <MenuItem value="Scheduled">Scheduled</MenuItem>
                                                    <MenuItem value="Waiting">Waiting</MenuItem>
                                                    <MenuItem value="Expired">Expired</MenuItem>
                                                    <MenuItem value="Flown">Flown</MenuItem>
                                                    <MenuItem value="No Show">No Show</MenuItem>
                                                    <MenuItem value="Cancelled">Cancelled</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </div>
                                        <div className="booking-filter-field">
                                            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                                                <InputLabel id="book-location-label">Location</InputLabel>
                                                <Select
                                                    labelId="book-location-label"
                                                    value={filters.location}
                                                    onChange={(e) => handleFilterChange("location", e.target.value)}
                                                    label="Location"
                                                >
                                                    <MenuItem value="">
                                                        <em>Select</em>
                                                    </MenuItem>
                                                    <MenuItem value="Bath">Bath</MenuItem>
                                                    <MenuItem value="Somerset">Somerset</MenuItem>
                                                    <MenuItem value="Devon">Devon</MenuItem>
                                                    <MenuItem value="Bristol Fiesta">Bristol Fiesta</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </div>
                                    </div>
                                </div>
                                <PaginatedTable
                                    data={filteredData}
                                    columns={[
                                        "created_at",
                                        "name",
                                        "flight_type",
                                        "flight_date",
                                        "location", // moved here
                                        "pax",
                                        "email",
                                        "status",
                                        "paid",
                                        "due",
                                        "voucher_code",
                                        "flight_attempts",
                                        "expires"
                                    ]}
                                    onNameClick={handleNameClick}
                                />
                            </>
                        )}
                        {activeTab === "vouchers" && (
                            <>
                                <div className="booking-top-wrap">
                                    <div className="booking-filter-heading">
                                        <h3 style={{ fontFamily: "Gilroy Light" }}>All Vouchers</h3>
                                    </div>
                                    <div className="booking-search-booking" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Button variant="outlined" color="primary" onClick={handleExportCSV} style={{ height: 40 }}>
                                            Export
                                        </Button>
                                        <OutlinedInput placeholder="Search here" value={filters.search}
                                            onChange={(e) => handleFilterChange("search", e.target.value)} />
                                    </div>
                                    <div className="booking-filter-wrap">
                                        <div className="booking-filter-field">
                                            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                                                <InputLabel id="book-voucher-type-label">Voucher Type</InputLabel>
                                                <Select
                                                    labelId="book-voucher-type-label"
                                                    value={filters.voucherType}
                                                    onChange={(e) => handleFilterChange("voucherType", e.target.value)}
                                                    label="Voucher Type"
                                                >
                                                    <MenuItem value="">
                                                        <em>Select</em>
                                                    </MenuItem>
                                                    <MenuItem value="Flight Voucher">Flight Voucher</MenuItem>
                                                    <MenuItem value="Gift Voucher">Gift Voucher</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </div>
                                        <div className="booking-filter-field">
                                            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                                                <InputLabel id="book-flight-type-label">Flight Type</InputLabel>
                                                <Select
                                                    labelId="book-flight-type-label"
                                                    value={filters.flightType}
                                                    label="Flight Type"
                                                    onChange={(e) => handleFilterChange("flightType", e.target.value)}
                                                >
                                                    <MenuItem value="">
                                                        <em>Select</em>
                                                    </MenuItem>
                                                    <MenuItem value="Private Flight">Private</MenuItem>
                                                    <MenuItem value="Shared Flight">Shared</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </div>
                                        <div className="booking-filter-field">
                                            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                                                <InputLabel id="book-redeemed-status-label">Redeemed Status</InputLabel>
                                                <Select
                                                    labelId="book-redeemed-status-label"
                                                    value={filters.redeemedStatus}
                                                    onChange={(e) => handleFilterChange("redeemedStatus", e.target.value)}
                                                    label="Redeemed Status"
                                                >
                                                    <MenuItem value="">
                                                        <em>Select</em>
                                                    </MenuItem>
                                                    <MenuItem value="Yes">Yes</MenuItem>
                                                    <MenuItem value="No">No</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </div>
                                    </div>
                                </div>
                                {/* Apply client-side filtering for vouchers */}
                                <PaginatedTable
                                    data={filteredData.filter(item => {
                                        // Voucher Type filter
                                        if (filters.voucherType && item.voucher_type !== filters.voucherType) return false;
                                        // Flight Type filter
                                        if (filters.flightType && item.flight_type !== filters.flightType) return false;
                                        // Redeemed Status filter
                                        if (filters.redeemedStatus && item.redeemed !== filters.redeemedStatus) return false;
                                        // Search filter (case-insensitive, partial match)
                                        if (filters.search && filters.search.trim() !== "") {
                                            const search = filters.search.trim().toLowerCase();
                                            const name = (item.name || "").toLowerCase();
                                            const email = (item.email || "").toLowerCase();
                                            const phone = (item.phone || "").toLowerCase();
                                            const voucherRef = (item.voucher_ref || "").toLowerCase();
                                            if (!name.includes(search) && !email.includes(search) && !phone.includes(search) && !voucherRef.includes(search)) {
                                                return false;
                                            }
                                        }
                                        return true;
                                    })}
                                    columns={["created", "name", "flight_type", "voucher_type", "email", "phone", "expires", "redeemed", "paid", "offer_code", "voucher_ref"]}
                                    onNameClick={handleNameClick}
                                />
                            </>
                        )}
                        {activeTab === "dateRequests" && (
                            <>
                                <h3 style={{ fontFamily: "Gilroy Light" }}>Date Requests</h3>
                                <PaginatedTable
                                    data={dateRequested.map((item) => ({
                                        name: item.name || "",
                                        number: item.number || item.phone || item.mobile || item.booking_phone || "",
                                        email: item.email || item.booking_email || item.contact_email || "",
                                        location: item.location || "",
                                        date_requested: item.date_requested || item.requested_date || item.created_at || item.created || "",
                                        voucher_booking_id: item.voucher_code || item.booking_id || item.id || "",
                                        id: item.id || item.voucher_code || item.booking_id || item.voucher_booking_id || ""
                                    }))}
                                    columns={["name", "number", "email", "location", "date_requested", "voucher_booking_id"]}
                                    onNameClick={handleDateRequestNameClick}
                                />
                            </>
                        )}
                    </div>
                </div>
                <Dialog open={detailDialogOpen} onClose={() => { setDetailDialogOpen(false); setSelectedBookingId(null); }} maxWidth="md" fullWidth>
                    <DialogTitle style={{ background: '#2d4263', color: '#fff', fontWeight: 700, fontSize: 22 }}>Booking Details</DialogTitle>
                    <DialogContent style={{ background: '#f7f7f7', minHeight: 500 }}>
                        {loadingDetail ? (
                            <Typography>Loading...</Typography>
                        ) : detailError ? (
                            <Typography color="error">{detailError}</Typography>
                        ) : bookingDetail && bookingDetail.success && (
                            <Box>
                                <Grid container spacing={2}>
                                    {/* Personal Details */}
                                    <Grid item xs={12} md={4}>
                                        <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Personal Details</Typography>
                                            {activeTab === 'vouchers' ? (
                                                <>
                                                    <Typography><b>Name:</b> {bookingDetail.booking.name || '-'}</Typography>
                                                    <Typography><b>Email:</b> {bookingDetail.booking.email || '-'}</Typography>
                                                    <Typography><b>Phone:</b> {bookingDetail.booking.phone || '-'}</Typography>
                                                    <Typography><b>Voucher Type:</b> {bookingDetail.booking.voucher_type || '-'}</Typography>
                                                    <Typography><b>Created:</b> {bookingDetail.booking.created_at || '-'}</Typography>
                                                    <Typography><b>Expires:</b> {bookingDetail.booking.expires || '-'}</Typography>
                                                    <Typography><b>Paid:</b> £{bookingDetail.booking.paid || '0.00'}</Typography>
                                                    <Typography><b>Redeemed:</b> {bookingDetail.booking.redeemed || '-'}</Typography>
                                                    <Typography><b>Offer Code:</b> {bookingDetail.booking.offer_code || '-'}</Typography>
                                                    <Typography><b>Voucher Ref:</b> {bookingDetail.booking.voucher_ref || '-'}</Typography>
                                                </>
                                            ) : (
                                                <>
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
                                            <Typography><b>Paid:</b> £{bookingDetail.booking.paid}</Typography>
                                                    <Typography><b>Expires:</b> {editField === 'expires' ? (
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
                                                            {bookingDetail.booking.expires ? dayjs(bookingDetail.booking.expires).format('DD/MM/YYYY') : '-'}
                                                            <IconButton size="small" onClick={() => handleEditClick('expires', bookingDetail.booking.expires)}><EditIcon fontSize="small" /></IconButton>
                                                        </>
                                                    )}</Typography>
                                                </>
                                            )}
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
                                                    // Fab Cap ekle
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
                                                }}>FAB Add On</Button>
                                            </Box>
                                            <Typography><b>WX Refundable:</b> {bookingDetail.passengers && bookingDetail.passengers.some(p => p.weather_refund === 1) ? 'Yes' : 'No'}</Typography>
                                            <Typography><b>Marketing:</b> {bookingDetail.booking.hear_about_us || 'N/A'}</Typography>
                                            <Typography><b>Reason for Ballooning:</b> {bookingDetail.booking.ballooning_reason || 'N/A'}</Typography>
                                        </Box>
                                        {/* Preferences Section - always visible */}
                                        <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Preferences</Typography>
                                            <Typography><b>Preferred Day:</b> {bookingDetail.booking.preferred_day || '-'}</Typography>
                                            <Typography><b>Preferred Location:</b> {bookingDetail.booking.preferred_location || '-'}</Typography>
                                            <Typography><b>Preferred Time:</b> {bookingDetail.booking.preferred_time || '-'}</Typography>
                                        </Box>
                                    </Grid>
                                    {/* Main Details */}
                                    <Grid item xs={12} md={8}>
                                        <Box sx={{ background: '#fff', borderRadius: 2, p: 2, boxShadow: 1 }}>
                                            {/* Current Booking */}
                                            <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                                <Box>
                                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Current Booking</Typography>
                                                    {activeTab === 'vouchers' ? (
                                                        <>
                                                            <Typography><b>Flight Type:</b> {bookingDetail.booking.flight_type || '-'}</Typography>
                                                            <Typography><b>Voucher Type:</b> {bookingDetail.booking.voucher_type || '-'}</Typography>
                                                            <Typography><b>Paid:</b> £{bookingDetail.booking.paid || '0.00'}</Typography>
                                                            <Typography><b>Redeemed:</b> {bookingDetail.booking.redeemed || '-'}</Typography>
                                                            <Typography><b>Offer Code:</b> {bookingDetail.booking.offer_code || '-'}</Typography>
                                                            <Typography><b>Voucher Ref:</b> {bookingDetail.booking.voucher_ref || '-'}</Typography>
                                                            <Typography><b>Expires:</b> {bookingDetail.booking.expires || '-'}</Typography>
                                                        </>
                                                    ) : (
                                                        <>
                                                    <Typography><b>Activity:</b> {bookingDetail.booking.flight_type} - {bookingDetail.booking.location}</Typography>
                                                    <Typography><b>Booked For:</b> {bookingDetail.booking.flight_date ? (
  <a
    href={`http://44.202.155.45:3002/manifest?date=${dayjs(bookingDetail.booking.flight_date).format('YYYY-MM-DD')}&time=${dayjs(bookingDetail.booking.flight_date).format('HH:mm')}`}
    target="_blank"
    rel="noopener noreferrer"
    style={{ color: '#3274b4', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
  >
    {dayjs(bookingDetail.booking.flight_date).format('DD/MM/YYYY HH:mm')}
  </a>
) : '-'}</Typography>
                                                    <Typography>
                                                        <b>Redeemed Voucher:</b> {bookingDetail.booking.voucher_code ? <span style={{ color: 'green', fontWeight: 600 }}>Yes</span> : <span style={{ color: 'red', fontWeight: 600 }}>No</span>} <span style={{ fontWeight: 500 }}>{bookingDetail.booking.voucher_code || ''}</span>
                                                    </Typography>
                                                        </>
                                                    )}
                                                </Box>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 140 }}>
                                                    {/* Butonlar sadece booking için aktif, voucher için gizli */}
                                                    {activeTab !== 'vouchers' && <>
                                                        <Button variant="contained" color="primary" sx={{ mb: 1, borderRadius: 2, fontWeight: 600, textTransform: 'none' }} onClick={handleRebook}>Rebook</Button>
                                                    <Button variant="contained" color="primary" sx={{ mb: 1, borderRadius: 2, fontWeight: 600, textTransform: 'none' }} onClick={handleAddGuestClick}>Add Guest</Button>
                                                        <Button variant="contained" color="info" sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', background: '#6c757d' }} onClick={handleCancelFlight}>Cancel Flight</Button>
                                                    </>}
                                                </Box>
                                            </Box>
                                            <Divider sx={{ my: 2 }} />
                                            {/* Passenger Details */}
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Passenger Details</Typography>
                                                {activeTab === 'vouchers' ? (
                                                    <Typography>-</Typography>
                                                ) : (
                                                    bookingDetail.passengers && bookingDetail.passengers.length > 0 ? (
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
                                                    ) : null
                                                )}
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
                                                    <Box key={n.id || i} sx={{ mb: 1, p: 1, background: '#fff', borderRadius: 1, boxShadow: 0, position: 'relative' }}>
                                                        <Typography variant="body2" sx={{ color: '#888', fontSize: 12 }}>{n.date ? dayjs(n.date).format('DD/MM/YYYY HH:mm') : ''}</Typography>
                                                        {editingNoteId === n.id ? (
                                                            <>
                                                                <TextField
                                                                    multiline
                                                                    minRows={2}
                                                                    maxRows={6}
                                                                    fullWidth
                                                                    value={editingNoteText}
                                                                    onChange={e => setEditingNoteText(e.target.value)}
                                                                    sx={{ mb: 1 }}
                                                                />
                                                                <Button size="small" color="primary" variant="contained" sx={{ mr: 1 }} onClick={() => handleSaveNoteEdit(n.id)}>Save</Button>
                                                                <Button size="small" variant="outlined" onClick={handleCancelNoteEdit}>Cancel</Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Typography>{n.notes}</Typography>
                                                                <Button size="small" sx={{ position: 'absolute', right: 60, top: 8 }} onClick={() => handleEditNoteClick(n.id, n.notes)}>Edit</Button>
                                                                <Button size="small" color="error" sx={{ position: 'absolute', right: 8, top: 8 }} onClick={() => handleDeleteNote(n.id)}>Delete</Button>
                                                            </>
                                                        )}
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
                        )}
                    </DialogContent>
                    <DialogActions sx={{ background: '#f7f7f7' }}>
                        <Button onClick={() => { setDetailDialogOpen(false); setSelectedBookingId(null); }} color="primary" variant="contained">Close</Button>
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
            </Container>
        </div>
    );
};

export default BookingPage;
