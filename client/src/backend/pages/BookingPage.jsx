import axios from "axios";
import React, { useEffect, useState } from "react";
import PaginatedTable from "../components/BookingPage/PaginatedTable";
import { Container, FormControl, InputLabel, MenuItem, OutlinedInput, Select, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Grid, Typography, Box, Divider, IconButton } from "@mui/material";
import dayjs from 'dayjs';
import EditIcon from '@mui/icons-material/Edit';

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

    // Tab değiştiğinde ilgili veriyi sunucudan çek
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
    }, [activeTab]);

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

    // Status filtresini hem Confirmed hem Scheduled için uygula
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        let filtered = booking;
        if (filters.status) {
            filtered = filtered.filter((item) => {
                if (filters.status === 'Scheduled') {
                    return item.status === 'Scheduled' || item.status === 'Confirmed';
                }
                return item.status === filters.status;
            });
        }
        if (filters.flightType) {
            filtered = filtered.filter((item) => item.flight_type === filters.flightType);
        }
        if (filters.location) {
            filtered = filtered.filter((item) => item.location === filters.location);
        }
        // Search filter: Name, Booking ID, Telephone, Email, Voucher Code
        if (filters.search && filters.search.trim() !== "") {
            const searchLower = filters.search.trim().toLowerCase();
            filtered = filtered.filter((item) => {
                return (
                    (item.name && item.name.toLowerCase().includes(searchLower)) ||
                    (item.id && String(item.id).toLowerCase().includes(searchLower)) ||
                    (item.phone && item.phone.toLowerCase().includes(searchLower)) ||
                    (item.email && item.email.toLowerCase().includes(searchLower)) ||
                    (item.voucher_code && item.voucher_code.toLowerCase().includes(searchLower))
                );
            });
        }
        setFilteredData(filtered);
    }, [filters, booking]);

    // Name tıklanınca detayları çek
    const handleNameClick = (item) => {
        setSelectedBookingId(item.id);
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

    // Add Guest butonuna tıklanınca
    const handleAddGuestClick = () => {
        setGuestType(bookingDetail.booking.flight_type || 'Shared Flight');
        setGuestCount(0);
        setGuestForms([]);
        setAddGuestDialogOpen(true);
    };

    // Kişi sayısı seçilince passenger formu oluştur
    useEffect(() => {
        if (guestCount > 0) {
            setGuestForms(Array.from({ length: guestCount }, (_, i) => ({ firstName: '', lastName: '', email: '', phone: '', ticketType: guestType })));
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
                ticket_type: g.ticketType
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
            await fetchPassengers(bookingDetail.booking.id);
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
                            All Bookings2
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
                                        <h3 style={{ fontFamily: "Gilroy Light" }}>All Bookings2</h3>
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
                                        "pax",
                                        "email",
                                        "location",
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
                                                    <MenuItem value="Flight">Flight Voucher</MenuItem>
                                                    <MenuItem value="Gift">Gift Voucher</MenuItem>
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
                                <PaginatedTable
                                    data={filteredData}
                                    columns={["created", "name", "flight_type", "voucher_type", "email", "phone", "expires", "redeemed", "paid", "offer_code", "voucher_ref"]}
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
                        ) : (bookingDetail && bookingDetail.success) ? (
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
                                            <Typography><b>Expires:</b> {bookingDetail.booking.expires ? dayjs(bookingDetail.booking.expires).format('DD/MM/YYYY') : '-'}</Typography>
                                            <Typography><b>Paid:</b> £{bookingDetail.booking.paid}</Typography>
                                        </Box>
                                        {/* Additional */}
                                        <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Additional</Typography>
                                            <Typography><b>Booking Notes:</b> {bookingDetail.booking.additional_notes || '-'}</Typography>
                                        </Box>
                                        {/* Add On */}
                                        <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Add On's</Typography>
                                            <Typography><b>Fab Cap:</b> N/A</Typography>
                                            <Typography><b>WX Refundable:</b> {bookingDetail.passengers && bookingDetail.passengers.some(p => p.weather_refund === 1) ? 'Yes' : 'No'}</Typography>
                                            <Typography><b>Marketing:</b> {bookingDetail.booking.hear_about_us || 'N/A'}</Typography>
                                            <Typography><b>Reason for Ballooning:</b> {bookingDetail.booking.ballooning_reason || 'N/A'}</Typography>
                                            <Button variant="outlined" color="primary" style={{ marginTop: 8 }} onClick={() => alert('Add Add On clicked!')}>Add Add On</Button>
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
                                                    <Button variant="contained" color="info" sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', background: '#6c757d' }}>Cancel Flight</Button>
                                                </Box>
                                            </Box>
                                            <Divider sx={{ my: 2 }} />
                                            {/* Passenger Details */}
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Passenger Details</Typography>
                                                {bookingDetail.passengers && bookingDetail.passengers.length > 0 ? bookingDetail.passengers.map((p, i) => (
                                                    <Typography key={i}>Passenger {i + 1}: {p.first_name || '-'} {p.last_name || '-'} {p.weight ? `(${p.weight}kg)` : ''}</Typography>
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
            </Container>
        </div>
    );
};

export default BookingPage;
