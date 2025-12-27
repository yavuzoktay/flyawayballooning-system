import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, CircularProgress, FormControl, InputLabel, Select, MenuItem, Box, Checkbox, FormControlLabel, FormGroup, IconButton, TextField, Grid } from '@mui/material';
import dayjs from 'dayjs';
import axios from 'axios';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const RebookAvailabilityModal = ({ open, onClose, location, onSlotSelect, flightType, onFlightTypesChange, onVoucherTypesChange, bookingDetail }) => {
    const [availabilities, setAvailabilities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [error, setError] = useState(null);
    const [activityId, setActivityId] = useState(null);
    
    // New state for activity and location selection
    const [activities, setActivities] = useState([]);
    const [locations, setLocations] = useState([]);
    const [selectedActivity, setSelectedActivity] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [loadingActivities, setLoadingActivities] = useState(false);

    // Yeni: Modalda flight type seçici için state
    const [selectedFlightTypes, setSelectedFlightTypes] = useState([]);
    const [selectedVoucherTypes, setSelectedVoucherTypes] = useState([]);

    // Locations checkbox listesi için state (Gift Voucher ve Flight Voucher için)
    const [availableLocations, setAvailableLocations] = useState([]);
    const [selectedLocations, setSelectedLocations] = useState([]);
    const [giftVoucherActivities, setGiftVoucherActivities] = useState([]); // Activities from /api/activities for Gift Voucher
    const [flightVoucherActivities, setFlightVoucherActivities] = useState([]); // Activities from /api/activities for Flight Voucher
    const [flightVoucherSelectedLocations, setFlightVoucherSelectedLocations] = useState([]); // Selected locations for Flight Voucher
    
    // Gift Voucher için availabilities state
    const [giftVoucherAvailabilities, setGiftVoucherAvailabilities] = useState([]);
    const [giftVoucherFilteredAvailabilities, setGiftVoucherFilteredAvailabilities] = useState([]);
    const [giftVoucherLoading, setGiftVoucherLoading] = useState(false);

    // Purchaser Information state for Gift Vouchers
    const [purchaserFirstName, setPurchaserFirstName] = useState('');
    const [purchaserLastName, setPurchaserLastName] = useState('');
    const [purchaserMobile, setPurchaserMobile] = useState('');
    const [purchaserEmail, setPurchaserEmail] = useState('');
    
    // Passenger Information state for Gift Voucher Redeem
    const [passengerData, setPassengerData] = useState([]);

    const isFlightVoucherDetails = useMemo(() => {
        const bookFlight = (bookingDetail?.voucher?.book_flight || '').toLowerCase();
        const voucherType = (bookingDetail?.voucher?.voucher_type || '').toLowerCase();
        return Boolean(bookingDetail?.voucher) && !bookFlight.includes('gift') && voucherType.includes('flight');
    }, [bookingDetail]);

    const isGiftVoucherDetails = useMemo(() => {
        const bookFlight = (bookingDetail?.voucher?.book_flight || '').toLowerCase();
        return Boolean(bookingDetail?.voucher) && bookFlight.includes('gift');
    }, [bookingDetail]);
    
    // Get numberOfVouchers from bookingDetail
    const numberOfVouchers = useMemo(() => {
        const v = bookingDetail?.voucher || {};
        return v.numberOfVouchers || v.numberOfPassengers || 1;
    }, [bookingDetail]);

    // availableDates state'i
    const [availableDates, setAvailableDates] = useState([]);
    const [filteredAvailabilities, setFilteredAvailabilities] = useState([]);

    // Calendar state (Live Availability style)
    const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));

    // Activity details cache (to get fields not present in activitiesForRebook, e.g. private_charter_voucher_types)
    const [activityDetailsById, setActivityDetailsById] = useState({});
    const [privateCharterVoucherTypes, setPrivateCharterVoucherTypes] = useState([]);
    const [privateCharterVoucherTypesLoading, setPrivateCharterVoucherTypesLoading] = useState(false);

    const normalizeList = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
        const raw = String(value).trim();
        if (!raw) return [];

        // Handle JSON-serialized arrays (common when stored as JSON in DB)
        if ((raw.startsWith('[') && raw.endsWith(']')) || (raw.startsWith('"[') && raw.endsWith(']"'))) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return parsed.map(v => String(v).trim()).filter(Boolean);
                }
            } catch (e) {
                // fall through to CSV parsing
            }
        }

        // CSV fallback
        return raw
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);
    };

    const normalizeVoucherKey = (value) => String(value || '').trim().toLowerCase();
    const isNumericId = (value) => /^\d+$/.test(String(value || '').trim());

    // Load activities and locations on modal open
    useEffect(() => {
        if (open) {
            setLoadingActivities(true);
            // Load activities for rebook (existing functionality)
            axios.get('/api/activitiesForRebook')
                .then(res => {
                    if (res.data.success) {
                        setActivities(res.data.data);
                        const uniqueLocations = [...new Set(res.data.data.map(a => a.location))];
                        setLocations(uniqueLocations.map(loc => ({ location: loc })));
                    }
                })
                .catch(err => {
                    console.error('Error loading activities:', err);
                    // If activitiesForRebook fails, try to use activities endpoint as fallback
                    if (isGiftVoucherDetails) {
                        // For Gift Voucher, we'll use /api/activities which is loaded below
                        console.log('Using /api/activities as fallback for activitiesForRebook');
                    }
                });
            
            // Load activities for Locations checkbox list (Gift Voucher ve Flight Voucher için)
            axios.get('/api/activities')
                .then(res => {
                    // Handle both response formats: { success: true, data: [...] } or direct array
                    const activitiesData = res.data?.data || (Array.isArray(res.data) ? res.data : []);
                    if (Array.isArray(activitiesData) && activitiesData.length > 0) {
                        // Store activities for Gift Voucher
                        setGiftVoucherActivities(activitiesData);
                        // Store activities for Flight Voucher
                        setFlightVoucherActivities(activitiesData);
                        // Extract unique locations from activities with status 'Live'
                        const uniqueLocations = [...new Set(activitiesData
                            .filter(a => a.location && a.status === 'Live')
                            .map(a => a.location)
                        )];
                        setAvailableLocations(uniqueLocations);
                        
                        // If activitiesForRebook failed, use this data as fallback
                        if ((isGiftVoucherDetails || isFlightVoucherDetails) && activities.length === 0) {
                            setActivities(activitiesData);
                            const uniqueLocationsForRebook = [...new Set(activitiesData.map(a => a.location))];
                            setLocations(uniqueLocationsForRebook.map(loc => ({ location: loc })));
                        }
                    }
                })
                .catch(err => {
                    console.error('Error loading activities for locations:', err);
                    // If both endpoints fail, show error but don't block the modal
                    if (isGiftVoucherDetails || isFlightVoucherDetails) {
                        console.warn('Could not load activities. Please ensure backend server is running.');
                    }
                })
                .finally(() => setLoadingActivities(false));

            // Load Private Charter Voucher Types (same source as Settings / Activity popup)
            setPrivateCharterVoucherTypesLoading(true);
            axios.get('/api/private-charter-voucher-types')
                .then(res => {
                    if (res.data?.success && Array.isArray(res.data.data)) {
                        setPrivateCharterVoucherTypes(res.data.data);
                        // #region agent log
                        try{fetch('http://127.0.0.1:7243/ingest/83d02d4f-99e4-4d11-ae4c-75c735988481',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'rebook-private-vt',hypothesisId:'H2',location:'RebookAvailabilityModal.jsx:pcvtLoaded',message:'Loaded private charter voucher types',data:{count:res.data.data.length, sample:res.data.data.slice(0,3).map(v=>({id:v.id,title:v.title}))},timestamp:Date.now()})}).catch(()=>{});}catch(e){}
                        // #endregion
                    }
                })
                .catch(err => {
                    console.warn('Could not load private charter voucher types list:', err?.message || err);
                    setPrivateCharterVoucherTypes([]);
                })
                .finally(() => setPrivateCharterVoucherTypesLoading(false));
        } else {
            setAvailabilities([]);
            setSelectedDate(null);
            setSelectedTime(null);
            setActivityId(null);
            setSelectedActivity('');
            setSelectedLocation('');
            setSelectedFlightTypes([]);
            setSelectedVoucherTypes([]);
            setSelectedLocations([]);
            setGiftVoucherActivities([]);
            setGiftVoucherAvailabilities([]);
            setGiftVoucherFilteredAvailabilities([]);
            setPurchaserFirstName('');
            setPurchaserLastName('');
            setPurchaserMobile('');
            setPurchaserEmail('');
            setPassengerData([]);
            setPrivateCharterVoucherTypes([]);
            setPrivateCharterVoucherTypesLoading(false);
        }
    }, [open, location, bookingDetail]);
    
    // Initialize passenger data based on numberOfVouchers when modal opens
    useEffect(() => {
        if (open && isGiftVoucherDetails && numberOfVouchers > 0) {
            // Initialize passenger data array with empty objects
            const initialPassengerData = Array.from({ length: numberOfVouchers }, (_, index) => ({
                firstName: '',
                lastName: '',
                weight: '',
                mobile: '',
                email: ''
            }));
            setPassengerData(initialPassengerData);
            console.log('Initialized passenger data for', numberOfVouchers, 'vouchers');
        }
    }, [open, isGiftVoucherDetails, numberOfVouchers]);
    
    // Gift Voucher: Fetch availabilities when location is selected
    useEffect(() => {
        if (isGiftVoucherDetails && selectedLocations.length > 0 && giftVoucherActivities.length > 0) {
            setGiftVoucherLoading(true);
            setGiftVoucherAvailabilities([]);
            setGiftVoucherFilteredAvailabilities([]);
            setSelectedDate(null);
            setSelectedTime(null);
            
            // Get the first selected location (or combine all selected locations)
            const firstSelectedLocation = selectedLocations[0];
            
            // Find activity for the selected location from giftVoucherActivities
            const activityForLocation = giftVoucherActivities.find(a => a.location === firstSelectedLocation);
            
            if (activityForLocation) {
                console.log('Fetching availabilities for Gift Voucher location:', firstSelectedLocation, 'activity ID:', activityForLocation.id);
                axios.get(`/api/activity/${activityForLocation.id}/availabilities`)
                    .then(res => {
                        if (res.data.success) {
                            const data = Array.isArray(res.data.data) ? res.data.data : [];
                            console.log('Gift Voucher availabilities loaded:', data.length, 'slots');
                            console.log('Sample availability data:', data.length > 0 ? {
                                date: data[0].date,
                                time: data[0].time,
                                available: data[0].available,
                                capacity: data[0].capacity,
                                status: data[0].status
                            } : 'No data');
                            // Filter only open/available slots
                            const filteredData = data.filter(slot => {
                                const status = slot.status || slot.calculated_status || '';
                                const available = Number(slot.available) || Number(slot.calculated_available) || 0;
                                return (status.toLowerCase() === 'open' || available > 0);
                            });
                            console.log('Filtered availabilities (Open status or available > 0):', filteredData.length);
                            setGiftVoucherAvailabilities(filteredData);
                            setGiftVoucherFilteredAvailabilities(filteredData);
                        } else {
                            console.warn('Gift Voucher availabilities response not successful:', res.data);
                            setGiftVoucherAvailabilities([]);
                            setGiftVoucherFilteredAvailabilities([]);
                        }
                    })
                    .catch(err => {
                        console.error('Error loading availabilities for Gift Voucher:', err);
                        // Show user-friendly error message
                        if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
                            console.warn('Network error: Backend server may not be running. Please check server status.');
                        }
                        setGiftVoucherAvailabilities([]);
                        setGiftVoucherFilteredAvailabilities([]);
                    })
                    .finally(() => setGiftVoucherLoading(false));
            } else {
                console.warn('Activity not found for location:', firstSelectedLocation);
                setGiftVoucherLoading(false);
            }
        } else if (isGiftVoucherDetails && selectedLocations.length === 0) {
            // Reset when no locations selected
            setGiftVoucherAvailabilities([]);
            setGiftVoucherFilteredAvailabilities([]);
            setSelectedDate(null);
            setSelectedTime(null);
        }
    }, [selectedLocations, giftVoucherActivities, isGiftVoucherDetails]);

    // Flight Voucher: Location seçildiğinde activity'yi otomatik ayarla
    useEffect(() => {
        if (isFlightVoucherDetails && flightVoucherSelectedLocations.length > 0 && flightVoucherActivities.length > 0) {
            const firstSelectedLocation = flightVoucherSelectedLocations[0];
            const activityForLocation = flightVoucherActivities.find(a => a.location === firstSelectedLocation && a.status === 'Live');
            if (activityForLocation) {
                setSelectedLocation(firstSelectedLocation);
                setSelectedActivity(activityForLocation.activity_name);
                setActivityId(activityForLocation.id);
            }
        } else if (isFlightVoucherDetails && flightVoucherSelectedLocations.length === 0) {
            // Reset when no locations selected
            setSelectedDate(null);
            setSelectedTime(null);
            setActivityId(null);
        }
    }, [flightVoucherSelectedLocations, flightVoucherActivities, isFlightVoucherDetails]);

    // Set default values after activities are loaded
    useEffect(() => {
        if (!(open && activities.length > 0)) {
            return;
        }

        const booking = bookingDetail?.booking || {};
        const voucher = bookingDetail?.voucher || {};

        let locationToUse = booking.location || voucher.location || location || '';
        if (!locationToUse && activities.length > 0) {
            locationToUse = activities[0].location;
        }
        if (locationToUse) {
            setSelectedLocation(locationToUse);
        }

        let existingActivity = null;
        if (locationToUse) {
            const fromBooking = booking.activity || booking.activity_name;
            if (fromBooking) {
                existingActivity = activities.find(a => a.location === locationToUse && a.activity_name === fromBooking);
            }
            if (!existingActivity) {
                existingActivity = activities.find(a => a.location === locationToUse);
            }
        }
        if (!existingActivity && activities.length > 0) {
            existingActivity = activities[0];
            }
            if (existingActivity) {
                setSelectedActivity(existingActivity.activity_name);
            if (existingActivity.location && existingActivity.location !== locationToUse) {
                setSelectedLocation(existingActivity.location);
            }
        }

        const flightSource = [
            booking.flight_type,
            booking.experience,
            voucher.experience_type,
            voucher.flight_type
        ].filter(Boolean).join(' ').toLowerCase();

        const flightDefaults = [];
        if (flightSource.includes('private')) flightDefaults.push('private');
        if (flightSource.includes('shared')) flightDefaults.push('shared');
        if (flightDefaults.length === 0) {
            flightDefaults.push('private', 'shared');
            }
        setSelectedFlightTypes(Array.from(new Set(flightDefaults)));

        const voucherSource = [
            booking.voucher_type,
            booking.book_flight,
            voucher.book_flight,
            voucher.voucher_type
        ].filter(Boolean).join(' ').toLowerCase();

        const voucherDefaults = [];
        if (voucherSource.includes('weekday morning') || (voucherSource.includes('weekday') && voucherSource.includes('morning'))) {
            voucherDefaults.push('weekday morning');
        }
        if (voucherSource.includes('flexible weekday') || voucherSource.includes('flexible')) {
            voucherDefaults.push('flexible weekday');
        }
        if (voucherSource.includes('any day flight') || voucherSource.includes('any day')) {
            voucherDefaults.push('any day flight');
        }
        if (voucherDefaults.length === 0) {
            voucherDefaults.push('weekday morning', 'flexible weekday', 'any day flight');
            }
        setSelectedVoucherTypes(Array.from(new Set(voucherDefaults)));
    }, [activities, open, bookingDetail, location]);

    // Set calendar to current month (not booking date) when modal opens
    useEffect(() => {
        if (open && selectedActivity && selectedLocation) {
            // Always start with current month, not the old booking date
            const today = dayjs();
            console.log('Setting calendar to current month:', today.format('YYYY-MM-DD'));
            setCurrentMonth(today.startOf('month'));
            
            // If there's a booking date, just select it but don't change the month
            if (bookingDetail?.booking?.flight_date) {
            const bookingDate = dayjs(bookingDetail.booking.flight_date);
                console.log('Booking date (for reference):', bookingDate.format('YYYY-MM-DD HH:mm'));
            setSelectedDate(bookingDate.toDate());
            
            // Extract time from flight_date if available
            const timeString = bookingDate.format('HH:mm');
            if (timeString && timeString !== '00:00') {
                setSelectedTime(timeString);
                }
            }
        }
    }, [open, bookingDetail, selectedActivity, selectedLocation]);

    // Debug: Track selectedDate changes
    useEffect(() => {
        console.log('selectedDate changed:', selectedDate ? dayjs(selectedDate).format('YYYY-MM-DD') : 'null');
    }, [selectedDate]);

    // Debug: Track currentMonth changes
    useEffect(() => {
        console.log('🗓️ currentMonth changed:', currentMonth.format('YYYY-MM'), '(should be', dayjs().format('YYYY-MM'), 'for current month)');
    }, [currentMonth]);

    // Fetch availabilities (sadece activity/location değişince)
    useEffect(() => {
        if (selectedActivity && selectedLocation) {
            // Reset previous state to avoid stale calendar when changing activity/location
            setAvailabilities([]);
            setFilteredAvailabilities([]);
            setAvailableDates([]);
            setSelectedDate(null);
            setSelectedTime(null);

            setLoading(true);
            setError(null);
            const activity = activities.find(a => a.activity_name === selectedActivity && a.location === selectedLocation);
            if (activity) {
                setActivityId(activity.id);
                axios.get(`/api/activity/${activity.id}/availabilities`)
                    .then(res => {
                        if (res.data.success) {
                            const data = Array.isArray(res.data.data) ? res.data.data : [];
                            setAvailabilities(data);
                            // Don't override existing selections
                            if (selectedFlightTypes.length === 0) {
                                const flightTypes = ['private', 'shared'];
                                setSelectedFlightTypes(flightTypes);
                            }
                            if (selectedVoucherTypes.length === 0) {
                                const voucherTypes = ['weekday morning', 'flexible weekday', 'any day flight'];
                                setSelectedVoucherTypes(voucherTypes);
                            }
                            // Don't set currentMonth from availability data - let it stay at current month
                            // const firstDate = data?.[0]?.date;
                            // if (firstDate) setCurrentMonth(dayjs(firstDate).startOf('month'));
                        } else {
                            setAvailabilities([]);
                        }
                    })
                    .catch(() => setError('Could not fetch availabilities'))
                    .finally(() => setLoading(false));
            }
        }
    }, [selectedActivity, selectedLocation, activities]);

    // Ensure we have full activity details (especially private_charter_voucher_types) like Activity popup
    useEffect(() => {
        if (!open) return;
        if (!activityId) return;
        if (activityDetailsById[activityId]) return;

        axios.get(`/api/activity/${activityId}`)
            .then(res => {
                if (res.data?.success && res.data?.data) {
                    setActivityDetailsById(prev => ({ ...prev, [activityId]: res.data.data }));
                }
            })
            .catch(err => {
                console.warn('Could not load activity details for rebook voucher types:', err?.message || err);
            });
    }, [open, activityId, activityDetailsById]);

    // Determine private voucher type options from selected activity (same source as Activity popup "Private Charter Voucher Types")
    const selectedActivityRecord = useMemo(() => {
        if (!selectedActivity || !selectedLocation) return null;
        return activities.find(a => a.activity_name === selectedActivity && a.location === selectedLocation) || null;
    }, [activities, selectedActivity, selectedLocation]);

    const privateVoucherTypeRawValues = useMemo(() => {
        // Activity payload may contain `private_charter_voucher_types` as CSV string or array of titles.
        // Example titles: "Private Charter", "Proposal Flight"
        const detailed = activityId ? activityDetailsById[activityId] : null;
        const raw =
            selectedActivityRecord?.private_charter_voucher_types ??
            detailed?.private_charter_voucher_types ??
            detailed?.privateCharterVoucherTypes ??
            null;
        return normalizeList(raw).filter(v => v && String(v).toLowerCase() !== 'null');
    }, [selectedActivityRecord, activityId, activityDetailsById]);

    const privateVoucherTypeOptions = useMemo(() => {
        const values = privateVoucherTypeRawValues;

        // If activity stores IDs (common), map them to titles using /api/private-charter-voucher-types
        if (values.length > 0 && values.every(isNumericId) && privateCharterVoucherTypes.length > 0) {
            const byId = new Map(privateCharterVoucherTypes.map(vt => [String(vt.id), vt.title]));
            const mapped = values
                .map(id => byId.get(String(id)) || null)
                .filter(Boolean);
            // If we have raw IDs but none map (schema mismatch / unexpected ids),
            // fall back to showing all private voucher type titles we fetched so UI isn't empty.
            if (mapped.length === 0) {
                return privateCharterVoucherTypes.map(vt => vt.title).filter(Boolean);
            }
            return mapped;
        }

        // Otherwise assume activity already stores titles
        if (values.length > 0) return values;

        // Fallback (more robust): infer from availabilities voucher types when activity config is missing.
        // Availability records include voucher_types / voucher_types_array (titles).
        if (privateCharterVoucherTypes.length > 0 && Array.isArray(availabilities) && availabilities.length > 0) {
            const privateTitles = new Set(privateCharterVoucherTypes.map(vt => normalizeVoucherKey(vt.title)));
            const inferred = new Set();
            availabilities.forEach(a => {
                const rawTypes = Array.isArray(a?.voucher_types_array)
                    ? a.voucher_types_array
                    : normalizeList(a?.voucher_types);
                rawTypes.forEach(t => {
                    const key = normalizeVoucherKey(t);
                    if (privateTitles.has(key)) {
                        inferred.add(String(t).trim());
                    }
                });
            });
            return Array.from(inferred);
        }

        return [];
    }, [privateVoucherTypeRawValues, privateCharterVoucherTypes]);


    const sharedVoucherTypeOptions = useMemo(() => ([
        { key: 'weekday morning', label: 'Weekday Morning' },
        { key: 'flexible weekday', label: 'Flexible Weekday' },
        { key: 'any day flight', label: 'Any Day Flight' }
    ]), []);

    // When switching to private selection, default-select the first private voucher type for this activity if none are selected yet.
    useEffect(() => {
        if (!open) return;
        if (!selectedFlightTypes.includes('private')) return;
        if (!privateVoucherTypeOptions || privateVoucherTypeOptions.length === 0) return;

        const selectedKeys = new Set(selectedVoucherTypes.map(normalizeVoucherKey));
        const privateKeys = privateVoucherTypeOptions.map(normalizeVoucherKey);
        const hasAnyPrivateSelected = privateKeys.some(k => selectedKeys.has(k));
        if (!hasAnyPrivateSelected) {
            // Select only the first private voucher type (single selection)
            setSelectedVoucherTypes([privateVoucherTypeOptions[0]]);
        }
    }, [open, selectedFlightTypes, privateVoucherTypeOptions, selectedVoucherTypes]);

    // Flight type değişince sadece filtrele ve voucher types'ı temizle
    useEffect(() => {
        // If no flight types selected, clear
        if (selectedFlightTypes.length === 0) {
            setFilteredAvailabilities([]);
            setAvailableDates([]);
            setSelectedDate(null);
            setSelectedTime(null);
            setSelectedVoucherTypes([]);
            return;
        }

        // When flight type changes, clear voucher types that don't match the new flight type
        const normalizeType = t => t.replace(' Flight', '').trim().toLowerCase();
        const selectedTypes = selectedFlightTypes.map(t => normalizeType(t));
        
        // Clear voucher types that don't match current flight type
        if (selectedFlightTypes.includes('shared')) {
            // If shared is selected, remove all private voucher types
            setSelectedVoucherTypes(prev => prev.filter(vt => {
                const key = normalizeVoucherKey(vt);
                return sharedVoucherTypeOptions.some(opt => opt.key === key);
            }));
        } else if (selectedFlightTypes.includes('private')) {
            // If private is selected, remove all shared voucher types
            setSelectedVoucherTypes(prev => prev.filter(vt => {
                const key = normalizeVoucherKey(vt);
                return !sharedVoucherTypeOptions.some(opt => opt.key === key);
            }));
        }
 
        const filtered = availabilities.filter(a => {
            if (a.status && a.status.toLowerCase() !== 'open') return false;
            if (a.available !== undefined && a.available <= 0) return false;
            const slotDateTime = dayjs(`${a.date} ${a.time}`);
            if (slotDateTime.isBefore(dayjs())) return false;
            if (!a.flight_types || a.flight_types.toLowerCase() === 'all') return true;
            const typesArr = a.flight_types.split(',').map(t => normalizeType(t));
            return selectedTypes.some(selectedType => typesArr.includes(selectedType));
        });
 
        setFilteredAvailabilities(filtered);
        // Don't reset selectedDate when flight types change - let user keep their selection
        // setSelectedDate(null);
        // setSelectedTime(null);
        setAvailableDates(Array.from(new Set(filtered.map(a => a.date))).filter(date => date));
    }, [selectedFlightTypes, availabilities, sharedVoucherTypeOptions]);

    // Flight type değişince selectedDate ve selectedTime sıfırlansın (mevcut booking tarihini koru)
    useEffect(() => {
        // Eğer mevcut booking tarihi varsa ve modal yeni açılmışsa, tarihi koru
        if (open && bookingDetail?.booking?.flight_date && selectedActivity && selectedLocation) {
            const bookingDate = dayjs(bookingDetail.booking.flight_date);
            // Sadece farklı bir tarih seçilmişse sıfırla - ama kullanıcı manuel seçim yapmışsa koru
            if (!selectedDate || !dayjs(selectedDate).isSame(bookingDate, 'day')) {
                setSelectedDate(bookingDate.toDate());
                const timeString = bookingDate.format('HH:mm');
                if (timeString && timeString !== '00:00') {
                    setSelectedTime(timeString);
                }
            }
        } else if (!open) {
            // Sadece modal kapandığında sıfırla
            setSelectedDate(null);
            setSelectedTime(null);
        }
    }, [open, bookingDetail, selectedActivity, selectedLocation]);

    // Notify parent component when flight types change
    useEffect(() => {
        if (onFlightTypesChange) {
            onFlightTypesChange(selectedFlightTypes);
        }
    }, [selectedFlightTypes, onFlightTypesChange]);

    // Notify parent component when voucher types change
    useEffect(() => {
        if (onVoucherTypesChange) {
            onVoucherTypesChange(selectedVoucherTypes);
        }
    }, [selectedVoucherTypes, onVoucherTypesChange]);

    const getTimesForDate = (date, useGiftVoucher = false) => {
        if (!date) return [];
        const dateStr = dayjs(date).format('YYYY-MM-DD');
        const availabilitiesToUse = useGiftVoucher ? giftVoucherFilteredAvailabilities : filteredAvailabilities;
        console.log('getTimesForDate called:', {
            date,
            dateStr,
            useGiftVoucher,
            availabilitiesCount: availabilitiesToUse.length,
            matchingSlots: availabilitiesToUse.filter(a => {
                const slotDate = a.date ? (a.date.includes('T') ? a.date.split('T')[0] : a.date) : '';
                return slotDate === dateStr;
            }).length
        });
        // Handle both date formats: "2025-11-14" or "2025-11-14T00:00:00.000Z"
        const times = availabilitiesToUse.filter(a => {
            if (!a.date) return false;
            const slotDate = a.date.includes('T') ? a.date.split('T')[0] : a.date;
            return slotDate === dateStr;
        });
        console.log('Filtered times for date:', dateStr, 'count:', times.length, 'times:', times.map(t => ({ time: t.time, date: t.date })));
        return times;
    };

    // Live Availability helpers
    const monthLabel = currentMonth.format('MMMM YYYY');
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const startDay = startOfMonth.day(); // 0-6 (Sun-Sat)

    const buildDayCells = (useGiftVoucher = false) => {
        const cells = [];
        // Create a 6-week grid (42 cells)
        // Calendar headers: Mon, Tue, Wed, Thu, Fri, Sat, Sun
        // We need to find the Monday of the week containing the 1st of the month
        
        // Get day of week for 1st of month (0=Sunday, 1=Monday, ..., 6=Saturday)
        const firstDayOfMonth = startOfMonth.day();
        
        // Calculate offset to previous Monday
        // Monday (1): 0 days back
        // Tuesday (2): 1 day back  
        // Wednesday (3): 2 days back
        // Thursday (4): 3 days back
        // Friday (5): 4 days back
        // Saturday (6): 5 days back
        // Sunday (0): 6 days back
        let daysBack;
        if (firstDayOfMonth === 0) {
            daysBack = 6; // Sunday -> go back to Monday
        } else {
            daysBack = firstDayOfMonth - 1; // Other days -> go back to Monday
        }
        
        const firstCellDate = startOfMonth.subtract(daysBack, 'day');
        
        // Use appropriate availabilities based on context
        const availabilitiesToUse = useGiftVoucher ? giftVoucherFilteredAvailabilities : filteredAvailabilities;
        
        console.log('Calendar Debug:', {
            month: currentMonth.format('MMMM YYYY'),
            firstDayOfMonth: firstDayOfMonth,
            firstDayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][firstDayOfMonth],
            daysBack,
            firstCellDate: firstCellDate.format('YYYY-MM-DD (ddd)'),
            shouldStartWith: 'Monday',
            useGiftVoucher,
            availabilitiesCount: availabilitiesToUse.length
        });
        
        for (let i = 0; i < 42; i++) {
            const d = firstCellDate.add(i, 'day');
            const inCurrentMonth = d.isSame(currentMonth, 'month');
            const isPast = d.isBefore(dayjs(), 'day');
            const isSelected = selectedDate && dayjs(selectedDate).isSame(d, 'day');
            
            // Debug first few dates to verify alignment
            if (i < 10) {
                console.log(`Cell ${i}: ${d.format('YYYY-MM-DD (ddd)')}, day of week: ${d.day()}`);
            }
            
            if (isSelected) {
                console.log('Date is selected:', d.format('YYYY-MM-DD'), 'selectedDate:', selectedDate ? dayjs(selectedDate).format('YYYY-MM-DD') : 'null');
            }
            // Aggregate availability for this date
            // Handle both date formats: "2025-11-14" or "2025-11-14T00:00:00.000Z"
            const dateStr = d.format('YYYY-MM-DD');
            const slots = availabilitiesToUse.filter(a => {
                if (!a.date) return false;
                const slotDate = a.date.includes('T') ? a.date.split('T')[0] : a.date;
                return slotDate === dateStr;
            });
            const totalAvailable = slots.reduce((acc, s) => acc + (Number(s.available) || 0), 0);
            const soldOut = slots.length > 0 && totalAvailable <= 0;
            
            // Debug: soldOut durumunu logla
            if (slots.length > 0 && totalAvailable <= 0) {
                console.log(`Date ${d.format('YYYY-MM-DD')} is sold out:`, {
                    slotsLength: slots.length,
                    totalAvailable,
                    slots: slots.map(s => ({ id: s.id, available: s.available, capacity: s.capacity }))
                });
            }
            // Tarih seçilebilir olmalı eğer:
            // 1. Mevcut ay içinde
            // 2. Geçmiş değil
            // Sold out kontrolünü kaldırıyoruz - kullanıcı her tarihe tıklayabilmeli
            const isCurrentBookingDate = bookingDetail?.booking?.flight_date && dayjs(bookingDetail.booking.flight_date).isSame(d, 'day');
            const isSelectable = inCurrentMonth && !isPast;
            
            // Debug: Tarih seçilebilirlik durumunu logla
            if (inCurrentMonth && !isPast) {
                console.log(`Date ${d.format('YYYY-MM-DD')}:`, {
                    inCurrentMonth,
                    isPast,
                    soldOut,
                    isSelectable,
                    slotsLength: slots.length,
                    totalAvailable,
                    note: 'Sold out kontrolü kaldırıldı - tüm tarihler tıklanabilir'
                });
            }

            cells.push(
                <div
                    key={d.format('YYYY-MM-DD')}
                    onClick={() => {
                        console.log(`CLICKED on ${d.format('YYYY-MM-DD')}:`, {
                            isSelectable,
                            inCurrentMonth,
                            isPast,
                            soldOut,
                            slotsLength: slots.length
                        });
                        if (isSelectable) {
                            console.log('Setting selected date to:', d.format('YYYY-MM-DD'));
                            setSelectedDate(d.toDate());
                            setSelectedTime(null);
                            console.log('Date selected successfully:', d.format('YYYY-MM-DD'), 'has slots:', slots.length > 0);
                        } else {
                            console.log('Date not selectable:', d.format('YYYY-MM-DD'));
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
                            : isCurrentBookingDate 
                                ? '#3b82f6'  // Mevcut booking tarihi için mavi
                                : '#22c55e',  // Tüm tıklanabilir tarihler yeşil
                        color: isSelected 
                            ? '#fff' 
                            : isCurrentBookingDate 
                                ? '#fff'  // Mevcut booking tarihi için beyaz yazı
                                : '#fff',  // Tüm tıklanabilir tarihler beyaz yazı
                        display: 'flex',  // Always flex for Grid - use opacity for visibility
                        opacity: !inCurrentMonth ? 0 : (isSelectable ? 1 : 0.6),  // Hide other months, dim unselectable dates
                        pointerEvents: inCurrentMonth && isSelectable ? 'auto' : 'none',  // Disable interaction for hidden/unselectable dates
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        cursor: isSelectable ? 'pointer' : 'default',
                        userSelect: 'none',
                        fontSize: 14,
                        zIndex: 1,
                        position: 'relative',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <div>{d.date()}</div>
                    <div style={{ fontSize: 10, fontWeight: 600 }}>
                        {isCurrentBookingDate 
                            ? 'Current' 
                            : (slots.length === 0 ? '' : (soldOut ? 'Sold Out' : `${totalAvailable} Spaces`))
                        }
                    </div>
                </div>
            );
        }
        return cells;
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {isGiftVoucherDetails ? 'Redeem - Select New Options' : 'Rebook - Select New Options & Time'}
            </DialogTitle>
            <DialogContent>
                {loadingActivities ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {isFlightVoucherDetails && (
                            <>
                                {/* Locations Checkbox List */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="h6" sx={{ mb: 2 }}>Locations:</Typography>
                                    <FormGroup row>
                                        {availableLocations.map((loc) => (
                                            <FormControlLabel
                                                key={loc}
                                                control={
                                                    <Checkbox
                                                        checked={flightVoucherSelectedLocations.includes(loc)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setFlightVoucherSelectedLocations(prev => [...prev, loc]);
                                                            } else {
                                                                setFlightVoucherSelectedLocations(prev => prev.filter(l => l !== loc));
                                                            }
                                                        }}
                                                    />
                                                }
                                                label={loc}
                                            />
                                        ))}
                                    </FormGroup>
                                </Box>
                            </>
                        )}

                        {/* Gift Voucher: Locations Checkbox List and Calendar */}
                        {isGiftVoucherDetails && (
                            <>
                                {/* Locations Checkbox List */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="h6" sx={{ mb: 2 }}>Locations:</Typography>
                                    <FormGroup row>
                                        {availableLocations.map((loc) => (
                                            <FormControlLabel
                                                key={loc}
                                                control={
                                                    <Checkbox
                                                        checked={selectedLocations.includes(loc)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedLocations(prev => [...prev, loc]);
                                                            } else {
                                                                setSelectedLocations(prev => prev.filter(l => l !== loc));
                                                            }
                                                        }}
                                                    />
                                                }
                                                label={loc}
                                            />
                                        ))}
                                    </FormGroup>
                                </Box>
                                
                                {/* Calendar for Gift Voucher */}
                                {giftVoucherLoading ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                        <CircularProgress />
                                    </Box>
                                ) : selectedLocations.length > 0 ? (
                                    <>
                                        {/* Live Availability style calendar */}
                                        <Box sx={{ mb: 2 }} key={`calendar-gift-${selectedDate ? dayjs(selectedDate).format('YYYY-MM-DD') : 'no-date'}`}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                                <IconButton onClick={() => setCurrentMonth(prev => prev.subtract(1, 'month'))} size="small"><ChevronLeftIcon fontSize="small" /></IconButton>
                                                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>{monthLabel}</Typography>
                                                <IconButton onClick={() => setCurrentMonth(prev => prev.add(1, 'month'))} size="small"><ChevronRightIcon fontSize="small" /></IconButton>
                                            </Box>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', mb: 1 }}>
                                                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(w => (
                                                    <div key={w} style={{ textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: 12 }}>{w}</div>
                                                ))}
                                            </Box>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                                                {buildDayCells(true)}
                                            </Box>
                                </Box>

                                        {selectedDate && (
                                            <>
                                                <Typography variant="h6" sx={{ mb: 2, fontSize: 18, fontWeight: 600 }}>Available Times for {dayjs(selectedDate).format('DD/MM/YYYY')}:</Typography>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                                    {getTimesForDate(selectedDate, true).length === 0 && (
                                                        <Box sx={{ p: 2, textAlign: 'center', width: '100%' }}>
                                                            <Typography color="text.secondary" sx={{ fontSize: 16, fontWeight: 500 }}>
                                                                No available times for this date
                                                            </Typography>
                                                            <Typography color="text.secondary" sx={{ fontSize: 14, mt: 1 }}>
                                                                Please select a different date or contact us for availability
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {getTimesForDate(selectedDate, true).map(slot => {
                                                        const isAvailable = slot.available > 0;
                                                        // Format time: "09:00:00" -> "09:00"
                                                        const timeDisplay = slot.time ? (slot.time.includes(':') ? slot.time.substring(0, 5) : slot.time) : '';
                                                        const timeForComparison = slot.time ? (slot.time.includes(':') ? slot.time.substring(0, 5) : slot.time) : '';
                                                        const isSelected = selectedTime === slot.time || selectedTime === timeForComparison;
                                                        const slotDateTime = dayjs(`${dayjs(selectedDate).format('YYYY-MM-DD')} ${slot.time}`);
                                                        const isPastTime = slotDateTime.isBefore(dayjs());
                                                        const isDisabled = !isAvailable || isPastTime;
                                                        return (
                                                            <Button
                                                                key={slot.id}
                                                                variant="outlined"
                                                                disabled={isDisabled}
                                                                onClick={() => {
                                                                    if (!isDisabled) {
                                                                        // Store the full time format for consistency
                                                                        setSelectedTime(slot.time);
                                                                        console.log('Time selected:', slot.time, 'for date:', dayjs(selectedDate).format('YYYY-MM-DD'));
                                                                    }
                                                                }}
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
                                                                {timeDisplay} ({(Number(slot.available) || Number(slot.calculated_available) || 0)} Spaces)
                                                            </Button>
                                                        );
                                                    })}
                                                </div>
                                                
                                                {/* Passenger Information Forms - Only show when date and time are selected */}
                                                {selectedDate && selectedTime && (
                                                    <Box sx={{ mt: 4 }}>
                                                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Passenger Information</Typography>
                                                        {passengerData.map((passenger, index) => (
                                                        <Box 
                                                            key={index} 
                                                            sx={{ 
                                                                mb: 3, 
                                                                p: 3, 
                                                                border: '1px solid #e0e0e0', 
                                                                borderRadius: 2, 
                                                                backgroundColor: '#fafafa' 
                                                            }}
                                                        >
                                                            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                                                                Passenger {index + 1}
                                                            </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="First Name"
                                                placeholder="First Name"
                                                                        value={passenger.firstName}
                                                                        onChange={(e) => {
                                                                            const updated = [...passengerData];
                                                                            updated[index].firstName = e.target.value;
                                                                            setPassengerData(updated);
                                                                        }}
                                                required
                                                variant="outlined"
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Last Name"
                                                placeholder="Last Name"
                                                                        value={passenger.lastName}
                                                                        onChange={(e) => {
                                                                            const updated = [...passengerData];
                                                                            updated[index].lastName = e.target.value;
                                                                            setPassengerData(updated);
                                                                        }}
                                                required
                                                variant="outlined"
                                            />
                                        </Grid>
                                                                <Grid item xs={12} sm={6}>
                                                                    <TextField
                                                                        fullWidth
                                                                        label="Weight (Kg)"
                                                                        placeholder="Max 18 Stone / 114Kg"
                                                                        type="number"
                                                                        value={passenger.weight}
                                                                        onChange={(e) => {
                                                                            const updated = [...passengerData];
                                                                            updated[index].weight = e.target.value;
                                                                            setPassengerData(updated);
                                                                        }}
                                                                        variant="outlined"
                                                                        inputProps={{ min: 0, max: 114 }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Mobile Number"
                                                placeholder="Mobile Number"
                                                                        value={passenger.mobile}
                                                                        onChange={(e) => {
                                                                            const updated = [...passengerData];
                                                                            updated[index].mobile = e.target.value;
                                                                            setPassengerData(updated);
                                                                        }}
                                                required
                                                variant="outlined"
                                            />
                                        </Grid>
                                                                <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Email"
                                                placeholder="Email"
                                                type="email"
                                                                        value={passenger.email}
                                                                        onChange={(e) => {
                                                                            const updated = [...passengerData];
                                                                            updated[index].email = e.target.value;
                                                                            setPassengerData(updated);
                                                                        }}
                                                required
                                                variant="outlined"
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>
                                                        ))}
                                                    </Box>
                                                )}
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <Box sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography color="text.secondary" sx={{ fontSize: 16, fontWeight: 500 }}>
                                            Please select at least one location to view available dates
                                        </Typography>
                                </Box>
                                )}
                            </>
                        )}

                        {/* Date and Time Selection */}
                        {((selectedActivity && selectedLocation) || isFlightVoucherDetails) && !isGiftVoucherDetails && (
                            <>
                                {/* Flight Type Selector */}
                                {!isFlightVoucherDetails && !isGiftVoucherDetails && (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="h6" sx={{ mb: 2 }}>Flight Type:</Typography>
                                    <FormGroup row>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={selectedFlightTypes.includes('private')}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            // If private is selected, remove shared and set only private
                                                            setSelectedFlightTypes(['private']);
                                                        } else {
                                                            // If unchecking, remove private
                                                            setSelectedFlightTypes(prev => prev.filter(t => t !== 'private'));
                                                        }
                                                    }}
                                                />
                                            }
                                            label="Private"
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={selectedFlightTypes.includes('shared')}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            // If shared is selected, remove private and set only shared
                                                            setSelectedFlightTypes(['shared']);
                                                        } else {
                                                            // If unchecking, remove shared
                                                            setSelectedFlightTypes(prev => prev.filter(t => t !== 'shared'));
                                                        }
                                                    }}
                                                />
                                            }
                                            label="Shared"
                                        />
                                    </FormGroup>
                                </Box>
                                )}

                                {/* Voucher Type Selector */}
                                {!isFlightVoucherDetails && !isGiftVoucherDetails && (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="h6" sx={{ mb: 2 }}>Voucher Type:</Typography>
                                    {/* Shared voucher types (only relevant when Shared flight is selected) */}
                                    {selectedFlightTypes.includes('shared') && (
                                        <FormGroup row>
                                            {sharedVoucherTypeOptions.map(opt => (
                                                <FormControlLabel
                                                    key={opt.key}
                                                    control={
                                                        <Checkbox
                                                            checked={selectedVoucherTypes.map(normalizeVoucherKey).includes(opt.key)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    // If this shared voucher type is selected, remove all other voucher types and set only this one
                                                                    setSelectedVoucherTypes([opt.key]);
                                                                } else {
                                                                    // If unchecking, remove this voucher type
                                                                    setSelectedVoucherTypes(prev => prev.filter(t => normalizeVoucherKey(t) !== opt.key));
                                                                }
                                                            }}
                                                        />
                                                    }
                                                    label={opt.label}
                                                />
                                            ))}
                                        </FormGroup>
                                    )}

                                    {/* Private voucher types (from Activity popup "Private Charter Voucher Types") */}
                                    {selectedFlightTypes.includes('private') && (
                                        <>
                                            <Typography variant="body2" sx={{ mt: 1.5, mb: 1, color: 'text.secondary' }}>
                                                Private Charter Voucher Types:
                                            </Typography>
                                            {privateVoucherTypeOptions.length === 0 && privateVoucherTypeRawValues.length > 0 && privateCharterVoucherTypesLoading ? (
                                                <Typography variant="body2" color="text.secondary">
                                                    Loading private voucher types...
                                                </Typography>
                                            ) : privateVoucherTypeOptions.length === 0 ? (
                                                <Typography variant="body2" color="text.secondary">
                                                    No private voucher types configured for this activity.
                                                </Typography>
                                            ) : (
                                                <FormGroup row>
                                                    {privateVoucherTypeOptions.map(title => {
                                                        const key = normalizeVoucherKey(title);
                                                        return (
                                                            <FormControlLabel
                                                                key={key}
                                                                control={
                                                                    <Checkbox
                                                                        checked={selectedVoucherTypes.map(normalizeVoucherKey).includes(key)}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                // If this private voucher type is selected, remove all other voucher types and set only this one
                                                                                setSelectedVoucherTypes([title]);
                                                                            } else {
                                                                                // If unchecking, remove this voucher type
                                                                                setSelectedVoucherTypes(prev => prev.filter(t => normalizeVoucherKey(t) !== key));
                                                                            }
                                                                        }}
                                                                    />
                                                                }
                                                                label={title}
                                                            />
                                                        );
                                                    })}
                                                </FormGroup>
                                            )}
                                        </>
                                    )}
                                </Box>
                                )}
                                {loading ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                        <CircularProgress />
                                    </Box>
                                ) : error ? (
                                    <Typography color="error">{error}</Typography>
                                ) : (
                                    <>
                                        {/* Live Availability style calendar */}
                                        <Box sx={{ mb: 2 }} key={`calendar-${selectedDate ? dayjs(selectedDate).format('YYYY-MM-DD') : 'no-date'}`}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                                <IconButton onClick={() => setCurrentMonth(prev => prev.subtract(1, 'month'))} size="small"><ChevronLeftIcon fontSize="small" /></IconButton>
                                                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>{monthLabel}</Typography>
                                                <IconButton onClick={() => setCurrentMonth(prev => prev.add(1, 'month'))} size="small"><ChevronRightIcon fontSize="small" /></IconButton>
                                            </Box>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', mb: 1 }}>
                                                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(w => (
                                                    <div key={w} style={{ textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: 12 }}>{w}</div>
                                                ))}
                                            </Box>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                                                {buildDayCells(false)}
                                            </Box>
                                        </Box>

                                        {selectedDate && (
                                            <>
                                                <Typography variant="h6" sx={{ mb: 2, fontSize: 18, fontWeight: 600 }}>Available Times for {dayjs(selectedDate).format('DD/MM/YYYY')}:</Typography>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                                    {getTimesForDate(selectedDate).length === 0 && (
                                                        <Box sx={{ p: 2, textAlign: 'center', width: '100%' }}>
                                                            <Typography color="text.secondary" sx={{ fontSize: 16, fontWeight: 500 }}>
                                                                No available times for this date
                                                            </Typography>
                                                            <Typography color="text.secondary" sx={{ fontSize: 14, mt: 1 }}>
                                                                Please select a different date or contact us for availability
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {getTimesForDate(selectedDate).map(slot => {
                                                        const isAvailable = slot.available > 0;
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
                                                                {slot.time} ({(Number(slot.available) || Number(slot.calculated_available) || 0)} Spaces)
                                                            </Button>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={() => {
                        // For Gift Voucher, find activity ID from selected location
                        let finalActivityId = activityId;
                        let finalSelectedLocation = selectedLocation;
                        
                        if (isGiftVoucherDetails && selectedLocations.length > 0 && giftVoucherActivities.length > 0) {
                            const firstSelectedLocation = selectedLocations[0];
                            const activityForLocation = giftVoucherActivities.find(a => a.location === firstSelectedLocation && a.status === 'Live');
                            if (activityForLocation) {
                                finalActivityId = activityForLocation.id;
                                finalSelectedLocation = firstSelectedLocation;
                            }
                        } else if (isFlightVoucherDetails && flightVoucherSelectedLocations.length > 0 && flightVoucherActivities.length > 0) {
                            // For Flight Voucher, find activity ID from selected location
                            const firstSelectedLocation = flightVoucherSelectedLocations[0];
                            const activityForLocation = flightVoucherActivities.find(a => a.location === firstSelectedLocation && a.status === 'Live');
                            if (activityForLocation) {
                                finalActivityId = activityForLocation.id;
                                finalSelectedLocation = firstSelectedLocation;
                            }
                        }
                        
                        onSlotSelect(
                            selectedDate, 
                            selectedTime, 
                            finalActivityId, 
                            selectedActivity, 
                            finalSelectedLocation, 
                            selectedFlightTypes, 
                            selectedVoucherTypes,
                            // Pass purchaser info and passenger data for Gift Vouchers
                            {
                                firstName: purchaserFirstName,
                                lastName: purchaserLastName,
                                mobile: purchaserMobile,
                                email: purchaserEmail,
                                selectedLocations: isGiftVoucherDetails ? selectedLocations : flightVoucherSelectedLocations, // Pass selected locations
                                passengerData: passengerData, // Pass passenger data for Gift Vouchers
                                activityId: finalActivityId // Pass activity ID
                            }
                        );
                    }}
                    disabled={
                        isGiftVoucherDetails
                            ? // Gift Voucher: Require at least one location, date, time, and all passenger information
                              selectedLocations.length === 0 || 
                              !selectedDate || 
                              !selectedTime ||
                              !passengerData || 
                              passengerData.length === 0 ||
                              passengerData.some(p => !p.firstName || !p.lastName || !p.mobile || !p.email)
                            : isFlightVoucherDetails
                            ? // Flight Voucher: Require at least one location, date, and time
                              flightVoucherSelectedLocations.length === 0 ||
                              !selectedDate || 
                              !selectedTime
                            : // Regular booking: Require date, time, activity, location
                              !selectedDate || 
                              !selectedTime || 
                              !selectedActivity || 
                              !selectedLocation
                    }
                    variant="contained"
                >
                    Confirm
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RebookAvailabilityModal; 