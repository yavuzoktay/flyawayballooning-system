import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
    Checkbox,
    FormGroup,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    InputAdornment,
    useTheme,
    useMediaQuery,
    Collapse,
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
import { DatePicker, TimePicker, TimeField, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import RebookAvailabilityModal from '../components/BookingPage/RebookAvailabilityModal';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import {
    appendCustomerPortalLinkToEmailHtml,
    appendCustomerPortalLinkToSmsMessage,
    getDefaultEmailTemplateContent,
    getDefaultTemplateMessageHtml,
    replaceSmsPrompts,
    extractMessageFromTemplateBody,
    buildEmailHtml
} from '../utils/emailTemplateUtils';
import { getAssignedResourceInfo } from '../utils/resourceAssignment';
import {
    buildPreservedAdditionalInfoPayload,
    getManualBookingFieldRows,
    getManualBookingProfileFromSources,
    isTheNewtBooking
} from '../utils/additionalInfo';
import { formatAdminDate } from '../utils/adminDateUtils';
import { bookingHasWeatherRefund } from '../utils/weatherRefund';

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

const renderBookingNameWithIndicators = (name, { isNewtBooking = false } = {}) => (
    <>
        {name}
        {isNewtBooking ? (
            <span role="img" aria-label="The Newt booking" style={{ marginLeft: 4 }}>
                🦎
            </span>
        ) : null}
    </>
);

const MANIFEST_DATE_NOTE_AUTO_SAVE_DELAY_MS = 700;
const normalizeManifestDateNoteValue = (value = '') => String(value || '').trim();

const formatOperationalTimeForPayload = (value) => {
    if (!value) return null;

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
            return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
        }
    }

    const parsedValue = dayjs.isDayjs(value) ? value : dayjs(value);
    return parsedValue.isValid() ? parsedValue.format('HH:mm:ss') : null;
};

