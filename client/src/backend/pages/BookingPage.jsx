import axios from "axios";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import PaginatedTable from "../components/BookingPage/PaginatedTable";
import { Container, FormControl, InputLabel, MenuItem, OutlinedInput, Select, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Grid, Typography, Box, Divider, IconButton, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, FormControlLabel, Switch, FormGroup, Checkbox, Chip, InputAdornment, useTheme, useMediaQuery } from "@mui/material";
import dayjs from 'dayjs';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import RebookAvailabilityModal from '../components/BookingPage/RebookAvailabilityModal';
import {
    getDefaultEmailTemplateContent,
    getDefaultTemplateMessageHtml,
    extractMessageFromTemplateBody,
    buildEmailHtml,
    replaceSmsPrompts
} from '../utils/emailTemplateUtils';
import { getAssignedResourceInfo } from '../utils/resourceAssignment';

const BookingPage = () => {
    // Mobile detection
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
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
        // Advanced multi-select filters for All Bookings (Filter popup)
        statusMulti: [],
        voucherTypeMulti: [],
        locationMulti: [],
    });

    const experienceMatchesFilter = (flightTypeValue = '', filterValue = '') => {
        if (!filterValue) return true;
        const flightType = flightTypeValue.toString().toLowerCase();
        const filter = filterValue.toString().toLowerCase();
        if (filter.includes('shared')) return flightType.includes('shared');
        if (filter.includes('private')) return flightType.includes('private');
        return flightType.includes(filter);
    };

    // Advanced filter dialog state
    const [filterDialogOpen, setFilterDialogOpen] = useState(false);

    // Dynamic filter option lists for All Bookings tab
    const bookingStatusOptions = useMemo(() => {
        const set = new Set();
        booking.forEach(b => {
            const raw = (b.status || '').toString().trim();
            if (!raw) return;
            const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
            set.add(normalized);
        });
        // Remove undesired statuses
        ['Confirmed', 'Flown', 'No show', 'Open', 'Waiting'].forEach(s => set.delete(s));
        return Array.from(set).sort();
    }, [booking]);

    const bookingVoucherTypeOptions = useMemo(() => {
        const set = new Set();
        booking.forEach(b => {
            const raw = (b.voucher_type || '').toString().trim();
            if (!raw) return;
            set.add(raw);
        });
        return Array.from(set).sort();
    }, [booking]);

    const bookingLocationOptions = useMemo(() => {
        const set = new Set();
        booking.forEach(b => {
            const raw = (b.location || '').toString().trim();
            if (!raw) return;
            set.add(raw);
        });
        return Array.from(set).sort();
    }, [booking]);

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

    const handleClearAdvancedFilters = () => {
        setFilters(prev => ({
            ...prev,
            statusMulti: [],
            voucherTypeMulti: [],
            locationMulti: [],
        }));
    };

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
    const assignedResource = useMemo(() => {
        if (!bookingDetail?.booking) return null;
        return getAssignedResourceInfo(bookingDetail);
    }, [bookingDetail]);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [detailError, setDetailError] = useState(null);
    const [bookingHistory, setBookingHistory] = useState([]);
    // Helper function to calculate expires date based on flight_attempts
    // If flight_attempts is a multiple of 3, add 6 months to expires date
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

    const buildDisplayedHistoryRows = () => {
        // Build history from booking_status_history and current booking
        const historyEntries = Array.isArray(bookingHistory) ? [...bookingHistory] : [];
        
        // Process all entries chronologically
        const processedRows = [];
        
        // Sort history entries by changed_at (oldest first)
        const sortedHistory = [...historyEntries]
            .filter(entry => entry && entry.status)
            .sort((a, b) => {
                const dateA = a.changed_at ? new Date(a.changed_at).getTime() : 0;
                const dateB = b.changed_at ? new Date(b.changed_at).getTime() : 0;
                return dateA - dateB;
            });
        
        // Process each history entry - each entry should keep its own flight_date
        sortedHistory.forEach(entry => {
            // Each entry should use its own flight_date from the database
            // Use entry.flight_date if available, otherwise use entry.changed_at as fallback
            const entryFlightDate = entry.flight_date || entry.changed_at;
            const status = entry.status;
            
            // Only process entries with valid flight dates and status
            if (entryFlightDate && status) {
                const isCancelled = status.toLowerCase() === 'cancelled';
            
            if (isCancelled) {
                    // Cancelled: Find the last Scheduled entry with the same flight_date and update it
                    // Use the Cancelled entry's own flight_date to find matching Scheduled entry
                    const cancelledDateKey = dayjs(entryFlightDate).format('YYYY-MM-DD HH:mm');
                    
                    // Search from the end to find the most recent Scheduled entry for this date
                    let foundScheduled = false;
                    for (let i = processedRows.length - 1; i >= 0; i--) {
                        const row = processedRows[i];
                        const rowDateKey = row.flight_date ? dayjs(row.flight_date).format('YYYY-MM-DD HH:mm') : '';
                        if (rowDateKey === cancelledDateKey && row.status && row.status.toLowerCase() !== 'cancelled') {
                            // Update this Scheduled entry to Cancelled, but keep the Scheduled entry's original flight_date
                            // This way the Cancelled row shows the same date as the Scheduled row it replaced
                            processedRows[i] = {
                                ...row,
                                status: 'Cancelled',
                                // Keep the Scheduled entry's flight_date (they should be the same date anyway)
                                flight_date: row.flight_date,
                                changed_at: entry.changed_at || row.changed_at
                            };
                            foundScheduled = true;
                            break; // Exit after updating
                        }
                    }
                    
                    // If no Scheduled entry found for this date, add Cancelled as new entry with its own flight_date
                    if (!foundScheduled) {
                        processedRows.push({
                            flight_date: entryFlightDate, // Use Cancelled entry's own flight_date
                            status: 'Cancelled',
                            changed_at: entry.changed_at || entryFlightDate
                        });
                    }
                } else {
                    // Scheduled or other non-Cancelled status: Check for duplicates before adding
                    const entryDateKey = dayjs(entryFlightDate).format('YYYY-MM-DD HH:mm');
                    const entryStatus = status.toLowerCase();
                    
                    // Check if an entry with the same flight_date and status already exists
                    const duplicateExists = processedRows.some(row => {
                        const rowDateKey = row.flight_date ? dayjs(row.flight_date).format('YYYY-MM-DD HH:mm') : '';
                        const rowStatus = row.status ? row.status.toLowerCase() : '';
                        return rowDateKey === entryDateKey && rowStatus === entryStatus;
                    });
                    
                    // Only add if it's not a duplicate
                    if (!duplicateExists) {
                        processedRows.push({
                            flight_date: entryFlightDate, // Use the flight_date from this specific entry
                            status: status,
                            changed_at: entry.changed_at || entryFlightDate
                        });
                    }
                }
            }
        });
        
        // Add current booking if it has a flight_date
        // But only if it doesn't already exist in processed rows to avoid duplicates
        if (bookingDetail?.booking?.flight_date) {
            const currentFlightDate = bookingDetail.booking.flight_date;
            const currentStatus = bookingDetail.booking.status || 'Scheduled';
            const dateKey = dayjs(currentFlightDate).format('YYYY-MM-DD HH:mm');
            const isCancelled = currentStatus.toLowerCase() === 'cancelled';
            
            // Check if current booking's status and flight_date already exists in processed rows
            const alreadyExists = processedRows.some(row => {
                const rowDateKey = row.flight_date ? dayjs(row.flight_date).format('YYYY-MM-DD HH:mm') : '';
                const rowStatus = row.status || '';
                return rowDateKey === dateKey && rowStatus.toLowerCase() === currentStatus.toLowerCase();
            });
            
            // Only add current booking if it doesn't already exist
            if (!alreadyExists) {
                if (isCancelled) {
                    // If Cancelled, update the last Scheduled entry for this date
                    // Search from the end to find the most recent Scheduled entry for this date
                    let foundScheduled = false;
                    for (let i = processedRows.length - 1; i >= 0; i--) {
                        const row = processedRows[i];
                        const rowDateKey = row.flight_date ? dayjs(row.flight_date).format('YYYY-MM-DD HH:mm') : '';
                        if (rowDateKey === dateKey && row.status && row.status.toLowerCase() !== 'cancelled') {
                            // Update this Scheduled entry to Cancelled, but keep its original flight_date
                            processedRows[i] = {
                                ...row,
                                status: 'Cancelled',
                                // Keep the original flight_date from the Scheduled entry
                                flight_date: row.flight_date,
                                changed_at: currentFlightDate
                            };
                            foundScheduled = true;
                            break;
                        }
                    }
                    if (!foundScheduled) {
                        // No Scheduled entry found, add Cancelled as new entry
                        processedRows.push({
                            flight_date: currentFlightDate,
                            status: 'Cancelled',
                            changed_at: currentFlightDate
                        });
                }
            } else {
                    // If Scheduled, add as new row only if it doesn't already exist
                    processedRows.push({
                        flight_date: currentFlightDate,
                        status: currentStatus,
                        changed_at: currentFlightDate
                    });
                }
            }
        }
        
        // Remove duplicates: If same flight_date and status exist, keep only the most recent one (by changed_at)
        const uniqueRowsMap = new Map();
        
        // Process all rows and keep the most recent one for each unique flight_date + status combination
        processedRows.forEach(row => {
            if (!row || !row.flight_date || !row.status) return;
            
            const dateKey = dayjs(row.flight_date).format('YYYY-MM-DD HH:mm');
            const statusKey = row.status.toLowerCase();
            const uniqueKey = `${dateKey}|${statusKey}`;
            
            // Get the changed_at timestamp for comparison
            const rowChangedAt = row.changed_at ? new Date(row.changed_at).getTime() : (row.flight_date ? new Date(row.flight_date).getTime() : 0);
            
            // If we haven't seen this combination, or if this one is more recent, keep it
            if (!uniqueRowsMap.has(uniqueKey)) {
                uniqueRowsMap.set(uniqueKey, row);
            } else {
                const existingRow = uniqueRowsMap.get(uniqueKey);
                const existingChangedAt = existingRow.changed_at ? new Date(existingRow.changed_at).getTime() : (existingRow.flight_date ? new Date(existingRow.flight_date).getTime() : 0);
                
                // Keep the row with the most recent changed_at
                if (rowChangedAt > existingChangedAt) {
                    uniqueRowsMap.set(uniqueKey, row);
                }
            }
        });
        
        // Convert map to array
        const uniqueRows = Array.from(uniqueRowsMap.values());
        
        // Sort all rows by changed_at (most recently changed/created first - at the top)
        // This ensures the most recent action appears at the top, regardless of flight_date
        return uniqueRows
            .filter(entry => entry && entry.flight_date && entry.status)
            .sort((a, b) => {
                // Use changed_at for sorting (when the entry was created/changed)
                const dateA = a.changed_at ? new Date(a.changed_at).getTime() : (a.flight_date ? new Date(a.flight_date).getTime() : 0);
                const dateB = b.changed_at ? new Date(b.changed_at).getTime() : (b.flight_date ? new Date(b.flight_date).getTime() : 0);
                return dateB - dateA; // Newest first (most recently changed at the top)
            });
    };
    const historyRows = buildDisplayedHistoryRows();

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
    const [editPassengerPrice, setEditPassengerPrice] = useState("");
    const [savingPassengerEdit, setSavingPassengerEdit] = useState(false);

    // Add to component state:
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editingNoteText, setEditingNoteText] = useState("");

    // Add to component state:



    // Loading states
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [loadingVouchers, setLoadingVouchers] = useState(false);
    
    // Debounce timer for filters
    const [filterDebounceTimer, setFilterDebounceTimer] = useState(null);

    // Add state for tracking passenger prices in edit mode
    const [editPassengerPrices, setEditPassengerPrices] = useState([]);

    // Add state for voucher passenger editing
    const [editingVoucherPassenger, setEditingVoucherPassenger] = useState(null); // { voucher_id, passenger_index }
    const [editVoucherPassengerFirstName, setEditVoucherPassengerFirstName] = useState("");
    const [editVoucherPassengerLastName, setEditVoucherPassengerLastName] = useState("");
    const [editVoucherPassengerWeight, setEditVoucherPassengerWeight] = useState("");
    const [editVoucherPassengerPrice, setEditVoucherPassengerPrice] = useState("");
    const [savingVoucherPassengerEdit, setSavingVoucherPassengerEdit] = useState(false);

    // Add to component state:
    const [selectedDateRequestIds, setSelectedDateRequestIds] = useState([]);
    
    // Additional information state
    const [additionalInformation, setAdditionalInformation] = useState(null);
    const [additionalInfoLoading, setAdditionalInfoLoading] = useState(false);

    // Email modal state
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [selectedBookingForEmail, setSelectedBookingForEmail] = useState(null);
    const [emailForm, setEmailForm] = useState({
        to: '',
        subject: '',
        message: '',
        template: 'custom'
    });
    const [personalNote, setPersonalNote] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailLogs, setEmailLogs] = useState([]);
    const [emailLogsLoading, setEmailLogsLoading] = useState(false);
    const [emailLogsPollId, setEmailLogsPollId] = useState(null);
    const [emailLogsContext, setEmailLogsContext] = useState(null);
    const [emailTemplates, setEmailTemplates] = useState([]);
    const [smsTemplates, setSmsTemplates] = useState([]);
    const [messagesModalOpen, setMessagesModalOpen] = useState(false);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [messageLogs, setMessageLogs] = useState([]);
    const [expandedMessageIds, setExpandedMessageIds] = useState({});
    
    // Payment History modal state
    const [paymentHistoryModalOpen, setPaymentHistoryModalOpen] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
    const [expandedPaymentIds, setExpandedPaymentIds] = useState({});
    
    // Refund modal state
    const [refundModalOpen, setRefundModalOpen] = useState(false);
    const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState(null);
    const [refundAmount, setRefundAmount] = useState('');
    const [refundComment, setRefundComment] = useState('');
    const [processingRefund, setProcessingRefund] = useState(false);
    
    // User Session modal state
    const [userSessionModalOpen, setUserSessionModalOpen] = useState(false);
    const [userSession, setUserSession] = useState(null);
    const [userSessionLoading, setUserSessionLoading] = useState(false);

    // Notification states for new entries
    const [hasNewBookings, setHasNewBookings] = useState(false);
    const [hasNewVouchers, setHasNewVouchers] = useState(false);
    const [lastViewedBookings, setLastViewedBookings] = useState([]);
    const [lastViewedVouchers, setLastViewedVouchers] = useState([]);

    // SMS state
    const [smsModalOpen, setSmsModalOpen] = useState(false);
    const [smsForm, setSmsForm] = useState({ to: '', message: '', template: 'custom' });
    const [smsPersonalNote, setSmsPersonalNote] = useState('');
    const [smsSending, setSmsSending] = useState(false);
    const [smsLogs, setSmsLogs] = useState([]);
    const [smsLogsLoading, setSmsLogsLoading] = useState(false);
    const [smsPollId, setSmsPollId] = useState(null);

    // Bulk selection for bookings
    const [selectedBookingIds, setSelectedBookingIds] = useState([]);
    const handleBookingSelectionChange = useCallback((selectedIds) => {
        setSelectedBookingIds(selectedIds);
    }, []);

    // Clean phone numbers (remove whitespace, dashes, parentheses) but keep international format
    const cleanPhoneNumber = (raw) => {
        if (!raw) return '';
        let s = String(raw).trim();
        // Replace whitespace, dashes, parentheses
        s = s.replace(/[\s\-()]/g, '');
        // Convert leading 00 to +
        if (s.startsWith('00')) s = '+' + s.slice(2);
        return s; // Return cleaned phone number as-is (no country code assumption)
    };

    const stripHtml = (input = '') => {
        if (!input) return '';
        return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    };

    const resolveTemplateName = (templateValue, dbTemplate) => {
        const dbName = dbTemplate?.name ? dbTemplate.name.trim() : '';
        if (dbName) return dbName;
        switch (templateValue) {
            case 'confirmation':
                return 'Booking Confirmation';
            case 'reminder':
                return 'Upcoming Flight Reminder';
            case 'reschedule':
                return 'Booking Rescheduled';
            case 'to_be_updated':
                return 'To Be Updated';
            case 'custom':
                return 'Custom Message';
            default:
                return dbName || 'Custom Message';
        }
    };

    const fetchMessageLogs = async ({ bookingId, recipientEmail, contextId } = {}) => {
        if (!bookingId && !recipientEmail && !contextId) return;
        setMessagesLoading(true);
        try {
            let url = '';
            if (bookingId) {
                url = `/api/bookingEmails/${bookingId}`;
            } else if (contextId) {
                url = `/api/voucherEmails/${encodeURIComponent(contextId)}`;
            } else {
                url = `/api/recipientEmails?email=${encodeURIComponent(recipientEmail)}`;
            }
            const resp = await axios.get(url);
            setMessageLogs(resp.data?.data || []);
        } catch (error) {
            console.error('Error fetching message history:', error);
            setMessageLogs([]);
        } finally {
            setMessagesLoading(false);
        }
    };

    const handleMessagesClick = (booking) => {
        if (!booking) return;
        setSelectedBookingForEmail(booking);
        setMessagesModalOpen(true);
        setExpandedMessageIds({});
        fetchMessageLogs({ bookingId: booking.id });
    };

    const handleVoucherMessagesClick = (voucher) => {
        if (!voucher) return;
        
        // Flight Voucher için email'i doğru al (recipient_email Gift Voucher için)
        const isGiftVoucher = voucher?.book_flight === 'Gift Voucher';
        const email = isGiftVoucher 
            ? (voucher.recipient_email || voucher.email || '')
            : (voucher.email || voucher.recipient_email || '');
        
        const isFlightVoucher = !isGiftVoucher && 
            (voucher?.book_flight === 'Flight Voucher' ||
            (voucher?.voucher_type && typeof voucher.voucher_type === 'string' && voucher.voucher_type.toLowerCase().includes('flight')));
        
        const fauxBooking = {
            id: voucher.id ? `voucher-${voucher.id}` : `voucher-${Date.now()}`,
            name: voucher.name || (isGiftVoucher ? voucher.recipient_name : voucher.purchaser_name) || 'Voucher Recipient',
            email: email,
            phone: isGiftVoucher 
                ? (voucher.recipient_phone || voucher.phone || '')
                : (voucher.phone || voucher.purchaser_phone || ''),
            voucher_type: voucher.voucher_type || '',
            voucher_code: voucher.voucher_ref || voucher.voucher_code || '',
            flight_type: voucher.flight_type || voucher.voucher_type || '',
            location: isFlightVoucher ? '-' : (voucher.location || voucher.preferred_location || ''), // Flight Voucher için "-"
            contextType: 'voucher',
            contextId: voucher.id ? `voucher-${voucher.id}` : `voucher-${Date.now()}`,
            is_flight_voucher: isFlightVoucher, // Flight Voucher işareti
            book_flight: isFlightVoucher ? 'Flight Voucher' : voucher.book_flight || '' // Flight Voucher işareti
        };

        setSelectedBookingForEmail(fauxBooking);
        setMessagesModalOpen(true);
        setExpandedMessageIds({});
        fetchMessageLogs({
            contextType: 'voucher',
            contextId: fauxBooking.contextId
        });
    };

    const toggleMessageExpand = (id) => {
        setExpandedMessageIds(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const fetchPaymentHistory = async (bookingId, voucherIdOrRef = null) => {
        setPaymentHistoryLoading(true);
        try {
            let paymentData = [];
            const existingIds = new Set();
            
            // For vouchers, ALWAYS fetch voucher-based payment history first
            // This ensures we get the voucher's own payment info (all_vouchers.paid)
            // This is especially important for Gift Vouchers where payment is tied to the voucher itself
            let hasVoucherPayments = false;
            if (voucherIdOrRef) {
                try {
                    console.log(`[PaymentHistory] Fetching voucher payment history for: ${voucherIdOrRef}`);
                    const voucherResponse = await axios.get(`/api/voucher-payment-history/${voucherIdOrRef}`);
                    const voucherPaymentData = voucherResponse.data?.data || [];
                    if (voucherPaymentData.length > 0) {
                        console.log(`[PaymentHistory] Found ${voucherPaymentData.length} records via voucher endpoint`);
                        paymentData = voucherPaymentData;
                        hasVoucherPayments = true;
                        // Track existing IDs to avoid duplicates
                        voucherPaymentData.forEach(p => {
                            if (p.id) existingIds.add(p.id);
                            if (p.stripe_session_id) existingIds.add(`session_${p.stripe_session_id}`);
                            if (p.stripe_charge_id) existingIds.add(`charge_${p.stripe_charge_id}`);
                        });
                    }
                } catch (voucherError) {
                    console.log('[PaymentHistory] Voucher payment history fetch failed:', voucherError?.message);
                }
            }
            
            // If we have a bookingId AND no voucher payments found, try booking-based payment history
            // IMPORTANT: If voucher payments exist, we should NOT fetch booking payments
            // to avoid showing payments from other transactions or duplicate entries
            if (bookingId && !hasVoucherPayments) {
                try {
                    const response = await axios.get(`/api/booking-payment-history/${bookingId}`);
                    const bookingPaymentData = response.data?.data || [];
                    
                    // Merge voucher and booking payment data (avoid duplicates)
                    if (bookingPaymentData.length > 0) {
                        const newPayments = bookingPaymentData.filter(p => {
                            const id = p.id || `session_${p.stripe_session_id}` || `charge_${p.stripe_charge_id}`;
                            if (existingIds.has(id) || existingIds.has(p.id) || 
                                (p.stripe_session_id && existingIds.has(`session_${p.stripe_session_id}`)) ||
                                (p.stripe_charge_id && existingIds.has(`charge_${p.stripe_charge_id}`))) {
                                return false;
                            }
                            existingIds.add(id);
                            if (p.id) existingIds.add(p.id);
                            if (p.stripe_session_id) existingIds.add(`session_${p.stripe_session_id}`);
                            if (p.stripe_charge_id) existingIds.add(`charge_${p.stripe_charge_id}`);
                            return true;
                        });
                        paymentData = [...paymentData, ...newPayments];
                        console.log(`[PaymentHistory] Found ${bookingPaymentData.length} records for booking ${bookingId}, added ${newPayments.length} new, total: ${paymentData.length}`);
                    }
                    
                    // Only sync if we have no payment history at all
                    // This prevents unnecessary slow sync operations when payment history already exists
                    if (paymentData.length === 0) {
                        try {
                            console.log(`[PaymentHistory] No payment history found, attempting sync for booking ${bookingId}...`);
                            await axios.post(`/api/sync-payment-history/${bookingId}`);
                            // Fetch again after sync to get any newly synced payments
                            const syncResponse = await axios.get(`/api/booking-payment-history/${bookingId}`);
                            const syncedData = syncResponse.data?.data || [];
                            if (syncedData.length > 0) {
                                paymentData = syncedData;
                                console.log(`[PaymentHistory] ✅ After sync, found ${syncedData.length} records`);
                            } else {
                                console.log(`[PaymentHistory] Sync completed, but no payment history found in database`);
                            }
                        } catch (syncError) {
                            console.log('[PaymentHistory] ⚠️ Sync failed (non-critical):', syncError?.response?.data?.message || syncError.message);
                            // Don't fail the entire fetch if sync fails - we still have existing payment data
                        }
                    } else {
                        console.log(`[PaymentHistory] Payment history already exists (${paymentData.length} records), skipping sync to improve performance`);
                    }
                } catch (bookingError) {
                    console.log('[PaymentHistory] Booking payment history fetch failed:', bookingError?.message);
                }
            }
            
            // If still no payment history and we have voucher info, try voucher-based payment history as final fallback
            // This handles cases where voucher payment wasn't found in initial fetch
            // IMPORTANT: Only fetch if we haven't already fetched voucher payments (to avoid duplicates)
            if (paymentData.length === 0 && voucherIdOrRef && !hasVoucherPayments) {
                try {
                    console.log(`[PaymentHistory] Trying voucher payment history as final fallback for: ${voucherIdOrRef}`);
                    const voucherResponse = await axios.get(`/api/voucher-payment-history/${voucherIdOrRef}`);
                    const voucherPaymentData = voucherResponse.data?.data || [];
                    if (voucherPaymentData.length > 0) {
                        console.log(`[PaymentHistory] Found ${voucherPaymentData.length} records via voucher endpoint (final fallback)`);
                        paymentData = voucherPaymentData;
                    }
                } catch (voucherError) {
                    console.log('[PaymentHistory] Voucher payment history fetch failed:', voucherError?.message);
                }
            }
            
            // Sort by created_at descending
            paymentData.sort((a, b) => {
                const dateA = new Date(a.created_at || 0);
                const dateB = new Date(b.created_at || 0);
                return dateB - dateA;
            });
            
            setPaymentHistory(paymentData);
        } catch (error) {
            console.error('Error fetching payment history:', error);
            setPaymentHistory([]);
        } finally {
            setPaymentHistoryLoading(false);
        }
    };

    const handleRefundClick = (payment) => {
        setSelectedPaymentForRefund(payment);
        setRefundAmount(parseFloat(payment.amount || 0).toFixed(2));
        setRefundComment('');
        setRefundModalOpen(true);
    };

    const handleRefundSubmit = async () => {
        if (!selectedPaymentForRefund) return;
        
        // Validate that this is a real payment entry (not synthetic voucher payment)
        const paymentId = selectedPaymentForRefund.id;
        const bookingId = selectedPaymentForRefund.booking_id;
        const voucherId = selectedPaymentForRefund.voucher_id;
        const voucherRef = selectedPaymentForRefund.voucher_ref;
        const stripeChargeId = selectedPaymentForRefund.stripe_charge_id || selectedPaymentForRefund.stripe_payment_intent_id;
        
        // Check if this is a synthetic payment (voucher payment entry)
        // Allow refunds for voucher payments if they have voucher_id or voucher_ref
        if (String(paymentId || '').startsWith('voucher_')) {
            alert('This payment cannot be refunded through this method. Please contact support for voucher refunds.');
            return;
        }
        
        // For voucher payments, allow refund even without stripe charge ID if voucher_id or voucher_ref exists
        // For booking payments, require stripe charge ID
        if (!stripeChargeId && !voucherId && !voucherRef) {
            alert('This payment cannot be refunded. Missing required payment information.');
            return;
        }
        
        // Must have either bookingId (for booking payments) or voucherId/voucherRef (for voucher payments)
        if (!bookingId && !voucherId && !voucherRef) {
            alert('Invalid payment entry. Cannot process refund.');
            return;
        }
        
        const amount = parseFloat(refundAmount);
        const maxAmount = parseFloat(selectedPaymentForRefund.amount || 0);
        
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid refund amount');
            return;
        }
        
        if (amount > maxAmount) {
            alert(`Refund amount cannot exceed £${maxAmount.toFixed(2)}`);
            return;
        }
        
        setProcessingRefund(true);
        try {
            const response = await axios.post('/api/refund-payment', {
                paymentId: paymentId,
                bookingId: bookingId,
                voucherId: voucherId,
                voucherRef: voucherRef,
                amount: amount,
                comment: refundComment,
                stripeChargeId: stripeChargeId
            });
            
            if (response.data.success) {
                alert('Refund processed successfully');
                setRefundModalOpen(false);
                setSelectedPaymentForRefund(null);
                setRefundAmount('');
                setRefundComment('');
                // Refresh payment history
                const refreshBookingId = bookingDetail?.voucher?.booking_id || bookingDetail?.booking?.id;
                const refreshVoucherRef = bookingDetail?.voucher?.voucher_ref || bookingDetail?.voucher?.id;
                if (refreshBookingId || refreshVoucherRef) {
                    fetchPaymentHistory(refreshBookingId, refreshVoucherRef);
                    // Refresh booking detail to update paid amount
                    if (refreshBookingId) {
                        fetchPassengers(refreshBookingId);
                    }
                }
            } else {
                alert(response.data.message || 'Failed to process refund');
            }
        } catch (error) {
            console.error('Error processing refund:', error);
            alert(error.response?.data?.message || 'Error processing refund. Please try again.');
        } finally {
            setProcessingRefund(false);
        }
    };

    const togglePaymentExpand = (id) => {
        setExpandedPaymentIds(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const getCardBrandLogo = (brand) => {
        const brandLower = (brand || '').toLowerCase();
        if (brandLower.includes('visa')) return 'VISA';
        if (brandLower.includes('mastercard') || brandLower.includes('master')) return 'MC';
        if (brandLower.includes('amex') || brandLower.includes('american')) return 'AMEX';
        if (brandLower.includes('discover')) return 'DISC';
        return brand?.toUpperCase() || 'CARD';
    };

    const fetchUserSession = async (bookingId) => {
        if (!bookingId) return;
        setUserSessionLoading(true);
        try {
            const response = await axios.get(`/api/booking-user-session/${bookingId}`);
            setUserSession(response.data?.data || null);
        } catch (error) {
            console.error('Error fetching user session:', error);
            setUserSession(null);
        } finally {
            setUserSessionLoading(false);
        }
    };

    const sanitizeMessageHtml = (html) => {
        if (!html) return '';
        return html
            .replace(/<!DOCTYPE[^>]*>/gi, '')
            .replace(/<\/?(html|head|body)[^>]*>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    };

    const getTemplateContentForLog = (log) => {
        const templateKey = log?.template_type;
        if (!templateKey) return '';

        const dbTemplate = emailTemplates.find(
            (t) => t.id?.toString() === templateKey?.toString()
        );
        const templateName = resolveTemplateName(templateKey, dbTemplate);

        if (dbTemplate) {
            const defaultContent = getDefaultEmailTemplateContent(
                { ...dbTemplate, name: templateName },
                selectedBookingForEmail
            );
            if (defaultContent?.body) {
                return defaultContent.body;
            }
        }

        const defaultMessage = getDefaultTemplateMessageHtml(templateName, selectedBookingForEmail);
        return defaultMessage;
    };

    const buildLogHtml = (log) => {
        let html = '';

        if (log?.message_html) {
            html = sanitizeMessageHtml(log.message_html);
        }

        if ((!html || !html.trim()) && log?.message_text) {
            html = `<div>${log.message_text.replace(/\n/g, '<br>')}</div>`;
        }

        if (!html || !html.trim()) {
            const defaultTemplateHtml = getTemplateContentForLog(log);
            if (defaultTemplateHtml) {
                html = sanitizeMessageHtml(defaultTemplateHtml);
            }
        }

        return html;
    };

    const buildCollapsedPreviewHtml = (log) => {
        const fullHtml = buildLogHtml(log);
        if (!fullHtml) return '';

        const plain = stripHtml(fullHtml);
        if (!plain) return fullHtml;

        const truncated =
            plain.length > 240 ? `${plain.slice(0, 240).trim()}…` : plain.trim();

        return truncated.replace(/\n/g, '<br>');
    };

    const getMessagePreview = (log) => {
        if (log?.message_html) {
            const sanitized = sanitizeMessageHtml(log.message_html);
            const mainIndex = sanitized.toLowerCase().indexOf('<main');
            if (mainIndex !== -1) {
                return sanitized.slice(mainIndex);
            }
            const dividerIndex = sanitized.toLowerCase().indexOf('<hr');
            const trimmed = dividerIndex !== -1 ? sanitized.slice(0, dividerIndex) : sanitized;
            return trimmed.trim() ? trimmed : sanitized;
        }
        const plain = log?.message_text ? log.message_text.trim() : '';
        return plain ? plain.replace(/\n/g, '<br>') : '';
    };

    const getStatusDisplay = (status) => {
        if (!status) return { label: 'Unknown', color: '#adb5bd' };
        const normalized = status.toLowerCase();
        if (normalized.includes('delivered') || normalized.includes('sent')) {
            return { label: 'Sent', color: '#28a745' };
        }
        if (normalized.includes('bounce')) {
            return { label: 'Bounced', color: '#dc3545' };
        }
        if (normalized.includes('open')) {
            return { label: 'Opened', color: '#0d6efd' };
        }
        return { label: status, color: '#6c757d' };
    };

    // Email handlers
    const handleEmailClick = (booking) => {
        if (!booking) return;
        openEmailModalForBooking(booking, { contextType: 'booking', contextId: String(booking.id || '') });
    };

    // Clear polling when modal closes
    useEffect(() => {
        if (!emailModalOpen && emailLogsPollId) {
            clearInterval(emailLogsPollId);
            setEmailLogsPollId(null);
        }
    }, [emailModalOpen]);

    const handleSendEmail = async () => {
        console.log('🔍 Current emailForm state:', emailForm);
        console.log('🔍 Personal note:', personalNote);
        
        const isBulk = selectedBookingIds && selectedBookingIds.length > 1;

        if (!isBulk && !emailForm.to) {
            alert('Recipient email is required');
            return;
        }

        if (!emailForm.subject) {
            alert('Subject is required. Please select a template.');
            return;
        }

        const dbTemplate = emailTemplates.find(
            (t) => t.id?.toString() === emailForm.template?.toString()
        );
        const templateName = resolveTemplateName(emailForm.template, dbTemplate);
        const finalHtml = buildEmailHtml({
            templateName,
            messageHtml: emailForm.message,
            booking: selectedBookingForEmail,
            personalNote
        });
        const finalText = stripHtml(finalHtml);

        console.log('📧 Sending email with data:', {
            to: emailForm.to,
            subject: emailForm.subject,
            messageLength: finalHtml?.length || 0,
            template: emailForm.template,
            mode: isBulk ? 'bulk' : 'single',
            selectedBookingIdsCount: selectedBookingIds?.length || 0
        });

        console.log('📄 Final HTML contains receipt:', /Receipt/i.test(finalHtml));

        setSendingEmail(true);
        try {

            if (isBulk) {
                // Bulk email to selected bookings
                const recipients = booking
                    .filter(b => selectedBookingIds.includes(b.id))
                    .map(b => (b.email || '').trim())
                    .filter(e => !!e);

                if (recipients.length === 0) {
                    alert('No valid email addresses found for selected bookings.');
                    return;
                }

                const response = await axios.post('/api/sendBulkBookingEmail', {
                    bookingIds: selectedBookingIds,
                    to: recipients,
                    subject: emailForm.subject,
                    message: finalHtml,
                    messageText: finalText,
                    template: emailForm.template,
                });

                if (response.data.success) {
                    alert(`Email sent to ${recipients.length} bookings successfully!`);
                    setEmailModalOpen(false);
                    setEmailForm({ to: '', subject: '', message: '', template: 'custom' });
                    setPersonalNote('');
                } else {
                    alert('Failed to send email: ' + response.data.message);
                }
            } else {
                // Single booking email (existing behaviour)
                const response = await axios.post('/api/sendBookingEmail', {
                    bookingId: selectedBookingForEmail.id,
                    to: emailForm.to,
                    subject: emailForm.subject,
                    message: finalHtml,
                    messageText: finalText,
                    template: emailForm.template,
                    bookingData: selectedBookingForEmail
                });

                if (response.data.success) {
                    alert('Email sent successfully!');
                    setEmailModalOpen(false);
                    setEmailForm({ to: '', subject: '', message: '', template: 'custom' });
                    setPersonalNote('');
                    if (emailLogsContext) {
                        fetchEmailLogsForParams(emailLogsContext);
                    }
                } else {
                    alert('Failed to send email: ' + response.data.message);
                }
            }
        } catch (error) {
            console.error('Error sending email:', error);
            alert('Error sending email: ' + (error.response?.data?.message || error.message));
        }
        setSendingEmail(false);
    };

    // Fetch email templates from database
    const fetchEmailTemplates = async () => {
        try {
            const response = await axios.get('/api/email-templates');
            if (response.data?.success) {
                setEmailTemplates(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching email templates:', error);
        }
    };

    // Fetch SMS templates from database
    const fetchSmsTemplates = async () => {
        try {
            const response = await axios.get('/api/sms-templates');
            if (response.data?.success) {
                const templates = response.data.data || [];
                console.log('📱 Fetched SMS templates:', templates);
                setSmsTemplates(templates);
            } else {
                console.warn('⚠️ SMS templates API returned unsuccessful response');
                setSmsTemplates([]);
            }
        } catch (error) {
            console.error('❌ Error fetching SMS templates:', error);
            setSmsTemplates([]);
        }
    };

    // Load email templates on mount
    useEffect(() => {
        fetchEmailTemplates();
        fetchSmsTemplates();
    }, []);

    const selectedEmailTemplate = useMemo(() => {
        if (!emailForm.template) return null;
        return (
            emailTemplates.find(
                (t) => t.id?.toString() === emailForm.template?.toString()
            ) || null
        );
    }, [emailForm.template, emailTemplates]);

    const previewHtml = useMemo(() => {
        if (!selectedBookingForEmail) {
            return '';
        }

        const dbTemplate = emailTemplates.find(
            (t) => t.id?.toString() === emailForm.template?.toString()
        );
        const templateName = resolveTemplateName(emailForm.template, dbTemplate);

        return buildEmailHtml({
            templateName,
            messageHtml: emailForm.message,
            booking: selectedBookingForEmail,
            personalNote
        });
    }, [emailForm.message, personalNote, emailForm.template, emailTemplates, selectedBookingForEmail]);

    // Auto-populate email form when template changes
    useEffect(() => {
        if (emailForm.template && emailTemplates.length > 0 && !emailForm.message) {
            console.log('🔄 Template set but message empty, populating from defaults');
            const dbTemplate = emailTemplates.find(
                (t) => t.id.toString() === emailForm.template.toString()
            );
            if (dbTemplate) {
                const defaultContent = getDefaultEmailTemplateContent(
                    dbTemplate,
                    selectedBookingForEmail
                );
                if (defaultContent) {
                    setEmailForm((prev) => ({
                        ...prev,
                        subject: defaultContent.subject || prev.subject,
                        message: defaultContent.body || ''
                    }));
                }
            }
        }
    }, [emailForm.template, emailTemplates, emailForm.message, selectedBookingForEmail]);

    const handleEmailTemplateChange = (templateValue) => {
        console.log('🎯 handleEmailTemplateChange called with:', templateValue);
        console.log('📚 Available templates:', emailTemplates);
        
        let subject = '';
        let message = '';

        const dbTemplate = emailTemplates.find(
            (t) => t.id.toString() === templateValue.toString()
        );
        const templateName = resolveTemplateName(templateValue, dbTemplate);
        console.log('🔍 Found template:', dbTemplate);
        
        if (dbTemplate) {
            subject = dbTemplate.subject || '';
            message = extractMessageFromTemplateBody(dbTemplate.body) || getDefaultTemplateMessageHtml(templateName, selectedBookingForEmail);
        } else {
            switch (templateValue) {
            case 'confirmation':
                subject = `Booking Confirmation - ${selectedBookingForEmail?.name || ''}`;
                message = getDefaultTemplateMessageHtml('Booking Confirmation', selectedBookingForEmail);
                break;
            case 'reminder':
                subject = `Flight Reminder - ${selectedBookingForEmail?.name || ''}`;
                message = getDefaultTemplateMessageHtml('Upcoming Flight Reminder', selectedBookingForEmail);
                break;
            case 'reschedule':
                subject = `Flight Rescheduling - ${selectedBookingForEmail?.name || ''}`;
                message = getDefaultTemplateMessageHtml('Booking Rescheduled', selectedBookingForEmail);
                break;
            case 'to_be_updated':
                subject = `Flight update`;
                message = getDefaultTemplateMessageHtml('To Be Updated', selectedBookingForEmail) || '';
                break;
            default:
                subject = `Regarding your Fly Away Ballooning booking - ${selectedBookingForEmail?.name || ''}`;
                message = getDefaultTemplateMessageHtml(templateName, selectedBookingForEmail) || '';
            }
        }

        setEmailForm((prev) => ({
            ...prev,
            subject,
            message,
            template: templateValue
        }));
    };

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

    // Helper: Enrich booking rows with voucher_type coming from vouchers (for redeemed vouchers)
    const enrichBookingsWithVoucherInfo = (bookings) => {
        if (!Array.isArray(bookings) || bookings.length === 0) return bookings;
        if (!Array.isArray(voucher) || voucher.length === 0) return bookings;

        // Build maps:
        // 1) booking_id -> voucher_type
        // 2) voucher_code/ref -> voucher_type
        const voucherTypeByBookingId = new Map();
        const voucherTypeByCode = new Map();

        voucher.forEach((v) => {
            const src = v._original || v;
            const bookingId = src?.booking_id || v.booking_id;

            const codeRaw =
                v.voucher_ref ||
                src?.voucher_ref ||
                src?.vc_code ||
                src?.voucher_code ||
                '';
            const code = typeof codeRaw === 'string' ? codeRaw.trim().toUpperCase() : String(codeRaw || '').trim().toUpperCase();

            // Prefer the concrete voucher type ("Weekday Morning", "Any Day Flight", etc.)
            const typeFromDetail =
                v.actual_voucher_type ||
                src?.actual_voucher_type ||
                src?.voucher_type_detail;
            const fallbackType =
                v.voucher_type ||
                src?.voucher_type ||
                v.book_flight ||
                src?.book_flight ||
                null;
            const finalType = (typeFromDetail || fallbackType || '').toString().trim();

            if (!finalType) return;

            if (bookingId && !voucherTypeByBookingId.has(bookingId)) {
                voucherTypeByBookingId.set(bookingId, finalType);
            }
            if (code && !voucherTypeByCode.has(code)) {
                voucherTypeByCode.set(code, finalType);
            }
        });

        if (voucherTypeByBookingId.size === 0 && voucherTypeByCode.size === 0) {
            return bookings;
        }

        return bookings.map((b) => {
            if (!b) return b;

            // If booking already has a voucher_type, keep it
            if (b.voucher_type && String(b.voucher_type).trim() !== '') {
                return b;
            }

            const bookingId = b.id;
            const bookingCodeRaw = b.voucher_code || '';
            const bookingCode =
                typeof bookingCodeRaw === 'string'
                    ? bookingCodeRaw.trim().toUpperCase()
                    : String(bookingCodeRaw || '').trim().toUpperCase();

            let typeFromVoucher = bookingId ? voucherTypeByBookingId.get(bookingId) : null;
            if (!typeFromVoucher && bookingCode) {
                typeFromVoucher = voucherTypeByCode.get(bookingCode);
            }

            if (!typeFromVoucher) return b;

            return {
                ...b,
                voucher_type: typeFromVoucher
            };
        });
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

    // Load data on component mount and check for notifications from localStorage
    useEffect(() => {
        voucherData();
        dateRequestedData();
        
        // Load last viewed IDs from localStorage
        const savedBookingIds = localStorage.getItem('lastViewedBookingIds');
        const savedVoucherIds = localStorage.getItem('lastViewedVoucherIds');
        
        if (savedBookingIds) {
            try {
                setLastViewedBookings(JSON.parse(savedBookingIds));
            } catch (e) {
                console.error('Error parsing saved booking IDs:', e);
                localStorage.removeItem('lastViewedBookingIds');
            }
        }
        if (savedVoucherIds) {
            try {
                setLastViewedVouchers(JSON.parse(savedVoucherIds));
            } catch (e) {
                console.error('Error parsing saved voucher IDs:', e);
                localStorage.removeItem('lastViewedVoucherIds');
            }
        }
    }, []);

    // Check for new bookings - show badge if there are new IDs not in lastViewed
    useEffect(() => {
        if (booking.length > 0) {
            const currentBookingIds = booking.map(b => b.id).filter(id => id != null);
            
            // If no last viewed data exists, don't show badge (first time user or cleared storage)
            if (lastViewedBookings.length === 0) {
                // Initialize with current IDs if user is on bookings tab
                if (activeTab === "bookings") {
                    setLastViewedBookings(currentBookingIds);
                    localStorage.setItem('lastViewedBookingIds', JSON.stringify(currentBookingIds));
                }
                setHasNewBookings(false);
            } else {
                // Check if there are any new bookings not in the last viewed list
                const newBookings = currentBookingIds.filter(id => !lastViewedBookings.includes(id));
                setHasNewBookings(newBookings.length > 0);
            }
        }
    }, [booking, lastViewedBookings, activeTab]);

    // Check for new vouchers - show badge if there are new IDs not in lastViewed
    useEffect(() => {
        if (voucher.length > 0) {
            const currentVoucherIds = voucher.map(v => v.id).filter(id => id != null);
            
            // If no last viewed data exists, don't show badge (first time user or cleared storage)
            if (lastViewedVouchers.length === 0) {
                // Initialize with current IDs if user is on vouchers tab
                if (activeTab === "vouchers") {
                    setLastViewedVouchers(currentVoucherIds);
                    localStorage.setItem('lastViewedVoucherIds', JSON.stringify(currentVoucherIds));
                }
                setHasNewVouchers(false);
            } else {
                // Check if there are any new vouchers not in the last viewed list
                const newVouchers = currentVoucherIds.filter(id => !lastViewedVouchers.includes(id));
                setHasNewVouchers(newVouchers.length > 0);
            }
        }
    }, [voucher, lastViewedVouchers, activeTab]);

    // Handle tab change and mark as viewed
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        
        // Mark as viewed and save to localStorage
        if (tab === "bookings" && booking.length > 0) {
            const bookingIds = booking.map(b => b.id);
            setLastViewedBookings(bookingIds);
            localStorage.setItem('lastViewedBookingIds', JSON.stringify(bookingIds));
            setHasNewBookings(false);
        } else if (tab === "vouchers" && voucher.length > 0) {
            const voucherIds = voucher.map(v => v.id);
            setLastViewedVouchers(voucherIds);
            localStorage.setItem('lastViewedVoucherIds', JSON.stringify(voucherIds));
            setHasNewVouchers(false);
        }
    };

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
    
    // Filters değiştiğinde sadece bookings tab için API çağrısı yap (debounced)
    useEffect(() => {
        // Clear existing timer
        if (filterDebounceTimer) {
            clearTimeout(filterDebounceTimer);
        }
        
        if (activeTab === "bookings") {
            setLoadingBookings(true);
            
            // Debounce the API call by 300ms
            const timer = setTimeout(async () => {
                try {
                    const response = await axios.get(`/api/getAllBookingData`, { params: filters });
                    const bookingData = response.data.data || [];

                    // Enrich bookings with voucher_type information from vouchers (for redeemed vouchers)
                    const enrichedBookings = enrichBookingsWithVoucherInfo(bookingData);

                    setBooking(enrichedBookings);
                    
                    // filteredBookingData'yı güncelle
                    setFilteredBookingData(enrichedBookings);
                    
                    // Eğer şu anda bookings tab'ındaysa, filteredData'yı da güncelle
                    if (activeTab === "bookings") {
                        setFilteredData(enrichedBookings);
                    }
                } catch (err) {
                    console.error('Error fetching booking data:', err);
                    setBooking([]);
                    setFilteredBookingData([]);
                    if (activeTab === "bookings") {
                        setFilteredData([]);
                    }
                } finally {
                    setLoadingBookings(false);
                }
            }, 300);
            
            setFilterDebounceTimer(timer);
        }
        
        // Cleanup function
        return () => {
            if (filterDebounceTimer) {
                clearTimeout(filterDebounceTimer);
            }
        };
    }, [filters, activeTab, voucher]);

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
                
                        // For Flight Voucher, use purchaser_name and purchaser_email
                        // For Gift Voucher, use purchaser_name and purchaser_email (purchaser is who bought the voucher)
                        // For other types, use name and email
                        const isFlightVoucher = item.book_flight === 'Flight Voucher';
                        const isGiftVoucher = item.book_flight === 'Gift Voucher';
                        const displayName = isFlightVoucher 
                            ? (item.purchaser_name || item.name || '')
                            : (isGiftVoucher 
                                ? (item.purchaser_name || item.name || '')
                                : (item.name || ''));
                        const displayEmail = isFlightVoucher 
                            ? (item.purchaser_email || item.email || '')
                            : (isGiftVoucher 
                                ? (item.purchaser_email || item.email || '')
                                : (item.email || ''));
                        const displayPhone = isFlightVoucher 
                            ? (item.purchaser_phone || item.purchaser_mobile || item.phone || item.mobile || '')
                            : (isGiftVoucher 
                                ? (item.purchaser_phone || item.purchaser_mobile || item.phone || item.mobile || '')
                                : (item.phone || item.mobile || ''));
                        
                        return {
                    created: formattedDate,
                    name: displayName,
                    flight_type: item.experience_type || '', // Updated field name
                    voucher_type: item.book_flight || '', // Updated field name
                    actual_voucher_type: item.voucher_type || '', // New field for actual voucher type
                    email: displayEmail,
                    phone: displayPhone,
                    expires: item.expires || '',
                    redeemed: item.redeemed || '',
                    paid: item.paid || '',
                    voucher_ref: item.voucher_ref || '',
                    flight_attempts: item.flight_attempts ?? 0,
                    booking_id: item.booking_id || null,
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
    // Ensure voucher code fields and counts are populated from getAllVoucherData result
    finalVoucherDetail.voucher.voucher_ref = voucherItem.voucher_ref || finalVoucherDetail.voucher.voucher_ref;
    finalVoucherDetail.voucher.vc_code = voucherItem.vc_code || finalVoucherDetail.voucher.vc_code;
    finalVoucherDetail.voucher.voucher_code = voucherItem.voucher_code || finalVoucherDetail.voucher.voucher_code;
    finalVoucherDetail.voucher.all_voucher_codes = voucherItem.all_voucher_codes || finalVoucherDetail.voucher.all_voucher_codes;
    finalVoucherDetail.voucher.numberOfVouchers = voucherItem.numberOfVouchers || finalVoucherDetail.voucher.numberOfVouchers || voucherItem.numberOfPassengers || finalVoucherDetail.voucher.numberOfPassengers;
    // Use paid information from getAllVoucherData instead of voucher detail API
    finalVoucherDetail.voucher.paid = voucherItem.paid || finalVoucherDetail.voucher.paid;
    // Copy booking_id from getAllVoucherData (linked booking for payment history)
    finalVoucherDetail.voucher.booking_id = voucherItem.booking_id || finalVoucherDetail.voucher.booking_id;
    // Copy booking_phone from getAllVoucherData (for Personal Details phone display)
    finalVoucherDetail.voucher.booking_phone = voucherItem.booking_phone || finalVoucherDetail.voucher.booking_phone;
    
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

    const handleVoucherRefClick = (voucherRow) => {
        const source = voucherRow?._original || voucherRow;
        let bookingId = source?.booking_id || source?.bookingId || null;

        const openBookingDetails = (id) => {
            if (activeTab !== 'bookings') {
                handleTabChange('bookings');
            }
            setDetailError(null);
            setBookingDetail(null);
            setSelectedBookingId(id);
            setDetailDialogOpen(true);
        };

        if (bookingId) {
            openBookingDetails(bookingId);
            return;
        }

        // Fallback: try to locate booking by voucher_code using dedicated endpoint
        const voucherRef =
            source?.voucher_ref ||
            source?.voucher_code ||
            source?.vc_code ||
            null;

        if (!voucherRef) {
            alert('No related booking found for this voucher yet.');
            return;
        }

        console.log('🔍 handleVoucherRefClick fallback search for voucher_ref:', voucherRef);

        // First try direct API to find booking by voucher_ref (handles redeem voucher linkage)
        axios
            .get('/api/findBookingByVoucherRef', { params: { voucher_ref: voucherRef } })
            .then(async (res) => {
                const booking = res?.data?.booking;
                if (booking?.id) {
                    openBookingDetails(booking.id);
                    return;
                }

                // Fallback to generic voucher_code lookup
                const fallbackRes = await axios.get('/api/getBookingByVoucherCode', {
                    params: { voucher_code: voucherRef }
                });

                let rows = Array.isArray(fallbackRes.data?.data)
                    ? fallbackRes.data.data
                    : (Array.isArray(fallbackRes.data) ? fallbackRes.data : []);

                // If no direct match by voucher_code, do NOT guess by name/email
                // to avoid opening wrong booking. Just inform the user.
                if (!rows || rows.length === 0) {
                    alert('No related booking found for this voucher yet.');
                    return;
                }

                // If multiple bookings are found for the same voucher code,
                // prefer redeem voucher bookings over others.
                let found =
                    rows.find(r => r.flight_type_source === 'Redeem Voucher') ||
                    rows.find(r => r.redeemed_voucher === 'Yes') ||
                    rows[0];
                if (!found?.id) {
                    alert('No related booking found for this voucher yet.');
                    return;
                }
                openBookingDetails(found.id);
            })
            .catch((err) => {
                console.error('Error searching booking by voucher_code:', err);
                alert('No related booking found for this voucher yet.');
            });
    };

    useEffect(() => {
        if (detailDialogOpen && selectedBookingId) {
            setLoadingDetail(true);
            setDetailError(null);
            
            // Use fetchPassengers instead of direct axios call to ensure price recalculation
            fetchPassengers(selectedBookingId)
                .then(async () => {
                    // Also fetch booking history
                    const historyRes = await axios.get(`/api/getBookingHistory?booking_id=${selectedBookingId}`);
                    setBookingHistory(historyRes.data.history || []);
                })
                .catch(err => {
                    console.error('Error loading booking details:', err);
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
        // For vouchers, use voucher.flight_type; for bookings, use booking.flight_type
        const flightType = bookingDetail.booking?.flight_type || bookingDetail.voucher?.flight_type || 'Shared Flight';
        setGuestType(flightType);
        setGuestCount(0);
        setGuestForms(Array.from({ length: guestCount }, () => ({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            ticketType: guestType,
            weight: '',
            weatherRefund: false
        })));
        setAddGuestDialogOpen(true);
    };

    // Kişi sayısı seçilince passenger formu oluştur
    useEffect(() => {
        if (guestCount > 0) {
            setGuestForms(Array.from({ length: guestCount }, () => ({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                ticketType: guestType,
                weight: '',
                weatherRefund: false
            })));
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
        console.log('=== handleSaveGuests CALLED ===');
        console.log('selectedBookingId:', selectedBookingId);
        console.log('activeTab:', activeTab);
        console.log('bookingDetail:', bookingDetail);
        console.log('guestForms:', guestForms);
        
        if (!selectedBookingId && !bookingDetail?.voucher?.id) {
            alert('No booking or voucher selected');
            return;
        }
        
        try {
            // Check if this is a voucher or booking
            const isVoucher = activeTab === 'vouchers';
            const voucherId = bookingDetail?.voucher?.id;
            
            console.log('isVoucher:', isVoucher);
            console.log('voucherId:', voucherId);
            
            if (isVoucher && voucherId) {
                console.log('=== ADDING GUESTS TO VOUCHER ===');
                // Handle voucher guest addition
                
                if (guestForms.length === 0) {
                    alert('Please add at least one guest');
                    return;
                }
                
                // Add each guest to voucher
                for (const g of guestForms) {
                    if (!g.firstName || !g.lastName) {
                        alert('Please fill in first name and last name for all guests');
                        return;
                    }
                    
                    console.log('Adding guest:', { firstName: g.firstName, lastName: g.lastName, weight: g.weight });
                    
                    const response = await axios.post('/api/addVoucherPassenger', {
                        voucher_id: voucherId,
                        first_name: g.firstName,
                        last_name: g.lastName,
                        weight: g.weight || null,
                        price: null // Will be calculated by backend
                    });
                    
                    console.log('API Response:', response.data);
                    
                    // Update local state immediately with the new passenger
                    if (response.data.success && response.data.passengerDetails) {
                        setBookingDetail(prev => {
                            const updated = {
                                ...prev,
                                voucher: {
                                    ...prev.voucher,
                                    passenger_details: response.data.passengerDetails,
                                    paid: response.data.passengerDetails.reduce((sum, p) => {
                                        const pPrice = parseFloat(p.price) || 0;
                                        return sum + pPrice;
                                    }, 0)
                                }
                            };
                            console.log('Updated bookingDetail:', updated);
                            return updated;
                        });
                    }
                }
                
                setAddGuestDialogOpen(false);
                setGuestCount(0);
                setGuestForms([]);
            } else {
                // Handle booking guest addition (existing logic)
            // Add each guest and collect updated pax counts
            let lastUpdatedPax = null;
            let lastNewDue = null;
            for (const g of guestForms) {
                const response = await axios.post('/api/addPassenger', {
                    booking_id: selectedBookingId,
                    first_name: g.firstName,
                    last_name: g.lastName,
                    email: g.email,
                    phone: g.phone,
                    ticket_type: g.ticketType,
                    weight: g.weight,
                    weather_refund: g.weatherRefund ? 1 : 0
                });
                lastUpdatedPax = response.data.updatedPax;
                if (response.data.newDue !== undefined) {
                    lastNewDue = response.data.newDue;
                }
            }
            
            // Fetch updated passengers
            const res = await axios.get(`/api/getBookingDetail?booking_id=${selectedBookingId}`);
            const updatedPassengers = res.data.passengers || [];
            
            // Get booking details after guest addition
            const paid = parseFloat(res.data.booking?.paid) || 0;
            const due = parseFloat(res.data.booking?.due) || 0;
            const experience = res.data.booking?.experience || '';
            const totalAmount = paid + due;
            const n = updatedPassengers.length;
            
            console.log('=== AFTER ADD GUEST ===');
            console.log('Experience:', experience);
            console.log('Paid:', paid);
            console.log('Due:', due);
            console.log('Total Amount:', totalAmount);
            console.log('Number of Passengers:', n);
            
            // For Private Charter, skip recalculation as backend already set correct due
            const isPrivateCharter = experience === 'Private Charter' || experience.includes('Private');
            
            if (!isPrivateCharter) {
                // For Shared Flight only: recalculate and update passenger prices
                const perPassenger = n > 0 ? parseFloat((totalAmount / n).toFixed(2)) : 0;
                
                console.log('=== RECALCULATING PASSENGER PRICES (SHARED FLIGHT) ===');
            console.log('Price Per Passenger:', perPassenger);
            
            // Update all passenger prices in backend
            await Promise.all(updatedPassengers.map((p) =>
                axios.patch('/api/updatePassengerField', {
                    passenger_id: p.id,
                    field: 'price',
                    value: perPassenger
                })
            ));
            } else {
                console.log('=== PRIVATE CHARTER - SKIPPING PASSENGER PRICE RECALCULATION ===');
            }
            
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
            }
        } catch (error) {
            console.error('Error adding guests:', error);
            alert('Failed to add guests. Please try again.');
        }
    };

    // Passenger listesini güncelleyen fonksiyon
    const fetchPassengers = async (bookingId) => {
        const res = await axios.get(`/api/getBookingDetail?booking_id=${bookingId}`);
        
        // Recalculate passenger prices based on paid + due
        const booking = res.data.booking;
        const passengers = res.data.passengers || [];
        
        if (booking && passengers.length > 0) {
            const paid = parseFloat(booking.paid) || 0;
            const due = parseFloat(booking.due) || 0;
            const totalAmount = paid + due;
            const n = passengers.length;
            const correctPricePerPassenger = n > 0 ? parseFloat((totalAmount / n).toFixed(2)) : 0;
            
            console.log('=== FETCH PASSENGERS - CHECKING PRICES ===');
            console.log('Paid:', paid);
            console.log('Due:', due);
            console.log('Total Amount:', totalAmount);
            console.log('Number of Passengers:', n);
            console.log('Correct Price Per Passenger:', correctPricePerPassenger);
            
            // Check if any passenger has incorrect price
            const needsUpdate = passengers.some(p => {
                const currentPrice = parseFloat(p.price) || 0;
                return Math.abs(currentPrice - correctPricePerPassenger) > 0.01; // Allow 1 cent difference for rounding
            });
            
            if (needsUpdate) {
                console.log('⚠️ Passenger prices are incorrect, updating...');
                
                // Update all passenger prices
                await Promise.all(passengers.map((p) =>
                    axios.patch('/api/updatePassengerField', {
                        passenger_id: p.id,
                        field: 'price',
                        value: correctPricePerPassenger
                    })
                ));
                
                console.log('✅ All passenger prices updated to:', correctPricePerPassenger);
                
                // Refetch to get updated data
                const updatedRes = await axios.get(`/api/getBookingDetail?booking_id=${bookingId}`);
                setBookingDetail(updatedRes.data);
                
                // Set additional information
                if (updatedRes.data.additional_information) {
                    setAdditionalInformation(updatedRes.data.additional_information);
                } else {
                    setAdditionalInformation(null);
                }
            } else {
                console.log('✅ Passenger prices are correct');
                setBookingDetail(res.data);
                
                // Set additional information
                if (res.data.additional_information) {
                    setAdditionalInformation(res.data.additional_information);
                } else {
                    setAdditionalInformation(null);
                }
            }
        } else {
            setBookingDetail(res.data);
            
            // Set additional information
            if (res.data.additional_information) {
                setAdditionalInformation(res.data.additional_information);
            } else {
                setAdditionalInformation(null);
            }
        }
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
                // Get new due from response if available
                const newDue = response.data.newDue !== undefined ? response.data.newDue : null;
                
                // Refetch the updated passenger list and booking details
                const res = await axios.get(`/api/getBookingDetail?booking_id=${selectedBookingId}`);
                const updatedPassengers = res.data.passengers || [];
                const updatedPax = updatedPassengers.length;
                const updatedDue = newDue !== null ? newDue : (res.data.booking?.due || 0);
                
                console.log('=== DELETE PASSENGER - FRONTEND UPDATE ===');
                console.log('Updated Pax:', updatedPax);
                console.log('New Due from backend:', newDue);
                console.log('Updated Due:', updatedDue);
                
                // Update the main booking table with the new pax count and due
                setBooking(prev => prev.map(b => 
                    b.id === selectedBookingId ? { ...b, pax: updatedPax, due: updatedDue } : b
                ));
                setFilteredData(prev => prev.map(b => 
                    b.id === selectedBookingId ? { ...b, pax: updatedPax, due: updatedDue } : b
                ));
                
                // Update bookingDetail state to reflect the new pax count and due immediately
                setBookingDetail(prev => ({
                    ...prev,
                    booking: {
                        ...prev.booking,
                        pax: updatedPax,
                        due: updatedDue
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
                
                // For Gift Vouchers, also update purchaser fields when name or email is updated
                const isGiftVoucher = bookingDetail?.voucher?.book_flight === 'Gift Voucher';
                if (isGiftVoucher && (editField === 'name' || editField === 'email')) {
                    const purchaserField = editField === 'name' ? 'purchaser_name' : 'purchaser_email';
                    console.log('Gift Voucher: Also updating', purchaserField, 'to match', editField);
                    
                    try {
                        if (window.currentVoucherSourceEdit === 'all_booking') {
                            // For booking-based vouchers, skip purchaser update (not applicable)
                            console.log('Skipping purchaser update for booking-based voucher');
                        } else {
                            await axios.patch('/api/updateVoucherField', {
                                voucher_id: voucherId,
                                field: purchaserField,
                                value: editValue
                            });
                            console.log('✅ Purchaser field updated:', purchaserField, '=', editValue);
                        }
                    } catch (err) {
                        console.error('Error updating purchaser field:', err);
                        // Don't fail the main update if purchaser update fails
                    }
                }
                
                // Local state güncelle
                setBookingDetail(prev => ({
                    ...prev,
                    voucher: {
                        ...prev.voucher,
                        [editField]: editValue,
                        // Also update purchaser fields in local state for Gift Vouchers
                        ...(isGiftVoucher && editField === 'name' ? { purchaser_name: editValue } : {}),
                        ...(isGiftVoucher && editField === 'email' ? { purchaser_email: editValue } : {})
                    }
                }));
                // Tabloyu güncelle
                setVoucher(prev => prev.map(v => {
                    if (v.id === voucherId) {
                        const updated = { ...v, [editField]: editValue };
                        // Also update purchaser fields in table for Gift Vouchers
                        if (isGiftVoucher && editField === 'name') {
                            updated.purchaser_name = editValue;
                        }
                        if (isGiftVoucher && editField === 'email') {
                            updated.purchaser_email = editValue;
                        }
                        return updated;
                    }
                    return v;
                }));
                setFilteredData(prev => prev.map(v => {
                    if (v.id === voucherId) {
                        const updated = { ...v, [editField]: editValue };
                        // Also update purchaser fields in filtered data for Gift Vouchers
                        if (isGiftVoucher && editField === 'name') {
                            updated.purchaser_name = editValue;
                        }
                        if (isGiftVoucher && editField === 'email') {
                            updated.purchaser_email = editValue;
                        }
                        return updated;
                    }
                    return v;
                }));
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
            
            // Tabloyu güncellemek için tekrar veri çek
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

    const getEmailLogParamsForEntity = (entity) => {
        if (!entity) return null;
        if (entity.contextType === 'voucher') {
            return { type: 'voucher', id: entity.contextId || entity.id };
        }
        if (entity.contextType === 'booking') {
            return { type: 'booking', id: entity.id };
        }
        if (entity.email) {
            return { type: 'email', email: entity.email };
        }
        return null;
    };

    const fetchEmailLogsForParams = async (params) => {
        if (!params) return;
        setEmailLogsLoading(true);
        try {
            let url = '';
            if (params.type === 'voucher') {
                url = `/api/voucherEmails/${encodeURIComponent(params.id)}`;
            } else if (params.type === 'booking') {
                url = `/api/bookingEmails/${params.id}`;
            } else if (params.type === 'email') {
                url = `/api/recipientEmails?email=${encodeURIComponent(params.email)}`;
            } else {
                return;
            }
            const resp = await axios.get(url);
            setEmailLogs(resp.data?.data || []);
        } catch (error) {
            console.error('Error fetching email logs:', error);
            setEmailLogs([]);
        } finally {
            setEmailLogsLoading(false);
        }
    };

    const startEmailLogPolling = (params) => {
        if (emailLogsPollId) {
            clearInterval(emailLogsPollId);
        }
        if (!params) return;
        const pollId = setInterval(() => {
            fetchEmailLogsForParams(params);
        }, 15000);
        setEmailLogsPollId(pollId);
    };

    const openEmailModalForBooking = (booking, options = {}) => {
        if (!booking) return;
        const contextType = options.contextType || booking.contextType || 'booking';
        const contextId = options.contextId || booking.contextId || (booking.id ? String(booking.id) : '');
        const bookingWithContext = { ...booking, contextType, contextId };
        
        setSelectedBookingForEmail(bookingWithContext);
        
        console.log('📧 Opening email modal...');
        console.log('📚 Available emailTemplates:', emailTemplates);
        
        const preferredTemplateName = options.preferredTemplateName?.trim().toLowerCase();
        let selectedTemplate = null;

        if (preferredTemplateName) {
            selectedTemplate = emailTemplates.find(
                (t) => t.name?.trim().toLowerCase() === preferredTemplateName
            );
        }

        if (!selectedTemplate && emailTemplates.length > 0) {
            selectedTemplate = emailTemplates[0];
        }
        
        let subject = '';
        let message = '';
        let templateValue = 'custom';
        
        if (selectedTemplate) {
            templateValue = selectedTemplate.id;
            subject = selectedTemplate.subject || '';
            message =
                extractMessageFromTemplateBody(selectedTemplate.body) ||
                getDefaultTemplateMessageHtml(selectedTemplate.name, bookingWithContext);
            console.log('✅ Email form populated with template body:', {
                subject,
                bodyLength: (message || '').length,
                templateId: selectedTemplate.id
            });
        } else {
            subject = `Regarding your Fly Away Ballooning booking - ${bookingWithContext.name || ''}`;
            message = getDefaultTemplateMessageHtml('Custom Message', bookingWithContext) || '';
            console.log('⚠️ No templates available, using fallback');
        }
        
        setEmailForm({
            to: bookingWithContext.email || '',
            subject,
            message,
            template: templateValue
        });
        
        setPersonalNote('');
        setEmailModalOpen(true);

        const params = getEmailLogParamsForEntity(bookingWithContext);
        setEmailLogsContext(params);
        fetchEmailLogsForParams(params);
        startEmailLogPolling(params);
    };

    const handleEmailBooking = () => {
        if (!bookingDetail?.booking) return;
        
        const booking = bookingDetail.booking;
        
        // Ensure paid, due, subtotal fields are properly set for receipt
        const paidAmount = booking.paid != null ? parseFloat(booking.paid) : null;
        const dueAmount = booking.due != null ? parseFloat(booking.due) : null;
        const subtotal = (paidAmount != null && dueAmount != null) ? paidAmount + dueAmount : 
                        (paidAmount != null ? paidAmount : (dueAmount != null ? dueAmount : null));
        
        // Create booking object with all receipt fields
        const bookingWithReceipt = {
            ...booking,
            paid: paidAmount,
            due: dueAmount,
            subtotal: subtotal,
            total: subtotal,
            receipt_number: booking.receipt_number || booking.booking_reference || booking.id || '',
            passengers: bookingDetail.passengers || booking.passengers || []
        };
        
        openEmailModalForBooking(bookingWithReceipt, { contextType: 'booking', contextId: String(booking.id || '') });
    };

    const handleRecipientEmail = (voucher) => {
        if (!voucher || !voucher.recipient_email) {
            alert('Recipient email is not available.');
            return;
        }

        // Get paid amount from voucher
        const paidAmount = parseFloat(voucher.paid) || 0;
        const dueAmount = parseFloat(voucher.due) || 0;
        const subtotal = paidAmount + dueAmount;

        const linkedBookingId = voucher.booking_id || voucher.bookingId || null;
        const syntheticId = voucher.id ? `voucher-${voucher.id}` : `voucher-${Date.now()}`;

        const voucherFlightAttempts = Number.isFinite(parseInt(voucher.flight_attempts, 10))
            ? parseInt(voucher.flight_attempts, 10)
            : 0;

        const fauxBooking = {
            id: linkedBookingId || syntheticId,
            booking_id: linkedBookingId || undefined,
            bookingId: linkedBookingId || undefined,
            linked_booking_id: linkedBookingId || undefined,
            name: voucher.recipient_name || voucher.name || 'Recipient',
            email: voucher.recipient_email,
            phone: voucher.recipient_phone || '',
            voucher_type: voucher.voucher_type || '',
            voucher_code: voucher.voucher_ref || voucher.voucher_code || '',
            flight_type: voucher.experience_type || voucher.flight_type || '',
            location: voucher.location || voucher.preferred_location || '',
            recipient_name: voucher.recipient_name || '',
            recipient_email: voucher.recipient_email || '',
            recipientPhone: voucher.recipient_phone || '',
            recipientName: voucher.recipient_name || '',
            recipient: {
                name: voucher.recipient_name || '',
                email: voucher.recipient_email || '',
                phone: voucher.recipient_phone || ''
            },
            paid: paidAmount,
            due: dueAmount,
            subtotal: subtotal,
            total: subtotal,
            receipt_number: voucher.voucher_ref || voucher.voucher_code || '',
            // Pass created_at field (may be in DD/MM/YYYY or DD/MM/YYYY HH:mm format)
            // getBookingConfirmationReceiptHtml will handle the formatting
            created_at: voucher.created_at || voucher.created || null,
            // Also pass created field directly if it exists (for DD/MM/YYYY format support)
            created: voucher.created || (voucher.created_at && typeof voucher.created_at === 'string' && voucher.created_at.includes('/') ? voucher.created_at.split(' ')[0] : null),
            passengers: voucher.passengers || [],
            customer_portal_url: voucher.customer_portal_url || voucher.portal_url || '',
            customerPortalToken: voucher.customerPortalToken || voucher.customer_portal_token || voucher.portal_token || '',
            flight_attempts: bookingDetail?.booking?.flight_attempts ?? voucherFlightAttempts,
            contextType: 'voucher',
            contextId: syntheticId
        };

        openEmailModalForBooking(fauxBooking, {
            preferredTemplateName: 'Received GV',
            contextType: 'voucher',
            contextId: fauxBooking.contextId
        });
    };

    const handleGiftVoucherEmail = () => {
        const voucher = bookingDetail?.voucher;
        if (!voucher) return;

        // Always target the purchaser for the main Email button inside Gift Voucher Details
        const purchaserEmail = voucher.purchaser_email || voucher.email || bookingDetail?.booking?.email;
        if (!purchaserEmail) {
            alert('No purchaser email available for this voucher.');
            return;
        }

        // Get paid amount from voucher (Gift Voucher Details'teki paid bilgisi)
        const paidAmount = parseFloat(voucher.paid) || 0;
        const dueAmount = parseFloat(voucher.due) || 0;
        const subtotal = paidAmount + dueAmount;

        const fallbackBookingId = bookingDetail?.booking?.id || null;
        const linkedBookingId = voucher.booking_id || fallbackBookingId || null;
        const syntheticId = voucher.id ? `voucher-${voucher.id}` : `voucher-${Date.now()}`;

        const voucherFlightAttempts = Number.isFinite(parseInt(voucher.flight_attempts, 10))
            ? parseInt(voucher.flight_attempts, 10)
            : 0;

        const fauxBooking = {
            id: linkedBookingId || syntheticId,
            booking_id: linkedBookingId || undefined,
            bookingId: linkedBookingId || undefined,
            linked_booking_id: linkedBookingId || undefined,
            name: voucher.purchaser_name || voucher.name || bookingDetail?.booking?.name || 'Guest',
            email: purchaserEmail,
            phone: voucher.purchaser_phone || voucher.phone || bookingDetail?.booking?.phone || '',
            flight_type: voucher.flight_type || voucher.voucher_type || '',
            location: voucher.location || voucher.preferred_location || '',
            voucher_type: voucher.voucher_type || '',
            voucher_code: voucher.voucher_ref || voucher.voucher_code || '',
            paid: paidAmount,
            due: dueAmount,
            subtotal: subtotal,
            total: subtotal,
            receipt_number: voucher.voucher_ref || voucher.voucher_code || '',
            // Pass created_at field (may be in DD/MM/YYYY or DD/MM/YYYY HH:mm format)
            // getBookingConfirmationReceiptHtml will handle the formatting
            created_at: voucher.created_at || voucher.created || null,
            // Also pass created field directly if it exists (for DD/MM/YYYY format support)
            created: voucher.created || (voucher.created_at && typeof voucher.created_at === 'string' && voucher.created_at.includes('/') ? voucher.created_at.split(' ')[0] : null),
            passengers: voucher.passengers || [],
            expires: voucher.expires || bookingDetail?.booking?.expires || null,
            customer_portal_url: voucher.customer_portal_url || voucher.portal_url || '',
            customerPortalToken: voucher.customerPortalToken || voucher.customer_portal_token || voucher.portal_token || '',
            flight_attempts: bookingDetail?.booking?.flight_attempts ?? voucherFlightAttempts,
            contextType: 'voucher',
            contextId: syntheticId
        };

        openEmailModalForBooking(fauxBooking, {
            preferredTemplateName: 'Gift Voucher Confirmation',
            contextType: 'voucher',
            contextId: fauxBooking.contextId
        });
    };

    const handleEmailFlightVoucher = () => {
        const voucher = bookingDetail?.voucher;
        if (!voucher) return;
        const email = voucher.email || bookingDetail?.booking?.email;
        if (!email) {
            alert('Voucher email is not available.');
            return;
        }

        // Get paid amount from voucher (Flight Voucher Details'teki paid bilgisi)
        const paidAmount = parseFloat(voucher.paid) || 0;
        const dueAmount = parseFloat(voucher.due) || 0;
        const subtotal = paidAmount + dueAmount;

        const fallbackBookingId = bookingDetail?.booking?.id || null;
        const linkedBookingId = voucher.booking_id || fallbackBookingId || null;
        const syntheticId = voucher.id ? `voucher-${voucher.id}` : `voucher-${Date.now()}`;

        const voucherFlightAttempts = Number.isFinite(parseInt(voucher.flight_attempts, 10))
            ? parseInt(voucher.flight_attempts, 10)
            : 0;

        const fauxBooking = {
            id: linkedBookingId || syntheticId,
            booking_id: linkedBookingId || undefined,
            bookingId: linkedBookingId || undefined,
            linked_booking_id: linkedBookingId || undefined,
            name: voucher.name || bookingDetail?.booking?.name || 'Guest',
            email,
            phone: voucher.phone || bookingDetail?.booking?.phone || '',
            flight_type: voucher.flight_type || voucher.voucher_type || '',
            location: '-',
            voucher_type: voucher.voucher_type || '',
            voucher_code: voucher.voucher_ref || voucher.voucher_code || '',
            paid: paidAmount,
            due: dueAmount,
            subtotal: subtotal,
            total: subtotal,
            receipt_number: voucher.voucher_ref || voucher.voucher_code || '',
            // Pass created_at field (may be in DD/MM/YYYY or DD/MM/YYYY HH:mm format)
            // getBookingConfirmationReceiptHtml will handle the formatting
            created_at: voucher.created_at || voucher.created || null,
            // Also pass created field directly if it exists (for DD/MM/YYYY format support)
            created: voucher.created || (voucher.created_at && typeof voucher.created_at === 'string' && voucher.created_at.includes('/') ? voucher.created_at.split(' ')[0] : null),
            passengers: voucher.passengers || [],
            expires: voucher.expires || bookingDetail?.booking?.expires || null,
            customer_portal_url: voucher.customer_portal_url || voucher.portal_url || '',
            customerPortalToken: voucher.customerPortalToken || voucher.customer_portal_token || voucher.portal_token || '',
            flight_attempts: bookingDetail?.booking?.flight_attempts ?? voucherFlightAttempts,
            contextType: 'voucher',
            contextId: syntheticId,
            is_flight_voucher: true, // Flight Voucher işareti
            book_flight: 'Flight Voucher' // Flight Voucher işareti
        };

        openEmailModalForBooking(fauxBooking, {
            preferredTemplateName: 'Flight Voucher Confirmation',
            contextType: 'voucher',
            contextId: fauxBooking.contextId
        });
    };

    const isGiftVoucherDetails = (voucher) => {
        if (!voucher) return false;
        const value = (voucher.book_flight || voucher.voucher_type || '').toLowerCase();
        return value.includes('gift');
    };

    const getVoucherDetailsTitle = (voucher) => {
        return isGiftVoucherDetails(voucher) ? 'Gift Voucher Details' : 'Flight Voucher Details';
    };

    const handleRebook = () => {
        setRebookModalOpen(true);
    };

    const handleRebookSlotSelect = async (date, time, activityId, selectedActivity, selectedLocation, selectedFlightTypes, selectedVoucherTypes, purchaserInfo) => {
        if (!bookingDetail) return;
        setRebookLoading(true);
        try {
            const voucherAttemptCount = bookingDetail?.voucher
                ? parseInt(bookingDetail.voucher.flight_attempts ?? 0, 10)
                : null;
            // Check if this is a Gift Voucher redemption
            const isGiftVoucher = bookingDetail?.voucher && 
                                 (bookingDetail.voucher.book_flight || '').toLowerCase().includes('gift');
            
            if (isGiftVoucher && bookingDetail.voucher) {
                try {
                    // Gift Voucher: Create booking and mark voucher as redeemed
                    console.log('Gift Voucher Redemption - Creating booking and marking as redeemed');
                    
                    const voucher = bookingDetail.voucher;
                    const voucherCodeCandidate = voucher.voucher_ref || voucher.voucher_code || voucher.vc_code;
                    const voucherCode = voucherCodeCandidate && !String(voucherCodeCandidate).toLowerCase().startsWith('voucher-')
                        ? voucherCodeCandidate
                        : null;
                    
                    // Get selected location from purchaserInfo
                    const selectedLocationForBooking = purchaserInfo?.selectedLocations?.[0] || '';
                    if (!selectedLocationForBooking) {
                        alert('Please select a location');
                        setRebookLoading(false);
                        return;
                    }
                    
                    // Get activity ID from purchaserInfo (passed from modal) or use activityId parameter
                    let finalActivityId = purchaserInfo?.activityId || activityId;
                    
                    if (!finalActivityId) {
                        alert('Activity ID not found');
                        setRebookLoading(false);
                        return;
                    }
                    
                    // Get activity details
                    const activityResponse = await axios.get(`/api/activity/${finalActivityId}`);
                    const activity = activityResponse.data.data;
                    
                    // Get experience and voucher_type from voucher details
                    // Experience: from experience_type field (e.g., "Shared Flight", "Private Charter")
                    const experience = voucher.experience_type || voucher.experience || 'Shared Flight';
                    
                    // Voucher Type: prioritize selectedVoucherTypes from Rebook popup, then fallback to voucher data
                    let voucherType = 'Any Day Flight';
                    if (selectedVoucherTypes && selectedVoucherTypes.length > 0) {
                        // Use the first selected voucher type (since only one can be selected)
                        // Convert key to proper format: 'weekday morning' -> 'Weekday Morning', 'any day flight' -> 'Any Day Flight'
                        const selected = selectedVoucherTypes[0];
                        // If it's a key (lowercase with spaces), convert to title case
                        if (selected && typeof selected === 'string') {
                            voucherType = selected.split(' ').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                            ).join(' ');
                        } else {
                            voucherType = selected;
                        }
                    } else {
                        // Fallback to voucher data
                        voucherType = voucher.voucher_type || voucher.actual_voucher_type || 'Any Day Flight';
                    }
                    
                    // Determine flight type from experience
                    let flightType = experience;
                    if (experience === 'Private Charter') {
                        flightType = 'Private Charter';
                    } else {
                        flightType = 'Shared Flight';
                    }
                    
                    // Prepare passenger data from purchaserInfo.passengerData
                    const passengers = purchaserInfo?.passengerData || [];
                    if (passengers.length === 0) {
                        alert('Passenger information is required');
                        setRebookLoading(false);
                        return;
                    }
                    
                    // Format date and time
                    const flightDate = dayjs(date).format('YYYY-MM-DD');
                    const flightDateTime = `${flightDate} ${time}`;
                    
                    // Get paid amount from voucher (Gift Voucher Details'teki paid bilgisi)
                    const paidAmount = voucher.paid || 0;
                    
                    // Calculate total price (use voucher paid amount as primary, fallback to activity pricing)
                    let totalPrice = paidAmount;
                    if (!totalPrice && activity) {
                        if (flightType === 'Shared Flight') {
                            totalPrice = (activity.shared_price || 0) * passengers.length;
                        } else {
                            totalPrice = activity.private_price || 0;
                        }
                    }
                    
                    // Get recipient email from voucher if available (for Gift Voucher)
                    const recipientEmail = voucher.recipient_email || '';
                    
                    // Prepare booking payload
                    const bookingPayloadBase = {
                        activitySelect: 'Redeem Voucher',
                        chooseLocation: selectedLocationForBooking,
                        chooseFlightType: {
                            type: flightType,
                            passengerCount: passengers.length
                        },
                        passengerData: passengers.map((p, index) => ({
                            firstName: p.firstName || '',
                            lastName: p.lastName || '',
                            weight: p.weight || '',
                            // Use recipient_email for first passenger if available, otherwise use passenger email
                            email: (index === 0 && recipientEmail) ? recipientEmail : (p.email || ''),
                            phone: p.mobile || '',
                            ticketType: flightType
                        })),
                        selectedDate: flightDateTime,
                        selectedTime: time,
                        totalPrice: totalPrice,
                        paid: paidAmount, // Add paid amount from Gift Voucher Details
                        ...(voucherCode ? { voucher_code: voucherCode } : {}),
                        flight_attempts: 0,
                        additionalInfo: {},
                        choose_add_on: [],
                        activity_id: finalActivityId, // Add activity_id for backend
                        experience: experience, // Add experience from voucher
                        voucher_type: voucherType, // Add voucher_type from voucher
                        selectedVoucherType: { title: voucherType } // Add selectedVoucherType for backend compatibility
                    };
                    
                    console.log('Gift Voucher Booking Payload:', bookingPayloadBase);
                    
                    const tryCreateGift = async (payload, skipVoucherCode) => {
                        const finalPayload = skipVoucherCode ? { ...payload, voucher_code: undefined } : payload;
                        return axios.post('/api/createBooking', finalPayload);
                    };

                    let createBookingResponse;
                    let usedVoucherCode = !!voucherCode;
                    try {
                        createBookingResponse = await tryCreateGift(bookingPayloadBase, false);
                    } catch (errCreate) {
                        const fkError = errCreate?.response?.data?.error || errCreate?.response?.data?.message || '';
                        if (fkError.toLowerCase().includes('foreign key constraint') || fkError.toLowerCase().includes('voucher_codes')) {
                            console.warn('Retrying createBooking without voucher_code due to FK error (Gift Voucher)');
                            createBookingResponse = await tryCreateGift(bookingPayloadBase, true);
                            usedVoucherCode = false;
                        } else {
                            throw errCreate;
                        }
                    }
                    
                    if (!createBookingResponse.data.success) {
                        throw new Error(createBookingResponse.data.message || 'Failed to create booking');
                    }
                    
                    console.log('Booking created successfully:', createBookingResponse.data);
                    
                    // Note: Voucher is already marked as redeemed by /api/createBooking endpoint
                    // when activitySelect === 'Redeem Voucher' and voucher_code exists
                    // But we'll also call /api/redeem-voucher as a backup to ensure it's marked
                    if (usedVoucherCode && voucherCode) {
                        try {
                            const redeemResponse = await axios.post('/api/redeem-voucher', {
                                voucher_code: voucherCode,
                                booking_id: createBookingResponse.data.bookingId || createBookingResponse.data.id
                            });
                            
                            if (!redeemResponse.data.success) {
                                console.warn('Warning: Could not mark voucher as redeemed via redeem-voucher endpoint:', redeemResponse.data.message);
                            } else {
                                console.log('Voucher marked as redeemed successfully via redeem-voucher endpoint');
                            }
                        } catch (redeemErr) {
                            console.warn('Warning: Error calling redeem-voucher endpoint (voucher may already be marked):', redeemErr.message);
                        }
                    }
                
                setRebookModalOpen(false);
                setDetailDialogOpen(false);
                    setSelectedBookingId(null);
                    setBookingDetail(null);
                    setBookingHistory([]);
                    
                    // Refresh all data
                    // Refresh booking data
                    const bookingResponse = await axios.get(`/api/getAllBookingData`, { params: filters });
                    setBooking(bookingResponse.data.data || []);
                    setFilteredBookingData(bookingResponse.data.data || []);
                
                // Refresh voucher data
                    const voucherResponse = await axios.get(`/api/getAllVoucherData`, { params: filters });
                    setVoucher(voucherResponse.data.data || []);
                    setFilteredVoucherData(voucherResponse.data.data || []);
                    
                    // Update filteredData based on active tab
                    if (activeTab === 'bookings') {
                        setFilteredData(bookingResponse.data.data || []);
                    } else if (activeTab === 'vouchers') {
                        setFilteredData(voucherResponse.data.data || []);
                    }
                    
                    alert('Gift Voucher successfully redeemed and booking created! Confirmation email has been sent.');
                    setRebookLoading(false);
                    return;
                } catch (error) {
                    console.error('Gift Voucher Redemption Error:', error);
                    alert('Error redeeming Gift Voucher: ' + (error.response?.data?.message || error.message || 'Unknown error'));
                    setRebookLoading(false);
                return;
                }
            }
            
            // Check if this is a Flight Voucher redemption
            // Flight Voucher: has voucher, book_flight is "Flight Voucher" or not "Gift Voucher", and voucher_type may contain "flight"
            const isFlightVoucher = bookingDetail?.voucher && 
                                   (bookingDetail.voucher.book_flight === 'Flight Voucher' || 
                                    (!(bookingDetail.voucher.book_flight || '').toLowerCase().includes('gift') && 
                                     bookingDetail.voucher.voucher_type));
            
            if (isFlightVoucher && bookingDetail.voucher) {
                try {
                    // Flight Voucher: Create booking and mark voucher as redeemed
                    console.log('Flight Voucher Redemption - Creating booking and marking as redeemed');
                    
                    const voucher = bookingDetail.voucher;
                    const rawVoucherCode = voucher.voucher_ref || voucher.voucher_code || voucher.vc_code;
                    const voucherCode = rawVoucherCode && !String(rawVoucherCode).toLowerCase().startsWith('voucher-')
                        ? rawVoucherCode
                        : null;
                    
                    // Get selected location from purchaserInfo or selectedLocation parameter
                    const selectedLocationForBooking = purchaserInfo?.selectedLocations?.[0] || selectedLocation || '';
                    if (!selectedLocationForBooking) {
                        alert('Please select a location');
                        setRebookLoading(false);
                        return;
                    }
                    
                    // Get activity ID from purchaserInfo (passed from modal) or use activityId parameter
                    let finalActivityId = purchaserInfo?.activityId || activityId;
                    
                    if (!finalActivityId) {
                        alert('Activity ID not found');
                        setRebookLoading(false);
                        return;
                    }
                    
                    // Get activity details
                    const activityResponse = await axios.get(`/api/activity/${finalActivityId}`);
                    const activity = activityResponse.data.data;
                    
                    // Get experience and voucher_type from voucher details
                    // Experience: from experience_type field (e.g., "Shared Flight", "Private Charter")
                    const experience = voucher.experience_type || voucher.experience || 'Shared Flight';
                    
                    // Voucher Type: prioritize selectedVoucherTypes from Rebook popup, then fallback to voucher data
                    let voucherType = '';
                    if (selectedVoucherTypes && selectedVoucherTypes.length > 0) {
                        // Use the first selected voucher type (since only one can be selected)
                        // For private voucher types, it's already a title (e.g., 'Private Charter', 'Proposal Flight')
                        // For shared voucher types, it's a key (e.g., 'weekday morning', 'any day flight') - convert to title case
                        const selected = selectedVoucherTypes[0];
                        if (selected && typeof selected === 'string') {
                            // Check if it's a key (lowercase) or already a title (has capital letters)
                            if (selected === selected.toLowerCase() && selected.includes(' ')) {
                                // It's a key, convert to title case
                                voucherType = selected.split(' ').map(word => 
                                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                                ).join(' ');
                            } else {
                                // It's already a title, use as is
                                voucherType = selected;
                            }
                        } else {
                            voucherType = selected;
                        }
                    } else {
                        // Fallback to voucher data
                        voucherType = voucher.voucher_type || voucher.actual_voucher_type || '';
                        // If voucher_type is still empty and book_flight exists and is not "Flight Voucher" or "Gift Voucher", use it
                        if (!voucherType && voucher.book_flight && 
                            voucher.book_flight !== 'Flight Voucher' && 
                            voucher.book_flight !== 'Gift Voucher' &&
                            !voucher.book_flight.toLowerCase().includes('gift')) {
                            voucherType = voucher.book_flight;
                        }
                        // Final fallback
                        if (!voucherType) {
                            voucherType = 'Any Day Flight';
                        }
                    }
                    
                    // Determine flight type from experience
                    let flightType = experience;
                    if (experience === 'Private Charter') {
                        flightType = 'Private Charter';
                    } else {
                        flightType = 'Shared Flight';
                    }
                    
                    // Get passenger data from voucher (use existing passenger details)
                    const voucherPassengers = Array.isArray(bookingDetail?.voucher?.passenger_details)
                        ? bookingDetail.voucher.passenger_details
                        : (Array.isArray(bookingDetail?.voucher?.voucher_passenger_details)
                            ? bookingDetail.voucher.voucher_passenger_details
                            : []);
                    const bookingPassengers = Array.isArray(bookingDetail.passengers) ? bookingDetail.passengers : [];
                    const existingPassengers = voucherPassengers.length > 0 ? voucherPassengers : bookingPassengers;
                    let passengers = [];
                    
                    if (existingPassengers.length > 0) {
                        // Use existing passenger data from voucher
                        passengers = existingPassengers.map(p => ({
                            firstName: p.first_name || '',
                            lastName: p.last_name || '',
                            weight: p.weight || '',
                            email: p.email || voucher.email || '',
                            phone: p.phone || voucher.phone || voucher.mobile || '',
                            ticketType: flightType,
                            weatherRefund: p.weather_refund || false
                        }));
                    } else {
                        // Fallback: create passenger from voucher personal details
                        const nameParts = (voucher.name || '').split(' ');
                        passengers = [{
                            firstName: nameParts[0] || '',
                            lastName: nameParts.slice(1).join(' ') || '',
                            weight: voucher.weight || '',
                            email: voucher.email || '',
                            phone: voucher.phone || voucher.mobile || '',
                            ticketType: flightType,
                            weatherRefund: false
                        }];
                    }
                    
                    if (passengers.length === 0) {
                        alert('Passenger information is required');
                        setRebookLoading(false);
                        return;
                    }
                    
                    // Format date and time
                    const flightDate = dayjs(date).format('YYYY-MM-DD');
                    const flightDateTime = `${flightDate} ${time}`;
                    
                    // Get paid amount from voucher (Flight Voucher Details'teki paid bilgisi)
                    const paidAmount = parseFloat(voucher.paid) || 0;
                    
                    // Calculate total price (use voucher paid amount as primary, fallback to activity pricing)
                    let totalPrice = paidAmount;
                    if (!totalPrice && activity) {
                        if (flightType === 'Shared Flight') {
                            totalPrice = (activity.shared_price || 0) * passengers.length;
                        } else {
                            totalPrice = activity.private_price || 0;
                        }
                    }
                    
                    // Prepare booking payload
                    const bookingPayloadBase = {
                        activitySelect: 'Redeem Voucher',
                        chooseLocation: selectedLocationForBooking,
                        chooseFlightType: {
                            type: flightType,
                            passengerCount: passengers.length
                        },
                        passengerData: passengers,
                        selectedDate: flightDateTime,
                        selectedTime: time,
                        totalPrice: totalPrice,
                        paid: paidAmount, // Add paid amount from Flight Voucher Details
                        ...(voucherCode ? { voucher_code: voucherCode } : {}),
                        flight_attempts: 0,
                        additionalInfo: {},
                        choose_add_on: [],
                        activity_id: finalActivityId, // Add activity_id for backend
                        experience: experience, // Add experience from voucher
                        voucher_type: voucherType, // Add voucher_type from voucher
                        selectedVoucherType: { title: voucherType } // Add selectedVoucherType for backend compatibility
                    };
                    
                    console.log('Flight Voucher Booking Payload:', bookingPayloadBase);
                    
                    const tryCreateFlight = async (payload, skipVoucherCode) => {
                        const finalPayload = { ...payload };
                        if (skipVoucherCode) {
                            delete finalPayload.voucher_code;
                        }
                        return axios.post('/api/createBooking', finalPayload);
                    };

                    let createBookingResponse;
                    let usedVoucherCode = !!voucherCode;
                    try {
                        createBookingResponse = await tryCreateFlight(bookingPayloadBase, false);
                    } catch (errCreate) {
                        const fkError = errCreate?.response?.data?.error || errCreate?.response?.data?.message || '';
                        if (fkError.toLowerCase().includes('foreign key constraint') || fkError.toLowerCase().includes('voucher_codes')) {
                            console.warn('Retrying createBooking without voucher_code due to FK error (Flight Voucher)');
                            createBookingResponse = await tryCreateFlight(bookingPayloadBase, true);
                            usedVoucherCode = false;
                        } else {
                            throw errCreate;
                        }
                    }
                    
                    if (!createBookingResponse.data.success) {
                        throw new Error(createBookingResponse.data.message || 'Failed to create booking');
                    }
                    
                    console.log('Booking created successfully:', createBookingResponse.data);
                    
                    // Note: Voucher is already marked as redeemed by /api/createBooking endpoint
                    // when activitySelect === 'Redeem Voucher' and voucher_code exists
                    // But we'll also call /api/redeem-voucher as a backup to ensure it's marked
                    // Redeem best-effort if voucherCode exists (even if booking created without it)
                    if (voucherCode) {
                        try {
                            const redeemResponse = await axios.post('/api/redeem-voucher', {
                                voucher_code: voucherCode,
                                booking_id: createBookingResponse.data.bookingId || createBookingResponse.data.id
                            });
                            
                            if (!redeemResponse.data.success) {
                                console.warn('Warning: Could not mark voucher as redeemed via redeem-voucher endpoint:', redeemResponse.data.message);
                            } else {
                                console.log('Voucher marked as redeemed successfully via redeem-voucher endpoint');
                            }
                        } catch (redeemErr) {
                            console.warn('Warning: Error calling redeem-voucher endpoint (voucher may already be marked):', redeemErr.message);
                        }
                    }
                
                setRebookModalOpen(false);
                setDetailDialogOpen(false);
                    setSelectedBookingId(null);
                    setBookingDetail(null);
                    setBookingHistory([]);
                    
                    // Refresh all data
                    // Refresh booking data
                    const bookingResponse = await axios.get(`/api/getAllBookingData`, { params: filters });
                    setBooking(bookingResponse.data.data || []);
                    setFilteredBookingData(bookingResponse.data.data || []);
                
                // Refresh voucher data
                    const voucherResponse = await axios.get(`/api/getAllVoucherData`, { params: filters });
                    setVoucher(voucherResponse.data.data || []);
                    setFilteredVoucherData(voucherResponse.data.data || []);
                    
                    // Update filteredData based on active tab
                    if (activeTab === 'bookings') {
                        setFilteredData(bookingResponse.data.data || []);
                    } else if (activeTab === 'vouchers') {
                        setFilteredData(voucherResponse.data.data || []);
                    }
                    
                    alert('Flight Voucher successfully redeemed and booking created! Confirmation email has been sent.');
                    setRebookLoading(false);
                    return;
                } catch (error) {
                    console.error('Flight Voucher Redemption Error:', error);
                    alert('Error redeeming Flight Voucher: ' + (error.response?.data?.message || error.message || 'Unknown error'));
                    setRebookLoading(false);
                return;
                }
            }
            
            // Regular booking rebook logic
            if (!bookingDetail.booking) {
                setRebookLoading(false);
                return;
            }
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

            // Determine passenger count from existing passengers or booking
            const existingPassengers = bookingDetail.passengers || [];
            const passengerCount = existingPassengers.length > 0 ? existingPassengers.length : (bookingDetail.booking.pax || 1);
            
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

            // Keep current flight_attempts value. Attempts only increment when a flight is cancelled.
            const currentAttempts = parseInt(bookingDetail.booking.flight_attempts || 0, 10);

            // Prepare passenger data for new booking
            let passengerData = [];
            if (existingPassengers.length > 0) {
                // Use existing passenger data
                passengerData = existingPassengers.map(p => ({
                    firstName: p.first_name || '',
                    lastName: p.last_name || '',
                    weight: p.weight || '',
                    email: p.email || bookingDetail.booking.email || '',
                    phone: p.phone || bookingDetail.booking.phone || '',
                    ticketType: flightType,
                    weatherRefund: p.weather_refund || false
                }));
            } else {
                // Fallback to booking name if no passengers
                const nameParts = (bookingDetail.booking.name || '').split(' ');
                passengerData = [{
                    firstName: nameParts[0] || '',
                    lastName: nameParts.slice(1).join(' ') || '',
                    weight: '',
                    email: bookingDetail.booking.email || '',
                    phone: bookingDetail.booking.phone || '',
                    ticketType: flightType,
                    weatherRefund: false
                }];
            }

            const buildHistoryEntriesPayload = () => {
                const entries = [];
                if (Array.isArray(bookingHistory) && bookingHistory.length > 0) {
                    bookingHistory.forEach(entry => {
                        if (entry && entry.status) {
                            entries.push({
                                status: entry.status,
                                changed_at: entry.changed_at || null,
                                flight_date: entry.flight_date || null // Preserve each entry's own flight_date
                            });
                        }
                    });
                }
                if (bookingDetail?.booking) {
                    const currentStatus = bookingDetail.booking.status || 'Scheduled';
                    const currentFlightDate = bookingDetail.booking.flight_date || bookingDetail.booking.created_at || null;
                    entries.push({
                        status: currentStatus,
                        changed_at: currentFlightDate,
                        flight_date: bookingDetail.booking.flight_date || null // Preserve current booking's flight_date
                    });
                }
                const deduped = [];
                const seen = new Set();
                entries.forEach(entry => {
                    if (!entry.status) return;
                    const key = `${entry.status}|${entry.changed_at || ''}|${entry.flight_date || ''}`;
                    if (seen.has(key)) return;
                    seen.add(key);
                    deduped.push(entry);
                });
                return deduped;
            };
            const historyEntriesPayload = buildHistoryEntriesPayload();

            // Get voucher type from selectedVoucherTypes or existing booking
            let voucherType = bookingDetail.booking.voucher_type || '';
            if (selectedVoucherTypes && selectedVoucherTypes.length > 0) {
                // Use the first selected voucher type (since only one can be selected)
                // For private voucher types, it's already a title (e.g., 'Private Charter', 'Proposal Flight')
                // For shared voucher types, it's a key (e.g., 'weekday morning', 'any day flight') - convert to title case
                const selected = selectedVoucherTypes[0];
                console.log('🔄 Rebook - Selected voucher types:', selectedVoucherTypes);
                console.log('🔄 Rebook - First selected:', selected);
                if (selected && typeof selected === 'string') {
                    // Check if it's a key (lowercase) or already a title (has capital letters)
                    if (selected === selected.toLowerCase() && selected.includes(' ')) {
                        // It's a key, convert to title case
                        voucherType = selected.split(' ').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                        ).join(' ');
                        console.log('🔄 Rebook - Converted key to title case:', voucherType);
                    } else {
                        // It's already a title, use as is
                        voucherType = selected;
                        console.log('🔄 Rebook - Using title as is:', voucherType);
                    }
                } else {
                    voucherType = selected;
                    console.log('🔄 Rebook - Using selected as is (non-string):', voucherType);
                }
            } else if (!voucherType) {
                // Fallback to default if no selection and no existing voucher type
                voucherType = 'Any Day Flight';
                console.log('🔄 Rebook - Using fallback voucher type:', voucherType);
            } else {
                console.log('🔄 Rebook - Using existing booking voucher type:', voucherType);
            }
            console.log('🔄 Rebook - Final voucher type:', voucherType);

            // Preserve original created_at to maintain table position after rebook
            const originalCreatedAt = bookingDetail.booking.created_at || bookingDetail.booking.createdAt || null;
            
            // Determine experience from flightType - this is critical for manifest page Type display
            // experience field is used in manifest page to show "Type: Shared Flight" or "Type: Private Flight"
            let experience = flightType; // Default to flightType
            if (flightType === 'Shared Flight') {
                experience = 'Shared Flight';
            } else if (flightType === 'Private Flight' || flightType === 'Private Charter') {
                experience = 'Private Charter'; // Use 'Private Charter' for consistency
            }
            
            console.log('🔄 Rebook - Flight Type:', flightType, 'Experience:', experience);
            
            const payload = {
                activitySelect: flightType,
                chooseLocation: selectedLocation || bookingDetail.booking.location,
                chooseFlightType: { type: flightType, passengerCount: passengerCount },
                activity_id: activityId,
                passengerData: passengerData,
                selectedDate: dayjs(date).format('YYYY-MM-DD') + ' ' + time,
                totalPrice: totalPrice,
                additionalInfo: { notes: bookingDetail.booking.additional_notes || '' },
                voucher_code: bookingDetail.booking.voucher_code || null,
                flight_attempts: currentAttempts, // Preserve attempts count when rebooking
                status: 'Scheduled', // Set status to Scheduled for rebook operations
                email_template_override: 'Booking Rescheduled',
                email_template_type_override: 'booking_rescheduled_automatic',
                history_entries: historyEntriesPayload,
                voucher_type: voucherType, // Add voucher_type from Rebook popup selection
                selectedVoucherType: { title: voucherType }, // Add selectedVoucherType for backend compatibility
                experience: experience, // Add experience field - critical for manifest page Type display
                created_at: originalCreatedAt, // Preserve original created_at to maintain table position
                rebook_from_booking_id: bookingDetail.booking.id // Add old booking ID for payment history transfer
            };

            // Create the new booking first (this will transfer payment history from old booking)
            const createResponse = await axios.post('/api/createBooking', payload);
            
            // Then delete the old booking after payment history is transferred
            await axios.delete(`/api/deleteBooking/${bookingDetail.booking.id}`);
            
            // Clear all states
            setRebookModalOpen(false);
            setDetailDialogOpen(false);
            setSelectedBookingId(null);
            setBookingDetail(null);
            setBookingHistory([]);
            
            // Refresh all data
            if (activeTab === 'bookings') {
                const response = await axios.get(`/api/getAllBookingData`, { params: filters });
                setBooking(response.data.data || []);
                setFilteredBookingData(response.data.data || []);
                setFilteredData(response.data.data || []);
            }
            
            // Refresh voucher data
            const voucherResponse = await axios.get(`/api/getAllVoucherData`, { params: filters });
            setVoucher(voucherResponse.data.data || []);
            setFilteredVoucherData(voucherResponse.data.data || []);
            
            alert('Booking successfully rebooked! Confirmation email has been sent.');
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
            // Update all fields that have changed
            const updates = [];
            if (editPassengerFirstName !== (p.first_name || '')) {
                updates.push({ field: 'first_name', value: editPassengerFirstName });
            }
            if (editPassengerLastName !== (p.last_name || '')) {
                updates.push({ field: 'last_name', value: editPassengerLastName });
            }
            if (editPassengerWeight !== (p.weight || '')) {
                updates.push({ field: 'weight', value: editPassengerWeight });
            }
            if (editPassengerPrice !== (p.price || '')) {
                updates.push({ field: 'price', value: editPassengerPrice });
            }

            // Execute all updates
            await Promise.all(updates.map(update =>
                axios.patch('/api/updatePassengerField', {
                    passenger_id: p.id,
                    field: update.field,
                    value: update.value
                })
            ));

            // Wait a bit to ensure database updates are committed
            await new Promise(resolve => setTimeout(resolve, 100));

            // Fetch updated booking detail
            await fetchPassengers(bookingDetail.booking.id);
            setEditingPassenger(null);
        } catch (err) {
            console.error('Failed to save passenger edit:', err);
            alert('Failed to update passenger details');
        } finally {
            setSavingPassengerEdit(false);
        }
    };

    // Voucher passenger edit handlers
    const handleEditVoucherPassengerClick = (p, passengerIndex, voucherId) => {
        setEditVoucherPassengerFirstName(p.first_name || "");
        setEditVoucherPassengerLastName(p.last_name || "");
        setEditVoucherPassengerWeight(p.weight || "");
        setEditVoucherPassengerPrice(p.price || "");
        setEditingVoucherPassenger({ voucher_id: voucherId, passenger_index: passengerIndex });
    };

    const handleCancelVoucherPassengerEdit = () => {
        setEditingVoucherPassenger(null);
        setEditVoucherPassengerFirstName("");
        setEditVoucherPassengerLastName("");
        setEditVoucherPassengerWeight("");
        setEditVoucherPassengerPrice("");
    };

    const handleSaveVoucherPassengerEdit = async (p, passengerIndex, voucherId) => {
        setSavingVoucherPassengerEdit(true);
        try {
            // Collect all updates
            const updates = [];
            if (editVoucherPassengerFirstName !== (p.first_name || "")) {
                updates.push({ field: 'first_name', value: editVoucherPassengerFirstName });
            }
            if (editVoucherPassengerLastName !== (p.last_name || "")) {
                updates.push({ field: 'last_name', value: editVoucherPassengerLastName });
            }
            if (editVoucherPassengerWeight !== (p.weight || "")) {
                updates.push({ field: 'weight', value: editVoucherPassengerWeight });
            }
            if (editVoucherPassengerPrice !== (p.price || "")) {
                updates.push({ field: 'price', value: editVoucherPassengerPrice });
            }

            // Update each field that has changed
            let lastResponse = null;
            for (const update of updates) {
                const response = await axios.patch('/api/updateVoucherPassengerField', {
                    voucher_id: voucherId,
                    passenger_index: passengerIndex,
                    field: update.field,
                    value: update.value
                });
                lastResponse = response;
            }

            // Update local state immediately with the updated passenger details from the last response
            if (lastResponse?.data?.passengerDetails) {
                setBookingDetail(prev => {
                    const updatedVoucher = {
                        ...prev.voucher,
                        passenger_details: lastResponse.data.passengerDetails
                    };
                    return {
                        ...prev,
                        voucher: updatedVoucher
                    };
                });
            } else {
                // Fallback: Update state optimistically
                setBookingDetail(prev => {
                    const currentPassengers = Array.isArray(prev.voucher?.passenger_details) 
                        ? [...prev.voucher.passenger_details] 
                        : [];
                    
                    if (currentPassengers[passengerIndex]) {
                        currentPassengers[passengerIndex] = {
                            ...currentPassengers[passengerIndex],
                            first_name: editVoucherPassengerFirstName !== (p.first_name || "") 
                                ? editVoucherPassengerFirstName 
                                : currentPassengers[passengerIndex].first_name,
                            last_name: editVoucherPassengerLastName !== (p.last_name || "") 
                                ? editVoucherPassengerLastName 
                                : currentPassengers[passengerIndex].last_name,
                            weight: editVoucherPassengerWeight !== (p.weight || "") 
                                ? editVoucherPassengerWeight 
                                : currentPassengers[passengerIndex].weight,
                            price: editVoucherPassengerPrice !== (p.price || "") 
                                ? editVoucherPassengerPrice 
                                : currentPassengers[passengerIndex].price
                        };
                    }
                    
                    return {
                        ...prev,
                        voucher: {
                            ...prev.voucher,
                            passenger_details: currentPassengers
                        }
                    };
                });
            }
            
            setEditingVoucherPassenger(null);
            setEditVoucherPassengerFirstName("");
            setEditVoucherPassengerLastName("");
            setEditVoucherPassengerWeight("");
            setEditVoucherPassengerPrice("");
        } catch (err) {
            console.error('Error updating voucher passenger:', err);
            alert('Failed to update voucher passenger details');
        } finally {
            setSavingVoucherPassengerEdit(false);
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

    const handleSmsClick = (booking) => {
        setSelectedBookingForEmail(booking); // reuse selected booking
        setSmsForm({ to: cleanPhoneNumber(booking.phone || ''), message: '', template: 'custom' });
        setSmsModalOpen(true);
        // Load sms logs
        (async () => {
            try {
                setSmsLogsLoading(true);
                const resp = await axios.get(`/api/bookingSms/${booking.id}`);
                setSmsLogs(resp.data?.data || []);
            } catch { setSmsLogs([]); }
            finally { setSmsLogsLoading(false); }
        })();
        if (smsPollId) clearInterval(smsPollId);
        const pid = setInterval(async () => {
            try {
                const resp = await axios.get(`/api/bookingSms/${booking.id}`);
                setSmsLogs(resp.data?.data || []);
            } catch {}
        }, 15000);
        setSmsPollId(pid);
    };

    const openSmsModalForBooking = (booking, options = {}) => {
        if (!booking) return;
        const contextType = options.contextType || booking.contextType || 'booking';
        const contextId = options.contextId || booking.contextId || (booking.id ? String(booking.id) : '');
        const bookingWithContext = { ...booking, contextType, contextId };
        
        setSelectedBookingForEmail(bookingWithContext);
        
        console.log('📱 Opening SMS modal...');
        console.log('📚 Available smsTemplates:', smsTemplates);
        
        const firstTemplate = smsTemplates.length > 0 ? smsTemplates[0].id : 'custom';
        let message = '';
        let templateValue = 'custom';
        
        if (smsTemplates.length > 0) {
            templateValue = String(firstTemplate);
            message = smsTemplates[0].message || '';
        }
        
        setSmsForm({
            to: cleanPhoneNumber(bookingWithContext.phone || ''),
            message,
            template: templateValue
        });
        
        setSmsPersonalNote('');
        setSmsModalOpen(true);
        
        // Load SMS logs for the primary booking
        if (bookingWithContext.id) {
            (async () => {
                try {
                    setSmsLogsLoading(true);
                    const resp = await axios.get(`/api/bookingSms/${bookingWithContext.id}`);
                    setSmsLogs(resp.data?.data || []);
                } catch { setSmsLogs([]); }
                finally { setSmsLogsLoading(false); }
            })();
        }
    };

    useEffect(() => {
        if (!smsModalOpen && smsPollId) { clearInterval(smsPollId); setSmsPollId(null); }
    }, [smsModalOpen]);

    const handleSmsTemplateChange = (templateValue) => {
        console.log('🔄 SMS template changed to:', templateValue);
        console.log('📚 Available templates:', smsTemplates);
        console.log('📋 Current smsForm:', smsForm);
        
        if (!templateValue || templateValue === 'custom') {
            setSmsForm(prev => ({ 
                ...prev, 
                template: 'custom', 
                message: '' 
            }));
            return;
        }
        
        const dbTemplate = smsTemplates.find(t => {
            const templateId = String(t.id);
            const selectedValue = String(templateValue);
            const match = templateId === selectedValue;
            console.log(`🔍 Comparing: ${templateId} === ${selectedValue} = ${match}`);
            return match;
        });
        
        console.log('🔍 Found template:', dbTemplate);
        
        if (dbTemplate) {
            const newMessage = dbTemplate.message || '';
            console.log('✅ Setting template message:', newMessage.substring(0, 50) + '...');
            setSmsForm(prev => ({ 
                ...prev, 
                template: String(dbTemplate.id),
                message: newMessage
            }));
            // Force re-render by clearing and setting again
            setTimeout(() => {
                setSmsForm(prev => ({ 
                    ...prev, 
                    template: String(dbTemplate.id),
                    message: newMessage
                }));
            }, 0);
        } else {
            console.warn('⚠️ Template not found for value:', templateValue);
            console.warn('⚠️ Available template IDs:', smsTemplates.map(t => String(t.id)));
        }
    };

    const handleSendSms = async () => {
        if (!smsForm.message) { alert('Please fill message'); return; }
        
        const isBulk = selectedBookingIds && selectedBookingIds.length > 1;
        
        if (!isBulk && !smsForm.to) {
            alert('Please fill phone number');
            return;
        }
        
        // Combine template message with personal note
        const finalMessage = smsPersonalNote 
            ? `${smsForm.message}${smsForm.message ? '\n\n' : ''}${smsPersonalNote}`
            : smsForm.message;
        
        setSmsSending(true);
        try {
            if (isBulk) {
                // Bulk SMS to selected bookings
                const recipients = booking
                    .filter(b => selectedBookingIds.includes(b.id))
                    .map(b => {
                        const phone = cleanPhoneNumber(b.phone || b.mobile || '');
                        // Accept any phone number that starts with + (international format)
                        return phone && phone.startsWith('+') ? phone : null;
                    })
                    .filter(p => p !== null);

                if (recipients.length === 0) {
                    alert('No valid international phone numbers found for selected bookings.');
                    setSmsSending(false);
                    return;
                }

                const response = await axios.post('/api/sendBulkBookingSms', {
                    bookingIds: selectedBookingIds,
                    to: recipients,
                    body: finalMessage,
                    templateId: smsForm.template !== 'custom' ? smsForm.template : null
                });

                if (response.data.success) {
                    alert(`SMS sent to ${recipients.length} bookings successfully!`);
                    setSmsModalOpen(false);
                    setSmsForm({ to: '', message: '', template: 'custom' });
                    setSmsPersonalNote('');
                } else {
                    alert('Failed to send SMS: ' + (response.data.message || ''));
                }
            } else {
                // Single booking SMS
                const cleanedPhone = cleanPhoneNumber(smsForm.to);
                if (!cleanedPhone || !cleanedPhone.startsWith('+')) {
                    alert('Please enter a valid international phone number (must start with +)');
                    setSmsSending(false);
                    return;
                }
                
                const resp = await axios.post('/api/sendBookingSms', {
                    bookingId: selectedBookingForEmail?.id,
                    to: cleanedPhone,
                    body: finalMessage,
                    templateId: smsForm.template !== 'custom' ? smsForm.template : null
                });
                if (resp.data?.success) {
                    const logs = await axios.get(`/api/bookingSms/${selectedBookingForEmail?.id}`);
                    setSmsLogs(logs.data?.data || []);
                    setSmsModalOpen(false);
                } else {
                    alert('Failed to send SMS: ' + (resp.data?.message || ''));
                }
            }
        } catch (e) {
            alert('SMS error: ' + (e.response?.data?.message || e.message));
        }
        setSmsSending(false);
    };

    return (
        <div className="booking-page-wrap">
            <Container maxWidth={false}>
                <div className="heading-wrap">
                    <h2>
                        BOOKING PAGE
                    </h2>
                    <hr />
                </div>
                <div style={{ padding: "50px", background: "#f9f9f9", borderRadius: "20px" }} className="booking-page-content">
                    {/* Tabs */}
                    <div style={{ 
                        marginBottom: "20px",
                        display: "flex",
                        flexDirection: isMobile ? "row" : "row",
                        gap: isMobile ? "4px" : "10px",
                        flexWrap: isMobile ? "nowrap" : "nowrap"
                    }} className="booking-page-tabs">
                        <button
                            onClick={() => handleTabChange("bookings")}
                            style={{
                                marginRight: isMobile ? "0" : "10px",
                                background: activeTab === "bookings" ? "#3274b4" : "#A6A6A6",
                                color: "#FFF",
                                padding: isMobile ? "6px 10px" : "8px 16px",
                                border: "none",
                                cursor: "pointer",
                                position: "relative",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: isMobile ? "center" : "flex-start",
                                gap: "6px",
                                borderRadius: "4px",
                                fontSize: isMobile ? "12px" : "14px",
                                fontWeight: "500",
                                transition: "all 0.3s ease",
                                flex: isMobile ? "1" : "none"
                            }}
                        >
                            All Bookings
                            {hasNewBookings && (
                                <span style={{
                                    position: "absolute",
                                    top: "-6px",
                                    right: "-6px",
                                    width: "16px",
                                    height: "16px",
                                    background: "#ff0000",
                                    borderRadius: "50%",
                                    border: "2px solid white",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    color: "white",
                                    animation: "pulse 2s infinite"
                                }}>
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => handleTabChange("vouchers")}
                            style={{
                                marginRight: isMobile ? "0" : "10px",
                                background: activeTab === "vouchers" ? "#3274b4" : "#A6A6A6",
                                color: "#FFF",
                                padding: isMobile ? "6px 10px" : "8px 16px",
                                border: "none",
                                cursor: "pointer",
                                position: "relative",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: isMobile ? "center" : "flex-start",
                                gap: "6px",
                                borderRadius: "4px",
                                fontSize: isMobile ? "12px" : "14px",
                                fontWeight: "500",
                                transition: "all 0.3s ease",
                                flex: isMobile ? "1" : "none"
                            }}
                        >
                            All Vouchers
                            {hasNewVouchers && (
                                <span style={{
                                    position: "absolute",
                                    top: "-6px",
                                    right: "-6px",
                                    width: "16px",
                                    height: "16px",
                                    background: "#ff0000",
                                    borderRadius: "50%",
                                    border: "2px solid white",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    color: "white",
                                    animation: "pulse 2s infinite"
                                }}>
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => handleTabChange("dateRequests")}
                            style={{
                                background: activeTab === "dateRequests" ? "#3274b4" : "#A6A6A6",
                                color: "#FFF",
                                padding: isMobile ? "6px 10px" : "8px 16px",
                                border: "none",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: isMobile ? "center" : "flex-start",
                                borderRadius: "4px",
                                fontSize: isMobile ? "12px" : "14px",
                                fontWeight: "500",
                                transition: "all 0.3s ease",
                                flex: isMobile ? "1" : "none"
                            }}
                        >
                            Date Requests
                        </button>
                    </div>
                    
                    {/* Add pulse animation for notification badges */}
                    <style>
                        {`
                            @keyframes pulse {
                                0%, 100% {
                                    transform: scale(1);
                                    opacity: 1;
                                }
                                50% {
                                    transform: scale(1.1);
                                    opacity: 0.8;
                                }
                            }
                        `}
                    </style>

                    {/* Tab Content */}
                    <div>
                        {activeTab === "bookings" && (
                            <>
                                <div className="booking-top-wrap">
                                    <div className="booking-filter-heading" style={{
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: isMobile ? '8px' : '0',
                                        flexWrap: isMobile ? 'nowrap' : 'wrap'
                                    }}>
                                        <h3 style={{ fontFamily: "Gilroy Light", margin: 0, marginRight: isMobile ? 'auto' : 0 }}>All Bookings</h3>
                                        {/* Export and Filter Buttons - Only show next to heading on mobile */}
                                        {isMobile && (
                                            <>
                                            <OutlinedInput
                                                readOnly
                                                onClick={handleExportCSV}
                                                value="Export"
                                                sx={{
                                                    cursor: 'pointer',
                                                    height: '32px',
                                                    fontSize: 12,
                                                        minWidth: '80px',
                                                    '& input': {
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                        padding: '8px 12px'
                                                    },
                                                    '& fieldset': {
                                                        borderColor: 'primary.main'
                                                    },
                                                    '&:hover fieldset': {
                                                        borderColor: 'primary.dark'
                                                    }
                                                }}
                                                size="small"
                                                startAdornment={
                                                    <InputAdornment position="start">
                                                        <FileDownloadIcon fontSize="small" color="primary" />
                                                    </InputAdornment>
                                                }
                                            />
                                            <OutlinedInput
                                                readOnly
                                                onClick={() => setFilterDialogOpen(true)}
                                                value="Filter"
                                                sx={{
                                                    cursor: 'pointer',
                                                    height: '32px',
                                                    fontSize: 12,
                                                        minWidth: '80px',
                                                    '& input': {
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                        padding: '8px 12px'
                                                    },
                                                    '& fieldset': {
                                                        borderColor: 'secondary.main'
                                                    },
                                                    '&:hover fieldset': {
                                                        borderColor: 'secondary.dark'
                                                    }
                                                }}
                                                size="small"
                                                startAdornment={
                                                    <InputAdornment position="start">
                                                        <FilterListIcon fontSize="small" color="secondary" />
                                                    </InputAdornment>
                                                }
                                            />
                                            </>
                                        )}
                                    </div>
                                    <div className="booking-search-booking" style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: isMobile ? 4 : 8,
                                        flexWrap: isMobile ? 'wrap' : 'nowrap'
                                    }}>
                                        {/* Export Button - Only show on desktop */}
                                        {!isMobile && (
                                            <Button variant="outlined" color="primary" onClick={handleExportCSV} style={{ height: 40 }}>
                                                Export
                                            </Button>
                                        )}
                                        
                                        {/* Filter Button - Only show on desktop */}
                                        {!isMobile && (
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            onClick={() => setFilterDialogOpen(true)}
                                            style={{ height: 40 }}
                                        >
                                            Filter
                                        </Button>
                                        )}
                                        
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            disabled={selectedBookingIds.length === 0}
                                            onClick={() => {
                                                if (selectedBookingIds.length === 0) return;
                                                // Çoklu alıcılar için varsayılan booking'i kullan (ilk seçilen)
                                                const primaryBooking = booking.find(b => b.id === selectedBookingIds[0]);
                                                if (primaryBooking) {
                                                    openEmailModalForBooking(primaryBooking, { contextType: 'bulk', contextId: selectedBookingIds.join(',') });
                                                } else if (filteredData.length > 0) {
                                                    openEmailModalForBooking(filteredData[0], { contextType: 'bulk', contextId: selectedBookingIds.join(',') });
                                                }
                                            }}
                                            style={{ 
                                                height: isMobile ? 32 : 40, 
                                                fontSize: isMobile ? '11px' : '14px', 
                                                padding: isMobile ? '4px 8px' : '8px 16px',
                                                flex: isMobile ? '1 1 calc(50% - 2px)' : 'none',
                                                minWidth: isMobile ? 0 : 'auto'
                                            }}
                                        >
                                            Bulk Email
                                        </Button>
                                        <Button
                                            variant="contained"
                                            color="info"
                                            disabled={selectedBookingIds.length === 0}
                                            onClick={() => {
                                                if (selectedBookingIds.length === 0) return;
                                                // Çoklu alıcılar için varsayılan booking'i kullan (ilk seçilen)
                                                const primaryBooking = booking.find(b => b.id === selectedBookingIds[0]);
                                                if (primaryBooking) {
                                                    openSmsModalForBooking(primaryBooking, { contextType: 'bulk', contextId: selectedBookingIds.join(',') });
                                                } else if (filteredData.length > 0) {
                                                    openSmsModalForBooking(filteredData[0], { contextType: 'bulk', contextId: selectedBookingIds.join(',') });
                                                }
                                            }}
                                            style={{ 
                                                height: isMobile ? 32 : 40, 
                                                background: '#17a2b8', 
                                                fontSize: isMobile ? '11px' : '14px', 
                                                padding: isMobile ? '4px 8px' : '8px 16px',
                                                flex: isMobile ? '1 1 calc(50% - 2px)' : 'none',
                                                minWidth: isMobile ? 0 : 'auto'
                                            }}
                                        >
                                            Bulk SMS
                                        </Button>
                                        
                                        {/* Search Input - Input-like on mobile, full input on desktop */}
                                        {isMobile ? (
                                            <OutlinedInput
                                                placeholder="Search..."
                                                value={filters.search}
                                                onChange={(e) => handleFilterChange("search", e.target.value)}
                                                sx={{ 
                                                    fontSize: 11,
                                                    flex: '1 1 100%',
                                                    minWidth: 0,
                                                    width: '100%',
                                                    '& input::placeholder': { fontSize: 11 },
                                                    height: '32px',
                                                    '& .MuiOutlinedInput-input': {
                                                        padding: '6px 8px',
                                                        fontSize: '11px'
                                                    }
                                                }}
                                                size="small"
                                                startAdornment={
                                                    <InputAdornment position="start">
                                                        <SearchIcon sx={{ fontSize: isMobile ? '16px' : 'inherit' }} />
                                                    </InputAdornment>
                                                }
                                            />
                                        ) : (
                                        <OutlinedInput
                                            placeholder="Search by name, email, phone, location..."
                                            value={filters.search}
                                            onChange={(e) => handleFilterChange("search", e.target.value)}
                                                sx={{ 
                                                    fontSize: 14, 
                                                    '& input::placeholder': { fontSize: 14 },
                                                    flex: 1,
                                                    minWidth: 200
                                                }}
                                        />
                                        )}
                                    </div>
                                    {/* Show active advanced filters as chips */}
                                    {(filters.statusMulti.length > 0 || filters.voucherTypeMulti.length > 0 || filters.locationMulti.length > 0) && (
                                        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            {filters.statusMulti.map(value => (
                                                <Chip
                                                    key={`status-${value}`}
                                                    size="small"
                                                    label={`Status: ${value}`}
                                                    onDelete={() => handleCheckboxFilterChange('statusMulti', value)}
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            ))}
                                            {filters.voucherTypeMulti.map(value => (
                                                <Chip
                                                    key={`voucher-${value}`}
                                                    size="small"
                                                    label={`Voucher: ${value}`}
                                                    onDelete={() => handleCheckboxFilterChange('voucherTypeMulti', value)}
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            ))}
                                            {filters.locationMulti.map(value => (
                                                <Chip
                                                    key={`location-${value}`}
                                                    size="small"
                                                    label={`Location: ${value}`}
                                                    onDelete={() => handleCheckboxFilterChange('locationMulti', value)}
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            ))}
                                            <Chip
                                                size="small"
                                                label="Clear filters"
                                                onClick={handleClearAdvancedFilters}
                                                variant="text"
                                            />
                                        </Box>
                                    )}
                                    <div className="booking-filter-wrap" style={isMobile ? {
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '4px',
                                        margin: '0'
                                    } : {}}>
                                        <div className="booking-filter-field" style={isMobile ? {
                                            flex: '1 1 calc(50% - 2px)',
                                            minWidth: 0,
                                            margin: '0'
                                        } : {}}>
                                            <FormControl sx={isMobile ? { 
                                                m: 0.5, 
                                                minWidth: 0,
                                                width: '100%'
                                            } : { 
                                                m: 1, 
                                                minWidth: 160 
                                            }} size="small" className="booking-filter-field">
                                                <InputLabel id="book-flight-type-label" sx={isMobile ? { fontSize: '11px' } : {}}>Experience</InputLabel>
                                                <Select
                                                    labelId="book-flight-type-label"
                                                    value={filters.experience}
                                                    label="Experience"
                                                    onChange={(e) => handleFilterChange("experience", e.target.value)}
                                                    sx={isMobile ? { 
                                                        fontSize: '11px',
                                                        height: '32px',
                                                        '& .MuiSelect-select': {
                                                            padding: '6px 8px',
                                                            fontSize: '11px'
                                                        }
                                                    } : {}}
                                                >
                                                    <MenuItem value="" sx={isMobile ? { fontSize: '11px' } : {}}>
                                                        <em>Select</em>
                                                    </MenuItem>
                                                    <MenuItem value="Private Charter" sx={isMobile ? { fontSize: '11px' } : {}}>Private Charter</MenuItem>
                                                    <MenuItem value="Shared Flight" sx={isMobile ? { fontSize: '11px' } : {}}>Shared Flight</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </div>
                                        <div className="booking-filter-field" style={isMobile ? {
                                            flex: '1 1 calc(50% - 2px)',
                                            minWidth: 0,
                                            margin: '0'
                                        } : {}}>
                                            <FormControl sx={isMobile ? { 
                                                m: 0.5, 
                                                minWidth: 0,
                                                width: '100%'
                                            } : { 
                                                m: 1, 
                                                minWidth: 160 
                                            }} size="small">
                                                <InputLabel id="book-Select-label" sx={isMobile ? { fontSize: '11px' } : {}}>Status</InputLabel>
                                                <Select
                                                    labelId="book-Select-label"
                                                    value={filters.status}
                                                    onChange={(e) => handleFilterChange("status", e.target.value)}
                                                    label="Status"
                                                    sx={isMobile ? { 
                                                        fontSize: '11px',
                                                        height: '32px',
                                                        '& .MuiSelect-select': {
                                                            padding: '6px 8px',
                                                            fontSize: '11px'
                                                        }
                                                    } : {}}
                                                >
                                                    <MenuItem value="" sx={isMobile ? { fontSize: '11px' } : {}}>
                                                        <em>Select</em>
                                                    </MenuItem>
                                                    <MenuItem value="Scheduled" sx={isMobile ? { fontSize: '11px' } : {}}>Scheduled</MenuItem>
                                                    <MenuItem value="Expired" sx={isMobile ? { fontSize: '11px' } : {}}>Expired</MenuItem>
                                                    <MenuItem value="Flown" sx={isMobile ? { fontSize: '11px' } : {}}>Flown</MenuItem>
                                                    <MenuItem value="No Show" sx={isMobile ? { fontSize: '11px' } : {}}>No Show</MenuItem>
                                                    <MenuItem value="Cancelled" sx={isMobile ? { fontSize: '11px' } : {}}>Cancelled</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </div>
                                        <div className="booking-filter-field" style={isMobile ? {
                                            flex: '1 1 calc(50% - 2px)',
                                            minWidth: 0,
                                            margin: '0'
                                        } : {}}>
                                            <FormControl sx={isMobile ? { 
                                                m: 0.5, 
                                                minWidth: 0,
                                                width: '100%'
                                            } : { 
                                                m: 1, 
                                                minWidth: 180 
                                            }} size="small">
                                                <InputLabel id="book-voucher-type-label" sx={isMobile ? { fontSize: '11px' } : {}}>Voucher Type</InputLabel>
                                                <Select
                                                    labelId="book-voucher-type-label"
                                                    value={filters.voucherType}
                                                    onChange={(e) => handleFilterChange("voucherType", e.target.value)}
                                                    label="Voucher Type"
                                                    sx={isMobile ? { 
                                                        fontSize: '11px',
                                                        height: '32px',
                                                        '& .MuiSelect-select': {
                                                            padding: '6px 8px',
                                                            fontSize: '11px'
                                                        }
                                                    } : {}}
                                                >
                                                    <MenuItem value="" sx={isMobile ? { fontSize: '11px' } : {}}>
                                                        <em>Select</em>
                                                    </MenuItem>
                                                    <MenuItem value="Weekday Morning" sx={isMobile ? { fontSize: '11px' } : {}}>Weekday Morning</MenuItem>
                                                    <MenuItem value="Flexible Weekday" sx={isMobile ? { fontSize: '11px' } : {}}>Flexible Weekday</MenuItem>
                                                    <MenuItem value="Any Day Flight" sx={isMobile ? { fontSize: '11px' } : {}}>Any Day Flight</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </div>
                                        <div className="booking-filter-field" style={isMobile ? {
                                            flex: '1 1 calc(50% - 2px)',
                                            minWidth: 0,
                                            margin: '0'
                                        } : {}}>
                                            <FormControl sx={isMobile ? { 
                                                m: 0.5, 
                                                minWidth: 0,
                                                width: '100%'
                                            } : { 
                                                m: 1, 
                                                minWidth: 160 
                                            }} size="small">
                                                <InputLabel id="book-location-label" sx={isMobile ? { fontSize: '11px' } : {}}>Location</InputLabel>
                                                <Select
                                                    labelId="book-location-label"
                                                    value={filters.location}
                                                    onChange={(e) => handleFilterChange("location", e.target.value)}
                                                    label="Location"
                                                    sx={isMobile ? { 
                                                        fontSize: '11px',
                                                        height: '32px',
                                                        '& .MuiSelect-select': {
                                                            padding: '6px 8px',
                                                            fontSize: '11px'
                                                        }
                                                    } : {}}
                                                >
                                                    <MenuItem value="" sx={isMobile ? { fontSize: '11px' } : {}}>
                                                        <em>Select</em>
                                                    </MenuItem>
                                                    <MenuItem value="Bath" sx={isMobile ? { fontSize: '11px' } : {}}>Bath</MenuItem>
                                                    <MenuItem value="Somerset" sx={isMobile ? { fontSize: '11px' } : {}}>Somerset</MenuItem>
                                                    <MenuItem value="Devon" sx={isMobile ? { fontSize: '11px' } : {}}>Devon</MenuItem>
                                                    <MenuItem value="Bristol Fiesta" sx={isMobile ? { fontSize: '11px' } : {}}>Bristol Fiesta</MenuItem>
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
                                {loadingBookings ? (
                                    <div style={{ textAlign: 'center', padding: '40px' }}>
                                        <Typography variant="h6" color="primary">
                                            Loading bookings...
                                        </Typography>
                                    </div>
                                ) : (
                                    <PaginatedTable
                                        itemsPerPage={10}
                                        data={filteredData.filter(item => {
                                            // Experience filter
                                            if (filters.experience && filters.experience !== 'Select') {
                                                const bookingFlightType = item.flight_type || item.experience || '';
                                                if (!experienceMatchesFilter(bookingFlightType, filters.experience)) return false;
                                            }
                                            // Advanced multi Status filter (checkboxes)
                                            if (filters.statusMulti && filters.statusMulti.length > 0) {
                                                const itemStatus = (item.status || '').toString().trim().toLowerCase();
                                                const matchesAny = filters.statusMulti.some(s => s.toString().trim().toLowerCase() === itemStatus);
                                                if (!matchesAny) return false;
                                            }
                                            // Status dropdown filter
                                            if (filters.status && item.status !== filters.status) return false;
                                            // Advanced multi Location filter (checkboxes)
                                            if (filters.locationMulti && filters.locationMulti.length > 0) {
                                                const itemLocation = (item.location || '').toString().trim();
                                                if (!filters.locationMulti.includes(itemLocation)) return false;
                                            }
                                            // Location dropdown filter
                                            if (filters.location && item.location !== filters.location) return false;
                                            // Advanced multi Voucher Type filter (checkboxes)
                                            if (filters.voucherTypeMulti && filters.voucherTypeMulti.length > 0) {
                                                const itemVoucherType = (item.voucher_type || '').toString().trim();
                                                if (!filters.voucherTypeMulti.includes(itemVoucherType)) return false;
                                            }
                                            // Voucher Type dropdown filter
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
                                            email: item.email || '',
                                            flight_type: item.flight_type || '',
                                            voucher_type: item.voucher_type || '',
                                            location: item.location || '',
                                            flight_date: (item.status === 'Cancelled') ? '-' : (item.flight_date_display || item.flight_date || ''),
                                            pax: item.pax || '',
                                            status: item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase() : '',
                                            paid: item.paid || '',
                                            due: item.due || '',
                                            voucher_code: item.voucher_code || '',
                                            flight_attempts: item.flight_attempts ?? 0,
                                            expires: item.expires || '',
                                            has_refund: item.has_refund || 0
                                        }))}
                                        selectable={true}
                                        onSelectionChange={handleBookingSelectionChange}
                                        columns={[
                                            "created_at",
                                            "name",
                                            "voucher_type",
                                            "location",
                                            "flight_date",
                                            "pax",
                                            "status",
                                            "paid",
                                            "voucher_code",
                                            "flight_attempts",
                                            "expires"
                                        ]}
                                        onNameClick={handleNameClick}
                                        onSmsClick={handleSmsClick}
                                        onEmailClick={handleEmailClick}
                                        context="bookings"
                                    />
                                )}
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
                                            onChange={(e) => handleFilterChange("search", e.target.value)} sx={{ fontSize: 14, '& input::placeholder': { fontSize: 14 } }} />
                                    </div>
                                    <div className="booking-filter-wrap">
                                        <div className="booking-filter-field">
                                            <FormControl sx={{ m: 1, minWidth: 160 }} size="small">
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
                                            <FormControl sx={{ m: 1, minWidth: 160 }} size="small">
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
                                                    <MenuItem value="Private Charter">Private Charter</MenuItem>
                                                    <MenuItem value="Shared Flight">Shared Flight</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </div>
                                        <div className="booking-filter-field">
                                            <FormControl sx={{ m: 1, minWidth: 180 }} size="small">
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
                                            <FormControl sx={{ m: 1, minWidth: 160 }} size="small">
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
                                    itemsPerPage={10}
                                    data={filteredData.filter(item => {
                                        // Voucher Type filter
                                        if (filters.voucherType && item.voucher_type !== filters.voucherType) return false;
                                        // Actual Voucher Type filter
                                        if (filters.actualVoucherType && item.actual_voucher_type !== filters.actualVoucherType) return false;
                                        // Experience filter
                                        if (filters.experience && filters.experience !== 'Select') {
                                            const bookingFlightType = item.flight_type || item.experience || '';
                                            if (!experienceMatchesFilter(bookingFlightType, filters.experience)) return false;
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
                                    columns={["created", "name", "voucher_type", "actual_voucher_type", "email", "phone", "expires", "redeemed", "paid", "voucher_ref"]}
                                    onNameClick={handleNameClick}
                                    onVoucherRefClick={handleVoucherRefClick}
                                    onEmailClick={(voucher) => {
                                        // For Flight Voucher, use purchaser_name and purchaser_email
                                        // For Gift Voucher, use recipient_name and recipient_email
                                        // For other types, use name and email
                                        const originalVoucher = voucher._original || voucher;
                                        const isFlightVoucher = originalVoucher.book_flight === 'Flight Voucher';
                                        const isGiftVoucher = originalVoucher.book_flight === 'Gift Voucher';
                                        const displayName = isFlightVoucher 
                                            ? (originalVoucher.purchaser_name || voucher.name || '')
                                            : (isGiftVoucher 
                                                ? (originalVoucher.recipient_name || voucher.name || '')
                                                : (voucher.name || ''));
                                        const displayEmail = isFlightVoucher 
                                            ? (originalVoucher.purchaser_email || voucher.email || '')
                                            : (isGiftVoucher 
                                                ? (originalVoucher.recipient_email || voucher.email || '')
                                                : (voucher.email || ''));
                                        const faux = { 
                                            id: voucher.id, 
                                            name: displayName, 
                                            email: displayEmail, 
                                            flight_type: voucher.flight_type 
                                        };
                                        handleEmailClick(faux);
                                        (async () => {
                                            try {
                                                const resp = await axios.get(`/api/recipientEmails`, { params: { email: displayEmail } });
                                                setEmailLogs(resp.data?.data || []);
                                            } catch {}
                                        })();
                                    }}
                                    onSmsClick={(voucher) => {
                                        // For Flight Voucher, use purchaser_name and purchaser_phone
                                        // For Gift Voucher, use recipient_name and recipient_phone
                                        // For other types, use name and phone
                                        const originalVoucher = voucher._original || voucher;
                                        const isFlightVoucher = originalVoucher.book_flight === 'Flight Voucher';
                                        const isGiftVoucher = originalVoucher.book_flight === 'Gift Voucher';
                                        const displayName = isFlightVoucher 
                                            ? (originalVoucher.purchaser_name || voucher.name || '')
                                            : (isGiftVoucher 
                                                ? (originalVoucher.recipient_name || voucher.name || '')
                                                : (voucher.name || ''));
                                        const displayPhone = isFlightVoucher 
                                            ? (originalVoucher.purchaser_phone || originalVoucher.purchaser_mobile || voucher.phone || '')
                                            : (isGiftVoucher 
                                                ? (originalVoucher.recipient_phone || voucher.phone || '')
                                                : (voucher.phone || ''));
                                        const faux = { id: voucher.id, name: displayName, phone: displayPhone };
                                        handleSmsClick(faux);
                                        (async () => {
                                            try {
                                                const resp = await axios.get(`/api/recipientSms`, { params: { to: displayPhone } });
                                                setSmsLogs(resp.data?.data || []);
                                            } catch {}
                                        })();
                                    }}
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
                                    itemsPerPage={10}
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
                                const title = getVoucherDetailsTitle(voucher);
                                console.log('🎯 Dialog title check:', {
                                    book_flight: voucher?.book_flight,
                                    voucher_type: voucher?.voucher_type,
                                    isGiftVoucher: isGiftVoucherDetails(voucher),
                                    resolvedTitle: title
                                });
                                return title;
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
                                                const title = getVoucherDetailsTitle(voucher);
                                                console.log('🎯 Voucher title check:', {
                                                    book_flight: voucher?.book_flight,
                                                    voucher_type: voucher?.voucher_type,
                                                    isGiftVoucher: isGiftVoucherDetails(voucher),
                                                    resolvedTitle: title
                                                });
                                                return title;
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
                                                        <Typography sx={{ 
                                                            mb: isMobile ? 0 : 0,
                                                            fontSize: isMobile ? '14px' : 'inherit'
                                                        }}><b>Name:</b> {editField === 'name' ? (
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
                                                                {v.name || '-'}
                                                                <IconButton 
                                                                    size="small" 
                                                                    onClick={() => handleEditClick('name', v.name)}
                                                                    sx={{ 
                                                                        padding: isMobile ? '2px' : '0px',
                                                                        minWidth: isMobile ? '20px' : 'auto',
                                                                        width: isMobile ? '20px' : 'auto',
                                                                        height: isMobile ? '20px' : 'auto',
                                                                        '& .MuiSvgIcon-root': {
                                                                            fontSize: isMobile ? '10px' : 'inherit'
                                                                        }
                                                                    }}
                                                                >
                                                                    <EditIcon fontSize={isMobile ? '10px' : 'small'} />
                                                                </IconButton>
                                                            </>
                                                        )}</Typography>
                                                        {/* Phone field - show purchaser_phone for Gift Vouchers, booking_phone for Flight Vouchers */}
                                                        <Typography sx={{ 
                                                            mb: isMobile ? 0 : 1,
                                                            fontSize: isMobile ? '14px' : 'inherit'
                                                        }}><b>Phone:</b> {editField === 'mobile' ? (
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
                                                                {(() => {
                                                                    // For Flight Voucher, prioritize booking_phone (from linked booking)
                                                                    // For Gift Voucher, use purchaser_phone
                                                                    const isGiftVoucher = v.book_flight === "Gift Voucher" || (v.book_flight || '').toLowerCase().includes('gift');
                                                                    let phoneValue = '';
                                                                    if (isGiftVoucher) {
                                                                        phoneValue = v.purchaser_phone || v.phone || '-';
                                                                    } else {
                                                                        // Flight Voucher: Use booking_phone if available and not empty
                                                                        // booking_phone comes from the linked booking and has country code
                                                                        const bookingPhone = v.booking_phone && String(v.booking_phone).trim() !== '' ? String(v.booking_phone).trim() : null;
                                                                        if (bookingPhone) {
                                                                            phoneValue = bookingPhone;
                                                                        } else {
                                                                        // Fallback to phone or mobile if booking_phone is not available
                                                                            phoneValue = v.phone || v.mobile || '-';
                                                                        }
                                                                    }
                                                                    
                                                                    // If phone value exists and is not '-', make it a clickable link
                                                                    if (phoneValue && phoneValue !== '-') {
                                                                        // Clean phone number for tel: link (remove spaces, dashes, parentheses)
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
                                                                    onClick={() => {
                                                                    const phoneValue = v.book_flight === "Gift Voucher" 
                                                                        ? (v.purchaser_phone || v.phone) 
                                                                        : (v.booking_phone && v.booking_phone.trim() !== '' ? v.booking_phone : (v.phone || v.mobile));
                                                                    handleEditClick('mobile', phoneValue);
                                                                    }}
                                                                    sx={{ 
                                                                        padding: isMobile ? '2px' : '8px',
                                                                        minWidth: isMobile ? '20px' : 'auto',
                                                                        width: isMobile ? '20px' : 'auto',
                                                                        height: isMobile ? '20px' : 'auto',
                                                                        '& .MuiSvgIcon-root': {
                                                                            fontSize: isMobile ? '10px' : 'inherit'
                                                                        }
                                                                    }}
                                                                >
                                                                    <EditIcon fontSize={isMobile ? '10px' : 'small'} />
                                                                </IconButton>
                                                            </>
                                                        )}</Typography>
                                                        {/* Remove explicit Mobile row from Voucher Details popups */}
                                                        <Typography sx={{ 
                                                            mb: isMobile ? 0 : 1,
                                                            fontSize: isMobile ? '14px' : 'inherit'
                                                        }}><b>Email:</b> {editField === 'email' ? (
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
                                                                {(() => {
                                                                    // For Gift Voucher, use recipient_email; for Flight Voucher, use email
                                                                    const isGiftVoucher = v.book_flight === "Gift Voucher" || (v.book_flight || '').toLowerCase().includes('gift');
                                                                    const emailValue = isGiftVoucher 
                                                                        ? (v.recipient_email || v.email || '-')
                                                                        : (v.email || '-');
                                                                    // If email exists and is not '-', make it a clickable link
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
                                                                    onClick={() => handleEditClick('email', v.email)}
                                                                    sx={{ 
                                                                        padding: isMobile ? '2px' : '8px',
                                                                        minWidth: isMobile ? '20px' : 'auto',
                                                                        width: isMobile ? '20px' : 'auto',
                                                                        height: isMobile ? '20px' : 'auto',
                                                                        '& .MuiSvgIcon-root': {
                                                                            fontSize: isMobile ? '10px' : 'inherit'
                                                                        }
                                                                    }}
                                                                >
                                                                    <EditIcon fontSize={isMobile ? '10px' : 'small'} />
                                                                </IconButton>
                                                            </>
                                                        )}</Typography>
                                                        <Typography sx={{ 
                                                            mb: isMobile ? 0 : 1,
                                                            fontSize: isMobile ? '14px' : 'inherit'
                                                        }}><b>Created:</b> {bookingDetail.voucher.created_at ? (
                                                            (() => {
                                                                // Backend returns DD/MM/YYYY HH:mm format
                                                                // If it's already in DD/MM/YYYY format, use it directly
                                                                if (typeof bookingDetail.voucher.created_at === 'string' && bookingDetail.voucher.created_at.includes('/')) {
                                                                    // Extract date part (before space if time exists)
                                                                    const datePart = bookingDetail.voucher.created_at.split(' ')[0];
                                                                    return datePart; // Already in DD/MM/YYYY format from backend
                                                                }
                                                                // Try dayjs parsing for Date objects or other formats
                                                                const createdMoment = dayjs(bookingDetail.voucher.created_at);
                                                                return createdMoment.isValid() ? createdMoment.format('DD/MM/YYYY') : bookingDetail.voucher.created_at;
                                                            })()
                                                        ) : '-'}</Typography>
                                                        <Typography sx={{ 
                                                            mb: isMobile ? 0 : 1,
                                                            fontSize: isMobile ? '14px' : 'inherit'
                                                        }}><b>Paid:</b> {editField === 'paid' ? (
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
                                                                <IconButton 
                                                                    size="small" 
                                                                    onClick={() => handleEditClick('paid', v.paid)}
                                                                    sx={{ 
                                                                        padding: isMobile ? '2px' : '8px',
                                                                        minWidth: isMobile ? '20px' : 'auto',
                                                                        width: isMobile ? '20px' : 'auto',
                                                                        height: isMobile ? '20px' : 'auto',
                                                                        '& .MuiSvgIcon-root': {
                                                                            fontSize: isMobile ? '10px' : 'inherit'
                                                                        }
                                                                    }}
                                                                >
                                                                    <EditIcon fontSize={isMobile ? '10px' : 'small'} />
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
                                                                        value={editValue ? dayjs(editValue) : (bookingDetail.voucher.expires ? dayjs(bookingDetail.voucher.expires) : null)}
                                                                        onChange={date => setEditValue(date ? date.format('YYYY-MM-DD') : '')}
                                                                        format="DD/MM/YYYY"
                                                                        slotProps={{ textField: { size: 'small' } }}
                                                                    />
                                                                </LocalizationProvider>
                                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                {bookingDetail.voucher.expires ? (
                                                                    (() => {
                                                                        // Calculate expires date based on flight_attempts (add 6 months if multiple of 3)
                                                                        const flightAttempts = v.flight_attempts ?? 0;
                                                                        return calculateExpiresDate(bookingDetail.voucher.expires, flightAttempts);
                                                                    })()
                                                                ) : '-'}
                                                                <IconButton 
                                                                    size="small" 
                                                                    onClick={() => handleEditClick('expires', bookingDetail.voucher.expires)}
                                                                    sx={{ 
                                                                        padding: isMobile ? '2px' : '8px',
                                                                        minWidth: isMobile ? '20px' : 'auto',
                                                                        width: isMobile ? '20px' : 'auto',
                                                                        height: isMobile ? '20px' : 'auto',
                                                                        '& .MuiSvgIcon-root': {
                                                                            fontSize: isMobile ? '10px' : 'inherit'
                                                                        }
                                                                    }}
                                                                >
                                                                    <EditIcon fontSize={isMobile ? '10px' : 'small'} />
                                                                </IconButton>
                                                            </>
                                                        )}</Typography>
                                                        {/* Weight field moved to Passenger Details section */}
                                                        <Typography sx={{ 
                                                            mb: isMobile ? 0 : 1,
                                                            fontSize: isMobile ? '14px' : 'inherit'
                                                        }}><b>Voucher ID:</b> {v.id || '-'}</Typography>
                                                        <Typography sx={{ 
                                                            mb: isMobile ? 0 : 1,
                                                            fontSize: isMobile ? '14px' : 'inherit'
                                                        }}><b>Voucher Code:</b> {v.voucher_code || '-'}</Typography>
                                                        <Typography sx={{ 
                                                            mb: isMobile ? 0 : 1,
                                                            fontSize: isMobile ? '14px' : 'inherit'
                                                        }}><b>Flight Attempts:</b> {v.flight_attempts ?? 0}</Typography>
                                                        {v.booking_references && v.booking_references.length > 0 && (
                                                            <Typography sx={{ 
                                                                mb: isMobile ? 0 : 1,
                                                                fontSize: isMobile ? '14px' : 'inherit'
                                                            }}><b>Attempt History:</b></Typography>
                                                        )}
                                                        {v.booking_references && v.booking_references.map((ref, idx) => (
                                                            <Typography key={idx} sx={{ 
                                                                marginLeft: '20px', 
                                                                fontSize: isMobile ? '12px' : '0.9em',
                                                                mb: isMobile ? 0 : 1
                                                            }}>
                                                                Attempt {ref.attempt_number}: Booking #{ref.booking_id} cancelled on {new Date(ref.cancelled_at).toLocaleDateString()}
                                                            </Typography>
                                                        ))}
                                                    </>;
                                                })()
                                            ) : (
                                                <>
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
                                                        // Always show Passenger 1's name (first_name + last_name)
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
                                                        // If phone value exists and is not '-', make it a clickable link
                                                        if (phoneValue && phoneValue !== '-') {
                                                            // Clean phone number for tel: link (remove spaces, dashes, parentheses)
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
                                                        // If email exists and is not '-', make it a clickable link
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
                                                            <Button size="small" onClick={async () => {
                                                                // When due changes, recalculate passenger prices with new total
                                                                const newDue = parseFloat(editValue) || 0;
                                                                const paid = parseFloat(bookingDetail.booking.paid) || 0;
                                                                const totalAmount = paid + newDue;
                                                                const n = bookingDetail.passengers.length;
                                                                const perPassenger = n > 0 ? parseFloat((totalAmount / n).toFixed(2)) : 0;
                                                                
                                                                console.log('=== UPDATING DUE AND PASSENGER PRICES (BOOKING PAGE) ===');
                                                                console.log('Current Paid:', paid);
                                                                console.log('New Due:', newDue);
                                                                console.log('Total Amount:', totalAmount);
                                                                console.log('Passengers:', n);
                                                                console.log('Per Passenger:', perPassenger);
                                                                
                                                                // Update all passengers in backend
                                                                await Promise.all(bookingDetail.passengers.map((p) =>
                                                                    axios.patch('/api/updatePassengerField', {
                                                                        passenger_id: p.id,
                                                                        field: 'price',
                                                                        value: perPassenger
                                                                    })
                                                                ));
                                                                
                                                                // Update due in backend
                                                                await axios.patch('/api/updateBookingField', {
                                                                    booking_id: bookingDetail.booking.id,
                                                                    field: 'due',
                                                                    value: newDue
                                                                });
                                                                
                                                                // Update UI
                                                                setBookingDetail(prev => ({
                                                                    ...prev,
                                                                    booking: { ...prev.booking, due: newDue },
                                                                    passengers: prev.passengers.map(p => ({ ...p, price: perPassenger }))
                                                                }));
                                                                setEditField(null);
                                                                setEditValue('');
                                                            }} disabled={savingEdit}>Save</Button>
                                                            <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                    <span style={{ color: bookingDetail.booking.due > 0 ? '#d32f2f' : '#666', fontWeight: bookingDetail.booking.due > 0 ? 600 : 400 }}>
                                                        {(() => {
                                                            const experience = bookingDetail.booking?.experience || '';
                                                            const isPrivateCharter = experience === 'Private Charter' || experience.includes('Private');
                                                            
                                                            // For both Private Charter and Shared Flight, use the due value from backend
                                                            // Backend calculates the correct due amount based on booking type
                                                            const currentDue = parseFloat(bookingDetail.booking?.due) || 0;
                                                            return `£${currentDue.toFixed(2)}`;
                                                        })()}
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
                                                                    // Calculate expires date based on flight_attempts (add 6 months if multiple of 3)
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
        // For both Private Charter and Shared Flight: check weather_refund_total_price
        // Handle both string and number types, and check for null/undefined
        let weatherRefundTotalPrice = 0;
        const rawValue = bookingDetail.booking?.weather_refund_total_price || 
                        bookingDetail.weather_refund_total_price || 
                        null;
        
        if (rawValue !== null && rawValue !== undefined) {
            // Convert to number, handling both string and number types
            const parsed = parseFloat(rawValue);
            if (!isNaN(parsed)) {
                weatherRefundTotalPrice = parsed;
            }
        }
        
        // Debug logging
        console.log('WX Refundable Check:', {
            rawValue,
            weatherRefundTotalPrice,
            bookingDetailBooking: bookingDetail.booking,
            bookingDetail: bookingDetail
        });
        
        // Check weather_refund_total_price for both Private Charter and Shared Flight
        if (weatherRefundTotalPrice > 0) {
            // Get passenger names for display
            const passengerNames = Array.isArray(bookingDetail.passengers)
                ? bookingDetail.passengers.map(p => `${p.first_name || ''} ${p.last_name || ''}`.trim()).filter(Boolean)
                : [];
            const namesDisplay = passengerNames.length > 0 ? ` — ${passengerNames.join(', ')}` : '';
        return (
            <span>
                <span style={{ color: '#10b981', fontWeight: 'bold', marginRight: '4px' }}>✔</span>
                    Yes{namesDisplay}
            </span>
        );
        } else {
            return 'No';
        }
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
                                                                <Typography><b>Voucher Ref:</b> {v.voucher_ref || '-'}</Typography>
                                                                {/* Number of Passengers should come from API's numberOfVouchers; fallback to passengers/pax */}
                                                                <Typography>
                                                                    <b>Number of Passengers:</b>{' '}
                                                                    {(() => {
                                                                        const fromApi = v.numberOfVouchers;
                                                                        const fromVoucher = v.numberOfPassengers;
                                                                        const fromRelatedBooking = bookingDetail.booking?.pax || bookingDetail.booking?.passenger_count;
                                                                        return fromApi || fromVoucher || fromRelatedBooking || 1;
                                                                    })()}
                                                                </Typography>
                                                                <Typography><b>Created:</b> {v.created_at ? (
                                                                    (() => {
                                                                        // Backend returns DD/MM/YYYY HH:mm format
                                                                        // If it's already in DD/MM/YYYY format, use it directly
                                                                        if (typeof v.created_at === 'string' && v.created_at.includes('/')) {
                                                                            // Extract date part (before space if time exists)
                                                                            const datePart = v.created_at.split(' ')[0];
                                                                            return datePart; // Already in DD/MM/YYYY format from backend
                                                                        }
                                                                        // Try dayjs parsing for Date objects or other formats
                                                                        const createdMoment = dayjs(v.created_at);
                                                                        return createdMoment.isValid() ? createdMoment.format('DD/MM/YYYY') : v.created_at;
                                                                    })()
                                                                ) : '-'}</Typography>
                                                                <Typography><b>Expires:</b> {v.expires ? (
                                                                    (() => {
                                                                        // Calculate expires date based on flight_attempts (add 6 months if multiple of 3)
                                                                        const flightAttempts = v.flight_attempts ?? 0;
                                                                        return calculateExpiresDate(v.expires, flightAttempts);
                                                                    })()
                                                                ) : '-'}</Typography>
                                                            </>;
                                                        })()
                                                    ) : (
                                                        <>
                                                    <Typography><b>Activity:</b> {bookingDetail.booking?.experience || bookingDetail.booking?.flight_type || '-'} - {bookingDetail.booking?.location || '-'}</Typography>
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
                                                    {(() => {
                                                        // Consider voucher redeemed ONLY if explicit redeemed flag is present
                                                        const b = bookingDetail.booking || {};
                                                        const v = bookingDetail.voucher || {};
                                                        const redeemed = (b.redeemed === true) || (b.voucher_redeemed === 1) || (typeof b.redeemed_at === 'string' && b.redeemed_at) || (v.redeemed === 'Yes' || v.redeemed === true) || (b.redeemed_voucher === 'Yes');
                                                        return (
                                                            <Typography>
                                                                <b>Redeemed Voucher:</b> {redeemed ? <span style={{ color: 'green', fontWeight: 600 }}>Yes</span> : <span style={{ color: 'red', fontWeight: 600 }}>No</span>} <span style={{ fontWeight: 500 }}>{b.voucher_code || ''}</span>
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
                                                        </>
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
                                                    {(() => {
                                                        const v = bookingDetail?.voucher || {};
                                                        // For Gift Voucher: show "Redeem", for Flight Voucher: show "Rebook"
                                                        const isGiftVoucher = v?.book_flight === 'Gift Voucher';
                                                        const isFlightVoucher = !isGiftVoucher && (v?.voucher_type && typeof v.voucher_type === 'string' && v.voucher_type.toLowerCase().includes('flight'));
                                                        const label = isGiftVoucher ? 'Redeem' : 'Rebook';
                                                        return (
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
                                                                    padding: isMobile ? '6px 8px' : '8px 16px'
                                                                }} 
                                                                onClick={handleRebook}
                                                            >
                                                                {label}
                                                            </Button>
                                                        );
                                                    })()}
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
                                                            padding: isMobile ? '6px 8px' : '8px 16px'
                                                        }} 
                                                        onClick={handleAddGuestClick}
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
                                                            background: '#6c757d',
                                                            flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                                            minWidth: isMobile ? 'auto' : 'auto',
                                                            fontSize: isMobile ? '12px' : '14px',
                                                            padding: isMobile ? '6px 8px' : '8px 16px'
                                                        }} 
                                                        onClick={handleCancelFlight}
                                                    >
                                                        Cancel Flight
                                                    </Button>
                                                    {(() => {
                                                        const v = bookingDetail?.voucher || {};
                                                        const isGiftVoucher = v?.book_flight === 'Gift Voucher';
                                                        // Flight Voucher kontrolü: book_flight === 'Flight Voucher' veya voucher_type 'flight' içeriyorsa
                                                        const isFlightVoucher =
                                                            !isGiftVoucher &&
                                                            (v?.book_flight === 'Flight Voucher' ||
                                                            (v?.voucher_type &&
                                                            typeof v.voucher_type === 'string' &&
                                                            v.voucher_type.toLowerCase().includes('flight')));

                                                    const emailHandler = isGiftVoucher
                                                        ? handleGiftVoucherEmail
                                                        : isFlightVoucher
                                                                ? handleEmailFlightVoucher
                                                                : handleEmailBooking;

                                                    const hasGiftEmail =
                                                        v?.recipient_email ||
                                                        v?.email ||
                                                        bookingDetail?.booking?.email;

                                                        return (
                                                            <Button
                                                                variant="contained"
                                                                color="success"
                                                                sx={{ 
                                                                    borderRadius: 2, 
                                                                    fontWeight: 600, 
                                                                    textTransform: 'none', 
                                                                    background: '#28a745',
                                                                    mb: isMobile ? 0 : 1,
                                                                    flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                                                    minWidth: isMobile ? 'auto' : 'auto',
                                                                    fontSize: isMobile ? '12px' : '14px',
                                                                    padding: isMobile ? '6px 8px' : '8px 16px'
                                                                }}
                                                                onClick={emailHandler}
                                                                disabled={
                                                                    (isFlightVoucher && !v?.email && !bookingDetail?.booking?.email) ||
                                                                    (isGiftVoucher && !hasGiftEmail)
                                                                }
                                                            >
                                                                Email
                                                            </Button>
                                                        );
                                                    })()}
                                                    {(() => {
                                                        const v = bookingDetail?.voucher || {};
                                                        const isGiftVoucher = v?.book_flight === 'Gift Voucher';
                                                        const isFlightVoucher =
                                                            !isGiftVoucher &&
                                                            (v?.book_flight === 'Flight Voucher' ||
                                                            (v?.voucher_type &&
                                                            typeof v.voucher_type === 'string' &&
                                                            v.voucher_type.toLowerCase().includes('flight')));
                                                        
                                                        // For Flight Voucher: check purchaser_phone, purchaser_mobile, or phone
                                                        // For Gift Voucher: check recipient_phone or phone
                                                        // For regular booking: check booking.phone
                                                        const hasPhone = isFlightVoucher
                                                            ? (v?.purchaser_phone || v?.purchaser_mobile || v?.phone || bookingDetail?.booking?.phone)
                                                            : isGiftVoucher
                                                                ? (v?.recipient_phone || v?.phone || bookingDetail?.booking?.phone)
                                                                : (bookingDetail?.booking?.phone);
                                                        
                                                        const smsHandler = () => {
                                                            // For Flight Voucher, use voucher data
                                                            if (isFlightVoucher && v) {
                                                                const phone = v.purchaser_phone || v.purchaser_mobile || v.phone || '';
                                                                const name = v.purchaser_name || v.name || '';
                                                                const voucherId = v.id;
                                                                
                                                                const firstTemplate = smsTemplates.length > 0 ? smsTemplates[0] : null;
                                                                let message = '';
                                                                let templateValue = 'custom';
                                                                if (firstTemplate) {
                                                                    templateValue = String(firstTemplate.id);
                                                                    message = firstTemplate.message || '';
                                                                } else {
                                                                    message = `Hi ${name || ''}, this is a message regarding your Fly Away Ballooning voucher.`;
                                                                }
                                                                
                                                                setSmsForm({
                                                                    to: cleanPhoneNumber(phone),
                                                                    message,
                                                                    template: templateValue
                                                                });
                                                                setSmsPersonalNote('');
                                                                setSmsModalOpen(true);
                                                                
                                                                // Fetch SMS logs for voucher
                                                                (async () => {
                                                                    try {
                                                                        setSmsLogsLoading(true);
                                                                        // Use voucher ID or booking ID if available
                                                                        const contextId = bookingDetail?.booking?.id || voucherId;
                                                                        if (contextId) {
                                                                            const resp = await axios.get(`/api/bookingSms/${contextId}`);
                                                                            setSmsLogs(resp.data?.data || []);
                                                                        } else {
                                                                            setSmsLogs([]);
                                                                        }
                                                                    } catch { setSmsLogs([]); }
                                                                    finally { setSmsLogsLoading(false); }
                                                                })();
                                                                return;
                                                            }
                                                            
                                                            // For Gift Voucher, use voucher data
                                                            if (isGiftVoucher && v) {
                                                                const phone = v.recipient_phone || v.phone || '';
                                                                const name = v.recipient_name || v.name || '';
                                                                const voucherId = v.id;
                                                                
                                                                const firstTemplate = smsTemplates.length > 0 ? smsTemplates[0] : null;
                                                                let message = '';
                                                                let templateValue = 'custom';
                                                                if (firstTemplate) {
                                                                    templateValue = String(firstTemplate.id);
                                                                    message = firstTemplate.message || '';
                                                                } else {
                                                                    message = `Hi ${name || ''}, this is a message regarding your Fly Away Ballooning gift voucher.`;
                                                                }
                                                                
                                                                setSmsForm({
                                                                    to: cleanPhoneNumber(phone),
                                                                    message,
                                                                    template: templateValue
                                                                });
                                                                setSmsPersonalNote('');
                                                                setSmsModalOpen(true);
                                                                
                                                                // Fetch SMS logs for voucher
                                                                (async () => {
                                                                    try {
                                                                        setSmsLogsLoading(true);
                                                                        const contextId = bookingDetail?.booking?.id || voucherId;
                                                                        if (contextId) {
                                                                            const resp = await axios.get(`/api/bookingSms/${contextId}`);
                                                                            setSmsLogs(resp.data?.data || []);
                                                                        } else {
                                                                            setSmsLogs([]);
                                                                        }
                                                                    } catch { setSmsLogs([]); }
                                                                    finally { setSmsLogsLoading(false); }
                                                                })();
                                                                return;
                                                            }
                                                            
                                                            // For regular booking
                                                            if (!bookingDetail?.booking) return;
                                                            const booking = bookingDetail.booking;
                                                            setSelectedBookingForEmail(booking);
                                                            const firstTemplate = smsTemplates.length > 0 ? smsTemplates[0] : null;
                                                            let message = '';
                                                            let templateValue = 'custom';
                                                            if (firstTemplate) {
                                                                templateValue = String(firstTemplate.id);
                                                                message = firstTemplate.message || '';
                                                            } else {
                                                                message = `Hi ${booking.name || ''}, this is a message regarding your Fly Away Ballooning booking.`;
                                                            }
                                                            setSmsForm({
                                                                to: cleanPhoneNumber(booking.phone || ''),
                                                                message,
                                                                template: templateValue
                                                            });
                                                            setSmsPersonalNote('');
                                                            setSmsModalOpen(true);
                                                            (async () => {
                                                                try {
                                                                    setSmsLogsLoading(true);
                                                                    const resp = await axios.get(`/api/bookingSms/${booking.id}`);
                                                                    setSmsLogs(resp.data?.data || []);
                                                                } catch { setSmsLogs([]); }
                                                                finally { setSmsLogsLoading(false); }
                                                            })();
                                                        };
                                                        return (
                                                            <Button
                                                                variant="contained"
                                                                color="info"
                                                                sx={{ 
                                                                    borderRadius: 2, 
                                                                    fontWeight: 600, 
                                                                    textTransform: 'none', 
                                                                    background: '#17a2b8',
                                                                    mb: isMobile ? 0 : 1,
                                                                    flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                                                    minWidth: isMobile ? 'auto' : 'auto',
                                                                    fontSize: isMobile ? '12px' : '14px',
                                                                    padding: isMobile ? '6px 8px' : '8px 16px'
                                                                }}
                                                                onClick={smsHandler}
                                                                disabled={!hasPhone}
                                                            >
                                                                SMS
                                                            </Button>
                                                        );
                                                    })()}
                                                    {(() => {
                                                        const v = bookingDetail?.voucher || {};
                                                        const isGiftVoucher = v?.book_flight === 'Gift Voucher';
                                                        // Flight Voucher kontrolü: book_flight === 'Flight Voucher' veya voucher_type 'flight' içeriyorsa
                                                        const isFlightVoucher =
                                                            !isGiftVoucher &&
                                                            (v?.book_flight === 'Flight Voucher' ||
                                                            (v?.voucher_type &&
                                                            typeof v.voucher_type === 'string' &&
                                                            v.voucher_type.toLowerCase().includes('flight')));
                                                        const messageHandler = (isGiftVoucher || isFlightVoucher) && bookingDetail?.voucher
                                                            ? handleVoucherMessagesClick
                                                            : handleMessagesClick;
                                                        const target = (isGiftVoucher || isFlightVoucher) && bookingDetail?.voucher
                                                            ? bookingDetail.voucher
                                                            : bookingDetail?.booking;
                                                        return (
                                                    <>
                                                    <Button
                                                        variant="contained"
                                                        color="secondary"
                                                        sx={{ 
                                                            borderRadius: 2, 
                                                            fontWeight: 600, 
                                                            textTransform: 'none', 
                                                            background: '#17a2b8',
                                                            mb: isMobile ? 0 : 1,
                                                            flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                                            minWidth: isMobile ? 'auto' : 'auto',
                                                            fontSize: isMobile ? '12px' : '14px',
                                                            padding: isMobile ? '6px 8px' : '8px 16px'
                                                        }}
                                                                onClick={() => target && messageHandler(target)}
                                                                disabled={!target}
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
                                                            background: '#6c757d', 
                                                            mt: isMobile ? 0 : 1,
                                                            mb: isMobile ? 0 : 1,
                                                            flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                                            minWidth: isMobile ? 'auto' : 'auto',
                                                            fontSize: isMobile ? '12px' : '14px',
                                                            padding: isMobile ? '6px 8px' : '8px 16px'
                                                        }}
                                                        onClick={() => {
                                                            // For vouchers, prioritize voucher ID/ref for payment history
                                                            // Voucher payment history includes voucher's own payment (all_vouchers.paid)
                                                            const voucherId = bookingDetail?.voucher?.id;
                                                            const voucherRef = bookingDetail?.voucher?.voucher_ref;
                                                            const voucherIdOrRef = voucherId || voucherRef;
                                                            
                                                            // For linked bookings, also check booking payment history
                                                            const linkedBookingId = bookingDetail?.voucher?.booking_id || bookingDetail?.booking?.id;
                                                            
                                                            // Clear payment history before opening modal to avoid showing stale data
                                                            setPaymentHistory([]);
                                                            setPaymentHistoryModalOpen(true);
                                                            // Pass voucher ID/ref first, then booking ID
                                                            // This ensures voucher's own payment is fetched first
                                                            fetchPaymentHistory(linkedBookingId || null, voucherIdOrRef || null);
                                                        }}
                                                        disabled={!bookingDetail?.booking?.id && !bookingDetail?.voucher?.booking_id && !bookingDetail?.voucher?.voucher_ref && !bookingDetail?.voucher?.id}
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
                                                            background: '#6c757d', 
                                                            mt: isMobile ? 0 : 1,
                                                            flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                                            minWidth: isMobile ? 'auto' : 'auto',
                                                            fontSize: isMobile ? '12px' : '14px',
                                                            padding: isMobile ? '6px 8px' : '8px 16px'
                                                        }}
                                                        onClick={() => {
                                                            // For vouchers, use linked booking_id; for bookings, use booking.id
                                                            const linkedBookingId = bookingDetail?.voucher?.booking_id || bookingDetail?.booking?.id;
                                                            if (linkedBookingId) {
                                                                setUserSessionModalOpen(true);
                                                                fetchUserSession(linkedBookingId);
                                                            }
                                                        }}
                                                        disabled={!bookingDetail?.booking?.id && !bookingDetail?.voucher?.booking_id}
                                                    >
                                                        More
                                                    </Button>
                                                    </>
                                                        );
                                                    })()}
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
                                                            const voucherId = v.id;
                                                            if (!voucherId) {
                                                                return <Typography sx={{ color: '#888' }}>Voucher ID not available</Typography>;
                                                            }
                                                            return (
                                                                <Box>
                                                                    {passengers.map((p, i) => {
                                                                        const isEditing = editingVoucherPassenger?.voucher_id === voucherId && editingVoucherPassenger?.passenger_index === i;
                                                                        return (
                                                                            <Typography key={`${p.id || i}-${p.first_name || ''}-${p.last_name || ''}-${i}`}>
                                                                                Passenger {i + 1}: {isEditing ? (
                                                                                    <>
                                                                                        <input
                                                                                            value={editVoucherPassengerFirstName}
                                                                                            onChange={e => setEditVoucherPassengerFirstName(e.target.value)}
                                                                                            placeholder="First Name"
                                                                                            style={{ marginRight: 4, width: 90 }}
                                                                                        />
                                                                                        <input
                                                                                            value={editVoucherPassengerLastName}
                                                                                            onChange={e => setEditVoucherPassengerLastName(e.target.value)}
                                                                                            placeholder="Last Name"
                                                                                            style={{ marginRight: 4, width: 90 }}
                                                                                        />
                                                                                        <input
                                                                                            value={editVoucherPassengerWeight}
                                                                                            onChange={e => setEditVoucherPassengerWeight(e.target.value.replace(/[^0-9.]/g, ''))}
                                                                                            placeholder="Weight (kg)"
                                                                                            style={{ marginRight: 4, width: 70 }}
                                                                                        />
                                                                                        {/* Hide price input for Private Charter */}
                                                                                        {v.experience_type !== 'Private Charter' && (
                                                                                            <input
                                                                                                value={editVoucherPassengerPrice}
                                                                                                onChange={e => setEditVoucherPassengerPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                                                                                                placeholder="Price (£)"
                                                                                                style={{ marginRight: 4, width: 70 }}
                                                                                            />
                                                                                        )}
                                                                                        <Button size="small" onClick={() => handleSaveVoucherPassengerEdit(p, i, voucherId)} disabled={savingVoucherPassengerEdit}>Save</Button>
                                                                                        <Button size="small" onClick={handleCancelVoucherPassengerEdit} disabled={savingVoucherPassengerEdit}>Cancel</Button>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        {/* Hide price for Private Charter experience */}
                                                                                        {p.first_name || '-'} {p.last_name || '-'}
                                                                                        {p.weight ? (
                                                                                            v.experience_type === 'Private Charter' 
                                                                                                ? ` (${p.weight}kg)` 
                                                                                                : ` (${p.weight}kg${p.price ? ' £' + p.price : ''})`
                                                                                        ) : ''}
                                                                                        <IconButton size="small" onClick={() => handleEditVoucherPassengerClick(p, i, voucherId)}><EditIcon fontSize="small" /></IconButton>
                                                                                    </>
                                                                                )}
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
                                                            {(() => {
                                                                // Use passengers in the order they come from backend (already sorted by ORDER BY id ASC)
                                                                // This preserves the original insertion order and matches Flight Voucher Details
                                                                const passengers = bookingDetail.passengers;
                                                                                                
                                                                // Calculate original passenger count from original_amount
                                                                // original_amount = 220 * originalPaxCount (for Shared Flight)
                                                                const BASE_PRICE_PER_PASSENGER = 220;
                                                                const originalAmount = parseFloat(bookingDetail.booking?.original_amount) || 0;
                                                                const originalPaxCount = originalAmount > 0 
                                                                    ? Math.round(originalAmount / BASE_PRICE_PER_PASSENGER) 
                                                                    : passengers.length; // Fallback to all passengers if original_amount is 0
                                                                                                
                                                                                                return passengers.map((p, i) => {
                                                                                                    const isOriginalPassenger = i < originalPaxCount; // First N passengers are from original booking (ballooning-book)
                                                                                                    
                                                                                                    return (
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
                                                                            {/* Hide price input for Private Charter */}
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

                                                                                        // 1) Update name & weight fields if changed
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

                                                                                        // 2) Save passenger price (existing behaviour)
                                                                                        const newPrice = parseFloat(editPassengerPrice) || 0;
                                                                                        await axios.patch('/api/updatePassengerField', {
                                                                                            passenger_id: p.id,
                                                                                            field: 'price',
                                                                                            value: newPrice
                                                                                        });

                                                                                        // 3) Update local state (booking.paid and passenger fields)
                                                                                        const updatedPrices = bookingDetail.passengers.map((pp) =>
                                                                                            pp.id === p.id ? newPrice : (pp.price ? parseFloat(pp.price) : 0)
                                                                                        );
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
                                                                                                pp.id === p.id
                                                                                                    ? {
                                                                                                        ...pp,
                                                                                                        first_name: editPassengerFirstName,
                                                                                                        last_name: editPassengerLastName,
                                                                                                        weight: editPassengerWeight,
                                                                                                        price: newPrice
                                                                                                    }
                                                                                                    : pp
                                                                                            )
                                                                                        }));

                                                                                        setEditPassengerPrices(updatedPrices);
                                                                                        setEditingPassenger(null);
                                                                                        setEditPassengerPrice("");
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
                                                                            {/* Calculate correct passenger price dynamically */}
                                                                            {(() => {
                                                                                const isPrivateCharter = bookingDetail.booking?.experience === 'Private Charter';
                                                                                
                                                                                        if (isPrivateCharter) {
                                                                                            return (
                                                                                                <>
                                                                                                    {p.first_name || '-'} {p.last_name || '-'}
                                                                                                    {p.weight ? ` (${p.weight}kg)` : ''}
                                                                                                </>
                                                                                            );
                                                                                        }
                                                                                        
                                                                                        // For Shared Flight: Calculate price as originalAmount / original passenger count (guest NOT included in count)
                                                                                        // All passengers (original + guest) pay the same base price: originalAmount / original passenger count
                                                                                        const originalAmount = parseFloat(bookingDetail.booking?.original_amount) || 0;
                                                                                        const addOnTotalPrice = parseFloat(bookingDetail.booking?.add_to_booking_items_total_price) || 0;
                                                                                        const WEATHER_REFUND_PRICE = 47.5;
                                                                                        const hasWeatherRefund = p.weather_refund === 1 || p.weather_refund === '1' || p.weather_refund === true;
                                                                                        const weatherRefundPrice = hasWeatherRefund ? WEATHER_REFUND_PRICE : 0;
                                                                                        
                                                                                        // Original passenger count (guest NOT included)
                                                                                        // Calculate original passenger count from original_amount
                                                                                        // original_amount = passenger_count * base_price_per_passenger
                                                                                        const BASE_PRICE_PER_PASSENGER = 220;
                                                                                        let originalPaxCount = 0;
                                                                                        if (originalAmount > 0 && BASE_PRICE_PER_PASSENGER > 0) {
                                                                                            // Calculate original passenger count: originalAmount / BASE_PRICE_PER_PASSENGER
                                                                                            // Use Math.floor to avoid rounding errors (e.g., 660 / 220 = 3.0, not 3.2159)
                                                                                            originalPaxCount = Math.floor(originalAmount / BASE_PRICE_PER_PASSENGER);
                                                                                            // If result is 0 or invalid, fallback to passenger count
                                                                                            if (originalPaxCount <= 0) {
                                                                                                originalPaxCount = bookingDetail.passengers ? bookingDetail.passengers.length : 1;
                                                                                            }
                                                                                        } else {
                                                                                            // Fallback: use passenger count if originalAmount not available
                                                                                            originalPaxCount = bookingDetail.passengers ? bookingDetail.passengers.length : 1;
                                                                                        }
                                                                                        
                                                                                        // All passengers pay the same base price: originalAmount / original passenger count (guest excluded from count)
                                                                                        let basePricePerPassenger = 0;
                                                                                        if (originalAmount > 0 && originalPaxCount > 0) {
                                                                                            basePricePerPassenger = originalAmount / originalPaxCount;
                                                                                        } else {
                                                                                            // Fallback: use stored price if originalAmount not available
                                                                                            basePricePerPassenger = parseFloat(p.price) || 0;
                                                                                        }
                                                                                        
                                                                                        // Add-on price (only for first passenger)
                                                                                        let addOnPrice = 0;
                                                                                        const isFirstPassenger = i === 0;
                                                                                        addOnPrice = isFirstPassenger ? addOnTotalPrice : 0;
                                                                                        
                                                                                        // Build price display string
                                                                                        let priceDisplay = `£${basePricePerPassenger.toFixed(2)}`;
                                                                                        if (addOnPrice > 0) {
                                                                                            priceDisplay += ` + £${addOnPrice.toFixed(2)}`;
                                                                                        }
                                                                                        if (weatherRefundPrice > 0) {
                                                                                            priceDisplay += ` + £${weatherRefundPrice.toFixed(2)}`;
                                                                                        }
                                                                                
                                                                                return (
                                                                                    <>
                                                                                        {p.first_name || '-'} {p.last_name || '-'}
                                                                                        {p.weight ? (
                                                                                                    ` (${p.weight}kg ${priceDisplay})`
                                                                                                ) : (
                                                                                                    ` (${priceDisplay})`
                                                                                                )}
                                                                                        {!isOriginalPassenger && ' guest'}
                                                                                    </>
                                                                                );
                                                                            })()}
                                                                            <IconButton 
                                                                                size="small" 
                                                                                onClick={() => handleEditPassengerClick(p)}
                                                                                sx={{ 
                                                                                    padding: !isMobile ? '4px' : '8px',
                                                                                    '& .MuiSvgIcon-root': {
                                                                                        fontSize: !isMobile ? '14px' : 'small'
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <EditIcon fontSize={!isMobile ? '14px' : 'small'} />
                                                                            </IconButton>
                                                                            {i > 0 && ( // Only show delete button for additional passengers (not the first one)
                                                                                <IconButton 
                                                                                    size="small" 
                                                                                    onClick={() => handleDeletePassenger(p.id)}
                                                                                    sx={{ 
                                                                                        color: 'red',
                                                                                        padding: !isMobile ? '4px' : '8px',
                                                                                        '& .MuiSvgIcon-root': {
                                                                                            fontSize: !isMobile ? '14px' : 'small'
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <DeleteIcon fontSize={!isMobile ? '14px' : 'small'} />
                                                                                </IconButton>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </Typography>
                                                            );
                                                                });
                                                            })()}
                                                        </Box>
                                                    ) : null
                                                )}
                                                    </Box>
                                                );
                                            })()}
                                            {/* HISTORY SECTION - Mobile: Below Passenger Details, Desktop: After Additional Information */}
                                            {activeTab !== 'vouchers' && (
                                                <Box sx={{ 
                                                    background: '#e0e0e0', 
                                                    borderRadius: 2, 
                                                    p: isMobile ? 1.5 : 2, 
                                                    mt: isMobile ? 2 : 0,
                                                    mb: isMobile ? 2 : 2,
                                                    display: isMobile ? 'block' : 'none' // Show on mobile, hide on desktop (desktop version is below)
                                                }} className="booking-history-section">
                                                    <Typography variant="h6" sx={{ 
                                                        fontWeight: 700, 
                                                        mb: isMobile ? 1 : 2,
                                                        fontSize: isMobile ? '16px' : 'inherit'
                                                    }}>History</Typography>
                                                    <TableContainer component={Box} className="booking-history-table-container" sx={{
                                                        maxHeight: isMobile ? '300px' : 'none',
                                                        overflowX: isMobile ? 'auto' : 'visible',
                                                        overflowY: isMobile ? 'auto' : 'visible'
                                                    }}>
                                                    <Table className="booking-history-table" sx={{
                                                        minWidth: isMobile ? '500px' : 'auto',
                                                        fontSize: isMobile ? '12px' : 'inherit'
                                                    }}>
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell sx={{ 
                                                                    fontSize: isMobile ? '11px' : 'inherit',
                                                                    padding: isMobile ? '6px 4px' : '16px',
                                                                    fontWeight: 600
                                                                }}>Booking Date</TableCell>
                                                                <TableCell sx={{ 
                                                                    fontSize: isMobile ? '11px' : 'inherit',
                                                                    padding: isMobile ? '6px 4px' : '16px',
                                                                    fontWeight: 600
                                                                }}>Activity Type</TableCell>
                                                                <TableCell sx={{ 
                                                                    fontSize: isMobile ? '11px' : 'inherit',
                                                                    padding: isMobile ? '6px 4px' : '16px',
                                                                    fontWeight: 600
                                                                }}>Location</TableCell>
                                                                <TableCell sx={{ 
                                                                    fontSize: isMobile ? '11px' : 'inherit',
                                                                    padding: isMobile ? '6px 4px' : '16px',
                                                                    fontWeight: 600
                                                                }}>Status</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {historyRows.map((h, i) => (
                                                                <TableRow key={i}>
                                                                    <TableCell sx={{ 
                                                                        fontSize: isMobile ? '11px' : 'inherit',
                                                                        padding: isMobile ? '6px 4px' : '16px'
                                                                    }}>{h.flight_date ? dayjs(h.flight_date).format('DD/MM/YYYY HH:mm') : (h.changed_at ? dayjs(h.changed_at).format('DD/MM/YYYY HH:mm') : '-')}</TableCell>
                                                                    <TableCell sx={{ 
                                                                        fontSize: isMobile ? '11px' : 'inherit',
                                                                        padding: isMobile ? '6px 4px' : '16px'
                                                                    }}>{bookingDetail.booking?.flight_type || '-'}</TableCell>
                                                                    <TableCell sx={{ 
                                                                        fontSize: isMobile ? '11px' : 'inherit',
                                                                        padding: isMobile ? '6px 4px' : '16px'
                                                                    }}>{bookingDetail.booking?.location || '-'}</TableCell>
                                                                    <TableCell sx={{ 
                                                                        fontSize: isMobile ? '11px' : 'inherit',
                                                                        padding: isMobile ? '6px 4px' : '16px'
                                                                    }}>{h.status || 'Scheduled'}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                            {historyRows.length === 0 && (
                                                                <TableRow>
                                                                    <TableCell colSpan={4} align="center" sx={{ 
                                                                        fontSize: isMobile ? '11px' : 'inherit',
                                                                        padding: isMobile ? '6px 4px' : '16px'
                                                                    }}>No history yet</TableCell>
                                                                </TableRow>
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                    </TableContainer>
                                                </Box>
                                            )}
                                            {/* Recipient Details (Gift Voucher) above Notes */}
                                            {(() => {
                                                const v = bookingDetail.voucher || {};
                                                const hasRecipientData = v.recipient_name || v.recipient_email || v.recipient_phone || v.recipient_gift_date;
                                                if (activeTab === 'vouchers' && v.book_flight === 'Gift Voucher' && hasRecipientData) {
                                                    return (
                                                        <>
                                                            <Divider sx={{ my: 2 }} />
                                                            <Box>
                                                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Recipient Details</Typography>
                                                                <Box sx={{ mb: 2, background: '#f7f7f7', p: 2, borderRadius: 2 }}>
                                                                    <Typography><b>Name:</b> {v.recipient_name || '-'}</Typography>
                                                                    <Typography><b>Email:</b> {v.recipient_email || '-'}</Typography>
                                                                    <Typography><b>Phone:</b> {v.recipient_phone || '-'}</Typography>
                                                                    <Typography><b>Gift Date:</b> {v.recipient_gift_date ? dayjs(v.recipient_gift_date).format('DD/MM/YYYY') : '-'}</Typography>
                                                                <Button
                                                                    variant="contained"
                                                                    color="primary"
                                                                    sx={{ mt: 2, textTransform: 'none' }}
                                                                    onClick={() => handleRecipientEmail(v)}
                                                                    disabled={!v.recipient_email}
                                                                >
                                                                    Email Recipient
                                                                </Button>
                                                                </Box>
                                                            </Box>
                                                        </>
                                                    );
                                                }
                                                return null;
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
                                                            {(() => {
                                                                const notesFromBooking = bookingDetail.booking?.additional_notes;
                                                                const notesFromAdditional = additionalInformation?.additional_information_json?.notes;
                                                                const notesFromLegacy = additionalInformation?.legacy?.additional_notes;
                                                                const notesFromVoucherRecord = activeTab === 'vouchers' ? bookingDetail?.voucher?.additional_notes : null;
                                                                let notesFromVoucherJson = null;
                                                                if (activeTab === 'vouchers' && bookingDetail?.voucher?.additional_information_json) {
                                                                    try {
                                                                        const voucherJson = typeof bookingDetail.voucher.additional_information_json === 'string'
                                                                            ? JSON.parse(bookingDetail.voucher.additional_information_json)
                                                                            : bookingDetail.voucher.additional_information_json;
                                                                        notesFromVoucherJson = voucherJson?.notes || null;
                                                                    } catch (e) {
                                                                        console.warn('Failed to parse voucher additional_information_json while extracting notes:', e);
                                                                    }
                                                                }
                                                                const resolvedNotes = notesFromAdditional || notesFromLegacy || notesFromVoucherJson || notesFromVoucherRecord || null;
                                                                const shouldShowBookingNotes = notesFromBooking && notesFromBooking !== resolvedNotes;
                                                                return (
                                                                    <>
                                                                        {resolvedNotes && (
                                                                            <Box sx={{ mb: 2, p: 2, background: '#f5faff', borderRadius: 1, border: '1px solid #b3d4ff' }}>
                                                                                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1976d2' }}>Additional Notes</Typography>
                                                                                <Typography>{resolvedNotes}</Typography>
                                                                            </Box>
                                                                        )}
                                                                        {shouldShowBookingNotes && (
                                                                <Box sx={{ mb: 2, p: 2, background: '#e3f2fd', borderRadius: 1, border: '1px solid #2196f3' }}>
                                                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1976d2' }}>Booking Notes:</Typography>
                                                                                <Typography>{notesFromBooking}</Typography>
                                                                </Box>
                                                            )}
                                                                    </>
                                                                );
                                                            })()}
                                                            
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
                                            {/* HISTORY SECTION - Desktop: After Additional Information (hidden on mobile, shown above) */}
                                            {!isMobile && activeTab !== 'vouchers' && (
                                            <Box sx={{ background: '#e0e0e0', borderRadius: 2, p: 2, mt: 2, mb: 2 }} className="booking-history-section">
                                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>History</Typography>
                                                <TableContainer component={Box} className="booking-history-table-container">
                                                <Table className="booking-history-table">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell>Booking Date</TableCell>
                                                            <TableCell>Activity Type</TableCell>
                                                            <TableCell>Location</TableCell>
                                                            <TableCell>Status</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {historyRows.map((h, i) => (
                                                            <TableRow key={i}>
                                                                <TableCell>{h.flight_date ? dayjs(h.flight_date).format('DD/MM/YYYY HH:mm') : (h.changed_at ? dayjs(h.changed_at).format('DD/MM/YYYY HH:mm') : '-')}</TableCell>
                                                                <TableCell>{bookingDetail.booking?.flight_type || '-'}</TableCell>
                                                                <TableCell>{bookingDetail.booking?.location || '-'}</TableCell>
                                                                <TableCell>{h.status || 'Scheduled'}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {historyRows.length === 0 && (
                                                            <TableRow>
                                                                <TableCell colSpan={4} align="center">No history yet</TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                                </TableContainer>
                                            </Box>
                                            )}
                                        </Box>
                                        {/* Recipient Details moved to main column above Notes for Gift Vouchers */}
                                    </Grid>
                                    {/* Recipient Details was moved under Purchaser Information above for Gift Vouchers */}
                                    
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
                {/* Advanced Filter Dialog for All Bookings */}
                <Dialog
                    open={filterDialogOpen}
                    onClose={() => setFilterDialogOpen(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle sx={{ fontWeight: 700, fontSize: 22 }}>
                        Filter Bookings
                    </DialogTitle>
                    <DialogContent dividers>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                            Booking status
                        </Typography>
                        <FormGroup sx={{ mb: 2 }}>
                            {bookingStatusOptions.map(status => (
                                <FormControlLabel
                                    key={status}
                                    control={
                                        <Checkbox
                                            checked={filters.statusMulti.includes(status)}
                                            onChange={() => handleCheckboxFilterChange('statusMulti', status)}
                                        />
                                    }
                                    label={status}
                                />
                            ))}
                        </FormGroup>

                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                            Voucher type
                        </Typography>
                        <FormGroup sx={{ mb: 2 }}>
                            {bookingVoucherTypeOptions.map(type => (
                                <FormControlLabel
                                    key={type}
                                    control={
                                        <Checkbox
                                            checked={filters.voucherTypeMulti.includes(type)}
                                            onChange={() => handleCheckboxFilterChange('voucherTypeMulti', type)}
                                        />
                                    }
                                    label={type}
                                />
                            ))}
                        </FormGroup>

                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                            Location
                        </Typography>
                        <FormGroup>
                            {bookingLocationOptions.map(loc => (
                                <FormControlLabel
                                    key={loc}
                                    control={
                                        <Checkbox
                                            checked={filters.locationMulti.includes(loc)}
                                            onChange={() => handleCheckboxFilterChange('locationMulti', loc)}
                                        />
                                    }
                                    label={loc}
                                />
                            ))}
                        </FormGroup>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClearAdvancedFilters}>Clear</Button>
                        <Button onClick={() => setFilterDialogOpen(false)} variant="contained" color="primary">
                            Apply
                        </Button>
                    </DialogActions>
                </Dialog>
                <Dialog open={addGuestDialogOpen} onClose={() => setAddGuestDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ fontSize: isMobile ? 16 : 'inherit', padding: isMobile ? '12px 16px' : 'inherit' }}>Add Guest</DialogTitle>
                    <DialogContent sx={{ padding: isMobile ? '12px 16px' : '24px' }}>
                        <Typography sx={{ mb: isMobile ? 1 : 2, fontSize: isMobile ? 14 : 'inherit' }}>Experience: <b>{guestType}</b></Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: isMobile ? 1 : 2, mb: isMobile ? 1 : 2 }}>
                            <Typography sx={{ fontSize: isMobile ? 14 : 'inherit' }}>How many guests to add?</Typography>
                            <Button variant="outlined" onClick={() => setGuestCount(Math.max(guestCount - 1, 0))} sx={{ minWidth: isMobile ? '32px' : 'auto', padding: isMobile ? '4px 8px' : 'inherit' }}>-</Button>
                            <Typography sx={{ fontSize: isMobile ? 14 : 'inherit' }}>{guestCount}</Typography>
                            <Button variant="outlined" onClick={() => setGuestCount(guestCount + 1)} sx={{ minWidth: isMobile ? '32px' : 'auto', padding: isMobile ? '4px 8px' : 'inherit' }}>+</Button>
                        </Box>
                        {guestForms.map((g, idx) => (
                            <Box key={idx} sx={{ mb: isMobile ? 1 : 2, p: isMobile ? 1 : 2, border: '1px solid #eee', borderRadius: 2 }}>
                                <Typography sx={{ fontWeight: 600, mb: isMobile ? 0.5 : 1, fontSize: isMobile ? 14 : 'inherit' }}>Guest {idx + 1}</Typography>
                                <TextField 
                                    label="First Name" 
                                    value={g.firstName} 
                                    onChange={e => handleGuestFormChange(idx, 'firstName', e.target.value)} 
                                    fullWidth 
                                    size={isMobile ? "small" : "medium"}
                                    sx={{
                                        '& .MuiInputBase-root': {
                                            fontSize: isMobile ? '14px' : 'inherit',
                                            height: isMobile ? '40px' : 'auto'
                                        },
                                        '& .MuiInputLabel-root': {
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        },
                                        mb: isMobile ? 1 : 1.5
                                    }}
                                />
                                <TextField 
                                    label="Last Name" 
                                    value={g.lastName} 
                                    onChange={e => handleGuestFormChange(idx, 'lastName', e.target.value)} 
                                    fullWidth 
                                    size={isMobile ? "small" : "medium"}
                                    sx={{
                                        '& .MuiInputBase-root': {
                                            fontSize: isMobile ? '14px' : 'inherit',
                                            height: isMobile ? '40px' : 'auto'
                                        },
                                        '& .MuiInputLabel-root': {
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        },
                                        mb: isMobile ? 1 : 1.5
                                    }}
                                />
                                <TextField 
                                    label="Weight (kg)" 
                                    value={g.weight} 
                                    onChange={e => handleGuestFormChange(idx, 'weight', e.target.value)} 
                                    fullWidth 
                                    size={isMobile ? "small" : "medium"}
                                    sx={{
                                        '& .MuiInputBase-root': {
                                            fontSize: isMobile ? '14px' : 'inherit',
                                            height: isMobile ? '40px' : 'auto'
                                        },
                                        '& .MuiInputLabel-root': {
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        },
                                        mb: isMobile ? 1 : 1.5
                                    }}
                                />
                                {guestType && guestType.toLowerCase().includes('shared') && (
                                    <Box sx={{ mt: isMobile ? 1 : 2, p: isMobile ? 1 : 2, backgroundColor: '#f5f9ff', borderRadius: 2, border: '1px solid #dbeafe' }}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={Boolean(g.weatherRefund)}
                                                    onChange={(_, checked) => handleGuestFormChange(idx, 'weatherRefund', checked)}
                                                    color="primary"
                                                    size={isMobile ? "small" : "medium"}
                                                />
                                            }
                                            label={`Weather Refundable (+£47.50)`}
                                            sx={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                width: '100%', 
                                                margin: 0,
                                                '& .MuiFormControlLabel-label': {
                                                    fontSize: isMobile ? '13px' : 'inherit'
                                                }
                                            }}
                                        />
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: isMobile ? 0.5 : 1, fontSize: isMobile ? '11px' : 'inherit' }}>
                                            Provides weather protection for this guest. Charged per passenger.
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </DialogContent>
                    <DialogActions sx={{ padding: isMobile ? '8px 16px' : 'inherit' }}>
                        <Button onClick={() => setAddGuestDialogOpen(false)} sx={{ fontSize: isMobile ? '14px' : 'inherit', padding: isMobile ? '6px 12px' : 'inherit' }}>Cancel</Button>
                        <Button onClick={handleSaveGuests} variant="contained" color="primary" sx={{ fontSize: isMobile ? '14px' : 'inherit', padding: isMobile ? '6px 12px' : 'inherit' }}>Save</Button>
                    </DialogActions>
                </Dialog>
                <RebookAvailabilityModal
                    open={rebookModalOpen}
                    onClose={() => setRebookModalOpen(false)}
                    location={bookingDetail?.booking?.location}
                    onSlotSelect={handleRebookSlotSelect}
                    bookingDetail={bookingDetail}
                />

                {/* Messages Modal */}
                <Dialog
                    open={messagesModalOpen}
                    onClose={() => setMessagesModalOpen(false)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle sx={{ fontWeight: 700, fontSize: isMobile ? 18 : 24, padding: isMobile ? '12px 16px' : 'inherit' }}>
                        Messages
                        {selectedBookingForEmail && (
                            <Typography variant="subtitle2" color="textSecondary" sx={{ mt: isMobile ? 0.25 : 0.5, fontSize: isMobile ? 12 : 'inherit' }}>
                                Booking: {selectedBookingForEmail.name} ({selectedBookingForEmail.id})
                            </Typography>
                        )}
                    </DialogTitle>
                    <DialogContent dividers sx={{ background: '#f5f7fb', padding: isMobile ? '12px 16px' : '24px' }}>
                        {messagesLoading ? (
                            <Typography variant="body2" sx={{ fontSize: isMobile ? 14 : 'inherit' }}>Loading messages...</Typography>
                        ) : messageLogs.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: isMobile ? 14 : 'inherit' }}>
                                No messages have been sent for this booking yet.
                            </Typography>
                        ) : (
                            messageLogs
                                .sort((a, b) => dayjs(b.sent_at).valueOf() - dayjs(a.sent_at).valueOf())
                                .map((log, index) => {
                                    const statusInfo = getStatusDisplay(log.last_event || log.status);
                                    const expanded = !!expandedMessageIds[log.id || index];
                                    const fullHtml = buildLogHtml(log);
                                    const collapsedPreviewHtml =
                                        buildCollapsedPreviewHtml(log) ||
                                        '<span style="color:#94a3b8;">Expand to view full message.</span>';
                                    const expandedPreviewHtml =
                                        fullHtml ||
                                        collapsedPreviewHtml;
                                    return (
                                        <Box
                                            key={log.id || index}
                                            sx={{
                                                mb: isMobile ? 1.5 : 3,
                                                borderRadius: isMobile ? 2 : 3,
                                                background: '#ffffff',
                                                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                                                overflow: 'hidden',
                                                border: '1px solid #e2e8f0'
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: isMobile ? 'column' : 'row',
                                                    justifyContent: 'space-between',
                                                    alignItems: isMobile ? 'flex-start' : 'flex-start',
                                                    p: isMobile ? 1.5 : 3,
                                                    borderBottom: '1px solid #f1f5f9',
                                                    gap: isMobile ? 1 : 0
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', gap: isMobile ? 1 : 2, flex: 1, width: isMobile ? '100%' : 'auto' }}>
                                                    <Box
                                                        sx={{
                                                            width: isMobile ? 32 : 42,
                                                            height: isMobile ? 32 : 42,
                                                            borderRadius: '50%',
                                                            background: '#eef2ff',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: '#4f46e5',
                                                            flexShrink: 0
                                                        }}
                                                    >
                                                        <MailOutlineIcon sx={{ fontSize: isMobile ? 18 : 24 }} />
                                                    </Box>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography sx={{ fontWeight: 700, fontSize: isMobile ? 14 : 18, mb: isMobile ? 0.25 : 0.5, wordBreak: 'break-word' }}>
                                                            {log.subject || 'Email'}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: isMobile ? 11 : 'inherit', mb: isMobile ? 0.25 : 0 }}>
                                                            {log.sent_at
                                                                ? dayjs(log.sent_at).format('dddd, MMMM D, YYYY h:mm A')
                                                                : 'Unknown send date'}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: isMobile ? 11 : 'inherit', wordBreak: 'break-word' }}>
                                                            To: {log.recipient_email || '—'}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Box sx={{ textAlign: isMobile ? 'left' : 'right', mt: isMobile ? 1 : 0, width: isMobile ? '100%' : 'auto' }}>
                                                    <Box
                                                        sx={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            px: isMobile ? 1 : 1.5,
                                                            py: isMobile ? 0.25 : 0.5,
                                                            borderRadius: 999,
                                                            fontSize: isMobile ? 10 : 12,
                                                            fontWeight: 600,
                                                            color: '#fff',
                                                            backgroundColor: statusInfo.color,
                                                            mb: isMobile ? 0.5 : 0
                                                        }}
                                                    >
                                                        {statusInfo.label}
                                                    </Box>
                                                    <Typography variant="caption" display="block" sx={{ mt: isMobile ? 0.5 : 1, color: '#64748b', fontSize: isMobile ? 9 : 'inherit' }}>
                                                        Category: {log.template_type || 'Custom'}
                                                    </Typography>
                                                    <Typography variant="caption" display="block" sx={{ color: '#64748b', fontSize: isMobile ? 9 : 'inherit' }}>
                                                        Opens: {log.opens || 0} · Clicks: {log.clicks || 0}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Box sx={{ p: isMobile ? 1.5 : 3 }}>
                                                {expanded ? (
                                                    <Box
                                                        sx={{
                                                            background: '#f8fafc',
                                                            borderRadius: 2,
                                                            p: isMobile ? 1 : 2,
                                                            maxHeight: isMobile ? 250 : 400,
                                                            overflowY: 'auto',
                                                            fontSize: isMobile ? '12px' : 'inherit',
                                                            '& *': {
                                                                fontSize: isMobile ? '12px !important' : 'inherit',
                                                                maxWidth: '100%'
                                                            }
                                                        }}
                                                        dangerouslySetInnerHTML={{ __html: expandedPreviewHtml }}
                                                    />
                                                ) : (
                                                    <Box
                                                        sx={{ 
                                                            color: '#475569', 
                                                            lineHeight: 1.6,
                                                            fontSize: isMobile ? '12px' : 'inherit',
                                                            '& *': {
                                                                fontSize: isMobile ? '12px !important' : 'inherit',
                                                                maxWidth: '100%',
                                                                wordBreak: 'break-word'
                                                            }
                                                        }}
                                                        dangerouslySetInnerHTML={{ __html: collapsedPreviewHtml }}
                                                    />
                                                )}
                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: isMobile ? 1 : 2 }}>
                                                    <Button
                                                        size="small"
                                                        onClick={() => toggleMessageExpand(log.id || index)}
                                                        sx={{ 
                                                            textTransform: 'none',
                                                            fontSize: isMobile ? 12 : 'inherit',
                                                            padding: isMobile ? '4px 8px' : 'inherit'
                                                        }}
                                                    >
                                                        {expanded ? 'Collapse' : 'Expand'}
                                                    </Button>
                                                </Box>
                                            </Box>
                                        </Box>
                                    );
                                })
                        )}
                    </DialogContent>
                    <DialogActions sx={{ padding: isMobile ? '8px 16px' : 'inherit' }}>
                        <Button onClick={() => setMessagesModalOpen(false)} sx={{ fontSize: isMobile ? 14 : 'inherit', padding: isMobile ? '6px 12px' : 'inherit' }}>Close</Button>
                    </DialogActions>
                </Dialog>

                {/* Payment History Modal */}
                <Dialog
                    open={paymentHistoryModalOpen}
                    onClose={() => {
                        setPaymentHistoryModalOpen(false);
                        setExpandedPaymentIds({});
                    }}
                    maxWidth="lg"
                    fullWidth
                >
                    <DialogTitle sx={{ 
                        fontWeight: 700, 
                        fontSize: isMobile ? 18 : 24,
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        pb: isMobile ? 1 : 2,
                        padding: isMobile ? '12px 16px' : 'inherit',
                        gap: isMobile ? 1 : 0
                    }}>
                        <Box component="span" sx={{ fontWeight: 700, fontSize: isMobile ? '1.125rem' : '1.5rem' }}>
                            Payments / Promos
                        </Box>
                        <Box sx={{ display: 'flex', gap: isMobile ? 0.5 : 1, flexWrap: isMobile ? 'wrap' : 'nowrap', width: isMobile ? '100%' : 'auto' }}>
                            <Button 
                                variant="outlined" 
                                size={isMobile ? "small" : "small"}
                                sx={{ 
                                    textTransform: 'none', 
                                    borderRadius: 1,
                                    fontSize: isMobile ? 12 : 'inherit',
                                    padding: isMobile ? '4px 8px' : 'inherit',
                                    minWidth: isMobile ? 'auto' : 'inherit'
                                }}
                            >
                                + Payment
                            </Button>
                            <Button 
                                variant="outlined" 
                                size={isMobile ? "small" : "small"}
                                sx={{ 
                                    textTransform: 'none', 
                                    borderRadius: 1,
                                    fontSize: isMobile ? 12 : 'inherit',
                                    padding: isMobile ? '4px 8px' : 'inherit',
                                    minWidth: isMobile ? 'auto' : 'inherit'
                                }}
                            >
                                + Promo
                            </Button>
                            <Button 
                                variant="outlined" 
                                size={isMobile ? "small" : "small"}
                                startIcon={<span style={{ fontSize: isMobile ? 14 : 'inherit' }}>🕐</span>}
                                sx={{ 
                                    textTransform: 'none', 
                                    borderRadius: 1,
                                    fontSize: isMobile ? 11 : 'inherit',
                                    padding: isMobile ? '4px 6px' : 'inherit',
                                    minWidth: isMobile ? 'auto' : 'inherit',
                                    whiteSpace: isMobile ? 'normal' : 'nowrap'
                                }}
                            >
                                Save Card & Charge Later
                            </Button>
                        </Box>
                    </DialogTitle>
                    <DialogContent dividers sx={{ background: '#ffffff', p: 0, padding: isMobile ? '0' : '0' }}>
                        {paymentHistoryLoading ? (
                            <Box sx={{ p: isMobile ? 2 : 3, textAlign: 'center' }}>
                                <Typography variant="body2" sx={{ fontSize: isMobile ? 14 : 'inherit' }}>Loading payment history...</Typography>
                            </Box>
                        ) : paymentHistory.length === 0 ? (
                            <Box sx={{ p: isMobile ? 2 : 3, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: isMobile ? 14 : 'inherit' }}>
                                    No payment history available for this booking.
                                </Typography>
                            </Box>
                        ) : (
                            <Box>
                                {/* Table Header */}
                                <Box sx={{ 
                                    display: isMobile ? 'none' : 'flex', 
                                    px: isMobile ? 1.5 : 3, 
                                    py: isMobile ? 1 : 1.5, 
                                    borderBottom: '1px solid #e2e8f0',
                                    background: '#f8f9fa'
                                }}>
                                    <Box sx={{ flex: '0 0 200px', color: '#6c757d', fontSize: isMobile ? '0.7rem' : '0.875rem', fontWeight: 500 }}>
                                        DATE
                                    </Box>
                                    <Box sx={{ flex: 1, textAlign: 'center', color: '#6c757d', fontSize: isMobile ? '0.7rem' : '0.875rem', fontWeight: 500 }}>
                                        DETAILS
                                    </Box>
                                    <Box sx={{ flex: '0 0 150px', textAlign: 'right', color: '#6c757d', fontSize: isMobile ? '0.7rem' : '0.875rem', fontWeight: 500 }}>
                                        AMOUNT
                                    </Box>
                                    <Box sx={{ flex: '0 0 100px' }}></Box>
                                </Box>
                                
                                {/* Payment Entries */}
                                {paymentHistory.map((payment, index) => {
                                    const isExpanded = expandedPaymentIds[payment.id || index];
                                    const paymentDate = payment.created_at ? dayjs(payment.created_at) : null;
                                    const daysAgo = paymentDate ? dayjs().diff(paymentDate, 'day') : null;
                                    
                                    // Debug: Log payment details for refund button visibility
                                    if (index === 0) {
                                        console.log('🔍 [Refund Button Debug] Payment details:', {
                                            id: payment.id,
                                            payment_status: payment.payment_status,
                                            booking_id: payment.booking_id,
                                            voucher_id: payment.voucher_id,
                                            voucher_ref: payment.voucher_ref,
                                            stripe_charge_id: payment.stripe_charge_id,
                                            stripe_payment_intent_id: payment.stripe_payment_intent_id,
                                            isSynthetic: String(payment.id || '').startsWith('voucher_'),
                                            shouldShowRefund: payment.payment_status === 'succeeded' && 
                                                             !String(payment.id || '').startsWith('voucher_') && 
                                                             (payment.booking_id || payment.voucher_id || payment.voucher_ref) && 
                                                             (payment.stripe_charge_id || payment.stripe_payment_intent_id)
                                        });
                                    }
                                    
                                    return (
                                        <Box key={payment.id || index} sx={{ borderBottom: '1px solid #e2e8f0' }}>
                                            {/* Main Payment Row */}
                                            <Box sx={{ 
                                                display: isMobile ? 'block' : 'flex', 
                                                px: isMobile ? 1.5 : 3, 
                                                py: isMobile ? 1.5 : 2,
                                                alignItems: isMobile ? 'flex-start' : 'center',
                                                cursor: 'pointer',
                                                '&:hover': { background: '#f8f9fa' }
                                            }}
                                            onClick={() => togglePaymentExpand(payment.id || index)}
                                            >
                                                <Box sx={{ 
                                                    flex: isMobile ? 'none' : '0 0 200px',
                                                    mb: isMobile ? 1 : 0,
                                                    width: isMobile ? '100%' : 'auto'
                                                }}>
                                                    {paymentDate && (
                                                        <>
                                                            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: isMobile ? 13 : 'inherit' }}>
                                                                {paymentDate.format('MMM D, YYYY')}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? 11 : 'inherit', display: 'block' }}>
                                                                {paymentDate.format('h:mm A')}
                                                            </Typography>
                                                            {daysAgo !== null && (
                                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: isMobile ? 10 : 'inherit' }}>
                                                                    {daysAgo} {daysAgo === 1 ? 'day' : 'days'} ago
                                                                </Typography>
                                                            )}
                                                        </>
                                                    )}
                                                </Box>
                                                <Box sx={{ 
                                                    flex: isMobile ? 'none' : 1, 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: isMobile ? 0.5 : 1, 
                                                    justifyContent: isMobile ? 'flex-start' : 'center',
                                                    mb: isMobile ? 1 : 0,
                                                    width: isMobile ? '100%' : 'auto'
                                                }}>
                                                    {payment.payment_status === 'refunded' || payment.origin === 'refund' ? (
                                                        <Typography variant="body2" sx={{ 
                                                            fontWeight: 600,
                                                            textTransform: 'uppercase',
                                                            fontSize: isMobile ? '0.65rem' : '0.75rem',
                                                            px: isMobile ? 0.5 : 1,
                                                            py: isMobile ? 0.25 : 0.5,
                                                            borderRadius: 1,
                                                            background: '#fee',
                                                            color: '#c33'
                                                        }}>
                                                            REFUND
                                                        </Typography>
                                                    ) : (
                                                        <>
                                                    <Typography variant="body2" sx={{ 
                                                        fontWeight: 600,
                                                        textTransform: 'uppercase',
                                                        fontSize: isMobile ? '0.65rem' : '0.75rem',
                                                        px: isMobile ? 0.5 : 1,
                                                        py: isMobile ? 0.25 : 0.5,
                                                        borderRadius: 1,
                                                        background: '#f0f0f0'
                                                    }}>
                                                        {getCardBrandLogo(payment.card_brand)}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ fontSize: isMobile ? 13 : 'inherit' }}>
                                                        **** {payment.card_last4 || 'N/A'}
                                                    </Typography>
                                                        </>
                                                    )}
                                                </Box>
                                                <Box sx={{ 
                                                    flex: isMobile ? 'none' : '0 0 150px', 
                                                    textAlign: isMobile ? 'left' : 'right',
                                                    mb: isMobile ? 1 : 0,
                                                    width: isMobile ? '100%' : 'auto',
                                                    display: 'flex',
                                                    justifyContent: isMobile ? 'space-between' : 'flex-end',
                                                    alignItems: 'center'
                                                }}>
                                                    <Typography variant="body1" sx={{ 
                                                        fontWeight: 600,
                                                        color: (payment.payment_status === 'refunded' || payment.origin === 'refund') ? '#c33' : 'inherit',
                                                        fontSize: isMobile ? 15 : 'inherit'
                                                    }}>
                                                        £{Math.abs(parseFloat(payment.amount || 0)).toFixed(2)}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <IconButton 
                                                        size="small"
                                                            sx={{ padding: isMobile ? '4px' : '8px' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            togglePaymentExpand(payment.id || index);
                                                        }}
                                                    >
                                                            <span style={{ fontSize: isMobile ? 12 : 'inherit' }}>{isExpanded ? '▼' : '▶'}</span>
                                                    </IconButton>
                                                    {payment.payment_status === 'succeeded' && 
                                                     // Show refund button for:
                                                     // 1. Booking payments (has booking_id and stripe charge/intent)
                                                     // 2. Voucher payments (has voucher_id or voucher_ref and stripe charge/intent)
                                                     // Exclude synthetic payments (string IDs like "voucher_123")
                                                     !String(payment.id || '').startsWith('voucher_') && 
                                                     (payment.booking_id || payment.voucher_id || payment.voucher_ref) && 
                                                     (payment.stripe_charge_id || payment.stripe_payment_intent_id || payment.amount > 0) && (
                                                        <Button 
                                                            size="small" 
                                                            variant="outlined"
                                                                sx={{ 
                                                                    ml: isMobile ? 0 : 1, 
                                                                    textTransform: 'none',
                                                                    fontSize: isMobile ? 11 : 'inherit',
                                                                    padding: isMobile ? '4px 8px' : 'inherit',
                                                                    minWidth: isMobile ? 'auto' : 'inherit'
                                                                }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRefundClick(payment);
                                                            }}
                                                        >
                                                            Refund...
                                                        </Button>
                                                    )}
                                                    </Box>
                                                </Box>
                                            </Box>
                                            
                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <Box sx={{ 
                                                    px: isMobile ? 1.5 : 3, 
                                                    py: isMobile ? 1.5 : 2, 
                                                    background: '#ffffff',
                                                    borderTop: '1px solid #e2e8f0'
                                                }}>
                                                    <Grid container spacing={isMobile ? 1.5 : 2}>
                                                        <Grid item xs={isMobile ? 12 : 6}>
                                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? 10 : 'inherit' }}>
                                                                Created
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ fontSize: isMobile ? 12 : 'inherit', wordBreak: 'break-word' }}>
                                                                {paymentDate ? `${paymentDate.format('MMM D, YYYY h:mm A')} (${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago)` : 'N/A'}
                                                            </Typography>
                                                        </Grid>
                                                        <Grid item xs={isMobile ? 12 : 6}>
                                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? 10 : 'inherit' }}>
                                                                {payment.payment_status === 'refunded' || payment.origin === 'refund' ? 'Refund Amount' : 'Guest Charge'}
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ 
                                                                fontWeight: 600,
                                                                color: (payment.payment_status === 'refunded' || payment.origin === 'refund') ? '#c33' : 'inherit',
                                                                fontSize: isMobile ? 12 : 'inherit'
                                                            }}>
                                                                £{Math.abs(parseFloat(payment.amount || 0)).toFixed(2)}
                                                            </Typography>
                                                        </Grid>
                                                        <Grid item xs={isMobile ? 12 : 6}>
                                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? 10 : 'inherit' }}>
                                                                Card Type
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ fontSize: isMobile ? 12 : 'inherit' }}>
                                                                Credit Card **** {payment.card_last4 || 'N/A'}
                                                            </Typography>
                                                        </Grid>
                                                        <Grid item xs={isMobile ? 12 : 6}>
                                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? 10 : 'inherit' }}>
                                                                Wallet Type
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ fontSize: isMobile ? 12 : 'inherit' }}>
                                                                {payment.wallet_type || 'N/A'}
                                                                {payment.wallet_type === 'apple_pay' && ' 🍎'}
                                                            </Typography>
                                                        </Grid>
                                                        <Grid item xs={isMobile ? 12 : 6}>
                                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? 10 : 'inherit' }}>
                                                                Fingerprint
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: isMobile ? '0.65rem' : '0.75rem', wordBreak: 'break-word' }}>
                                                                {payment.fingerprint || 'N/A'}
                                                            </Typography>
                                                        </Grid>
                                                        <Grid item xs={isMobile ? 12 : 6}>
                                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? 10 : 'inherit' }}>
                                                                Origin
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ fontSize: isMobile ? 12 : 'inherit' }}>
                                                                {payment.origin || 'N/A'}
                                                            </Typography>
                                                        </Grid>
                                                        <Grid item xs={isMobile ? 12 : 6}>
                                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? 10 : 'inherit' }}>
                                                                Transaction ID
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: isMobile ? '0.65rem' : '0.75rem', wordBreak: 'break-word' }}>
                                                                {payment.transaction_id || payment.stripe_charge_id || 'N/A'}
                                                            </Typography>
                                                        </Grid>
                                                        <Grid item xs={isMobile ? 12 : 6}>
                                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? 10 : 'inherit' }}>
                                                                Card Present
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ fontSize: isMobile ? 12 : 'inherit' }}>
                                                                {payment.card_present ? 'Yes' : 'No'}
                                                            </Typography>
                                                        </Grid>
                                                        {(payment.payment_status === 'refunded' || payment.origin === 'refund') && payment.refund_comment && (
                                                            <Grid item xs={12}>
                                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? 10 : 'inherit' }}>
                                                                    Refund Comment
                                                                </Typography>
                                                                <Typography variant="body2" sx={{ fontSize: isMobile ? 12 : 'inherit', wordBreak: 'break-word' }}>
                                                                    {payment.refund_comment}
                                                                </Typography>
                                                            </Grid>
                                                        )}
                                                        <Grid item xs={isMobile ? 12 : 6}>
                                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? 10 : 'inherit' }}>
                                                                Status
                                                            </Typography>
                                                            <Box sx={{ 
                                                                display: 'inline-block',
                                                                px: isMobile ? 0.75 : 1,
                                                                py: isMobile ? 0.25 : 0.5,
                                                                borderRadius: 1,
                                                                background: payment.payment_status === 'succeeded' ? '#28a745' : '#6c757d',
                                                                color: '#fff',
                                                                fontSize: isMobile ? '0.65rem' : '0.75rem',
                                                                fontWeight: 600
                                                            }}>
                                                                {payment.payment_status === 'succeeded' ? 'Successful' : payment.payment_status || 'Pending'}
                                                            </Box>
                                                        </Grid>
                                                        {payment.payout_id && (
                                                            <Grid item xs={isMobile ? 12 : 6}>
                                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? 10 : 'inherit' }}>
                                                                    Payout
                                                                </Typography>
                                                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: isMobile ? '0.65rem' : '0.75rem', wordBreak: 'break-word' }}>
                                                                    {payment.payout_id}
                                                                </Typography>
                                                            </Grid>
                                                        )}
                                                        {payment.arriving_on && (
                                                            <Grid item xs={isMobile ? 12 : 6}>
                                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? 10 : 'inherit' }}>
                                                                    Arriving on
                                                                </Typography>
                                                                <Typography variant="body2" sx={{ fontSize: isMobile ? 12 : 'inherit' }}>
                                                                    {dayjs(payment.arriving_on).format('MMM D, YYYY')}
                                                                </Typography>
                                                            </Grid>
                                                        )}
                                                    </Grid>
                                                </Box>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ padding: isMobile ? '8px 16px' : 'inherit' }}>
                        <Button onClick={() => {
                            setPaymentHistoryModalOpen(false);
                            setExpandedPaymentIds({});
                        }} sx={{ fontSize: isMobile ? 14 : 'inherit', padding: isMobile ? '6px 12px' : 'inherit' }}>Close</Button>
                    </DialogActions>
                </Dialog>

                {/* Refund Credit Card Charge Modal */}
                <Dialog
                    open={refundModalOpen}
                    onClose={() => {
                        if (!processingRefund) {
                            setRefundModalOpen(false);
                            setSelectedPaymentForRefund(null);
                            setRefundAmount('');
                            setRefundComment('');
                        }
                    }}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        fontWeight: 700,
                        fontSize: 20
                    }}>
                        <Typography component="span" sx={{ fontWeight: 700 }}>
                            Refund Credit Card Charge
                        </Typography>
                        <IconButton
                            onClick={() => {
                                if (!processingRefund) {
                                    setRefundModalOpen(false);
                                    setSelectedPaymentForRefund(null);
                                    setRefundAmount('');
                                    setRefundComment('');
                                }
                            }}
                            disabled={processingRefund}
                            sx={{ p: 0 }}
                        >
                            ✕
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers sx={{ pt: 3 }}>
                        <Typography variant="body2" sx={{ mb: 3, color: '#666', lineHeight: 1.6 }}>
                            We submit refund requests to your customer's bank or card issuer immediately. Your customer sees the refund as a credit approximately 5-10 business days later, depending upon the bank. Once issued, a refund cannot be canceled. Disputes and chargebacks aren't possible on credit card charges that are fully refunded.
                        </Typography>
                        
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                                Refund Amount (up to £{selectedPaymentForRefund ? parseFloat(selectedPaymentForRefund.amount || 0).toFixed(2) : '0.00'}):
                            </Typography>
                            <TextField
                                fullWidth
                                value={refundAmount}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '');
                                    setRefundAmount(value);
                                }}
                                placeholder="0.00"
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">£</InputAdornment>,
                                }}
                                disabled={processingRefund}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 1,
                                    }
                                }}
                            />
                        </Box>
                        
                        <Box>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                                Comment/Notes
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                value={refundComment}
                                onChange={(e) => setRefundComment(e.target.value)}
                                placeholder="Explain why this refund is being issued"
                                disabled={processingRefund}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 1,
                                    }
                                }}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, justifyContent: 'flex-end' }}>
                        <Button
                            onClick={() => {
                                if (!processingRefund) {
                                    setRefundModalOpen(false);
                                    setSelectedPaymentForRefund(null);
                                    setRefundAmount('');
                                    setRefundComment('');
                                }
                            }}
                            disabled={processingRefund}
                            sx={{ textTransform: 'none', mr: 1 }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleRefundSubmit}
                            disabled={(() => {
                                if (processingRefund) return true;
                                if (!refundAmount) return true;
                                const amount = parseFloat(refundAmount);
                                if (isNaN(amount) || amount <= 0) return true;
                                const maxAmount = selectedPaymentForRefund ? parseFloat(selectedPaymentForRefund.amount || 0) : 0;
                                if (amount > maxAmount) return true;
                                return false;
                            })()}
                            sx={{ 
                                textTransform: 'none',
                                backgroundColor: '#1976d2',
                                '&:hover': {
                                    backgroundColor: '#1565c0',
                                },
                                '&:disabled': {
                                    backgroundColor: '#e0e0e0',
                                    color: '#9e9e9e',
                                }
                            }}
                        >
                            {processingRefund ? 'Processing...' : `Refund £${refundAmount || '0.00'}`}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* User Session Modal */}
                <Dialog
                    open={userSessionModalOpen}
                    onClose={() => setUserSessionModalOpen(false)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle sx={{ fontWeight: 700, fontSize: 24 }}>
                        User Session
                    </DialogTitle>
                    <DialogContent dividers sx={{ background: '#f5f7fb' }}>
                        {userSessionLoading ? (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography variant="body2">Loading user session...</Typography>
                            </Box>
                        ) : !userSession ? (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    No user session data available for this booking.
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ p: 2 }}>
                                <Grid container spacing={3}>
                                    {/* Session Activity Metrics */}
                                    <Grid item xs={12}>
                                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                            Session Activity
                                        </Typography>
                                        <Grid container spacing={2}>
                                            <Grid item xs={6}>
                                                <Box sx={{ 
                                                    p: 2, 
                                                    borderRadius: 2, 
                                                    background: '#ffffff',
                                                    border: '1px solid #e2e8f0'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Booking Clicks
                                                    </Typography>
                                                    <Typography variant="h5" sx={{ fontWeight: 600, mt: 0.5 }}>
                                                        {userSession.booking_clicks || 0}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Box sx={{ 
                                                    p: 2, 
                                                    borderRadius: 2, 
                                                    background: '#ffffff',
                                                    border: '1px solid #e2e8f0'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Site Page Views
                                                    </Typography>
                                                    <Typography variant="h5" sx={{ fontWeight: 600, mt: 0.5 }}>
                                                        {userSession.site_page_views || 0}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Box sx={{ 
                                                    p: 2, 
                                                    borderRadius: 2, 
                                                    background: '#ffffff',
                                                    border: '1px solid #e2e8f0'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        First Seen
                                                    </Typography>
                                                    <Typography variant="body1" sx={{ fontWeight: 500, mt: 0.5 }}>
                                                        {userSession.first_seen ? dayjs(userSession.first_seen).format('MMMM D, YYYY, h:mm A') : 'N/A'}
                                                        {userSession.days_ago !== null && (
                                                            <Typography variant="caption" color="text.secondary" display="block">
                                                                ({userSession.days_ago} {userSession.days_ago === 1 ? 'day' : 'days'} ago)
                                                            </Typography>
                                                        )}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </Grid>

                                    {/* Location Information */}
                                    {(userSession.location_city || userSession.location_country) && (
                                        <Grid item xs={12}>
                                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                                Location
                                            </Typography>
                                            <Box sx={{ 
                                                p: 2, 
                                                borderRadius: 2, 
                                                background: '#ffffff',
                                                border: '1px solid #e2e8f0'
                                            }}>
                                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                    {[userSession.location_city, userSession.location_country].filter(Boolean).join(', ') || 'N/A'}
                                                </Typography>
                                            {userSession.coordinates_lat && userSession.coordinates_lng && (
                                                <>
                                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                        {userSession.coordinates_lat}°N {userSession.coordinates_lng}°W
                                                    </Typography>
                                                    <Box sx={{ mt: 2 }}>
                                                        <a
                                                            href={`https://www.google.com/maps?q=${userSession.coordinates_lat},${userSession.coordinates_lng}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ 
                                                                display: 'inline-block',
                                                                padding: '8px 16px',
                                                                background: '#1976d2',
                                                                color: '#fff',
                                                                textDecoration: 'none',
                                                                borderRadius: '4px',
                                                                fontWeight: 500
                                                            }}
                                                        >
                                                            View on Google Maps
                                                        </a>
                                                    </Box>
                                                </>
                                            )}
                                            </Box>
                                        </Grid>
                                    )}

                                    {/* Technical Details */}
                                    <Grid item xs={12}>
                                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                            Technical Details
                                        </Typography>
                                        <Grid container spacing={2}>
                                            {userSession.ip_address && (
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        IP Address
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                        {userSession.ip_address}
                                                    </Typography>
                                                </Grid>
                                            )}
                                            {userSession.browser && (
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Browser
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {userSession.browser}
                                                    </Typography>
                                                </Grid>
                                            )}
                                            {userSession.browser_size && (
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Browser Size
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {userSession.browser_size}
                                                    </Typography>
                                                </Grid>
                                            )}
                                            {userSession.language && (
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Language
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {userSession.language}
                                                    </Typography>
                                                </Grid>
                                            )}
                                            {userSession.operating_system && (
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Operating System
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {userSession.operating_system}
                                                    </Typography>
                                                </Grid>
                                            )}
                                            {userSession.device_type && (
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Device Type
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {userSession.device_type}
                                                    </Typography>
                                                </Grid>
                                            )}
                                            {userSession.user_agent && (
                                                <Grid item xs={12}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        User Agent
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                                                        {userSession.user_agent}
                                                    </Typography>
                                                </Grid>
                                            )}
                                        </Grid>
                                    </Grid>

                                    {/* Referral and Navigation */}
                                    {(userSession.referrer || userSession.landing_page) && (
                                        <Grid item xs={12}>
                                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                                Referral and Navigation
                                            </Typography>
                                            <Grid container spacing={2}>
                                                {userSession.referrer && (
                                                    <Grid item xs={12}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Referrer
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                                                            {userSession.referrer}
                                                        </Typography>
                                                    </Grid>
                                                )}
                                                {userSession.landing_page && (
                                                    <Grid item xs={12}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Landing Page
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                                                            {userSession.landing_page}
                                                        </Typography>
                                                    </Grid>
                                                )}
                                            </Grid>
                                        </Grid>
                                    )}
                                </Grid>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setUserSessionModalOpen(false)}>Close</Button>
                    </DialogActions>
                </Dialog>

                {/* Email Modal */}
                <Dialog 
                    open={emailModalOpen} 
                    onClose={() => setEmailModalOpen(false)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle sx={{ color: '#1976d2', fontWeight: 600, fontSize: isMobile ? 18 : 24, padding: isMobile ? '12px 16px' : 'inherit' }}>
                        Send a Message
                        {selectedBookingForEmail && (
                            <Typography variant="subtitle2" color="textSecondary" sx={{ mt: isMobile ? 0.25 : 0.5, fontSize: isMobile ? 12 : 'inherit' }}>
                                {selectedBookingIds && selectedBookingIds.length > 1 ? (
                                    <>
                                        Bulk to {selectedBookingIds.length} bookings
                                    </>
                                ) : (
                                    <>
                                        Booking: {selectedBookingForEmail.name} ({selectedBookingForEmail.id})
                                    </>
                                )}
                            </Typography>
                        )}
                    </DialogTitle>
                    <DialogContent sx={{ padding: isMobile ? '12px 16px' : '24px' }}>
                        <Grid container spacing={isMobile ? 1 : 2} sx={{ mt: isMobile ? 0 : 1 }}>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                                    Choose a template:
                                </Typography>
                                <FormControl fullWidth size="small">
                                    <Select
                                        value={emailForm.template}
                                        onChange={(e) => handleEmailTemplateChange(e.target.value)}
                                        displayEmpty
                                    >
                                        {/* Database templates */}
                                        {emailTemplates.map((template) => (
                                            <MenuItem key={template.id} value={template.id}>
                                                {template.name}
                                            </MenuItem>
                                        ))}
                                        
                                        {/* Legacy hardcoded templates (fallback) */}
                                        {emailTemplates.length === 0 && (
                                            <>
                                                <MenuItem value="to_be_updated">To Be Updated</MenuItem>
                                        <MenuItem value="custom">Custom Message</MenuItem>
                                        <MenuItem value="confirmation">Booking Confirmation</MenuItem>
                                        <MenuItem value="reminder">Flight Reminder</MenuItem>
                                        <MenuItem value="reschedule">Flight Rescheduling</MenuItem>
                                            </>
                                        )}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" sx={{ mb: isMobile ? 0.5 : 1, fontWeight: 500, fontSize: isMobile ? 13 : 'inherit' }}>
                                    Add an optional, personalized note
                                </Typography>
                                <TextField
                                    fullWidth
                                    placeholder="Nice to speak with you today!"
                                    value={personalNote}
                                    onChange={(e) => setPersonalNote(e.target.value)}
                                    multiline
                                    rows={isMobile ? 4 : 6}
                                    variant="outlined"
                                    size={isMobile ? "small" : "medium"}
                                    sx={{ 
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        },
                                        '& .MuiInputLabel-root': {
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        }
                                    }}
                                />
                            </Grid>
                            {/* Email Template Preview */}
                            <Grid item xs={12}>
                                <Box sx={{ 
                                    border: '1px solid #e0e0e0', 
                                    borderRadius: 2, 
                                    p: isMobile ? 1 : 2,
                                    backgroundColor: '#f9f9f9',
                                    position: 'relative',
                                    overflow: 'auto',
                                    maxHeight: isMobile ? '300px' : '600px'
                                }}>
                                    {/* Email Header */}
                                    <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: isMobile ? 0.5 : 1,
                                        mb: isMobile ? 1 : 2,
                                        pb: isMobile ? 1 : 2,
                                        borderBottom: '1px solid #e0e0e0'
                                    }}>
                                        <Box sx={{ 
                                            width: isMobile ? 8 : 12, 
                                            height: isMobile ? 8 : 12, 
                                            borderRadius: '50%', 
                                            backgroundColor: '#ff5f57' 
                                        }} />
                                        <Box sx={{ 
                                            width: isMobile ? 8 : 12, 
                                            height: isMobile ? 8 : 12, 
                                            borderRadius: '50%', 
                                            backgroundColor: '#ffbd2e' 
                                        }} />
                                        <Box sx={{ 
                                            width: isMobile ? 8 : 12, 
                                            height: isMobile ? 8 : 12, 
                                            borderRadius: '50%', 
                                            backgroundColor: '#28ca42' 
                                        }} />
                                    </Box>
                                    
                                    {/* Email From */}
                                    <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: isMobile ? 0.25 : 0.5, fontSize: isMobile ? 10 : 'inherit', wordBreak: 'break-word' }}>
                                        From "Fly Away Ballooning" &lt;info@flyawayballooning.com&gt;
                                    </Typography>
                                    {selectedBookingIds && selectedBookingIds.length > 1 && (
                                        <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: isMobile ? 0.25 : 0.5, fontSize: isMobile ? 10 : 'inherit', wordBreak: 'break-word' }}>
                                            To:&nbsp;
                                            {booking
                                                .filter(b => selectedBookingIds.includes(b.id))
                                                .map(b => (b.email || '').trim())
                                                .filter(e => !!e)
                                                .join(', ')}
                                        </Typography>
                                    )}
                                    <Typography variant="caption" sx={{ color: '#999', display: 'block', mb: isMobile ? 1 : 2, fontSize: isMobile ? 10 : 'inherit' }}>
                                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                    </Typography>
                                    
                                    {/* Email Subject */}
                                    <Typography sx={{ 
                                        color: '#d32f2f', 
                                        fontWeight: 600, 
                                        mb: isMobile ? 1 : 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: isMobile ? 0.5 : 1,
                                        fontSize: isMobile ? 13 : 'inherit',
                                        wordBreak: 'break-word'
                                    }}>
                                        <span style={{ fontSize: isMobile ? 16 : 20 }}>🎈</span> {emailForm.subject || 'Flight update'}
                                    </Typography>
                                    
                                    {/* Email Body Preview */}
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'center',
                                                width: '100%',
                                                overflow: 'auto',
                                                pb: 0,
                                                mb: 0
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    transform: isMobile ? 'scale(0.5)' : 'scale(0.75)',
                                                    transformOrigin: 'top center',
                                                    width: isMobile ? '200%' : '133.33%',
                                                    maxWidth: '100%',
                                                    overflow: 'visible',
                                                    marginBottom: isMobile ? '-50%' : '-25%',
                                                    '& table': {
                                                        maxWidth: '100% !important',
                                                        width: '100% !important',
                                                        marginBottom: '0 !important'
                                                    },
                                                    '& img': {
                                                        maxWidth: '100% !important',
                                                        height: 'auto !important'
                                                    },
                                                    '& *': {
                                                        fontSize: isMobile ? '12px !important' : 'inherit !important',
                                                        lineHeight: 'inherit !important'
                                                    },
                                                    '& body': {
                                                        margin: '0 !important',
                                                        padding: '0 !important'
                                                    },
                                                    '& td': {
                                                        padding: isMobile ? '8px !important' : '16px !important'
                                                    },
                                                    '& table[role="presentation"]': {
                                                        margin: '0 !important',
                                                        marginBottom: '0 !important'
                                                    },
                                                    '& tr:last-child td': {
                                                        paddingBottom: isMobile ? '8px !important' : '16px !important'
                                                    }
                                                }}
                                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                                            />
                                        </Box>
                                </Box>
                            </Grid>
                            {/* Hidden fields for backend / debugging */}
                            <input type="hidden" value={emailForm.to} />
                            <input type="hidden" value={emailForm.subject} />
                            {/* Email Logs */}
                            <Grid item xs={12}>
                                <Divider sx={{ my: isMobile ? 1 : 2 }} />
                                <Typography variant="subtitle1" sx={{ mb: isMobile ? 0.5 : 1, fontWeight: 600, fontSize: isMobile ? 14 : 'inherit' }}>
                                    Sent Emails
                                </Typography>
                                {emailLogsLoading ? (
                                    <Typography variant="body2" sx={{ fontSize: isMobile ? 12 : 'inherit' }}>Loading...</Typography>
                                ) : (emailLogs && emailLogs.length > 0 ? (
                                    <TableContainer sx={{ maxHeight: isMobile ? '200px' : 'none', overflowX: 'auto' }}>
                                        <Table size={isMobile ? "small" : "small"}>
                                        <TableHead>
                                            <TableRow>
                                                    <TableCell sx={{ fontSize: isMobile ? 10 : 'inherit', padding: isMobile ? '6px 4px' : 'inherit' }}>Date</TableCell>
                                                    <TableCell sx={{ fontSize: isMobile ? 10 : 'inherit', padding: isMobile ? '6px 4px' : 'inherit' }}>To</TableCell>
                                                    <TableCell sx={{ fontSize: isMobile ? 10 : 'inherit', padding: isMobile ? '6px 4px' : 'inherit' }}>Subject</TableCell>
                                                    <TableCell sx={{ fontSize: isMobile ? 10 : 'inherit', padding: isMobile ? '6px 4px' : 'inherit' }}>Status</TableCell>
                                                    <TableCell align="right" sx={{ fontSize: isMobile ? 10 : 'inherit', padding: isMobile ? '6px 4px' : 'inherit' }}>Opens</TableCell>
                                                    <TableCell align="right" sx={{ fontSize: isMobile ? 10 : 'inherit', padding: isMobile ? '6px 4px' : 'inherit' }}>Clicks</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {emailLogs.map((log) => (
                                                <TableRow key={log.id}>
                                                        <TableCell sx={{ fontSize: isMobile ? 9 : 'inherit', padding: isMobile ? '6px 4px' : 'inherit' }}>{(() => { try { return dayjs(log.sent_at).format('DD/MM/YYYY HH:mm'); } catch { return String(log.sent_at || ''); } })()}</TableCell>
                                                        <TableCell sx={{ fontSize: isMobile ? 9 : 'inherit', padding: isMobile ? '6px 4px' : 'inherit', wordBreak: 'break-word' }}>{log.recipient_email}</TableCell>
                                                        <TableCell sx={{ fontSize: isMobile ? 9 : 'inherit', padding: isMobile ? '6px 4px' : 'inherit', wordBreak: 'break-word' }}>{log.subject}</TableCell>
                                                        <TableCell sx={{ fontSize: isMobile ? 9 : 'inherit', padding: isMobile ? '6px 4px' : 'inherit' }}>
                                                        <span style={{
                                                                padding: isMobile ? '1px 4px' : '2px 6px',
                                                            borderRadius: 4,
                                                            background: log.status === 'delivered' ? '#d4edda' : (log.status === 'open' || log.opens > 0 ? '#e3f2fd' : '#fff3cd'),
                                                            color: '#000',
                                                                fontSize: isMobile ? 9 : 12
                                                        }}>{log.last_event || log.status}</span>
                                                    </TableCell>
                                                        <TableCell align="right" sx={{ fontSize: isMobile ? 9 : 'inherit', padding: isMobile ? '6px 4px' : 'inherit' }}>{log.opens || 0}</TableCell>
                                                        <TableCell align="right" sx={{ fontSize: isMobile ? 9 : 'inherit', padding: isMobile ? '6px 4px' : 'inherit' }}>{log.clicks || 0}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    </TableContainer>
                                ) : (
                                    <Typography variant="body2" sx={{ fontSize: isMobile ? 12 : 'inherit' }}>No sent emails yet for this booking.</Typography>
                                ))}
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: isMobile ? 1.5 : 3, justifyContent: 'flex-end' }}>
                        <Button 
                            onClick={handleSendEmail}
                            variant="contained"
                            startIcon={<span>✈️</span>}
                            sx={{ 
                                backgroundColor: '#1976d2',
                                px: isMobile ? 2 : 4,
                                py: isMobile ? 1 : 1.5,
                                borderRadius: 2,
                                fontSize: isMobile ? 14 : 16,
                                fontWeight: 600,
                                textTransform: 'none',
                                '&:hover': {
                                    backgroundColor: '#1565c0'
                                }
                            }}
                            disabled={sendingEmail || !emailForm.subject || (!emailForm.to && (!selectedBookingIds || selectedBookingIds.length === 0))}
                        >
                            {sendingEmail ? 'Sending...' : 'Send'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* SMS Modal */}
                <Dialog 
                    open={smsModalOpen} 
                    onClose={() => setSmsModalOpen(false)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle sx={{ color: '#1976d2', fontWeight: 600, fontSize: isMobile ? 18 : 24, padding: isMobile ? '12px 16px' : 'inherit' }}>
                        Send a SMS
                        {selectedBookingForEmail && (
                            <Typography variant="subtitle2" color="textSecondary" sx={{ mt: isMobile ? 0.25 : 0.5, fontSize: isMobile ? 12 : 'inherit' }}>
                                {selectedBookingIds && selectedBookingIds.length > 1 
                                    ? `Bulk SMS to ${selectedBookingIds.length} bookings`
                                    : `Booking: ${selectedBookingForEmail.name} (${selectedBookingForEmail.id})`
                                }
                            </Typography>
                        )}
                    </DialogTitle>
                    <DialogContent sx={{ padding: isMobile ? '12px 16px' : '24px' }}>
                        <Grid container spacing={isMobile ? 1 : 2} sx={{ mt: isMobile ? 0 : 1 }}>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" sx={{ mb: isMobile ? 0.5 : 1, fontWeight: 500, fontSize: isMobile ? 13 : 'inherit' }}>
                                    Choose a template:
                                </Typography>
                                <FormControl fullWidth size={isMobile ? "small" : "small"}>
                                    <Select
                                        value={smsForm.template || 'custom'}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            console.log('📝 Select onChange triggered with value:', value);
                                            handleSmsTemplateChange(value);
                                        }}
                                        displayEmpty
                                        MenuProps={{
                                            PaperProps: {
                                                style: {
                                                    maxHeight: 300,
                                                },
                                            },
                                        }}
                                        sx={{
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        }}
                                    >
                                        {smsTemplates.length === 0 ? (
                                            <MenuItem value="custom">Custom Message</MenuItem>
                                        ) : (
                                            [
                                                // Database SMS templates
                                                ...smsTemplates.map((template) => (
                                                    <MenuItem key={template.id} value={String(template.id)}>
                                                        {template.name}
                                                    </MenuItem>
                                                )),
                                                // Custom Message option (always available)
                                                <MenuItem key="custom" value="custom">Custom Message</MenuItem>
                                            ]
                                        )}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" sx={{ mb: isMobile ? 0.5 : 1, fontWeight: 500, fontSize: isMobile ? 13 : 'inherit' }}>
                                    Message
                                </Typography>
                                <TextField
                                    fullWidth
                                    placeholder="Enter your SMS message here..."
                                    value={smsForm.message || ''}
                                    onChange={(e) => setSmsForm(prev => ({ ...prev, message: e.target.value }))}
                                    multiline
                                    rows={isMobile ? 4 : 6}
                                    variant="outlined"
                                    size={isMobile ? "small" : "medium"}
                                    sx={{ 
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        },
                                        '& .MuiInputLabel-root': {
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" sx={{ mb: isMobile ? 0.5 : 1, fontWeight: 500, fontSize: isMobile ? 13 : 'inherit' }}>
                                    Add an optional, personalized note
                                </Typography>
                                <TextField
                                    fullWidth
                                    placeholder="Nice to speak with you today!"
                                    value={smsPersonalNote}
                                    onChange={(e) => setSmsPersonalNote(e.target.value)}
                                    multiline
                                    rows={isMobile ? 3 : 4}
                                    variant="outlined"
                                    size={isMobile ? "small" : "medium"}
                                    sx={{ 
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        },
                                        '& .MuiInputLabel-root': {
                                            fontSize: isMobile ? '14px' : 'inherit'
                                        }
                                    }}
                                />
                            </Grid>
                            {/* SMS Preview - Mobile Device */}
                            <Grid item xs={12}>
                                <Box sx={{ 
                                    border: '1px solid #e0e0e0', 
                                    borderRadius: 2, 
                                    p: isMobile ? 1 : 2,
                                    backgroundColor: '#f9f9f9',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'flex-start'
                                }}>
                                    {/* Mobile Device Preview */}
                                    <Box sx={{ 
                                        width: isMobile ? '240px' : '320px',
                                        maxWidth: '100%',
                                        background: '#000',
                                        borderRadius: isMobile ? '18px' : '24px',
                                        padding: isMobile ? '8px' : '12px',
                                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
                                    }}>
                                        {/* Phone Screen */}
                                        <Box sx={{
                                            background: '#f5f5f5',
                                            borderRadius: isMobile ? '14px' : '20px',
                                            padding: isMobile ? '6px' : '8px',
                                            minHeight: isMobile ? '280px' : '400px'
                                        }}>
                                            {/* Status Bar */}
                                            <Box sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: isMobile ? '6px 8px' : '8px 12px',
                                                fontSize: isMobile ? '8px' : '10px',
                                                color: '#000',
                                                background: '#fff',
                                                borderRadius: isMobile ? '8px 8px 0 0' : '12px 12px 0 0'
                                            }}>
                                                <span>9:41</span>
                                                <Box sx={{ display: 'flex', gap: isMobile ? '2px' : '4px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: isMobile ? '10px' : '12px' }}>🔗</span>
                                                    <span style={{ fontSize: isMobile ? '10px' : '12px' }}>⌨️</span>
                                                </Box>
                                            </Box>

                                            {/* Message Preview */}
                                            <Box sx={{
                                                padding: isMobile ? '12px' : '16px',
                                                background: '#fff',
                                                borderRadius: isMobile ? '0 0 8px 8px' : '0 0 12px 12px',
                                                minHeight: isMobile ? '200px' : '300px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'flex-start'
                                            }}>
                                                {/* Message Bubble */}
                                                <Box sx={{
                                                    background: '#e5e7eb',
                                                    borderRadius: isMobile ? '12px' : '16px',
                                                    padding: isMobile ? '8px 12px' : '12px 16px',
                                                    marginBottom: isMobile ? '6px' : '8px',
                                                    maxWidth: '85%',
                                                    alignSelf: 'flex-start',
                                                    wordWrap: 'break-word',
                                                    fontSize: isMobile ? '12px' : '14px',
                                                    lineHeight: '1.5',
                                                    color: '#111827',
                                                    whiteSpace: 'pre-wrap'
                                                }}>
                                                    {(() => {
                                                        const booking = selectedBookingForEmail || bookingDetail?.booking || {};
                                                        const messageText = smsForm.message || '';
                                                        const messageWithPrompts = replaceSmsPrompts(messageText, booking);
                                                        const finalMessage = smsPersonalNote 
                                                            ? `${messageWithPrompts}${messageWithPrompts ? '\n\n' : ''}${smsPersonalNote}`
                                                            : messageWithPrompts;
                                                        return finalMessage || 'Your message will appear here...';
                                                    })()}
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                            </Grid>
                            {/* SMS Logs */}
                            <Grid item xs={12}>
                                <Divider sx={{ my: isMobile ? 1 : 2 }} />
                                <Typography variant="subtitle1" sx={{ mb: isMobile ? 0.5 : 1, fontWeight: 600, fontSize: isMobile ? 14 : 'inherit' }}>
                                    Sent SMS
                                </Typography>
                                {smsLogsLoading ? (
                                    <Typography variant="body2" sx={{ fontSize: isMobile ? 12 : 'inherit' }}>Loading...</Typography>
                                ) : (smsLogs && smsLogs.length > 0 ? (
                                    <TableContainer sx={{ maxHeight: isMobile ? '200px' : 'none', overflowX: 'auto' }}>
                                        <Table size={isMobile ? "small" : "small"}>
                                        <TableHead>
                                            <TableRow>
                                                    <TableCell sx={{ fontSize: isMobile ? 10 : 'inherit', padding: isMobile ? '6px 4px' : 'inherit' }}>Date</TableCell>
                                                    <TableCell sx={{ fontSize: isMobile ? 10 : 'inherit', padding: isMobile ? '6px 4px' : 'inherit' }}>To</TableCell>
                                                    <TableCell sx={{ fontSize: isMobile ? 10 : 'inherit', padding: isMobile ? '6px 4px' : 'inherit' }}>Status</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {smsLogs.map((log) => (
                                                <TableRow key={log.id}>
                                                        <TableCell sx={{ fontSize: isMobile ? 9 : 'inherit', padding: isMobile ? '6px 4px' : 'inherit' }}>{(() => { try { return dayjs(log.sent_at).format('DD/MM/YYYY HH:mm'); } catch { return String(log.sent_at || ''); } })()}</TableCell>
                                                        <TableCell sx={{ fontSize: isMobile ? 9 : 'inherit', padding: isMobile ? '6px 4px' : 'inherit', wordBreak: 'break-word' }}>{log.to_number}</TableCell>
                                                        <TableCell sx={{ fontSize: isMobile ? 9 : 'inherit', padding: isMobile ? '6px 4px' : 'inherit' }}>{log.status}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    </TableContainer>
                                ) : (<Typography variant="body2" sx={{ fontSize: isMobile ? 12 : 'inherit' }}>No SMS sent yet.</Typography>))}
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: isMobile ? 1.5 : 3, justifyContent: 'flex-end' }}>
                        <Button 
                            onClick={handleSendSms}
                            variant="contained"
                            startIcon={<span style={{ fontSize: isMobile ? 16 : 'inherit' }}>📱</span>}
                            sx={{ 
                                backgroundColor: '#17a2b8',
                                px: isMobile ? 2 : 4,
                                py: isMobile ? 1 : 1.5,
                                borderRadius: 2,
                                fontWeight: 600,
                                textTransform: 'none',
                                fontSize: isMobile ? 14 : 16,
                                '&:hover': {
                                    backgroundColor: '#138496'
                                }
                            }}
                            disabled={smsSending || !smsForm.to || !smsForm.message}
                        >
                            {smsSending ? 'Sending...' : 'Send'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </div>
    );
};

export default BookingPage;