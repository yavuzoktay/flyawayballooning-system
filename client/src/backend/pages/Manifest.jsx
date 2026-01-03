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
    FormControl,
    InputLabel,
    FormControlLabel,
    Switch,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    InputAdornment,
    useTheme,
    useMediaQuery,
} from "@mui/material";
import { MoreVert as MoreVertIcon, Edit as EditIcon } from "@mui/icons-material";
import DeleteIcon from '@mui/icons-material/Delete';
import useBooking from "../api/useBooking";
import usePessanger from "../api/usePessanger";
import useActivity from "../api/useActivity";
import axios from "axios";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import RebookAvailabilityModal from '../components/BookingPage/RebookAvailabilityModal';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import {
    getDefaultEmailTemplateContent,
    getDefaultTemplateMessageHtml,
    replaceSmsPrompts,
    extractMessageFromTemplateBody,
    buildEmailHtml
} from '../utils/emailTemplateUtils';
import { getAssignedResourceInfo } from '../utils/resourceAssignment';

dayjs.extend(utc);
dayjs.extend(timezone);

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

const MemoizedEmailPreview = React.memo(
    ({ html }) => (
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
                    transform: 'scale(0.75)',
                    transformOrigin: 'top center',
                    width: '133.33%',
                    maxWidth: '100%',
                    overflow: 'visible',
                    marginBottom: '-25%',
                    lineHeight: 1.6, 
                    color: '#333',
                    '& table': {
                        maxWidth: '100% !important',
                        width: '100% !important',
                        marginBottom: '0 !important'
                    },
                    '& img': {
                        maxWidth: '100% !important',
                        height: 'auto !important'
                    },
                    '& body': {
                        margin: '0 !important',
                        padding: '0 !important'
                    },
                    '& td': {
                        padding: '16px !important'
                    },
                    '& table[role="presentation"]': {
                        margin: '0 !important',
                        marginBottom: '0 !important'
                    },
                    '& tr:last-child td': {
                        paddingBottom: '16px !important'
                    }
                }} 
                dangerouslySetInnerHTML={{ __html: html }} 
            />
        </Box>
    ),
    (prev, next) => prev.html === next.html
);