const MemoizedEmailPreview = React.memo(
    ({ html, isMobile = false }) => {
        return (
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
                        transform: isMobile ? 'scale(1)' : 'scale(0.75)',
                        transformOrigin: 'top center',
                        width: isMobile ? '100%' : '133.33%',
                        maxWidth: '100%',
                        overflow: 'visible',
                        marginBottom: isMobile ? '0' : '-25%',
                        lineHeight: 1.6, 
                        color: '#333',
                        '& table': {
                            maxWidth: isMobile ? '100% !important' : '100% !important',
                            width: '100% !important',
                            marginBottom: '0 !important',
                            tableLayout: isMobile ? 'auto !important' : 'auto !important'
                        },
                        '& table[role="presentation"]': {
                            maxWidth: isMobile ? '100% !important' : '640px !important',
                            width: isMobile ? '100% !important' : 'auto !important',
                            margin: '0 !important',
                            marginBottom: '0 !important'
                        },
                        '& td': {
                            padding: isMobile ? '12px !important' : '16px !important',
                            width: isMobile ? 'auto !important' : 'auto !important'
                        },
                        '& td[align="center"]': {
                            padding: isMobile ? '16px 8px !important' : '32px 16px !important'
                        },
                        '& img': {
                            maxWidth: '100% !important',
                            width: isMobile ? '100% !important' : 'auto !important',
                            height: 'auto !important'
                        },
                        '& body': {
                            margin: '0 !important',
                            padding: '0 !important',
                            width: '100% !important'
                        },
                        '& tr': {
                            padding: isMobile ? '0 !important' : 'auto',
                            margin: isMobile ? '0 !important' : 'auto'
                        },
                        '& tr td': {
                            paddingLeft: isMobile ? '12px !important' : undefined,
                            paddingRight: isMobile ? '12px !important' : undefined
                        },
                        '& tr:last-child td': {
                            paddingBottom: isMobile ? '12px !important' : '16px !important'
                        },
                        '& div': {
                            maxWidth: isMobile ? '100% !important' : 'auto !important',
                            width: isMobile ? '100% !important' : 'auto !important'
                        }
                    }} 
                    dangerouslySetInnerHTML={{ __html: html }} 
                />
            </Box>
        );
    },
    (prev, next) => prev.html === next.html && prev.isMobile === next.isMobile
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
    const [manifestDateNote, setManifestDateNote] = useState('');
    const [manifestDateNoteDraft, setManifestDateNoteDraft] = useState('');
    const [manifestDateNoteLoading, setManifestDateNoteLoading] = useState(false);
    const [manifestDateNoteSaving, setManifestDateNoteSaving] = useState(false);
    const selectedDateRef = useRef(selectedDate);
    const manifestDateNoteSaveSequenceRef = useRef(0);
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
    // Email and SMS checkboxes for Send a Message popup
    const [sendMessageEmailChecked, setSendMessageEmailChecked] = useState(true);
    const [sendMessageSmsChecked, setSendMessageSmsChecked] = useState(true);
    const [addLink, setAddLink] = useState(false);
    const [emailLogs, setEmailLogs] = useState([]);
    const [emailLogsPollId, setEmailLogsPollId] = useState(null);
    const [emailTemplates, setEmailTemplates] = useState([]);
    const [smsTemplates, setSmsTemplates] = useState([]);
    const [emailPreviewDateTime, setEmailPreviewDateTime] = useState('');
    const [groupMessagePreviewDateTime, setGroupMessagePreviewDateTime] = useState('');
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
    // Email and SMS checkboxes for Group Message popup
    const [groupMessageEmailChecked, setGroupMessageEmailChecked] = useState(true);
    const [groupMessageSmsChecked, setGroupMessageSmsChecked] = useState(true);
    const [groupAddLink, setGroupAddLink] = useState(false);
    const [groupMessageEmailPreviewOpen, setGroupMessageEmailPreviewOpen] = useState(false);
    const [groupMessageSmsPreviewOpen, setGroupMessageSmsPreviewOpen] = useState(false);
    const [groupSmsForm, setGroupSmsForm] = useState({ to: '', message: '', template: 'custom' });
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
    const manualBookingFields = useMemo(() => {
        const manualBookingProfile = getManualBookingProfileFromSources(
            additionalInformation?.additional_information_json,
            bookingDetail?.booking?.additional_information_json,
            bookingDetail?.additional_information?.additional_information_json,
            bookingDetail?.voucher?.additional_information_json
        );

        return getManualBookingFieldRows(manualBookingProfile);
    }, [additionalInformation, bookingDetail]);
    const bookingDetailIsNewtBooking = useMemo(
        () =>
            isTheNewtBooking(
                additionalInformation,
                bookingDetail?.booking,
                bookingDetail?.additional_information
            ),
        [additionalInformation, bookingDetail]
    );

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
    useEffect(() => {
        selectedDateRef.current = selectedDate;
    }, [selectedDate]);

    const fetchManifestDateNote = useCallback(async (dateToLoad) => {
        const normalizedDateToLoad = String(dateToLoad || '').trim();

        if (!normalizedDateToLoad) {
            setManifestDateNote('');
            setManifestDateNoteDraft('');
            return;
        }

        setManifestDateNoteLoading(true);
        try {
            const response = await axios.get('/api/manifest/date-note', {
                params: { date: normalizedDateToLoad }
            });
            if (selectedDateRef.current !== normalizedDateToLoad) {
                return;
            }

            const nextNote = response?.data?.success && response?.data?.data?.note
                ? normalizeManifestDateNoteValue(response.data.data.note)
                : '';
            setManifestDateNote(nextNote);
            setManifestDateNoteDraft(nextNote);
        } catch (error) {
            console.error('Error fetching manifest date note:', error);
            if (selectedDateRef.current !== normalizedDateToLoad) {
                return;
            }
            setManifestDateNote('');
            setManifestDateNoteDraft('');
        } finally {
            if (selectedDateRef.current === normalizedDateToLoad) {
                setManifestDateNoteLoading(false);
            }
        }
    }, []);

    const persistManifestDateNote = useCallback(async (draftValue) => {
        const targetDate = String(selectedDateRef.current || '').trim();
        const normalizedDraft = normalizeManifestDateNoteValue(draftValue);
        const normalizedSaved = normalizeManifestDateNoteValue(manifestDateNote);

        if (!targetDate || normalizedDraft === normalizedSaved) {
            return;
        }

        const requestSequence = manifestDateNoteSaveSequenceRef.current + 1;
        manifestDateNoteSaveSequenceRef.current = requestSequence;

        setManifestDateNoteSaving(true);
        try {
            if (!normalizedDraft) {
                await axios.delete('/api/manifest/date-note', {
                    params: { date: targetDate }
                });

                if (
                    selectedDateRef.current === targetDate &&
                    manifestDateNoteSaveSequenceRef.current === requestSequence
                ) {
                    setManifestDateNote('');
                    setManifestDateNoteDraft((currentDraft) =>
                        normalizeManifestDateNoteValue(currentDraft) ? currentDraft : ''
                    );
                }
                return;
            }

            await axios.put('/api/manifest/date-note', {
                date: targetDate,
                note: normalizedDraft
            });

            if (
                selectedDateRef.current === targetDate &&
                manifestDateNoteSaveSequenceRef.current === requestSequence
            ) {
                setManifestDateNote(normalizedDraft);
                setManifestDateNoteDraft((currentDraft) => {
                    const normalizedCurrentDraft = normalizeManifestDateNoteValue(currentDraft);
                    return normalizedCurrentDraft === normalizedDraft ? normalizedDraft : currentDraft;
                });
            }
        } catch (error) {
            console.error('Error saving manifest date note:', error);
            alert('Failed to save the date note. Please try again.');
        } finally {
            if (
                selectedDateRef.current === targetDate &&
                manifestDateNoteSaveSequenceRef.current === requestSequence
            ) {
                setManifestDateNoteSaving(false);
            }
        }
    }, [manifestDateNote]);

    const handleManifestDateNoteBlur = useCallback(() => {
        if (manifestDateNoteLoading) return;
        void persistManifestDateNote(manifestDateNoteDraft);
    }, [manifestDateNoteDraft, manifestDateNoteLoading, persistManifestDateNote]);

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
        // For message mode, default both dropdowns to "Custom Message"
        let selectedTemplate = 'custom';
        if (mode === 'cancel') {
            const reschedulingTemplate = emailTemplates.find(
                t => t.name === 'Passenger Rescheduling Information'
            );
            selectedTemplate = reschedulingTemplate ? reschedulingTemplate.id : (emailTemplates.length > 0 ? emailTemplates[0].id : 'custom');
        } else if (mode === 'message') {
            selectedTemplate = 'custom';
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
        // Initialize checkbox states
        setGroupMessageEmailChecked(true);
        setGroupMessageSmsChecked(true);
        setGroupSmsForm({ to: '', message: '', template: 'custom' });
        // Set preview date/time once when modal opens
        const now = new Date();
        setGroupMessagePreviewDateTime(
            `${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
        );
        setGroupMessageModalOpen(true);

        if (selectedTemplate) {
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

    const handleGroupSmsTemplateChange = (templateValue, options = {}) => {
        const { syncEmailTemplate = true } = options;
        if (!templateValue || templateValue === 'custom') {
            setGroupSmsForm(prev => ({ 
                ...prev, 
                template: 'custom', 
                message: '' 
            }));

            if (syncEmailTemplate && groupMessageForm.template !== 'custom') {
                handleGroupTemplateChange('custom', { syncSmsTemplate: false });
            }
            return;
        }
        
        const dbTemplate = smsTemplates.find(t => {
            const templateId = String(t.id);
            const selectedValue = String(templateValue);
            return templateId === selectedValue;
        });
        
        if (dbTemplate) {
            const newMessage = dbTemplate.message || '';
            setGroupSmsForm(prev => ({ 
                ...prev, 
                template: String(dbTemplate.id),
                message: newMessage
            }));
        }
    };

    const handleGroupTemplateChange = (templateValue, options = {}) => {
        const { syncSmsTemplate = true } = options;
        let subject = '';
        let message = '';

        if (templateValue === 'custom') {
            setGroupMessageForm(prev => ({
                ...prev,
                subject: '🎈 From Fly Away',
                message: '',
                template: 'custom'
            }));

            if (syncSmsTemplate && groupSmsForm.template !== 'custom') {
                handleGroupSmsTemplateChange('custom', { syncEmailTemplate: false });
            }
            return;
        }

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

        // Auto-select corresponding SMS template if SMS checkbox is checked
        if (groupMessageSmsChecked && smsTemplates.length > 0) {
            // Email to SMS template name mapping
            const emailToSmsMapping = {
                'Flight Voucher Confirmation': 'Flight Voucher Confirmation SMS',
                'Booking Confirmation': 'Booking Confirmation SMS',
                'Booking Rescheduled': 'Booking Rescheduled SMS',
                'Follow up': 'Follow up SMS',
                'Passenger Rescheduling Information': 'Passenger Rescheduling Information SMS',
                'Upcoming Flight Reminder': 'Upcoming Flight Reminder SMS'
            };

            // Get email template name
            const templateName = resolveTemplateName(templateValue, dbTemplate);
            const emailTemplateName = dbTemplate?.name || templateName;
            
            // Find corresponding SMS template
            const correspondingSmsTemplateName = emailToSmsMapping[emailTemplateName];
            
            if (correspondingSmsTemplateName) {
                const matchingSmsTemplate = smsTemplates.find(
                    t => t.name === correspondingSmsTemplateName
                );
                
                if (matchingSmsTemplate) {
                    handleGroupSmsTemplateChange(String(matchingSmsTemplate.id));
                } else {
                    // No matching SMS template - default to first template so user has content
                    const firstSms = smsTemplates[0];
                    if (firstSms) {
                        handleGroupSmsTemplateChange(String(firstSms.id));
                    } else {
                        setGroupSmsForm(prev => ({ ...prev, template: 'custom', message: '' }));
                    }
                }
            } else {
                // Email has no SMS mapping (e.g. To Be Updated) - default to first SMS template
                const firstSms = smsTemplates[0];
                if (firstSms) {
                    handleGroupSmsTemplateChange(String(firstSms.id));
                } else {
                    setGroupSmsForm(prev => ({ ...prev, template: 'custom', message: '' }));
                }
            }
        }
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
        
        // Refetch booking data to ensure backend changes are reflected
        if (typeof bookingHook.refetch === 'function') {
            await bookingHook.refetch();
        }

        // Refresh crew and pilot assignments (cancel clears slot assignments)
        // Invalidate cache so refresh actually re-fetches
        if (selectedDate) {
            lastCrewFetchRef.current = { date: null, inFlight: false };
            lastPilotFetchRef.current = { date: null, inFlight: false };
            refreshCrewAssignments(selectedDate);
            refreshPilotAssignments(selectedDate);
        }
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
        setGroupAddLink(false);
        setGroupSelectedBookings([]);
        setGroupMessagePreviewBooking(null);
        setGroupActionMode('message');
        setGroupMessageEmailChecked(true);
        setGroupMessageSmsChecked(true);
        setGroupMessageEmailPreviewOpen(false);
        setGroupMessageSmsPreviewOpen(false);
        setGroupSmsForm({ to: '', message: '', template: 'custom' });
    };

    // Email handlers
    const handleEmailClick = (booking) => {
        setSelectedBookingForEmail(booking);
        
        // Find first template or use custom
        const firstTemplate = emailTemplates.length > 0 ? emailTemplates[0] : null;
        let subject = '';
        let message = '';
        let templateValue = 'custom';
        
        if (firstTemplate) {
            templateValue = firstTemplate.id;
            subject = firstTemplate.subject || '';
            message = extractMessageFromTemplateBody(firstTemplate.body) || getDefaultTemplateMessageHtml(firstTemplate.name, booking);
        } else {
            subject = `Regarding your Fly Away Ballooning booking - ${booking.name || ''}`;
            message = getDefaultTemplateMessageHtml('Custom Message', booking) || '';
        }
        
        setEmailForm({
            to: booking.email || '',
            subject,
            message,
            template: templateValue
        });
        
        // Initialize SMS form if SMS templates are available
        if (smsTemplates.length > 0 && sendMessageSmsChecked) {
            const firstSmsTemplate = smsTemplates[0];
            setSmsForm({
                to: normalizeUkPhone(booking.phone || booking.mobile || ''),
                message: firstSmsTemplate.message || '',
                template: String(firstSmsTemplate.id)
            });
        } else {
            setSmsForm({
                to: normalizeUkPhone(booking.phone || booking.mobile || ''),
                message: '',
                template: 'custom'
            });
        }
        
        // Set preview date/time once when modal opens
        const now = new Date();
        setEmailPreviewDateTime(
            `${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
        );
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

        let html = buildEmailHtml({
            templateName,
            messageHtml: emailForm.message,
            booking: selectedBookingForEmail,
            personalNote
        });

        if (addLink) {
            html = appendCustomerPortalLinkToEmailHtml(html, selectedBookingForEmail);
        }

        return html;
    }, [addLink, emailForm.message, personalNote, emailForm.template, emailTemplates, selectedBookingForEmail]);

    const groupPreviewHtml = useMemo(() => {
        const previewBooking =
            groupMessagePreviewBooking ||
            (groupSelectedBookings.length > 0 ? groupSelectedBookings[0] : selectedBookingForEmail);

        if (!previewBooking) return '';

        const dbTemplate = emailTemplates.find(
            (t) => t.id?.toString() === groupMessageForm.template?.toString()
        );
        const templateName = resolveTemplateName(groupMessageForm.template, dbTemplate);

        let html = buildEmailHtml({
            templateName,
            messageHtml: groupMessageForm.message,
            booking: previewBooking,
            personalNote: groupPersonalNote
        });

        if (addLink) {
            html = appendCustomerPortalLinkToEmailHtml(html, previewBooking);
        }

        return html;
    }, [addLink, groupMessageForm.message, groupPersonalNote, groupMessageForm.template, emailTemplates, groupMessagePreviewBooking, groupSelectedBookings, selectedBookingForEmail]);

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

    const handleEmailTemplateChange = (templateValue, options = {}) => {
        const { syncSmsTemplate = true } = options;
        let subject = '';
        let message = '';

        if (templateValue === 'custom') {
            setEmailForm(prev => ({
                ...prev,
                subject: '🎈 From Fly Away',
                message: '',
                template: 'custom'
            }));

            if (syncSmsTemplate && smsForm.template !== 'custom') {
                handleSmsTemplateChange('custom', { syncEmailTemplate: false });
            }
            return;
        }

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

        // Auto-select corresponding SMS template if SMS checkbox is checked
        if (sendMessageSmsChecked && smsTemplates.length > 0) {
            // Email to SMS template name mapping
            const emailToSmsMapping = {
                'Flight Voucher Confirmation': 'Flight Voucher Confirmation SMS',
                'Booking Confirmation': 'Booking Confirmation SMS',
                'Booking Rescheduled': 'Booking Rescheduled SMS',
                'Follow up': 'Follow up SMS',
                'Passenger Rescheduling Information': 'Passenger Rescheduling Information SMS',
                'Upcoming Flight Reminder': 'Upcoming Flight Reminder SMS'
            };

            // Get email template name
            const emailTemplateName = dbTemplate?.name || templateName;
            
            // Find corresponding SMS template
            const correspondingSmsTemplateName = emailToSmsMapping[emailTemplateName];
            
            if (correspondingSmsTemplateName) {
                const matchingSmsTemplate = smsTemplates.find(
                    t => t.name === correspondingSmsTemplateName
                );
                
                if (matchingSmsTemplate) {
                    console.log('✅ Auto-selecting SMS template:', matchingSmsTemplate.name);
                    handleSmsTemplateChange(String(matchingSmsTemplate.id));
                } else {
                    console.log('⚠️ SMS template not found for:', correspondingSmsTemplateName);
                    // Set to custom if no matching SMS template found
                    setSmsForm(prev => ({ ...prev, template: 'custom', message: '' }));
                }
            } else {
                console.log('⚠️ No SMS mapping for email template:', emailTemplateName);
                // Set to custom if no mapping exists
                setSmsForm(prev => ({ ...prev, template: 'custom', message: '' }));
            }
        }
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
        console.log('🔍 Current emailForm state:', emailForm);
        console.log('🔍 Personal note:', personalNote);
        console.log('🔍 Email checked:', sendMessageEmailChecked);
        console.log('🔍 SMS checked:', sendMessageSmsChecked);

        // Check if at least one checkbox is selected
        if (!sendMessageEmailChecked && !sendMessageSmsChecked) {
            alert('Please select at least one option (Email or SMS)');
            return;
        }

        // Validate email requirements if email is checked
        if (sendMessageEmailChecked) {
            if (!emailForm.to) {
                alert('Recipient email is required');
                return;
            }

            if (!emailForm.subject) {
                alert('Subject is required. Please select a template.');
                return;
            }
        }

        // Validate SMS requirements if SMS is checked
        if (sendMessageSmsChecked) {
            // Get phone number from selectedBookingForEmail
            const bookingData = selectedBookingForEmail || {};
            const phone = bookingData.phone || bookingData.mobile || '';
            const normalizedPhone = normalizeUkPhone(phone);
            
            if (!normalizedPhone || !normalizedPhone.startsWith('+')) {
                alert('Recipient phone number is required for SMS. Please ensure the booking has a valid international phone number.');
                return;
            }

            // Validate SMS content / template selection
            const hasSmsBody =
                (smsForm.message && smsForm.message.trim().length > 0) ||
                (personalNote && personalNote.trim().length > 0);

            // When using a custom SMS (or no explicit template), allow either
            // a template message OR a personal note to be the body.
            if (!smsForm.template || smsForm.template === 'custom') {
                if (!hasSmsBody) {
                    alert('SMS message is required. Please select an SMS template or enter a custom message or personal note.');
                    return;
                }
            }
        }

        setSendingEmail(true);
        try {
            const emailPromises = [];
            const smsPromises = [];

            // Prepare email data if email is checked
            if (sendMessageEmailChecked) {
                const dbTemplate = emailTemplates.find(
                    (t) => t.id?.toString() === emailForm.template?.toString()
                );
                const templateName = resolveTemplateName(emailForm.template, dbTemplate);
                let finalHtml = buildEmailHtml({
                    templateName,
                    messageHtml: emailForm.message,
                    booking: selectedBookingForEmail,
                    personalNote
                });

                // Append Customer Portal link if Add Link checkbox is checked
                if (addLink && selectedBookingForEmail) {
                    try {
                        const portalRes = await axios.post('/api/customerPortalShortLink', {
                            bookingId: selectedBookingForEmail.id,
                            contextType: 'booking'
                        });
                        const portalLink = portalRes.data?.shortUrl;
                        if (portalLink) {
                            const linkHtml = `<div style="margin-top:20px; text-align:center;"><a href="${portalLink}" style="color:#2563eb;text-decoration:underline;font-weight:600;font-size:16px;" target="_blank">Customer Portal</a></div>`;
                            const closingPattern = /(<\/div>\s*<\/td>\s*<\/tr>\s*<\/table>\s*<\/td>\s*<\/tr>\s*<\/table>\s*<\/body>)/i;
                            if (closingPattern.test(finalHtml)) {
                                finalHtml = finalHtml.replace(closingPattern, linkHtml + '$1');
                            } else {
                                finalHtml += linkHtml;
                            }
                        }
                    } catch (linkErr) {
                        console.warn('⚠️ Failed to generate customer portal link:', linkErr);
                    }
                }

                const finalText = stripHtml(finalHtml);

                console.log('📧 Sending email with data:', {
                    to: emailForm.to,
                    subject: emailForm.subject,
                    messageLength: finalHtml?.length || 0,
                    template: emailForm.template
                });

                emailPromises.push(
                    axios.post('/api/sendBookingEmail', {
                        bookingId: selectedBookingForEmail?.id,
                        to: emailForm.to,
                        subject: emailForm.subject,
                        message: finalHtml,
                        messageText: finalText,
                        template: emailForm.template,
                        bookingData: selectedBookingForEmail
                    })
                );
            }

            // Prepare SMS data if SMS is checked
            if (sendMessageSmsChecked) {
                let smsMessage = '';
                let smsTemplateId = null;
                const isCustomSmsTemplate = !smsForm.template || smsForm.template === 'custom';
                const SMS_MAX_LENGTH = 1600;

                // Custom Message: use ONLY the personalized note as the full SMS body (match Send Message to Guests)
                if (isCustomSmsTemplate) {
                    smsMessage = (personalNote && personalNote.trim()) ? personalNote.trim() : '';
                } else {
                    // Template selected: use template message, optionally append personal note
                    if (smsForm.message && smsForm.message.trim().length > 0) {
                        smsMessage = smsForm.message;
                        smsTemplateId = smsForm.template;
                        const bookingDataForSms = selectedBookingForEmail || {};
                        smsMessage = replaceSmsPrompts(smsMessage, bookingDataForSms);
                    } else if (emailForm.message && emailForm.message.trim().length > 0) {
                        // Fallback: Convert email template to SMS format (only when not Custom Message)
                        smsMessage = stripHtml(emailForm.message);
                        smsMessage = smsMessage
                            .replace(/https?:\/\/[^\s]+/gi, '')
                            .replace(/Customer Portal Link:.*/gi, '')
                            .replace(/Receipt.*?All prices in GBP.*/gis, '')
                            .replace(/Fly Away Ballooning.*?All prices in GBP.*/gis, '')
                            .replace(/\n{3,}/g, '\n\n')
                            .trim();
                        const bookingDataForSms = selectedBookingForEmail || {};
                        smsMessage = replaceSmsPrompts(smsMessage, bookingDataForSms);
                    }

                    if (personalNote && personalNote.trim()) {
                        const note = personalNote.trim();
                        smsMessage = smsMessage ? `${smsMessage}\n\n${note}` : note;
                    }

                    if (smsMessage.length > SMS_MAX_LENGTH) {
                        const maxMessageLength = Math.max(100, SMS_MAX_LENGTH - 50);
                        smsMessage = smsMessage.substring(0, maxMessageLength).trim();
                        const lastPeriod = smsMessage.lastIndexOf('.');
                        if (lastPeriod > maxMessageLength * 0.7) {
                            smsMessage = smsMessage.substring(0, lastPeriod + 1);
                        } else if (!smsMessage.endsWith('.') && !smsMessage.endsWith('!') && !smsMessage.endsWith('?')) {
                            smsMessage += '...';
                        }
                    }
                }

                // Append Customer Portal link if Add Link checkbox is checked
                if (addLink && selectedBookingForEmail) {
                    try {
                        const portalRes = await axios.post('/api/customerPortalShortLink', {
                            bookingId: selectedBookingForEmail.id,
                            contextType: 'booking'
                        });
                        const portalLink = portalRes.data?.shortUrl;
                        if (portalLink) {
                            smsMessage = smsMessage ? `${smsMessage}\n\nCustomer Portal\n${portalLink}` : `Customer Portal\n${portalLink}`;
                        }
                    } catch (linkErr) {
                        console.warn('⚠️ Failed to generate customer portal link for SMS:', linkErr);
                    }
                }

                let finalSmsMessage = smsMessage;

                // Final check - ensure total length doesn't exceed limit
                if (finalSmsMessage.length > SMS_MAX_LENGTH) {
                    const truncated = finalSmsMessage.substring(0, SMS_MAX_LENGTH - 3).trim();
                    const finalTruncated = truncated.endsWith('.') || truncated.endsWith('!') || truncated.endsWith('?')
                        ? truncated + '..'
                        : truncated + '...';
                    console.warn('⚠️ SMS message truncated to fit 1600 character limit');
                    finalSmsMessage = finalTruncated;
                }

                // Use finalSmsMessage for sending
                const smsMessageToSend = finalSmsMessage;

                // Validate SMS message before sending
                if (!smsMessageToSend || smsMessageToSend.trim().length === 0) {
                    console.error('⚠️ SMS message is empty, skipping SMS send');
                } else {
                    // Single SMS (booking)
                    const bookingData = selectedBookingForEmail || {};
                    const phone = bookingData.phone || bookingData.mobile || '';
                    const normalizedPhone = normalizeUkPhone(phone);
                    
                    if (normalizedPhone && normalizedPhone.startsWith('+') && smsMessageToSend && smsMessageToSend.trim().length > 0) {
                        smsPromises.push(
                            axios.post('/api/sendBookingSms', {
                                bookingId: selectedBookingForEmail?.id,
                                to: normalizedPhone,
                                body: smsMessageToSend,
                                templateId: smsTemplateId || (smsForm.template && smsForm.template !== 'custom' ? smsForm.template : null),
                                bookingData: bookingData
                            })
                        );
                    } else {
                        if (!normalizedPhone || !normalizedPhone.startsWith('+')) {
                            console.warn('⚠️ No valid phone number found for SMS');
                        }
                        if (!smsMessageToSend || smsMessageToSend.trim().length === 0) {
                            console.warn('⚠️ SMS message is empty');
                        }
                    }
                }
            }

            // Execute all promises
            const results = await Promise.allSettled([...emailPromises, ...smsPromises]);
            
            const emailResults = results.slice(0, emailPromises.length);
            const smsResults = results.slice(emailPromises.length);
            
            let successMessages = [];
            let errorMessages = [];

            emailResults.forEach((result) => {
                if (result.status === 'fulfilled' && result.value.data.success) {
                    successMessages.push('Email sent successfully!');
                } else {
                    errorMessages.push('Failed to send email: ' + (result.reason?.response?.data?.message || result.reason?.message || 'Unknown error'));
                }
            });

            smsResults.forEach((result) => {
                if (result.status === 'fulfilled' && result.value.data.success) {
                    successMessages.push('SMS sent successfully!');
                } else {
                    errorMessages.push('Failed to send SMS: ' + (result.reason?.response?.data?.message || result.reason?.message || 'Unknown error'));
                }
            });

            if (successMessages.length > 0 || errorMessages.length > 0) {
                if (successMessages.length > 0) {
                    alert(successMessages.join('\n'));
                }
                if (errorMessages.length > 0) {
                    alert(errorMessages.join('\n'));
                }
                
                if (successMessages.length > 0 && errorMessages.length === 0) {
                    setEmailModalOpen(false);
                    setEmailForm({ to: '', subject: '', message: '', template: 'custom' });
                    setPersonalNote('');
                    setAddLink(false);
                    setSmsForm({ to: '', message: '', template: 'custom' });
                    setSendMessageEmailChecked(true);
                    setSendMessageSmsChecked(true);
                    if (selectedBookingForEmail?.id) {
                        try {
                            const resp = await axios.get(`/api/bookingEmails/${selectedBookingForEmail.id}`);
                            setEmailLogs(resp.data?.data || []);
                        } catch {}
                    }
                }
            } else {
                if (!sendMessageEmailChecked && !sendMessageSmsChecked) {
                    alert('No valid recipients found. Please check email addresses and phone numbers.');
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error sending message: ' + (error.response?.data?.message || error.message));
        } finally {
            setSendingEmail(false);
        }
    };

    const handleSendGroupEmail = async () => {
        // Check if at least one checkbox is selected
        if (!groupMessageEmailChecked && !groupMessageSmsChecked) {
            alert('Please select at least one option (Email or SMS)');
            return;
        }

        // Validate email requirements if email is checked
        if (groupMessageEmailChecked) {
            if (groupMessageForm.to.length === 0) {
                alert('No recipients selected.');
                return;
            }

            if (!groupMessageForm.subject) {
                alert('Subject is required. Please select a template.');
                return;
            }
        }

        // Validate SMS requirements if SMS is checked
        if (groupMessageSmsChecked) {
            const hasSmsBody =
                (groupSmsForm.message && groupSmsForm.message.trim().length > 0) ||
                (groupPersonalNote && groupPersonalNote.trim().length > 0);

            // When using a custom SMS (or no explicit template), allow either
            // a template message OR a personal note to be the body.
            if (!groupSmsForm.template || groupSmsForm.template === 'custom') {
                if (!hasSmsBody) {
                    alert('SMS message is required. Please select an SMS template or enter a custom message or personal note.');
                    return;
                }
            }
        }

        if (!groupSelectedBookings.length) {
            alert('No bookings found for this group.');
            return;
        }

        setGroupMessageSending(true);
        let emailSuccessCount = 0;
        let smsSuccessCount = 0;
        const emailFailures = [];
        const smsFailures = [];

        for (const booking of groupSelectedBookings) {
            // Send email if email checkbox is checked
            if (groupMessageEmailChecked) {
                const to = booking.email || '';
                if (!to) {
                    emailFailures.push({ booking, reason: 'Missing email address' });
                } else {
                    const templateName = resolveTemplateName(groupMessageForm.template, emailTemplates.find((t) => t.id?.toString() === groupMessageForm.template?.toString()));
                    let finalHtml = buildEmailHtml({
                        templateName,
                        messageHtml: groupMessageForm.message,
                        booking,
                        personalNote: groupPersonalNote
                    });

                    // Append Customer Portal link if Add Link checkbox is checked
                    if (groupAddLink) {
                        try {
                            const portalRes = await axios.post('/api/customerPortalShortLink', {
                                bookingId: booking.id,
                                contextType: 'booking'
                            });
                            const portalLink = portalRes.data?.shortUrl;
                            if (portalLink) {
                                const linkHtml = `<div style="margin-top:20px; text-align:center;"><a href="${portalLink}" style="color:#2563eb;text-decoration:underline;font-weight:600;font-size:16px;" target="_blank">Customer Portal</a></div>`;
                                const closingPattern = /(<\/div>\s*<\/td>\s*<\/tr>\s*<\/table>\s*<\/td>\s*<\/tr>\s*<\/table>\s*<\/body>)/i;
                                if (closingPattern.test(finalHtml)) {
                                    finalHtml = finalHtml.replace(closingPattern, linkHtml + '$1');
                                } else {
                                    finalHtml += linkHtml;
                                }
                            }
                        } catch (linkErr) {
                            console.warn('⚠️ Failed to generate customer portal link:', linkErr);
                        }
                    }

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
                        emailSuccessCount += 1;
                    } catch (err) {
                        emailFailures.push({
                            booking,
                            reason: err?.response?.data?.message || err.message || 'Unknown error'
                        });
                    }
                }
            }

            // Send SMS if SMS checkbox is checked
            if (groupMessageSmsChecked) {
                // Phone: use same sources as Mobile column - bookingFieldUpdates, booking.phone, then ALL passengers
                // Same priority as Mobile column: manual updates > booking.phone > all passengers' mobile/phone
                const getEffectivePhoneForBooking = (f) => {
                    let latestUpdatedPhone = null;
                    if (typeof window !== 'undefined') {
                        const memUpdates = window.__bookingFieldUpdates || {};
                        const memUpdate = memUpdates[String(f.id)];
                        if (memUpdate?.field === 'phone' && memUpdate?.value) latestUpdatedPhone = memUpdate.value;
                        if (!latestUpdatedPhone) {
                            try {
                                const raw = window.localStorage?.getItem('bookingFieldUpdates');
                                if (raw) {
                                    const updates = JSON.parse(raw);
                                    if (Array.isArray(updates)) {
                                        for (let i = updates.length - 1; i >= 0; i--) {
                                            const u = updates[i];
                                            if (u && String(u.bookingId) === String(f.id) && u.field === 'phone' && u.value) {
                                                latestUpdatedPhone = u.value;
                                                break;
                                            }
                                        }
                                    }
                                }
                            } catch (_) {}
                        }
                    }
                    if (latestUpdatedPhone) return latestUpdatedPhone;
                    // Booking Details "Phone" field (synced with all_booking.phone)
                    if (f.phone) return f.phone;
                    if (f.mobile) return f.mobile;
                    // Mobile column: check ALL passengers (correct number may be on passenger 2, e.g. 46 46)
                    if (Array.isArray(f.passengers)) {
                        for (const p of f.passengers) {
                            const val = (p.mobile || p.phone || '').trim();
                            if (val.length >= 10) return val;
                        }
                    }
                    return '';
                };
                const phone = getEffectivePhoneForBooking(booking);
                const normalizedPhone = normalizeUkPhone(phone);
                // UK E.164: +44 + 10 digits = min 12 chars; reject clearly invalid/short numbers
                const isValidUkPhone = normalizedPhone && normalizedPhone.startsWith('+') && normalizedPhone.length >= 12 && /^\+44\d{10}$/.test(normalizedPhone);
                if (!normalizedPhone || !normalizedPhone.startsWith('+') || !isValidUkPhone) {
                    smsFailures.push({ booking, reason: 'Missing or invalid phone number (need full UK number, e.g. 07563035823)' });
                } else {
                    // Use SMS template if available, otherwise convert email template to SMS format
                    let smsMessage = '';
                    let smsTemplateId = null;
                    const isCustomSmsTemplate = !groupSmsForm.template || groupSmsForm.template === 'custom';

                    // Custom Message: use ONLY the personalized note as the full SMS body
                    if (isCustomSmsTemplate) {
                        smsMessage = (groupPersonalNote && groupPersonalNote.trim()) ? groupPersonalNote.trim() : '';
                    } else {
                        // Template selected: use template message, optionally append personal note
                        let effectiveSmsMessage = groupSmsForm.message;
                        if ((!effectiveSmsMessage || effectiveSmsMessage.trim().length === 0) && smsTemplates.length > 0) {
                            const templateObj = smsTemplates.find(t => String(t.id) === String(groupSmsForm.template));
                            effectiveSmsMessage = templateObj ? (templateObj.message || '') : '';
                        }
                        if (effectiveSmsMessage && effectiveSmsMessage.trim().length > 0) {
                            smsMessage = replaceSmsPrompts(effectiveSmsMessage, booking);
                            smsTemplateId = groupSmsForm.template;
                        } else if (groupMessageForm.message && groupMessageForm.message.trim().length > 0) {
                            // Fallback: Convert email template to SMS format (only when not Custom Message)
                            smsMessage = stripHtml(groupMessageForm.message);
                            smsMessage = smsMessage
                                .replace(/https?:\/\/[^\s]+/gi, '')
                                .replace(/Customer Portal Link:.*/gi, '')
                                .replace(/Receipt.*?All prices in GBP.*/gis, '')
                                .replace(/Fly Away Ballooning.*?All prices in GBP.*/gis, '')
                                .replace(/\n{3,}/g, '\n\n')
                                .trim();
                            smsMessage = replaceSmsPrompts(smsMessage, booking);
                        }

                        // Add personal note if there's space (only for non-Custom templates)
                        if (groupPersonalNote && groupPersonalNote.trim()) {
                            const note = groupPersonalNote.trim();
                            if (smsMessage) {
                                smsMessage = `${smsMessage}\n\n${note}`;
                            } else {
                                smsMessage = note;
                            }
                        }
                    }

                    // Append Customer Portal link if Add Link checkbox is checked
                    if (groupAddLink) {
                        try {
                            const portalRes = await axios.post('/api/customerPortalShortLink', {
                                bookingId: booking.id,
                                contextType: 'booking'
                            });
                            const portalLink = portalRes.data?.shortUrl;
                            if (portalLink) {
                                smsMessage = smsMessage ? `${smsMessage}\n\nCustomer Portal\n${portalLink}` : `Customer Portal\n${portalLink}`;
                            }
                        } catch (linkErr) {
                            console.warn('⚠️ Failed to generate customer portal link for SMS:', linkErr);
                        }
                    }

                    const SMS_MAX_LENGTH = 1600;
                    let finalSmsMessage = smsMessage;

                    // Final check - ensure total length doesn't exceed limit
                    if (finalSmsMessage.length > SMS_MAX_LENGTH) {
                        const truncated = finalSmsMessage.substring(0, SMS_MAX_LENGTH - 3).trim();
                        finalSmsMessage = truncated.endsWith('.') || truncated.endsWith('!') || truncated.endsWith('?') 
                            ? truncated + '..' 
                            : truncated + '...';
                    }

                    if (finalSmsMessage && finalSmsMessage.trim().length > 0) {
                        try {
                            await axios.post('/api/sendBookingSms', {
                                bookingId: booking.id,
                                to: normalizedPhone,
                                body: finalSmsMessage,
                                templateId: smsTemplateId || (groupSmsForm.template && groupSmsForm.template !== 'custom' ? groupSmsForm.template : null)
                            });
                            smsSuccessCount += 1;
                        } catch (err) {
                            smsFailures.push({
                                booking,
                                reason: err?.response?.data?.message || err.message || 'Unknown error'
                            });
                        }
                    } else {
                        smsFailures.push({ booking, reason: 'SMS message is empty' });
                    }
                }
            }
        }

        setGroupMessageSending(false);

        let summary = '';
        if (groupMessageEmailChecked) {
            summary += `Emails sent: ${emailSuccessCount}`;
            if (emailFailures.length > 0) {
                summary += `\nEmail failures: ${emailFailures.length}`;
            }
        }
        if (groupMessageSmsChecked) {
            if (summary) summary += '\n';
            summary += `SMS sent: ${smsSuccessCount}`;
            if (smsFailures.length > 0) {
                summary += `\nSMS failures: ${smsFailures.length}`;
            }
        }

        if (emailFailures.length === 0 && smsFailures.length === 0 && groupActionMode === 'cancel') {
            try {
                await cancelGroupBookings(groupSelectedBookings);
                summary += `\nCancelled ${groupSelectedBookings.length} booking(s).`;
            } catch (cancelErr) {
                summary += `\nFailed to cancel bookings: ${cancelErr?.response?.data?.message || cancelErr.message || 'Unknown error'}`;
            }
        }

        alert(summary);
        if (emailFailures.length === 0 && smsFailures.length === 0) {
            closeGroupMessageModal();
        }
    };

    // Normalize UK phone numbers to +44 format (E.164: +44 + 10 digits)
    const normalizeUkPhone = (raw) => {
        if (!raw) return '';
        const str = typeof raw === 'object' ? (raw.number || raw.phone || raw.mobile || raw.value || '') : raw;
        let s = String(str || '').trim().replace(/[\s\-()]/g, '');
        if (s.startsWith('00')) s = '+' + s.slice(2);
        // 44... or 440... without + (e.g. from DB)
        if (s.startsWith('44') && !s.startsWith('+')) s = '+' + s;
        if (s.startsWith('+')) {
            // +440XXXXXXXXX or +440XXXXXXXXXX -> +447XXXXXXXXX (UK E.164: drop redundant 0 after +44)
            if (s.startsWith('+44') && s[3] === '0' && /^\+440[0-9]{9,10}$/.test(s)) {
                return '+44' + s.slice(4).replace(/^0/, '');
            }
            return s;
        }
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

    const handleSmsTemplateChange = (templateValue, options = {}) => {
        const { syncEmailTemplate = true } = options;
        console.log('🔄 SMS template changed to:', templateValue);
        console.log('📚 Available templates:', smsTemplates);
        console.log('📋 Current smsForm:', smsForm);
        
        if (!templateValue || templateValue === 'custom') {
            setSmsForm(prev => ({ 
                ...prev, 
                template: 'custom', 
                message: '' 
            }));

            if (syncEmailTemplate && emailForm.template !== 'custom') {
                handleEmailTemplateChange('custom', { syncSmsTemplate: false });
            }
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
        const isCustom = !smsForm.template || smsForm.template === 'custom';
        const hasMessage = isCustom 
            ? (smsPersonalNote && smsPersonalNote.trim().length > 0)
            : (smsForm.message && smsForm.message.trim().length > 0);
        if (!smsForm.to || !hasMessage) {
            alert('Please fill phone and message');
            return;
        }
        
        // Normalize phone number to +44 format
        const normalizedPhone = normalizeUkPhone(smsForm.to);
        if (!normalizedPhone || !normalizedPhone.startsWith('+44')) {
            alert('Please enter a valid UK phone number (will be converted to +44 format)');
            return;
        }
        
        // Custom Message: use only smsPersonalNote; otherwise template + optional note
        let finalMessage;
        if (isCustom) {
            finalMessage = (smsPersonalNote && smsPersonalNote.trim()) ? smsPersonalNote.trim() : '';
        } else {
            const bookingData = selectedBookingForEmail || {};
            const messageWithPrompts = replaceSmsPrompts(smsForm.message || '', bookingData);
            finalMessage = (smsPersonalNote && smsPersonalNote.trim()) 
                ? `${messageWithPrompts}${messageWithPrompts ? '\n\n' : ''}${smsPersonalNote.trim()}`
                : messageWithPrompts;
        }
        
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

    useEffect(() => {
        fetchManifestDateNote(selectedDate);
    }, [fetchManifestDateNote, selectedDate]);

    useEffect(() => {
        if (!selectedDate || manifestDateNoteLoading) {
            return undefined;
        }

        const normalizedDraft = normalizeManifestDateNoteValue(manifestDateNoteDraft);
        const normalizedSaved = normalizeManifestDateNoteValue(manifestDateNote);

        if (normalizedDraft === normalizedSaved) {
            return undefined;
        }

        const autoSaveTimer = window.setTimeout(() => {
            void persistManifestDateNote(manifestDateNoteDraft);
        }, MANIFEST_DATE_NOTE_AUTO_SAVE_DELAY_MS);

        return () => window.clearTimeout(autoSaveTimer);
    }, [
        manifestDateNote,
        manifestDateNoteDraft,
        manifestDateNoteLoading,
        persistManifestDateNote,
        selectedDate
    ]);

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
            
            // Apply any pending phone/email updates from Booking page (user may have updated while on Booking page; Manifest was unmounted so event was missed)
            const pendingUpdates = (typeof window !== 'undefined' && window.__bookingFieldUpdates) ? window.__bookingFieldUpdates : {};
            let merged = normalized;
            if (Object.keys(pendingUpdates).length > 0) {
                merged = normalized.map(f => {
                    const id = String(f.id);
                    const update = pendingUpdates[id];
                    if (!update || (update.field !== 'phone' && update.field !== 'email')) return f;
                    const updated = { ...f, [update.field]: update.value };
                    if (Array.isArray(f.passengers) && f.passengers.length > 0) {
                        updated.passengers = f.passengers.map((p, i) => {
                            if (i !== 0) return p;
                            if (update.field === 'phone') return { ...p, mobile: update.value };
                            if (update.field === 'email') return { ...p, email: update.value };
                            return p;
                        });
                    }
                    delete window.__bookingFieldUpdates[id];
                    return updated;
                });
            }
            
            // Preserve phone/mobile/email updates from handleEditSave by merging with existing flights state
            setFlights(prevFlights => {
                // Create a map of existing flights by ID for quick lookup (preserve manual updates)
                const existingFlightsMap = new Map();
                prevFlights.forEach(f => {
                    const id = String(f.id);
                    // Always preserve phone/mobile/email from current state if they exist (may have been manually updated)
                    // Prioritize existing values over normalized values to preserve manual updates
                    existingFlightsMap.set(id, {
                        phone: f.phone,
                        email: f.email,
                        passengers: f.passengers
                    });
                });
                
                // Merge merged (normalized + pending Booking page updates) with preserved phone/mobile/email updates
                return merged.map(f => {
                    const id = String(f.id);
                    const existing = existingFlightsMap.get(id);
                    if (existing) {
                        // Preserve manually updated phone/mobile/email from existing state
                        // If existing has phone/email, use it; otherwise use normalized value
                        const preservedPhone = existing.phone || f.phone;
                        const preservedEmail = existing.email || f.email;
                        
                        // Merge passengers: preserve Passenger 1 mobile/email from existing if it exists
                        let mergedPassengers = f.passengers;
                        if (existing.passengers && existing.passengers.length > 0 && f.passengers && f.passengers.length > 0) {
                            mergedPassengers = f.passengers.map((p, i) => {
                                if (i === 0 && existing.passengers[0]) {
                                    // Keep Passenger 1 mobile/email from existing state if it was manually updated
                                    return { 
                                        ...p, 
                                        mobile: existing.passengers[0].mobile || p.mobile, 
                                        email: existing.passengers[0].email || p.email 
                                    };
                                }
                                return p;
                            });
                        } else if (existing.passengers && existing.passengers.length > 0) {
                            // If normalized has no passengers but existing does, use existing
                            mergedPassengers = existing.passengers;
                        }
                        
                        return {
                            ...f,
                            phone: preservedPhone,
                            email: preservedEmail,
                            passengers: mergedPassengers
                        };
                    }
                    return f;
                });
            });
        }
    }, [booking, passenger, bookingLoading, passengerLoading, locationToActivityId]);

    // Listen for booking field updates from BookingPage (e.g., phone/email changes)
    // Helper: Apply a single phone/email update to flights state
    const applyBookingFieldUpdateToFlights = useCallback((update) => {
        if (!update || !update.bookingId || (update.field !== 'phone' && update.field !== 'email')) return;
        const { bookingId, field, value } = update;
        const targetBookingId = String(bookingId);
        setFlights(prevFlights => {
            return prevFlights.map(f => {
                if (String(f.id) !== targetBookingId) return f;

                const updated = { ...f, [field]: value };
                if (Array.isArray(f.passengers) && f.passengers.length > 0) {
                    updated.passengers = f.passengers.map((p, i) => {
                        if (i !== 0) return p;
                        if (field === 'phone') return { ...p, mobile: value };
                        if (field === 'email') return { ...p, email: value };
                        return p;
                    });
                }

                return updated;
            });
        });
    }, []);

    // Listen for booking field updates from BookingPage in the same tab
    useEffect(() => {
        const handleBookingFieldUpdate = (event) => {
            applyBookingFieldUpdateToFlights(event.detail || {});
        };

        window.addEventListener('bookingFieldUpdated', handleBookingFieldUpdate);
        return () => {
            window.removeEventListener('bookingFieldUpdated', handleBookingFieldUpdate);
        };
    }, [applyBookingFieldUpdateToFlights]);

    // Listen for booking field updates from other tabs via localStorage
    useEffect(() => {
        const STORAGE_KEY = 'bookingFieldUpdates';

        const applyFromStorage = () => {
            try {
                if (typeof window === 'undefined') return;
                const raw = window.localStorage.getItem(STORAGE_KEY);
                if (!raw) {
                    return;
                }
                const updates = JSON.parse(raw);
                if (!Array.isArray(updates) || updates.length === 0) {
                    return;
                }

                updates.forEach(update => applyBookingFieldUpdateToFlights(update));
            } catch (err) {
                console.warn('Manifest: failed to apply booking field updates from storage', err);
            }
        };

        // Apply any existing updates on mount (e.g., when navigating from Booking to Manifest)
        applyFromStorage();

        const handleStorage = (event) => {
            if (event.key === STORAGE_KEY) {
                applyFromStorage();
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => {
            window.removeEventListener('storage', handleStorage);
        };
    }, [applyBookingFieldUpdateToFlights]);

    const handleDateChange = (e) => {
        const newDate = e.target.value;
        console.log('Date changed to:', newDate);
        setSelectedDate(newDate);
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
        if (!flight) {
            return "Open"; // Default to Open if flight is null/undefined
        }
        
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

    // History/timezone fix:
    // Server often stores flight_date as "YYYY-MM-DD HH:mm:ss" without timezone info.
    // JS/Dayjs may parse that as UTC -> causing hour shifts on display.
    const parseLocalNoTzDateTime = (value) => {
        if (!value) return null;
        if (typeof value !== 'string') return null;

        const localNoTz = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/;
        const looksZOrOffset = /Z$/i.test(value) || /([+-]\d{2}):?(\d{2})$/.test(value);
        if (!localNoTz.test(value) || looksZOrOffset) return null;

        const [datePart, timePart] = value.split(/[ T]/);
        if (!datePart || !timePart) return null;
        const [yearStr, monthStr, dayStr] = datePart.split('-');
        const [hourStr, minuteStr, secondStr] = timePart.split(':');

        const year = Number(yearStr);
        const month = Number(monthStr) - 1;
        const day = Number(dayStr);
        const hour = Number(hourStr);
        const minute = Number(minuteStr);
        const second = secondStr ? Number(secondStr.split('.')[0]) : 0;

        const d = new Date(year, month, day, hour, minute, Number.isFinite(second) ? second : 0);
        return Number.isNaN(d.getTime()) ? null : d;
    };

    const formatHistoryDateTime = (value, formatStr) => {
        const localDate = parseLocalNoTzDateTime(value);
        if (localDate) return dayjs(localDate).format(formatStr);
        return value ? dayjs(value).format(formatStr) : '-';
    };

    const formatHistoryDateKey = (value) => formatHistoryDateTime(value, 'YYYY-MM-DD HH:mm');
    const formatHistoryDateDisplay = (value) => formatHistoryDateTime(value, 'DD/MM/YYYY HH:mm');
    const normalizeHistoryDateValue = (value) => {
        if (!value) return null;

        const localDate = parseLocalNoTzDateTime(value);
        if (localDate) return dayjs(localDate).format('YYYY-MM-DD HH:mm:ss');

        const parsed = dayjs(value);
        return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : null;
    };
    const getHistoryComparableTime = (value) => {
        if (!value) return 0;

        const localDate = parseLocalNoTzDateTime(value);
        if (localDate) return localDate.getTime();

        const parsed = dayjs(value);
        return parsed.isValid() ? parsed.valueOf() : 0;
    };

    const buildDisplayedHistoryRows = () => {
        const historyEntries = Array.isArray(bookingHistory) ? [...bookingHistory] : [];
        const rowsByDateKey = new Map();

        const upsertHistoryRow = (entry) => {
            if (!entry || !entry.status) return;

            const normalizedFlightDate = normalizeHistoryDateValue(entry.flight_date || entry.changed_at);
            if (!normalizedFlightDate) return;

            const normalizedChangedAt = normalizeHistoryDateValue(entry.changed_at) || normalizedFlightDate;
            const dateKey = formatHistoryDateKey(normalizedFlightDate);
            const comparableChangedAt = getHistoryComparableTime(normalizedChangedAt) || getHistoryComparableTime(normalizedFlightDate);
            const nextRow = {
                flight_date: normalizedFlightDate,
                status: entry.status,
                changed_at: normalizedChangedAt,
                comparable_changed_at: comparableChangedAt
            };
            const existingRow = rowsByDateKey.get(dateKey);

            if (!existingRow || comparableChangedAt >= existingRow.comparable_changed_at) {
                rowsByDateKey.set(dateKey, nextRow);
            }
        };

        [...historyEntries]
            .filter(entry => entry && entry.status)
            .sort((a, b) => {
                const changedAtDiff = getHistoryComparableTime(a.changed_at) - getHistoryComparableTime(b.changed_at);
                if (changedAtDiff !== 0) return changedAtDiff;
                return getHistoryComparableTime(a.flight_date) - getHistoryComparableTime(b.flight_date);
            })
            .forEach(upsertHistoryRow);

        if (bookingDetail?.booking?.flight_date) {
            upsertHistoryRow({
                flight_date: bookingDetail.booking.flight_date,
                changed_at: bookingDetail.booking.flight_date,
                status: bookingDetail.booking.status || 'Scheduled'
            });
        }

        return Array.from(rowsByDateKey.values())
            .sort((a, b) => {
                return b.comparable_changed_at - a.comparable_changed_at;
            })
            .map(({ comparable_changed_at, ...row }) => row);
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
            } else if (editField === 'phone' || editField === 'email') {
                // Update bookingDetail state (lead booking phone/email)
                setBookingDetail(prev => {
                    if (!prev) return prev;
                    const updatedPassengers = Array.isArray(prev.passengers)
                        ? prev.passengers.map((p, i) => {
                            if (i !== 0) return p;
                            // Keep Passenger 1 mobile/email in sync with booking-level contact
                            if (editField === 'phone') {
                                return { ...p, mobile: editValue };
                            }
                            if (editField === 'email') {
                                return { ...p, email: editValue };
                            }
                            return p;
                        })
                        : prev.passengers;

                    return {
                        ...prev,
                        booking: {
                            ...prev.booking,
                            [editField]: editValue
                        },
                        passengers: updatedPassengers
                    };
                });

                const targetBookingId = String(bookingDetail.booking.id);
                setFlights(prevFlights => prevFlights.map(f => {
                    if (String(f.id) !== targetBookingId) return f;
                    const updatedPassengers = Array.isArray(f.passengers) && f.passengers.length > 0
                        ? f.passengers.map((p, i) => {
                            if (i !== 0) return p;
                            if (editField === 'phone') return { ...p, mobile: editValue };
                            if (editField === 'email') return { ...p, email: editValue };
                            return p;
                        })
                        : f.passengers;
                    return {
                        ...f,
                        [editField]: editValue,
                        passengers: updatedPassengers
                    };
                }));

                // Keep BookingPage → Manifest sync helpers in sync:
                // write this update into the shared in-memory/localStorage queue
                // so Mobile column always prefers the latest manual phone/email.
                try {
                    const updateId = `bookingFieldUpdate_${bookingDetail.booking.id}_${Date.now()}`;
                    const payload = {
                        id: updateId,
                        bookingId: bookingDetail.booking.id,
                        field: editField,
                        value: editValue
                    };

                    if (typeof window !== 'undefined') {
                        // In-memory cache for this tab
                        window.__bookingFieldUpdates = window.__bookingFieldUpdates || {};
                        window.__bookingFieldUpdates[String(bookingDetail.booking.id)] = payload;

                        // Persistent queue for other tabs / future Manifest mounts
                        const key = 'bookingFieldUpdates';
                        const existingRaw = window.localStorage.getItem(key);
                        const existing = existingRaw ? JSON.parse(existingRaw) : [];
                        const next = Array.isArray(existing) ? existing : [];
                        next.push(payload);
                        window.localStorage.setItem(key, JSON.stringify(next.slice(-100)));
                    }
                } catch (err) {
                    console.warn('Manifest: failed to persist bookingFieldUpdate to localStorage', err);
                }
                
                // Refetch booking data to sync backend, but useEffect will preserve our manual phone/mobile updates
                // Note: We don't await refetch here to allow UI to update immediately
                // The useEffect will preserve our manual phone/mobile updates when it runs
                if (typeof bookingHook.refetch === 'function') {
                    bookingHook.refetch();
                }
            } else {
            await fetchBookingDetail(bookingDetail.booking.id);
            if (typeof bookingHook.refetch === 'function') {
                await bookingHook.refetch();
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
                    flightType = 'Private Charter';
                }
            }
            
            // Fallback to existing booking flight type if no selection
            if (!flightType) {
                const existingFlightType = bookingDetail.booking.flight_type || '';
                if (existingFlightType.toLowerCase().includes('shared')) {
                    flightType = 'Shared Flight';
                } else if (existingFlightType.toLowerCase().includes('private')) {
                    flightType = 'Private Charter';
                } else {
                    // Last fallback: use passenger count (but this should rarely happen)
                    const passengerCount = bookingDetail.booking.pax || 1;
                    flightType = passengerCount === 1 ? 'Shared Flight' : 'Private Charter';
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
            let experience = flightType;
            if (flightType === 'Shared Flight') {
                experience = 'Shared Flight';
            } else if (flightType && String(flightType).toLowerCase().includes('private')) {
                experience = 'Private Charter';
                flightType = 'Private Charter';
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

            const preservedAdditionalInfo = buildPreservedAdditionalInfoPayload({
                additionalInformation,
                booking: bookingDetail?.booking,
                voucher: bookingDetail?.voucher
            });

            const payload = {
                activitySelect: flightType,
                chooseLocation: selectedLocation || bookingDetail.booking.location,
                chooseFlightType: { type: flightType, passengerCount: passengerCount },
                activity_id: activityId,
                passengerData: passengerData,
                selectedDate: dayjs(date).format('YYYY-MM-DD') + ' ' + time,
                totalPrice: totalPrice,
                additionalInfo: preservedAdditionalInfo,
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
            // Update existing booking (rebook_from_booking_id is provided, so backend will UPDATE instead of INSERT)
            const createResponse = await axios.post('/api/createBooking', payload);
            
            if (!createResponse.data.success) {
                throw new Error(createResponse.data.message || 'Failed to update booking');
            }
            
            // NO DELETE needed - backend UPDATEs the same booking when rebook_from_booking_id is provided
            
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

            // Refresh crew and pilot assignments for both old and new dates (rebook clears old slot)
            // Invalidate cache so refresh actually re-fetches (otherwise cache skips re-fetch for same date)
            lastCrewFetchRef.current = { date: null, inFlight: false };
            lastPilotFetchRef.current = { date: null, inFlight: false };
            await Promise.all([
                selectedDate ? refreshCrewAssignments(selectedDate) : Promise.resolve(),
                date ? refreshCrewAssignments(date) : Promise.resolve(),
                selectedDate ? refreshPilotAssignments(selectedDate) : Promise.resolve(),
                date ? refreshPilotAssignments(date) : Promise.resolve()
            ]);
            
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

                // Reflect passenger edits in the dialog and manifest table immediately.
                const normalizeFieldValue = (value) => {
                    if (value === undefined) return undefined;
                    if (value === null) return null;
                    const trimmed = String(value).trim();
                    return trimmed === '' ? null : trimmed;
                };
                const localPassengerPatch = {
                    first_name: normalizeFieldValue(editPassengerFirstName),
                    last_name: normalizeFieldValue(editPassengerLastName),
                    weight: normalizeFieldValue(editPassengerWeight),
                    price: normalizeFieldValue(editPassengerPrice)
                };

                setBookingDetail(prev => {
                    if (!prev || !Array.isArray(prev.passengers)) return prev;
                    return {
                        ...prev,
                        passengers: prev.passengers.map(existingPassenger => (
                            existingPassenger.id === p.id
                                ? { ...existingPassenger, ...localPassengerPatch }
                                : existingPassenger
                        ))
                    };
                });

                setFlights(prevFlights => prevFlights.map(flight => {
                    if (flight.id !== bookingDetail.booking.id || !Array.isArray(flight.passengers)) {
                        return flight;
                    }
                    return {
                        ...flight,
                        passengers: flight.passengers.map(existingPassenger => (
                            existingPassenger.id === p.id
                                ? { ...existingPassenger, ...localPassengerPatch }
                                : existingPassenger
                        ))
                    };
                }));
            }
            
            if (isPlaceholder) {
                // Wait a bit to ensure database updates are committed
                await new Promise(resolve => setTimeout(resolve, 100));
                // Placeholder rows need a refetch to get the real passenger id.
                await fetchBookingDetail(bookingDetail.booking.id);
            } else {
                // Keep backend and UI in sync without blocking immediate UI update.
                setTimeout(() => {
                    fetchBookingDetail(bookingDetail.booking.id);
                }, 150);
            }
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

    // Close Flight Modal state
    const [closeFlightModalOpen, setCloseFlightModalOpen] = useState(false);
    const [selectedGroupFlightsForClose, setSelectedGroupFlightsForClose] = useState(null);
    const [operationalSelections, setOperationalSelections] = useState([]);
    const [operationalFields, setOperationalFields] = useState([]);
    const [selectedOperationalValues, setSelectedOperationalValues] = useState({});
    const [loadingOperationalSelections, setLoadingOperationalSelections] = useState(false);
    const [aircraftDefects, setAircraftDefects] = useState('');
    const [vehicleTrailerDefects, setVehicleTrailerDefects] = useState('');
    const [flightStartTime, setFlightStartTime] = useState(null);
    const [flightEndTime, setFlightEndTime] = useState(null);

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

    // Fetch operational selections
    const fetchOperationalSelections = async () => {
      setLoadingOperationalSelections(true);
      try {
        const response = await axios.get('/api/operational-selections');
        if (response.data?.success) {
          const data = response.data.data || [];
          // Group by field_name and collect values
          const fieldsMap = {};
          data.forEach(item => {
            if (!fieldsMap[item.field_name]) {
              fieldsMap[item.field_name] = {
                id: item.id,
                name: item.field_name,
                type: 'text',
                values: []
              };
            }
            if (item.field_value) {
              fieldsMap[item.field_name].values.push(item.field_value);
            }
          });
          
          // Default fields
          const defaultFields = [
            { id: 1, name: 'Refuel Location', type: 'text', values: [] },
            { id: 2, name: 'Land Owner Gift', type: 'text', values: [] },
            { id: 3, name: 'Landing Fee', type: 'text', values: [] },
            { id: 4, name: 'Vehicle Used', type: 'text', values: [] }
          ];
          
          // Merge with default fields
          const defaultFieldsMap = {};
          defaultFields.forEach(field => {
            defaultFieldsMap[field.name] = field;
          });
          
          // Combine default fields with fetched data
          const combinedFields = defaultFields.map(field => {
            if (fieldsMap[field.name]) {
              return {
                ...field,
                values: fieldsMap[field.name].values,
                id: fieldsMap[field.name].id
              };
            }
            return field;
          });
          
          // Add any new fields from database that aren't in defaults
          Object.keys(fieldsMap).forEach(fieldName => {
            if (!defaultFieldsMap[fieldName]) {
              combinedFields.push(fieldsMap[fieldName]);
            }
          });
          
          setOperationalFields(combinedFields);
          setOperationalSelections(data);
        }
      } catch (error) {
        console.error('Error fetching operational selections:', error);
        setOperationalSelections([]);
      } finally {
        setLoadingOperationalSelections(false);
      }
    };

    // Handler to close flight (Log Flight - set status to Flown)
    const handleCloseFlight = (groupFlights) => {
      if (!groupFlights || groupFlights.length === 0) return;
      
      // Open Log Flight modal - allow for both Open and Closed (SOLD OUT) flights
      setSelectedGroupFlightsForClose(groupFlights);
      fetchOperationalSelections();
      setCloseFlightModalOpen(true);
    };

    // Handler to confirm close flight with operational selections
    const handleConfirmCloseFlight = async () => {
      if (!selectedGroupFlightsForClose || selectedGroupFlightsForClose.length === 0) return;
      
      const first = selectedGroupFlightsForClose[0];
      setStatusLoadingGroup(first.id);
      setCloseFlightModalOpen(false);
      
      try {
        // 1. Save operational selections to trip_booking for ALL bookings in the group
        // (flown-flights API uses MIN(booking_id) per group, so saving for all ensures data is found)
        try {
          await Promise.all(selectedGroupFlightsForClose.map(f =>
            axios.post('/api/save-flight-operational-selections', {
              booking_id: f.id,
              operational_selections: selectedOperationalValues,
              aircraft_defects: aircraftDefects,
              vehicle_trailer_defects: vehicleTrailerDefects,
              flight_start_time: formatOperationalTimeForPayload(flightStartTime),
              flight_end_time: formatOperationalTimeForPayload(flightEndTime)
            })
          ));
        } catch (err) {
          console.error('Error saving operational selections:', err);
          // Continue with closing flight even if saving selections fails
        }

        // 2. Update booking status to Flown
        await Promise.all(selectedGroupFlightsForClose.map(f =>
          axios.post('/api/updateBookingStatusToFlown', {
            booking_id: f.id
          })
        ));
        
        // 3. Calculate total pax for all groupFlights
        const totalPax = selectedGroupFlightsForClose.reduce((sum, f) => sum + (f.passengers ? f.passengers.length : 0), 0);
        
        // 4. Update availability
        await axios.patch('/api/updateManifestStatus', {
          booking_id: first.id,
          old_status: 'Open',
          new_status: 'Closed',
          flight_date: first.flight_date,
          location: first.location,
          total_pax: totalPax
        });
        
        // 5. Update UI state
        setFlights(prev => prev.map(f =>
          selectedGroupFlightsForClose.some(gf => gf.id === f.id)
            ? { ...f, status: 'Flown', manual_status_override: 0 } // Status = Flown
            : f
        ));
        
        // 6. Refetch availabilities
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

        // Reset selections
        setSelectedOperationalValues({});
        setAircraftDefects('');
        setVehicleTrailerDefects('');
        setFlightStartTime(null);
        setFlightEndTime(null);
        setSelectedGroupFlightsForClose(null);
      } catch (err) {
        alert('Failed to log flight: ' + (err.response?.data?.message || err.message));
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

    const slotKey = React.useCallback((activityId, date, time, segment = '') => {
        const seg = segment === null || segment === undefined ? '' : String(segment);
        return `${activityId}_${date}_${time}_${seg}`;
    }, []);

    // Private vs Shared at same activity/date/time need distinct crew/pilot keys (matches server slot_segment)
    const getManifestSlotSegment = React.useCallback((flight) => {
        if (!flight) return '';
        const ft = String(flight.flight_type || flight.experience || '').trim();
        const lower = ft.toLowerCase();
        if (lower.includes('private')) return 'private';
        if (lower.includes('shared')) return 'shared';
        return '';
    }, []);

    // Normalize flight_date to (YYYY-MM-DD, HH:mm) for slot key consistency with crew-assignments API
    const getSlotPartsFromFlightDate = React.useCallback((flightDate) => {
        if (!flightDate) return { datePart: '', timePart: '' };
        const parsed = dayjs(flightDate, ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DDTHH:mm', 'YYYY-MM-DD HH:mm', 'DD/MM/YYYY HH:mm', 'DD/MM/YYYY']);
        if (!parsed.isValid()) {
            const s = String(flightDate);
            return { datePart: s.substring(0, 10), timePart: s.length >= 16 ? s.substring(11, 16) : (s.length >= 13 ? s.substring(11, 13) + ':' + (s.substring(13, 15) || '00') : '') };
        }
        return { datePart: parsed.format('YYYY-MM-DD'), timePart: parsed.format('HH:mm') };
    }, []);

    // Try to resolve activity id from various possible shapes on flight objects
    const getFlightActivityId = (flight) => {
        if (!flight) return null;
        return flight.activity_id ?? flight.activityId ?? flight.activityID ?? (flight.activity && (flight.activity.id ?? flight.activity.activity_id)) ?? null;
    };

    const refreshCrewAssignments = React.useCallback(async (date) => {
        if (!date) return;
        // Prevent duplicate, rapid calls for the same date
        if (lastCrewFetchRef.current.inFlight && lastCrewFetchRef.current.date === date) {
            return;
        }
        // If we already fetched this date and it's not in flight, skip
        if (lastCrewFetchRef.current.date === date && !lastCrewFetchRef.current.inFlight) {
            return;
        }
        try {
            lastCrewFetchRef.current = { date, inFlight: true };
            const res = await axios.get('/api/crew-assignments', { params: { date } });

            // Populate assignments from API response
            const assignments = {};
            if (Array.isArray(res?.data?.data)) {
                res.data.data.forEach((assignment) => {
                    if (assignment.activity_id && assignment.date && assignment.time && assignment.crew_id) {
                        // Normalize date: handle ISO format ("2026-03-03T00:00:00.000Z") or YYYY-MM-DD
                        let normalizedDate = assignment.date;
                        if (normalizedDate.includes('T')) {
                            normalizedDate = normalizedDate.substring(0, 10); // Extract YYYY-MM-DD
                        }
                        
                        // Normalize time: handle HH:mm:ss format ("07:00:00") to HH:mm ("07:00")
                        let normalizedTime = assignment.time;
                        if (normalizedTime && normalizedTime.length >= 5) {
                            normalizedTime = normalizedTime.substring(0, 5); // Extract HH:mm
                        }
                        
                        const segment = assignment.slot_segment != null && assignment.slot_segment !== undefined
                            ? String(assignment.slot_segment)
                            : '';
                        const slotKeyValue = slotKey(assignment.activity_id, normalizedDate, normalizedTime, segment);
                        assignments[slotKeyValue] = assignment.crew_id;
                    }
                });
            }

            setCrewAssignmentsBySlot(assignments);
        } catch (err) {
            console.error('Error refreshing crew assignments:', err);
            setCrewAssignmentsBySlot({});
        } finally {
            lastCrewFetchRef.current.inFlight = false;
        }
    }, [slotKey]);

    const refreshPilotAssignments = React.useCallback(async (date) => {
        if (!date) return;
        // Prevent duplicate, rapid calls for the same date
        if (lastPilotFetchRef.current.inFlight && lastPilotFetchRef.current.date === date) {
            return;
        }
        // If we already fetched this date and it's not in flight, skip
        if (lastPilotFetchRef.current.date === date && !lastPilotFetchRef.current.inFlight) {
            return;
        }
        try {
            lastPilotFetchRef.current = { date, inFlight: true };
            const res = await axios.get('/api/pilot-assignments', { params: { date } });

            // Populate assignments from API response
            const assignments = {};
            if (Array.isArray(res?.data?.data)) {
                res.data.data.forEach((assignment) => {
                    if (assignment.activity_id && assignment.date && assignment.time && assignment.pilot_id) {
                        // Normalize date: handle ISO format ("2026-03-03T00:00:00.000Z") or YYYY-MM-DD
                        let normalizedDate = assignment.date;
                        if (normalizedDate.includes('T')) {
                            normalizedDate = normalizedDate.substring(0, 10); // Extract YYYY-MM-DD
                        }
                        
                        // Normalize time: handle HH:mm:ss format ("07:00:00") to HH:mm ("07:00")
                        let normalizedTime = assignment.time;
                        if (normalizedTime && normalizedTime.length >= 5) {
                            normalizedTime = normalizedTime.substring(0, 5); // Extract HH:mm
                        }
                        
                        const segment = assignment.slot_segment != null && assignment.slot_segment !== undefined
                            ? String(assignment.slot_segment)
                            : '';
                        const slotKeyValue = slotKey(assignment.activity_id, normalizedDate, normalizedTime, segment);
                        assignments[slotKeyValue] = assignment.pilot_id;
                    }
                });
            }

            setPilotAssignmentsBySlot(assignments);
        } catch (err) {
            console.error('Error refreshing pilot assignments:', err);
            setPilotAssignmentsBySlot({});
        } finally {
            lastPilotFetchRef.current.inFlight = false;
        }
    }, [slotKey]);

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
    const clearCrewAssignment = async (activityId, flightDateStr, slotSegment = '') => {
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
                crew_id: null,
                slot_segment: slotSegment
            });
            
            const slotKeyValue = slotKey(activityId, date, time.substring(0,5), slotSegment);
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
    const clearPilotAssignment = async (activityId, flightDateStr, slotSegment = '') => {
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
                pilot_id: null,
                slot_segment: slotSegment
            });
            
            const slotKeyValue = slotKey(activityId, date, time.substring(0,5), slotSegment);
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

    // Fetch crew assignments ONLY when selectedDate changes
    useEffect(() => {
        if (selectedDate) {
            refreshCrewAssignments(selectedDate);
        }
    }, [selectedDate, refreshCrewAssignments]); // Only when selectedDate changes

    // Fetch pilot assignments ONLY when selectedDate changes
    useEffect(() => {
        if (selectedDate) {
            refreshPilotAssignments(selectedDate);
        }
    }, [selectedDate, refreshPilotAssignments]); // Only when selectedDate changes

    const handleCrewChange = async (activityId, flightDateStr, crewId, slotSegment = '') => {
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
                crew_id: normalizedCrewId,
                slot_segment: slotSegment
            });
            console.log('Crew assignment saved:', response.data);
            
            const slotKeyValue = slotKey(normalizedActivityId, date, time.substring(0,5), slotSegment);
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

    const handlePilotChange = async (activityId, flightDateStr, pilotId, slotSegment = '') => {
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
                pilot_id: normalizedPilotId,
                slot_segment: slotSegment
            });
            console.log('Pilot assignment saved:', response.data);
            
            const slotKeyValue = slotKey(normalizedActivityId, date, time.substring(0,5), slotSegment);
            console.log('Updating local state with key:', slotKeyValue, 'value:', normalizedPilotId);
            
            // Update local state immediately for instant feedback
            setPilotAssignmentsBySlot(prev => {
                const updated = { ...prev, [slotKeyValue]: normalizedPilotId };
                console.log('Updated pilot assignments:', updated);
                return updated;
            });
            
            // Also refresh from server to ensure consistency (cache will prevent duplicate calls)
            await refreshPilotAssignments(date);
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
                <Box sx={{ padding: isMobile ? 1 : 3, background: '#f4f7fc', borderRadius: '22px', border: '1px solid #e1e8f3' }}>
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
                            flexDirection: isMobile ? 'row' : 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: isMobile ? 1 : 2
                        }}>
                            {isMobile ? (
                                <>
                                    {/* Mobile: Navigation buttons on the sides of date picker */}
                                    <IconButton onClick={() => {
                                        const newDate = dayjs(selectedDate).subtract(1, 'day').format('YYYY-MM-DD');
                                        console.log('Date navigation: going back to', newDate);
                                        setSelectedDate(newDate);
                                    }} className="manifest-nav-buttons" sx={{ minWidth: 'auto', padding: '8px' }}>
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
                                    }} className="manifest-nav-buttons" sx={{ minWidth: 'auto', padding: '8px' }}>
                                        <ArrowForwardIosIcon />
                                    </IconButton>
                                </>
                            ) : (
                                <>
                                    {/* Desktop: Keep original layout */}
                                    <IconButton onClick={() => {
                                        const newDate = dayjs(selectedDate).subtract(1, 'day').format('YYYY-MM-DD');
                                        console.log('Date navigation: going back to', newDate);
                                        setSelectedDate(newDate);
                                    }} className="manifest-nav-buttons">
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
                                    }} className="manifest-nav-buttons">
                                        <ArrowForwardIosIcon />
                                    </IconButton>
                                </>
                            )}
                        </Box>
                        <Box sx={{ width: '100%', maxWidth: 760, mx: 'auto', mt: isMobile ? 1.5 : 2.5 }}>
                            <Card variant="outlined" sx={{ borderColor: '#dbe4f0', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
                                <CardContent sx={{ p: isMobile ? 2 : 2.5, '&:last-child': { pb: isMobile ? 2 : 2.5 } }}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        minRows={2}
                                        maxRows={5}
                                        placeholder="Add a short reminder for this manifest date..."
                                        value={manifestDateNoteDraft}
                                        onChange={(event) => setManifestDateNoteDraft(event.target.value)}
                                        disabled={manifestDateNoteLoading}
                                        onBlur={handleManifestDateNoteBlur}
                                        inputProps={{
                                            'aria-busy': manifestDateNoteSaving
                                        }}
                                    />
                                </CardContent>
                            </Card>
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
                            const isSharedFlightType = String(first?.flight_type || first?.experience || '')
                                .toLowerCase()
                                .includes('shared');
                            const getInitialAvailableTotal = (slot) => {
                                if (!slot) return null;
                                if (isSharedFlightType) {
                                    const sharedCapacityNum = parseNumeric(slot.shared_capacity);
                                    if (sharedCapacityNum !== null) {
                                        return sharedCapacityNum;
                                    }
                                }
                                // Capacity is the source of truth for total pax on manifest.
                                // Using available+booked can drift and incorrectly mark flights as full.
                                const capacityNum = parseNumeric(slot.capacity);
                                if (capacityNum !== null) {
                                    return isSharedFlightType ? Math.min(capacityNum, 8) : capacityNum;
                                }
                                const availableNum = parseNumeric(slot.available);
                                const bookedNum = parseNumeric(slot.booked);
                                if (availableNum !== null && bookedNum !== null) {
                                    const inferredCapacity = availableNum + bookedNum;
                                    return isSharedFlightType ? Math.min(inferredCapacity, 8) : inferredCapacity;
                                }
                                return null;
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
                            }, 0).toFixed(2);
                            
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
                                                    gap: isMobile ? 0.5 : 1,
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
                                                            <Box display="flex" alignItems="center">
                                                                <Typography>Pax Booked: {paxBookedDisplay} / {paxTotalDisplay}</Typography>
                                                            </Box>
                                                            <Box display="flex" alignItems="center">
                                                                <Typography>Balloon Resource: {balloonResource}</Typography>
                                                            </Box>
                                                            <Box display="flex" alignItems="center">
                                                    <Typography>Status: <span
   style={{ color: status === 'Closed' ? 'red' : 'green', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
   onClick={() => handleToggleGroupStatus(groupFlights)}
 >{status}{statusLoadingGroup === first.id ? '...' : ''}</span></Typography>
                                                    </Box>
                                                            <Box display="flex" alignItems="center">
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
                                                        const { datePart, timePart } = getSlotPartsFromFlightDate(first.flight_date);
                                                        const manifestSeg = getManifestSlotSegment(first);
                                                        const slotKeyValue = slotKey(activityIdForSlot, datePart, timePart, manifestSeg);
                                                        const currentCrewId = crewAssignmentsBySlot[slotKeyValue];
                                                        const isActivityIdValid = activityIdForSlot !== null && activityIdForSlot !== undefined && !isNaN(activityIdForSlot);
                                                        const selectedCrew = crewList.find(c => c.id == currentCrewId);
                                                        const crewDisplayName = selectedCrew ? `${selectedCrew.first_name} ${selectedCrew.last_name}` : 'Crew';
                                                        
                                                        return (
                                                            <Select
                                                                native
                                                                value={currentCrewId || ''}
                                                                onChange={(e) => handleCrewChange(activityIdForSlot, first.flight_date, e.target.value, manifestSeg)}
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
                                                        const { datePart, timePart } = getSlotPartsFromFlightDate(first.flight_date);
                                                        const manifestSeg = getManifestSlotSegment(first);
                                                        const slotKeyValue = slotKey(activityIdForSlot, datePart, timePart, manifestSeg);
                                                        const currentPilotId = pilotAssignmentsBySlot[slotKeyValue];
                                                        const isActivityIdValid = activityIdForSlot !== null && activityIdForSlot !== undefined && !isNaN(activityIdForSlot);
                                                        const selectedPilot = pilotList.find(p => p.id == currentPilotId);
                                                        const pilotDisplayName = selectedPilot ? `${selectedPilot.first_name} ${selectedPilot.last_name}` : 'Pilot';
                                                        
                                                        return (
                                                            <Select
                                                                native
                                                                value={currentPilotId || ''}
                                                                onChange={(e) => handlePilotChange(activityIdForSlot, first.flight_date, e.target.value, manifestSeg)}
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
                                                mt: isMobile ? 0.25 : 2,
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
                            const { datePart, timePart } = getSlotPartsFromFlightDate(first.flight_date);
                            const manifestSeg = getManifestSlotSegment(first);
                            const slotKeyValue = slotKey(activityIdForSlot, datePart, timePart, manifestSeg);
                            const currentCrewId = crewAssignmentsBySlot[slotKeyValue];
                            
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
                                        onChange={(e) => handleCrewChange(activityIdForSlot, first.flight_date, e.target.value, manifestSeg)}
                                        disabled={!isActivityIdValid}
                                        sx={{ 
                                            minWidth: 140, 
                                            maxWidth: 160,
                                            mr: 1, 
                                            background: isActivityIdValid ? '#fff' : '#f3f4f6',
                                            opacity: isActivityIdValid ? 1 : 0.6,
                                            fontSize: 13,
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
                                        mr: 2
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
                            const { datePart, timePart } = getSlotPartsFromFlightDate(first.flight_date);
                            const manifestSeg = getManifestSlotSegment(first);
                            const slotKeyValue = slotKey(activityIdForSlot, datePart, timePart, manifestSeg);
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
                                        onChange={(e) => handlePilotChange(activityIdForSlot, first.flight_date, e.target.value, manifestSeg)}
                                        disabled={!isActivityIdValid}
                                        sx={{ 
                                            minWidth: 140, 
                                            maxWidth: 160,
                                            mr: 1, 
                                            background: isActivityIdValid ? '#fff' : '#f3f4f6',
                                            opacity: isActivityIdValid ? 1 : 0.6,
                                            fontSize: 13,
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
                                        mr: 2
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
                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        <Button variant="contained" color="primary" sx={{ minWidth: 90, fontWeight: 600, textTransform: 'none' }} onClick={() => handleOpenBookingModal(first)}>Book</Button>
                                                    </Box>
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
                                                <MenuItem onClick={() => handleGlobalMenuAction('sendMessageAllGuests')}>Send Message to Guests</MenuItem>
                                                <MenuItem 
                                                    onClick={() => {
                                                        handleGlobalMenuClose();
                                                        if (globalMenuGroupFlights && globalMenuGroupFlights.length > 0) {
                                                            handleCloseFlight(globalMenuGroupFlights);
                                                        }
                                                    }}
                                                    disabled={!globalMenuGroup || statusLoadingGroup === (globalMenuGroup?.id)}
                                                    sx={{
                                                        color: '#d32f2f',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(211, 47, 47, 0.08)'
                                                        },
                                                        '&.Mui-disabled': {
                                                            color: 'rgba(0, 0, 0, 0.26)'
                                                        }
                                                    }}
                                                >
                                                    {statusLoadingGroup === (globalMenuGroup?.id) ? 'Logging...' : 'Log Flight'}
                                                </MenuItem>
                                            </Menu>
                                        </Box>
                                        <Divider sx={{ marginY: isMobile ? 0.5 : 2 }} />
                                        <TableContainer component={Paper} sx={{ marginTop: isMobile ? 0.5 : 2 }} className="manifest-table-container">
                                            <Table className="manifest-table">
                                                <TableHead sx={{ marginTop: 2, background: "#d3d3d3", color: "#000" }}>
                                                    <TableRow>
                                                        <TableCell sx={isMobile ? { width: '74px', minWidth: '74px', maxWidth: '74px', padding: '8px 8px', fontSize: '12px', whiteSpace: 'nowrap' } : {}}>Booking ID</TableCell>
                                                        <TableCell sx={isMobile ? { minWidth: '128px', width: '128px', padding: '8px 8px', fontSize: '12px', whiteSpace: 'nowrap' } : {}}>Name</TableCell>
                                                        <TableCell>Weight</TableCell>
                                                        <TableCell>Mobile</TableCell>
                                                        <TableCell>Email</TableCell>
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
                                                        const isNewtBooking = isTheNewtBooking(flight);
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
                                                                <TableCell sx={isMobile ? { width: '74px', minWidth: '74px', maxWidth: '74px', padding: '8px 8px', whiteSpace: 'nowrap' } : {}}>
                                                                    <span style={{ 
                                                                        color: '#3274b4', 
                                                                        cursor: 'pointer', 
                                                                        textDecoration: 'underline',
                                                                        fontSize: isMobile ? '12px' : 'inherit'
                                                                    }}
                                                                        onClick={() => handleNameClick(flight.id)}>
                                                                        {flight.id || ''}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell sx={isMobile ? { minWidth: '128px', width: '128px', padding: '8px 8px' } : {}}>
                                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', maxWidth: '100%' }}>
                                                                        <span style={{ 
                                                                            color: 'rgb(50, 116, 180)', 
                                                                            cursor: 'pointer', 
                                                                            textDecoration: 'none',
                                                                            fontSize: isMobile ? '12px' : '0.875rem',
                                                                        }}
                                                                            onClick={() => handleNameClick(flight.id)}>
                                                                            {firstPassenger ? `${firstPassenger.first_name || ''} ${firstPassenger.last_name || ''}`.trim() : (flight.name || '')}
                                                                        </span>
                                                                        {isNewtBooking ? (
                                                                            <span role="img" aria-label="The Newt booking">
                                                                                🦎
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                    {Array.isArray(flight.passengers) && flight.passengers.length > 1 && (
                                                                        <div style={{ marginTop: 4 }}>
                                                                            {flight.passengers.slice(1).map((p, i) => (
                                                                                <div key={`${flight.id}-p-${i+1}`} style={{ 
                                                                                    color: 'rgb(50, 116, 180)', 
                                                                                    fontSize: isMobile ? '12px' : '0.875rem',
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
                                                                                    fontSize: isMobile ? '12px' : '0.875rem',
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
                                                                <TableCell>
                                                                    {(() => {
                                                                        // Prefer booking-level phone (synced with Booking Details "Phone" field)
                                                                        // but if there is a more recent bookingFieldUpdate in memory/localStorage,
                                                                        // use that as the canonical source of truth to avoid later refetches
                                                                        // overwriting the displayed Mobile value.

                                                                        let latestUpdatedPhone = null;

                                                                        if (typeof window !== 'undefined') {
                                                                            // 1) In-memory updates (same tab)
                                                                            const memUpdates = window.__bookingFieldUpdates || {};
                                                                            const memUpdate = memUpdates[String(flight.id)];
                                                                            if (memUpdate && memUpdate.field === 'phone' && memUpdate.value) {
                                                                                latestUpdatedPhone = memUpdate.value;
                                                                            }

                                                                            // 2) Persistent queue in localStorage (other tabs / future mounts)
                                                                            if (!latestUpdatedPhone) {
                                                                                try {
                                                                                    const raw = window.localStorage.getItem('bookingFieldUpdates');
                                                                                    if (raw) {
                                                                                        const updates = JSON.parse(raw);
                                                                                        if (Array.isArray(updates)) {
                                                                                            // Find the last phone update for this bookingId
                                                                                            for (let i = updates.length - 1; i >= 0; i--) {
                                                                                                const u = updates[i];
                                                                                                if (u && String(u.bookingId) === String(flight.id) && u.field === 'phone' && u.value) {
                                                                                                    latestUpdatedPhone = u.value;
                                                                                                    break;
                                                                                                }
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                } catch (err) {
                                                                                    console.warn('Manifest: failed to read bookingFieldUpdates from localStorage', err);
                                                                                }
                                                                            }
                                                                        }

                                                                        const displayMobile =
                                                                            latestUpdatedPhone ||
                                                                            flight.phone ||
                                                                            (firstPassenger?.mobile || firstPassenger?.phone || flight.mobile || '');

                                                                        if (!displayMobile) return '';

                                                                        const cleanPhone = String(displayMobile)
                                                                            .replace(/[\s\-()]/g, '')
                                                                            .trim();

                                                                        return cleanPhone ? (
                                                                            <a
                                                                                href={`tel:${cleanPhone}`}
                                                                                style={{
                                                                                    color: '#3274b4',
                                                                                    textDecoration: 'underline',
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                            >
                                                                                {displayMobile}
                                                                            </a>
                                                                        ) : displayMobile;
                                                                    })()}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {(() => {
                                                                        const displayEmail =
                                                                            flight.email ||
                                                                            firstPassenger?.email ||
                                                                            '';

                                                                        if (!displayEmail) return '';

                                                                        return (
                                                                            <a
                                                                                href={`mailto:${displayEmail}`}
                                                                                style={{
                                                                                    color: '#3274b4',
                                                                                    textDecoration: 'underline',
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                            >
                                                                                {displayEmail}
                                                                            </a>
                                                                        );
                                                                    })()}
                                                                </TableCell>
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
                                                                            // Refetch booking data to ensure backend changes are reflected
                                                                            if (typeof bookingHook.refetch === 'function') {
                                                                                await bookingHook.refetch();
                                                                            }
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
                                                            </TableRow>
                                                        );
                                                    })}
                                                    {/* Move the summary row here, inside TableBody */}
                                                    <TableRow>
                                                        {isMobile ? (
                                                            <TableCell 
                                                                colSpan={9}
                                                                className="manifest-total-price-mobile"
                                                                sx={{ 
                                                                    textAlign: 'left', 
                                                                    fontWeight: 600, 
                                                                    background: '#f5f5f5',
                                                                    fontSize: '5px',
                                                                    padding: '8px 4px',
                                                                    whiteSpace: 'nowrap',
                                                                    verticalAlign: 'middle',
                                                                    overflow: 'visible',
                                                                    lineHeight: '1.4',
                                                                    wordBreak: 'normal',
                                                                    width: '100%'
                                                                }}
                                                            >
                                                                Total Price: £{groupFlights.reduce((sum, f) => sum + (parseFloat(f.paid) || 0), 0).toFixed(2)} | Total Weight: {totalWeightDisplay} kg | Total Pax: {passengerCountDisplay}
                                                            </TableCell>
                                                        ) : (
                                                            <TableCell 
                                                                colSpan={10} 
                                                                sx={{ 
                                                                    textAlign: 'right', 
                                                                    fontWeight: 600, 
                                                                    background: '#f5f5f5',
                                                                    fontSize: 'inherit',
                                                                    padding: '10px',
                                                                    whiteSpace: 'normal'
                                                                }}
                                                            >
                                                                                                            Total Price: £{groupFlights.reduce((sum, f) => sum + (parseFloat(f.paid) || 0), 0).toFixed(2)} &nbsp;&nbsp;|
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
            <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="xl" fullWidth
                PaperProps={{
                    sx: {
                        ...(isMobile ? {
                            margin: '8px',
                            maxHeight: 'calc(100% - 16px)',
                            height: 'calc(100% - 16px)',
                            width: 'calc(100vw - 16px)',
                            maxWidth: 'calc(100vw - 16px)'
                        } : {}),
                        borderRadius: isMobile ? '14px' : '18px',
                        overflow: 'hidden',
                        border: '1px solid #dce2f7',
                        boxShadow: '0 20px 50px rgba(20, 27, 43, 0.18)'
                    }
                }}
            >
                <DialogTitle sx={{ background: '#ffffff', borderBottom: '1px solid #e5ebf5', py: 2.5, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography sx={{ fontWeight: 800, fontSize: isMobile ? 28 : 40, lineHeight: 1, color: '#0053db' }}>
                                Booking Details
                            </Typography>
                            <Typography sx={{ mt: 0.5, color: '#6b7280', fontWeight: 600, fontSize: isMobile ? 14 : 18 }}>
                                Reference ID: {bookingDetail?.booking?.id || '-'}
                            </Typography>
                        </Box>
                        <IconButton onClick={() => setDetailDialogOpen(false)}>
                            <Typography sx={{ fontSize: 32, lineHeight: 1, color: '#111827' }}>x</Typography>
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent style={{ background: '#ffffff', minHeight: isMobile ? 'auto' : 520, paddingTop: 0, paddingLeft: 0, paddingRight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
                    {loadingDetail ? (
                        <Typography>Loading...</Typography>
                    ) : detailError ? (
                        <Typography color="error">{detailError}</Typography>
                    ) : bookingDetail && bookingDetail.success ? (
                        <Box sx={{ display: 'flex', width: '100%', minWidth: 0, overflowX: 'hidden' }}>
                            {!isMobile && (
                                <Box sx={{ width: 230, background: '#f2f4ff', borderRight: '1px solid #e4e9f5', p: 2 }}>
                                    <Typography sx={{ color: '#7a8194', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 2 }}>
                                        Quick Actions
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                                        <Button variant="contained" onClick={handleRebook} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, background: '#0f9f75', '&:hover': { background: '#0b8a64' } }}>Rebook</Button>
                                        <Button variant="contained" onClick={handleAddGuestClick} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, background: '#189c99', '&:hover': { background: '#147f7d' } }}>Add Guest</Button>
                                        <Button variant="contained" onClick={handleCancelFlight} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, background: '#e11d48', '&:hover': { background: '#be123c' } }}>Cancel Flight</Button>
                                        <Button variant="contained" onClick={handleEmailBooking} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, background: '#2563eb', '&:hover': { background: '#1d4ed8' } }}>Email | SMS</Button>
                                        <Button
                                            variant="contained"
                                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, background: '#7c3aed', '&:hover': { background: '#6d28d9' } }}
                                            onClick={() => bookingDetail?.booking && handleMessagesClick(bookingDetail.booking)}
                                            disabled={!bookingDetail?.booking}
                                        >
                                            Messages
                                        </Button>
                                        <Button
                                            variant="contained"
                                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, background: '#c026d3', '&:hover': { background: '#a21caf' } }}
                                            onClick={() => {
                                                if (bookingDetail?.booking?.id) {
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
                                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, background: '#64748b', '&:hover': { background: '#475569' } }}
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
                            )}
                            <Box sx={{ flex: 1, p: isMobile ? 2 : 3, minWidth: 0 }}>
                            <Grid container spacing={isMobile ? 1 : 2}>
                                {/* Personal Details */}
                                <Grid item xs={12} md={4}>
                                    <Box sx={{ background: '#f7f9ff', borderRadius: 3, p: isMobile ? 1.5 : 2, mb: isMobile ? 1 : 2, border: '1px solid #dce2f7', boxShadow: 'none' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: isMobile ? 0.5 : 1, fontSize: isMobile ? '16px' : 'inherit' }}>Personal Details</Typography>
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
                                                    return renderBookingNameWithIndicators(
                                                        bookingDetail.booking.name || passenger1Name || '-',
                                                        { isNewtBooking: bookingDetailIsNewtBooking }
                                                    );
                                                })()}
                                                <IconButton size="small" onClick={() => {
                                                    const passenger1 = bookingDetail.passengers && bookingDetail.passengers.length > 0 
                                                        ? bookingDetail.passengers[0] 
                                                        : null;
                                                    const passenger1Name = passenger1 
                                                        ? `${passenger1.first_name || ''} ${passenger1.last_name || ''}`.trim() 
                                                        : '';
                                                    handleEditClick(
                                                        'name',
                                                        bookingDetail.booking.name || passenger1Name || ''
                                                    );
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
                                                {(() => {
                                                    const phoneValue = bookingDetail.booking.phone || '-';

                                                    if (phoneValue && phoneValue !== '-') {
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
                                        <Typography><b>Email:</b> {editField === 'email' ? (
                                            <>
                                                <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{marginRight: 8}} />
                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                            </>
                                        ) : (
                                            <>
                                                {(() => {
                                                    const passenger1Email = bookingDetail.passengers?.[0]?.email;
                                                    const emailValue = bookingDetail.booking.email || passenger1Email || '-';

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
                                                    onClick={() => {
                                                        const passenger1Email = bookingDetail.passengers?.[0]?.email;
                                                        const emailToEdit = bookingDetail.booking.email || passenger1Email || '';
                                                        handleEditClick('email', emailToEdit);
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
                                        <Typography><b>Flight Attempts:</b> {editField === 'flight_attempts' ? (
  <>
    <input value={editValue} onChange={e => setEditValue(e.target.value.replace(/[^0-9]/g, ''))} style={{marginRight: 8, width: 60}} />
    <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
    <Button size="small" onClick={handleEditCancel}>Cancel</Button>
  </>
) : (
  <>
    {bookingDetail.booking.flight_attempts ?? 0}
    <IconButton 
        size="small" 
        onClick={() => handleEditClick('flight_attempts', String(bookingDetail.booking.flight_attempts ?? 0))}
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
        // Format the persisted expires date for display.
        // Any 6-month extension must already be written by the backend.
        const formatExpiresDate = (expiresDate) => {
          return formatAdminDate(expiresDate, 'DD/MM/YY');
        };

        return formatExpiresDate(bookingDetail.booking.expires);
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
                                    </Box>
                                    {/* Additional section removed - information is now displayed in Additional Information section */}
                                    {/* Add On */}
                                    <Box sx={{ background: '#f7f9ff', borderRadius: 3, p: isMobile ? 1.5 : 2, mb: isMobile ? 1 : 2, border: '1px solid #dce2f7', boxShadow: 'none' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: isMobile ? 0.5 : 1, fontSize: isMobile ? '16px' : 'inherit' }}>Add On's</Typography>
                                        
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
                                            {bookingHasWeatherRefund(bookingDetail) ? (
                                                <span>
                                                    <span style={{ color: '#10b981', fontWeight: 'bold', marginRight: '4px' }}>✔</span>
                                                    Yes
                                                </span>
                                            ) : 'No'}
                                        </Typography>

                                    </Box>
                                </Grid>
                                {/* Main Details */}
                                <Grid item xs={12} md={8}>
                                    <Box sx={{ background: '#f8faff', borderRadius: 3, p: isMobile ? 1.5 : 2, border: '1px solid #dce2f7', boxShadow: 'none' }}>
                                        {/* Current Booking */}
                                        <Box sx={{ mb: isMobile ? 1 : 2, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-start', justifyContent: 'space-between', gap: isMobile ? 1 : 0 }}>
                                            <Box sx={{ flex: 1, width: '100%', minWidth: 0 }}>
                                                <Typography variant="h6" sx={{ fontWeight: 700, mb: isMobile ? 0.5 : 1, fontSize: isMobile ? '16px' : 'inherit' }}>Current Booking</Typography>
                                                <Typography><b>Activity:</b> {bookingDetail.booking.experience || bookingDetail.booking.flight_type || '-'} - {bookingDetail.booking.location}</Typography>
                                                {bookingDetail.booking.status !== 'Cancelled' && (
                                                    <Typography><b>Booked For:</b> {bookingDetail.booking.flight_date ? (
                                                        <a
                                                            href={`https://flyawayballooning-system.com/manifest?date=${dayjs(bookingDetail.booking.flight_date).format('YYYY-MM-DD')}&time=${dayjs(bookingDetail.booking.flight_date).format('HH:mm')}`}
                                                            style={{ color: '#3274b4', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                                                        >
                                                            {(() => {
                                                                // Parse flight_date as local time (no timezone conversion) to avoid date shift
                                                                // flight_date is stored as "YYYY-MM-DD HH:mm:ss" string without timezone info
                                                                const flightDateStr = bookingDetail.booking.flight_date;
                                                                if (typeof flightDateStr === 'string' && flightDateStr.match(/^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}/)) {
                                                                    // Parse as local time to avoid timezone conversion
                                                                    const [datePart, timePart] = flightDateStr.split(/[\sT]/);
                                                                    const [year, month, day] = datePart.split('-');
                                                                    const [hour, minute] = (timePart || '00:00').split(':');
                                                                    // Create date in local timezone (no UTC conversion)
                                                                    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
                                                                    return dayjs(localDate).format('DD/MM/YYYY HH:mm');
                                                                }
                                                                // Fallback to dayjs parsing if format doesn't match
                                                                return dayjs(bookingDetail.booking.flight_date).format('DD/MM/YYYY HH:mm');
                                                            })()}
                                                        </a>
                                                    ) : '-'}</Typography>
                                                )}
                                                {(() => {
                                                    const b = bookingDetail.booking || {};
                                                    const v = bookingDetail.voucher || {};
                                                    const originalVoucher = bookingDetail.originalVoucher || null;
                                                    const redeemed = (b.redeemed === true) || (b.voucher_redeemed === 1) || (typeof b.redeemed_at === 'string' && b.redeemed_at) || (v.redeemed === 'Yes' || v.redeemed === true) || (b.redeemed_voucher === 'Yes');
                                                    
                                                    // For redeemed vouchers created via createRedeemBooking, show the REDEEMED voucher code
                                                    // This is the voucher code that was used to redeem (e.g., GATVZ2HW55)
                                                    // The booking.voucher_code field now contains the newly generated voucher code (for All Bookings table)
                                                    // The originalRedeemedVoucherCode field contains the redeemed voucher code (for popup display)
                                                    const voucherCodeToDisplay = b.originalRedeemedVoucherCode || b.voucher_code || '';
                                                    
                                                    return (
                                                        <Typography>
                                                            <b>Redeemed Voucher:</b> {redeemed ? <span style={{ color: 'green', fontWeight: 600 }}>Yes</span> : <span style={{ color: 'red', fontWeight: 600 }}>No</span>} <span style={{ fontWeight: 500 }}>{voucherCodeToDisplay}</span>
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
                                                {manualBookingFields.length > 0 && (
                                                    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, border: '1px solid #e0e7ff', background: '#f7f9ff' }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1d4ed8', mb: 0.75 }}>
                                                            Hotel Manual Booking Details
                                                        </Typography>
                                                        {manualBookingFields.map((field) => (
                                                            <Typography key={field.label} sx={{ mb: 0.5 }}>
                                                                <b>{field.label}:</b> {field.value}
                                                            </Typography>
                                                        ))}
                                                    </Box>
                                                )}
                                            </Box>
                                            <Box sx={{
                                                display: isMobile ? 'flex' : 'none',
                                                flexDirection: 'column',
                                                flexWrap: 'nowrap',
                                                gap: isMobile ? '10px' : 1, 
                                                minWidth: isMobile ? 0 : 140,
                                                width: isMobile ? '100%' : 'auto',
                                                maxWidth: '100%',
                                                alignItems: 'stretch',
                                                flex: '0 0 auto',
                                                mt: isMobile ? 1 : 0,
                                                background: isMobile ? 'transparent' : '#eef2ff',
                                                borderRadius: isMobile ? 0 : 3,
                                                padding: isMobile ? 0 : '10px',
                                                border: isMobile ? 'none' : '1px solid #dbe4ff'
                                            }}>
                                                <Button variant="contained" color="primary" sx={{ 
                                                    mb: isMobile ? 0 : 1, 
                                                    borderRadius: 2.5, 
                                                    fontWeight: 700, 
                                                    textTransform: 'none',
                                                    flex: isMobile ? '0 0 auto' : 'none',
                                                    width: isMobile ? '100%' : 'auto',
                                                    minWidth: 0,
                                                    alignSelf: 'stretch',
                                                    justifyContent: 'center',
                                                    fontSize: isMobile ? '12px' : '14px',
                                                    padding: isMobile ? '6px 8px' : '8px 16px',
                                                    background: '#2ECC71',
                                                    '&:hover': {
                                                        background: '#27AE60'
                                                    }
                                                }} onClick={handleRebook}>Rebook</Button>
                                                <Button variant="contained" color="primary" sx={{ 
                                                    mb: isMobile ? 0 : 1, 
                                                    borderRadius: 2.5, 
                                                    fontWeight: 700, 
                                                    textTransform: 'none',
                                                    flex: isMobile ? '0 0 auto' : 'none',
                                                    width: isMobile ? '100%' : 'auto',
                                                    minWidth: 0,
                                                    alignSelf: 'stretch',
                                                    justifyContent: 'center',
                                                    fontSize: isMobile ? '12px' : '14px',
                                                    padding: isMobile ? '6px 8px' : '8px 16px',
                                                    background: '#1ABC9C',
                                                    '&:hover': {
                                                        background: '#16A085'
                                                    }
                                                }} onClick={handleAddGuestClick}>Add Guest</Button>
                                                <Button variant="contained" color="info" sx={{ 
                                                    mb: isMobile ? 0 : 1, 
                                                    borderRadius: 2.5, 
                                                    fontWeight: 700, 
                                                    textTransform: 'none', 
                                                    background: '#E74C3C',
                                                    flex: isMobile ? '0 0 auto' : 'none',
                                                    width: isMobile ? '100%' : 'auto',
                                                    minWidth: 0,
                                                    alignSelf: 'stretch',
                                                    justifyContent: 'center',
                                                    fontSize: isMobile ? '12px' : '14px',
                                                    padding: isMobile ? '6px 8px' : '8px 16px',
                                                    '&:hover': {
                                                        background: '#C0392B'
                                                    }
                                                }} onClick={handleCancelFlight}>Cancel Flight</Button>
                                                <Button variant="contained" color="success" sx={{ 
                                                    borderRadius: 2.5, 
                                                    fontWeight: 700, 
                                                    textTransform: 'none', 
                                                    background: '#3498DB',
                                                    mb: isMobile ? 0 : 1,
                                                    flex: isMobile ? '0 0 auto' : 'none',
                                                    width: isMobile ? '100%' : 'auto',
                                                    minWidth: 0,
                                                    alignSelf: 'stretch',
                                                    justifyContent: 'center',
                                                    fontSize: isMobile ? '12px' : '14px',
                                                    padding: isMobile ? '6px 8px' : '8px 16px',
                                                    '&:hover': {
                                                        background: '#2980B9'
                                                    }
                                                }} onClick={handleEmailBooking}>Email | SMS</Button>
                                                <Button
                                                    variant="contained"
                                                    color="secondary"
                                                    sx={{ 
                                                        borderRadius: 2.5, 
                                                        fontWeight: 700, 
                                                        textTransform: 'none', 
                                                        background: '#5B6CFF',
                                                        mb: isMobile ? 0 : 1,
                                                        flex: isMobile ? '0 0 auto' : 'none',
                                                        width: isMobile ? '100%' : 'auto',
                                                        minWidth: 0,
                                                        alignSelf: 'stretch',
                                                        justifyContent: 'center',
                                                        fontSize: isMobile ? '12px' : '14px',
                                                        padding: isMobile ? '6px 8px' : '8px 16px',
                                                        '&:hover': {
                                                            background: '#4A5AE8'
                                                        }
                                                    }}
                                                    onClick={() => bookingDetail?.booking && handleMessagesClick(bookingDetail.booking)}
                                                    disabled={!bookingDetail?.booking}
                                                >
                                                    Messages
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    color="info"
                                                    sx={{ 
                                                        borderRadius: 2.5, 
                                                        fontWeight: 700, 
                                                        textTransform: 'none', 
                                                        background: '#8E44AD',
                                                        mt: isMobile ? 0 : 1,
                                                        mb: isMobile ? 0 : 1,
                                                        flex: isMobile ? '0 0 auto' : 'none',
                                                        width: isMobile ? '100%' : 'auto',
                                                        minWidth: 0,
                                                        alignSelf: 'stretch',
                                                        justifyContent: 'center',
                                                        fontSize: isMobile ? '12px' : '14px',
                                                        padding: isMobile ? '6px 8px' : '8px 16px',
                                                        '&:hover': {
                                                            background: '#7D3C98'
                                                        }
                                                    }}
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
                                                    sx={{ 
                                                        borderRadius: 2.5, 
                                                        fontWeight: 700, 
                                                        textTransform: 'none', 
                                                        background: '#7F8C8D',
                                                        mt: isMobile ? 0 : 1,
                                                        flex: isMobile ? '0 0 auto' : 'none',
                                                        width: isMobile ? '100%' : 'auto',
                                                        minWidth: 0,
                                                        alignSelf: 'stretch',
                                                        justifyContent: 'center',
                                                        fontSize: isMobile ? '12px' : '14px',
                                                        padding: isMobile ? '6px 8px' : '8px 16px',
                                                        '&:hover': {
                                                            background: '#6C7A7B'
                                                        }
                                                    }}
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
                                        <Divider sx={{ my: isMobile ? 1 : 2 }} />
                                        {/* Passenger Details */}
                                        <Box sx={{ mb: isMobile ? 1 : 2 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: isMobile ? 0.5 : 1, fontSize: isMobile ? '16px' : 'inherit' }}>Passenger Details</Typography>
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
                                                                    {i + 1}: {editingPassenger === p.id ? (
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
                                                                                
                                                                                // For Shared Flight: Calculate price as (paid + due) / passenger count + add_on (only first) + weather_refundable
                                                                                // Total amount = paid + due; per passenger = totalAmount / passengerCount
                                                                                const paid = parseFloat(bookingDetail.booking?.paid) || 0;
                                                                                const due = parseFloat(bookingDetail.booking?.due) || 0;
                                                                                const totalAmount = paid + due;
                                                                                const addOnTotalPrice = parseFloat(bookingDetail.booking?.add_to_booking_items_total_price) || 0;
                                                                                const WEATHER_REFUND_PRICE = 47.5;
                                                                                const hasWeatherRefund = p.weather_refund === 1 || p.weather_refund === '1' || p.weather_refund === true;
                                                                                const weatherRefundPrice = hasWeatherRefund ? WEATHER_REFUND_PRICE : 0;
                                                                                
                                                                                let basePricePerPassenger = 0;
                                                                                let addOnPrice = 0;
                                                                                
                                                                                if (isOriginalPassenger && originalPaxCount > 0) {
                                                                                    // Original booking passengers: use (paid + due) / passenger count
                                                                                    basePricePerPassenger = totalAmount / originalPaxCount;
                                                                                    // Add-on price (only for first passenger)
                                                                                    const isFirstPassenger = i === 0;
                                                                                    addOnPrice = isFirstPassenger ? addOnTotalPrice : 0;
                                                                                } else {
                                                                                    // Add-guest passengers: use same calculation (paid + due) / current passenger count
                                                                                    const currentPax = bookingDetail.passengers ? bookingDetail.passengers.length : 1;
                                                                                    basePricePerPassenger = currentPax > 0 ? totalAmount / currentPax : (parseFloat(p.price) || 0);
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
                                                                          <IconButton 
                                                                              size="small" 
                                                                              onClick={() => handleEditPassengerClick(p)}
                                                                              sx={{
                                                                                  padding: isMobile ? '2px' : '8px',
                                                                                  '& .MuiSvgIcon-root': {
                                                                                      fontSize: isMobile ? '12px' : 'inherit'
                                                                                  }
                                                                              }}
                                                                          >
                                                                              <EditIcon fontSize={isMobile ? '12px' : 'small'} />
                                                                          </IconButton>
                                                                          {i > 0 && ( // Only show delete button for additional passengers (not the first one)
                                                                              <IconButton 
                                                                                  size="small" 
                                                                                  onClick={() => handleDeletePassenger(p.id)}
                                                                                  sx={{ 
                                                                                      color: 'red',
                                                                                      padding: isMobile ? '2px' : '8px',
                                                                                      '& .MuiSvgIcon-root': {
                                                                                          fontSize: isMobile ? '12px' : 'inherit'
                                                                                      }
                                                                                  }}
                                                                              >
                                                                                  <DeleteIcon fontSize={isMobile ? '12px' : 'small'} />
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
                                        {/* HISTORY SECTION - Mobile: Below Passenger Details */}
                                        {isMobile && (
                                            <>
                                                <Divider sx={{ my: 1 }} />
                                                <Box sx={{ background: '#e0e0e0', borderRadius: 2, p: 1, mt: 1, mb: 1 }} className="booking-history-section">
                                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontSize: '16px' }}>History</Typography>
                                                    <TableContainer component={Box} className="booking-history-table-container" sx={{ maxHeight: 280, overflowY: 'auto', overflowX: 'auto' }}>
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
                                                                        <TableCell>{h.flight_date ? formatHistoryDateDisplay(h.flight_date) : (h.changed_at ? formatHistoryDateDisplay(h.changed_at) : '-')}</TableCell>
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
                                            </>
                                        )}
                                        <Divider sx={{ my: isMobile ? 1 : 2 }} />
                                        {/* Notes */}
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: isMobile ? 0.5 : 1, fontSize: isMobile ? '16px' : 'inherit' }}>Notes</Typography>
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
                                            <Box sx={{ maxHeight: 220, overflowY: 'auto', pr: 0.5 }}>
                                            {bookingDetail.notes && bookingDetail.notes.length > 0 ? bookingDetail.notes.map((n, i) => (
                                                <Box key={i} sx={{ mb: 1, p: 1, background: '#fff', borderRadius: 1, boxShadow: 0 }}>
                                                    <Typography variant="body2" sx={{ color: '#888', fontSize: 12 }}>{n.date ? dayjs(n.date).format('DD/MM/YYYY HH:mm') : ''}</Typography>
                                                    <Typography>{n.notes}</Typography>
                                                </Box>
                                            )) : <Typography>No notes</Typography>}
                                            </Box>
                                        </Box>
                                        <Divider sx={{ my: isMobile ? 1 : 2 }} />
                                        {/* Additional Information Section */}
                                        {additionalInformation && (
                                            <Box>
                                                                                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: isMobile ? 1 : 2, fontSize: isMobile ? '16px' : 'inherit' }}>Additional Information & Notes</Typography>
                                                {additionalInfoLoading ? (
                                                    <Typography>Loading additional information...</Typography>
                                                ) : (
                                                                                                            <Box sx={{ maxHeight: 280, overflowY: 'auto', pr: 0.5 }}>
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
                                                                        
                                                                        // Hide question if answer is "Not answered" or empty
                                                                        if (!answer || (answer && answer.toString().trim().toLowerCase() === 'not answered')) {
                                                                            return null;
                                                                        }
                                                                        
                                                                        return (
                                                                            <Box key={index} sx={{ mb: 2, p: 2, background: '#f0f8ff', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                                                                                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1976d2' }}>
                                                                                    {question.question_text}:
                                                                                </Typography>
                                                                                <Typography sx={{ color: '#333' }}>
                                                                                    {answer}
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
                                        <Divider sx={{ my: isMobile ? 1 : 2 }} />
                                        {/* HISTORY SECTION - Desktop: After Additional Information */}
                                        {!isMobile && (
                                            <Box sx={{ background: '#e0e0e0', borderRadius: 2, p: 2, mt: 2, mb: 2 }} className="booking-history-section">
                                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>History</Typography>
                                                <TableContainer component={Box} className="booking-history-table-container" sx={{ maxHeight: 280, overflowY: 'auto', overflowX: 'auto' }}>
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
                                                                    <TableCell>{h.flight_date ? formatHistoryDateDisplay(h.flight_date) : (h.changed_at ? formatHistoryDateDisplay(h.changed_at) : '-')}</TableCell>
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
                                        )}
                                    </Box>
                                </Grid>
                            </Grid>
                            </Box>
                        </Box>
                    ) : null}
                </DialogContent>
                <DialogActions sx={{ background: '#f1f3ff', borderTop: '1px solid #dce2f7', px: 3, py: 1.5 }}>
                    <Button onClick={() => setDetailDialogOpen(false)} color="primary" variant="contained" sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none', px: 3 }}>Close</Button>
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
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    pb: 2
                }}>
                    <Box component="span" sx={{ fontWeight: 700, fontSize: '1.5rem' }}>
                        Payments / Promos
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
                <DialogContent sx={{ 
                    mt: 1,
                    p: isMobile ? 1.5 : 3,
                    '&.MuiDialogContent-root': {
                        padding: isMobile ? '16px !important' : '24px !important'
                    }
                }}>
                    <Grid container spacing={isMobile ? 1.5 : 2}>
                        {/* Email and SMS Checkboxes */}
                        <Grid item xs={12}>
                            <FormGroup sx={{ 
                                mb: 1, 
                                flexDirection: 'row', 
                                gap: isMobile ? 1.5 : 2,
                                alignItems: 'center'
                            }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={groupMessageEmailChecked}
                                            onChange={(e) => {
                                                setGroupMessageEmailChecked(e.target.checked);
                                                // If unchecking email and SMS is also unchecked, keep at least one checked
                                                if (!e.target.checked && !groupMessageSmsChecked) {
                                                    setGroupMessageSmsChecked(true);
                                                }
                                            }}
                                            sx={{
                                                color: '#6b7280',
                                                padding: '4px',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                                    borderRadius: '4px',
                                                },
                                                '&.Mui-checked': {
                                                    color: '#3b82f6',
                                                },
                                                '& .MuiSvgIcon-root': {
                                                    fontSize: isMobile ? 20 : 22,
                                                    transition: 'all 0.2s ease-in-out',
                                                },
                                                transition: 'all 0.2s ease-in-out',
                                            }}
                                        />
                                    }
                                    label="Email"
                                    sx={{
                                        margin: 0,
                                        marginRight: isMobile ? 0 : 1,
                                        '& .MuiFormControlLabel-label': {
                                            fontSize: isMobile ? '13px' : '14px',
                                            fontWeight: groupMessageEmailChecked ? 600 : 500,
                                            color: groupMessageEmailChecked ? '#3b82f6' : (isMobile ? 'inherit' : '#6b7280'),
                                            transition: 'all 0.2s ease-in-out',
                                            marginLeft: '6px',
                                        }
                                    }}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={groupMessageSmsChecked}
                                            onChange={(e) => {
                                                setGroupMessageSmsChecked(e.target.checked);
                                                // If unchecking SMS and Email is also unchecked, keep at least one checked
                                                if (!e.target.checked && !groupMessageEmailChecked) {
                                                    setGroupMessageEmailChecked(true);
                                                }
                                                // When SMS checkbox is checked, auto-select corresponding SMS template if email template is already selected
                                                if (e.target.checked && groupMessageEmailChecked && groupMessageForm.template && groupMessageForm.template !== 'custom' && smsTemplates.length > 0) {
                                                    // Find the email template
                                                    const dbTemplate = emailTemplates.find(
                                                        (t) => t.id.toString() === groupMessageForm.template.toString()
                                                    );
                                                    const templateName = resolveTemplateName(groupMessageForm.template, dbTemplate);
                                                    const emailTemplateName = (dbTemplate?.name || templateName).trim();
                                                    
                                                    // Email to SMS template name mapping
                                                    const emailToSmsMapping = {
                                                        'Flight Voucher Confirmation': 'Flight Voucher Confirmation SMS',
                                                        'Booking Confirmation': 'Booking Confirmation SMS',
                                                        'Booking Rescheduled': 'Booking Rescheduled SMS',
                                                        'Follow up': 'Follow up SMS',
                                                        'Passenger Rescheduling Information': 'Passenger Rescheduling Information SMS',
                                                        'Upcoming Flight Reminder': 'Upcoming Flight Reminder SMS'
                                                    };
                                                    
                                                    const correspondingSmsTemplateName = emailToSmsMapping[emailTemplateName];
                                                    
                                                    if (correspondingSmsTemplateName) {
                                                        const matchingSmsTemplate = smsTemplates.find(
                                                            t => t.name === correspondingSmsTemplateName
                                                        );
                                                        
                                                        if (matchingSmsTemplate) {
                                                            handleGroupSmsTemplateChange(String(matchingSmsTemplate.id));
                                                            return; // Exit early to skip the initialization below
                                                        }
                                                    }
                                                }
                                                // Initialize SMS form if needed when SMS checkbox is checked
                                                if (e.target.checked && !groupMessageEmailChecked) {
                                                    // Initialize SMS form if needed
                                                    if (!groupSmsForm.message && smsTemplates.length > 0) {
                                                        const firstTemplate = smsTemplates[0];
                                                        handleGroupSmsTemplateChange(String(firstTemplate.id));
                                                    }
                                                }
                                            }}
                                            sx={{
                                                color: '#6b7280',
                                                padding: '4px',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                                    borderRadius: '4px',
                                                },
                                                '&.Mui-checked': {
                                                    color: '#10b981',
                                                },
                                                '& .MuiSvgIcon-root': {
                                                    fontSize: isMobile ? 20 : 22,
                                                    transition: 'all 0.2s ease-in-out',
                                                },
                                                transition: 'all 0.2s ease-in-out',
                                            }}
                                        />
                                    }
                                    label="SMS"
                                    sx={{
                                        margin: 0,
                                        '& .MuiFormControlLabel-label': {
                                            fontSize: isMobile ? '13px' : '14px',
                                            fontWeight: groupMessageSmsChecked ? 600 : 500,
                                            color: groupMessageSmsChecked ? '#10b981' : (isMobile ? 'inherit' : '#6b7280'),
                                            transition: 'all 0.2s ease-in-out',
                                            marginLeft: '6px',
                                        }
                                    }}
                                />
                            </FormGroup>
                        </Grid>
                        {/* Recipients - Only show for email */}
                        {groupMessageEmailChecked && (
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
                        )}
                        {/* Email and SMS Template Selection - Side by Side */}
                        {(groupMessageEmailChecked || groupMessageSmsChecked) && (
                            <Grid item xs={12}>
                                <Grid container spacing={2}>
                                    {/* Email Template Selection */}
                                    {groupMessageEmailChecked && (
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="subtitle2" sx={{ 
                                                mb: 1, 
                                                fontWeight: 500,
                                                fontSize: isMobile ? 'inherit' : '14px',
                                                color: isMobile ? 'inherit' : '#374151'
                                            }}>
                                                Choose a template Email:
                                            </Typography>
                                            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                                                <Select
                                                    value={groupMessageForm.template || 'custom'}
                                                    onChange={(e) => handleGroupTemplateChange(e.target.value)}
                                                    displayEmpty
                                                    sx={{
                                                        fontSize: isMobile ? 'inherit' : '14px',
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: isMobile ? 'inherit' : '#d1d5db'
                                                        },
                                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: isMobile ? 'inherit' : '#9ca3af'
                                                        },
                                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: isMobile ? 'inherit' : '#3b82f6'
                                                        }
                                                    }}
                                                >
                                                    {emailTemplates.map((template) => (
                                                        <MenuItem key={template.id} value={template.id} sx={{ fontSize: isMobile ? 'inherit' : '14px' }}>
                                                            {template.name}
                                                        </MenuItem>
                                                    ))}
                                                    <MenuItem value="custom" sx={{ fontSize: isMobile ? 'inherit' : '14px' }}>Custom Message</MenuItem>
                                                    {emailTemplates.length === 0 && (
                                                        <>
                                                            <MenuItem value="to_be_updated" sx={{ fontSize: isMobile ? 'inherit' : '14px' }}>To Be Updated</MenuItem>
                                                            <MenuItem value="confirmation" sx={{ fontSize: isMobile ? 'inherit' : '14px' }}>Booking Confirmation</MenuItem>
                                                            <MenuItem value="reminder" sx={{ fontSize: isMobile ? 'inherit' : '14px' }}>Flight Reminder</MenuItem>
                                                            <MenuItem value="reschedule" sx={{ fontSize: isMobile ? 'inherit' : '14px' }}>Flight Rescheduling</MenuItem>
                                                        </>
                                                    )}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                    )}
                                    {/* SMS Template Selection */}
                                    {groupMessageSmsChecked && (
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="subtitle2" sx={{ 
                                                mb: 1, 
                                                fontWeight: 500,
                                                fontSize: isMobile ? 'inherit' : '14px',
                                                color: isMobile ? 'inherit' : '#374151'
                                            }}>
                                                Choose a template SMS:
                                            </Typography>
                                            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                                                <Select
                                                    value={groupSmsForm.template || 'custom'}
                                                    onChange={(e) => handleGroupSmsTemplateChange(e.target.value)}
                                                    displayEmpty
                                                    sx={{
                                                        fontSize: isMobile ? 'inherit' : '14px',
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: isMobile ? 'inherit' : '#d1d5db'
                                                        },
                                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: isMobile ? 'inherit' : '#9ca3af'
                                                        },
                                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: isMobile ? 'inherit' : '#3b82f6'
                                                        }
                                                    }}
                                                >
                                                    {smsTemplates.map((template) => (
                                                        <MenuItem key={template.id} value={String(template.id)} sx={{ fontSize: isMobile ? 'inherit' : '14px' }}>
                                                            {template.name}
                                                        </MenuItem>
                                                    ))}
                                                    <MenuItem value="custom" sx={{ fontSize: isMobile ? 'inherit' : '14px' }}>Custom Message</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                    )}
                                </Grid>
                            </Grid>
                        )}
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                                    Add an optional, personalized note
                                </Typography>
                                {((groupMessageEmailChecked && groupMessageForm.template === 'custom') || (groupMessageSmsChecked && (!groupSmsForm.template || groupSmsForm.template === 'custom'))) && (
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={groupAddLink}
                                            onChange={(e) => setGroupAddLink(e.target.checked)}
                                            size="small"
                                            sx={{
                                                color: '#6b7280',
                                                padding: '4px',
                                                '&.Mui-checked': {
                                                    color: '#3b82f6',
                                                },
                                                '& .MuiSvgIcon-root': {
                                                    fontSize: 20,
                                                },
                                            }}
                                        />
                                    }
                                    label="Add Link"
                                    sx={{
                                        margin: 0,
                                        '& .MuiFormControlLabel-label': {
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            color: groupAddLink ? '#3b82f6' : '#6b7280',
                                        }
                                    }}
                                />
                                )}
                            </Box>
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
                        {/* Email Template Preview */}
                        {groupMessageEmailChecked && (
                            <Grid item xs={12}>
                                <Box sx={{ mb: 1 }}>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between', 
                                        mb: 0.5
                                    }}>
                                        <Typography variant="caption" sx={{ color: '#374151', fontWeight: 600, fontSize: 12 }}>
                                            Email Preview
                                        </Typography>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            sx={{ textTransform: 'none', fontSize: 12 }}
                                            onClick={() => setGroupMessageEmailPreviewOpen(v => !v)}
                                        >
                                            {groupMessageEmailPreviewOpen ? 'Hide' : 'Show'}
                                        </Button>
                                    </Box>

                                    <Collapse in={groupMessageEmailPreviewOpen} timeout={200} unmountOnExit>
                                        <Box sx={{ 
                                            border: isMobile ? '1px solid #e0e0e0' : '1px solid #e5e7eb', 
                                            borderRadius: isMobile ? 2 : '8px', 
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
                                    <Typography variant="caption" sx={{ 
                                        color: '#666', 
                                        display: 'block', 
                                        mb: isMobile ? 0.25 : 0.5, 
                                        fontSize: isMobile ? 10 : '12px', 
                                        wordBreak: 'break-word',
                                        lineHeight: isMobile ? 'inherit' : '1.4'
                                    }}>
                                        From "Fly Away Ballooning" &lt;info@flyawayballooning.com&gt;
                                    </Typography>
                                    <Typography variant="caption" sx={{ 
                                        color: '#999', 
                                        display: 'block', 
                                        mb: isMobile ? 1 : 2, 
                                        fontSize: isMobile ? 10 : '12px',
                                        lineHeight: isMobile ? 'inherit' : '1.4'
                                    }}>
                                        {groupMessagePreviewDateTime || `${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                                    </Typography>
                                    
                                    {/* Email Subject */}
                                    <Typography sx={{ 
                                        color: '#d32f2f', 
                                        fontWeight: 600, 
                                        mb: isMobile ? 1 : 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: isMobile ? 0.5 : 1,
                                        fontSize: isMobile ? 13 : '16px',
                                        wordBreak: 'break-word'
                                    }}>
                                        <span style={{ fontSize: isMobile ? 16 : 20 }}>🎈</span> {groupMessageForm.subject || 'Flight update'}
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
                                                width: isMobile ? '200%' : '100%',
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
                                            dangerouslySetInnerHTML={{ __html: groupPreviewHtml }}
                                        />
                                    </Box>
                                </Box>
                            </Collapse>
                        </Box>
                            </Grid>
                        )}
                        {/* SMS Template Preview */}
                        {groupMessageSmsChecked && (
                            <Grid item xs={12}>
                                <Box sx={{ mb: 1 }}>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between', 
                                        mb: 0.5
                                    }}>
                                        <Typography variant="caption" sx={{ color: '#374151', fontWeight: 600, fontSize: 12 }}>
                                            SMS Preview
                                        </Typography>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            sx={{ textTransform: 'none', fontSize: 12 }}
                                            onClick={() => setGroupMessageSmsPreviewOpen(v => !v)}
                                        >
                                            {groupMessageSmsPreviewOpen ? 'Hide' : 'Show'}
                                        </Button>
                                    </Box>
                                    <Collapse in={groupMessageSmsPreviewOpen} timeout={200} unmountOnExit>
                                        <Box sx={{ 
                                            border: isMobile ? '1px solid #e0e0e0' : '1px solid #e5e7eb', 
                                            borderRadius: isMobile ? 2 : '8px', 
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
                                                        const previewBooking = groupMessagePreviewBooking || (groupSelectedBookings.length > 0 ? groupSelectedBookings[0] : null);
                                                        if (!previewBooking) return 'Your message will appear here...';
                                                        
                                                        const isCustomSms = !groupSmsForm.template || groupSmsForm.template === 'custom';
                                                        let previewMessage = '';

                                                        if (isCustomSms) {
                                                            previewMessage = (groupPersonalNote && groupPersonalNote.trim()) ? groupPersonalNote.trim() : '';
                                                        } else {
                                                            const messageText = groupSmsForm.message || '';
                                                            const messageWithPrompts = replaceSmsPrompts(messageText, previewBooking);
                                                            previewMessage = groupPersonalNote 
                                                                ? `${messageWithPrompts}${messageWithPrompts ? '\n\n' : ''}${groupPersonalNote}`
                                                                : messageWithPrompts;
                                                        }

                                                        if (addLink) {
                                                            previewMessage = appendCustomerPortalLinkToSmsMessage(previewMessage, previewBooking);
                                                        }

                                                        return previewMessage || 'Your message will appear here...';
                                                    })()}
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Box>
                                        </Box>
                                    </Collapse>
                                </Box>
                            </Grid>
                        )}
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
                        disabled={
                            groupMessageSending || 
                            (!groupMessageEmailChecked && !groupMessageSmsChecked) ||
                            (groupMessageEmailChecked && (groupMessageForm.to.length === 0 || !groupMessageForm.subject)) ||
                            // SMS disabled state – align with handleSendGroupEmail validation:
                            //  - allow body to come from either groupSmsForm.message or groupPersonalNote when using custom template
                            (groupMessageSmsChecked && (() => {
                                const hasSmsBody =
                                    (groupSmsForm.message && groupSmsForm.message.trim().length > 0) ||
                                    (groupPersonalNote && groupPersonalNote.trim().length > 0);
                                if (!groupSmsForm.template || groupSmsForm.template === 'custom') {
                                    return !hasSmsBody;
                                }
                                return false;
                            })())
                        }
                    >
                        {groupMessageSending ? 'Sending...' : 'Send'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Email Modal */}
            <Dialog 
                open={emailModalOpen} 
                onClose={() => {
                    setEmailModalOpen(false);
                    setSendMessageEmailChecked(true);
                    setSendMessageSmsChecked(true);
                    setAddLink(false);
                    setSmsForm({ to: '', message: '', template: 'custom' });
                }}
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
                <DialogContent sx={{ 
                    p: isMobile ? 1.5 : 3,
                    '&.MuiDialogContent-root': {
                        padding: isMobile ? '16px !important' : '24px !important'
                    }
                }}>
                    <Grid container spacing={isMobile ? 1.5 : 2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <FormGroup sx={{ 
                                mb: 1, 
                                flexDirection: 'row', 
                                gap: isMobile ? 1.5 : 2,
                                alignItems: 'center'
                            }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={sendMessageEmailChecked}
                                            onChange={(e) => {
                                                setSendMessageEmailChecked(e.target.checked);
                                                // If unchecking email and SMS is also unchecked, keep at least one checked
                                                if (!e.target.checked && !sendMessageSmsChecked) {
                                                    setSendMessageSmsChecked(true);
                                                }
                                            }}
                                            sx={{
                                                color: '#6b7280',
                                                padding: '4px',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                                    borderRadius: '4px',
                                                },
                                                '&.Mui-checked': {
                                                    color: '#3b82f6',
                                                },
                                                '& .MuiSvgIcon-root': {
                                                    fontSize: isMobile ? 20 : 22,
                                                    transition: 'all 0.2s ease-in-out',
                                                },
                                                transition: 'all 0.2s ease-in-out',
                                            }}
                                        />
                                    }
                                    label="Email"
                                    sx={{
                                        margin: 0,
                                        marginRight: isMobile ? 0 : 1,
                                        '& .MuiFormControlLabel-label': {
                                            fontSize: isMobile ? '13px' : '14px',
                                            fontWeight: sendMessageEmailChecked ? 600 : 500,
                                            color: sendMessageEmailChecked ? '#3b82f6' : (isMobile ? 'inherit' : '#6b7280'),
                                            transition: 'all 0.2s ease-in-out',
                                            marginLeft: '6px',
                                        }
                                    }}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={sendMessageSmsChecked}
                                            onChange={(e) => {
                                                setSendMessageSmsChecked(e.target.checked);
                                                // If unchecking SMS and Email is also unchecked, keep at least one checked
                                                if (!e.target.checked && !sendMessageEmailChecked) {
                                                    setSendMessageEmailChecked(true);
                                                }
                                                // When SMS checkbox is checked, auto-select corresponding SMS template if email template is already selected
                                                if (e.target.checked && sendMessageEmailChecked && emailForm.template && emailForm.template !== 'custom' && smsTemplates.length > 0) {
                                                    // Find the email template
                                                    const dbTemplate = emailTemplates.find(
                                                        (t) => t.id.toString() === emailForm.template.toString()
                                                    );
                                                    const templateName = resolveTemplateName(emailForm.template, dbTemplate);
                                                    const emailTemplateName = (dbTemplate?.name || templateName).trim();
                                                    
                                                    // Email to SMS template name mapping
                                                    const emailToSmsMapping = {
                                                        'Flight Voucher Confirmation': 'Flight Voucher Confirmation SMS',
                                                        'Booking Confirmation': 'Booking Confirmation SMS',
                                                        'Booking Rescheduled': 'Booking Rescheduled SMS',
                                                        'Follow up': 'Follow up SMS',
                                                        'Passenger Rescheduling Information': 'Passenger Rescheduling Information SMS',
                                                        'Upcoming Flight Reminder': 'Upcoming Flight Reminder SMS'
                                                    };
                                                    
                                                    const correspondingSmsTemplateName = emailToSmsMapping[emailTemplateName];
                                                    
                                                    if (correspondingSmsTemplateName) {
                                                        const matchingSmsTemplate = smsTemplates.find(
                                                            t => t.name === correspondingSmsTemplateName
                                                        );
                                                        
                                                        if (matchingSmsTemplate) {
                                                            handleSmsTemplateChange(String(matchingSmsTemplate.id));
                                                            return; // Exit early to skip the initialization below
                                                        }
                                                    }
                                                }
                                                // Initialize SMS form if needed when SMS checkbox is checked
                                                if (e.target.checked && !sendMessageEmailChecked) {
                                                    // Initialize SMS form if needed
                                                    if (!smsForm.message && smsTemplates.length > 0) {
                                                        const firstTemplate = smsTemplates[0];
                                                        handleSmsTemplateChange(String(firstTemplate.id));
                                                    }
                                                }
                                            }}
                                            sx={{
                                                color: '#6b7280',
                                                padding: '4px',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                                    borderRadius: '4px',
                                                },
                                                '&.Mui-checked': {
                                                    color: '#10b981',
                                                },
                                                '& .MuiSvgIcon-root': {
                                                    fontSize: isMobile ? 20 : 22,
                                                    transition: 'all 0.2s ease-in-out',
                                                },
                                                transition: 'all 0.2s ease-in-out',
                                            }}
                                        />
                                    }
                                    label="SMS"
                                    sx={{
                                        margin: 0,
                                        '& .MuiFormControlLabel-label': {
                                            fontSize: isMobile ? '13px' : '14px',
                                            fontWeight: sendMessageSmsChecked ? 600 : 500,
                                            color: sendMessageSmsChecked ? '#10b981' : (isMobile ? 'inherit' : '#6b7280'),
                                            transition: 'all 0.2s ease-in-out',
                                            marginLeft: '6px',
                                        }
                                    }}
                                />
                            </FormGroup>
                        </Grid>
                        {/* Email and SMS Template Selection - Side by Side */}
                        {(sendMessageEmailChecked || sendMessageSmsChecked) && (
                            <Grid item xs={12}>
                                <Grid container spacing={2}>
                                    {/* Email Template Selection */}
                                    {sendMessageEmailChecked && (
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="subtitle2" sx={{ 
                                                mb: 1, 
                                                fontWeight: 500,
                                                fontSize: isMobile ? 'inherit' : '14px',
                                                color: isMobile ? 'inherit' : '#374151'
                                            }}>
                                                Choose a template Email:
                                            </Typography>
                                            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                                                <Select
                                                    value={emailForm.template || 'custom'}
                                                    onChange={(e) => handleEmailTemplateChange(e.target.value)}
                                                    displayEmpty
                                                    sx={{
                                                        fontSize: isMobile ? 'inherit' : '14px',
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: isMobile ? 'inherit' : '#d1d5db'
                                                        },
                                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: isMobile ? 'inherit' : '#9ca3af'
                                                        },
                                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: isMobile ? 'inherit' : '#3b82f6'
                                                        }
                                                    }}
                                                >
                                                    {emailTemplates.map((template) => (
                                                        <MenuItem key={template.id} value={template.id} sx={{ fontSize: isMobile ? 'inherit' : '14px' }}>
                                                            {template.name}
                                                        </MenuItem>
                                                    ))}
                                                    <MenuItem value="custom" sx={{ fontSize: isMobile ? 'inherit' : '14px' }}>Custom Message</MenuItem>
                                                    {emailTemplates.length === 0 && (
                                                        <>
                                                            <MenuItem value="to_be_updated" sx={{ fontSize: isMobile ? 'inherit' : '14px' }}>To Be Updated</MenuItem>
                                                            <MenuItem value="confirmation" sx={{ fontSize: isMobile ? 'inherit' : '14px' }}>Booking Confirmation</MenuItem>
                                                            <MenuItem value="reminder" sx={{ fontSize: isMobile ? 'inherit' : '14px' }}>Flight Reminder</MenuItem>
                                                            <MenuItem value="reschedule" sx={{ fontSize: isMobile ? 'inherit' : '14px' }}>Flight Rescheduling</MenuItem>
                                                        </>
                                                    )}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                    )}
                                    {/* SMS Template Selection */}
                                    {sendMessageSmsChecked && (
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="subtitle2" sx={{ 
                                                mb: 1, 
                                                fontWeight: 500,
                                                fontSize: isMobile ? 'inherit' : '14px',
                                                color: isMobile ? 'inherit' : '#374151'
                                            }}>
                                                Choose a template SMS:
                                            </Typography>
                                            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                                                <Select
                                                    value={smsForm.template || 'custom'}
                                                    onChange={(e) => handleSmsTemplateChange(e.target.value)}
                                                    displayEmpty
                                                    sx={{
                                                        fontSize: isMobile ? 'inherit' : '14px',
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: isMobile ? 'inherit' : '#d1d5db'
                                                        },
                                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: isMobile ? 'inherit' : '#9ca3af'
                                                        },
                                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: isMobile ? 'inherit' : '#3b82f6'
                                                        }
                                                    }}
                                                >
                                                    {smsTemplates.map((template) => (
                                                        <MenuItem key={template.id} value={String(template.id)} sx={{ fontSize: isMobile ? 'inherit' : '14px' }}>
                                                            {template.name}
                                                        </MenuItem>
                                                    ))}
                                                    <MenuItem value="custom" sx={{ fontSize: isMobile ? 'inherit' : '14px' }}>Custom Message</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                    )}
                                </Grid>
                            </Grid>
                        )}
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: isMobile ? 0.5 : 1 }}>
                                <Typography variant="subtitle2" sx={{
                                    fontWeight: 500,
                                    fontSize: isMobile ? 13 : '14px',
                                    color: isMobile ? 'inherit' : '#374151'
                                }}>
                                    Add an optional, personalized note
                                </Typography>
                                {((sendMessageEmailChecked && emailForm.template === 'custom') || (sendMessageSmsChecked && (!smsForm.template || smsForm.template === 'custom'))) && (
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={addLink}
                                            onChange={(e) => setAddLink(e.target.checked)}
                                            size="small"
                                            sx={{
                                                color: '#6b7280',
                                                padding: '4px',
                                                '&.Mui-checked': {
                                                    color: '#3b82f6',
                                                },
                                                '& .MuiSvgIcon-root': {
                                                    fontSize: isMobile ? 18 : 20,
                                                },
                                            }}
                                        />
                                    }
                                    label="Add Link"
                                    sx={{
                                        margin: 0,
                                        '& .MuiFormControlLabel-label': {
                                            fontSize: isMobile ? '12px' : '13px',
                                            fontWeight: 500,
                                            color: addLink ? '#3b82f6' : '#6b7280',
                                        }
                                    }}
                                />
                                )}
                            </Box>
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
                                        borderRadius: isMobile ? 2 : '6px',
                                        fontSize: isMobile ? '14px' : '14px',
                                        '& fieldset': {
                                            borderColor: isMobile ? 'inherit' : '#d1d5db'
                                        },
                                        '&:hover fieldset': {
                                            borderColor: isMobile ? 'inherit' : '#9ca3af'
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: isMobile ? 'inherit' : '#3b82f6'
                                        }
                                    },
                                    '& .MuiInputLabel-root': {
                                        fontSize: isMobile ? '14px' : '14px'
                                    }
                                }}
                            />
                        </Grid>
                        {/* SMS Preview - Mobile Device - Show only if SMS is checked */}
                        {sendMessageSmsChecked && (
                            <Grid item xs={12}>
                                <Box sx={{ 
                                    border: isMobile ? '1px solid #e0e0e0' : '1px solid #e5e7eb', 
                                    borderRadius: isMobile ? 2 : '8px', 
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
                                                        const booking = selectedBookingForEmail || {};
                                                        const isCustom = !smsForm.template || smsForm.template === 'custom';
                                                        let previewMessage = '';

                                                        if (isCustom) {
                                                            previewMessage = (personalNote && personalNote.trim()) ? personalNote.trim() : '';
                                                        } else {
                                                            const messageText = smsForm.message || '';
                                                            const messageWithPrompts = replaceSmsPrompts(messageText, booking);
                                                            previewMessage = personalNote 
                                                                ? `${messageWithPrompts}${messageWithPrompts ? '\n\n' : ''}${personalNote}`
                                                                : messageWithPrompts;
                                                        }

                                                        if (addLink) {
                                                            previewMessage = appendCustomerPortalLinkToSmsMessage(previewMessage, booking);
                                                        }

                                                        return previewMessage || 'Your message will appear here...';
                                                    })()}
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                            </Grid>
                        )}
                        {/* Email Template Preview - Show only if Email is checked */}
                        {sendMessageEmailChecked && (
                        <Grid item xs={12}>
                            <Box sx={{ 
                                border: '1px solid #e0e0e0', 
                                borderRadius: 2, 
                                p: isMobile ? 0.5 : 2,
                                backgroundColor: '#f9f9f9',
                                position: 'relative',
                                overflow: 'auto',
                                maxHeight: '600px',
                                width: '100%'
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
                                    {emailPreviewDateTime || `${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
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
                                <MemoizedEmailPreview html={previewHtml} isMobile={isMobile} />
                            </Box>
                        </Grid>
                        )}
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
                        disabled={
                            sendingEmail ||
                            // Email disabled state
                            (sendMessageEmailChecked && (!emailForm.to || !emailForm.subject)) ||
                            // SMS disabled state – align with handleSendEmail validation:
                            //  - require valid phone (handled at send time)
                            //  - allow body to come from either smsForm.message or personalNote when using custom template
                            (sendMessageSmsChecked && (() => {
                                const hasSmsBody =
                                    (smsForm.message && smsForm.message.trim().length > 0) ||
                                    (personalNote && personalNote.trim().length > 0);
                                if (!smsForm.template || smsForm.template === 'custom') {
                                    return !hasSmsBody;
                                }
                                return false;
                            })())
                        }
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
                                                    const isCustom = !smsForm.template || smsForm.template === 'custom';
                                                    let previewMessage = '';

                                                    if (isCustom) {
                                                        previewMessage = (smsPersonalNote && smsPersonalNote.trim()) ? smsPersonalNote.trim() : '';
                                                    } else {
                                                        const messageText = smsForm.message || '';
                                                        const messageWithPrompts = replaceSmsPrompts(messageText, booking);
                                                        previewMessage = smsPersonalNote 
                                                            ? `${messageWithPrompts}${messageWithPrompts ? '\n\n' : ''}${smsPersonalNote}`
                                                            : messageWithPrompts;
                                                    }

                                                    if (addLink) {
                                                        previewMessage = appendCustomerPortalLinkToSmsMessage(previewMessage, booking);
                                                    }

                                                    return previewMessage || 'Your message will appear here...';
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

            {/* Close Flight Modal with Operational Selections */}
            <Dialog 
                open={closeFlightModalOpen} 
                onClose={() => {
                    setCloseFlightModalOpen(false);
                    setSelectedOperationalValues({});
                    setAircraftDefects('');
                    setVehicleTrailerDefects('');
                    setFlightStartTime(null);
                    setFlightEndTime(null);
                    setSelectedGroupFlightsForClose(null);
                }}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ 
                    fontWeight: 700, 
                    fontSize: isMobile ? 18 : '20px',
                    padding: isMobile ? '12px 16px' : '20px 24px',
                    borderBottom: '1px solid #e5e7eb'
                }}>
                    Log Flight
                </DialogTitle>
                <DialogContent sx={{ padding: isMobile ? '12px 16px' : '24px' }}>
                    {selectedGroupFlightsForClose && selectedGroupFlightsForClose.length > 0 && (() => {
                        const first = selectedGroupFlightsForClose[0];
                        // Find flight time from time_slot or flight_date and format as AM/PM only
                        let displayFlightTime = 'N/A';
                        
                        // Try time_slot first
                        if (first.time_slot) {
                            const timeValue = dayjs(first.time_slot, 'HH:mm');
                            if (timeValue.isValid()) {
                                displayFlightTime = timeValue.format('A');
                            } else {
                                // Try parsing as string directly
                                const timeStr = String(first.time_slot).trim();
                                if (timeStr.match(/^\d{1,2}:\d{2}$/)) {
                                    const parsedTime = dayjs(timeStr, 'HH:mm');
                                    if (parsedTime.isValid()) {
                                        displayFlightTime = parsedTime.format('A');
                                    }
                                }
                            }
                        } 
                        // If no time_slot, try to extract from flight_date
                        if (displayFlightTime === 'N/A' && first.flight_date) {
                            const flightDateMoment = dayjs(first.flight_date);
                            if (flightDateMoment.isValid()) {
                                // Always format with AM/PM only, even if time is midnight
                                displayFlightTime = flightDateMoment.format('A');
                            } else if (typeof first.flight_date === 'string' && first.flight_date.length >= 16) {
                                // Try to extract time from string format like "YYYY-MM-DD HH:mm:ss"
                                const timePart = first.flight_date.substring(11, 16);
                                const timeValue = dayjs(timePart, 'HH:mm');
                                if (timeValue.isValid()) {
                                    displayFlightTime = timeValue.format('A');
                                }
                            } else if (typeof first.flight_date === 'string') {
                                // Try to parse any date string format
                                const parsed = dayjs(first.flight_date);
                                if (parsed.isValid()) {
                                    displayFlightTime = parsed.format('A');
                                }
                            }
                        }
                        
                        // Get pilot information
                        let pilotName = 'N/A';
                        const activityId = getFlightActivityId(first);
                        if (activityId && first.flight_date) {
                            const date = typeof first.flight_date === 'string' ? first.flight_date.split(' ')[0] : dayjs(first.flight_date).format('YYYY-MM-DD');
                            const time = first.time_slot ? first.time_slot.substring(0, 5) : (first.flight_date && typeof first.flight_date === 'string' && first.flight_date.length >= 16 ? first.flight_date.substring(11, 16) : null);
                            if (date && time) {
                                const pilotKey = slotKey(activityId, date, time, getManifestSlotSegment(first));
                                const pilotId = pilotAssignmentsBySlot[pilotKey];
                                if (pilotId) {
                                    pilotName = getPilotName(pilotId);
                                }
                            }
                        }
                        
                        // Get crew information
                        let crewName = 'N/A';
                        if (activityId && first.flight_date) {
                            const date = typeof first.flight_date === 'string' ? first.flight_date.split(' ')[0] : dayjs(first.flight_date).format('YYYY-MM-DD');
                            const time = first.time_slot ? first.time_slot.substring(0, 5) : (first.flight_date && typeof first.flight_date === 'string' && first.flight_date.length >= 16 ? first.flight_date.substring(11, 16) : null);
                            if (date && time) {
                                const crewKey = slotKey(activityId, date, time, getManifestSlotSegment(first));
                                const crewId = crewAssignmentsBySlot[crewKey];
                                if (crewId) {
                                    crewName = getCrewMemberName(crewId);
                                }
                            }
                        }
                        
                        // Get balloon resource
                        let balloonResource = 'N/A';
                        try {
                            const flightPassengers = Array.isArray(first.passengers) ? first.passengers : [];
                            const mockBookingDetail = {
                                booking: {
                                    experience: first.experience || first.flight_type,
                                    flight_type: first.flight_type,
                                    pax: flightPassengers.length,
                                    passenger_count: flightPassengers.length
                                },
                                passengers: flightPassengers
                            };
                            const resourceInfo = getAssignedResourceInfo(mockBookingDetail);
                            balloonResource = resourceInfo ? resourceInfo.resourceName : (first.balloon_resources || 'N/A');
                        } catch (e) {
                            console.warn('Error calculating balloon resource:', e);
                            balloonResource = first.balloon_resources || 'N/A';
                        }
                        
                        // Get total pax - calculate across all bookings in selectedGroupFlightsForClose
                        const totalPax = selectedGroupFlightsForClose.reduce((sum, flight) => {
                            if (Array.isArray(flight.passengers) && flight.passengers.length > 0) {
                                return sum + flight.passengers.length;
                            } else {
                                return sum + (flight.pax || flight.passenger_count || 0);
                            }
                        }, 0);
                        
                        // Get total price - calculate across all bookings in selectedGroupFlightsForClose
                        // First try to calculate from passenger prices
                        let totalPriceSum = 0;
                        let hasPassengerPrices = false;
                        
                        selectedGroupFlightsForClose.forEach(flight => {
                            if (Array.isArray(flight.passengers) && flight.passengers.length > 0) {
                                const priceSum = flight.passengers.reduce((sum, p) => {
                                    const price = parseFloat(p.price || 0);
                                    return sum + (isNaN(price) ? 0 : price);
                                }, 0);
                                if (priceSum > 0) {
                                    totalPriceSum += priceSum;
                                    hasPassengerPrices = true;
                                }
                            }
                        });
                        
                        // If no passenger prices, use paid field (same as manifest page)
                        if (!hasPassengerPrices || totalPriceSum === 0) {
                            totalPriceSum = selectedGroupFlightsForClose.reduce((sum, flight) => {
                                return sum + (parseFloat(flight.paid) || 0);
                            }, 0);
                        }
                        
                        const totalPrice = totalPriceSum > 0 ? `£${totalPriceSum.toFixed(2)}` : 'N/A';
                        
                        return (
                            <Box sx={{ mb: 3, p: 2, backgroundColor: '#f8fafc', borderRadius: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                    Flight Information:
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Location: {first.location}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Flight Type: {first.flight_type}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Time: {displayFlightTime || 'N/A'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Total Pax: {totalPax}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Total Price: {totalPrice}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Pilot: {pilotName === 'None' ? 'N/A' : pilotName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Crew: {crewName === 'None' ? 'N/A' : crewName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Balloon Resource: {balloonResource}
                                </Typography>
                            </Box>
                        );
                    })()}

                    {loadingOperationalSelections ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <Typography>Loading operational selections...</Typography>
                        </Box>
                    ) : operationalFields.length === 0 ? (
                        <Typography color="text.secondary" sx={{ py: 2 }}>
                            No operational selections available. Please add selections in Settings.
                        </Typography>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {/* Flight Start Time and Flight End Time */}
                            <Box>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-end' }}>
                                        <Box sx={{ flex: 1 }}>
                                            {isMobile ? (
                                                <TimeField
                                                    label="Start Time"
                                                    value={flightStartTime}
                                                    onChange={(newValue) => setFlightStartTime(newValue)}
                                                    format="HH:mm"
                                                    sx={{ width: '100%' }}
                                                    slotProps={{
                                                        textField: {
                                                            size: 'small',
                                                            fullWidth: true,
                                                            inputProps: { inputMode: 'numeric' }
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <TimePicker
                                                    label="Start Time"
                                                    value={flightStartTime}
                                                    onChange={(newValue) => setFlightStartTime(newValue)}
                                                    format="HH:mm"
                                                    sx={{ width: '100%' }}
                                                    slotProps={{
                                                        textField: {
                                                            size: 'small',
                                                            fullWidth: true
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            {isMobile ? (
                                                <TimeField
                                                    label="End Time"
                                                    value={flightEndTime}
                                                    onChange={(newValue) => setFlightEndTime(newValue)}
                                                    format="HH:mm"
                                                    sx={{ width: '100%' }}
                                                    slotProps={{
                                                        textField: {
                                                            size: 'small',
                                                            fullWidth: true,
                                                            inputProps: { inputMode: 'numeric' }
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <TimePicker
                                                    label="End Time"
                                                    value={flightEndTime}
                                                    onChange={(newValue) => setFlightEndTime(newValue)}
                                                    format="HH:mm"
                                                    sx={{ width: '100%' }}
                                                    slotProps={{
                                                        textField: {
                                                            size: 'small',
                                                            fullWidth: true
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                </LocalizationProvider>
                            </Box>

                            {operationalFields.map((field) => (
                                <FormControl key={field.id || field.name} fullWidth>
                                    <InputLabel>{field.name}</InputLabel>
                                    <Select
                                        value={selectedOperationalValues[field.name] || ''}
                                        label={field.name}
                                        onChange={(e) => {
                                            setSelectedOperationalValues({
                                                ...selectedOperationalValues,
                                                [field.name]: e.target.value
                                            });
                                        }}
                                    >
                                        <MenuItem value="">
                                            <em>None</em>
                                        </MenuItem>
                                        {field.values && field.values.length > 0 ? (
                                            field.values.map((value, index) => (
                                                <MenuItem key={index} value={value}>
                                                    {value}
                                                </MenuItem>
                                            ))
                                        ) : (
                                            <MenuItem value="" disabled>
                                                No options available
                                            </MenuItem>
                                        )}
                                    </Select>
                                </FormControl>
                            ))}
                            
                            {/* Aircraft / Balloon Defects or Issues */}
                            <Box sx={{ mt: 2 }}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    value={aircraftDefects}
                                    onChange={(e) => setAircraftDefects(e.target.value)}
                                    placeholder="Enter aircraft defects or issues..."
                                    variant="outlined"
                                />
                            </Box>

                            {/* Vehicle / Trailer Issues */}
                            <Box sx={{ mt: 2 }}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    value={vehicleTrailerDefects}
                                    onChange={(e) => setVehicleTrailerDefects(e.target.value)}
                                    placeholder="Enter vehicle/trailer defects or issues..."
                                    variant="outlined"
                                />
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ padding: isMobile ? '12px 16px' : '16px 24px', borderTop: '1px solid #e5e7eb' }}>
                    <Button
                        onClick={() => {
                            setCloseFlightModalOpen(false);
                            setSelectedOperationalValues({});
                            setAircraftDefects('');
                            setVehicleTrailerDefects('');
                            setFlightStartTime(null);
                            setFlightEndTime(null);
                            setSelectedGroupFlightsForClose(null);
                        }}
                        color="inherit"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmCloseFlight}
                        variant="contained"
                        color="error"
                        disabled={statusLoadingGroup !== null}
                    >
                        {statusLoadingGroup !== null ? 'Logging...' : 'Log Flight'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default Manifest;
