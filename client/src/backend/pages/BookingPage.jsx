import axios from "axios";
import React, { useEffect, useState } from "react";
import PaginatedTable from "../components/BookingPage/PaginatedTable";
import { Container, FormControl, InputLabel, MenuItem, OutlinedInput, Select, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Grid, Typography, Box, Divider, IconButton, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import dayjs from 'dayjs';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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
    const [editingPassenger, setEditingPassenger] = useState(null);
    const [editPassengerFirstName, setEditPassengerFirstName] = useState("");
    const [editPassengerLastName, setEditPassengerLastName] = useState("");
    const [editPassengerWeight, setEditPassengerWeight] = useState("");
    const [savingPassengerEdit, setSavingPassengerEdit] = useState(false);

    // Add to component state:
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editingNoteText, setEditingNoteText] = useState("");

    // Add to component state:
    const [editPrefField, setEditPrefField] = useState(null);
    const [editPrefValue, setEditPrefValue] = useState("");
    const [savingPref, setSavingPref] = useState(false);

    // Add state for passenger price editing
    const [editPassengerPrice, setEditPassengerPrice] = useState("");

    // Add state for tracking passenger prices in edit mode
    const [editPassengerPrices, setEditPassengerPrices] = useState([]);

    // Add to component state:
    const [selectedDateRequestIds, setSelectedDateRequestIds] = useState([]);

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
                        ...item,
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
                        voucher_ref: item.voucher_ref || '',
                        _original: item // _original her zaman eklensin
                    })));
                } catch (err) {
                    setVoucher([]);
                    setFilteredData([]);
                }
            })();
        } else if (activeTab === "dateRequests") {
            (async () => {
                try {
                    const response = await axios.get(`/api/date-requests`);
                    setDateRequested(response.data.data || []);
                    setFilteredData((response.data.data || []).map((item) => ({
                        name: item.name || "",
                        number: item.phone || "",
                        email: item.email || "",
                        location: item.location || "",
                        date_requested: item.requested_date || item.created_at || "",
                        id: item.id || "",
                        _original: item // _original burada da eklensin
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
                voucher_ref: item.voucher_ref || '',
                _original: item // _original her zaman eklensin
            })));
        }
    }, [voucher, activeTab]);

    // Client-side filtering kaldırıldı çünkü artık backend'de yapılıyor

    // Name tıklanınca detayları çek
    const handleNameClick = async (item) => {
        if (activeTab === 'vouchers') {
            const voucherItem = item._original || item;
            setLoadingDetail(true);
            setDetailError(null);
            let voucherDetail = null;
            
            try {
                let res;
                let apiUrl = '';
                
                // Always use single /api prefix, never double
                if (voucherItem.voucher_ref) {
                    apiUrl = `/api/getVoucherDetail?voucher_ref=${voucherItem.voucher_ref}`;
                    res = await axios.get(apiUrl);
                } else if (voucherItem.id) {
                    apiUrl = `/api/getVoucherDetail?id=${voucherItem.id}`;
                    res = await axios.get(apiUrl);
                } else {
                    throw new Error('No voucher_ref or id found');
                }
                
                voucherDetail = res?.data || null;
                
                // Ensure voucher data is properly structured
                const finalVoucherDetail = voucherDetail || { 
                    success: true, 
                    voucher: voucherItem, 
                    passengers: [], 
                    notes: [] 
                };
                
                // If the API response doesn't have a voucher property, add it
                if (finalVoucherDetail && !finalVoucherDetail.voucher && voucherItem) {
                    finalVoucherDetail.voucher = voucherItem;
                }
                
                setBookingDetail(finalVoucherDetail);
                setDetailDialogOpen(true);
            } catch (err) {
                console.error('Error fetching voucher detail:', err);
                
                // Even on error, try to show basic voucher info
                const errorVoucherDetail = {
                    success: true,
                    voucher: voucherItem,
                    passengers: [],
                    notes: []
                };
                setBookingDetail(errorVoucherDetail);
                setDetailDialogOpen(true);
            }
            setLoadingDetail(false);
            return;
        }
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
        } else if (detailDialogOpen && !selectedBookingId && activeTab === 'vouchers') {
            // Voucher'lar için bookingDetail zaten set edilmiş, sıfırlama
            console.log('Voucher dialog open, not resetting bookingDetail');
        } else if (!detailDialogOpen) {
            // Dialog kapandığında sıfırla
            setBookingDetail(null);
            setBookingHistory([]);
        }
    }, [detailDialogOpen, selectedBookingId, activeTab]);

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
        
        try {
            // Add each guest and collect updated pax counts
            let lastUpdatedPax = null;
            for (const g of guestForms) {
                const response = await axios.post('/api/addPassenger', {
                    booking_id: selectedBookingId,
                    first_name: g.firstName,
                    last_name: g.lastName,
                    email: g.email,
                    phone: g.phone,
                    ticket_type: g.ticketType,
                    weight: g.weight
                });
                lastUpdatedPax = response.data.updatedPax;
            }
            
            // Fetch updated passengers
            const res = await axios.get(`/api/getBookingDetail?booking_id=${selectedBookingId}`);
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
            
            // Update the booking table with new pax count
            if (lastUpdatedPax !== null) {
                setBooking(prev => prev.map(b => 
                    b.id === selectedBookingId ? { ...b, pax: lastUpdatedPax } : b
                ));
                setFilteredData(prev => prev.map(b => 
                    b.id === selectedBookingId ? { ...b, pax: lastUpdatedPax } : b
                ));
            }
            
            // Refetch passengers to update UI
            await fetchPassengers(selectedBookingId);
            setAddGuestDialogOpen(false);
        } catch (error) {
            console.error('Error adding guests:', error);
            alert('Failed to add guests. Please try again.');
        }
    };

    // Passenger listesini güncelleyen fonksiyon
    const fetchPassengers = async (bookingId) => {
        const res = await axios.get(`/api/getBookingDetail?booking_id=${bookingId}`);
        setBookingDetail(res.data);
    };

    // Delete passenger function
    const handleDeletePassenger = async (passengerId) => {
        if (!selectedBookingId || !passengerId) return;
        
        if (!window.confirm('Are you sure you want to delete this passenger?')) {
            return;
        }
        
        try {
            const response = await axios.delete('/api/deletePassenger', {
                data: {
                    passenger_id: passengerId,
                    booking_id: selectedBookingId
                }
            });
            
            if (response.data.success) {
                // Update the booking table with new pax count
                const updatedPax = response.data.updatedPax;
                if (updatedPax !== null) {
                    setBooking(prev => prev.map(b => 
                        b.id === selectedBookingId ? { ...b, pax: updatedPax } : b
                    ));
                    setFilteredData(prev => prev.map(b => 
                        b.id === selectedBookingId ? { ...b, pax: updatedPax } : b
                    ));
                }
                
                // Refetch passengers to update UI
                await fetchPassengers(selectedBookingId);
            }
        } catch (error) {
            console.error('Error deleting passenger:', error);
            alert('Failed to delete passenger. Please try again.');
        }
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
        if (!editField) return;
        setSavingEdit(true);
        try {
            if (activeTab === 'vouchers') {
                // Voucher güncelleme
                if (!bookingDetail?.voucher?.id) return;
                await axios.patch('/api/updateVoucherField', {
                    voucher_id: bookingDetail.voucher.id,
                    field: editField,
                    value: editValue
                });
                // Local state güncelle
                setBookingDetail(prev => ({
                    ...prev,
                    voucher: {
                        ...prev.voucher,
                        [editField]: editValue
                    }
                }));
                // Tabloyu güncelle
                setVoucher(prev => prev.map(v => v.id === bookingDetail.voucher.id ? { ...v, [editField]: editValue } : v));
                setFilteredData(prev => prev.map(v => v.id === bookingDetail.voucher.id ? { ...v, [editField]: editValue } : v));
            } else {
                // Booking güncelleme
                if (!bookingDetail?.booking?.id) return;
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
                setBooking(prev => prev.map(b => b.id === bookingDetail.booking.id ? { ...b, paid: editValue } : b));
                setFilteredData(prev => prev.map(b => b.id === bookingDetail.booking.id ? { ...b, paid: editValue } : b));
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
        const bookingId = item.id;
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

    const handleRebookSlotSelect = async (date, time, activityId, selectedActivity, selectedLocation, selectedFlightTypeFromModal) => {
        if (!bookingDetail || !bookingDetail.booking) return;
        setRebookLoading(true);
        try {
            // Get activity details to determine flight type and pricing
            const activityResponse = await axios.get(`/api/activity/${activityId}`);
            const activity = activityResponse.data.data;
            
            // Kullanıcının seçtiği flight type'ı doğru formatla gönder
            let selectedFlightType = selectedFlightTypeFromModal || bookingDetail.booking.flight_type || '';
            let flightType;
            if (selectedFlightType.toLowerCase().includes('shared')) {
                flightType = 'Shared Flight';
            } else if (selectedFlightType.toLowerCase().includes('private')) {
                flightType = 'Private Flight';
            } else {
                flightType = selectedFlightType; // fallback
            }

            // Determine passenger count
            const passengerCount = bookingDetail.booking.pax || 1;
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

            // Yeni tarih ve saat
            const newFlightDate = dayjs(date).format('YYYY-MM-DD') + ' ' + time;

            // PATCH isteklerinden önce payload'u konsola yazdır
            const patchPayloads = [
                { booking_id: bookingDetail.booking.id, field: 'activity_id', value: activityId }, // GERİ ALINDI: activity -> activity_id
                { booking_id: bookingDetail.booking.id, field: 'location', value: selectedLocation || bookingDetail.booking.location },
                { booking_id: bookingDetail.booking.id, field: 'flight_type', value: flightType },
                { booking_id: bookingDetail.booking.id, field: 'flight_date', value: newFlightDate },
                { booking_id: bookingDetail.booking.id, field: 'paid', value: totalPrice }
            ];
            patchPayloads.forEach(payload => {
                console.log('PATCH /api/updateBookingField payload:', payload);
            });

            // 1. activity_id güncelle
            await axios.patch('/api/updateBookingField', patchPayloads[0]);
            // 2. location güncelle
            await axios.patch('/api/updateBookingField', patchPayloads[1]);
            // 3. flight_type güncelle
            await axios.patch('/api/updateBookingField', patchPayloads[2]);
            // 4. flight_date güncelle
            await axios.patch('/api/updateBookingField', patchPayloads[3]);
            // 5. paid güncelle
            await axios.patch('/api/updateBookingField', patchPayloads[4]);
            // 6. Eğer status Cancelled ise, Scheduled yap
            if (bookingDetail.booking.status === 'Cancelled') {
                const statusPayload = { booking_id: bookingDetail.booking.id, field: 'status', value: 'Scheduled' };
                console.log('PATCH /api/updateBookingField payload:', statusPayload);
                await axios.patch('/api/updateBookingField', statusPayload);
            }
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
            await fetchPassengers(bookingDetail.booking.id);
            setEditingPassenger(null);
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

    // Add handlers for preferences:
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
            alert('Failed to update preference.');
        } finally {
            setSavingPref(false);
        }
    };

    // When opening dialog, initialize editPassengerPrices
    useEffect(() => {
        if (detailDialogOpen && bookingDetail?.passengers) {
            setEditPassengerPrices(bookingDetail.passengers.map(p => p.price ? parseFloat(p.price) : 0));
        }
    }, [detailDialogOpen, bookingDetail]);

    // Add this useEffect to auto-split paid among passengers for display
    useEffect(() => {
        if (detailDialogOpen && bookingDetail?.booking && Array.isArray(bookingDetail.passengers) && bookingDetail.passengers.length > 0) {
            const paid = parseFloat(bookingDetail.booking.paid) || 0;
            const n = bookingDetail.passengers.length;
            const perPassenger = n > 0 ? parseFloat((paid / n).toFixed(2)) : 0;
            // Sadece UI için, DB'ye yazma
            setBookingDetail(prev => ({
                ...prev,
                passengers: prev.passengers.map((p) => ({ ...p, price: perPassenger }))
            }));
        }
    }, [detailDialogOpen, bookingDetail?.booking?.paid, bookingDetail?.passengers?.length]);

    // Add handler:
    const handleDeleteDateRequests = async () => {
        if (!selectedDateRequestIds || selectedDateRequestIds.length === 0) return;
        if (!window.confirm('Are you sure you want to delete the selected date requests?')) return;
        try {
            await Promise.all(selectedDateRequestIds.map(id => axios.delete(`/api/date-requests/${id}`)));
            // Update local state immediately for instant UI feedback
            setDateRequested(prev => prev.filter(item => !selectedDateRequestIds.includes(item.id)));
            setSelectedDateRequestIds([]);
        } catch (err) {
            alert('Failed to delete date requests.');
        }
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
                                    data={filteredData.map(item => ({
                                        id: item.id || '', // Ensure id is always present
                                        created_at: item.created_at || '',
                                        name: item.name || '',
                                        flight_type: item.flight_type || '',
                                        location: item.location || '',
                                        flight_date: item.flight_date_display || item.flight_date || '',
                                        pax: item.pax || '',
                                        status: item.status || '',
                                        paid: item.paid || '',
                                        due: item.due || '',
                                        voucher_code: item.voucher_code || '',
                                        flight_attempts: item.flight_attempts || '',
                                        expires: item.expires || ''
                                    }))}
                                    columns={[
                                        "created_at",
                                        "name",
                                        "flight_type",
                                        "location",
                                        "flight_date",
                                        "pax",
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
                                <Button variant="contained" color="error" style={{marginBottom: 16}} onClick={handleDeleteDateRequests} disabled={!selectedDateRequestIds || selectedDateRequestIds.length === 0}>
                                    Delete
                                </Button>
                                <PaginatedTable
                                    data={dateRequested.map((item) => ({
                                        id: item.id,
                                        name: item.name || "",
                                        number: item.phone || "",
                                        flight_type: item.flight_type || "",
                                        email: item.email || "",
                                        location: item.location || "",
                                        date_requested: item.requested_date || item.created_at || ""
                                    }))}
                                    columns={["name", "number", "flight_type", "email", "location", "date_requested"]}
                                    onNameClick={handleDateRequestNameClick}
                                    selectable={true}
                                    onSelectionChange={setSelectedDateRequestIds}
                                />
                            </>
                        )}
                    </div>
                </div>
                <Dialog open={detailDialogOpen} onClose={() => { setDetailDialogOpen(false); setSelectedBookingId(null); }} maxWidth="md" fullWidth>
                    <DialogTitle style={{ background: '#2d4263', color: '#fff', fontWeight: 700, fontSize: 22 }}>
                        {activeTab === 'vouchers' ? 'Voucher Details' : 'Booking Details'}
                    </DialogTitle>
                    <DialogContent style={{ background: '#f7f7f7', minHeight: 500 }}>
                        {loadingDetail ? (
                            <Typography>Loading...</Typography>
                        ) : detailError ? (
                            <Typography color="error">{detailError}</Typography>
                        ) : bookingDetail ? (
                            <>

                                

                                {console.log('Rendering dialog with bookingDetail:', bookingDetail)}
                                
                                {/* Simple voucher display */}
                                {activeTab === 'vouchers' && bookingDetail?.voucher ? (
                                    <Box sx={{ p: 3 }}>
                                        <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>Voucher Details</Typography>
                                        
                                        <Grid container spacing={3}>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ background: '#fff', borderRadius: 2, p: 3, boxShadow: 1 }}>
                                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Personal Information</Typography>
                                                    <Typography><b>Voucher ID:</b> {bookingDetail.voucher.id}</Typography>
                                                    <Typography><b>Name:</b> {bookingDetail.voucher.name}</Typography>
                                                    <Typography><b>Email:</b> {bookingDetail.voucher.email}</Typography>
                                                    <Typography><b>Phone:</b> {bookingDetail.voucher.phone}</Typography>
                                                    <Typography><b>Mobile:</b> {bookingDetail.voucher.mobile}</Typography>
                                                    <Typography><b>Weight:</b> {bookingDetail.voucher.weight}kg</Typography>
                                                </Box>
                                            </Grid>
                                            
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ background: '#fff', borderRadius: 2, p: 3, boxShadow: 1 }}>
                                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Flight Information</Typography>
                                                    <Typography><b>Flight Type:</b> {bookingDetail.voucher.flight_type}</Typography>
                                                    <Typography><b>Voucher Type:</b> {bookingDetail.voucher.voucher_type}</Typography>
                                                    <Typography><b>Status:</b> {bookingDetail.voucher.status}</Typography>
                                                    <Typography><b>Redeemed:</b> {bookingDetail.voucher.redeemed}</Typography>
                                                </Box>
                                            </Grid>
                                            
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ background: '#fff', borderRadius: 2, p: 3, boxShadow: 1 }}>
                                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Payment Information</Typography>
                                                    <Typography><b>Paid:</b> £{bookingDetail.voucher.paid}</Typography>
                                                    <Typography><b>Offer Code:</b> {bookingDetail.voucher.offer_code || 'N/A'}</Typography>
                                                    <Typography><b>Voucher Ref:</b> {bookingDetail.voucher.voucher_ref || 'N/A'}</Typography>
                                                    <Typography><b>Voucher Code:</b> {bookingDetail.voucher.voucher_code || 'N/A'}</Typography>
                                                </Box>
                                            </Grid>
                                            
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ background: '#fff', borderRadius: 2, p: 3, boxShadow: 1 }}>
                                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Dates</Typography>
                                                    <Typography><b>Created:</b> {dayjs(bookingDetail.voucher.created_at).format('DD/MM/YYYY HH:mm')}</Typography>
                                                    <Typography><b>Expires:</b> {bookingDetail.voucher.expires ? dayjs(bookingDetail.voucher.expires).format('DD/MM/YYYY') : 'N/A'}</Typography>
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                ) : null}
                            <Box>
                                <Grid container spacing={2}>
                                    {/* Personal Details */}
                                    <Grid item xs={12} md={4}>
                                        <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Personal Details</Typography>
                                            {activeTab === 'vouchers' ? (
                                                (() => {
                                                    const v = bookingDetail.voucher || {};
                                                    // Check if voucher data exists
                                                    if (!v || Object.keys(v).length === 0) {
                                                        return (
                                                            <Box sx={{ p: 2, textAlign: 'center' }}>
                                                                <Typography variant="h6" color="text.secondary">
                                                                    Voucher details not available
                                                                </Typography>
                                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                                    The voucher data could not be loaded. Please try again.
                                                                </Typography>
                                                            </Box>
                                                        );
                                                    }
                                                    return <>
                                                        <Typography><b>Voucher Name:</b> {editField === 'name' ? (
                                                            <>
                                                                <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{marginRight: 8}} />
                                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                {v.name || '-'}
                                                                <IconButton size="small" onClick={() => handleEditClick('name', v.name)}><EditIcon fontSize="small" /></IconButton>
                                                            </>
                                                        )}</Typography>
                                                        <Typography><b>Voucher Created:</b> {v.created_at ? dayjs(v.created_at).format('DD/MM/YYYY') : '-'}</Typography>
                                                        <Typography><b>Phone:</b> {editField === 'phone' ? (
                                                            <>
                                                                <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{marginRight: 8}} />
                                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                {v.phone || '-'}
                                                                <IconButton size="small" onClick={() => handleEditClick('phone', v.phone)}><EditIcon fontSize="small" /></IconButton>
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
                                                                {v.email || '-'}
                                                                <IconButton size="small" onClick={() => handleEditClick('email', v.email)}><EditIcon fontSize="small" /></IconButton>
                                                            </>
                                                        )}</Typography>
                                                        <Typography><b>Paid:</b> {editField === 'paid' ? (
                                                            <>
                                                                <input value={editValue} onChange={e => setEditValue(e.target.value.replace(/[^0-9.]/g, ''))} style={{marginRight: 8}} />
                                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                £{v.paid || '0.00'}
                                                                <IconButton size="small" onClick={() => handleEditClick('paid', v.paid)}><EditIcon fontSize="small" /></IconButton>
                                                            </>
                                                        )}</Typography>
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
                                                                {v.expires ? dayjs(v.expires).format('DD/MM/YYYY') : '-'}
                                                                <IconButton size="small" onClick={() => handleEditClick('expires', v.expires)}><EditIcon fontSize="small" /></IconButton>
                                                            </>
                                                        )}</Typography>
                                                        <Typography><b>Weight:</b> {editField === 'weight' ? (
                                                            <>
                                                                <input value={editValue} onChange={e => setEditValue(e.target.value.replace(/[^0-9.]/g, ''))} style={{marginRight: 8}} />
                                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                {v.weight || '-'}kg
                                                                <IconButton size="small" onClick={() => handleEditClick('weight', v.weight)}><EditIcon fontSize="small" /></IconButton>
                                                            </>
                                                        )}</Typography>
                                                        <Typography><b>Voucher ID:</b> {v.id || '-'}</Typography>
                                                        <Typography><b>Voucher Code:</b> {v.voucher_code || '-'}</Typography>
                                                        <Typography><b>Flight Attempts:</b> {v.flight_attempts || '-'}</Typography>
                                                    </>;
                                                })()
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
                                            <Typography><b>Paid:</b> {editField === 'paid' ? (
                                                        <>
                                                    <input value={editValue} onChange={e => setEditValue(e.target.value.replace(/[^0-9.]/g, ''))} style={{marginRight: 8}} />
                                                            <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                            <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                    £{bookingDetail.booking.paid}
                                                    <IconButton size="small" onClick={() => handleEditClick('paid', bookingDetail.booking.paid)}><EditIcon fontSize="small" /></IconButton>
                                                        </>
                                                    )}</Typography>
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
                                        {activeTab === 'vouchers' ? (
                                            <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Additional</Typography>
                                                {(() => {
                                                    const v = bookingDetail.voucher || {};
                                                    return <>
                                                        <Typography><b>Voucher Type:</b> {v.voucher_type || '-'}</Typography>
                                                        <Typography><b>Flight Type:</b> {v.flight_type || '-'}</Typography>
                                                        <Typography><b>Redeemed:</b> {v.redeemed || 'No'}</Typography>
                                                        <Typography><b>Offer Code:</b> {v.offer_code || '-'}</Typography>
                                                        <Typography><b>Voucher Ref:</b> {v.voucher_ref || '-'}</Typography>
                                                        <Typography><b>Status:</b> {v.status || '-'}</Typography>
                                                        <Typography><b>Voucher Code:</b> {v.voucher_code || '-'}</Typography>
                                                        <Typography><b>Flight Attempts:</b> {v.flight_attempts || '-'}</Typography>
                                                        <Typography><b>Created At:</b> {v.created_at ? dayjs(v.created_at).format('DD/MM/YYYY HH:mm') : '-'}</Typography>
                                                        <Typography><b>Updated At:</b> {v.updated_at ? dayjs(v.updated_at).format('DD/MM/YYYY HH:mm') : '-'}</Typography>
                                                    </>;
                                                })()}
                                            </Box>
                                        ) : (
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
                                                        <Button variant="contained" color="primary" onClick={handleSaveNotes} disabled={savingNotes || notesValue === (bookingDetail.booking?.additional_notes || "")}>Save</Button>
                                                    <Button variant="outlined" onClick={handleCancelNotes} sx={{ ml: 1 }} disabled={savingNotes}>Cancel</Button>
                                                </>
                                            ) : (
                                                <>
                                                        <Typography><b>Booking Notes:</b> {bookingDetail.booking?.additional_notes || '-'}</Typography>
                                                    <Button variant="text" size="small" onClick={handleEditNotes} sx={{ mt: 1 }}>Edit</Button>
                                                </>
                                            )}
                                        </Box>
                                        )}
                                        {/* Add On - Only for bookings, not vouchers */}
                                        {activeTab !== 'vouchers' && (
                                        <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Add On's</Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Typography><b>Fab Cap:</b> {bookingDetail.booking?.choose_add_on && bookingDetail.booking.choose_add_on.includes('Fab Cap') ? 'Yes' : 'No'}</Typography>
                                                <Button variant="outlined" size="small" onClick={async () => {
                                                    // Fab Cap ekle
                                                        let newAddOn = bookingDetail.booking?.choose_add_on || [];
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
                                                <Typography><b>Marketing:</b> {bookingDetail.booking?.hear_about_us || 'N/A'}</Typography>
                                                <Typography><b>Reason for Ballooning:</b> {bookingDetail.booking?.ballooning_reason || 'N/A'}</Typography>
                                        </Box>
                                        )}
                                        {/* Preferences Section - Only for bookings, not vouchers */}
                                        {activeTab !== 'vouchers' && (
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
                                                            <Typography sx={{ mr: 1 }}>{bookingDetail.booking?.preferred_day || '-'}</Typography>
                                                            <Button size="small" onClick={() => handleEditPref('preferred_day', bookingDetail.booking?.preferred_day)}>Edit</Button>
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
                                                            <Typography sx={{ mr: 1 }}>{bookingDetail.booking?.preferred_location || '-'}</Typography>
                                                            <Button size="small" onClick={() => handleEditPref('preferred_location', bookingDetail.booking?.preferred_location)}>Edit</Button>
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
                                                            <Typography sx={{ mr: 1 }}>{bookingDetail.booking?.preferred_time || '-'}</Typography>
                                                            <Button size="small" onClick={() => handleEditPref('preferred_time', bookingDetail.booking?.preferred_time)}>Edit</Button>
                                                    </>
                                                )}
                                            </Box>
                                        </Box>
                                        )}
                                    </Grid>
                                    {/* Main Details */}
                                    <Grid item xs={12} md={8}>
                                        <Box sx={{ background: '#fff', borderRadius: 2, p: 2, boxShadow: 1 }}>
                                            {/* Current Booking */}
                                            <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                                <Box>
                                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Current Booking</Typography>
                                                    {activeTab === 'vouchers' ? (
                                                        (() => {
                                                            const v = bookingDetail.voucher || {};
                                                            return <>
                                                                <Typography><b>Flight Type:</b> {v.flight_type || '-'}</Typography>
                                                                <Typography><b>Voucher Type:</b> {v.voucher_type || '-'}</Typography>
                                                                <Typography><b>Paid:</b> £{v.paid || '0.00'}</Typography>
                                                                <Typography><b>Redeemed:</b> {v.redeemed || '-'}</Typography>
                                                                <Typography><b>Offer Code:</b> {v.offer_code || '-'}</Typography>
                                                                <Typography><b>Voucher Ref:</b> {v.voucher_ref || '-'}</Typography>
                                                                <Typography><b>Expires:</b> {v.expires ? dayjs(v.expires).format('DD/MM/YYYY') : '-'}</Typography>
                                                            </>;
                                                        })()
                                                    ) : (
                                                        <>
                                                    <Typography><b>Activity:</b> {bookingDetail.booking?.flight_type || '-'} - {bookingDetail.booking?.location || '-'}</Typography>
                                                    {bookingDetail.booking?.status !== 'Cancelled' && (
  <Typography><b>Booked For:</b> {bookingDetail.booking?.flight_date ? (
    <a
      href={`http://3.86.214.48:3000/manifest?date=${dayjs(bookingDetail.booking.flight_date).format('YYYY-MM-DD')}&time=${dayjs(bookingDetail.booking.flight_date).format('HH:mm')}`}
      style={{ color: '#3274b4', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
    >
      {dayjs(bookingDetail.booking.flight_date).format('DD/MM/YYYY HH:mm')}
    </a>
  ) : '-'}</Typography>
)}
                                                    <Typography>
                                                        <b>Redeemed Voucher:</b> {bookingDetail.booking?.voucher_code ? <span style={{ color: 'green', fontWeight: 600 }}>Yes</span> : <span style={{ color: 'red', fontWeight: 600 }}>No</span>} <span style={{ fontWeight: 500 }}>{bookingDetail.booking?.voucher_code || ''}</span>
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
                                            {/* Related Booking (for vouchers) */}
                                            {activeTab === 'vouchers' && bookingDetail.booking ? (
                                                <Box sx={{ mb: 2 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Related Booking</Typography>
                                                    <Typography><b>Booking ID:</b> {bookingDetail.booking.id || '-'}</Typography>
                                                    <Typography><b>Booking Name:</b> {bookingDetail.booking.name || '-'}</Typography>
                                                    <Typography><b>Booking Email:</b> {bookingDetail.booking.email || '-'}</Typography>
                                                    <Typography><b>Booking Phone:</b> {bookingDetail.booking.phone || '-'}</Typography>
                                                    <Typography><b>Flight Date:</b> {bookingDetail.booking.flight_date ? dayjs(bookingDetail.booking.flight_date).format('DD/MM/YYYY HH:mm') : '-'}</Typography>
                                                    <Typography><b>Location:</b> {bookingDetail.booking.location || '-'}</Typography>
                                                    <Typography><b>Status:</b> {bookingDetail.booking.status || '-'}</Typography>
                                                    <Typography><b>Voucher Code Used:</b> {bookingDetail.booking.voucher_code || '-'}</Typography>
                                                </Box>
                                            ) : null}
                                            
                                            {/* Passenger Details */}
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Passenger Details</Typography>
                                                {activeTab === 'vouchers' ? (
                                                    bookingDetail.passengers && bookingDetail.passengers.length > 0 ? (
                                                        <Box>
                                                            {bookingDetail.passengers.map((p, i) => (
                                                                <Typography key={p.id || i}>
                                                                    Passenger {i + 1}: {p.first_name || '-'} {p.last_name || '-'}{p.weight ? ` (${p.weight}kg${p.price ? ' £' + p.price : ''})` : ''}
                                                                </Typography>
                                                            ))}
                                                        </Box>
                                                    ) : (
                                                        <Typography>No passengers found</Typography>
                                                    )
                                                ) : (
                                                    bookingDetail.passengers && bookingDetail.passengers.length > 0 ? (
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
                                                                            <Button size="small" onClick={async () => {
                                                                                // Save passenger price
                                                                                const newPrice = parseFloat(editPassengerPrice) || 0;
                                                                                await axios.patch('/api/updatePassengerField', {
                                                                                    passenger_id: p.id,
                                                                                    field: 'price',
                                                                                    value: newPrice
                                                                                });
                                                                                // Update local state
                                                                                const updatedPrices = bookingDetail.passengers.map((pp, idx) =>
                                                                                    pp.id === p.id ? newPrice : (pp.price ? parseFloat(pp.price) : 0)
                                                                                );
                                                                                // Update paid in backend
                                                                                const newPaid = updatedPrices.reduce((sum, v) => sum + v, 0);
                                                                                await axios.patch('/api/updateBookingField', {
                                                                                    booking_id: bookingDetail.booking.id,
                                                                                    field: 'paid',
                                                                                    value: newPaid
                                                                                });
                                                                                setBookingDetail(prev => ({
                                                                                    ...prev,
                                                                                    booking: { ...prev.booking, paid: newPaid },
                                                                                    passengers: prev.passengers.map(pp =>
                                                                                        pp.id === p.id ? { ...pp, price: newPrice } : pp
                                                                                    )
                                                                                }));
                                                                                setEditPassengerPrices(updatedPrices);
                                                                                setEditingPassenger(null);
                                                                                setEditPassengerPrice("");
                                                                            }} disabled={savingPassengerEdit}>Save</Button>
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
                                            {/* HISTORY SECTION - Only for bookings, not vouchers */}
                                            {activeTab !== 'vouchers' && (
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
                                                                <TableCell>{bookingDetail.booking?.created_at ? dayjs(bookingDetail.booking.created_at).format('DD/MM/YYYY HH:mm') : '-'}</TableCell>
                                                                <TableCell>{bookingDetail.booking?.flight_type || '-'}</TableCell>
                                                                <TableCell>{bookingDetail.booking?.location || '-'}</TableCell>
                                                            <TableCell>Scheduled</TableCell>
                                                        </TableRow>
                                                        {bookingHistory.map((h, i) => (
                                                            <TableRow key={i}>
                                                                <TableCell>{h.changed_at ? dayjs(h.changed_at).format('DD/MM/YYYY HH:mm') : '-'}</TableCell>
                                                                    <TableCell>{bookingDetail.booking?.flight_type || '-'}</TableCell>
                                                                    <TableCell>{bookingDetail.booking?.location || '-'}</TableCell>
                                                                <TableCell>{h.status}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </Box>
                                            )}
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Recipient Details</Typography>
                                            {(() => {
                                                const v = bookingDetail.voucher || {};
                                                return <>
                                                    <Typography><b>Name:</b> {v.recipient_name || '-'}</Typography>
                                                    <Typography><b>Email:</b> {v.recipient_email || '-'}</Typography>
                                                    <Typography><b>Phone:</b> {v.recipient_phone || '-'}</Typography>
                                                    <Typography><b>Gift Date:</b> {v.recipient_gift_date ? dayjs(v.recipient_gift_date).format('DD/MM/YYYY') : '-'}</Typography>
                                                </>;
                                            })()}
                                        </Box>
                                </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Preferences</Typography>
                                            {(() => {
                                                const v = bookingDetail.voucher || {};
                                                return <>
                                                    <Typography><b>Preferred Location:</b> {v.preferred_location || '-'}</Typography>
                                                    <Typography><b>Preferred Time:</b> {v.preferred_time || '-'}</Typography>
                                                    <Typography><b>Preferred Day:</b> {v.preferred_day || '-'}</Typography>
                                                </>;
                                            })()}
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Box>
                            </>
                        ) : (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography variant="h6" color="text.secondary">
                                    {activeTab === 'vouchers' ? 'Voucher details not available' : 'No data available'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    Please try again or contact support if the problem persists.
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    Debug: bookingDetail = {bookingDetail ? 'exists' : 'null'}, activeTab = {activeTab}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    Loading: {loadingDetail ? 'true' : 'false'}, Error: {detailError || 'none'}
                                </Typography>
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
                />
            </Container>
        </div>
    );
};

export default BookingPage;
