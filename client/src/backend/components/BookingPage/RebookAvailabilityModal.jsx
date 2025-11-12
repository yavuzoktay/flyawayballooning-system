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

    // Purchaser Information state for Gift Vouchers
    const [purchaserFirstName, setPurchaserFirstName] = useState('');
    const [purchaserLastName, setPurchaserLastName] = useState('');
    const [purchaserMobile, setPurchaserMobile] = useState('');
    const [purchaserEmail, setPurchaserEmail] = useState('');

    const isFlightVoucherDetails = useMemo(() => {
        const bookFlight = (bookingDetail?.voucher?.book_flight || '').toLowerCase();
        const voucherType = (bookingDetail?.voucher?.voucher_type || '').toLowerCase();
        return Boolean(bookingDetail?.voucher) && !bookFlight.includes('gift') && voucherType.includes('flight');
    }, [bookingDetail]);

    const isGiftVoucherDetails = useMemo(() => {
        const bookFlight = (bookingDetail?.voucher?.book_flight || '').toLowerCase();
        return Boolean(bookingDetail?.voucher) && bookFlight.includes('gift');
    }, [bookingDetail]);

    // availableDates state'i
    const [availableDates, setAvailableDates] = useState([]);
    const [filteredAvailabilities, setFilteredAvailabilities] = useState([]);

    // Calendar state (Live Availability style)
    const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));

    // Load activities and locations on modal open
    useEffect(() => {
        if (open) {
            setLoadingActivities(true);
            axios.get('/api/activitiesForRebook')
                .then(res => {
                    if (res.data.success) {
                        setActivities(res.data.data);
                        const uniqueLocations = [...new Set(res.data.data.map(a => a.location))];
                        setLocations(uniqueLocations.map(loc => ({ location: loc })));
                    }
                })
                .catch(err => console.error('Error loading activities:', err))
                .finally(() => setLoadingActivities(false));
        } else {
            setAvailabilities([]);
            setSelectedDate(null);
            setSelectedTime(null);
            setActivityId(null);
            setSelectedActivity('');
            setSelectedLocation('');
            setSelectedFlightTypes([]);
            setSelectedVoucherTypes([]);
            setPurchaserFirstName('');
            setPurchaserLastName('');
            setPurchaserMobile('');
            setPurchaserEmail('');
        }
    }, [open, location, bookingDetail]);

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

    // Flight type değişince sadece filtrele
    useEffect(() => {
        // If no flight types selected, clear
        if (selectedFlightTypes.length === 0) {
            setFilteredAvailabilities([]);
            setAvailableDates([]);
            setSelectedDate(null);
            setSelectedTime(null);
            return;
        }

        const normalizeType = t => t.replace(' Flight', '').trim().toLowerCase();
        const selectedTypes = selectedFlightTypes.map(t => normalizeType(t));
 
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
    }, [selectedFlightTypes, availabilities]);

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

    const getTimesForDate = (date) => {
        const dateStr = dayjs(date).format('YYYY-MM-DD');
        const times = filteredAvailabilities.filter(a => a.date === dateStr);
        return times;
    };

    // Live Availability helpers
    const monthLabel = currentMonth.format('MMMM YYYY');
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const startDay = startOfMonth.day(); // 0-6 (Sun-Sat)

    const buildDayCells = () => {
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
        
        console.log('Calendar Debug:', {
            month: currentMonth.format('MMMM YYYY'),
            firstDayOfMonth: firstDayOfMonth,
            firstDayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][firstDayOfMonth],
            daysBack,
            firstCellDate: firstCellDate.format('YYYY-MM-DD (ddd)'),
            shouldStartWith: 'Monday'
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
            const slots = filteredAvailabilities.filter(a => a.date === d.format('YYYY-MM-DD'));
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
                                {/* Flight Type Selector */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="h6" sx={{ mb: 2 }}>Flight Type:</Typography>
                                    <FormGroup row>
                                        <FormControlLabel control={<Checkbox checked={selectedFlightTypes.includes('private')} onChange={(e) => { if (e.target.checked) setSelectedFlightTypes(prev => [...prev, 'private']); else setSelectedFlightTypes(prev => prev.filter(t => t !== 'private')); }} />} label="Private" />
                                        <FormControlLabel control={<Checkbox checked={selectedFlightTypes.includes('shared')} onChange={(e) => { if (e.target.checked) setSelectedFlightTypes(prev => [...prev, 'shared']); else setSelectedFlightTypes(prev => prev.filter(t => t !== 'shared')); }} />} label="Shared" />
                                    </FormGroup>
                                </Box>
                                {/* Voucher Type Selector */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="h6" sx={{ mb: 2 }}>Voucher Type:</Typography>
                                    <FormGroup row>
                                        <FormControlLabel control={<Checkbox checked={selectedVoucherTypes.includes('weekday morning')} onChange={(e) => { if (e.target.checked) setSelectedVoucherTypes(prev => [...prev, 'weekday morning']); else setSelectedVoucherTypes(prev => prev.filter(t => t !== 'weekday morning')); }} />} label="Weekday Morning" />
                                        <FormControlLabel control={<Checkbox checked={selectedVoucherTypes.includes('flexible weekday')} onChange={(e) => { if (e.target.checked) setSelectedVoucherTypes(prev => [...prev, 'flexible weekday']); else setSelectedVoucherTypes(prev => prev.filter(t => t !== 'flexible weekday')); }} />} label="Flexible Weekday" />
                                        <FormControlLabel control={<Checkbox checked={selectedVoucherTypes.includes('any day flight')} onChange={(e) => { if (e.target.checked) setSelectedVoucherTypes(prev => [...prev, 'any day flight']); else setSelectedVoucherTypes(prev => prev.filter(t => t !== 'any day flight')); }} />} label="Any Day Flight" />
                                    </FormGroup>
                                </Box>
                            </>
                        )}

                        {/* Gift Voucher: Purchaser Information */}
                        {isGiftVoucherDetails && (
                            <>
                                {/* Flight Type Selector */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="h6" sx={{ mb: 2 }}>Flight Type:</Typography>
                                    <FormGroup row>
                                        <FormControlLabel control={<Checkbox checked={selectedFlightTypes.includes('private')} onChange={(e) => { if (e.target.checked) setSelectedFlightTypes(prev => [...prev, 'private']); else setSelectedFlightTypes(prev => prev.filter(t => t !== 'private')); }} />} label="Private" />
                                        <FormControlLabel control={<Checkbox checked={selectedFlightTypes.includes('shared')} onChange={(e) => { if (e.target.checked) setSelectedFlightTypes(prev => [...prev, 'shared']); else setSelectedFlightTypes(prev => prev.filter(t => t !== 'shared')); }} />} label="Shared" />
                                    </FormGroup>
                                </Box>
                                {/* Voucher Type Selector */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="h6" sx={{ mb: 2 }}>Voucher Type:</Typography>
                                    <FormGroup row>
                                        <FormControlLabel control={<Checkbox checked={selectedVoucherTypes.includes('weekday morning')} onChange={(e) => { if (e.target.checked) setSelectedVoucherTypes(prev => [...prev, 'weekday morning']); else setSelectedVoucherTypes(prev => prev.filter(t => t !== 'weekday morning')); }} />} label="Weekday Morning" />
                                        <FormControlLabel control={<Checkbox checked={selectedVoucherTypes.includes('flexible weekday')} onChange={(e) => { if (e.target.checked) setSelectedVoucherTypes(prev => [...prev, 'flexible weekday']); else setSelectedVoucherTypes(prev => prev.filter(t => t !== 'flexible weekday')); }} />} label="Flexible Weekday" />
                                        <FormControlLabel control={<Checkbox checked={selectedVoucherTypes.includes('any day flight')} onChange={(e) => { if (e.target.checked) setSelectedVoucherTypes(prev => [...prev, 'any day flight']); else setSelectedVoucherTypes(prev => prev.filter(t => t !== 'any day flight')); }} />} label="Any Day Flight" />
                                    </FormGroup>
                                </Box>

                                {/* Purchaser Information */}
                                <Box sx={{ mb: 3, mt: 3, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Your Details — The Purchaser</Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="First Name"
                                                placeholder="First Name"
                                                value={purchaserFirstName}
                                                onChange={(e) => setPurchaserFirstName(e.target.value)}
                                                required
                                                variant="outlined"
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Last Name"
                                                placeholder="Last Name"
                                                value={purchaserLastName}
                                                onChange={(e) => setPurchaserLastName(e.target.value)}
                                                required
                                                variant="outlined"
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Mobile Number"
                                                placeholder="Mobile Number"
                                                value={purchaserMobile}
                                                onChange={(e) => setPurchaserMobile(e.target.value)}
                                                required
                                                variant="outlined"
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Email"
                                                placeholder="Email"
                                                type="email"
                                                value={purchaserEmail}
                                                onChange={(e) => setPurchaserEmail(e.target.value)}
                                                required
                                                variant="outlined"
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>
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
                                                            setSelectedFlightTypes(prev => [...prev, 'private']);
                                                        } else {
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
                                                            setSelectedFlightTypes(prev => [...prev, 'shared']);
                                                        } else {
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
                                    <FormGroup row>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={selectedVoucherTypes.includes('weekday morning')}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedVoucherTypes(prev => [...prev, 'weekday morning']);
                                                        } else {
                                                            setSelectedVoucherTypes(prev => prev.filter(t => t !== 'weekday morning'));
                                                        }
                                                    }}
                                                />
                                            }
                                            label="Weekday Morning"
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={selectedVoucherTypes.includes('flexible weekday')}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedVoucherTypes(prev => [...prev, 'flexible weekday']);
                                                        } else {
                                                            setSelectedVoucherTypes(prev => prev.filter(t => t !== 'flexible weekday'));
                                                        }
                                                    }}
                                                />
                                            }
                                            label="Flexible Weekday"
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={selectedVoucherTypes.includes('any day flight')}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedVoucherTypes(prev => [...prev, 'any day flight']);
                                                        } else {
                                                            setSelectedVoucherTypes(prev => prev.filter(t => t !== 'any day flight'));
                                                        }
                                                    }}
                                                />
                                            }
                                            label="Any Day Flight"
                                        />
                                    </FormGroup>
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
                                                {buildDayCells()}
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
                                                                {slot.time} ({slot.available}/{slot.capacity})
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
                        onSlotSelect(selectedDate, selectedTime, activityId, selectedActivity, selectedLocation, selectedFlightTypes, selectedVoucherTypes);
                    }}
                    disabled={
                        isGiftVoucherDetails
                            ? // Gift Voucher: Require purchaser info and at least one flight type and voucher type
                              !purchaserFirstName || 
                              !purchaserLastName || 
                              !purchaserMobile || 
                              !purchaserEmail || 
                              selectedFlightTypes.length === 0 || 
                              selectedVoucherTypes.length === 0
                            : // Regular/Flight Voucher: Require date, time, activity, location
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