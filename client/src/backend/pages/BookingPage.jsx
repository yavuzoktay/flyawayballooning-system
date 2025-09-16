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
    
    // Her tab için ayrı filtered data state'leri
    const [filteredBookingData, setFilteredBookingData] = useState([]);
    const [filteredVoucherData, setFilteredVoucherData] = useState([]);
    const [filteredDateRequestData, setFilteredDateRequestData] = useState([]);

    // Filters
    const [filters, setFilters] = useState({
        search: "",
        experience: "",
        status: "",
        location: "",
        voucherType: "",
        actualVoucherType: "",
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

    // Booking notes state removed - now handled in Additional Information section

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



    // Add state for passenger price editing
    const [editPassengerPrice, setEditPassengerPrice] = useState("");

    // Add state for tracking passenger prices in edit mode
    const [editPassengerPrices, setEditPassengerPrices] = useState([]);

    // Add state for voucher passenger editing
    const [editVoucherPassengerName, setEditVoucherPassengerName] = useState("");
    const [editVoucherPassengerWeight, setEditVoucherPassengerWeight] = useState("");
    const [editVoucherPassengerPrice, setEditVoucherPassengerPrice] = useState("");

    // Add to component state:
    const [selectedDateRequestIds, setSelectedDateRequestIds] = useState([]);
    
    // Additional information state
    const [additionalInformation, setAdditionalInformation] = useState(null);
    const [additionalInfoLoading, setAdditionalInfoLoading] = useState(false);

    // Fetch data
    const voucherData = async () => {
        try {
            const resp = await axios.get(`/api/getAllVoucherData`);
            const voucherData = resp.data.data || [];
            setVoucher(voucherData);
            
            // Her zaman filteredVoucherData'yı güncelle
            const formattedVouchers = voucherData.map(item => {
                let formattedDate = '';
                if (item.created_at) {
                    try {
                        let dateString = item.created_at;
                        
                        if (dateString.includes(' ') && dateString.includes('/')) {
                            const datePart = dateString.split(' ')[0];
                            const [day, month, year] = datePart.split('/');
                            dateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                        }
                        
                        const date = dayjs(dateString);
                        if (date.isValid()) {
                            formattedDate = date.format('DD/MM/YYYY');
                        } else {
                            formattedDate = 'N/A';
                        }
                    } catch (error) {
                        formattedDate = 'N/A';
                    }
                }
                
                return {
                    ...item,
                    created: formattedDate,
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
                    _original: item
                };
            });
            setFilteredVoucherData(formattedVouchers);
            
            // Eğer şu anda vouchers tab'ındaysa, filteredData'yı da güncelle
            if (activeTab === "vouchers") {
                setFilteredData(formattedVouchers);
            }
        } catch (err) {
            console.error("Error fetching vouchers:", err);
        }
    };

    const dateRequestedData = async () => {
        try {
            const response = await axios.get(`/api/getDateRequestData`);
            const dateRequestData = response.data.data || [];
            setDateRequested(dateRequestData);
            
            // Sort by created_at (newest first) and then format
            const sortedDateRequests = dateRequestData.sort((a, b) => {
                const dateA = new Date(a.created_at || 0);
                const dateB = new Date(b.created_at || 0);
                return dateB - dateA; // Newest first
            });
            
            // Her zaman filteredDateRequestData'yı güncelle
            const formattedDateRequests = sortedDateRequests.map((item) => ({
                name: item.name || "",
                number: item.phone || "",
                flight_type: item.flight_type || "",
                email: item.email || "",
                location: item.location || "",
                date_requested: item.date_requested ? dayjs(item.date_requested).format('DD/MM/YYYY') : (item.created_at ? dayjs(item.created_at).format('DD/MM/YYYY') : ""),
                id: item.id || "",
                _original: item
            }));
            setFilteredDateRequestData(formattedDateRequests);
            
            // Eğer şu anda dateRequests tab'ındaysa, filteredData'yı da güncelle
            if (activeTab === "dateRequests") {
                setFilteredData(formattedDateRequests);
            }
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
            await voucherData(); // Tabloyu güncelle
            
            // Vouchers tab'ındaysa filteredData'yı da güncelle
            if (activeTab === "vouchers") {
                setFilteredData(filteredVoucherData);
            }
        } catch (err) {
            alert('Error creating voucher');
        }
    };

    // Load data on component mount
    useEffect(() => {
        voucherData();
        dateRequestedData();
    }, []);

    // Tab değiştiğinde ilgili filtered data'yı göster
    useEffect(() => {
        if (activeTab === "bookings") {
            // Bookings tab için filteredBookingData'yı kullan
            setFilteredData(filteredBookingData);
        } else if (activeTab === "vouchers") {
            // Vouchers tab için filteredVoucherData'yı kullan
            setFilteredData(filteredVoucherData);
        } else if (activeTab === "dateRequests") {
            // DateRequests tab için filteredDateRequestData'yı kullan
            setFilteredData(filteredDateRequestData);
        }
    }, [activeTab, filteredBookingData, filteredVoucherData, filteredDateRequestData]);
    
    // Filters değiştiğinde sadece bookings tab için API çağrısı yap
    useEffect(() => {
        if (activeTab === "bookings") {
            (async () => {
                try {
                    const response = await axios.get(`/api/getAllBookingData`, { params: filters });
                    const bookingData = response.data.data || [];
                    setBooking(bookingData);
                    
                    // filteredBookingData'yı güncelle
                    setFilteredBookingData(bookingData);
                    
                    // Eğer şu anda bookings tab'ındaysa, filteredData'yı da güncelle
                    if (activeTab === "bookings") {
                        setFilteredData(bookingData);
                    }
                } catch (err) {
                    setBooking([]);
                    setFilteredBookingData([]);
                    if (activeTab === "bookings") {
                        setFilteredData([]);
                    }
                }
            })();
        }
    }, [filters]);

    // filteredData'yı voucher tablosu için backend key'lerine göre map'le
    useEffect(() => {
        if (activeTab === "vouchers") {
            setFilteredData(voucher.map(item => {
                let formattedDate = '';
                if (item.created_at) {
                    try {
                        // Backend'den gelen format: "16/08/2025 18:32" (DD/MM/YYYY HH:mm)
                        // Bu formatı dayjs ile parse etmek için önce standart formata çevirelim
                        let dateString = item.created_at;
                        
                        // Eğer "DD/MM/YYYY HH:mm" formatındaysa, "DD/MM/YYYY" kısmını alalım
                        if (dateString.includes(' ') && dateString.includes('/')) {
                            const datePart = dateString.split(' ')[0]; // "16/08/2025" kısmını al
                            const [day, month, year] = datePart.split('/');
                            // YYYY-MM-DD formatına çevir
                            dateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                        }
                        
                        const date = dayjs(dateString);
                        if (date.isValid()) {
                            formattedDate = date.format('DD/MM/YYYY');
                        } else {
                            formattedDate = 'N/A';
                        }
                    } catch (error) {
                        formattedDate = 'N/A';
                    }
                }
                
                return {
                    created: formattedDate,
                    name: item.name || '',
                    flight_type: item.experience_type || '', // Updated field name
                    voucher_type: item.book_flight || '', // Updated field name
                    actual_voucher_type: item.voucher_type || '', // New field for actual voucher type
                    email: item.email || '',
                    phone: item.phone || '',
                    expires: item.expires || '',
                    redeemed: item.redeemed || '',
                    paid: item.paid || '',
                    offer_code: item.offer_code || '',
                    voucher_ref: item.voucher_ref || '',
                    flight_attempts: item.flight_attempts ?? 0,
                    _original: item // _original her zaman eklensin
                };
            }));
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
                    voucher: { ...voucherItem, flight_attempts: voucherItem.flight_attempts ?? (voucherItem._original?.flight_attempts ?? 0) }, 
                    passengers: [], 
                    notes: [] 
                };
                
                // If the API response doesn't have a voucher property, add it
                if (finalVoucherDetail && !finalVoucherDetail.voucher && voucherItem) {
                    finalVoucherDetail.voucher = voucherItem;
                }
                
                // Ensure data from getAllVoucherData takes precedence
                finalVoucherDetail.voucher = finalVoucherDetail.voucher || {};
if (finalVoucherDetail && finalVoucherDetail.voucher) {
    // Carry over flight_attempts if needed
    const listAttempts = voucherItem.flight_attempts ?? voucherItem._original?.flight_attempts;
    if (finalVoucherDetail.voucher.flight_attempts == null && listAttempts != null) {
        finalVoucherDetail.voucher.flight_attempts = listAttempts;
    }
    
    // Use expires field from getAllVoucherData
    if (voucherItem.expires) {
        // Handle different date formats and convert to standard format
        let expiresDate = voucherItem.expires;
        if (typeof expiresDate === 'string') {
            // If it's in DD/MM/YYYY format, convert to YYYY-MM-DD for dayjs
            if (expiresDate.includes('/')) {
                const parts = expiresDate.split('/');
                if (parts.length === 3) {
                    expiresDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            }
        }
        finalVoucherDetail.voucher.expires = expiresDate;
    }
    
    // Set created_at if available
    if (voucherItem.created_at) {
        finalVoucherDetail.voucher.created_at = voucherItem.created_at;
    }
    
    // Prioritize data from getAllVoucherData
    finalVoucherDetail.voucher.name = voucherItem.name || finalVoucherDetail.voucher.name;
    finalVoucherDetail.voucher.flight_type = voucherItem.flight_type || finalVoucherDetail.voucher.flight_type;
    finalVoucherDetail.voucher.voucher_type = voucherItem.voucher_type || finalVoucherDetail.voucher.voucher_type;
    finalVoucherDetail.voucher.email = voucherItem.email || finalVoucherDetail.voucher.email;
    finalVoucherDetail.voucher.mobile = voucherItem.mobile || finalVoucherDetail.voucher.mobile;
    finalVoucherDetail.voucher.weight = voucherItem.weight || finalVoucherDetail.voucher.weight;
    finalVoucherDetail.voucher.expires = voucherItem.expires || finalVoucherDetail.voucher.expires;
    // Use paid information from getAllVoucherData instead of voucher detail API
    finalVoucherDetail.voucher.paid = voucherItem.paid || finalVoucherDetail.voucher.paid;
    
    // Copy additional information data from getAllVoucherData
    if (voucherItem.additional_information) {
        console.log('🔍 Copying additional_information from voucherItem:', voucherItem.additional_information);
        finalVoucherDetail.voucher.additional_information = voucherItem.additional_information;
    }
    if (voucherItem.additional_information_json) {
        console.log('🔍 Copying additional_information_json from voucherItem:', voucherItem.additional_information_json);
        finalVoucherDetail.voucher.additional_information_json = voucherItem.additional_information_json;
    }
    
    // Copy add to booking items data from getAllVoucherData
    if (voucherItem.add_to_booking_items) {
        console.log('🔍 Copying add_to_booking_items from voucherItem:', voucherItem.add_to_booking_items);
        finalVoucherDetail.voucher.add_to_booking_items = voucherItem.add_to_booking_items;
    }

    // Copy passenger details from getAllVoucherData so popup can render immediately
    if (voucherItem.passenger_details) {
        try {
            const passengersFromList = Array.isArray(voucherItem.passenger_details)
                ? voucherItem.passenger_details
                : (typeof voucherItem.passenger_details === 'string' ? JSON.parse(voucherItem.passenger_details) : []);
            console.log('🔍 Copying passenger_details from voucherItem:', passengersFromList);
            finalVoucherDetail.voucher.passenger_details = passengersFromList;
        } catch (e) {
            console.warn('⚠️ Failed to copy/parse passenger_details from voucherItem:', e);
        }
    }
    
    console.log('🔍 Final voucher object after copying additional info and add to booking:', finalVoucherDetail.voucher);
}

                // Load voucher notes when opening popup
                try {
                    console.log('🔄 Loading voucher notes for popup...');
                    const voucherRef = voucherItem.voucher_ref;
                    if (voucherRef) {
                        const uniqueVoucherId = `voucher_${voucherRef}`;
                        console.log('📥 Fetching notes for voucher_id:', uniqueVoucherId);
                        
                        const notesResponse = await axios.get(`/api/getVoucherNotes?voucher_id=${uniqueVoucherId}`);
                        if (notesResponse.data.success) {
                            console.log('✅ Loaded', notesResponse.data.notes.length, 'voucher notes');
                            finalVoucherDetail.voucherNotes = notesResponse.data.notes || [];
                        } else {
                            console.log('❌ Failed to load voucher notes:', notesResponse.data.message);
                            finalVoucherDetail.voucherNotes = [];
                        }
                    } else {
                        console.log('⚠️ No voucher_ref found, skipping notes load');
                        finalVoucherDetail.voucherNotes = [];
                    }
                } catch (notesError) {
                    console.error('Error loading voucher notes:', notesError);
                    finalVoucherDetail.voucherNotes = [];
                }

                // Load passenger data for Flight Vouchers
                try {
                    console.log('🔄 Loading passenger data for Flight Voucher...');
                    if (voucherItem.voucher_ref) {
                        // Try to find the booking associated with this voucher
                        const bookingResponse = await axios.get(`/api/findBookingByVoucherRef?voucher_ref=${voucherItem.voucher_ref}`);
                        if (bookingResponse.data.success && bookingResponse.data.booking) {
                            const bookingId = bookingResponse.data.booking.id;
                            console.log('📥 Found booking ID:', bookingId, 'for voucher_ref:', voucherItem.voucher_ref);
                            
                            // Fetch passenger data for this booking
                            const passengerResponse = await axios.get(`/api/getBookingDetail?booking_id=${bookingId}`);
                            if (passengerResponse.data && passengerResponse.data.passengers) {
                                console.log('✅ Loaded', passengerResponse.data.passengers.length, 'passengers for Flight Voucher');
                                finalVoucherDetail.passengers = passengerResponse.data.passengers;
                                finalVoucherDetail.booking = passengerResponse.data.booking;
                            } else {
                                console.log('⚠️ No passengers found for booking ID:', bookingId);
                                finalVoucherDetail.passengers = [];
                            }
                        } else {
                            console.log('⚠️ No booking found for voucher_ref:', voucherItem.voucher_ref);
                            finalVoucherDetail.passengers = [];
                        }
                    } else {
                        console.log('⚠️ No voucher_ref found, skipping passenger load');
                        finalVoucherDetail.passengers = [];
                    }
                } catch (passengerError) {
                    console.error('Error loading passenger data:', passengerError);
                    finalVoucherDetail.passengers = [];
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
                    notes: [],
                    voucherNotes: []
                };
                
                // Try to load notes even in error case
                try {
                    const voucherRef = voucherItem.voucher_ref;
                    if (voucherRef) {
                        const uniqueVoucherId = `voucher_${voucherRef}`;
                        console.log('📥 Loading notes in error case for voucher_id:', uniqueVoucherId);
                        
                        const notesResponse = await axios.get(`/api/getVoucherNotes?voucher_id=${uniqueVoucherId}`);
                        if (notesResponse.data.success) {
                            console.log('✅ Loaded notes in error case:', notesResponse.data.notes.length);
                            errorVoucherDetail.voucherNotes = notesResponse.data.notes || [];
                        }
                    }
                } catch (errorNotesError) {
                    console.error('Error loading notes in error case:', errorNotesError);
                }
                
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
        } else if (detailDialogOpen && !selectedBookingId && activeTab === 'vouchers') {
            // Voucher'lar için bookingDetail zaten set edilmiş, additional information'ı yükle
            console.log('Voucher dialog open, loading additional information');
            console.log('Voucher additional_information:', bookingDetail?.voucher?.additional_information);
            console.log('Voucher additional_information_json:', bookingDetail?.voucher?.additional_information_json);
            
            if (bookingDetail?.voucher?.additional_information || bookingDetail?.voucher?.additional_information_json) {
                console.log('✅ Using voucher additional_information data');
                // Combine additional_information (questions) with additional_information_json (answers)
                const combinedInfo = {
                    questions: bookingDetail.voucher.additional_information?.questions || [],
                    answers: bookingDetail.voucher.additional_information?.answers || [],
                    additional_information_json: bookingDetail.voucher.additional_information_json || {},
                    legacy: bookingDetail.voucher.additional_information?.legacy || {}
                };
                setAdditionalInformation(combinedInfo);
            } else {
                console.log('❌ No additional information found for voucher');
                setAdditionalInformation(null);
            }
        } else if (!detailDialogOpen) {
            // Dialog kapandığında sıfırla
            setBookingDetail(null);
            setBookingHistory([]);
            setAdditionalInformation(null);
        }
    }, [detailDialogOpen, selectedBookingId, activeTab]);

    // Load additional information for vouchers when bookingDetail changes
    useEffect(() => {
        if (activeTab === 'vouchers' && bookingDetail?.voucher) {
            console.log('Loading additional information for voucher:', bookingDetail.voucher);
            console.log('Voucher additional_information:', bookingDetail.voucher.additional_information);
            console.log('Voucher additional_information_json:', bookingDetail.voucher.additional_information_json);
            
            if (bookingDetail.voucher.additional_information || bookingDetail.voucher.additional_information_json) {
                console.log('✅ Using voucher additional_information data in useEffect');
                console.log('🔍 Voucher additional_information:', bookingDetail.voucher.additional_information);
                console.log('🔍 Voucher additional_information_json:', bookingDetail.voucher.additional_information_json);
                console.log('🔍 Voucher additional_information.questions:', bookingDetail.voucher.additional_information?.questions);
                console.log('🔍 Voucher additional_information.questions length:', bookingDetail.voucher.additional_information?.questions?.length);
                console.log('🔍 Full voucher object keys:', Object.keys(bookingDetail.voucher));
                
                // Combine additional_information (questions) with additional_information_json (answers)
                const combinedInfo = {
                    questions: bookingDetail.voucher.additional_information?.questions || [],
                    answers: bookingDetail.voucher.additional_information?.answers || [],
                    additional_information_json: bookingDetail.voucher.additional_information_json || {},
                    legacy: bookingDetail.voucher.additional_information?.legacy || {}
                };
                
                console.log('🔍 Combined info created:', combinedInfo);
                console.log('🔍 Questions in combined info:', combinedInfo.questions);
                console.log('🔍 Questions length:', combinedInfo.questions?.length);
                setAdditionalInformation(combinedInfo);
            } else {
                console.log('❌ No additional information found for voucher in useEffect');
                setAdditionalInformation(null);
            }
        }
    }, [bookingDetail, activeTab]);

    // Notes handling removed - now handled in Additional Information section



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
            const updatedPassengers = res.data.passengers || [];
            
            // Recalculate prices
            const paid = parseFloat(res.data.booking?.paid) || 0;
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
            
            // Update the booking table with new pax count (use fresh count from fetched passengers)
            const updatedPax = n;
            setBooking(prev => prev.map(b => 
                b.id === selectedBookingId ? { ...b, pax: updatedPax } : b
            ));
            setFilteredData(prev => prev.map(b => 
                b.id === selectedBookingId ? { ...b, pax: updatedPax } : b
            ));
            
            // Refetch passengers to update dialog UI
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
                // First, refetch the updated passenger list to get the correct count
                const res = await axios.get(`/api/getBookingDetail?booking_id=${selectedBookingId}`);
                const updatedPassengers = res.data.passengers || [];
                const updatedPax = updatedPassengers.length;
                
                // Update the main booking table with the new pax count
                setBooking(prev => prev.map(b => 
                    b.id === selectedBookingId ? { ...b, pax: updatedPax } : b
                ));
                setFilteredData(prev => prev.map(b => 
                    b.id === selectedBookingId ? { ...b, pax: updatedPax } : b
                ));
                
                // Update bookingDetail state to reflect the new pax count immediately
                setBookingDetail(prev => ({
                    ...prev,
                    booking: {
                        ...prev.booking,
                        pax: updatedPax
                    },
                    passengers: updatedPassengers
                }));
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
        // Reset voucher passenger edit fields
        setEditVoucherPassengerName('');
        setEditVoucherPassengerWeight('');
        setEditVoucherPassengerPrice('');
    };

    // Handle voucher passenger edit click
    const handleEditVoucherPassengerClick = (voucher) => {
        setEditField('voucher_passenger');
        setEditVoucherPassengerName(voucher.name || '');
        setEditVoucherPassengerWeight(voucher.weight || '');
        setEditVoucherPassengerPrice(voucher.paid || '');
    };

    // Handle voucher passenger save
    const handleEditVoucherPassengerSave = async () => {
        if (!editField || editField !== 'voucher_passenger') return;
        setSavingEdit(true);
        
        try {
            const voucher = bookingDetail?.voucher;
            if (!voucher) {
                alert('Voucher information not found');
                setSavingEdit(false);
                return;
            }

            // Update voucher fields
            const updates = [];
            
            if (editVoucherPassengerName !== voucher.name) {
                updates.push({ field: 'name', value: editVoucherPassengerName });
            }
            if (editVoucherPassengerWeight !== voucher.weight) {
                updates.push({ field: 'weight', value: editVoucherPassengerWeight });
            }
            if (editVoucherPassengerPrice !== voucher.paid) {
                updates.push({ field: 'paid', value: editVoucherPassengerPrice });
            }

            if (updates.length === 0) {
                alert('No changes to save');
                setSavingEdit(false);
                return;
            }

            // Update each field
            for (const update of updates) {
                await axios.patch('/api/updateVoucherField', {
                    voucher_id: voucher.id,
                    field: update.field,
                    value: update.value
                });
            }

            // Update local state
            setBookingDetail(prev => ({
                ...prev,
                voucher: {
                    ...prev.voucher,
                    name: editVoucherPassengerName,
                    weight: editVoucherPassengerWeight,
                    paid: editVoucherPassengerPrice
                }
            }));

            // Reset edit state
            setEditField(null);
            setEditVoucherPassengerName('');
            setEditVoucherPassengerWeight('');
            setEditVoucherPassengerPrice('');

            alert('Passenger details updated successfully!');
            
        } catch (error) {
            console.error('Error updating voucher passenger details:', error);
            alert('Failed to update passenger details');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleEditSave = async () => {
        if (!editField) return;
        setSavingEdit(true);
        try {
            if (activeTab === 'vouchers') {
                // Voucher güncelleme
                let voucherId = bookingDetail?.voucher?.id;
                
                // If no voucher ID but we have voucher_ref, find the ID from all_vouchers table
                if (!voucherId && bookingDetail?.voucher?.voucher_ref) {
                    try {
                        const findVoucherResponse = await axios.get(`/api/findVoucherByRef?voucher_ref=${bookingDetail.voucher.voucher_ref}`);
                        if (findVoucherResponse.data.success && findVoucherResponse.data.voucher?.id) {
                            voucherId = findVoucherResponse.data.voucher.id;
                            const voucherSource = findVoucherResponse.data.source;
                            console.log('Found voucher ID:', voucherId, 'from source:', voucherSource, 'for voucher_ref:', bookingDetail.voucher.voucher_ref);
                            
                            // Store the source information for later use
                            window.currentVoucherSourceEdit = voucherSource;
                            window.currentVoucherDataEdit = findVoucherResponse.data.voucher;
                        } else {
                            // FALLBACK: Search in getAllVoucherData for the voucher (edit)
                            console.log('🔍 FALLBACK (edit): Searching getAllVoucherData for voucher_ref:', bookingDetail.voucher.voucher_ref);
                            try {
                                const allVouchersResponse = await axios.get('/api/getAllVoucherData');
                                console.log('getAllVoucherData response received (edit):', allVouchersResponse.data);
                                
                                if (allVouchersResponse.data && allVouchersResponse.data.data && Array.isArray(allVouchersResponse.data.data)) {
                                    console.log('Searching through', allVouchersResponse.data.data.length, 'vouchers (edit)');
                                    const foundVoucher = allVouchersResponse.data.data.find(v => v.voucher_ref === bookingDetail.voucher.voucher_ref);
                                    
                                    if (foundVoucher) {
                                        console.log('✅ Found voucher in getAllVoucherData (edit):', foundVoucher);
                                        voucherId = foundVoucher.id;
                                        window.currentVoucherSourceEdit = 'all_vouchers';
                                        window.currentVoucherDataEdit = foundVoucher;
                                    } else {
                                        console.log('❌ Voucher not found in getAllVoucherData (edit). Available voucher_refs:', 
                                            allVouchersResponse.data.data.map(v => v.voucher_ref).slice(0, 5));
                                    }
                                } else {
                                    console.log('❌ Invalid response structure from getAllVoucherData (edit)');
                                }
                            } catch (fallbackError) {
                                console.error('Fallback search failed (edit):', fallbackError);
                            }
                        }
                    } catch (err) {
                        console.error('Error finding voucher by ref:', err);
                    }
                }
                
                if (!voucherId) {
                    // Ultimate Fallback: Use voucher_ref as unique ID for any voucher (edit)
                    if (bookingDetail.voucher.voucher_ref) {
                        console.log('✅ ULTIMATE FALLBACK (edit): Using voucher_ref as unique ID for', bookingDetail.voucher.voucher_ref);
                        voucherId = `voucher_${bookingDetail.voucher.voucher_ref}`;
                        window.currentVoucherSourceEdit = 'all_vouchers';
                        window.currentVoucherDataEdit = { id: voucherId, voucher_ref: bookingDetail.voucher.voucher_ref };
                    } else {
                        console.error('Voucher ID not found:', bookingDetail);
                        alert('Voucher ID not found. Cannot save changes.');
                        setSavingEdit(false);
                        return;
                    }
                }
                
                console.log('Saving voucher field:', {
                    voucher_id: voucherId,
                    field: editField,
                    value: editValue
                });
                
                let response;
                
                // Use different API endpoints based on voucher source
                if (window.currentVoucherSourceEdit === 'all_booking') {
                    // For vouchers from all_booking table, use booking field update
                    const bookingId = voucherId.replace('booking_', ''); // Remove the 'booking_' prefix
                    console.log('Using booking field update for booking-based voucher, booking_id:', bookingId);
                    
                    response = await axios.patch('/api/updateBookingField', {
                        booking_id: bookingId,
                        field: editField,
                        value: editValue
                    });
                } else {
                    // For vouchers from all_vouchers table, use voucher field update
                    console.log('Using voucher field update for voucher-based voucher, voucher_id:', voucherId);
                    
                    response = await axios.patch('/api/updateVoucherField', {
                        voucher_id: voucherId,
                        field: editField,
                        value: editValue
                    });
                }
                
                console.log('Save response:', response.data);
                
                // Local state güncelle
                setBookingDetail(prev => ({
                    ...prev,
                    voucher: {
                        ...prev.voucher,
                        [editField]: editValue
                    }
                }));
                // Tabloyu güncelle
                setVoucher(prev => prev.map(v => v.id === voucherId ? { ...v, [editField]: editValue } : v));
                setFilteredData(prev => prev.map(v => v.id === voucherId ? { ...v, [editField]: editValue } : v));
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
            console.error('Save error:', err);
            if (activeTab === 'vouchers') {
                alert('Failed to update voucher field. Please try again.');
            } else {
            alert('Update failed');
            }
        } finally {
            setSavingEdit(false);
        }
    };

    // New note functions
    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        
        setAddingNote(true);
        try {
            if (activeTab === 'vouchers') {
                // For vouchers, use the new voucher notes system
                let voucherId = bookingDetail?.voucher?.id;
                
                // If no voucher ID but we have voucher_ref, find the ID from all_vouchers table
                if (!voucherId && bookingDetail?.voucher?.voucher_ref) {
                    try {
                        console.log('Searching for voucher with voucher_ref:', bookingDetail.voucher.voucher_ref);
                        const findVoucherResponse = await axios.get(`/api/findVoucherByRef?voucher_ref=${bookingDetail.voucher.voucher_ref}`);
                        console.log('findVoucherByRef response:', findVoucherResponse.data);
                        
                        if (findVoucherResponse.data.success && findVoucherResponse.data.voucher?.id) {
                            voucherId = findVoucherResponse.data.voucher.id;
                            const voucherSource = findVoucherResponse.data.source;
                            console.log('Found voucher ID for notes:', voucherId, 'from source:', voucherSource, 'for voucher_ref:', bookingDetail.voucher.voucher_ref);
                            
                            // Store the source information for later use
                            window.currentVoucherSource = voucherSource;
                            window.currentVoucherData = findVoucherResponse.data.voucher;
                        } else {
                            console.error('Voucher not found in either table for voucher_ref:', bookingDetail.voucher.voucher_ref);
                            
                            // FALLBACK: Search in getAllVoucherData for the voucher
                            console.log('🔍 FALLBACK: Searching getAllVoucherData for voucher_ref:', bookingDetail.voucher.voucher_ref);
                            try {
                                const allVouchersResponse = await axios.get('/api/getAllVoucherData');
                                console.log('getAllVoucherData response received:', allVouchersResponse.data);
                                
                                if (allVouchersResponse.data && allVouchersResponse.data.data && Array.isArray(allVouchersResponse.data.data)) {
                                    console.log('Searching through', allVouchersResponse.data.data.length, 'vouchers');
                                    const foundVoucher = allVouchersResponse.data.data.find(v => v.voucher_ref === bookingDetail.voucher.voucher_ref);
                                    
                                    if (foundVoucher) {
                                        console.log('✅ Found voucher in getAllVoucherData:', foundVoucher);
                                        
                                        // CRITICAL FIX: Create unique ID for notes based on voucher_ref instead of database ID
                                        // Since database ID (106) is duplicated for all vouchers, use voucher_ref as unique identifier
                                        const uniqueVoucherId = `voucher_${foundVoucher.voucher_ref}`;
                                        voucherId = uniqueVoucherId;
                                        window.currentVoucherSource = 'all_vouchers';
                                        window.currentVoucherData = foundVoucher;
                                        
                                        console.log('✅ Using unique voucher ID for notes:', uniqueVoucherId, 'instead of database ID:', foundVoucher.id);
                                    } else {
                                        console.log('❌ Voucher not found in getAllVoucherData. Available voucher_refs:', 
                                            allVouchersResponse.data.data.map(v => v.voucher_ref).slice(0, 5));
                                    }
                                } else {
                                    console.log('❌ Invalid response structure from getAllVoucherData');
                                }
                            } catch (fallbackError) {
                                console.error('Fallback search failed:', fallbackError);
                            }
                        }
                    } catch (err) {
                        console.error('Error finding voucher by ref for notes:', err);
                        console.error('Error details:', err.response?.data);
                    }
                }
                
                if (!voucherId) {
                    console.log('🚨 FINAL ATTEMPT: Trying all available methods to find voucher ID');
                    
                    // Ultimate Fallback 1: Try booking ID if available
                    if (bookingDetail?.booking?.id) {
                        console.log('✅ ULTIMATE FALLBACK 1: Using booking-based notes');
                        
                        const response = await axios.post('/api/addAdminNotes', {
                date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                note: newNote,
                booking_id: bookingDetail.booking.id
            });
                        
                        console.log('Add admin note (booking fallback) response:', response.data);
                        
                        if (response.data) {
                            setNewNote('');
                            
                            // Preserve voucher data and just refresh notes (booking fallback)
                            try {
                                const voucherItem = bookingDetail.voucher;
                                if (voucherItem.voucher_ref || voucherItem.id) {
                                    const apiUrl = voucherItem.voucher_ref 
                                        ? `/api/getVoucherDetail?voucher_ref=${voucherItem.voucher_ref}`
                                        : `/api/getVoucherDetail?id=${voucherItem.id}`;
                                    const res = await axios.get(apiUrl);
                                    const updatedDetail = res?.data || null;
                                    if (updatedDetail && updatedDetail.success) {
                                        // Preserve the original voucher data structure
                                        setBookingDetail(prev => ({
                                            ...prev,
                                            notes: updatedDetail.notes || prev.notes || []
                                        }));
                                    }
                                }
                            } catch (refreshError) {
                                console.error('Error refreshing notes (booking fallback):', refreshError);
                            }
                        }
                        
                        setAddingNote(false);
                        return;
                    }
                    
                    // Ultimate Fallback 2: Use voucher_ref as unique ID for any voucher (notes)
                    if (bookingDetail.voucher.voucher_ref) {
                        console.log('✅ ULTIMATE FALLBACK 2: Using voucher_ref as unique ID for', bookingDetail.voucher.voucher_ref);
                        voucherId = `voucher_${bookingDetail.voucher.voucher_ref}`;
                        window.currentVoucherSource = 'all_vouchers';
                        window.currentVoucherData = { id: voucherId, voucher_ref: bookingDetail.voucher.voucher_ref };
                    } else {
                        const errorMsg = `Voucher ID not found for voucher_ref: ${bookingDetail.voucher.voucher_ref}. All fallback methods exhausted.`;
                        console.error(errorMsg);
                        console.error('Current voucher data:', bookingDetail?.voucher);
                        alert(errorMsg);
                        setAddingNote(false);
                        return;
                    }
                }
                
                let response;
                
                // Use different API endpoints based on voucher source
                if (window.currentVoucherSource === 'all_booking') {
                    // For vouchers from all_booking table, use admin notes with booking_id
                    const bookingId = voucherId.replace('booking_', ''); // Remove the 'booking_' prefix
                    console.log('Using admin notes for booking-based voucher, booking_id:', bookingId);
                    
                    response = await axios.post('/api/addAdminNotes', {
                        date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                        note: newNote,
                        booking_id: bookingId
                    });
                } else {
                    // For vouchers from all_vouchers table, use voucher notes
                    console.log('Using voucher notes for voucher-based voucher, voucher_id:', voucherId);
                    
                    response = await axios.post('/api/addVoucherNote', {
                        date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                        note: newNote,
                        voucher_id: voucherId
                    });
                }
                
                console.log('Add voucher note response:', response.data);
                
                if (response.data.success || response.data) {
                    setNewNote('');
                    
                    // Add new note to local state immediately for instant feedback
                    const newNoteData = {
                        id: response.data.id || Date.now(), // Use server ID or fallback to timestamp
                        note: newNote,
                        date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                        created_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
                    };
                    
                    if (window.currentVoucherSource === 'all_booking') {
                        // For booking-based vouchers, add to notes array
                        setBookingDetail(prev => ({
                            ...prev,
                            notes: [newNoteData, ...(prev.notes || [])]
                        }));
                    } else {
                        // For voucher-based notes, add to voucherNotes array
                        setBookingDetail(prev => ({
                            ...prev,
                            voucherNotes: [newNoteData, ...(prev.voucherNotes || [])]
                        }));
                    }
                    
                    // Preserve current voucher data and just refresh notes from server
                    try {
                        if (window.currentVoucherSource === 'all_booking') {
                            // For booking-based vouchers, refresh using the same voucher detail API
                            const voucherItem = bookingDetail.voucher;
                            if (voucherItem.voucher_ref || voucherItem.id) {
                                const apiUrl = voucherItem.voucher_ref 
                                    ? `/api/getVoucherDetail?voucher_ref=${voucherItem.voucher_ref}`
                                    : `/api/getVoucherDetail?id=${voucherItem.id}`;
                                const res = await axios.get(apiUrl);
                                const updatedDetail = res?.data || null;
                                if (updatedDetail && updatedDetail.success) {
                                    // Preserve the original voucher data structure
                                    setBookingDetail(prev => ({
                                        ...prev,
                                        notes: updatedDetail.notes || prev.notes || []
                                    }));
                                }
                            }
                        } else {
                            // For voucher-based notes, fetch voucher notes directly
                            const notesResponse = await axios.get(`/api/getVoucherNotes?voucher_id=${voucherId}`);
                            if (notesResponse.data.success) {
                                console.log('✅ Refreshed voucher notes:', notesResponse.data.notes);
                                // Add voucher notes to the existing structure
                                setBookingDetail(prev => ({
                                    ...prev,
                                    voucherNotes: notesResponse.data.notes || []
                                }));
                            }
                        }
                    } catch (refreshError) {
                        console.error('Error refreshing notes:', refreshError);
                        // Don't fail the whole operation if refresh fails
                    }
                }
            } else {
                // For regular bookings, use existing admin notes system
                if (!bookingDetail?.booking?.id) return;
                
                const response = await axios.post('/api/addAdminNotes', {
                    date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                    note: newNote,
                    booking_id: bookingDetail.booking.id
                });
                
                console.log('Add admin note response:', response.data);
                
                if (response.data) {
                    setNewNote('');
                    
                    // Add new note to local state immediately for instant feedback
                    const newNoteData = {
                        id: response.data.id || Date.now(),
                        notes: newNote,
                        date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                        created_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
                    };
                    
                    setBookingDetail(prev => ({
                        ...prev,
                        notes: [newNoteData, ...(prev.notes || [])]
                    }));
                    
                    await fetchPassengers(bookingDetail.booking.id);
                }
            }
        } catch (err) {
            console.error('Note add error:', err);
            alert('Note eklenemedi: ' + (err.response?.data?.message || err.message));
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
        "voucher_type",
        "location",
        "flight_date",
        "pax",
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
            // Debug: Mevcut flight_attempts değerini logla
            console.log('Cancel Flight - Mevcut flight_attempts:', bookingDetail.booking.flight_attempts);
            console.log('Cancel Flight - Mevcut status:', bookingDetail.booking.status);
            
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
            
            // Tabloyu güncellemek için tekrar veri çek
            // (veya setBooking ile localde güncelle)
            setBooking(prev => prev.map(b => b.id === bookingDetail.booking.id ? { ...b, status: 'Cancelled', flight_attempts: newAttempts } : b));
            setFilteredData(prev => prev.map(b => b.id === bookingDetail.booking.id ? { ...b, status: 'Cancelled', flight_attempts: newAttempts } : b));
            
            console.log('Cancel Flight - Local state güncellemeleri tamamlandı');
            
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
            
            // Kullanıcının seçtiği flight type'ı doğru formatla gönder
            let flightType = '';
            if (selectedFlightTypes && selectedFlightTypes.length > 0) {
                // Check if Shared is selected
                if (selectedFlightTypes.includes('shared')) {
                    flightType = 'Shared Flight';
                } else if (selectedFlightTypes.includes('private')) {
                    flightType = 'Private Flight';
                }
            }
            
            // Fallback to existing booking flight type if no selection
            if (!flightType) {
                const existingFlightType = bookingDetail.booking.flight_type || '';
                if (existingFlightType.toLowerCase().includes('shared')) {
                    flightType = 'Shared Flight';
                } else if (existingFlightType.toLowerCase().includes('private')) {
                    flightType = 'Private Flight';
                }
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

    // Notes handling functions removed - now handled in Additional Information section
    // Notes handling functions removed - now handled in Additional Information section

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
    const handleSaveNoteEdit = async (id, noteData) => {
      if (!editingNoteText.trim()) return;
      try {
        console.log('💾 Saving note edit for id:', id, 'noteData:', noteData);
        
        // Determine if this is a voucher note or admin note based on note source
        const isVoucherNote = noteData?.source === 'voucher' || 
                             (activeTab === 'vouchers' && !noteData?.booking_id);
        
        if (isVoucherNote) {
          console.log('📝 Updating voucher note via /api/updateVoucherNote');
          // Check if this is voucher_ref based note
          if (noteData?.voucher_ref) {
            // Update voucher_ref_notes table
            await axios.patch('/api/updateVoucherRefNote', { 
              id, 
              note: editingNoteText,
              voucher_ref: noteData.voucher_ref 
            });
          } else {
            // Update regular voucher_notes table
            await axios.patch('/api/updateVoucherNote', { id, note: editingNoteText });
          }
          
          // Update local state immediately for instant feedback
          setBookingDetail(prev => ({
            ...prev,
            voucherNotes: prev.voucherNotes?.map(note => 
              note.id === id ? { ...note, note: editingNoteText } : note
            ) || []
          }));
          
          // Refresh voucher notes from server
          const voucherItem = bookingDetail.voucher;
          if (voucherItem?.voucher_ref) {
            const uniqueVoucherId = `voucher_${voucherItem.voucher_ref}`;
            const notesResponse = await axios.get(`/api/getVoucherNotes?voucher_id=${uniqueVoucherId}`);
            if (notesResponse.data.success) {
              setBookingDetail(prev => ({
                ...prev,
                voucherNotes: notesResponse.data.notes || []
              }));
            }
          }
        } else {
          console.log('📝 Updating admin note via /api/updateAdminNote');
      await axios.patch('/api/updateAdminNote', { id, note: editingNoteText });
          
          // Update local state immediately for instant feedback
          setBookingDetail(prev => ({
            ...prev,
            notes: prev.notes?.map(note => 
              note.id === id ? { ...note, notes: editingNoteText } : note
            ) || []
          }));
          
          // Refresh admin notes from server
          if (activeTab === 'vouchers') {
            const voucherItem = bookingDetail.voucher;
            if (voucherItem.voucher_ref) {
              const res = await axios.get(`/api/getVoucherDetail?voucher_ref=${voucherItem.voucher_ref}`);
              const updatedDetail = res?.data || null;
              if (updatedDetail) {
                setBookingDetail(prev => ({
                  ...prev,
                  notes: updatedDetail.notes || prev.notes || []
                }));
              }
            }
          } else {
      const res = await axios.get(`/api/getBookingDetail?booking_id=${bookingDetail.booking.id}`);
      setBookingDetail(prev => ({ ...prev, notes: res.data.notes }));
          }
        }
        
      setEditingNoteId(null);
      setEditingNoteText("");
        console.log('✅ Note edit saved successfully');
      } catch (err) {
        console.error('Error updating note:', err);
        alert('Failed to update note');
      }
    };
    
    const handleDeleteNote = async (id, noteData) => {
      if (!window.confirm('Are you sure you want to delete this note?')) return;
      try {
        console.log('🗑️ Deleting note with id:', id, 'noteData:', noteData);
        
        // Determine if this is a voucher note or admin note based on note source
        const isVoucherNote = noteData?.source === 'voucher' || 
                             (activeTab === 'vouchers' && !noteData?.booking_id);
        
        if (isVoucherNote) {
          console.log('🗑️ Deleting voucher note via /api/deleteVoucherNote');
          // Check if this is voucher_ref based note
          if (noteData?.voucher_ref) {
            // Delete from voucher_ref_notes table
            await axios.delete('/api/deleteVoucherRefNote', { 
              data: { 
                id, 
                voucher_ref: noteData.voucher_ref 
              } 
            });
          } else {
            // Delete from regular voucher_notes table
            await axios.delete('/api/deleteVoucherNote', { data: { id } });
          }
          
          // Remove note from local state immediately for instant feedback
          setBookingDetail(prev => ({
            ...prev,
            voucherNotes: prev.voucherNotes?.filter(note => note.id !== id) || []
          }));
          
          // Refresh voucher notes from server
          const voucherItem = bookingDetail.voucher;
          if (voucherItem?.voucher_ref) {
            const uniqueVoucherId = `voucher_${voucherItem.voucher_ref}`;
            const notesResponse = await axios.get(`/api/getVoucherNotes?voucher_id=${uniqueVoucherId}`);
            if (notesResponse.data.success) {
              setBookingDetail(prev => ({
                ...prev,
                voucherNotes: notesResponse.data.notes || []
              }));
            }
          }
        } else {
          console.log('🗑️ Deleting admin note via /api/deleteAdminNote');
      await axios.delete('/api/deleteAdminNote', { data: { id } });
          
          // Remove note from local state immediately for instant feedback
          setBookingDetail(prev => ({
            ...prev,
            notes: prev.notes?.filter(note => note.id !== id) || []
          }));
          
          // Refresh admin notes from server
          if (activeTab === 'vouchers') {
            const voucherItem = bookingDetail.voucher;
            if (voucherItem.voucher_ref) {
              const res = await axios.get(`/api/getVoucherDetail?voucher_ref=${voucherItem.voucher_ref}`);
              const updatedDetail = res?.data || null;
              if (updatedDetail) {
                setBookingDetail(prev => ({
                  ...prev,
                  notes: updatedDetail.notes || prev.notes || []
                }));
              }
            }
          } else {
      const res = await axios.get(`/api/getBookingDetail?booking_id=${bookingDetail.booking.id}`);
      setBookingDetail(prev => ({ ...prev, notes: res.data.notes }));
          }
        }
        
        console.log('✅ Note deleted successfully');
      } catch (err) {
        console.error('Error deleting note:', err);
        alert('Failed to delete note');
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
            // Also update the rendered dataset for current tab without requiring a reload
            setFilteredDateRequestData(prev => prev.filter(row => !selectedDateRequestIds.includes(row.id)));
            setFilteredData(prev => prev.filter(row => !selectedDateRequestIds.includes(row.id)));
            setSelectedDateRequestIds([]);
        } catch (err) {
            alert('Failed to delete date requests.');
        }
    };

    const columns = [
        { key: 'created_at_display', label: 'Created' },
        { key: 'passenger_name', label: 'Name' },
        { key: 'flight_type', label: 'Experience' },
        { key: 'voucher_type', label: 'Voucher Type' },
        { key: 'passenger_info', label: 'Passengers' },
        { key: 'status', label: 'Status' },
        { key: 'location', label: 'Location' },
        { key: 'flight_attempts', label: 'Flight attempts' },
        { key: 'expires_display', label: 'Expires' }
    ];

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
                                        <OutlinedInput placeholder="Search by name, email, phone, location..." value={filters.search}
                                            onChange={(e) => handleFilterChange("search", e.target.value)} />
                                    </div>
                                    <div className="booking-filter-wrap">
                                        <div className="booking-filter-field">
                                            <FormControl sx={{ m: 1, minWidth: 120 }} size="small" className="booking-filter-field">
                                                <InputLabel id="book-flight-type-label">Experience</InputLabel>
                                                <Select
                                                    labelId="book-flight-type-label"
                                                    value={filters.experience}
                                                    label="Experience"
                                                    onChange={(e) => handleFilterChange("experience", e.target.value)}
                                                >
                                                    <MenuItem value="">
                                                        <em>Select</em>
                                                    </MenuItem>
                                                    <MenuItem value="Private">Private</MenuItem>
                                                    <MenuItem value="Shared">Shared</MenuItem>
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
                                                    <MenuItem value="Weekday Morning">Weekday Morning</MenuItem>
                                                    <MenuItem value="Flexible Weekday">Flexible Weekday</MenuItem>
                                                    <MenuItem value="Any Day Flight">Any Day Flight</MenuItem>
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
                                {/* Search results count */}
                                {filters.search && filters.search.trim() !== "" && (
                                    <div style={{ marginBottom: 16, padding: '8px 16px', background: '#f0f8ff', borderRadius: 8, border: '1px solid #e3f2fd' }}>
                                        <Typography variant="body2" color="primary">
                                            🔍 Search results for "{filters.search}": {filteredData.filter(item => {
                                                const search = filters.search.trim().toLowerCase();
                                                const name = (item.name || "").toLowerCase();
                                                const email = (item.email || "").toLowerCase();
                                                const phone = (item.phone || "").toLowerCase();
                                                const location = (item.location || "").toLowerCase();
                                                const flightType = (item.flight_type || "").toLowerCase();
                                                const status = (item.status || "").toLowerCase();
                                                const voucherType = (item.voucher_type || "").toLowerCase();
                                                return name.includes(search) || email.includes(search) || phone.includes(search) || location.includes(search) || flightType.includes(search) || status.includes(search) || voucherType.includes(search);
                                            }).length} bookings found
                                        </Typography>
                                    </div>
                                )}
                                {/* Apply client-side filtering for bookings */}
                                <PaginatedTable
                                    data={filteredData.filter(item => {
                                        // Experience filter
                                        if (filters.experience && filters.experience !== 'Select') {
                                            if (filters.experience === 'Private' && !item.flight_type?.toLowerCase().includes('private')) return false;
                                            if (filters.experience === 'Shared' && !item.flight_type?.toLowerCase().includes('shared')) return false;
                                        }
                                        // Status filter
                                        if (filters.status && item.status !== filters.status) return false;
                                        // Location filter
                                        if (filters.location && item.location !== filters.location) return false;
                                        // Voucher Type filter
                                        if (filters.voucherType && item.voucher_type !== filters.voucherType) return false;
                                        // Search filter (case-insensitive, partial match)
                                        if (filters.search && filters.search.trim() !== "") {
                                            const search = filters.search.trim().toLowerCase();
                                            const name = (item.name || "").toLowerCase();
                                            const email = (item.email || "").toLowerCase();
                                            const phone = (item.phone || "").toLowerCase();
                                            const location = (item.location || "").toLowerCase();
                                            const flightType = (item.flight_type || "").toLowerCase();
                                            const status = (item.status || "").toLowerCase();
                                            const voucherType = (item.voucher_type || "").toLowerCase();
                                            if (!name.includes(search) && !email.includes(search) && !phone.includes(search) && !location.includes(search) && !flightType.includes(search) && !status.includes(search) && !voucherType.includes(search)) {
                                                return false;
                                            }
                                        }
                                        return true;
                                    }).map(item => ({
                                        id: item.id || '', // Ensure id is always present
                                        created_at: item.created_at ? dayjs(item.created_at).format('DD/MM/YYYY') : '',
                                        name: (Array.isArray(item.passengers) && item.passengers.length > 0
                                            ? `${item.passengers[0]?.first_name || ''} ${item.passengers[0]?.last_name || ''}`.trim() || item.name || ''
                                            : item.name || ''),
                                        flight_type: item.flight_type || '',
                                        voucher_type: item.voucher_type || '',
                                        location: item.location || '',
                                        flight_date: (item.status === 'Cancelled') ? '-' : (item.flight_date_display || item.flight_date || ''),
                                        pax: item.pax || '',
                                        status: item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase() : '',
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
                                        "voucher_type",
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
                                    context="bookings"
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
                                        <OutlinedInput placeholder="Search by name, email, phone, voucher ref, offer code..." value={filters.search}
                                            onChange={(e) => handleFilterChange("search", e.target.value)} />
                                    </div>
                                    <div className="booking-filter-wrap">
                                        <div className="booking-filter-field">
                                            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                                                <InputLabel id="book-voucher-type-label">Book Flight</InputLabel>
                                                <Select
                                                    labelId="book-voucher-type-label"
                                                    value={filters.voucherType}
                                                    onChange={(e) => handleFilterChange("voucherType", e.target.value)}
                                                    label="Book Flight"
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
                                                <InputLabel id="book-flight-type-label">Experience</InputLabel>
                                                <Select
                                                    labelId="book-flight-type-label"
                                                    value={filters.experience}
                                                    label="Experience"
                                                    onChange={(e) => handleFilterChange("experience", e.target.value)}
                                                >
                                                    <MenuItem value="">
                                                        <em>Select</em>
                                                    </MenuItem>
                                                    <MenuItem value="Private">Private</MenuItem>
                                                    <MenuItem value="Shared">Shared</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </div>
                                        <div className="booking-filter-field">
                                            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                                                <InputLabel id="book-actual-voucher-type-label">Voucher Type</InputLabel>
                                                <Select
                                                    labelId="book-actual-voucher-type-label"
                                                    value={filters.actualVoucherType}
                                                    label="Voucher Type"
                                                    onChange={(e) => handleFilterChange("actualVoucherType", e.target.value)}
                                                >
                                                    <MenuItem value="">
                                                        <em>Select</em>
                                                    </MenuItem>
                                                    <MenuItem value="Weekday Morning">Weekday Morning</MenuItem>
                                                    <MenuItem value="Flexible Weekday">Flexible Weekday</MenuItem>
                                                    <MenuItem value="Any Day Flight">Any Day Flight</MenuItem>
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
                                {/* Search results count */}
                                {filters.search && filters.search.trim() !== "" && (
                                    <div style={{ marginBottom: 16, padding: '8px 16px', background: '#f0f8ff', borderRadius: 8, border: '1px solid #e3f2fd' }}>
                                        <Typography variant="body2" color="primary">
                                            🔍 Search results for "{filters.search}": {filteredData.filter(item => {
                                                const search = filters.search.trim().toLowerCase();
                                                const name = (item.name || "").toLowerCase();
                                                const email = (item.email || "").toLowerCase();
                                                const phone = (item.phone || "").toLowerCase();
                                                const voucherRef = (item.voucher_ref || "").toLowerCase();
                                                const offerCode = (item.offer_code || "").toLowerCase();
                                                                                            const flightType = (item.flight_type || "").toLowerCase();
                                            const voucherType = (item.voucher_type || "").toLowerCase();
                                            const actualVoucherType = (item.actual_voucher_type || "").toLowerCase();
                                            return name.includes(search) || email.includes(search) || phone.includes(search) || voucherRef.includes(search) || offerCode.includes(search) || flightType.includes(search) || voucherType.includes(search) || actualVoucherType.includes(search);
                                            }).length} vouchers found
                                        </Typography>
                                    </div>
                                )}
                                {/* Apply client-side filtering for vouchers */}
                                <PaginatedTable
                                    data={filteredData.filter(item => {
                                        // Voucher Type filter
                                        if (filters.voucherType && item.voucher_type !== filters.voucherType) return false;
                                        // Actual Voucher Type filter
                                        if (filters.actualVoucherType && item.actual_voucher_type !== filters.actualVoucherType) return false;
                                        // Experience filter
                                        if (filters.experience && filters.experience !== 'Select') {
                                            if (filters.experience === 'Private' && !item.flight_type?.toLowerCase().includes('private')) return false;
                                            if (filters.experience === 'Shared' && !item.flight_type?.toLowerCase().includes('shared')) return false;
                                        }
                                        // Redeemed Status filter
                                        if (filters.redeemedStatus && item.redeemed !== filters.redeemedStatus) return false;
                                        // Search filter (case-insensitive, partial match)
                                        if (filters.search && filters.search.trim() !== "") {
                                            const search = filters.search.trim().toLowerCase();
                                            const name = (item.name || "").toLowerCase();
                                            const email = (item.email || "").toLowerCase();
                                            const phone = (item.phone || "").toLowerCase();
                                            const voucherRef = (item.voucher_ref || "").toLowerCase();
                                            const offerCode = (item.offer_code || "").toLowerCase();
                                            const flightType = (item.flight_type || "").toLowerCase();
                                            const voucherType = (item.voucher_type || "").toLowerCase();
                                            
                                            // Debug logging for search
                                            if (search && (name.includes(search) || email.includes(search) || phone.includes(search) || voucherRef.includes(search) || offerCode.includes(search) || flightType.includes(search) || voucherType.includes(search))) {
                                                console.log('Search match found:', { search, name, email, phone, voucherRef, offerCode, flightType, voucherType });
                                            }
                                            
                                            if (!name.includes(search) && !email.includes(search) && !phone.includes(search) && !voucherRef.includes(search) && !offerCode.includes(search) && !flightType.includes(search) && !voucherType.includes(search)) {
                                                return false;
                                            }
                                        }
                                        return true;
                                    })}
                                    columns={["created", "name", "flight_type", "voucher_type", "actual_voucher_type", "email", "phone", "expires", "redeemed", "paid", "offer_code", "voucher_ref"]}
                                    onNameClick={handleNameClick}
                                    context="vouchers"
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
                                    data={filteredDateRequestData}
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
                        {activeTab === 'vouchers' ? 
                            (() => {
                                const voucher = bookingDetail?.voucher;
                                console.log('🎯 Dialog title check:', {
                                    book_flight: voucher?.book_flight,
                                    voucher_type: voucher?.voucher_type,
                                    isGiftVoucher: voucher?.book_flight === 'Gift Voucher'
                                });
                                
                                // Check if it's a Gift Voucher
                                if (voucher?.book_flight === 'Gift Voucher') {
                                    console.log('✅ Dialog: Gift Voucher Details');
                                    return 'Gift Voucher Details';
                                }
                                // Check if it's a Flight Voucher
                                else if (voucher?.voucher_type?.toLowerCase().includes('flight')) {
                                    console.log('✅ Dialog: Flight Voucher Details');
                                    return 'Flight Voucher Details';
                                }
                                // Default to Voucher Details
                                else {
                                    console.log('✅ Dialog: Voucher Details (default)');
                                    return 'Voucher Details';
                                }
                            })()
                            : 'Booking Details'}
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
                                        <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
                                            {(() => {
                                                const voucher = bookingDetail?.voucher;
                                                console.log('🎯 Voucher title check:', {
                                                    book_flight: voucher?.book_flight,
                                                    voucher_type: voucher?.voucher_type,
                                                    isGiftVoucher: voucher?.book_flight === 'Gift Voucher'
                                                });
                                                
                                                // Check if it's a Gift Voucher
                                                if (voucher?.book_flight === 'Gift Voucher') {
                                                    console.log('✅ Showing Gift Voucher Details');
                                                    return 'Gift Voucher Details';
                                                }
                                                // Check if it's a Flight Voucher
                                                else if (voucher?.voucher_type?.toLowerCase().includes('flight')) {
                                                    console.log('✅ Showing Flight Voucher Details');
                                                    return 'Flight Voucher Details';
                                                }
                                                // Default to Voucher Details
                                                else {
                                                    console.log('✅ Showing Voucher Details (default)');
                                                    return 'Voucher Details';
                                                }
                                            })()}
                                        </Typography>
                                        
                                        <Grid container spacing={3}>

                                            

                                            

                                            

                                        </Grid>
                                    </Box>
                                ) : null}
                            <Box>
                                <Grid container spacing={2}>
                                    {/* Personal Details */}
                                    <Grid item xs={12} md={4}>
                                        <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                                                {(() => {
                                                    const v = bookingDetail.voucher || {};
                                                    // For Gift Voucher (book_flight: "Gift Voucher"), show "Purchaser Information"
                                                    if (v.book_flight === "Gift Voucher") {
                                                        return "Purchaser Information";
                                                    }
                                                    return "Personal Details";
                                                })()}
                                            </Typography>
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
                                                        <Typography><b>Name:</b> {editField === 'name' ? (
                                                            <>
                                                                <input 
                                                                    value={editValue} 
                                                                    onChange={e => setEditValue(e.target.value)} 
                                                                    style={{marginRight: 8}} 
                                                                    placeholder="Full name"
                                                                />
                                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                {v.book_flight === "Gift Voucher" ? (v.purchaser_name || v.name || '-') : (v.name || '-')}
                                                                <IconButton size="small" onClick={() => handleEditClick('name', v.book_flight === "Gift Voucher" ? (v.purchaser_name || v.name) : v.name)}><EditIcon fontSize="small" /></IconButton>
                                                            </>
                                                        )}</Typography>
                                                        {/* Phone field - show purchaser_phone for Gift Vouchers, mobile for others */}
                                                        <Typography><b>Phone:</b> {editField === 'mobile' ? (
                                                            <>
                                                                <input 
                                                                    value={editValue} 
                                                                    onChange={e => setEditValue(e.target.value.replace(/[^0-9+\-\s()]/g, ''))} 
                                                                    style={{marginRight: 8}} 
                                                                    placeholder="Phone number"
                                                                />
                                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                {v.book_flight === "Gift Voucher" ? (v.purchaser_phone || v.phone || '-') : (v.mobile || '-')}
                                                                <IconButton size="small" onClick={() => handleEditClick('mobile', v.book_flight === "Gift Voucher" ? (v.purchaser_phone || v.phone) : v.mobile)}><EditIcon fontSize="small" /></IconButton>
                                                            </>
                                                        )}</Typography>
                                                        {/* Mobile field - show purchaser_mobile for Gift Vouchers */}
                                                        <Typography><b>Mobile:</b> {editField === 'mobile' ? (
                                                            <>
                                                                <input 
                                                                    value={editValue} 
                                                                    onChange={e => setEditValue(e.target.value.replace(/[^0-9+\-\s()]/g, ''))} 
                                                                    style={{marginRight: 8}} 
                                                                    placeholder="Mobile number"
                                                                />
                                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                {v.book_flight === "Gift Voucher" ? (v.purchaser_mobile || v.mobile || '-') : (v.mobile || '-')}
                                                                <IconButton size="small" onClick={() => handleEditClick('mobile', v.book_flight === "Gift Voucher" ? (v.purchaser_mobile || v.mobile) : v.mobile)}><EditIcon fontSize="small" /></IconButton>
                                                            </>
                                                        )}</Typography>
                                                        <Typography><b>Email:</b> {editField === 'email' ? (
                                                            <>
                                                                <input 
                                                                    type="email"
                                                                    value={editValue} 
                                                                    onChange={e => setEditValue(e.target.value)} 
                                                                    style={{marginRight: 8}} 
                                                                    placeholder="email@example.com"
                                                                />
                                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                {v.book_flight === "Gift Voucher" ? (v.purchaser_email || v.email || '-') : (v.email || '-')}
                                                                <IconButton size="small" onClick={() => handleEditClick('email', v.book_flight === "Gift Voucher" ? (v.purchaser_email || v.email) : v.email)}><EditIcon fontSize="small" /></IconButton>
                                                            </>
                                                        )}</Typography>
                                                        <Typography><b>Created:</b> {bookingDetail.voucher.created_at ? (
                                                            dayjs(bookingDetail.voucher.created_at).isValid() ? 
                                                                dayjs(bookingDetail.voucher.created_at).format('DD/MM/YYYY') : 
                                                                (bookingDetail.voucher.created_at.includes(' ') ? 
                                                                    bookingDetail.voucher.created_at.split(' ')[0] : 
                                                                    bookingDetail.voucher.created_at)
                                                        ) : '-'}</Typography>
                                                        <Typography><b>Paid:</b> {editField === 'paid' ? (
                                                            <>
                                                                <input 
                                                                    value={editValue} 
                                                                    onChange={e => setEditValue(e.target.value.replace(/[^0-9.]/g, ''))} 
                                                                    style={{marginRight: 8}} 
                                                                    placeholder="0.00"
                                                                />
                                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                £{v.paid || '0.00'}
                                                                <IconButton size="small" onClick={() => handleEditClick('paid', v.paid)}><EditIcon fontSize="small" /></IconButton>
                                                            </>
                                                        )}</Typography>
                                                        <Typography><b>Expires:</b> {bookingDetail.voucher.expires ? (
                                                            dayjs(bookingDetail.voucher.expires).isValid() ? 
                                                                dayjs(bookingDetail.voucher.expires).format('DD/MM/YYYY') : 
                                                                bookingDetail.voucher.expires
                                                        ) : '-'}</Typography>
                                                        {/* Weight field moved to Passenger Details section */}
                                                        <Typography><b>Voucher ID:</b> {v.id || '-'}</Typography>
                                                        <Typography><b>Voucher Code:</b> {v.voucher_code || '-'}</Typography>
                                                        <Typography><b>Flight Attempts:</b> {v.flight_attempts ?? '-'}</Typography>
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
                                            <Typography><b>Flight Attempts:</b> {bookingDetail.booking.flight_attempts || '-'}</Typography>
                                            <Typography><b>Voucher Type:</b> {bookingDetail.booking.voucher_type || '-'}</Typography>
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
                                        {/* Additional section removed - information is now displayed in Additional Information section */}
                                        {/* Add On - Only for bookings, not vouchers */}
                                        {activeTab !== 'vouchers' && (
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
    {(() => {
        const wxPassengers = Array.isArray(bookingDetail.passengers)
            ? bookingDetail.passengers.filter(p => Number(p.weather_refund) === 1)
            : [];
        if (wxPassengers.length === 0) return 'No';
        const names = wxPassengers.map(p => `${p.first_name || ''} ${p.last_name || ''}`.trim()).filter(Boolean);
        return (
            <span>
                <span style={{ color: '#10b981', fontWeight: 'bold', marginRight: '4px' }}>✔</span>
                Yes{names.length ? ` — ${names.join(', ')}` : ''}
            </span>
        );
    })()}
</Typography>

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
                                                                <Typography><b>Experience:</b> {v.flight_type || '-'}</Typography>
                                                                <Typography><b>Book Flight:</b> {v.voucher_type || '-'}</Typography>
                                                                <Typography><b>Paid:</b> £{v.paid || '0.00'}</Typography>
                                                                <Typography><b>Redeemed:</b> {v.redeemed || '-'}</Typography>
                                                                <Typography><b>Offer Code:</b> {v.offer_code || '-'}</Typography>
                                                                <Typography><b>Voucher Ref:</b> {v.voucher_ref || '-'}</Typography>
                                                                {v.book_flight === "Gift Voucher" && (
                                                                    <Typography><b>Number of Vouchers:</b> {v.numberOfPassengers || '1'}</Typography>
                                                                )}
                                                                <Typography><b>Created:</b> {v.created_at ? (
                                                                    dayjs(v.created_at).isValid() ? 
                                                                        dayjs(v.created_at).format('DD/MM/YYYY') : 
                                                                        (v.created_at.includes(' ') ? 
                                                                            v.created_at.split(' ')[0] : 
                                                                            v.created_at)
                                                                ) : '-'}</Typography>
                                                                <Typography><b>Expires:</b> {v.expires ? (
                                                                    dayjs(v.expires).isValid() ? 
                                                                        dayjs(v.expires).format('DD/MM/YYYY') : 
                                                                        v.expires
                                                                ) : '-'}</Typography>
                                                            </>;
                                                        })()
                                                    ) : (
                                                        <>
                                                    <Typography><b>Activity:</b> {bookingDetail.booking?.flight_type || '-'} - {bookingDetail.booking?.location || '-'}</Typography>
                                                    {bookingDetail.booking?.status !== 'Cancelled' && (
  <Typography><b>Booked For:</b> {bookingDetail.booking?.flight_date ? (
    <a
      href={`https://flyawayballooning-system.com/manifest?date=${dayjs(bookingDetail.booking.flight_date).format('YYYY-MM-DD')}&time=${dayjs(bookingDetail.booking.flight_date).format('HH:mm')}`}
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
                                                    {/* Always show booking action buttons (including in Flight Voucher Details) */}
                                                    <Button variant="contained" color="primary" sx={{ mb: 1, borderRadius: 2, fontWeight: 600, textTransform: 'none' }} onClick={handleRebook}>Rebook</Button>
                                                    <Button variant="contained" color="primary" sx={{ mb: 1, borderRadius: 2, fontWeight: 600, textTransform: 'none' }} onClick={handleAddGuestClick}>Add Guest</Button>
                                                    <Button variant="contained" color="info" sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', background: '#6c757d' }} onClick={handleCancelFlight}>Cancel Flight</Button>
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
                                            
                                                                                        {/* Passenger Details - Hide for Gift Vouchers */}
                                            {(() => {
                                                const v = bookingDetail.voucher || {};
                                                // Only show Passenger Details if it's NOT a Gift Voucher
                                                if (v.book_flight === "Gift Voucher") {
                                                    return null; // Don't render Passenger Details for Gift Vouchers
                                                }
                                                return (
                                                    <Box sx={{ mb: 2 }}>
                                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Passenger Details</Typography>
                                                        {activeTab === 'vouchers' ? (
                                                    <>
                                                        {/* Passenger list for vouchers using passenger_details from voucher */}
                                                        {(() => {
                                                            const v = bookingDetail.voucher || {};
                                                            // Prefer voucher.passenger_details; fallback to bookingDetail.passenger_details if present
                                                            const passengers = Array.isArray(v.passenger_details)
                                                                ? v.passenger_details
                                                                : (Array.isArray(bookingDetail.passenger_details) ? bookingDetail.passenger_details : []);
                                                            if (passengers.length === 0) {
                                                                return <Typography sx={{ color: '#888' }}>No passengers found</Typography>;
                                                            }
                                                            return (
                                                                <Box>
                                                                    {passengers.map((p, i) => {
                                                                        const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || '-';
                                                                        const weight = (p.weight !== undefined && p.weight !== null && p.weight !== '') ? p.weight : '-';
                                                                        const price = (p.price !== undefined && p.price !== null && p.price !== '') ? p.price : '-';
                                                                        return (
                                                                            <Typography key={`${p.id || i}-${fullName}-${i}`}>
                                                                                {`Passenger ${i + 1}: ${fullName} (${weight}kg £${price})`}
                                                                            </Typography>
                                                                        );
                                                                    })}
                                                                </Box>
                                                            );
                                                        })()}
                                                    </>
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
                                                );
                                            })()}
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
                                                {(() => {
                                                    // Combine regular notes and voucher notes
                                                    const regularNotes = bookingDetail.notes || [];
                                                    const voucherNotes = bookingDetail.voucherNotes || [];
                                                    
                                                    // Format voucher notes to match regular notes structure
                                                    const formattedVoucherNotes = voucherNotes.map(vn => ({
                                                        ...vn,
                                                        notes: vn.note, // Map 'note' field to 'notes' field for consistency
                                                        source: 'voucher'
                                                    }));
                                                    
                                                    // Combine and sort by date (newest first)
                                                    const allNotes = [...regularNotes, ...formattedVoucherNotes].sort((a, b) => 
                                                        new Date(b.date || b.created_at) - new Date(a.date || a.created_at)
                                                    );
                                                    
                                                    console.log('📝 Displaying notes:', {
                                                        regularNotes: regularNotes.length,
                                                        voucherNotes: voucherNotes.length,
                                                        totalNotes: allNotes.length,
                                                        allNotes
                                                    });
                                                    
                                                    return allNotes.length > 0 ? allNotes.map((n, i) => (
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
                                                                <Button size="small" color="primary" variant="contained" sx={{ mr: 1 }} onClick={() => handleSaveNoteEdit(n.id, n)}>Save</Button>
                                                                <Button size="small" variant="outlined" onClick={handleCancelNoteEdit}>Cancel</Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                        <Typography>{n.notes}</Typography>
                                                                <Button size="small" sx={{ position: 'absolute', right: 60, top: 8 }} onClick={() => handleEditNoteClick(n.id, n.notes)}>Edit</Button>
                                                                <Button size="small" color="error" sx={{ position: 'absolute', right: 8, top: 8 }} onClick={() => handleDeleteNote(n.id, n)}>Delete</Button>
                                                            </>
                                                        )}
                                                    </Box>
                                                )) : <Typography>No notes</Typography>;
                                                })()}
                                            </Box>
                                            <Divider sx={{ my: 2 }} />
                                            {/* Additional Information Section - Show for both bookings and vouchers */}
                                            {(additionalInformation || (activeTab === 'vouchers' && bookingDetail?.voucher)) && (
                                                <Box>
                                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Additional Information & Notes</Typography>
                                                    {console.log('🔍 Additional Information Debug:', {
                                                        additionalInformation,
                                                        questions: additionalInformation?.questions,
                                                        questionsLength: additionalInformation?.questions?.length,
                                                        answers: additionalInformation?.answers,
                                                        additional_information_json: additionalInformation?.additional_information_json,
                                                        activeTab,
                                                        isVoucher: activeTab === 'vouchers',
                                                        voucherData: activeTab === 'vouchers' ? bookingDetail?.voucher : null,
                                                        voucherAdditionalInfo: activeTab === 'vouchers' ? bookingDetail?.voucher?.additional_information : null,
                                                        voucherAdditionalInfoJson: activeTab === 'vouchers' ? bookingDetail?.voucher?.additional_information_json : null,
                                                        fullVoucherData: activeTab === 'vouchers' ? JSON.stringify(bookingDetail?.voucher, null, 2) : null
                                                    })}
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
                                                            {(() => {
                                                                // Use additionalInformation if available, otherwise try to get from voucher data
                                                                const questions = additionalInformation?.questions || 
                                                                                 (activeTab === 'vouchers' && bookingDetail?.voucher?.additional_information?.questions) || 
                                                                                 [];
                                                                const answers = additionalInformation?.answers || 
                                                                               (activeTab === 'vouchers' && bookingDetail?.voucher?.additional_information?.answers) || 
                                                                               [];
                                                                const additionalInfoJson = additionalInformation?.additional_information_json || 
                                                                                           (activeTab === 'vouchers' && bookingDetail?.voucher?.additional_information_json) || 
                                                                                           {};
                                                                
                                                                console.log('🔍 Questions Debug:', {
                                                                    questions,
                                                                    questionsLength: questions?.length,
                                                                    answers,
                                                                    additionalInfoJson,
                                                                    fromAdditionalInformation: additionalInformation?.questions,
                                                                    fromVoucher: activeTab === 'vouchers' ? bookingDetail?.voucher?.additional_information?.questions : null
                                                                });
                                                                
                                                                return questions && questions.length > 0;
                                                            })() && (
                                                                <>
                                                                    {(() => {
                                                                        // Use additionalInformation if available, otherwise try to get from voucher data
                                                                        const questions = additionalInformation?.questions || 
                                                                                         (activeTab === 'vouchers' && bookingDetail?.voucher?.additional_information?.questions) || 
                                                                                         [];
                                                                        const answers = additionalInformation?.answers || 
                                                                                       (activeTab === 'vouchers' && bookingDetail?.voucher?.additional_information?.answers) || 
                                                                                       [];
                                                                        const additionalInfoJson = additionalInformation?.additional_information_json || 
                                                                                                   (activeTab === 'vouchers' && bookingDetail?.voucher?.additional_information_json) || 
                                                                                                   {};
                                                                        
                                                                        return questions.map((question, index) => {
                                                                        // Find answer from multiple sources to avoid duplication
                                                                        let answer = null;
                                                                        
                                                                        console.log(`🔍 Looking for answer for question ${question.id}: "${question.question_text}"`);
                                                                        
                                                                        // First try to find in answers array
                                                                        const answerFromAnswers = answers?.find(a => a.question_id === question.id);
                                                                        if (answerFromAnswers) {
                                                                            answer = answerFromAnswers.answer;
                                                                            console.log(`✅ Found answer in answers array: "${answer}"`);
                                                                        }
                                                                        
                                                                        // If not found in answers, try JSON data
                                                                        if (!answer && additionalInfoJson) {
                                                                            const jsonKey = `question_${question.id}`;
                                                                            if (additionalInfoJson[jsonKey]) {
                                                                                answer = additionalInfoJson[jsonKey];
                                                                                console.log(`✅ Found answer in additionalInfoJson: "${answer}"`);
                                                                            }
                                                                        }
                                                                        
                                                                        // For vouchers, also check the voucher's additional_information_json directly
                                                                        if (!answer && activeTab === 'vouchers' && bookingDetail?.voucher?.additional_information_json) {
                                                                            let voucherJson = bookingDetail.voucher.additional_information_json;
                                                                            if (typeof voucherJson === 'string') {
                                                                                try {
                                                                                    voucherJson = JSON.parse(voucherJson);
                                                                                } catch (e) {
                                                                                    console.warn('Failed to parse voucher additional_information_json:', e);
                                                                                    voucherJson = {};
                                                                                }
                                                                            }
                                                                            
                                                                            const jsonKey = `question_${question.id}`;
                                                                            if (voucherJson && voucherJson[jsonKey]) {
                                                                                answer = voucherJson[jsonKey];
                                                                                console.log(`✅ Found answer in voucher JSON: "${answer}"`);
                                                                            }
                                                                        }
                                                                        
                                                                        // If still not found, try legacy fields for specific questions
                                                                        const legacy = additionalInformation?.legacy || (activeTab === 'vouchers' && bookingDetail?.voucher?.additional_information?.legacy) || {};
                                                                        if (!answer && legacy) {
                                                                            if (question.question_text.toLowerCase().includes('hear about us') && legacy.hear_about_us) {
                                                                                answer = legacy.hear_about_us;
                                                                                console.log(`✅ Found answer in legacy hear_about_us: "${answer}"`);
                                                                            } else if (question.question_text.toLowerCase().includes('ballooning') && legacy.ballooning_reason) {
                                                                                answer = legacy.ballooning_reason;
                                                                                console.log(`✅ Found answer in legacy ballooning_reason: "${answer}"`);
                                                                            } else if (question.question_text.toLowerCase().includes('prefer') && legacy.prefer) {
                                                                                answer = legacy.prefer;
                                                                                console.log(`✅ Found answer in legacy prefer: "${answer}"`);
                                                                            }
                                                                        }
                                                                        
                                                                        if (!answer) {
                                                                            console.log(`❌ No answer found for question ${question.id}`);
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
                                                                        });
                                                                    })()}
                                                                </>
                                                            )}
                                                            
                                                            {/* Show message if no questions available */}
                                                            {(() => {
                                                                const questions = additionalInformation?.questions || 
                                                                                 (activeTab === 'vouchers' && bookingDetail?.voucher?.additional_information?.questions) || 
                                                                                 [];
                                                                return (!questions || questions.length === 0);
                                                            })() && (
                                                                <Typography sx={{ fontStyle: 'italic', color: '#666' }}>No additional information questions available</Typography>
                                                            )}
                                                        </Box>
                                                    )}
                                                </Box>
                                            )}
                                            
                                            {/* Add To Booking Items Section - Only for vouchers */}
                                            {activeTab === 'vouchers' && bookingDetail?.voucher?.add_to_booking_items && (
                                                <Box>
                                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Add To Booking Items</Typography>
                                                    {(() => {
                                                        const addToBookingItems = bookingDetail.voucher.add_to_booking_items;
                                                        console.log('🔍 Add to booking items data:', addToBookingItems);
                                                        let parsedItems = [];
                                                        
                                                        if (typeof addToBookingItems === 'string') {
                                                            try {
                                                                parsedItems = JSON.parse(addToBookingItems);
                                                            } catch (e) {
                                                                console.warn('Failed to parse add_to_booking_items:', e);
                                                                parsedItems = [];
                                                            }
                                                        } else if (Array.isArray(addToBookingItems)) {
                                                            parsedItems = addToBookingItems;
                                                        }
                                                        
                                                        if (parsedItems && parsedItems.length > 0) {
                                                            return (
                                                                <Box>
                                                                    {parsedItems.map((item, index) => (
                                                                        <Box key={index} sx={{ mb: 2, p: 2, background: '#f0f8ff', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                                                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1976d2' }}>
                                                                                {item.name || item.title || `Item ${index + 1}`}
                                                                            </Typography>
                                                                            {item.description && (
                                                                                <Typography sx={{ color: '#666', mb: 1 }}>
                                                                                    {item.description}
                                                                                </Typography>
                                                                            )}
                                                                            {item.price && (
                                                                                <Typography sx={{ color: '#333', fontWeight: 500 }}>
                                                                                    Price: £{item.price}
                                                                                </Typography>
                                                                            )}
                                                                        </Box>
                                                                    ))}
                                                                </Box>
                                                            );
                                                        } else {
                                                            return (
                                                                <Typography sx={{ fontStyle: 'italic', color: '#666' }}>No add-to-booking items selected</Typography>
                                                            );
                                                        }
                                                    })()}
                                                </Box>
                                            )}
                                            
                                            {/* Choose Add-On Section - Only for vouchers */}
                                            {activeTab === 'vouchers' && bookingDetail?.voucher?.choose_add_on && (
                                                <Box sx={{ mt: 2 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Selected Add-Ons</Typography>
                                                    {(() => {
                                                        const chooseAddOn = bookingDetail.voucher.choose_add_on;
                                                        console.log('🔍 Choose add-on data:', chooseAddOn);
                                                        let parsedAddOns = [];
                                                        
                                                        if (typeof chooseAddOn === 'string') {
                                                            try {
                                                                parsedAddOns = JSON.parse(chooseAddOn);
                                                            } catch (e) {
                                                                console.warn('Failed to parse choose_add_on:', e);
                                                                parsedAddOns = [];
                                                            }
                                                        } else if (Array.isArray(chooseAddOn)) {
                                                            parsedAddOns = chooseAddOn;
                                                        }
                                                        
                                                        if (parsedAddOns && parsedAddOns.length > 0) {
                                                            return (
                                                                <Box>
                                                                    {parsedAddOns.map((addon, index) => (
                                                                        <Box key={index} sx={{ mb: 2, p: 2, background: '#f0f8ff', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                                                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1976d2' }}>
                                                                                {addon.name || addon.title || `Add-On ${index + 1}`}
                                                                            </Typography>
                                                                            {addon.description && (
                                                                                <Typography sx={{ color: '#666', mb: 1 }}>
                                                                                    {addon.description}
                                                                                </Typography>
                                                                            )}
                                                                            {addon.price && (
                                                                                <Typography sx={{ color: '#333', fontWeight: 500 }}>
                                                                                    Price: £{addon.price}
                                                                                </Typography>
                                                                            )}
                                                                        </Box>
                                                                    ))}
                                                                </Box>
                                                            );
                                                        } else {
                                                            return (
                                                                <Typography sx={{ fontStyle: 'italic', color: '#666' }}>No add-ons selected</Typography>
                                                            );
                                                        }
                                                    })()}
                                                </Box>
                                            )}
                                            
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
                                                                <TableCell>{bookingDetail.booking?.flight_date ? dayjs(bookingDetail.booking.flight_date).format('DD/MM/YYYY') : '-'}</TableCell>
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
                                    {/* Recipient Details - Only show if there's meaningful data */}
                                    {(() => {
                                        const v = bookingDetail.voucher || {};
                                        const hasRecipientData = v.recipient_name || v.recipient_email || v.recipient_phone || v.recipient_gift_date;
                                        return hasRecipientData ? (
                                            <Grid item xs={12} md={4}>
                                                <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Recipient Details</Typography>
                                                    <Typography><b>Name:</b> {v.recipient_name || '-'}</Typography>
                                                    <Typography><b>Email:</b> {v.recipient_email || '-'}</Typography>
                                                    <Typography><b>Phone:</b> {v.recipient_phone || '-'}</Typography>
                                                    <Typography><b>Gift Date:</b> {v.recipient_gift_date ? dayjs(v.recipient_gift_date).format('DD/MM/YYYY') : '-'}</Typography>
                                                </Box>
                                            </Grid>
                                        ) : null;
                                    })()}
                                    
                                    {/* Preferences - Only show if there's meaningful data */}
                                    {(() => {
                                        const v = bookingDetail.voucher || {};
                                        const hasPreferencesData = v.preferred_location || v.preferred_time || v.preferred_day;
                                        return hasPreferencesData ? (
                                            <Grid item xs={12} md={4}>
                                                <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Preferences</Typography>
                                                    <Typography><b>Preferred Location:</b> {v.preferred_location || '-'}</Typography>
                                                    <Typography><b>Preferred Time:</b> {v.preferred_time || '-'}</Typography>
                                                    <Typography><b>Preferred Day:</b> {v.preferred_day || '-'}</Typography>
                                                </Box>
                                            </Grid>
                                        ) : null;
                                    })()}
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
                        <Typography sx={{ mb: 2 }}>Experience: <b>{guestType}</b></Typography>
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
                    bookingDetail={bookingDetail}
                />
            </Container>
        </div>
    );
};

export default BookingPage;