const Manifest = () => {
    // Mobile detection
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
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
    const manifestAssignedResource = useMemo(() => {
        if (!bookingDetail?.booking) return null;
        return getAssignedResourceInfo(bookingDetail);
    }, [bookingDetail]);
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
        message: '',
        template: 'custom'
    });
    const [personalNote, setPersonalNote] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailLogs, setEmailLogs] = useState([]);
    const [emailLogsPollId, setEmailLogsPollId] = useState(null);
    const [emailTemplates, setEmailTemplates] = useState([]);
    const [smsTemplates, setSmsTemplates] = useState([]);
    const [groupMessageModalOpen, setGroupMessageModalOpen] = useState(false);
    const [groupMessageForm, setGroupMessageForm] = useState({
        to: [],
        subject: '',
        message: '',
        template: ''
    });
    const [groupPersonalNote, setGroupPersonalNote] = useState('');
    const [groupMessageSending, setGroupMessageSending] = useState(false);
    const [groupSelectedBookings, setGroupSelectedBookings] = useState([]);
    const [groupMessagePreviewBooking, setGroupMessagePreviewBooking] = useState(null);
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

    // SMS state
    const [smsModalOpen, setSmsModalOpen] = useState(false);
    const [smsForm, setSmsForm] = useState({ to: '', message: '', template: 'custom' });
    const [smsPersonalNote, setSmsPersonalNote] = useState('');
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
    const [groupActionMode, setGroupActionMode] = useState('message');
    const handleGlobalMenuOpen = (event, group, groupFlights) => {
      setGlobalMenuAnchorEl(event.currentTarget);
      setGlobalMenuGroup(group);
      setGlobalMenuGroupFlights(groupFlights);
    };
    const handleGlobalMenuClose = () => {
      setGlobalMenuAnchorEl(null);
      setGlobalMenuGroup(null);
    };
    const openGroupMessageModalForAction = (mode = 'message') => {
        handleGlobalMenuClose();
        if (!globalMenuGroupFlights || globalMenuGroupFlights.length === 0) {
            alert('No guests found for this flight.');
            return;
        }

        const recipients = Array.from(
            new Set(
                globalMenuGroupFlights
                    .map(flight => (flight.email || '').trim())
                    .filter(Boolean)
            )
        );

        if (recipients.length === 0) {
            alert('No email addresses available for the guests on this flight.');
            return;
        }

        // For cancel mode, find "Passenger Rescheduling Information" template
        // For message mode, find "To Be Updated" template
        let selectedTemplate = 'custom';
        if (mode === 'cancel') {
            const reschedulingTemplate = emailTemplates.find(
                t => t.name === 'Passenger Rescheduling Information'
            );
            selectedTemplate = reschedulingTemplate ? reschedulingTemplate.id : (emailTemplates.length > 0 ? emailTemplates[0].id : 'custom');
        } else if (mode === 'message') {
            const toBeUpdatedTemplate = emailTemplates.find(
                t => t.name === 'To Be Updated'
            );
            selectedTemplate = toBeUpdatedTemplate ? toBeUpdatedTemplate.id : (emailTemplates.length > 0 ? emailTemplates[0].id : 'custom');
        } else {
            selectedTemplate = emailTemplates.length > 0 ? emailTemplates[0].id : 'custom';
        }

        const primaryBooking = globalMenuGroupFlights[0] || null;

        setGroupActionMode(mode);
        setGroupSelectedBookings([...globalMenuGroupFlights]);
        setGroupMessagePreviewBooking(primaryBooking);
        setGroupMessageForm({
            to: recipients,
            subject: '',
            message: '',
            template: selectedTemplate
        });
        setGroupPersonalNote('');
        setGroupMessageModalOpen(true);

        if (selectedTemplate && emailTemplates.length > 0) {
            setTimeout(() => handleGroupTemplateChange(selectedTemplate), 0);
        }
    };

    const handleGlobalMenuAction = async (action) => {
        if (action === 'cancelAllGuests') {
            openGroupMessageModalForAction('cancel');
            return;
        }

        if (action === 'sendMessageAllGuests') {
            openGroupMessageModalForAction('message');
            return;
        }

        handleGlobalMenuClose();
    };

    const handleGroupTemplateChange = (templateValue) => {
        let subject = '';
        let message = '';

        const dbTemplate = emailTemplates.find(t => t.id.toString() === templateValue.toString());
        const previewBooking = groupMessagePreviewBooking || (groupSelectedBookings.length > 0 ? groupSelectedBookings[0] : selectedBookingForEmail);
        const templateName = resolveTemplateName(templateValue, dbTemplate);

        if (dbTemplate) {
            subject = dbTemplate.subject || '';
            message = extractMessageFromTemplateBody(dbTemplate.body) || getDefaultTemplateMessageHtml(templateName, previewBooking);
        } else {
            switch (templateValue) {
            case 'confirmation':
                subject = 'Booking Confirmation';
                message = getDefaultTemplateMessageHtml('Booking Confirmation', previewBooking);
                break;
            case 'reminder':
                subject = 'Flight Reminder';
                message = getDefaultTemplateMessageHtml('Upcoming Flight Reminder', previewBooking);
                break;
            case 'reschedule':
                subject = 'Flight Rescheduling';
                message = getDefaultTemplateMessageHtml('Booking Rescheduled', previewBooking);
                break;
            case 'to_be_updated':
                subject = 'Flight update';
                message = getDefaultTemplateMessageHtml('To Be Updated', previewBooking) || '';
                break;
            default:
                subject = groupMessageForm.subject || '';
                message = getDefaultTemplateMessageHtml(templateName, previewBooking) || groupMessageForm.message || '';
            }
        }

        setGroupMessageForm(prev => ({
            ...prev,
            subject,
            message,
            template: templateValue
        }));
    };

    const cancelGroupBookings = async (bookings) => {
        if (!bookings || bookings.length === 0) return;
        const bookingIds = bookings.map(b => b.id);

        await Promise.all(bookings.map(async (booking) => {
            const newAttempts = (booking.flight_attempts || 0) + 1;
            await axios.patch('/api/updateBookingField', {
                booking_id: booking.id,
                field: 'status',
                value: 'Cancelled'
            });
            await axios.patch('/api/updateBookingField', {
                booking_id: booking.id,
                field: 'flight_attempts',
                value: newAttempts
            });
        }));

        setFlights(prev => prev.filter(f => !bookingIds.includes(f.id)));
    };

    const closeGroupMessageModal = () => {
        setGroupMessageModalOpen(false);
        setGroupMessageForm({
            to: [],
            subject: '',
            message: '',
            template: 'custom'
        });
        setGroupPersonalNote('');
        setGroupSelectedBookings([]);
        setGroupMessagePreviewBooking(null);
        setGroupActionMode('message');
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

    const groupSelectedEmailTemplate = useMemo(() => {
        if (!groupMessageForm.template) return null;
        return (
            emailTemplates.find(
                (t) => t.id?.toString() === groupMessageForm.template?.toString()
            ) || null
        );
    }, [groupMessageForm.template, emailTemplates]);

    const previewHtml = useMemo(() => {
        if (!selectedBookingForEmail) return '';

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

    const groupPreviewHtml = useMemo(() => {
        const previewBooking =
            groupMessagePreviewBooking ||
            (groupSelectedBookings.length > 0 ? groupSelectedBookings[0] : selectedBookingForEmail);

        if (!previewBooking) return '';

        const dbTemplate = emailTemplates.find(
            (t) => t.id?.toString() === groupMessageForm.template?.toString()
        );
        const templateName = resolveTemplateName(groupMessageForm.template, dbTemplate);

        return buildEmailHtml({
            templateName,
            messageHtml: groupMessageForm.message,
            booking: previewBooking,
            personalNote: groupPersonalNote
        });
    }, [groupMessageForm.message, groupPersonalNote, groupMessageForm.template, emailTemplates, groupMessagePreviewBooking, groupSelectedBookings, selectedBookingForEmail]);

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
        let subject = '';
        let message = '';

        const dbTemplate = emailTemplates.find(t => t.id.toString() === templateValue.toString());
        const templateName = resolveTemplateName(templateValue, dbTemplate);
        
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

        setEmailForm(prev => ({
            ...prev,
            subject,
            message,
            template: templateValue
        }));
    };

    useEffect(() => {
        if (
            groupMessageModalOpen &&
            groupMessageForm.template &&
            emailTemplates.length > 0 &&
            !groupMessageForm.message
        ) {
            const dbTemplate = emailTemplates.find(
                (t) => t.id.toString() === groupMessageForm.template.toString()
            );
            if (dbTemplate) {
                const previewBooking =
                    groupMessagePreviewBooking ||
                    (groupSelectedBookings.length > 0 ? groupSelectedBookings[0] : null);
                const defaultContent = getDefaultEmailTemplateContent(
                    dbTemplate,
                    previewBooking
                );
                if (defaultContent) {
                    setGroupMessageForm((prev) => ({
                        ...prev,
                        subject: defaultContent.subject || prev.subject,
                        message: defaultContent.body || ''
                    }));
                }
            }
        }
    }, [
        groupMessageModalOpen,
        groupMessageForm.template,
        emailTemplates,
        groupMessageForm.message,
        groupMessagePreviewBooking,
        groupSelectedBookings
    ]);

    const handleSendEmail = async () => {
        if (!emailForm.to) {
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

        console.log('📄 Final HTML contains receipt:', /Receipt/i.test(finalHtml));
        
        setSendingEmail(true);
        try {
            const response = await axios.post('/api/sendBookingEmail', {
                bookingId: selectedBookingForEmail?.id,
                to: emailForm.to,
                subject: emailForm.subject,
                message: finalHtml,
                messageText: finalText,
                template: emailForm.template,
                bookingData: selectedBookingForEmail
            });
            
            if (response.data?.success) {
                alert('Email sent successfully!');
                setEmailModalOpen(false);
                setEmailForm({ to: '', subject: '', message: '', template: 'custom' });
                setPersonalNote('');
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

    const handleSendGroupEmail = async () => {
        if (groupMessageForm.to.length === 0) {
            alert('No recipients selected.');
            return;
        }

        if (!groupMessageForm.subject) {
            alert('Subject is required. Please select a template.');
            return;
        }

        if (!groupSelectedBookings.length) {
            alert('No bookings found for this group.');
            return;
        }

        setGroupMessageSending(true);
        let successCount = 0;
        const failures = [];

        for (const booking of groupSelectedBookings) {
            const to = booking.email || '';
            if (!to) {
                failures.push({ booking, reason: 'Missing email address' });
                continue;
            }

            const templateName = resolveTemplateName(groupMessageForm.template, emailTemplates.find((t) => t.id?.toString() === groupMessageForm.template?.toString()));
            const finalHtml = buildEmailHtml({
                templateName,
                messageHtml: groupMessageForm.message,
                booking,
                personalNote: groupPersonalNote
            });
            const finalText = stripHtml(finalHtml);

            try {
                await axios.post('/api/sendBookingEmail', {
                    bookingId: booking.id,
                    to,
                    subject: groupMessageForm.subject,
                    message: finalHtml,
                    messageText: finalText,
                    template: groupMessageForm.template,
                    bookingData: booking
                });
                successCount += 1;
            } catch (err) {
                failures.push({
                    booking,
                    reason: err?.response?.data?.message || err.message || 'Unknown error'
                });
            }
        }

        setGroupMessageSending(false);

        let summary = `Emails sent: ${successCount}`;
        if (failures.length > 0) {
            summary += `\nFailed: ${failures.length}`;
        }

        if (failures.length === 0 && groupActionMode === 'cancel') {
            try {
                await cancelGroupBookings(groupSelectedBookings);
                summary += `\nCancelled ${groupSelectedBookings.length} booking(s).`;
            } catch (cancelErr) {
                summary += `\nFailed to cancel bookings: ${cancelErr?.response?.data?.message || cancelErr.message || 'Unknown error'}`;
            }
        }

        alert(summary);
        if (failures.length === 0) {
            closeGroupMessageModal();
        }
    };

    // Normalize UK phone numbers to +44 format
    const normalizeUkPhone = (raw) => {
        if (!raw) return '';
        let s = String(raw).trim().replace(/[\s\-()]/g, '');
        if (s.startsWith('00')) s = '+' + s.slice(2);
        if (s.startsWith('+')) return s;
        if (s.startsWith('0')) return '+44' + s.slice(1);
        if (/^7\d{8,9}$/.test(s)) return '+44' + s;
        return s;
    };

    const stripHtml = (input = '') => {
        if (!input) return '';
        return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    };

    const fetchMessageLogs = async (bookingId) => {
        if (!bookingId) return;
        setMessagesLoading(true);
        try {
            const resp = await axios.get(`/api/bookingEmails/${bookingId}`);
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
        fetchMessageLogs(booking.id);
    };

    const toggleMessageExpand = (id) => {
        setExpandedMessageIds(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const fetchPaymentHistory = async (bookingId) => {
        if (!bookingId) return;
        setPaymentHistoryLoading(true);
        try {
            // First, try to fetch existing payment history from database
            const response = await axios.get(`/api/booking-payment-history/${bookingId}`);
            const paymentData = response.data?.data || [];
            
            // If no payment history found, try to sync from Stripe
            // This will work even if stripe_session_id is not in the current bookingDetail state
            if (paymentData.length === 0) {
                try {
                    console.log(`[PaymentHistory] No records found for booking ${bookingId}, attempting sync...`);
                    await axios.post(`/api/sync-payment-history/${bookingId}`);
                    // Fetch again after sync
                    const syncResponse = await axios.get(`/api/booking-payment-history/${bookingId}`);
                    const syncedData = syncResponse.data?.data || [];
                    console.log(`[PaymentHistory] After sync, found ${syncedData.length} records`);
                    setPaymentHistory(syncedData);
                } catch (syncError) {
                    // Sync failed (maybe no stripe_session_id), just show empty
                    console.log('[PaymentHistory] Sync failed or no stripe_session_id:', syncError?.response?.data?.message || syncError.message);
                    setPaymentHistory([]);
                }
            } else {
                console.log(`[PaymentHistory] Found ${paymentData.length} records for booking ${bookingId}`);
                setPaymentHistory(paymentData);
            }
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
                paymentId: selectedPaymentForRefund.id,
                bookingId: selectedPaymentForRefund.booking_id,
                amount: amount,
                comment: refundComment,
                stripeChargeId: selectedPaymentForRefund.stripe_charge_id || selectedPaymentForRefund.stripe_payment_intent_id
            });
            
            if (response.data.success) {
                alert('Refund processed successfully');
                setRefundModalOpen(false);
                setSelectedPaymentForRefund(null);
                setRefundAmount('');
                setRefundComment('');
                // Refresh payment history
                if (bookingDetail?.booking?.id) {
                    fetchPaymentHistory(bookingDetail.booking.id);
                    // Refresh booking detail to update paid amount
                    fetchBookingDetail(bookingDetail.booking.id);
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
        const previewBooking = selectedBookingForEmail;

        if (dbTemplate) {
            const defaultContent = getDefaultEmailTemplateContent(
                { ...dbTemplate, name: templateName },
                previewBooking
            );
            if (defaultContent?.body) {
                return defaultContent.body;
            }
        }

        const defaultMessage = getDefaultTemplateMessageHtml(templateName, previewBooking);
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

    // SMS handlers
    const handleSmsClick = (booking) => {
        setSelectedBookingForEmail(booking);
        setSmsForm({ to: normalizeUkPhone(booking.phone || ''), message: '' });
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

    const handleSmsBooking = () => {
        if (!bookingDetail?.booking) return;
        
        const booking = bookingDetail.booking;
        
        setSelectedBookingForEmail(booking);
        
        console.log('📱 Opening SMS modal...');
        console.log('📚 Available smsTemplates:', smsTemplates);
        
        const firstTemplate = smsTemplates.length > 0 ? smsTemplates[0] : null;
        
        let message = '';
        let templateValue = 'custom';
        
        if (firstTemplate) {
            templateValue = String(firstTemplate.id);
            message = firstTemplate.message || '';
            console.log('✅ SMS form populated with template:', {
                messageLength: (message || '').length,
                templateId: firstTemplate.id,
                templateValue
            });
        } else {
            message = `Hi ${booking.name || ''}, this is a message regarding your Fly Away Ballooning booking.`;
            console.log('⚠️ No templates available, using fallback');
        }
        
        setSmsForm({
            to: normalizeUkPhone(booking.phone || ''),
            message,
            template: templateValue
        });
        
        console.log('📝 Initial smsForm set:', {
            to: normalizeUkPhone(booking.phone || ''),
            message: message.substring(0, 50) + '...',
            template: templateValue
        });
        
        setSmsPersonalNote('');
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
        if (!smsForm.to || !smsForm.message) {
            alert('Please fill phone and message');
            return;
        }
        
        // Normalize phone number to +44 format
        const normalizedPhone = normalizeUkPhone(smsForm.to);
        if (!normalizedPhone || !normalizedPhone.startsWith('+44')) {
            alert('Please enter a valid UK phone number (will be converted to +44 format)');
            return;
        }
        
        // Combine template message with personal note
        const finalMessage = smsPersonalNote 
            ? `${smsForm.message}${smsForm.message ? '\n\n' : ''}${smsPersonalNote}`
            : smsForm.message;
        
        setSmsSending(true);
        try {
            const resp = await axios.post('/api/sendBookingSms', {
                bookingId: selectedBookingForEmail?.id,
                to: normalizedPhone,
                body: finalMessage,
                templateId: smsForm.template !== 'custom' ? smsForm.template : null
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
    const activitiesCacheRef = React.useRef(null);
    const availabilitiesCacheRef = React.useRef({}); // Cache by date: { '2026-03-04': [...availabilities] }
    const lastFetchDateRef = React.useRef(null);
    
    // Fetch activities only once (cache them)
    const fetchActivities = async () => {
        if (activitiesCacheRef.current) {
            // Use cached activities
            const activities = activitiesCacheRef.current;
            const map = activities.reduce((acc, a) => { if (a.location) acc[a.location] = a.id; return acc; }, {});
            setLocationToActivityId(map);
            const nameMap = activities.reduce((acc, a) => { if (a.activity_name) acc[a.activity_name] = a.id; return acc; }, {});
            setNameToActivityId(nameMap);
            return activities;
        }
        
        try {
            const activitiesRes = await axios.get('/api/activitiesForRebook');
            if (activitiesRes.data.success && Array.isArray(activitiesRes.data.data)) {
                const activities = activitiesRes.data.data;
                activitiesCacheRef.current = activities; // Cache activities
                const map = activities.reduce((acc, a) => { if (a.location) acc[a.location] = a.id; return acc; }, {});
                setLocationToActivityId(map);
                const nameMap = activities.reduce((acc, a) => { if (a.activity_name) acc[a.activity_name] = a.id; return acc; }, {});
                setNameToActivityId(nameMap);
                return activities;
            }
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
        return [];
    };
    
    // Fetch availabilities ONLY for the selected date
    const fetchAvailabilitiesForDate = async (date) => {
        if (!date) return;
        
        // Check cache first
        if (availabilitiesCacheRef.current[date]) {
            console.log('Using cached availabilities for date:', date);
            setAvailabilities(availabilitiesCacheRef.current[date]);
            return;
        }
        
        // Don't refetch if we just fetched this date
        if (lastFetchDateRef.current === date) {
            return;
        }
        
        lastFetchDateRef.current = date;
        
        try {
            const activities = await fetchActivities();
            if (activities.length === 0) return;

                let allAvailabilities = [];
            // Only fetch availabilities for the selected date
                for (const act of activities) {
                    try {
                    // Fetch availabilities with date filter if API supports it, otherwise filter client-side
                    const availRes = await axios.get(`/api/activity/${act.id}/availabilities`, {
                        params: { date: date } // Pass date as query parameter
                    });
                        if (availRes.data.success && Array.isArray(availRes.data.data)) {
                        // Filter by date on client side if API doesn't support date filter
                        const filteredAvailabilities = availRes.data.data.filter(avail => {
                            const availDate = avail.date ? dayjs(avail.date).format('YYYY-MM-DD') : null;
                            return availDate === date;
                        });
                        
                        const withMeta = filteredAvailabilities.map(avail => ({
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
            console.log(`Availabilities loaded for date ${date}:`, allAvailabilities.length, 'slots');
            availabilitiesCacheRef.current[date] = allAvailabilities; // Cache by date
                setAvailabilities(allAvailabilities);
        } catch (error) {
            console.error('Error fetching availabilities:', error);
        }
    };
    
    // Fetch activities only once on mount
    useEffect(() => {
        fetchActivities();
    }, []); // Only on mount
    
    // Fetch availabilities only when selectedDate changes
    useEffect(() => {
        if (selectedDate) {
            fetchAvailabilitiesForDate(selectedDate);
        }
    }, [selectedDate]); // Only when selectedDate changes

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
            // Normalize activity id for each flight to ensure crew assignment payload is valid
            // If activity_id is null, try to find it from location using locationToActivityId map
            const normalized = combinedFlights.map(f => {
                let activityId = f.activity_id ?? f.activityId ?? f.activityID ?? (f.activity && (f.activity.id ?? f.activity.activity_id)) ?? null;
                
                // If activity_id is still null and we have location, try to find it from locationToActivityId map
                if (!activityId && f.location && locationToActivityId[f.location]) {
                    activityId = locationToActivityId[f.location];
                    console.log(`Found activity_id ${activityId} for location ${f.location} (booking ${f.id})`);
                }
                
                return {
                ...f,
                    activity_id: activityId
                };
            });
            setFlights(normalized);
        }
    }, [booking, passenger, bookingLoading, passengerLoading, locationToActivityId]);

    const handleDateChange = (e) => {
        const newDate = e.target.value;
        console.log('Date changed to:', newDate);
        setSelectedDate(newDate);
        
        // Clear crew assignments for the old date and fetch for the new date
        setCrewAssignmentsBySlot({});
        
        // Fetch crew assignments for the new date
        if (newDate) {
            refreshCrewAssignments(newDate);
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

    // Debounce timer for auto-update status
    const autoUpdateStatusTimersRef = React.useRef({});
    
    // Function to automatically update flight status based on passenger count (with debounce)
    const autoUpdateFlightStatus = async (flight) => {
        if (!flight) return;
        if (flight.status === 'Cancelled') {
            console.log('autoUpdateFlightStatus - Skipping cancelled flight', flight.id);
            return;
        }
        
        // Create a unique key for this flight group
        const flightKey = `${flight.flight_date}_${flight.location}_${flight.flight_type}_${flight.time_slot}`;
        
        // Clear existing timer for this flight group
        if (autoUpdateStatusTimersRef.current[flightKey]) {
            clearTimeout(autoUpdateStatusTimersRef.current[flightKey]);
        }
        
        // Debounce: wait 500ms before actually updating
        autoUpdateStatusTimersRef.current[flightKey] = setTimeout(async () => {
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
            } finally {
                // Clean up timer
                delete autoUpdateStatusTimersRef.current[flightKey];
        }
        }, 500); // 500ms debounce
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
        
        // For Private Flight, include booking ID in the key to create separate sections for each booking
        const isPrivateFlight = type.includes('private') || type.includes('charter');
        if (isPrivateFlight && f.id) {
            // Each Private Flight booking gets its own section
            const key = `${loc}||${type}||${time}||${f.id}`;
            return key;
        }
        
        // For Shared Flight, group by location, type, and time (existing behavior)
        const key = `${loc}||${type}||${time}`;
        return key;
    });

    const handleNameClick = async (bookingId) => {
        setSelectedBookingId(bookingId);
        await fetchBookingDetail(bookingId);
        setDetailDialogOpen(true);
    };

    useEffect(() => {
        if (detailDialogOpen && selectedBookingId) {
            // Don't refetch here - fetchBookingDetail is already called in handleNameClick
            // This useEffect is kept to maintain consistent state management
            // Only fetch booking history if not already loaded
            if (!bookingHistory || bookingHistory.length === 0) {
                axios.get(`/api/getBookingHistory?booking_id=${selectedBookingId}`)
                    .then(res => {
                        setBookingHistory(res.data.history || []);
                    })
                    .catch(err => {
                        console.error('Error loading booking history:', err);
                    });
            }
        } else {
            setBookingDetail(null);
            setBookingHistory([]);
            setAdditionalInformation(null);
        }
    }, [detailDialogOpen, selectedBookingId]);

    const handleAddGuestClick = () => {
        // For vouchers, use voucher.flight_type; for bookings, use booking.flight_type
        const flightType = bookingDetail?.booking?.flight_type || bookingDetail?.voucher?.flight_type || 'Shared Flight';
        setGuestType(flightType);
        setGuestCount(0);
        setGuestForms([]);
        setAddGuestDialogOpen(true);
    };

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

    const handleGuestFormChange = (idx, field, value) => {
        setGuestForms(prev => prev.map((g, i) => i === idx ? { ...g, [field]: value } : g));
    };

    const handleSaveGuests = async () => {
        if (!bookingDetail?.booking?.id) return;
        const existingCount = Array.isArray(bookingDetail?.passengers) ? bookingDetail.passengers.length : 0;
        // Add each guest (auto-fill names if missing)
        let lastNewDue = null;
        for (let idx = 0; idx < guestForms.length; idx++) {
            const g = guestForms[idx];
            const firstName = (g.firstName || '').trim() || `Guest ${existingCount + idx + 1}`;
            const lastName = (g.lastName || '').trim() || 'Guest';
            try {
                const response = await axios.post('/api/addPassenger', {
                    booking_id: bookingDetail.booking.id,
                    first_name: firstName,
                    last_name: lastName,
                    email: (g.email || '').trim() || null,
                    phone: (g.phone || '').trim() || null,
                    ticket_type: g.ticketType,
                    weight: (g.weight || '').toString().trim() || null,
                    weather_refund: g.weatherRefund ? 1 : 0
                });
                if (response.data.newDue !== undefined) {
                    lastNewDue = response.data.newDue;
                }
            } catch (err) {
                console.error('Failed to add guest passenger', err);
            }
        }
        // Fetch updated passengers
        const res = await axios.get(`/api/getBookingDetail?booking_id=${bookingDetail.booking.id}`);
        const updatedPassengers = res.data.passengers;
        
        // Get booking details after guest addition
        const paid = parseFloat(res.data.booking.paid) || 0;
        const due = parseFloat(res.data.booking.due) || 0;
        const experience = res.data.booking?.experience || '';
        const totalAmount = paid + due;
        const n = updatedPassengers.length;
        
        console.log('=== MANIFEST - AFTER ADD GUEST ===');
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
            
            console.log('=== RECALCULATING PASSENGER PRICES (SHARED FLIGHT - MANIFEST) ===');
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
            console.log('=== PRIVATE CHARTER - SKIPPING PASSENGER PRICE RECALCULATION (MANIFEST) ===');
        }
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
            
            // Recalculate passenger prices based on paid + due
            const booking = res.data.booking;
            const passengers = res.data.passengers || [];
            
            if (booking && passengers.length > 0) {
                const paid = parseFloat(booking.paid) || 0;
                const due = parseFloat(booking.due) || 0;
                const totalAmount = paid + due;
                const n = passengers.length;
                const correctPricePerPassenger = n > 0 ? parseFloat((totalAmount / n).toFixed(2)) : 0;
                
                console.log('=== FETCH BOOKING DETAIL (MANIFEST) - CHECKING PRICES ===');
                console.log('Paid:', paid);
                console.log('Due:', due);
                console.log('Total Amount:', totalAmount);
                console.log('Number of Passengers:', n);
                console.log('Correct Price Per Passenger:', correctPricePerPassenger);
                
                // Check if any passenger has incorrect price
                const needsUpdate = passengers.some(p => {
                    const currentPrice = parseFloat(p.price) || 0;
                    return Math.abs(currentPrice - correctPricePerPassenger) > 0.01;
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
                // Get new due from response if available
                const newDue = response.data.newDue !== undefined ? response.data.newDue : null;
                
                console.log('=== MANIFEST - DELETE PASSENGER ===');
                console.log('New Due from backend:', newDue);
                
                // Refetch passengers to update UI
                await fetchBookingDetail(bookingDetail.booking.id);
                
                // Update bookingDetail with new due if available
                if (newDue !== null) {
                    setBookingDetail(prev => ({
                        ...prev,
                        booking: {
                            ...prev.booking,
                            due: newDue
                        }
                    }));
                }
                
                // Update flights state to reflect the new pax count and due
                setFlights(prevFlights => prevFlights.map(flight => {
                    if (flight.id === bookingDetail.booking.id) {
                        // Update the pax count and due for this specific flight
                        return {
                            ...flight,
                            pax: (flight.pax || 0) - 1,
                            due: newDue !== null ? newDue : flight.due
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
            
            // Success message
            alert('Flight successfully cancelled! Flight attempts: ' + newAttempts);
        } catch (err) {
            console.error('Cancel Flight Error:', err);
            alert('Cancel operation failed! Error: ' + err.message);
        }
    };

    const handleEmailBooking = () => {
        if (!bookingDetail?.booking) return;
        
        const booking = bookingDetail.booking;
        
        setSelectedBookingForEmail(booking);
        
        console.log('📧 Opening email modal...');
        console.log('📚 Available emailTemplates:', emailTemplates);
        
        const firstTemplate = emailTemplates.length > 0 ? emailTemplates[0] : null;
        
        let subject = '';
        let message = '';
        let templateValue = 'custom';
        
        if (firstTemplate) {
            templateValue = firstTemplate.id;
            subject = firstTemplate.subject || '';
            message = extractMessageFromTemplateBody(firstTemplate.body) || getDefaultTemplateMessageHtml(firstTemplate.name, booking);
            console.log('✅ Email form populated with template body:', {
                subject,
                bodyLength: (message || '').length,
                templateId: firstTemplate.id
            });
        } else {
            subject = `Regarding your Fly Away Ballooning booking - ${booking.name || ''}`;
            message = getDefaultTemplateMessageHtml('Custom Message', booking) || '';
            console.log('⚠️ No templates available, using fallback');
        }
        
        setEmailForm({
            to: booking.email || '',
            subject,
            message,
            template: templateValue
        });
        
        setPersonalNote('');
        setEmailModalOpen(true);
    };

    const handleRebook = () => {
        setRebookModalOpen(true);
    };

    const handleRebookSlotSelect = async (date, time, activityId, selectedActivity, selectedLocation, selectedFlightTypes, selectedVoucherTypes) => {
        if (!bookingDetail || !bookingDetail.booking) return;
        setRebookLoading(true);
        try {
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

            // Get activity details to determine flight type and pricing
            const activityResponse = await axios.get(`/api/activity/${activityId}`);
            const activity = activityResponse.data.data;
            
            // Determine flight type from selectedFlightTypes parameter (user's selection in Rebook popup)
            // This is critical: use the user's selection, not passenger count
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
                } else {
                    // Last fallback: use passenger count (but this should rarely happen)
                    const passengerCount = bookingDetail.booking.pax || 1;
                    flightType = passengerCount === 1 ? 'Shared Flight' : 'Private Flight';
                }
            }
            
            console.log('🔄 Manifest Rebook - Selected Flight Types:', selectedFlightTypes);
            console.log('🔄 Manifest Rebook - Determined Flight Type:', flightType);
            
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
            
            // Keep the existing flight_attempts value. It is incremented only when a flight is cancelled.
            const currentAttempts = parseInt(bookingDetail.booking.flight_attempts || 0, 10);
            
            // Get voucher type from selectedVoucherTypes or existing booking
            let voucherType = bookingDetail.booking.voucher_type || '';
            if (selectedVoucherTypes && selectedVoucherTypes.length > 0) {
                // Use the first selected voucher type (since only one can be selected)
                // For private voucher types, it's already a title (e.g., 'Private Charter', 'Proposal Flight')
                // For shared voucher types, it's a key (e.g., 'weekday morning', 'any day flight') - convert to title case
                const selected = selectedVoucherTypes[0];
                console.log('🔄 Manifest Rebook - Selected voucher types:', selectedVoucherTypes);
                console.log('🔄 Manifest Rebook - First selected:', selected);
                if (selected && typeof selected === 'string') {
                    // Check if it's a key (lowercase) or already a title (has capital letters)
                    if (selected === selected.toLowerCase() && selected.includes(' ')) {
                        // It's a key, convert to title case
                        voucherType = selected.split(' ').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                        ).join(' ');
                        console.log('🔄 Manifest Rebook - Converted key to title case:', voucherType);
                    } else {
                        // It's already a title, use as is
                        voucherType = selected;
                        console.log('🔄 Manifest Rebook - Using title as is:', voucherType);
                    }
                } else {
                    voucherType = selected;
                    console.log('🔄 Manifest Rebook - Using selected as is (non-string):', voucherType);
                }
            } else if (!voucherType) {
                // Fallback to default if no selection and no existing voucher type
                voucherType = 'Any Day Flight';
                console.log('🔄 Manifest Rebook - Using fallback voucher type:', voucherType);
            } else {
                console.log('🔄 Manifest Rebook - Using existing booking voucher type:', voucherType);
            }
            console.log('🔄 Manifest Rebook - Final voucher type:', voucherType);
            
            // Determine experience from flightType - this is critical for manifest page Type display
            // experience field is used in manifest page to show "Type: Shared Flight" or "Type: Private Flight"
            let experience = flightType; // Default to flightType
            if (flightType === 'Shared Flight') {
                experience = 'Shared Flight';
            } else if (flightType === 'Private Flight' || flightType === 'Private Charter') {
                experience = 'Private Charter'; // Use 'Private Charter' for consistency
            }
            
            console.log('🔄 Manifest Rebook - Flight Type:', flightType, 'Experience:', experience);
            
            // Prepare passenger data for new booking
            // Note: existingPassengers is already defined above (line 2119)
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

            // Preserve original created_at to maintain table position after rebook
            const originalCreatedAt = bookingDetail.booking.created_at || bookingDetail.booking.createdAt || null;

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
                flight_attempts: currentAttempts, // Preserve attempts value during rebook
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
            
            // Force refresh all data
            if (typeof bookingHook.refetch === 'function') {
                await bookingHook.refetch();
            }
            
            // Also refresh passenger data
            if (typeof pessangerHook.refetch === 'function') {
                await pessangerHook.refetch();
            }
            
            // Refresh availabilities for selected date only
            if (selectedDate) {
                // Clear cache for this date to force refresh
                delete availabilitiesCacheRef.current[selectedDate];
                await fetchAvailabilitiesForDate(selectedDate);
            }
            
            // Force re-render by updating flights state
            setTimeout(() => {
                if (typeof bookingHook.refetch === 'function') {
                    bookingHook.refetch();
                }
            }, 500);
            
            // Show success message
            alert('Booking successfully rebooked! Confirmation email has been sent.');
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

                // Execute all updates in parallel
                await Promise.all(updates.map(update =>
                    axios.patch('/api/updatePassengerField', {
                        passenger_id: p.id,
                        field: update.field,
                        value: update.value
                    })
                ));
            }
            
            // Wait a bit to ensure database updates are committed
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Fetch updated booking detail
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

    // Auto-update flight statuses when flights data changes (only for selected date)
    useEffect(() => {
        if (flights.length > 0 && activity.length > 0 && selectedDate) {
            // Only process flights for the selected date
            const flightsForDate = flights.filter(flight => 
                flight.flight_date && flight.flight_date.substring(0, 10) === selectedDate
            );
            
            if (flightsForDate.length === 0) return;
            
            console.log(`Auto-status updates for date ${selectedDate}: ${flightsForDate.length} flights`);
            
            // Group flights by normalized location, type, and time
            const flightGroups = {};
            flightsForDate.forEach(flight => {
                const loc = normalizeText(flight.location);
                const type = normalizeText(flight.flight_type);
                const time = normalizeTime(flight);
                const key = `${loc}||${type}||${time}`;
                (flightGroups[key] = flightGroups[key] || []).push(flight);
            });
            
            // Only update status for unique flight groups (avoid duplicate calls)
            const processedGroups = new Set();
            Object.values(flightGroups).forEach(groupFlights => {
                if (groupFlights.length > 0) {
                    const firstFlight = groupFlights[0];
                    const groupKey = `${firstFlight.flight_date}_${firstFlight.location}_${firstFlight.flight_type}_${firstFlight.time_slot}`;
                    if (!processedGroups.has(groupKey)) {
                        processedGroups.add(groupKey);
                    autoUpdateFlightStatus(firstFlight);
                }
                }
            });
        }
    }, [flights, activity, selectedDate]); // Added selectedDate dependency

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
    
    // Pilot state
    const [pilotList, setPilotList] = useState([]);
    const [pilotAssignmentsBySlot, setPilotAssignmentsBySlot] = useState({}); // key: `${activityId}_${date}_${time}` => pilot_id
    const lastPilotFetchRef = React.useRef({ date: null, inFlight: false });
    const [pilotNotification, setPilotNotification] = useState({ show: false, message: '', type: 'success' });

    const slotKey = (activityId, date, time) => `${activityId}_${date}_${time}`;

    // Try to resolve activity id from various possible shapes on flight objects
    const getFlightActivityId = (flight) => {
        if (!flight) return null;
        return flight.activity_id ?? flight.activityId ?? flight.activityID ?? (flight.activity && (flight.activity.id ?? flight.activity.activity_id)) ?? null;
    };

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

    const refreshPilotAssignments = async (date) => {
        if (!date) return;
        // Prevent duplicate, rapid calls for the same date
        if (lastPilotFetchRef.current.inFlight && lastPilotFetchRef.current.date === date) return;
        if (lastPilotFetchRef.current.date === date && Object.keys(pilotAssignmentsBySlot || {}).length > 0) return;
        try {
            lastPilotFetchRef.current = { date, inFlight: true };
            const res = await axios.get('/api/pilot-assignments', { params: { date } });
            if (res.data?.success && Array.isArray(res.data.data)) {
                const map = {};
                for (const row of res.data.data) {
                    const key = slotKey(row.activity_id, dayjs(row.date).format('YYYY-MM-DD'), row.time.substring(0,5));
                    map[key] = row.pilot_id;
                }
                setPilotAssignmentsBySlot(map);
            } else {
                setPilotAssignmentsBySlot({});
            }
        } catch (err) {
            console.error('Error refreshing pilot assignments:', err);
            setPilotAssignmentsBySlot({});
        } finally {
            lastPilotFetchRef.current.inFlight = false;
        }
    };

    // Helper function to get crew member name by ID
    const getCrewMemberName = (crewId) => {
        if (!crewId || !crewList.length) return 'None';
        const crewMember = crewList.find(c => c.id == crewId);
        return crewMember ? `${crewMember.first_name} ${crewMember.last_name}` : `ID: ${crewId}`;
    };

    // Helper function to get pilot name by ID
    const getPilotName = (pilotId) => {
        if (!pilotId || !pilotList.length) return 'None';
        const pilot = pilotList.find(p => p.id == pilotId);
        return pilot ? `${pilot.first_name} ${pilot.last_name}` : `ID: ${pilotId}`;
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

    // Function to clear pilot assignment
    const clearPilotAssignment = async (activityId, flightDateStr) => {
        let date = null; let time = null;
        if (typeof flightDateStr === 'string') {
            const parts = flightDateStr.split(' ');
            date = parts[0];
            time = (parts[1] || '').substring(0,5) + ':00';
        }
        if (!date || !time) return;
        
        try {
            // Set pilot_id to null or delete the record
            await axios.post('/api/pilot-assignment', { 
                activity_id: activityId, 
                date, 
                time, 
                pilot_id: null 
            });
            
            const slotKeyValue = slotKey(activityId, date, time.substring(0,5));
            setPilotAssignmentsBySlot(prev => {
                const updated = { ...prev };
                delete updated[slotKeyValue];
                return updated;
            });
            
            setPilotNotification({
                show: true,
                message: 'Pilot assignment cleared successfully!',
                type: 'success'
            });
            setTimeout(() => setPilotNotification({ show: false, message: '', type: 'success' }), 3000);
            
        } catch (e) {
            console.error('Failed to clear pilot assignment:', e);
            setPilotNotification({
                show: true,
                message: 'Failed to clear pilot assignment: ' + (e.response?.data?.message || e.message),
                type: 'error'
            });
            setTimeout(() => setPilotNotification({ show: false, message: '', type: 'error' }), 3000);
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

    // Fetch pilot list once
    useEffect(() => {
        console.log('Fetching pilot list...');
        axios.get('/api/pilots').then(res => {
            if (res.data?.success) {
                console.log('Pilot list loaded:', res.data.data);
                setPilotList(res.data.data || []);
            }
        }).catch((err) => {
            console.error('Error fetching pilot list:', err);
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
        refreshPilotAssignments(selectedDate);
    }, [selectedDate, flights]);

    // Initialize pilot assignments on mount and when selectedDate changes
    useEffect(() => {
        if (selectedDate) {
            console.log('Initial pilot assignments fetch for date:', selectedDate);
            refreshPilotAssignments(selectedDate);
        }
    }, [selectedDate]); // Run when selectedDate changes

    // Ensure pilot assignments are loaded on initial mount
    useEffect(() => {
        if (selectedDate && pilotList.length > 0) {
            console.log('Component mounted, loading pilot assignments for date:', selectedDate);
            refreshPilotAssignments(selectedDate);
        }
    }, [pilotList.length]); // Run when pilot list is loaded

    // Force refresh pilot assignments on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            if (selectedDate) {
                console.log('Force refreshing pilot assignments on mount for date:', selectedDate);
                refreshPilotAssignments(selectedDate);
            }
        }, 1000); // Wait 1 second for everything to load
        
        return () => clearTimeout(timer);
    }, []); // Run once on mount

    // Additional effect to ensure pilot assignments are loaded
    useEffect(() => {
        if (selectedDate && pilotList.length > 0 && Object.keys(pilotAssignmentsBySlot).length === 0) {
            console.log('No pilot assignments loaded, fetching for date:', selectedDate);
            refreshPilotAssignments(selectedDate);
        }
    }, [selectedDate, pilotList.length, pilotAssignmentsBySlot]);

    const handleCrewChange = async (activityId, flightDateStr, crewId) => {
        // flightDateStr like 'YYYY-MM-DD HH:mm:ss' or 'YYYY-MM-DD 17:00:00'
        let date = null; let time = null;
        if (typeof flightDateStr === 'string') {
            const parts = flightDateStr.split(' ');
            date = parts[0];
            // ensure we have HH:mm:ss
            const hhmm = (parts[1] || '').substring(0,5);
            if (hhmm && /^\d{2}:\d{2}$/.test(hhmm)) {
                time = hhmm + ':00';
            }
        }
        if (!date || !time) {
            console.error('Invalid flight date string for crew assignment:', flightDateStr);
            return;
        }
        
        // Validate and normalize activityId
        if (activityId === null || activityId === undefined) {
            console.error('Invalid activityId for crew assignment:', activityId);
            alert('Error: Activity ID is missing. Please refresh the page and try again.');
            return;
        }
        
        // Normalize activityId to integer
        const normalizedActivityId = typeof activityId === 'string' 
            ? (activityId.trim() === '' ? null : parseInt(activityId, 10))
            : activityId;
        
        // Check if normalizedActivityId is valid
        if (normalizedActivityId === null || normalizedActivityId === undefined || isNaN(normalizedActivityId)) {
            console.error('Invalid normalized activityId for crew assignment:', normalizedActivityId, 'original:', activityId);
            alert('Error: Invalid Activity ID. Please refresh the page and try again.');
            return;
        }
        
        // Convert empty string or "0" to null, and convert string ID to integer
        const normalizedCrewId = (crewId === '' || crewId === '0' || crewId === null || crewId === undefined) 
            ? null 
            : (typeof crewId === 'string' ? parseInt(crewId, 10) : crewId);
        
        // If crewId is provided, validate it's a number
        if (normalizedCrewId !== null && (isNaN(normalizedCrewId) || normalizedCrewId <= 0)) {
            console.error('Invalid crewId for crew assignment:', normalizedCrewId, 'original:', crewId);
            alert('Error: Invalid Crew ID. Please select a valid crew member.');
            return;
        }
        
        console.log('Saving crew assignment:', { activityId: normalizedActivityId, date, time, crewId: normalizedCrewId });
        
        try {
            console.log('Saving crew assignment for:', { activityId: normalizedActivityId, date, time, crewId: normalizedCrewId });
            
            const response = await axios.post('/api/crew-assignment', { 
                activity_id: normalizedActivityId, 
                date, 
                time, 
                crew_id: normalizedCrewId 
            });
            console.log('Crew assignment saved:', response.data);
            
            const slotKeyValue = slotKey(normalizedActivityId, date, time.substring(0,5));
            console.log('Updating local state with key:', slotKeyValue, 'value:', normalizedCrewId);
            
            // Update local state immediately for instant feedback
            setCrewAssignmentsBySlot(prev => {
                const updated = { ...prev, [slotKeyValue]: normalizedCrewId };
                console.log('Updated crew assignments:', updated);
                return updated;
            });
            
            // Show success message
            console.log('Crew assignment saved successfully!');
            
            // Get crew member details and send email (only if crew is assigned)
            let emailSent = false;
            let emailErrorMsg = '';
            if (normalizedCrewId) {
            try {
                    console.log('📧 Starting email send process for crew ID:', normalizedCrewId);
                console.log('📧 Available email templates:', emailTemplates.map(t => t.name));
                
                // Fetch crew member details
                    const crewResponse = await axios.get(`/api/crew/${normalizedCrewId}`);
                const crewMember = crewResponse.data?.data;
                console.log('📧 Crew member data:', { 
                    id: crewMember?.id, 
                    name: crewMember ? `${crewMember.first_name} ${crewMember.last_name}` : 'N/A',
                    email: crewMember?.email || 'N/A' 
                });
                
                if (crewMember && crewMember.email) {
                    // Find "Crew Management" email template - try multiple variations
                    const crewManagementTemplate = emailTemplates.find(
                        (t) => {
                            if (!t.name) return false;
                            const nameLower = t.name.toLowerCase();
                            return nameLower.includes('crew management') || 
                                   nameLower.includes('crewmanagement') ||
                                   (nameLower.includes('crew') && nameLower.includes('management'));
                        }
                    );
                    
                    console.log('📧 Template search result:', crewManagementTemplate ? {
                        id: crewManagementTemplate.id,
                        name: crewManagementTemplate.name,
                        subject: crewManagementTemplate.subject
                    } : 'Template not found');
                    
                    if (crewManagementTemplate) {
                        // Get template content
                        const templateName = crewManagementTemplate.name;
                        const subject = crewManagementTemplate.subject || 'Crew Management';
                        let message = extractMessageFromTemplateBody(crewManagementTemplate.body) || '';
                        
                        // If no message in template, use default
                        if (!message) {
                            message = getDefaultTemplateMessageHtml(templateName, null) || '';
                        }
                        
                        console.log('📧 Email content prepared:', { 
                            subject, 
                            messageLength: message.length,
                            to: crewMember.email 
                        });
                        
                        // Build email HTML
                        const finalHtml = buildEmailHtml({
                            templateName,
                            messageHtml: message,
                            booking: null,
                            personalNote: ''
                        });
                        const finalText = stripHtml(finalHtml);
                        
                        // Send email to crew member
                        console.log('📧 Sending email to:', crewMember.email);
                        const emailResponse = await axios.post('/api/sendBookingEmail', {
                            bookingId: null,
                            to: crewMember.email,
                            subject: subject,
                            message: finalHtml,
                            messageText: finalText,
                            template: crewManagementTemplate.id,
                            bookingData: null
                        });
                        
                        console.log('📧 Email response:', emailResponse.data);
                        
                        if (emailResponse.data?.success) {
                            emailSent = true;
                            console.log('✅ Crew Management email sent successfully to:', crewMember.email);
                        } else {
                            emailErrorMsg = emailResponse.data?.message || 'Unknown error';
                            console.error('❌ Failed to send email:', emailErrorMsg);
                        }
                    } else {
                        emailErrorMsg = 'Crew Management email template not found';
                        console.warn('⚠️', emailErrorMsg);
                        console.warn('Available templates:', emailTemplates.map(t => t.name));
                    }
                } else {
                    emailErrorMsg = crewMember ? 'Crew member email not found' : 'Crew member not found';
                    console.warn('⚠️', emailErrorMsg);
                }
            } catch (emailError) {
                emailErrorMsg = emailError.response?.data?.message || emailError.message || 'Unknown error';
                console.error('❌ Error sending crew management email:', emailError);
                console.error('Error details:', {
                    message: emailError.message,
                    response: emailError.response?.data,
                    status: emailError.response?.status
                });
                // Don't fail the crew assignment if email fails
                }
            }
            
            // Also refresh from server to ensure consistency
            await refreshCrewAssignments(date);
            
            // Force a re-render to ensure UI updates
            setTimeout(() => {
                setCrewAssignmentsBySlot(prev => ({ ...prev }));
            }, 100);
        } catch (e) {
            console.error('Failed to save crew selection:', e);
        }
    };

    const handlePilotChange = async (activityId, flightDateStr, pilotId) => {
        // flightDateStr like 'YYYY-MM-DD HH:mm:ss' or 'YYYY-MM-DD 17:00:00'
        let date = null; let time = null;
        if (typeof flightDateStr === 'string') {
            const parts = flightDateStr.split(' ');
            date = parts[0];
            // ensure we have HH:mm:ss
            const hhmm = (parts[1] || '').substring(0,5);
            if (hhmm && /^\d{2}:\d{2}$/.test(hhmm)) {
                time = hhmm + ':00';
            }
        }
        if (!date || !time) {
            console.error('Invalid flight date string for pilot assignment:', flightDateStr);
            return;
        }
        
        // Validate and normalize activityId
        if (activityId === null || activityId === undefined) {
            console.error('Invalid activityId for pilot assignment:', activityId);
            alert('Error: Activity ID is missing. Please refresh the page and try again.');
            return;
        }
        
        // Normalize activityId to integer
        const normalizedActivityId = typeof activityId === 'string' 
            ? (activityId.trim() === '' ? null : parseInt(activityId, 10))
            : activityId;
        
        // Check if normalizedActivityId is valid
        if (normalizedActivityId === null || normalizedActivityId === undefined || isNaN(normalizedActivityId)) {
            console.error('Invalid normalized activityId for pilot assignment:', normalizedActivityId, 'original:', activityId);
            alert('Error: Invalid Activity ID. Please refresh the page and try again.');
            return;
        }
        
        // Convert empty string or "0" to null, and convert string ID to integer
        const normalizedPilotId = (pilotId === '' || pilotId === '0' || pilotId === null || pilotId === undefined) 
            ? null 
            : (typeof pilotId === 'string' ? parseInt(pilotId, 10) : pilotId);
        
        // If pilotId is provided, validate it's a number
        if (normalizedPilotId !== null && (isNaN(normalizedPilotId) || normalizedPilotId <= 0)) {
            console.error('Invalid pilotId for pilot assignment:', normalizedPilotId, 'original:', pilotId);
            alert('Error: Invalid Pilot ID. Please select a valid pilot.');
            return;
        }
        
        console.log('Saving pilot assignment:', { activityId: normalizedActivityId, date, time, pilotId: normalizedPilotId });
        
        try {
            console.log('Saving pilot assignment for:', { activityId: normalizedActivityId, date, time, pilotId: normalizedPilotId });
            
            const response = await axios.post('/api/pilot-assignment', { 
                activity_id: normalizedActivityId, 
                date, 
                time, 
                pilot_id: normalizedPilotId 
            });
            console.log('Pilot assignment saved:', response.data);
            
            const slotKeyValue = slotKey(normalizedActivityId, date, time.substring(0,5));
            console.log('Updating local state with key:', slotKeyValue, 'value:', normalizedPilotId);
            
            // Update local state immediately for instant feedback
            setPilotAssignmentsBySlot(prev => {
                const updated = { ...prev, [slotKeyValue]: normalizedPilotId };
                console.log('Updated pilot assignments:', updated);
                return updated;
            });
            
            // Also refresh from server to ensure consistency
            await refreshPilotAssignments(date);
            
            // Force a re-render to ensure UI updates
            setTimeout(() => {
                setPilotAssignmentsBySlot(prev => ({ ...prev }));
            }, 100);
        } catch (e) {
            console.error('Failed to save pilot selection:', e);
        }
    };

    return (
        <div className="final-menifest-wrap">
            <Container maxWidth={false}>
                <div className="heading-wrap">
                    <h2>MANIFEST PAGE</h2>
                    <hr />
                </div>
                <Box sx={{ padding: isMobile ? 1 : 2 }}>
                    {/* Header Section */}
                    <Box sx={{ marginBottom: isMobile ? 1 : 3 }}>
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
                        
                        {/* Pilot assignment notification */}
                        {pilotNotification.show && (
                            <Box sx={{ 
                                mb: 2, 
                                p: 2, 
                                bgcolor: pilotNotification.type === 'success' ? '#f0fdf4' : '#fef2f2',
                                color: pilotNotification.type === 'success' ? '#166534' : '#dc2626',
                                borderRadius: 1, 
                                border: `1px solid ${pilotNotification.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span>{pilotNotification.message}</span>
                                <IconButton 
                                    size="small" 
                                    onClick={() => setPilotNotification({ show: false, message: '', type: 'success' })}
                                >
                                    ×
                                </IconButton>
                            </Box>
                        )}
                        
                        {/* Debug info for crew assignments - removed for production */}
                        {/* Intentionally hidden */}
                        <Box className="manifest-date-selector" sx={{
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            alignItems: isMobile ? 'center' : 'center',
                            gap: isMobile ? 2 : 2
                        }}>
                            {/* Navigation buttons - side by side on mobile, above date picker */}
                            <Box sx={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: isMobile ? 'center' : 'flex-start',
                                gap: isMobile ? 1 : 0,
                                order: isMobile ? -1 : 0,
                                width: isMobile ? '100%' : 'auto',
                                marginBottom: isMobile ? 1 : 0
                            }} className="manifest-nav-buttons">
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
                            const parseNumeric = (value) => {
                                const parsed = Number(value);
                                return Number.isFinite(parsed) ? parsed : null;
                            };
                            const getInitialAvailableTotal = (slot) => {
                                if (!slot) return null;
                                const availableNum = parseNumeric(slot.available);
                                const bookedNum = parseNumeric(slot.booked);
                                if (availableNum !== null && bookedNum !== null) {
                                    return availableNum + bookedNum;
                                }
                                const capacityNum = parseNumeric(slot.capacity);
                                return capacityNum !== null ? capacityNum : null;
                            };
                            // DISPLAY LOGIC UPDATE: Compare availability count vs actual passenger count and use the larger to include newly added guests immediately
                            const passengerCountDisplay = groupFlights.reduce((sum, f) => sum + (f.passengers ? f.passengers.length : 0), 0);
                            const availabilityCountDisplay = (found && typeof found.capacity === 'number' && typeof found.available === 'number')
                                ? (found.capacity - found.available)
                                : passengerCountDisplay;
                            const paxBookedDisplay = passengerCountDisplay;
                            // Prefer capacity directly from matched availability; otherwise try to re-match using map
                            let paxTotalDisplay = '-';
                            if (found) {
                                const initialAvailableTotal = getInitialAvailableTotal(found);
                                if (initialAvailableTotal !== null) {
                                    paxTotalDisplay = initialAvailableTotal;
                                }
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
                                if (reFound) {
                                    const reFoundInitial = getInitialAvailableTotal(reFound);
                                    if (reFoundInitial !== null) {
                                        paxTotalDisplay = reFoundInitial;
                                    }
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
                             
                            // Calculate balloon resource using getAssignedResourceInfo (same as Booking Details popup)
                            // Create a mock bookingDetail object for getAssignedResourceInfo
                            const calculateBalloonResource = (flight) => {
                                // Get all passengers for this flight
                                const flightPassengers = Array.isArray(flight.passengers) ? flight.passengers : [];
                                
                                // Create mock bookingDetail object
                                const mockBookingDetail = {
                                    booking: {
                                        experience: flight.experience || flight.flight_type,
                                        flight_type: flight.flight_type,
                                        pax: flightPassengers.length,
                                        passenger_count: flightPassengers.length
                                    },
                                    passengers: flightPassengers
                                };
                                
                                const resourceInfo = getAssignedResourceInfo(mockBookingDetail);
                                return resourceInfo ? resourceInfo.resourceName : (flight.balloon_resources || 'N/A');
                            };
                            
                            // For Private Flight, calculate resource for each flight separately
                            // For Shared Flight, use the first flight's resource
                            const isPrivateFlight = (first.flight_type || '').toLowerCase().includes('private') || 
                                                   (first.flight_type || '').toLowerCase().includes('charter');
                            
                            let balloonResource = 'N/A';
                            if (isPrivateFlight && groupFlights.length > 0) {
                                // For Private Flight, use the first flight's resource (each booking has its own section now)
                                balloonResource = calculateBalloonResource(first);
                            } else {
                                // For Shared Flight, calculate from first flight
                                balloonResource = calculateBalloonResource(first);
                            }
                            
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
                                <Card key={groupKey} sx={{ marginBottom: isMobile ? 0.5 : 2 }} className="manifest-flight-card">
                                    <CardContent sx={{ padding: isMobile ? '8px !important' : undefined }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={isMobile ? 0.5 : 2} className="manifest-flight-header" sx={{ position: 'relative' }}>
                                            <Box display="flex" flexDirection="column" alignItems="flex-start" sx={{ flex: 1, minWidth: 0 }}>
                                                {/* Mobile: Title and three dots menu in same row */}
                                                {isMobile ? (
                                                    <Box sx={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'space-between',
                                                        width: '100%',
                                                        gap: 1
                                                    }}>
                                                {/* Section başlığında activityName ve flight time birlikte gösterilecek */}
                                                {/* Check if any booking in this group has Proposal Flight voucher type */}
                                                {/* For Private Flight, show booking ID in the title */}
                                                {(() => {
                                                    const hasProposal = groupFlights.some(f => {
                                                        const voucherType = (f.voucher_type || '').toLowerCase();
                                                        return voucherType.includes('proposal');
                                                    });
                                                    const isPrivateFlight = (first.flight_type || '').toLowerCase().includes('private') || 
                                                                           (first.flight_type || '').toLowerCase().includes('charter');
                                                    const titleSuffix = hasProposal ? ' | Proposal' : '';
                                                    const bookingIdSuffix = isPrivateFlight && first.id ? ` | Booking ID: ${first.id}` : '';
                                                    return (
                                                                <Typography 
                                                                    variant="h6" 
                                                                    sx={{ 
                                                                        fontSize: '14px',
                                                                        fontWeight: 600,
                                                                        lineHeight: 1.3,
                                                                        flex: 1,
                                                                        minWidth: 0,
                                                                        margin: 0
                                                                    }}
                                                                >
                                                                    {activityName}{titleSuffix}{bookingIdSuffix} - Flight Time: {displayFlightTime}
                                                                </Typography>
                                                    );
                                                })()}
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={e => handleGlobalMenuOpen(e, first, groupFlights)}
                                                            sx={{ 
                                                                padding: '4px',
                                                                flexShrink: 0,
                                                                '& .MuiSvgIcon-root': {
                                                                    fontSize: '18px',
                                                                    color: '#3274b4'
                                                                }
                                                            }}
                                                        >
                                                            <MoreVertIcon />
                                                        </IconButton>
                                                    </Box>
                                                ) : (
                                                    <>
                                                        {/* Desktop: Three dots menu at top right of header */}
                                                        {/* Section başlığında activityName ve flight time birlikte gösterilecek */}
                                                        {/* Check if any booking in this group has Proposal Flight voucher type */}
                                                        {/* For Private Flight, show booking ID in the title */}
                                                        {(() => {
                                                            const hasProposal = groupFlights.some(f => {
                                                                const voucherType = (f.voucher_type || '').toLowerCase();
                                                                return voucherType.includes('proposal');
                                                            });
                                                            const isPrivateFlight = (first.flight_type || '').toLowerCase().includes('private') || 
                                                                                   (first.flight_type || '').toLowerCase().includes('charter');
                                                            const titleSuffix = hasProposal ? ' | Proposal' : '';
                                                            const bookingIdSuffix = isPrivateFlight && first.id ? ` | Booking ID: ${first.id}` : '';
                                                            return (
                                                                <Typography 
                                                                    variant="h6" 
                                                                    sx={{ 
                                                                        fontSize: isMobile ? '14px' : undefined,
                                                                        fontWeight: isMobile ? 600 : undefined,
                                                                        lineHeight: isMobile ? 1.3 : undefined,
                                                                        pr: isMobile ? 4 : 0
                                                                    }}
                                                                >
                                                                    {activityName}{titleSuffix}{bookingIdSuffix} - Flight Time: {displayFlightTime}
                                                                </Typography>
                                                            );
                                                        })()}
                                                    </>
                                                )}
                                                <Box className="manifest-flight-details" sx={{
                                                    display: 'flex',
                                                    flexDirection: isMobile ? 'row' : 'row',
                                                    alignItems: isMobile ? 'flex-start' : 'center',
                                                    gap: isMobile ? 0.5 : 3,
                                                    flexWrap: 'wrap',
                                                    mt: isMobile ? 0.25 : 1,
                                                    mb: isMobile ? 0.25 : 0
                                                }}>
                                                    {isMobile ? (
                                                        // Mobile: Compact tag-style layout
                                                        <>
                                                            <Box sx={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                backgroundColor: '#f5f5f5',
                                                                fontSize: '11px',
                                                                fontWeight: 500,
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                <Typography sx={{ fontSize: '11px', fontWeight: 500, margin: 0 }}>
                                                                    {paxBookedDisplay}/{paxTotalDisplay} Pax
                                                                </Typography>
                                                    </Box>
                                                            <Box sx={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                backgroundColor: '#f5f5f5',
                                                                fontSize: '11px',
                                                                fontWeight: 500,
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                <Typography sx={{ fontSize: '11px', fontWeight: 500, margin: 0 }}>
                                                                    {balloonResource}
                                                                </Typography>
                                                    </Box>
                                                            <Box sx={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                backgroundColor: status === 'Closed' ? '#fee' : '#efe',
                                                                fontSize: '11px',
                                                                fontWeight: 600,
                                                                whiteSpace: 'nowrap',
                                                                cursor: 'pointer',
                                                                border: `1px solid ${status === 'Closed' ? '#fcc' : '#cfc'}`
                                                            }} onClick={() => handleToggleGroupStatus(groupFlights)}>
                                                                <Typography sx={{ 
                                                                    fontSize: '11px', 
                                                                    fontWeight: 600, 
                                                                    margin: 0,
                                                                    color: status === 'Closed' ? '#c33' : '#3c3'
                                                                }}>
                                                                    {status}{statusLoadingGroup === first.id ? '...' : ''}
                                                                </Typography>
                                                            </Box>
                                                            <Box sx={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                backgroundColor: '#e3f2fd',
                                                                fontSize: '11px',
                                                                fontWeight: 500,
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                <Typography sx={{ fontSize: '11px', fontWeight: 500, margin: 0 }}>
                                                                    {first.flight_type}
                                                                </Typography>
                                                            </Box>
                                                        </>
                                                    ) : (
                                                        // Desktop: Original layout
                                                        <>
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <Typography>Pax Booked: {paxBookedDisplay} / {paxTotalDisplay}</Typography>
                                                            </Box>
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <Typography>Balloon Resource: {balloonResource}</Typography>
                                                            </Box>
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography>Status: <span
   style={{ color: status === 'Closed' ? 'red' : 'green', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
   onClick={() => handleToggleGroupStatus(groupFlights)}
 >{status}{statusLoadingGroup === first.id ? '...' : ''}</span></Typography>
                                                    </Box>
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography>Type: {first.flight_type}</Typography>
                                                            </Box>
                                                        </>
                                                        )}
                                                </Box>
                                            </Box>
                                            {/* Mobile: Crew and Pilot selection - Compact tag-style layout */}
                                            {isMobile && (
                                                <Box sx={{ 
                                                    mb: 0.25, 
                                                    mt: 0.25,
                                                    display: 'flex', 
                                                    gap: 0.5, 
                                                    alignItems: 'center',
                                                    flexWrap: 'wrap'
                                                }} className="manifest-crew-pilot-mobile">
                                                    {/* Crew Selection - Compact */}
                                                    {(() => {
                                                        const activityIdForSlot = getFlightActivityId(first);
                                                        const slotKeyValue = slotKey(activityIdForSlot, (first.flight_date||'').substring(0,10), (first.flight_date||'').substring(11,16));
                                                        const currentCrewId = crewAssignmentsBySlot[slotKeyValue];
                                                        const isActivityIdValid = activityIdForSlot !== null && activityIdForSlot !== undefined && !isNaN(activityIdForSlot);
                                                        const selectedCrew = crewList.find(c => c.id == currentCrewId);
                                                        const crewDisplayName = selectedCrew ? `${selectedCrew.first_name} ${selectedCrew.last_name}` : 'Crew';
                                                        
                                                        return (
                                                            <Select
                                                                native
                                                                value={currentCrewId || ''}
                                                                onChange={(e) => handleCrewChange(activityIdForSlot, first.flight_date, e.target.value)}
                                                                disabled={!isActivityIdValid}
                                                                sx={{ 
                                                                    flex: '1 1 auto',
                                                                    minWidth: 'calc(50% - 4px)',
                                                                    maxWidth: 'calc(50% - 4px)',
                                                                    fontSize: '11px',
                                                                    height: '28px',
                                                                    background: isActivityIdValid ? '#fff' : '#f3f4f6',
                                                                    opacity: isActivityIdValid ? 1 : 0.6,
                                                                    border: '1px solid #ddd',
                                                                    borderRadius: '4px',
                                                                    '& select': {
                                                                        padding: '4px 6px',
                                                                        fontSize: '11px',
                                                                        height: '28px'
                                                                    },
                                                                    '& .MuiSelect-icon': {
                                                                        fontSize: '16px'
                                                                    }
                                                                }}
                                                            >
                                                                <option value="">Crew</option>
                                                                {crewList.map(c => (
                                                                    <option key={c.id} value={c.id}>{`${c.first_name} ${c.last_name}`}</option>
                                                                ))}
                                                            </Select>
                                                        );
                                                    })()}
                                                    
                                                    {/* Pilot Selection - Compact */}
                                                    {(() => {
                                                        const activityIdForSlot = getFlightActivityId(first);
                                                        const slotKeyValue = slotKey(activityIdForSlot, (first.flight_date||'').substring(0,10), (first.flight_date||'').substring(11,16));
                                                        const currentPilotId = pilotAssignmentsBySlot[slotKeyValue];
                                                        const isActivityIdValid = activityIdForSlot !== null && activityIdForSlot !== undefined && !isNaN(activityIdForSlot);
                                                        const selectedPilot = pilotList.find(p => p.id == currentPilotId);
                                                        const pilotDisplayName = selectedPilot ? `${selectedPilot.first_name} ${selectedPilot.last_name}` : 'Pilot';
                                                        
                                                        return (
                                                            <Select
                                                                native
                                                                value={currentPilotId || ''}
                                                                onChange={(e) => handlePilotChange(activityIdForSlot, first.flight_date, e.target.value)}
                                                                disabled={!isActivityIdValid}
                                                                sx={{ 
                                                                    flex: '1 1 auto',
                                                                    minWidth: 'calc(50% - 4px)',
                                                                    maxWidth: 'calc(50% - 4px)',
                                                                    fontSize: '11px',
                                                                    height: '28px',
                                                                    background: isActivityIdValid ? '#fff' : '#f3f4f6',
                                                                    opacity: isActivityIdValid ? 1 : 0.6,
                                                                    border: '1px solid #ddd',
                                                                    borderRadius: '4px',
                                                                    '& select': {
                                                                        padding: '4px 6px',
                                                                        fontSize: '11px',
                                                                        height: '28px'
                                                                    },
                                                                    '& .MuiSelect-icon': {
                                                                        fontSize: '16px'
                                                                    }
                                                                }}
                                                            >
                                                                <option value="">Pilot</option>
                                                                {pilotList.map(p => (
                                                                    <option key={p.id} value={p.id}>{`${p.first_name} ${p.last_name}`}</option>
                                                                ))}
                                                            </Select>
                                                        );
                                                    })()}
                                                </Box>
                                            )}
                                            
                                            <Box display="flex" alignItems="center" gap={isMobile ? 0.5 : 1} className="manifest-flight-actions" sx={{
                                                flexDirection: isMobile ? 'row' : 'row',
                                                flexWrap: isMobile ? 'wrap' : 'nowrap',
                                                mt: isMobile ? 0.25 : undefined,
                                                mb: isMobile ? 0.25 : undefined
                                            }}>
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
                                                
                                                {/* Desktop: Crew Selection Dropdown */}
                                                {!isMobile && (() => {
                            const activityIdForSlot = getFlightActivityId(first);
                            const slotKeyValue = slotKey(activityIdForSlot, (first.flight_date||'').substring(0,10), (first.flight_date||'').substring(11,16));
                            const currentCrewId = crewAssignmentsBySlot[slotKeyValue];
                            
                            // Debug logging
                            if (process.env.NODE_ENV === 'development') {
                                console.log('Dropdown for flight:', first.id, 'slotKey:', slotKeyValue, 'currentCrewId:', currentCrewId, 'all assignments:', crewAssignmentsBySlot);
                                console.log('Flight data:', { 
                                    id: first.id, 
                                    activity_id: activityIdForSlot, 
                                    flight_date: first.flight_date,
                                    date_part: (first.flight_date||'').substring(0,10),
                                                            time_part: (first.flight_date||'').substring(11,16),
                                                            fullFlight: first
                                                        });
                                                    }
                                                    
                                                    // Check if activityId is valid
                                                    const isActivityIdValid = activityIdForSlot !== null && activityIdForSlot !== undefined && !isNaN(activityIdForSlot);
                                                    
                                                    if (!isActivityIdValid) {
                                                        console.error('Invalid activityId for flight:', { 
                                                            flightId: first.id, 
                                                            activityId: activityIdForSlot,
                                                            flight: first 
                                });
                            }
                            
                            return (
                                <>
                                    <Select
                                        native
                                        value={currentCrewId || ''}
                                        onChange={(e) => handleCrewChange(activityIdForSlot, first.flight_date, e.target.value)}
                                                                disabled={!isActivityIdValid}
                                                                sx={{ 
                                                                    minWidth: 200, 
                                                                    mr: 1, 
                                                                    background: isActivityIdValid ? '#fff' : '#f3f4f6',
                                                                    opacity: isActivityIdValid ? 1 : 0.6
                                                                }}
                                    >
                                                                <option value="">{isActivityIdValid ? 'Crew Selection' : 'Activity ID Missing'}</option>
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
                                </>
                            );
                        })()}
                                                
                                                {/* Desktop: Pilot Selection Dropdown */}
                                                {!isMobile && (() => {
                            const activityIdForSlot = getFlightActivityId(first);
                            const slotKeyValue = slotKey(activityIdForSlot, (first.flight_date||'').substring(0,10), (first.flight_date||'').substring(11,16));
                            const currentPilotId = pilotAssignmentsBySlot[slotKeyValue];
                                                    
                                                    // Check if activityId is valid
                                                    const isActivityIdValid = activityIdForSlot !== null && activityIdForSlot !== undefined && !isNaN(activityIdForSlot);
                                                    
                                                    if (!isActivityIdValid) {
                                                        console.error('Invalid activityId for pilot flight:', { 
                                                            flightId: first.id, 
                                                            activityId: activityIdForSlot,
                                                            flight: first 
                                                        });
                                                    }
                            
                            return (
                                <>
                                    <Select
                                        native
                                        value={currentPilotId || ''}
                                        onChange={(e) => handlePilotChange(activityIdForSlot, first.flight_date, e.target.value)}
                                                                disabled={!isActivityIdValid}
                                                                sx={{ 
                                                                    minWidth: 200, 
                                                                    mr: 1, 
                                                                    background: isActivityIdValid ? '#fff' : '#f3f4f6',
                                                                    opacity: isActivityIdValid ? 1 : 0.6
                                                                }}
                                    >
                                                                <option value="">{isActivityIdValid ? 'Pilot Selection' : 'Activity ID Missing'}</option>
                                        {pilotList.map(p => (
                                            <option key={p.id} value={p.id}>{`${p.first_name} ${p.last_name}`}</option>
                                        ))}
                                    </Select>
                                    
                                    {/* Pilot Assignment Status Display */}
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
                                            color: currentPilotId ? '#10b981' : '#6b7280',
                                            mb: 0.5
                                        }}>
                                            {currentPilotId ? '✓ Assigned' : '○ Not Assigned'}
                                        </Box>
                                        <Box sx={{ 
                                            fontSize: '11px', 
                                            color: '#6b7280',
                                            fontStyle: currentPilotId ? 'normal' : 'italic'
                                        }}>
                                            {currentPilotId ? getPilotName(currentPilotId) : 'No pilot selected'}
                                        </Box>
                                    </Box>
                                </>
                            );
                        })()}
                                                
                                                {/* Book Button - Hidden on mobile */}
                                                {!isMobile && (
                                                <Button variant="contained" color="primary" sx={{ minWidth: 90, fontWeight: 600, textTransform: 'none' }} onClick={() => handleOpenBookingModal(first)}>Book</Button>
                                                )}
                                                {/* Three dots menu - Desktop only (mobile is in header) */}
                                                {!isMobile && (
                                                <IconButton size="large" onClick={e => handleGlobalMenuOpen(e, first, groupFlights)}>
                                                    <MoreVertIcon />
                                                </IconButton>
                                                )}
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
                                            </Menu>
                                        </Box>
                                        <Divider sx={{ marginY: isMobile ? 0.5 : 2 }} />
                                        <TableContainer component={Paper} sx={{ marginTop: isMobile ? 0.5 : 2 }} className="manifest-table-container">
                                            <Table className="manifest-table">
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
                                                        const hasWeatherRefund = (() => {
                                                            const bookingLevelRaw = flight.weather_refund_total_price ?? flight.weather_refund_price ?? flight.weather_refund ?? null;
                                                            if (bookingLevelRaw !== null && bookingLevelRaw !== undefined) {
                                                                const parsed = parseFloat(bookingLevelRaw);
                                                                if (!isNaN(parsed) && parsed > 0) {
                                                                    return true;
                                                                }
                                                            }
                                                            if (Array.isArray(flight.passengers)) {
                                                                return flight.passengers.some(p => {
                                                                    const value = p.weather_refund ?? p.weatherRefund;
                                                                    if (value === null || value === undefined) return false;
                                                                    if (typeof value === 'string') {
                                                                        const normalized = value.trim().toLowerCase();
                                                                        return normalized === '1' || normalized === 'true' || normalized === 'yes';
                                                                    }
                                                                    return Boolean(value);
                                                                });
                                                            }
                                                            return false;
                                                        })();
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
                                                                <TableCell>{hasWeatherRefund ? 'Yes' : 'No'}</TableCell>
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
                                                        {isMobile ? (
                                                            <>
                                                                <TableCell 
                                                                    sx={{ 
                                                                        textAlign: 'left', 
                                                                        fontWeight: 600, 
                                                                        background: '#f5f5f5',
                                                                        fontSize: '5px',
                                                                        padding: '8px 4px',
                                                                        whiteSpace: 'nowrap',
                                                                        verticalAlign: 'middle',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        lineHeight: '1',
                                                                        wordBreak: 'keep-all',
                                                                        minWidth: '250px',
                                                                        maxWidth: '100%'
                                                                    }}
                                                                >
                                                                    Total Price: £{groupFlights.reduce((sum, f) => sum + (parseFloat(f.paid) || 0), 0).toFixed(2)} | Total Weight: {totalWeightDisplay}kg | Total Pax: {passengerCountDisplay}
                                                                </TableCell>
                                                                {/* Empty cells for remaining columns on mobile */}
                                                                <TableCell sx={{ background: '#f5f5f5', padding: '10px 6px' }}></TableCell>
                                                                <TableCell sx={{ background: '#f5f5f5', padding: '10px 6px' }}></TableCell>
                                                                <TableCell sx={{ background: '#f5f5f5', padding: '10px 6px' }}></TableCell>
                                                                <TableCell sx={{ background: '#f5f5f5', padding: '10px 6px' }}></TableCell>
                                                                <TableCell sx={{ background: '#f5f5f5', padding: '10px 6px' }}></TableCell>
                                                                <TableCell sx={{ background: '#f5f5f5', padding: '10px 6px' }}></TableCell>
                                                                <TableCell sx={{ background: '#f5f5f5', padding: '10px 6px' }}></TableCell>
                                                                <TableCell sx={{ background: '#f5f5f5', padding: '10px 6px' }}></TableCell>
                                                                <TableCell sx={{ background: '#f5f5f5', padding: '10px 6px' }}></TableCell>
                                                            </>
                                                        ) : (
                                                            <TableCell 
                                                                colSpan={11} 
                                                                sx={{ 
                                                                    textAlign: 'right', 
                                                                    fontWeight: 600, 
                                                                    background: '#f5f5f5',
                                                                    fontSize: 'inherit',
                                                                    padding: '10px',
                                                                    whiteSpace: 'normal'
                                                                }}
                                                            >
                                                                                                            Total Price: £{groupFlights.reduce((sum, f) => sum + (parseFloat(f.paid) || 0), 0)} &nbsp;&nbsp;|
                                                Total Weight: {totalWeightDisplay} kg &nbsp;&nbsp;|
                                                Total Pax: {passengerCountDisplay}
                                                        </TableCell>
                                                        )}
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
                                                <IconButton size="small" onClick={() => {
                                                    const passenger1 = bookingDetail.passengers && bookingDetail.passengers.length > 0 
                                                        ? bookingDetail.passengers[0] 
                                                        : null;
                                                    const passenger1Name = passenger1 
                                                        ? `${passenger1.first_name || ''} ${passenger1.last_name || ''}`.trim() 
                                                        : '';
                                                    handleEditClick('name', passenger1Name || bookingDetail.booking.name || '');
                                                }}><EditIcon fontSize="small" /></IconButton>
                                            </>
                                        )}</Typography>
                                        <Typography><b>Booking ID:</b> {bookingDetail.booking.id || '-'}</Typography>
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
                                        <Typography><b>Flight Attempts:</b> {bookingDetail.booking.flight_attempts ?? 0}</Typography>
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
    {bookingDetail.booking.expires ? (
      (() => {
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
        
        // Calculate expires date based on flight_attempts (add 6 months if multiple of 3)
        const flightAttempts = bookingDetail.booking.flight_attempts ?? 0;
        return calculateExpiresDate(bookingDetail.booking.expires, flightAttempts);
      })()
    ) : '-'}
    <IconButton size="small" onClick={() => handleEditClick('expires', bookingDetail.booking.expires)}><EditIcon fontSize="small" /></IconButton>
  </>
)}</Typography>
                                        <Typography><b>Paid:</b> {editField === 'paid' ? (
  <>
    <input value={editValue} onChange={e => setEditValue(e.target.value.replace(/[^0-9.]/g, ''))} style={{marginRight: 8}} />
    <Button size="small" onClick={async () => {
      // Split total (paid + due) equally among passengers
      const paid = parseFloat(editValue) || 0;
      const due = parseFloat(bookingDetail.booking.due) || 0;
      const totalAmount = paid + due;
      const n = bookingDetail.passengers.length;
      const perPassenger = n > 0 ? parseFloat((totalAmount / n).toFixed(2)) : 0;
      
      console.log('=== UPDATING PASSENGER PRICES (MANIFEST) ===');
      console.log('New Paid:', paid);
      console.log('Current Due:', due);
      console.log('Total Amount:', totalAmount);
      console.log('Passengers:', n);
      console.log('Per Passenger:', perPassenger);
      
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
                                        <Typography><b>Due:</b> {editField === 'due' ? (
  <>
    <input value={editValue} onChange={e => setEditValue(e.target.value.replace(/[^0-9.]/g, ''))} style={{marginRight: 8}} />
    <Button size="small" onClick={async () => {
      // When due changes, recalculate passenger prices with new total
      const newDue = parseFloat(editValue) || 0;
      const paid = parseFloat(bookingDetail.booking.paid) || 0;
      const totalAmount = paid + newDue;
      const n = bookingDetail.passengers.length;
      const perPassenger = n > 0 ? parseFloat((totalAmount / n).toFixed(2)) : 0;
      
      console.log('=== UPDATING DUE AND PASSENGER PRICES ===');
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
      setEditPassengerPrices(bookingDetail.passengers.map(() => perPassenger));
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
    <IconButton size="small" onClick={() => handleEditClick('due', bookingDetail.booking.due)}><EditIcon fontSize="small" /></IconButton>
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
                                                console.log('WX Refundable Check (Manifest):', {
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
                                </Grid>
                                {/* Main Details */}
                                <Grid item xs={12} md={8}>
                                    <Box sx={{ background: '#fff', borderRadius: 2, p: 2, boxShadow: 1 }}>
                                        {/* Current Booking */}
                                        <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                            <Box>
                                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Current Booking</Typography>
                                                <Typography><b>Activity:</b> {bookingDetail.booking.experience || bookingDetail.booking.flight_type || '-'} - {bookingDetail.booking.location}</Typography>
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
                                                {(() => {
                                                    const b = bookingDetail.booking || {};
                                                    const v = bookingDetail.voucher || {};
                                                    const redeemed = (b.redeemed === true) || (b.voucher_redeemed === 1) || (typeof b.redeemed_at === 'string' && b.redeemed_at) || (v.redeemed === 'Yes' || v.redeemed === true) || (b.redeemed_voucher === 'Yes');
                                                    return (
                                                        <Typography>
                                                            <b>Redeemed Voucher:</b> {redeemed ? <span style={{ color: 'green', fontWeight: 600 }}>Yes</span> : <span style={{ color: 'red', fontWeight: 600 }}>No</span>} <span style={{ fontWeight: 500 }}>{b.voucher_code || ''}</span>
                                                        </Typography>
                                                    );
                                                })()}
                                                {manifestAssignedResource && (
                                                    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, border: '1px solid #e0e7ff', background: '#f7f9ff' }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1d4ed8', mb: 0.5 }}>
                                                            Assigned Resources
                                                        </Typography>
                                                        <Typography sx={{ fontWeight: 600 }}>
                                                            {manifestAssignedResource.resourceName}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {manifestAssignedResource.assignmentType}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 140 }}>
                                                <Button variant="contained" color="primary" sx={{ mb: 1, borderRadius: 2, fontWeight: 600, textTransform: 'none' }} onClick={handleRebook}>Rebook</Button>
                                                <Button variant="contained" color="primary" sx={{ mb: 1, borderRadius: 2, fontWeight: 600, textTransform: 'none' }} onClick={handleAddGuestClick}>Add Guest</Button>
                                                <Button variant="contained" color="info" sx={{ mb: 1, borderRadius: 2, fontWeight: 600, textTransform: 'none', background: '#6c757d' }} onClick={handleCancelFlight}>Cancel Flight</Button>
                                                <Button variant="contained" color="success" sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', background: '#28a745' }} onClick={handleEmailBooking}>Email</Button>
                                                <Button variant="contained" color="info" sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', background: '#17a2b8' }} onClick={handleSmsBooking}>SMS</Button>
                                                <Button
                                                    variant="contained"
                                                    color="secondary"
                                                    sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', background: '#17a2b8' }}
                                                    onClick={() => bookingDetail?.booking && handleMessagesClick(bookingDetail.booking)}
                                                    disabled={!bookingDetail?.booking}
                                                >
                                                    Messages
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    color="info"
                                                    sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', background: '#6c757d', mt: 1 }}
                                                    onClick={() => {
                                                        if (bookingDetail?.booking?.id) {
                                                            // Clear payment history before opening modal to avoid showing stale data
                                                            setPaymentHistory([]);
                                                            setPaymentHistoryModalOpen(true);
                                                            fetchPaymentHistory(bookingDetail.booking.id);
                                                        }
                                                    }}
                                                    disabled={!bookingDetail?.booking}
                                                >
                                                    Payment History
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    color="info"
                                                    sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', background: '#6c757d', mt: 1 }}
                                                    onClick={() => {
                                                        if (bookingDetail?.booking?.id) {
                                                            setUserSessionModalOpen(true);
                                                            fetchUserSession(bookingDetail.booking.id);
                                                        }
                                                    }}
                                                    disabled={!bookingDetail?.booking}
                                                >
                                                    More
                                                </Button>
                                            </Box>
                                        </Box>
                                        <Divider sx={{ my: 2 }} />
                                        {/* Passenger Details */}
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Passenger Details</Typography>
                                            {bookingDetail.passengers && bookingDetail.passengers.length > 0 ? (
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
                                                                            <Button size="small" onClick={() => handleSavePassengerEdit(p)} disabled={savingPassengerEdit}>Save</Button>
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
                                                                                
                                                                                // For Shared Flight: Calculate price as originalAmount/pax (only for original booking passengers) + add_on (only first) + weather_refundable
                                                                                // For add-guest passengers: use stored price (calculated as originalAmount / currentPax when added) + weather_refundable
                                                                                const originalAmount = parseFloat(bookingDetail.booking?.original_amount) || 0;
                                                                                const addOnTotalPrice = parseFloat(bookingDetail.booking?.add_to_booking_items_total_price) || 0;
                                                                                const WEATHER_REFUND_PRICE = 47.5;
                                                                                const hasWeatherRefund = p.weather_refund === 1 || p.weather_refund === '1' || p.weather_refund === true;
                                                                                const weatherRefundPrice = hasWeatherRefund ? WEATHER_REFUND_PRICE : 0;
                                                                                
                                                                                let basePricePerPassenger = 0;
                                                                                let addOnPrice = 0;
                                                                                
                                                                                if (isOriginalPassenger && originalPaxCount > 0) {
                                                                                    // Original booking passengers (from ballooning-book): use originalAmount/pax
                                                                                    basePricePerPassenger = originalAmount / originalPaxCount;
                                                                                    // Add-on price (only for first passenger)
                                                                                    const isFirstPassenger = i === 0;
                                                                                    addOnPrice = isFirstPassenger ? addOnTotalPrice : 0;
                                                                                } else {
                                                                                    // Add-guest passengers: use stored price (calculated as originalAmount / currentPax when added, where currentPax is the passenger count BEFORE adding the new guest)
                                                                                    basePricePerPassenger = parseFloat(p.price) || 0;
                                                                                    addOnPrice = 0; // Add-on is only for first original passenger
                                                                                }
                                                                                
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
                                                            );
                                                        });
                                                    })()}
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
                                                        {(() => {
                                                            const notesFromBooking = bookingDetail.booking?.additional_notes;
                                                            const notesFromAdditional = additionalInformation?.additional_information_json?.notes;
                                                            const notesFromLegacy = additionalInformation?.legacy?.additional_notes;
                                                            const notesFromVoucherRecord = bookingDetail?.voucher?.additional_notes;
                                                            let notesFromVoucherJson = null;
                                                            if (bookingDetail?.voucher?.additional_information_json) {
                                                                try {
                                                                    const voucherJson = typeof bookingDetail.voucher.additional_information_json === 'string'
                                                                        ? JSON.parse(bookingDetail.voucher.additional_information_json)
                                                                        : bookingDetail.voucher.additional_information_json;
                                                                    notesFromVoucherJson = voucherJson?.notes || null;
                                                                } catch (e) {
                                                                    console.warn('Failed to parse voucher additional_information_json while extracting notes (manifest):', e);
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
                                                                <TableCell>{bookingDetail.booking.flight_type || '-'}</TableCell>
                                                                <TableCell>{bookingDetail.booking.location || '-'}</TableCell>
                                                                <TableCell>{getStatusWithEmoji(h.status || 'Scheduled')}</TableCell>
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
                            {guestType && guestType.toLowerCase().includes('shared') && (
                                <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f9ff', borderRadius: 2, border: '1px solid #dbeafe' }}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={Boolean(g.weatherRefund)}
                                                onChange={(_, checked) => handleGuestFormChange(idx, 'weatherRefund', checked)}
                                                color="primary"
                                            />
                                        }
                                        label={`Weather Refundable (+£47.50)`}
                                        sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', margin: 0 }}
                                    />
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Provides weather protection for this guest. Charged per passenger.
                                    </Typography>
                                </Box>
                            )}
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
            {/* Messages Modal */}
            <Dialog 
                open={messagesModalOpen}
                onClose={() => setMessagesModalOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 700, fontSize: 24 }}>
                    Messages
                    {selectedBookingForEmail && (
                        <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 0.5 }}>
                            Booking: {selectedBookingForEmail.name} ({selectedBookingForEmail.id})
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent dividers sx={{ background: '#f5f7fb' }}>
                    {messagesLoading ? (
                        <Typography variant="body2">Loading messages...</Typography>
                    ) : messageLogs.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            No messages have been sent for this booking yet.
                        </Typography>
                    ) : (
                        messageLogs
                            .sort((a, b) => dayjs(b.sent_at).valueOf() - dayjs(a.sent_at).valueOf())
                            .map((log, index) => {
                                const statusInfo = getStatusDisplay(log.last_event || log.status);
                                const expanded = !!expandedMessageIds[log.id || index];
                                const preview = getMessagePreview(log);
                                const fullHtml = buildLogHtml(log);
                                const collapsedPreviewHtml =
                                    buildCollapsedPreviewHtml(log) ||
                                    '<span style="color:#94a3b8;">Expand to view full message.</span>';
                                const expandedPreviewHtml =
                                    fullHtml || collapsedPreviewHtml;
                                return (
                                    <Box
                                        key={log.id || index}
                                        sx={{
                                            mb: 3,
                                            borderRadius: 3,
                                            background: '#ffffff',
                                            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                                            overflow: 'hidden',
                                            border: '1px solid #e2e8f0'
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                p: 3,
                                                borderBottom: '1px solid #f1f5f9'
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', gap: 2 }}>
                                                <Box
                                                    sx={{
                                                        width: 42,
                                                        height: 42,
                                                        borderRadius: '50%',
                                                        background: '#eef2ff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#4f46e5'
                                                    }}
                                                >
                                                    <MailOutlineIcon />
                                                </Box>
                                                <Box>
                                                    <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 0.5 }}>
                                                        {log.subject || 'Email'}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {log.sent_at
                                                            ? dayjs(log.sent_at).format('dddd, MMMM D, YYYY h:mm A')
                                                            : 'Unknown send date'}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        To: {log.recipient_email || '—'}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Box
                                                    sx={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        px: 1.5,
                                                        py: 0.5,
                                                        borderRadius: 999,
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        color: '#fff',
                                                        backgroundColor: statusInfo.color
                                                    }}
                                                >
                                                    {statusInfo.label}
                                                </Box>
                                                <Typography variant="caption" display="block" sx={{ mt: 1, color: '#64748b' }}>
                                                    Category: {log.template_type || 'Custom'}
                                                </Typography>
                                                <Typography variant="caption" display="block" sx={{ color: '#64748b' }}>
                                                    Opens: {log.opens || 0} · Clicks: {log.clicks || 0}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ p: 3 }}>
                                            {expanded ? (
                                                <Box
                                                    sx={{
                                                        background: '#f8fafc',
                                                        borderRadius: 2,
                                                        p: 2,
                                                        maxHeight: 400,
                                                        overflowY: 'auto'
                                                    }}
                                                    dangerouslySetInnerHTML={{ __html: expandedPreviewHtml }}
                                                />
                                            ) : (
                                                <Box
                                                    sx={{ color: '#475569', lineHeight: 1.6 }}
                                                    dangerouslySetInnerHTML={{ __html: collapsedPreviewHtml }}
                                                />
                                            )}
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                                <Button
                                                    size="small"
                                                    onClick={() => toggleMessageExpand(log.id || index)}
                                                    sx={{ textTransform: 'none' }}
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
                <DialogActions>
                    <Button onClick={() => setMessagesModalOpen(false)}>Close</Button>
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
                    fontSize: 24,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pb: 2
                }}>
                    <Box component="span" sx={{ fontWeight: 700, fontSize: '1.5rem' }}>
                        Payments / Promos
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button 
                            variant="outlined" 
                            size="small"
                            sx={{ textTransform: 'none', borderRadius: 1 }}
                        >
                            + Payment
                        </Button>
                        <Button 
                            variant="outlined" 
                            size="small"
                            sx={{ textTransform: 'none', borderRadius: 1 }}
                        >
                            + Promo
                        </Button>
                        <Button 
                            variant="outlined" 
                            size="small"
                            startIcon={<span>🕐</span>}
                            sx={{ textTransform: 'none', borderRadius: 1 }}
                        >
                            Save Card & Charge Later
                        </Button>
                    </Box>
                </DialogTitle>
                <DialogContent dividers sx={{ background: '#ffffff', p: 0 }}>
                    {paymentHistoryLoading ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="body2">Loading payment history...</Typography>
                        </Box>
                    ) : paymentHistory.length === 0 ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                No payment history available for this booking.
                            </Typography>
                        </Box>
                    ) : (
                        <Box>
                            {/* Table Header */}
                            <Box sx={{ 
                                display: 'flex', 
                                px: 3, 
                                py: 1.5, 
                                borderBottom: '1px solid #e2e8f0',
                                background: '#f8f9fa'
                            }}>
                                <Box sx={{ flex: '0 0 200px', color: '#6c757d', fontSize: '0.875rem', fontWeight: 500 }}>
                                    DATE
                                </Box>
                                <Box sx={{ flex: 1, textAlign: 'center', color: '#6c757d', fontSize: '0.875rem', fontWeight: 500 }}>
                                    DETAILS
                                </Box>
                                <Box sx={{ flex: '0 0 150px', textAlign: 'right', color: '#6c757d', fontSize: '0.875rem', fontWeight: 500 }}>
                                    AMOUNT
                                </Box>
                                <Box sx={{ flex: '0 0 100px' }}></Box>
                            </Box>
                            
                            {/* Payment Entries */}
                            {paymentHistory.map((payment, index) => {
                                const isExpanded = expandedPaymentIds[payment.id || index];
                                const paymentDate = payment.created_at ? dayjs(payment.created_at) : null;
                                const daysAgo = paymentDate ? dayjs().diff(paymentDate, 'day') : null;
                                
                                return (
                                    <Box key={payment.id || index} sx={{ borderBottom: '1px solid #e2e8f0' }}>
                                        {/* Main Payment Row */}
                                        <Box sx={{ 
                                            display: 'flex', 
                                            px: 3, 
                                            py: 2,
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            '&:hover': { background: '#f8f9fa' }
                                        }}
                                        onClick={() => togglePaymentExpand(payment.id || index)}
                                        >
                                            <Box sx={{ flex: '0 0 200px' }}>
                                                {paymentDate && (
                                                    <>
                                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                            {paymentDate.format('MMM D, YYYY')}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {paymentDate.format('h:mm A')}
                                                        </Typography>
                                                        {daysAgo !== null && (
                                                            <Typography variant="caption" color="text.secondary" display="block">
                                                                {daysAgo} {daysAgo === 1 ? 'day' : 'days'} ago
                                                            </Typography>
                                                        )}
                                                    </>
                                                )}
                                            </Box>
                                            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                                                {payment.payment_status === 'refunded' || payment.origin === 'refund' ? (
                                                    <Typography variant="body2" sx={{ 
                                                        fontWeight: 600,
                                                        textTransform: 'uppercase',
                                                        fontSize: '0.75rem',
                                                        px: 1,
                                                        py: 0.5,
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
                                                    fontSize: '0.75rem',
                                                    px: 1,
                                                    py: 0.5,
                                                    borderRadius: 1,
                                                    background: '#f0f0f0'
                                                }}>
                                                    {getCardBrandLogo(payment.card_brand)}
                                                </Typography>
                                                <Typography variant="body2">
                                                    **** {payment.card_last4 || 'N/A'}
                                                </Typography>
                                                    </>
                                                )}
                                            </Box>
                                            <Box sx={{ flex: '0 0 150px', textAlign: 'right' }}>
                                                <Typography variant="body1" sx={{ 
                                                    fontWeight: 600,
                                                    color: (payment.payment_status === 'refunded' || payment.origin === 'refund') ? '#c33' : 'inherit'
                                                }}>
                                                    £{Math.abs(parseFloat(payment.amount || 0)).toFixed(2)}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ flex: '0 0 100px', textAlign: 'right' }}>
                                                <IconButton 
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        togglePaymentExpand(payment.id || index);
                                                    }}
                                                >
                                                    {isExpanded ? '▼' : '▶'}
                                                </IconButton>
                                                {payment.payment_status === 'succeeded' && (
                                                    <Button 
                                                        size="small" 
                                                        variant="outlined"
                                                        sx={{ ml: 1, textTransform: 'none' }}
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
                                        
                                        {/* Expanded Details */}
                                        {isExpanded && (
                                            <Box sx={{ 
                                                px: 3, 
                                                py: 2, 
                                                background: '#ffffff',
                                                borderTop: '1px solid #e2e8f0'
                                            }}>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Created
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            {paymentDate ? `${paymentDate.format('MMM D, YYYY h:mm A')} (${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago)` : 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {payment.payment_status === 'refunded' || payment.origin === 'refund' ? 'Refund Amount' : 'Guest Charge'}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ 
                                                            fontWeight: 600,
                                                            color: (payment.payment_status === 'refunded' || payment.origin === 'refund') ? '#c33' : 'inherit'
                                                        }}>
                                                            £{Math.abs(parseFloat(payment.amount || 0)).toFixed(2)}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Card Type
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            Credit Card **** {payment.card_last4 || 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Wallet Type
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            {payment.wallet_type || 'N/A'}
                                                            {payment.wallet_type === 'apple_pay' && ' 🍎'}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Fingerprint
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                                            {payment.fingerprint || 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Origin
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            {payment.origin || 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Transaction ID
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                                            {payment.transaction_id || payment.stripe_charge_id || 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Card Present
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            {payment.card_present ? 'Yes' : 'No'}
                                                        </Typography>
                                                    </Grid>
                                                    {(payment.payment_status === 'refunded' || payment.origin === 'refund') && payment.refund_comment && (
                                                        <Grid item xs={12}>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Refund Comment
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                {payment.refund_comment}
                                                            </Typography>
                                                        </Grid>
                                                    )}
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Status
                                                        </Typography>
                                                        <Box sx={{ 
                                                            display: 'inline-block',
                                                            px: 1,
                                                            py: 0.5,
                                                            borderRadius: 1,
                                                            background: payment.payment_status === 'succeeded' ? '#28a745' : '#6c757d',
                                                            color: '#fff',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600
                                                        }}>
                                                            {payment.payment_status === 'succeeded' ? 'Successful' : payment.payment_status || 'Pending'}
                                                        </Box>
                                                    </Grid>
                                                    {payment.payout_id && (
                                                        <Grid item xs={6}>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Payout
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                                                {payment.payout_id}
                                                            </Typography>
                                                        </Grid>
                                                    )}
                                                    {payment.arriving_on && (
                                                        <Grid item xs={6}>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Arriving on
                                                            </Typography>
                                                            <Typography variant="body2">
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
                <DialogActions>
                    <Button onClick={() => {
                        setPaymentHistoryModalOpen(false);
                        setExpandedPaymentIds({});
                    }}>Close</Button>
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

            {/* Group Message Modal */}
            <Dialog
                open={groupMessageModalOpen}
                onClose={closeGroupMessageModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 700, fontSize: 24 }}>
                    {groupActionMode === 'cancel' ? 'Cancel All Guests' : 'Send Message to Guests'}
                    {groupSelectedBookings.length > 0 && (
                        <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 0.5 }}>
                            {groupSelectedBookings.length} booking(s)
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent sx={{ mt: 1 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                                Recipients
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, background: '#f8fafc', borderRadius: 2, p: 2 }}>
                                {groupMessageForm.to.map((email) => (
                                    <Box
                                        key={email}
                                        sx={{
                                            px: 1.5,
                                            py: 0.75,
                                            background: '#eef2ff',
                                            color: '#4338ca',
                                            borderRadius: 999,
                                            fontSize: 12,
                                            fontWeight: 600
                                        }}
                                    >
                                        {email}
                                    </Box>
                                ))}
                            </Box>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                                Choose a template:
                            </Typography>
                            <FormControl fullWidth size="small">
                                <Select
                                    value={groupMessageForm.template}
                                    onChange={(e) => handleGroupTemplateChange(e.target.value)}
                                    displayEmpty
                                >
                                    {emailTemplates.map((template) => (
                                        <MenuItem key={template.id} value={template.id}>
                                            {template.name}
                                        </MenuItem>
                                    ))}
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
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                                Add an optional, personalized note
                            </Typography>
                            <TextField
                                fullWidth
                                placeholder="Nice to speak with you today!"
                                value={groupPersonalNote}
                                onChange={(e) => setGroupPersonalNote(e.target.value)}
                                multiline
                                rows={6}
                                variant="outlined"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Box sx={{
                                border: '1px solid #e0e0e0',
                                borderRadius: 2,
                                p: 3,
                                backgroundColor: '#f9f9f9',
                                position: 'relative'
                            }}>
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    mb: 2,
                                    pb: 2,
                                    borderBottom: '1px solid #e0e0e0'
                                }}>
                                    <Box sx={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        backgroundColor: '#ff5f57'
                                    }} />
                                    <Box sx={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        backgroundColor: '#ffbd2e'
                                    }} />
                                    <Box sx={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        backgroundColor: '#28ca42'
                                    }} />
                                </Box>

                                <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                                    From "Fly Away Ballooning" &lt;info@flyawayballooning.com&gt;
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#999', display: 'block', mb: 2 }}>
                                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                </Typography>

                                <Typography sx={{
                                    color: '#d32f2f',
                                    fontWeight: 600,
                                    mb: 2
                                }}>
                                    {groupMessageForm.subject || 'Flight update'}
                                </Typography>

                                <Box sx={{
                                    backgroundColor: '#fff',
                                    p: 2,
                                    borderRadius: 2,
                                    minHeight: 200,
                                    overflow: 'auto',
                                    maxHeight: '600px'
                                }}>
                                    <MemoizedEmailPreview html={groupPreviewHtml} />
                                </Box>
            </Box>
                        </Grid>
    </Grid>
</DialogContent>
                <DialogActions sx={{ p: 3, justifyContent: 'flex-end' }}>
                    <Button
                        onClick={handleSendGroupEmail}
                        variant="contained"
                        startIcon={<span>✈️</span>}
                        sx={{
                            backgroundColor: '#1976d2',
                            px: 4,
                            py: 1.5,
                            borderRadius: 2,
                            fontWeight: 600,
                            textTransform: 'none',
                            fontSize: 16,
                            '&:hover': {
                                backgroundColor: '#1565c0'
                            }
                        }}
                        disabled={groupMessageSending || groupMessageForm.to.length === 0 || !groupMessageForm.subject}
                    >
                        {groupMessageSending ? 'Sending...' : 'Send'}
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
                <DialogTitle sx={{ color: '#1976d2', fontWeight: 600, fontSize: 24 }}>
                    Send a Message
                    {selectedBookingForEmail && (
                        <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 0.5 }}>
                            Booking: {selectedBookingForEmail.name} ({selectedBookingForEmail.id})
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
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
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                                Add an optional, personalized note
                            </Typography>
                            <TextField
                                fullWidth
                                placeholder="Nice to speak with you today!"
                                value={personalNote}
                                onChange={(e) => setPersonalNote(e.target.value)}
                                multiline
                                rows={6}
                                variant="outlined"
                                sx={{ 
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2
                                    }
                                }}
                            />
                        </Grid>
                        {/* Email Template Preview */}
                        <Grid item xs={12}>
                            <Box sx={{ 
                                border: '1px solid #e0e0e0', 
                                borderRadius: 2, 
                                p: 2,
                                backgroundColor: '#f9f9f9',
                                position: 'relative',
                                overflow: 'auto',
                                maxHeight: '600px'
                            }}>
                                {/* Email Header */}
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1,
                                    mb: 2,
                                    pb: 2,
                                    borderBottom: '1px solid #e0e0e0'
                                }}>
                                    <Box sx={{ 
                                        width: 12, 
                                        height: 12, 
                                        borderRadius: '50%', 
                                        backgroundColor: '#ff5f57' 
                                    }} />
                                    <Box sx={{ 
                                        width: 12, 
                                        height: 12, 
                                        borderRadius: '50%', 
                                        backgroundColor: '#ffbd2e' 
                                    }} />
                                    <Box sx={{ 
                                        width: 12, 
                                        height: 12, 
                                        borderRadius: '50%', 
                                        backgroundColor: '#28ca42' 
                                    }} />
                                </Box>
                                
                                {/* Email From */}
                                <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                                    From "Fly Away Ballooning" &lt;info@flyawayballooning.com&gt;
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#999', display: 'block', mb: 2 }}>
                                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                </Typography>
                                
                                {/* Email Subject */}
                                <Typography sx={{ 
                                    color: '#d32f2f', 
                                    fontWeight: 600, 
                                    mb: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                }}>
                                    <span style={{ fontSize: 20 }}>🎈</span> {emailForm.subject || 'Flight update'}
                                </Typography>
                                
                                {/* Email Body Preview */}
                                <MemoizedEmailPreview html={previewHtml} />
                            </Box>
                        </Grid>
                        {/* Hidden fields for backend */}
                        <input type="hidden" value={emailForm.to} />
                        <input type="hidden" value={emailForm.subject} />
                        {/* Email Logs */}
                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                                Sent Emails
                            </Typography>
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
                <DialogActions sx={{ p: 3, justifyContent: 'flex-end' }}>
                    <Button 
                        onClick={handleSendEmail}
                        variant="contained"
                        startIcon={<span>✈️</span>}
                        sx={{ 
                            backgroundColor: '#1976d2',
                            px: 4,
                            py: 1.5,
                            borderRadius: 2,
                            fontWeight: 600,
                            textTransform: 'none',
                            fontSize: 16,
                            '&:hover': {
                                backgroundColor: '#1565c0'
                            }
                        }}
                        disabled={sendingEmail || !emailForm.to || !emailForm.subject}
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
                <DialogTitle sx={{ color: '#1976d2', fontWeight: 600, fontSize: 24 }}>
                    Send a SMS
                    {selectedBookingForEmail && (
                        <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 0.5 }}>
                            Booking: {selectedBookingForEmail.name} ({selectedBookingForEmail.id})
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                                Choose a template:
                            </Typography>
                            <FormControl fullWidth size="small">
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
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                                Message
                            </Typography>
                            <TextField
                                fullWidth
                                placeholder="Enter your SMS message here..."
                                value={smsForm.message || ''}
                                onChange={(e) => setSmsForm(prev => ({ ...prev, message: e.target.value }))}
                                multiline
                                rows={6}
                                variant="outlined"
                                sx={{ 
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                                Add an optional, personalized note
                            </Typography>
                            <TextField
                                fullWidth
                                placeholder="Nice to speak with you today!"
                                value={smsPersonalNote}
                                onChange={(e) => setSmsPersonalNote(e.target.value)}
                                multiline
                                rows={4}
                                variant="outlined"
                                sx={{ 
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2
                                    }
                                }}
                            />
                        </Grid>
                        {/* SMS Preview - Mobile Device */}
                        <Grid item xs={12}>
                            <Box sx={{ 
                                border: '1px solid #e0e0e0', 
                                borderRadius: 2, 
                                p: 2,
                                backgroundColor: '#f9f9f9',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'flex-start'
                            }}>
                                {/* Mobile Device Preview */}
                                <Box sx={{ 
                                    width: '320px',
                                    maxWidth: '100%',
                                    background: '#000',
                                    borderRadius: '24px',
                                    padding: '12px',
                                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
                                }}>
                                    {/* Phone Screen */}
                                    <Box sx={{
                                        background: '#f5f5f5',
                                        borderRadius: '20px',
                                        padding: '8px',
                                        minHeight: '400px'
                                    }}>
                                        {/* Status Bar */}
                                        <Box sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '8px 12px',
                                            fontSize: '10px',
                                            color: '#000',
                                            background: '#fff',
                                            borderRadius: '12px 12px 0 0'
                                        }}>
                                            <span>9:41</span>
                                            <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '12px' }}>🔗</span>
                                                <span style={{ fontSize: '12px' }}>⌨️</span>
                                            </Box>
                                        </Box>

                                        {/* Message Preview */}
                                        <Box sx={{
                                            padding: '16px',
                                            background: '#fff',
                                            borderRadius: '0 0 12px 12px',
                                            minHeight: '300px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'flex-start'
                                        }}>
                                            {/* Message Bubble */}
                                            <Box sx={{
                                                background: '#e5e7eb',
                                                borderRadius: '16px',
                                                padding: '12px 16px',
                                                marginBottom: '8px',
                                                maxWidth: '85%',
                                                alignSelf: 'flex-start',
                                                wordWrap: 'break-word',
                                                fontSize: '14px',
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
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                                Sent SMS
                            </Typography>
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
                <DialogActions sx={{ p: 3, justifyContent: 'flex-end' }}>
                    <Button 
                        onClick={handleSendSms}
                        variant="contained"
                        startIcon={<span>📱</span>}
                        sx={{ 
                            backgroundColor: '#17a2b8',
                            px: 4,
                            py: 1.5,
                            borderRadius: 2,
                            fontWeight: 600,
                            textTransform: 'none',
                            fontSize: 16,
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
        </div>
    );
};

export default Manifest;