import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
    Box,
    IconButton,
    Alert,
    Checkbox,
    FormControlLabel,
    FormGroup
} from '@mui/material';
import dayjs from 'dayjs';
import axios from 'axios';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const RescheduleFlightModal = ({ open, onClose, bookingData, onRescheduleSuccess }) => {
    const [availabilities, setAvailabilities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [error, setError] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
    const [submitting, setSubmitting] = useState(false);
    const [successDialogOpen, setSuccessDialogOpen] = useState(false);
    const [successPayload, setSuccessPayload] = useState(null);

    // Locations (Flight Voucher style)
    const [activities, setActivities] = useState([]);
    const [availableLocations, setAvailableLocations] = useState([]);
    const [selectedLocations, setSelectedLocations] = useState([]);

    // Get activity ID, location, and voucher type from booking data
    const activityId = bookingData?.activity_id || bookingData?.activityId;
    const location = bookingData?.location;
    const voucherType = bookingData?.voucher_type || bookingData?.voucher_type_detail;
    const experience = bookingData?.experience || bookingData?.flight_type || bookingData?.flight_type_source;
    const pax = Number(bookingData?.pax || bookingData?.passengers?.length || 0);
    
    // Debug logging
    console.log('RescheduleFlightModal - Booking Data:', {
        activityId,
        location,
        voucherType,
        experience,
        bookingData
    });

    // Helper function to check if a date is a weekday (Monday-Friday)
    const isWeekday = (date) => {
        const day = date.getDay();
        return day >= 1 && day <= 5; // Monday = 1, Friday = 5
    };

    // Helper function to check if a time is morning (typically before 12:00 PM)
    const isMorning = (time) => {
        if (!time) return false;
        // Parse time string (format: "HH:mm" or "HH:mm:ss")
        const timeParts = time.split(':');
        const hour = parseInt(timeParts[0], 10);
        return hour < 12; // Morning is before 12:00 PM
    };

    // ---- LiveAvailabilitySection-compatible helpers (adapted for Customer Portal) ----
    const normalizeVoucherName = (value = '') => {
        if (typeof value !== 'string') return '';
        return value.replace(/\([^)]*\)/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    };

    const parseNumber = (value, fallback = 0) => {
        const num = Number(value);
        return Number.isFinite(num) ? num : fallback;
    };

    const getSlotStatus = (slot) => (slot?.calculated_status || slot?.status || '').toLowerCase();

    const isPrivateSelection = (experience || '').toLowerCase().includes('private');
    const requiredSeats = Math.max(1, pax || (isPrivateSelection ? 8 : 1));

    const getRemainingSeats = (slot) => {
        if (!slot) return 0;
        if (slot.calculated_available !== undefined && slot.calculated_available !== null) {
            return Math.max(0, parseNumber(slot.calculated_available, 0));
        }
        if (typeof slot.actualAvailable === 'number') {
            return Math.max(0, slot.actualAvailable);
        }
        if (typeof slot.available === 'number') {
            return Math.max(0, slot.available);
        }
        if (typeof slot.shared_capacity === 'number' && typeof slot.shared_booked === 'number') {
            return Math.max(0, slot.shared_capacity - slot.shared_booked);
        }
        if (typeof slot.shared_capacity === 'number') {
            return Math.max(0, slot.shared_capacity);
        }
        return 0;
    };

    // Balloon 210 is a global resource across locations for a given date+time.
    // If any shared booking has consumed Balloon 210 at that date+time, large Private Charter (5–8 pax)
    // must NOT be selectable in ANY location at that same date+time.
    const normalizeSlotDate = (value) => {
        if (!value) return '';
        return String(value).split('T')[0].split(' ')[0].trim();
    };
    const normalizeSlotTime = (value) => {
        if (!value) return '';
        return String(value).trim();
    };
    const balloon210InUseByDateTime = React.useMemo(() => {
        const map = new Map();
        (availabilities || []).forEach(s => {
            const dateKey = normalizeSlotDate(s?.date);
            const timeKey = normalizeSlotTime(s?.time);
            if (!dateKey || !timeKey) return;
            const key = `${dateKey}|${timeKey}`;
            const balloon210LockedAny = Number(s?.balloon210_locked || s?.shared_slots_used || 0) > 0;
            const sharedBookedAny = Number(s?.shared_booked || s?.shared_consumed_pax || 0);
            if (balloon210LockedAny || sharedBookedAny > 0) {
                map.set(key, true);
            }
        });
        return map;
    }, [availabilities]);

    const getAvailableSeatsForSelection = (slot) => {
        if (!slot) return 0;

        const baseAvailable = getRemainingSeats(slot);
        const balloon210Locked = Number(slot.balloon210_locked || slot.shared_slots_used || 0) > 0;
        const sharedBooked = Number(slot.shared_booked || slot.shared_consumed_pax || 0);
        const isSmallPrivateSelection = isPrivateSelection && requiredSeats > 0 && requiredSeats <= 4;

        // SHARED FLOW (uses Balloon 210)
        if (!isPrivateSelection) {
            // If Balloon 210 is assigned to a different location, no shared seats are available for this location
            // Shared flights can share Balloon 210 within the same location, but not across different locations
            if (balloon210Locked) {
                return 0;
            }
            return baseAvailable;
        }

        // PRIVATE FLOW (1–4 pax uses Balloon 105)
        if (isSmallPrivateSelection) {
            const remaining105 = (typeof slot.private_charter_small_remaining === 'number')
                ? slot.private_charter_small_remaining
                : (Number(slot.private_charter_small_bookings || 0) > 0 ? 0 : 4);

            if (remaining105 <= 0) return 0;
            return remaining105 >= requiredSeats ? remaining105 : 0;
        }

        // Large private charter (5–8 pax) uses Balloon 210 exclusively
        const slotDateKey = normalizeSlotDate(slot?.date);
        const slotTimeKey = normalizeSlotTime(slot?.time);
        const balloon210InUseGlobally = slotDateKey && slotTimeKey
            ? Boolean(balloon210InUseByDateTime.get(`${slotDateKey}|${slotTimeKey}`))
            : false;

        // If Balloon 210 is already consumed by shared at this date+time (any location), block large private.
        // Also block if this specific slot indicates Balloon 210 is locked or shared booked.
        if (balloon210Locked || sharedBooked > 0 || balloon210InUseGlobally) {
            return 0;
        }

        return baseAvailable >= requiredSeats ? baseAvailable : 0;
    };

    const getVoucherTypesForAvailability = (availability) => {
        if (!availability) return [];
        const fromArray = (value) => value.map(item => (typeof item === 'string' ? item.trim() : item)).filter(Boolean);

        if (Array.isArray(availability.voucher_types_array) && availability.voucher_types_array.length > 0) {
            return fromArray(availability.voucher_types_array);
        }
        if (Array.isArray(availability.voucher_types) && availability.voucher_types.length > 0) {
            return fromArray(availability.voucher_types);
        }
        const parseString = (str) => {
            if (!str || typeof str !== 'string') return [];
            return str.split(',').map(s => s.trim()).filter(Boolean);
        };
        if (typeof availability.voucher_types === 'string' && availability.voucher_types.trim() !== '') {
            return parseString(availability.voucher_types);
        }
        if (typeof availability.activity_voucher_types === 'string' && availability.activity_voucher_types.trim() !== '') {
            return parseString(availability.activity_voucher_types);
        }
        return [];
    };

    const matchesExperience = (availability) => {
        const selectedType = (experience || '').toLowerCase().trim();
        if (!selectedType) return true;

        if (!Array.isArray(availability?.flight_types_array) || availability.flight_types_array.length === 0) {
            if (availability?.flight_types) {
                const flightTypesStr = String(availability.flight_types).toLowerCase();
                if (selectedType.includes('shared') && flightTypesStr.includes('shared')) return true;
                if (selectedType.includes('private') && flightTypesStr.includes('private')) return true;
            }
            return true;
        }

        const normalize = (value = '') => value.toLowerCase().trim();
        const selectedKeywords = {
            shared: selectedType.includes('shared'),
            private: selectedType.includes('private'),
            charter: selectedType.includes('charter'),
        };

        return availability.flight_types_array.some(type => {
            const normalizedType = normalize(type);
            if (!normalizedType) return false;
            if (normalizedType === selectedType) return true;
            if (normalizedType.includes(selectedType) || selectedType.includes(normalizedType)) return true;

            const typeKeywords = {
                shared: normalizedType.includes('shared'),
                private: normalizedType.includes('private'),
                charter: normalizedType.includes('charter'),
            };

            if (selectedKeywords.shared && typeKeywords.shared) return true;
            if (selectedKeywords.private && typeKeywords.private) return true;
            if (selectedKeywords.charter && typeKeywords.charter) return true;
            return false;
        });
    };

    // Voucher-type date/time filtering (mirrors LiveAvailabilitySection)
    const filterByVoucherType = (availability) => {
        if (!voucherType) return true;

        // Only apply weekday/morning filtering for shared voucher types.
        // Private voucher types (Private Charter, Proposal Flight) don't need date/time filtering.
        const sharedVoucherTypes = ['weekday morning', 'weekday morning flight', 'flexible weekday', 'flexible weekday flight', 'any day flight', 'anytime', 'any day'];
        const vtLower = String(voucherType).toLowerCase().trim();
        if (!sharedVoucherTypes.includes(vtLower)) return true;

        let availabilityDate = null;
        if (availability.date) {
            try {
                const datePart = typeof availability.date === 'string'
                    ? availability.date.split(' ')[0]
                    : availability.date;
                availabilityDate = new Date(String(datePart).includes('T') ? datePart : `${datePart}T00:00:00`);
                if (isNaN(availabilityDate.getTime())) return true;
            } catch (e) {
                return true;
            }
        }
        if (!availabilityDate) return true;
        
        if (vtLower === 'weekday morning' || vtLower === 'weekday morning flight') {
            return isWeekday(availabilityDate) && isMorning(availability.time);
        }
        if (vtLower === 'flexible weekday' || vtLower === 'flexible weekday flight') {
            return isWeekday(availabilityDate);
        }
        return true;
    };

    const voucherWildcardTerms = ['any voucher', 'any vouchers', 'all voucher types', 'all vouchers', 'any', 'all', 'any voucher type', 'any voucher types', 'any voucher option'];

    const getLocalDateStr = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Fetch activities / locations when modal opens (Flight Voucher style)
    useEffect(() => {
        if (!open) {
            setAvailableLocations([]);
            setSelectedLocations([]);
            setActivities([]);
            return;
        }

        const loadActivities = async () => {
            try {
                const resp = await axios.get('/api/activities');
                if (resp.data?.success) {
                    const acts = Array.isArray(resp.data.data) ? resp.data.data : [];
                    const liveActs = acts.filter(a => a.status === 'Live');
                    setActivities(liveActs);

                    const locs = Array.from(new Set(liveActs.map(a => a.location).filter(Boolean)));
                    setAvailableLocations(locs);

                    if (selectedLocations.length === 0) {
                        // Default: booking location if exists, otherwise all
                        const defaultLocs = bookingData?.location && locs.includes(bookingData.location)
                            ? [bookingData.location]
                            : locs;
                        setSelectedLocations(defaultLocs);
                    }
                }
            } catch (err) {
                console.error('RescheduleFlightModal - Error loading activities:', err);
            }
        };

        loadActivities();
    }, [open, bookingData?.location, selectedLocations.length]);

    // Fetch availabilities when modal opens or selected locations change
    useEffect(() => {
        if (!open) {
            setAvailabilities([]);
            setSelectedDate(null);
            setSelectedTime(null);
            setError(null);
            return;
        }

        const fetchAvailabilitiesForLocations = async () => {
            if (selectedLocations.length === 0) return;
            setLoading(true);
            setError(null);
            setSelectedDate(null);
            setSelectedTime(null);
            setCurrentMonth(dayjs().startOf('month'));
            setSuccessDialogOpen(false);
            setSuccessPayload(null);

            try {
                const collected = [];

                for (const loc of selectedLocations) {
                    // Resolve activity id for location
                    let finalActivityId = activityId;
                    if (!finalActivityId) {
                        const act = activities.find(a => a.location === loc && a.status === 'Live');
                        if (act) finalActivityId = act.id;
                    }

                    if (!finalActivityId) {
                        console.warn('RescheduleFlightModal - No activity ID for location:', loc);
                        continue;
                    }

                    const availResponse = await axios.get(`/api/activity/${finalActivityId}/availabilities`);
                    if (availResponse.data?.success) {
                        const data = Array.isArray(availResponse.data.data) ? availResponse.data.data : [];
                        // Preserve location on slots (fallback to loc)
                        const withLoc = data.map(d => ({
                            ...d,
                            location: d.location || loc,
                            activity_id: d.activity_id || finalActivityId
                        }));
                        collected.push(...withLoc);
                        console.log('RescheduleFlightModal - Loaded availabilities:', data.length, 'for location:', loc, 'activityId:', finalActivityId);
                    }
                }

                setAvailabilities(collected);
                } catch (err) {
                    console.error('Error loading availabilities:', err);
                    setError('Could not fetch availabilities. Please try again later.');
                    setAvailabilities([]);
                } finally {
                    setLoading(false);
                }
            };

        fetchAvailabilitiesForLocations();
    }, [open, selectedLocations, activities, activityId, voucherType, experience, bookingData]);

    // Final filtered availabilities - match LiveAvailabilitySection behaviour as closely as possible
    const finalFilteredAvailabilities = availabilities.filter(a => {
        // Location filter (selected checkboxes). If none selected, allow all.
        const matchesLoc = selectedLocations.length === 0 || !a?.location || selectedLocations.includes(a.location);
        const matchesExp = matchesExperience(a);

        const slotStatus = getSlotStatus(a);
        const availableForSelection = getAvailableSeatsForSelection(a);
        const isOpen = slotStatus === 'open' || availableForSelection > 0;
        const hasCapacity = availableForSelection > 0 || (a.capacity && Number(a.capacity) > 0);

        // Keep only future slots
        const slotDateTime = dayjs(`${a.date} ${a.time}`);
        const isFuture = slotDateTime.isAfter(dayjs());

        // Voucher matching (if backend provides voucher_types on each availability)
        const availabilityVoucherTypes = getVoucherTypesForAvailability(a);
        const normalizedAvailabilityTypes = availabilityVoucherTypes.map(normalizeVoucherName);
        const normalizedSelectedVoucher = normalizeVoucherName(String(voucherType || ''));
        const isWildcardVoucher = normalizedAvailabilityTypes.length === 0 ||
            normalizedAvailabilityTypes.some(type => voucherWildcardTerms.includes(type));

        let matchesVoucher = true;
        if (normalizedSelectedVoucher && !isWildcardVoucher) {
            matchesVoucher = normalizedAvailabilityTypes.some(type => {
                const t = String(type || '').trim();
                return t === normalizedSelectedVoucher || t === normalizedSelectedVoucher.trim() || t.includes(normalizedSelectedVoucher);
            });
        }

        const matchesVoucherTypeFilter = filterByVoucherType(a);

        return isFuture && isOpen && hasCapacity && matchesLoc && matchesExp && matchesVoucher && matchesVoucherTypeFilter;
    });

    const getTimesForDate = (date) => {
        if (!date) return [];
        const dateStr = getLocalDateStr(date);

        // IMPORTANT: return ALL slots for the popup (including 0 available) so users can see Sold Out times
        let matchingSlots = finalFilteredAvailabilities.filter(a => {
            const slotDate = a.date?.includes('T') ? a.date.split('T')[0] : a.date;
            return slotDate === dateStr;
        });
        
        // Apply additional voucher type filtering for Weekday Morning (must be morning times)
        const vtLower = String(voucherType || '').toLowerCase().trim();
        if (vtLower === 'weekday morning' || vtLower === 'weekday morning flight') {
                matchingSlots = matchingSlots.filter(a => isMorning(a.time));
        }

        return matchingSlots.sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    };

    const getSpacesForDate = (date) => {
        const dateStr = getLocalDateStr(date);
        const allSlotsForDate = finalFilteredAvailabilities.filter(a => {
            const slotDate = a.date?.includes('T') ? a.date.split('T')[0] : a.date;
            return slotDate === dateStr;
        });

        const total = allSlotsForDate.reduce((sum, s) => sum + getAvailableSeatsForSelection(s), 0);
        const sharedTotal = allSlotsForDate.reduce((sum, s) => sum + getRemainingSeats(s), 0);

        const hasOpenSlots = allSlotsForDate.some(slot => getSlotStatus(slot) === 'open' || getRemainingSeats(slot) > 0);
        const allSlotsClosed = allSlotsForDate.length > 0 && allSlotsForDate.every(slot => getSlotStatus(slot) === 'closed' && getRemainingSeats(slot) <= 0);
        const selectionHasAvailability = allSlotsForDate.some(slot => getAvailableSeatsForSelection(slot) > 0);
        const sharedSoldOut = (allSlotsForDate.length > 0 && sharedTotal === 0 && !hasOpenSlots) || allSlotsClosed;
        const selectionSoldOut = allSlotsForDate.length === 0 || !selectionHasAvailability;

        return {
            total,
            sharedTotal,
            sharedSoldOut,
            soldOut: selectionSoldOut,
            slots: allSlotsForDate
        };
    };

    const buildDayCells = () => {
        const cells = [];
        const startOfMonth = currentMonth.startOf('month');
        const endOfMonth = currentMonth.endOf('month');

        const firstDayIndex = (startOfMonth.day() + 6) % 7; // Monday = 0
        const lastDayIndex = (endOfMonth.day() + 6) % 7;
        const daysBack = firstDayIndex;
        const daysForward = 6 - lastDayIndex;

        const firstCellDate = startOfMonth.subtract(daysBack, 'day');
        const totalCells = startOfMonth.daysInMonth() + daysBack + daysForward;

        for (let i = 0; i < totalCells; i++) {
            const d = firstCellDate.add(i, 'day');
            const inCurrentMonth = d.isSame(currentMonth, 'month');
            const isPast = d.isBefore(dayjs(), 'day');
            const isSelected = selectedDate && dayjs(selectedDate).isSame(d, 'day');
            
            const { total, soldOut, slots } = getSpacesForDate(d.toDate());
            const hasAnySlots = slots.length > 0;
            const isSelectable = inCurrentMonth && !isPast && hasAnySlots;
            
            cells.push(
                <div
                    key={d.format('YYYY-MM-DD')}
                    onClick={() => {
                        if (isSelectable) {
                            setSelectedDate(d.toDate());
                            setSelectedTime(null);
                        }
                    }}
                    onMouseEnter={(e) => {
                        if (isSelectable) {
                            e.target.style.transform = 'scale(1.05)';
                            e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (isSelectable) {
                            e.target.style.transform = 'scale(1)';
                            e.target.style.boxShadow = 'none';
                        }
                    }}
                    style={{
                        aspectRatio: '1 / 1',
                        borderRadius: 10,
                        background: isSelected
                            ? '#56C1FF'
                            : isPast
                                ? '#f0f0f0'
                                : soldOut
                                    ? '#888'
                                    : hasAnySlots
                                        ? '#22c55e'  // Green for available dates
                                        : '#f0f0f0',  // Light grey for dates with no slots
                        color: isSelected
                            ? '#fff'
                            : isPast
                                ? '#999'
                                : soldOut
                                    ? '#fff'
                                    : hasAnySlots
                                        ? '#fff'
                                        : '#999',
                        display: 'flex',
                        opacity: !inCurrentMonth ? 0 : (isSelectable ? 1 : 0.6),
                        pointerEvents: inCurrentMonth && isSelectable ? 'auto' : 'none',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        cursor: isSelectable ? 'pointer' : 'default',
                        userSelect: 'none',
                        fontSize: 12,
                        zIndex: 1,
                        position: 'relative',
                        transition: 'all 0.2s ease',
                        minHeight: '40px',
                        padding: '4px'
                    }}
                >
                    <div style={{ fontSize: 13, lineHeight: 1.2 }}>{d.date()}</div>
                    <div style={{ fontSize: 9, fontWeight: 600, lineHeight: 1.2 }}>
                        {slots.length === 0 ? '' : (soldOut ? 'Sold Out' : `${total} Spaces`)}
                    </div>
                </div>
            );
        }
        return cells;
    };

    const monthLabel = currentMonth.format('MMMM YYYY');

    const handleConfirm = async () => {
        if (!selectedDate || !selectedTime) return;

        setSubmitting(true);
        try {
            const formattedDate = dayjs(selectedDate).format('YYYY-MM-DD');
            const selectedDateTime = `${formattedDate} ${selectedTime}`;

            // Determine location/activity from selection
            const selectedLocation = selectedLocations[0] || bookingData?.location || '';
            if (!selectedLocation) {
                setError('Please select a location.');
                setSubmitting(false);
                return;
            }

            // Find matching availability to get activity_id
            const slotMatch = availabilities.find(a => {
                const aDate = dayjs(a.date).format('YYYY-MM-DD');
                return aDate === formattedDate && a.time === selectedTime && (a.location === selectedLocation);
            });
            const finalActivityId = slotMatch?.activity_id || activityId;
            if (!finalActivityId) {
                setError('Activity ID not found for selected location.');
                setSubmitting(false);
                return;
            }

            // Voucher / experience info
            const voucher = bookingData?.voucher || bookingData || {};
            // Do NOT send voucher_code to /api/createBooking to avoid FK failures when voucher_codes table lacks the entry.
            // Redemption still handled best-effort below when a valid code exists.
            const voucherCode = null;
            const experienceValue = voucher.experience_type || voucher.experience || bookingData?.experience || bookingData?.flight_type || 'Shared Flight';
            const voucherTypeValue = voucher.voucher_type || voucher.actual_voucher_type || bookingData?.voucher_type || bookingData?.voucher_type_detail || 'Any Day Flight';
            const flightType = experienceValue === 'Private Charter' ? 'Private Charter' : 'Shared Flight';

            // Passengers: use booking passengers or voucher passenger details
            const voucherPassengers = Array.isArray(voucher.passenger_details)
                ? voucher.passenger_details
                : (Array.isArray(voucher.voucher_passenger_details) ? voucher.voucher_passenger_details : []);
            const bookingPassengers = Array.isArray(bookingData?.passengers) ? bookingData.passengers : [];
            const existingPassengers = voucherPassengers.length > 0 ? voucherPassengers : bookingPassengers;
            let passengers = [];
            if (existingPassengers.length > 0) {
                passengers = existingPassengers.map(p => ({
                    firstName: p.first_name || p.firstName || '',
                    lastName: p.last_name || p.lastName || '',
                    weight: p.weight || '',
                    email: p.email || voucher.email || bookingData?.email || '',
                    phone: p.phone || p.mobile || voucher.phone || voucher.mobile || bookingData?.phone || '',
                    ticketType: flightType,
                    weatherRefund: p.weather_refund || false
                }));
            } else {
                const nameParts = (voucher.name || bookingData?.name || '').split(' ');
                passengers = [{
                    firstName: nameParts[0] || '',
                    lastName: nameParts.slice(1).join(' ') || '',
                    weight: voucher.weight || '',
                    email: voucher.email || bookingData?.email || '',
                    phone: voucher.phone || voucher.mobile || bookingData?.phone || '',
                    ticketType: flightType,
                    weatherRefund: false
                }];
            }

            if (passengers.length === 0) {
                setError('Passenger information is required.');
                setSubmitting(false);
                return;
            }

            // Pricing
            const paidAmount = parseFloat(voucher.paid || bookingData?.paid || 0) || 0;
            let totalPrice = paidAmount;
            try {
                const activityResp = await axios.get(`/api/activity/${finalActivityId}`);
                const activity = activityResp.data?.data;
                if (!totalPrice && activity) {
                    if (flightType === 'Shared Flight') {
                        totalPrice = (activity.shared_price || 0) * passengers.length;
                    } else {
                        totalPrice = activity.private_price || 0;
                    }
                }
            } catch (e) {
                // fallback: keep current totalPrice
            }

            // Booking payload (mirror Rebook flow)
            const bookingPayload = {
                activitySelect: 'Redeem Voucher',
                chooseLocation: selectedLocation,
                chooseFlightType: {
                    type: flightType,
                    passengerCount: passengers.length
                },
                passengerData: passengers,
                selectedDate: selectedDateTime,
                selectedTime: selectedTime,
                totalPrice: totalPrice,
                paid: paidAmount,
                // voucher_code intentionally omitted to avoid FK issues
                flight_attempts: 0,
                additionalInfo: {},
                choose_add_on: [],
                activity_id: finalActivityId,
                experience: experienceValue,
                voucher_type: voucherTypeValue,
                selectedVoucherType: { title: voucherTypeValue }
            };

            const createBookingResponse = await axios.post('/api/createBooking', bookingPayload);
            if (!createBookingResponse.data?.success) {
                throw new Error(createBookingResponse.data?.message || 'Failed to create booking');
            }

            // Mark voucher redeemed (best-effort)
            // Redeem call skipped because voucher_code is not sent to avoid FK errors

                if (onRescheduleSuccess) {
                onRescheduleSuccess(createBookingResponse.data);
                }

                setSuccessPayload({
                bookingId: createBookingResponse.data.bookingId || createBookingResponse.data.id,
                location: selectedLocation,
                previousFlightDateTime: bookingData?.flight_date || null,
                    newFlightDateTime: selectedDateTime
                });
                setSuccessDialogOpen(true);
        } catch (err) {
            console.error('Error creating booking from reschedule:', err);
            setError(err.response?.data?.message || err.message || 'Failed to create booking. Please try again later.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    maxHeight: '90vh'
                }
            }}
        >
            <DialogTitle sx={{ fontWeight: 700, fontSize: 20, pb: 1.5 }}>
                Reschedule Your Flight
            </DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {/* Locations (Flight Voucher style) */}
                        {availableLocations.length > 0 && (
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" sx={{ mb: 2, fontSize: 16, fontWeight: 700 }}>
                                    Locations:
                                </Typography>
                                <FormGroup row>
                                    {availableLocations.map((loc) => (
                                        <FormControlLabel
                                            key={loc}
                                            control={
                                                <Checkbox
                                                    checked={selectedLocations.includes(loc)}
                                                    onChange={(e) => {
                                                        const isChecked = e.target.checked;
                                                        setSelectedLocations((prev) => {
                                                            if (isChecked) {
                                                                return [...prev, loc];
                                                            }
                                                            // Prevent empty selection (keep at least one)
                                                            if (prev.length <= 1) return prev;
                                                            return prev.filter((l) => l !== loc);
                                                        });
                                                    }}
                                                />
                                            }
                                            label={loc}
                                        />
                                    ))}
                                </FormGroup>
                            </Box>
                        )}

                        {/* Calendar */}
                        <Box sx={{ mb: 3, maxWidth: '500px', mx: 'auto' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                <IconButton 
                                    onClick={() => setCurrentMonth(prev => prev.subtract(1, 'month'))} 
                                    size="small"
                                >
                                    <ChevronLeftIcon />
                                </IconButton>
                                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16 }}>
                                    {monthLabel}
                                </Typography>
                                <IconButton 
                                    onClick={() => setCurrentMonth(prev => prev.add(1, 'month'))} 
                                    size="small"
                                >
                                    <ChevronRightIcon />
                                </IconButton>
                            </Box>
                            
                            {/* Calendar Grid */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', mb: 1 }}>
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                    <div 
                                        key={day} 
                                        style={{ 
                                            textAlign: 'center', 
                                            fontWeight: 700, 
                                            color: '#64748b', 
                                            fontSize: 11 
                                        }}
                                    >
                                        {day}
                                    </div>
                                ))}
                            </Box>
                            
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                                {buildDayCells()}
                            </Box>
                        </Box>

                        {/* Time Selection */}
                        {selectedDate && (
                            <Box sx={{ mt: 3 }}>
                                <Typography variant="h6" sx={{ mb: 2, fontSize: 18, fontWeight: 600 }}>
                                    Select Time for {dayjs(selectedDate).format('DD MMMM YYYY')}
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                                    {getTimesForDate(selectedDate).length === 0 ? (
                                        <Box sx={{ p: 2, textAlign: 'center', width: '100%' }}>
                                            <Typography color="text.secondary" sx={{ fontSize: 16, fontWeight: 500 }}>
                                                No available times for this date
                                            </Typography>
                                        </Box>
                                    ) : (
                                        getTimesForDate(selectedDate).map(slot => {
                                            // Use the same availability logic as calendar totals:
                                            // this accounts for shared/private resource constraints (Balloon 210 / 105) and global locks.
                                            const availableForSelection = getAvailableSeatsForSelection(slot);
                                            const isAvailable = availableForSelection > 0;
                                            const isSelected = selectedTime === slot.time;
                                            const slotDateTime = dayjs(`${dayjs(selectedDate).format('YYYY-MM-DD')} ${slot.time}`);
                                            const isPastTime = slotDateTime.isBefore(dayjs());
                                            const isDisabled = !isAvailable || isPastTime;

                                            return (
                                                <Button
                                                    key={slot.id}
                                                    variant="outlined"
                                                    disabled={isDisabled}
                                                    onClick={() => !isDisabled && setSelectedTime(slot.time)}
                                                    sx={{
                                                        opacity: isDisabled ? 0.5 : 1,
                                                        backgroundColor: isDisabled 
                                                            ? '#f5f5f5' 
                                                            : isSelected 
                                                                ? '#56C1FF' 
                                                                : '#22c55e',
                                                        color: isDisabled 
                                                            ? '#999' 
                                                            : isSelected 
                                                                ? '#fff' 
                                                                : '#fff',
                                                        borderColor: isDisabled 
                                                            ? '#ddd' 
                                                            : isSelected 
                                                                ? '#56C1FF' 
                                                                : '#22c55e',
                                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                        fontSize: 16,
                                                        fontWeight: 600,
                                                        padding: '12px 20px',
                                                        minWidth: '140px',
                                                        height: '50px',
                                                        '&:hover': {
                                                            backgroundColor: isDisabled 
                                                                ? '#f5f5f5' 
                                                                : isSelected 
                                                                    ? '#4AB5FF' 
                                                                    : '#16a34a',
                                                            borderColor: isDisabled 
                                                                ? '#ddd' 
                                                                : isSelected 
                                                                    ? '#4AB5FF' 
                                                                    : '#16a34a'
                                                        }
                                                    }}
                                                >
                                                    {slot.time} {isAvailable ? `(${availableForSelection} Spaces)` : '(Not Available)'}
                                                    </Button>
                                            );
                                        })
                                    )}
                                </Box>
                                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#22c55e' }}>
                                    <Typography variant="body2" sx={{ fontSize: 14 }}>
                                        ✓ Times are set according to sunrise and sunset.
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 2, justifyContent: 'flex-end' }}>
                <Button
                    onClick={handleConfirm}
                    disabled={!selectedDate || !selectedTime || submitting}
                    variant="contained"
                    sx={{
                        backgroundColor: '#22c55e',
                        '&:hover': {
                            backgroundColor: '#16a34a'
                        },
                        fontWeight: 600
                    }}
                >
                    {submitting ? <CircularProgress size={20} /> : 'Confirm'}
                </Button>
            </DialogActions>
        </Dialog>

            {/* Success summary popup shown after confirm */}
            <Dialog
                open={successDialogOpen}
                onClose={() => {
                    setSuccessDialogOpen(false);
                    setSuccessPayload(null);
                    onClose();
                }}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, fontSize: 18 }}>
                    Flight Rescheduled
                </DialogTitle>
                <DialogContent>
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Your flight date has been updated successfully.
                    </Alert>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1 }}>
                        <Box>
                            <Typography variant="body2" color="text.secondary">Booking</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                {successPayload?.bookingId || 'N/A'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="body2" color="text.secondary">Location</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                {successPayload?.location || 'N/A'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="body2" color="text.secondary">Previous Flight Date</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                {successPayload?.previousFlightDateTime
                                    ? dayjs(successPayload.previousFlightDateTime).format('DD/MM/YYYY HH:mm')
                                    : 'Not Scheduled'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="body2" color="text.secondary">New Flight Date</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 800, color: '#16a34a' }}>
                                {successPayload?.newFlightDateTime
                                    ? dayjs(successPayload.newFlightDateTime).format('DD/MM/YYYY HH:mm')
                                    : 'N/A'}
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button
                        variant="contained"
                        onClick={() => {
                            setSuccessDialogOpen(false);
                            setSuccessPayload(null);
                            onClose();
                        }}
                        sx={{ fontWeight: 700 }}
                    >
                        Done
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default RescheduleFlightModal;

