import axios from "axios";
import React, { useEffect, useState, useMemo } from "react";
import { 
    Container, 
    Typography, 
    Box, 
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    useTheme,
    useMediaQuery,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Divider,
    IconButton,
    Collapse
} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FilterListIcon from '@mui/icons-material/FilterList';
import dayjs from 'dayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import PaginatedTable from "../components/BookingPage/PaginatedTable";
import { getAssignedResourceInfo } from '../utils/resourceAssignment';
import { bookingHasWeatherRefund } from '../utils/weatherRefund';

const MONTH_FILTER_OPTIONS = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
];

const getFlightDate = (flight) => {
    if (!flight?.flight_date) return null;
    const flightDate = dayjs(flight.flight_date);
    return flightDate.isValid() ? flightDate : null;
};

const FlownFlights = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    const [flownFlights, setFlownFlights] = useState([]);
    const [filteredFlights, setFilteredFlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [experienceFilter, setExperienceFilter] = useState('');
    const [pilotFilter, setPilotFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [monthFilter, setMonthFilter] = useState('');
    const [operationalFields, setOperationalFields] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Booking Details popup states
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
    
    // Edit states
    const [editField, setEditField] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    
    // Passenger edit states
    const [editingPassenger, setEditingPassenger] = useState(null);
    const [editPassengerFirstName, setEditPassengerFirstName] = useState('');
    const [editPassengerLastName, setEditPassengerLastName] = useState('');
    const [editPassengerWeight, setEditPassengerWeight] = useState('');
    const [editPassengerPrice, setEditPassengerPrice] = useState('');
    const [savingPassengerEdit, setSavingPassengerEdit] = useState(false);
    
    // Passenger edit functions
    const handleEditPassengerClick = (passenger) => {
        setEditingPassenger(passenger.id);
        setEditPassengerFirstName(passenger.first_name || '');
        setEditPassengerLastName(passenger.last_name || '');
        setEditPassengerWeight(passenger.weight || '');
        setEditPassengerPrice(passenger.price || '');
    };
    
    const handleCancelPassengerEdit = () => {
        setEditingPassenger(null);
        setEditPassengerFirstName('');
        setEditPassengerLastName('');
        setEditPassengerWeight('');
        setEditPassengerPrice('');
    };
    
    const handleDeletePassenger = async (passengerId) => {
        if (!selectedBookingId || !passengerId) return;
        if (!window.confirm('Are you sure you want to delete this passenger?')) return;
        
        try {
            await axios.delete(`/api/deletePassenger?passenger_id=${passengerId}`);
            // Refetch booking details
            const res = await axios.get(`/api/getBookingDetail?booking_id=${selectedBookingId}`);
            setBookingDetail(res.data);
        } catch (err) {
            console.error('Error deleting passenger:', err);
            alert('Failed to delete passenger');
        }
    };
    
    // Helper function to calculate expires date based on flight_attempts
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
        if (!editField || !selectedBookingId) return;
        setSavingEdit(true);
        try {
            await axios.patch('/api/updateBookingField', {
                booking_id: selectedBookingId,
                field: editField,
                value: editValue
            });
            
            // Update local state
            setBookingDetail(prev => ({
                ...prev,
                booking: {
                    ...prev.booking,
                    [editField]: editValue
                }
            }));
            
            setEditField(null);
            setEditValue('');
        } catch (err) {
            console.error('Error updating booking field:', err);
            alert('Failed to update field');
        } finally {
            setSavingEdit(false);
        }
    };

    useEffect(() => {
        fetchFlownFlights();
    }, []);

    const handleYearFilterChange = (value) => {
        setYearFilter(value);
        setMonthFilter('');
    };
    
    // Fetch booking details when popup opens
    useEffect(() => {
        if (detailDialogOpen && selectedBookingId) {
            setLoadingDetail(true);
            setDetailError(null);
            
            axios.get(`/api/getBookingDetail?booking_id=${selectedBookingId}`)
                .then(async res => {
                    setBookingDetail(res.data);
                    // Also fetch booking history
                    const historyRes = await axios.get(`/api/getBookingHistory?booking_id=${selectedBookingId}`);
                    setBookingHistory(historyRes.data.history || []);
                })
                .catch(err => {
                    console.error('Error loading booking details:', err);
                    setDetailError('Detaylar alınamadı');
                })
                .finally(() => setLoadingDetail(false));
        } else if (!detailDialogOpen) {
            // Dialog kapandığında sıfırla
            setBookingDetail(null);
            setBookingHistory([]);
        }
    }, [detailDialogOpen, selectedBookingId]);
    
    const handleBookingIdClick = (item) => {
        // Use clickedBookingId if available (from PaginatedTable when specific ID is clicked)
        // Otherwise fallback to first booking ID from comma-separated list
        const bookingId = item.clickedBookingId || 
                         (item.passenger_booking_id ? item.passenger_booking_id.toString().split(',')[0].trim() : null) ||
                         item.id || '';
        if (bookingId) {
            setSelectedBookingId(bookingId);
            setDetailDialogOpen(true);
        }
    };

    // Delete selected flights function
    const handleDeleteSelected = async () => {
        if (!selectedIds || selectedIds.length === 0) {
            alert('Please select at least one flight to delete!');
            return;
        }

        const itemCount = selectedIds.length;
        const confirmMessage = `Are you sure you want to delete ${itemCount} flight${itemCount > 1 ? 's' : ''}? This action cannot be undone.`;
        
        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            const deletePromises = selectedIds.map(id => {
                return axios.delete(`/api/deleteBooking/${id}`);
            });

            const results = await Promise.allSettled(deletePromises);
            
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            if (failed > 0) {
                const errorMessages = results
                    .filter(r => r.status === 'rejected')
                    .map(r => {
                        const error = r.reason;
                        if (error?.response?.status === 404) {
                            return 'Route not found';
                        }
                        return error?.response?.data?.message || error?.message || 'Unknown error';
                    })
                    .join('\n');
                
                alert(`Some flights could not be deleted:\n${errorMessages}\n\nSuccessfully deleted: ${successful} of ${itemCount}`);
            } else {
                alert(`Successfully deleted ${successful} flight${successful > 1 ? 's' : ''}`);
            }

            // Clear selections
            setSelectedIds([]);

            // Refresh data
            fetchFlownFlights();
        } catch (error) {
            console.error('Error deleting flights:', error);
            alert('An error occurred while deleting flights. Please try again.');
        }
    };

    // CSV export function
    const handleExportCSV = () => {
        if (!filteredFlights.length) {
            alert('No data to export!');
            return;
        }

        // Get all columns from the table data
        const tableData = filteredFlights.map((item, index) => {
            const baseData = {
                row_id: index + 1,
                id: item.id || '',
                passenger_booking_id: item.booking_ids || item.id || '', // Use booking_ids (comma-separated) if available
                location: item.location || '',
                flight_date: item.flight_date_display || (item.flight_date ? dayjs(item.flight_date).format('DD/MM/YYYY HH:mm A') : ''),
                pax: item.pax || item.passenger_count || 0,
                paid: item.paid || '0/0',
                pilot: item.pilot || '-',
                crew: item.crew || '-',
                flight_period: item.flight_period || '-',
                flight_type_display: item.flight_type_display || '-',
                balloon_resource: item.balloon_resource || 'N/A',
                aircraft_defects: item.aircraft_defects || '-',
                vehicle_trailer_defects: item.vehicle_trailer_defects || '-',
                flight_start_time: (() => {
                    if (!item.flight_start_time || item.flight_start_time === '-') return '-';
                    // Parse the date string and extract only time (HH:mm)
                    const parsed = dayjs(item.flight_start_time, 'DD/MM/YYYY HH:mm');
                    if (parsed.isValid()) {
                        return parsed.format('HH:mm');
                    }
                    // Try other formats
                    const parsed2 = dayjs(item.flight_start_time);
                    if (parsed2.isValid()) {
                        return parsed2.format('HH:mm');
                    }
                    return item.flight_start_time;
                })(),
                flight_end_time: (() => {
                    if (!item.flight_end_time || item.flight_end_time === '-') return '-';
                    // Parse the date string and extract only time (HH:mm)
                    const parsed = dayjs(item.flight_end_time, 'DD/MM/YYYY HH:mm');
                    if (parsed.isValid()) {
                        return parsed.format('HH:mm');
                    }
                    // Try other formats
                    const parsed2 = dayjs(item.flight_end_time);
                    if (parsed2.isValid()) {
                        return parsed2.format('HH:mm');
                    }
                    return item.flight_end_time;
                })(),
                total_flight_time: item.total_flight_time || '-',
                duty_start_time: (() => {
                    // If duty_start_time exists and is not null or '-', use it
                    if (item.duty_start_time && item.duty_start_time !== '-' && item.duty_start_time !== null) {
                        // Parse the date string and extract only time (HH:mm)
                        const parsed = dayjs(item.duty_start_time, 'DD/MM/YYYY HH:mm');
                        if (parsed.isValid()) {
                            return parsed.format('HH:mm');
                        }
                        // Try other formats
                        const parsed2 = dayjs(item.duty_start_time);
                        if (parsed2.isValid()) {
                            return parsed2.format('HH:mm');
                        }
                        return item.duty_start_time;
                    }
                    // If duty_start_time is missing, null, or '-', calculate from flight_start_time (45 mins before)
                    if (item.flight_start_time && item.flight_start_time !== '-' && item.flight_start_time !== null) {
                        try {
                            // Server sends flight_start_time in DD/MM/YYYY HH:mm format
                            let flightStart = dayjs(item.flight_start_time, 'DD/MM/YYYY HH:mm');
                            if (!flightStart.isValid()) {
                                // Try other formats as fallback
                                flightStart = dayjs(item.flight_start_time);
                            }
                            if (flightStart.isValid()) {
                                // Subtract 45 minutes
                                const dutyStart = flightStart.subtract(45, 'minute');
                                return dutyStart.format('HH:mm');
                            }
                        } catch (e) {
                            console.warn('Error calculating duty start time:', e);
                        }
                    }
                    return '-';
                })(),
                duty_end_time: (() => {
                    // If duty_end_time exists and is not null or '-', use it
                    if (item.duty_end_time && item.duty_end_time !== '-' && item.duty_end_time !== null) {
                        // Parse the date string and extract only time (HH:mm)
                        const parsed = dayjs(item.duty_end_time, 'DD/MM/YYYY HH:mm');
                        if (parsed.isValid()) {
                            return parsed.format('HH:mm');
                        }
                        // Try other formats
                        const parsed2 = dayjs(item.duty_end_time);
                        if (parsed2.isValid()) {
                            return parsed2.format('HH:mm');
                        }
                        return item.duty_end_time;
                    }
                    // If duty_end_time is missing, null, or '-', calculate from flight_end_time (45 mins after)
                    if (item.flight_end_time && item.flight_end_time !== '-' && item.flight_end_time !== null) {
                        try {
                            // Server sends flight_end_time in DD/MM/YYYY HH:mm format
                            let flightEnd = dayjs(item.flight_end_time, 'DD/MM/YYYY HH:mm');
                            if (!flightEnd.isValid()) {
                                // Try other formats as fallback
                                flightEnd = dayjs(item.flight_end_time);
                            }
                            if (flightEnd.isValid()) {
                                // Add 45 minutes
                                const dutyEnd = flightEnd.add(45, 'minute');
                                return dutyEnd.format('HH:mm');
                            }
                        } catch (e) {
                            console.warn('Error calculating duty end time:', e);
                        }
                    }
                    return '-';
                })(),
                duty_time: item.duty_time || '-'
            };
            
            // Add operational selections as columns
            if (item.operational_selections) {
                operationalFields.forEach(field => {
                    const columnKey = field.toLowerCase().replace(/\s+/g, '_');
                    baseData[columnKey] = item.operational_selections[field] || '-';
                });
            } else {
                operationalFields.forEach(field => {
                    const columnKey = field.toLowerCase().replace(/\s+/g, '_');
                    baseData[columnKey] = '-';
                });
            }
            
            return baseData;
        });

        // Get all columns
        const columns = Object.keys(tableData[0]);
        
        // Create CSV rows
        const csvRows = [columns.join(",")];
        tableData.forEach(row => {
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
        a.download = 'flown_flights_export.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const fetchFlownFlights = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/flown-flights');
            if (response.data?.success) {
                setFlownFlights(response.data.data || []);
                setFilteredFlights(response.data.data || []);
                // Set operational fields from response
                if (response.data.operational_fields && response.data.operational_fields.length > 0) {
                    setOperationalFields(response.data.operational_fields);
                } else {
                    // Default fields if not provided
                    setOperationalFields(['Refuel Location', 'Land Owner Gift', 'Landing Fee', 'Vehicle Used']);
                }
            }
        } catch (error) {
            console.error('Error fetching flown flights:', error);
            setFlownFlights([]);
            setFilteredFlights([]);
        } finally {
            setLoading(false);
        }
    };

    // Filter flights based on search term and filters
    useEffect(() => {
        let filtered = [...flownFlights];

        // Search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(flight => 
                (flight.name && flight.name.toLowerCase().includes(search)) ||
                (flight.booking_id && flight.booking_id.toString().includes(search)) ||
                (flight.location && flight.location.toLowerCase().includes(search)) ||
                (flight.flight_type && flight.flight_type.toLowerCase().includes(search)) ||
                (flight.voucher_code && flight.voucher_code.toLowerCase().includes(search)) ||
                (flight.email && flight.email.toLowerCase().includes(search))
            );
        }

        // Location filter
        if (locationFilter) {
            filtered = filtered.filter(flight => flight.location === locationFilter);
        }

        // Experience filter
        if (experienceFilter) {
            filtered = filtered.filter(flight => {
                const flightType = (flight.flight_type || '').toLowerCase();
                if (experienceFilter === 'Private') {
                    return flightType.includes('private');
                } else if (experienceFilter === 'Shared') {
                    return flightType.includes('shared');
                }
                return true;
            });
        }

        // Pilot filter
        if (pilotFilter) {
            filtered = filtered.filter(flight => {
                const pilot = (flight.pilot || '').trim();
                return pilot !== '-' && pilot === pilotFilter;
            });
        }

        // Year filter
        if (yearFilter) {
            filtered = filtered.filter(flight => {
                const flightDate = getFlightDate(flight);
                if (flightDate) {
                    const flightYear = flightDate.year().toString();
                    return flightYear === yearFilter;
                }
                return false;
            });
        }

        // Month filter is intentionally applied after a year is selected.
        if (yearFilter && monthFilter) {
            filtered = filtered.filter(flight => {
                const flightDate = getFlightDate(flight);
                return flightDate ? String(flightDate.month() + 1) === monthFilter : false;
            });
        }

        setFilteredFlights(filtered);
    }, [searchTerm, locationFilter, experienceFilter, pilotFilter, yearFilter, monthFilter, flownFlights]);

    // Get unique locations for filter
    const locations = useMemo(() => {
        const uniqueLocations = [...new Set(flownFlights.map(f => f.location).filter(Boolean))];
        return uniqueLocations.sort();
    }, [flownFlights]);


    // Get unique pilots for filter
    const pilots = useMemo(() => {
        const uniquePilots = [...new Set(flownFlights.map(f => {
            const pilot = (f.pilot || '').trim();
            return pilot !== '-' ? pilot : null;
        }).filter(Boolean))];
        return uniquePilots.sort();
    }, [flownFlights]);

    // Get unique years for filter
    const years = useMemo(() => {
        const uniqueYears = [...new Set(flownFlights.map(f => {
            const flightDate = getFlightDate(f);
            if (flightDate) {
                return flightDate.year().toString();
            }
            return null;
        }).filter(Boolean))];
        return uniqueYears.sort((a, b) => parseInt(b) - parseInt(a)); // Sort descending (newest first)
    }, [flownFlights]);

    const monthsForSelectedYear = useMemo(() => {
        if (!yearFilter) return [];

        const availableMonthValues = new Set(
            flownFlights
                .map((flight) => {
                    const flightDate = getFlightDate(flight);
                    if (!flightDate || flightDate.year().toString() !== yearFilter) return null;
                    return String(flightDate.month() + 1);
                })
                .filter(Boolean)
        );

        return MONTH_FILTER_OPTIONS.filter((monthOption) => availableMonthValues.has(monthOption.value));
    }, [flownFlights, yearFilter]);

    // Summary totals: flight hours per balloon, pilot flight hours, pilot duty hours, total passengers
    const flightSummary = useMemo(() => {
        const balloonHours = {};
        const pilotFlightHours = {};
        const pilotDutyHours = {};
        let totalPassengers = 0;

        const parseDurationMinutes = (startStr, endStr) => {
            if (!startStr || !endStr || startStr === '-' || endStr === '-') return null;
            const formats = ['DD/MM/YYYY HH:mm', 'YYYY-MM-DD HH:mm', 'YYYY-MM-DDTHH:mm', dayjs.ISO_8601];
            const start = dayjs(startStr, formats);
            const end = dayjs(endStr, formats);
            if (!start.isValid() || !end.isValid()) return null;
            return end.diff(start, 'minute', true);
        };

        const parseDurationFromString = (str) => {
            if (!str || str === '-') return null;
            const match = String(str).match(/(?:(\d+)h\s*)?(?:(\d+)m)?/);
            if (!match) return null;
            const h = parseInt(match[1] || 0, 10);
            const m = parseInt(match[2] || 0, 10);
            return h * 60 + m;
        };

        filteredFlights.forEach((item) => {
            const balloon = item.balloon_resource || 'N/A';
            const pilot = (item.pilot || '').trim();
            const pilotKey = pilot && pilot !== '-' ? pilot : null;

            // Total passengers flown
            totalPassengers += parseInt(item.pax || item.passenger_count || 0, 10) || 0;

            // Flight hours: from flight_start_time and flight_end_time
            let flightMins = parseDurationMinutes(item.flight_start_time, item.flight_end_time);
            if (flightMins == null) {
                flightMins = parseDurationFromString(item.total_flight_time);
            }
            if (flightMins != null && flightMins >= 0) {
                balloonHours[balloon] = (balloonHours[balloon] || 0) + flightMins;
                if (pilotKey) {
                    pilotFlightHours[pilotKey] = (pilotFlightHours[pilotKey] || 0) + flightMins;
                }
            }

            // Duty hours: from duty_start_time and duty_end_time
            let dutyMins = parseDurationMinutes(item.duty_start_time, item.duty_end_time);
            if (dutyMins == null) {
                dutyMins = parseDurationFromString(item.duty_time);
            }
            if (dutyMins != null && dutyMins >= 0 && pilotKey) {
                pilotDutyHours[pilotKey] = (pilotDutyHours[pilotKey] || 0) + dutyMins;
            }
        });

        const formatMinutes = (mins) => {
            if (mins == null || mins < 0) return '-';
            const h = Math.floor(mins / 60);
            const m = Math.round(mins % 60);
            if (h > 0) return `${h}h ${m}m`;
            return `${m}m`;
        };

        return {
            balloonHours: Object.entries(balloonHours).map(([k, v]) => ({ balloon: k, minutes: v, formatted: formatMinutes(v) })),
            pilotFlightHours: Object.entries(pilotFlightHours).map(([k, v]) => ({ pilot: k, minutes: v, formatted: formatMinutes(v) })),
            pilotDutyHours: Object.entries(pilotDutyHours).map(([k, v]) => ({ pilot: k, minutes: v, formatted: formatMinutes(v) })),
            totalPassengers
        };
    }, [filteredFlights]);

    const activeDropdownFilterCount = [
        experienceFilter,
        yearFilter,
        monthFilter,
        pilotFilter,
        locationFilter
    ].filter(Boolean).length;

    const clearDropdownFilters = () => {
        setExperienceFilter('');
        setYearFilter('');
        setMonthFilter('');
        setPilotFilter('');
        setLocationFilter('');
    };

    const filterMenuProps = {
        PaperProps: {
            sx: {
                mt: 1,
                borderRadius: '12px',
                border: '1px solid #e1e8f3',
                boxShadow: '0 16px 40px rgba(15, 23, 42, 0.12)'
            }
        }
    };

    const filterControlSx = {
        flex: isMobile ? '1 1 calc(50% - 6px)' : '0 1 180px',
        minWidth: isMobile ? 'calc(50% - 6px)' : 170
    };

    const filterLabelSx = {
        color: '#5e7393',
        fontSize: isMobile ? '12px' : '13px',
        fontWeight: 600,
        '&.Mui-focused': {
            color: '#2d69c5'
        }
    };

    const filterSelectSx = {
        height: isMobile ? 42 : 44,
        borderRadius: '10px',
        backgroundColor: '#ffffff',
        color: '#1c3458',
        fontSize: isMobile ? '13px' : '14px',
        fontWeight: 600,
        '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
            py: isMobile ? '9px' : '10px'
        },
        '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#d8e3f2'
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#a9c7f7'
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#2d69c5',
            borderWidth: '1px'
        },
        '& .MuiSvgIcon-root': {
            color: '#5e7393'
        }
    };

    const filterMenuItemSx = {
        fontSize: isMobile ? '13px' : '14px',
        color: '#1c3458',
        minHeight: isMobile ? 34 : 38
    };

    const filterControls = [
        {
            label: 'Experience',
            value: experienceFilter,
            onChange: setExperienceFilter,
            allLabel: 'All experiences',
            options: ['Shared', 'Private']
        },
        {
            label: 'Year',
            value: yearFilter,
            onChange: handleYearFilterChange,
            allLabel: 'All years',
            options: years
        },
        {
            label: 'Month',
            value: monthFilter,
            onChange: setMonthFilter,
            allLabel: yearFilter ? 'All months' : 'Select year first',
            options: monthsForSelectedYear,
            disabled: !yearFilter
        },
        {
            label: 'Pilot',
            value: pilotFilter,
            onChange: setPilotFilter,
            allLabel: 'All pilots',
            options: pilots
        },
        {
            label: 'Location',
            value: locationFilter,
            onChange: setLocationFilter,
            allLabel: 'All locations',
            options: locations
        }
    ];

    const getFilterOptionValue = (option) =>
        typeof option === 'object' && option !== null ? option.value : option;

    const getFilterOptionLabel = (option) =>
        typeof option === 'object' && option !== null ? option.label : option;

    const renderFilterControls = () => (
        <Box
            sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: isMobile ? 1 : 1.5,
                alignItems: 'center',
                flex: 1
            }}
        >
            {filterControls.map((control) => (
                <FormControl key={control.label} size="small" sx={filterControlSx}>
                    <InputLabel sx={filterLabelSx}>{control.label}</InputLabel>
                    <Select
                        value={control.value}
                        label={control.label}
                        onChange={(e) => control.onChange(e.target.value)}
                        MenuProps={filterMenuProps}
                        sx={filterSelectSx}
                        disabled={control.disabled}
                    >
                        <MenuItem value="" sx={filterMenuItemSx}>{control.allLabel}</MenuItem>
                        {control.options.map(option => (
                            <MenuItem
                                key={getFilterOptionValue(option)}
                                value={getFilterOptionValue(option)}
                                sx={filterMenuItemSx}
                            >
                                {getFilterOptionLabel(option)}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            ))}
            {activeDropdownFilterCount > 0 && (
                <Button
                    size="small"
                    onClick={clearDropdownFilters}
                    sx={{
                        height: isMobile ? 36 : 40,
                        px: 1.5,
                        borderRadius: '10px',
                        color: '#2d69c5',
                        fontWeight: 700,
                        textTransform: 'none',
                        backgroundColor: 'rgba(45, 105, 197, 0.08)',
                        '&:hover': {
                            backgroundColor: 'rgba(45, 105, 197, 0.14)'
                        }
                    }}
                >
                    Clear
                </Button>
            )}
        </Box>
    );

    return (
        <div className="flown-flights-page-wrap">
            <Container maxWidth={false}>
                <div className="heading-wrap">
                    <h2>FLOWN FLIGHTS</h2>
                    <hr />
                </div>
                <Box sx={{ padding: isMobile ? 1 : 2 }}>

            <Box
                sx={{
                    mb: 3,
                    p: isMobile ? 1.25 : 2,
                    border: '1px solid #e1e8f3',
                    borderRadius: '16px',
                    background: '#f8fbff',
                    boxShadow: '0 12px 30px rgba(28, 52, 88, 0.04)'
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: isMobile ? 'stretch' : 'center',
                        justifyContent: 'space-between',
                        gap: 1.5,
                        flexDirection: isMobile ? 'column' : 'row',
                        mb: 1.5
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Box
                            sx={{
                                width: 38,
                                height: 38,
                                borderRadius: '10px',
                                backgroundColor: '#eaf2ff',
                                color: '#2d69c5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <FilterListIcon fontSize="small" />
                        </Box>
                        <Box>
                            <Typography sx={{ color: '#1c3458', fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>
                                Filters
                            </Typography>
                            <Typography sx={{ color: '#6f82a3', fontSize: 12, lineHeight: 1.3 }}>
                                Showing {filteredFlights.length} of {flownFlights.length} flown flights
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
                        <Button
                            variant="outlined"
                            onClick={handleExportCSV}
                            startIcon={<FileDownloadIcon />}
                            sx={{
                                flex: isMobile ? 1 : '0 0 auto',
                                height: 40,
                                borderRadius: '10px',
                                borderColor: '#a9c7f7',
                                color: '#2d69c5',
                                backgroundColor: '#ffffff',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.02em',
                                '&:hover': {
                                    borderColor: '#2d69c5',
                                    backgroundColor: '#eef5ff'
                                }
                            }}
                        >
                            Export
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={handleDeleteSelected}
                            disabled={!selectedIds || selectedIds.length === 0}
                            startIcon={<DeleteIcon />}
                            sx={{
                                flex: isMobile ? 1 : '0 0 auto',
                                height: 40,
                                borderRadius: '10px',
                                borderColor: '#f1c6c6',
                                color: '#d32f2f',
                                backgroundColor: '#ffffff',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.02em',
                                '&:hover': {
                                    borderColor: '#d32f2f',
                                    backgroundColor: '#fff5f5'
                                },
                                '&.Mui-disabled': {
                                    borderColor: '#e1e8f3',
                                    color: '#b5bfd0',
                                    backgroundColor: '#f7f9fc'
                                }
                            }}
                        >
                            Delete
                        </Button>
                        {isMobile && (
                            <Button
                                variant="contained"
                                onClick={() => setMobileFiltersOpen(prev => !prev)}
                                startIcon={<FilterListIcon />}
                                sx={{
                                    flex: 1,
                                    height: 40,
                                    borderRadius: '10px',
                                    backgroundColor: mobileFiltersOpen || activeDropdownFilterCount > 0 ? '#2d69c5' : '#1f7f78',
                                    color: '#ffffff',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.02em',
                                    boxShadow: 'none',
                                    '&:hover': {
                                        backgroundColor: mobileFiltersOpen || activeDropdownFilterCount > 0 ? '#2558a7' : '#176b65',
                                        boxShadow: 'none'
                                    }
                                }}
                            >
                                {activeDropdownFilterCount > 0 ? `Filters (${activeDropdownFilterCount})` : 'Filters'}
                            </Button>
                        )}
                    </Box>
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        gap: isMobile ? 1 : 1.5,
                        alignItems: 'center',
                        flexDirection: isMobile ? 'column' : 'row'
                    }}
                >
                    <TextField
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 18, color: '#6f82a3' }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            width: isMobile ? '100%' : 420,
                            flex: isMobile ? '0 0 auto' : '0 1 420px',
                            '& .MuiOutlinedInput-root': {
                                height: isMobile ? 42 : 44,
                                borderRadius: '10px',
                                backgroundColor: '#ffffff',
                                color: '#1c3458',
                                '& fieldset': {
                                    borderColor: '#d8e3f2'
                                },
                                '&:hover fieldset': {
                                    borderColor: '#a9c7f7'
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#2d69c5',
                                    borderWidth: '1px'
                                }
                            },
                            '& .MuiOutlinedInput-input': {
                                color: '#1c3458',
                                fontSize: isMobile ? '16px' : '14px',
                                fontWeight: 500
                            }
                        }}
                        size="small"
                    />
                    {isMobile ? (
                        <Collapse in={mobileFiltersOpen} timeout="auto" unmountOnExit sx={{ width: '100%' }}>
                            <Box sx={{ pt: 1 }}>
                                {renderFilterControls()}
                            </Box>
                        </Collapse>
                    ) : renderFilterControls()}
                </Box>
            </Box>

            {/* Table */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <PaginatedTable
                    itemsPerPage={10}
                    data={filteredFlights.map((item, index) => {
                        const baseData = {
                            row_id: index + 1, // Auto-incrementing ID starting from 1
                            id: item.id || '',
                            passenger_booking_id: item.booking_ids || item.id || '', // Use booking_ids (comma-separated) if available
                            location: item.location || '',
                            flight_date: item.flight_date_display || (item.flight_date ? dayjs(item.flight_date).format('DD/MM/YYYY HH:mm A') : ''),
                            pax: item.pax || item.passenger_count || 0,
                            paid: item.paid || '0/0',
                            pilot: item.pilot || '-',
                            crew: item.crew || '-',
                            flight_period: item.flight_period || '-',
                            flight_type_display: item.flight_type_display || '-',
                            balloon_resource: item.balloon_resource || 'N/A',
                            aircraft_defects: item.aircraft_defects || '-',
                            vehicle_trailer_defects: item.vehicle_trailer_defects || '-',
                            flight_start_time: (() => {
                                if (!item.flight_start_time || item.flight_start_time === '-') return '-';
                                // Parse the date string and extract only time (HH:mm)
                                const parsed = dayjs(item.flight_start_time, 'DD/MM/YYYY HH:mm');
                                if (parsed.isValid()) {
                                    return parsed.format('HH:mm');
                                }
                                // Try other formats
                                const parsed2 = dayjs(item.flight_start_time);
                                if (parsed2.isValid()) {
                                    return parsed2.format('HH:mm');
                                }
                                return item.flight_start_time;
                            })(),
                            flight_end_time: (() => {
                                if (!item.flight_end_time || item.flight_end_time === '-') return '-';
                                // Parse the date string and extract only time (HH:mm)
                                const parsed = dayjs(item.flight_end_time, 'DD/MM/YYYY HH:mm');
                                if (parsed.isValid()) {
                                    return parsed.format('HH:mm');
                                }
                                // Try other formats
                                const parsed2 = dayjs(item.flight_end_time);
                                if (parsed2.isValid()) {
                                    return parsed2.format('HH:mm');
                                }
                                return item.flight_end_time;
                            })(),
                            total_flight_time: item.total_flight_time || '-',
                            duty_start_time: (() => {
                                // If duty_start_time exists and is not null or '-', use it
                                if (item.duty_start_time && item.duty_start_time !== '-' && item.duty_start_time !== null) {
                                    // Parse the date string and extract only time (HH:mm)
                                    const parsed = dayjs(item.duty_start_time, 'DD/MM/YYYY HH:mm');
                                    if (parsed.isValid()) {
                                        return parsed.format('HH:mm');
                                    }
                                    // Try other formats
                                    const parsed2 = dayjs(item.duty_start_time);
                                    if (parsed2.isValid()) {
                                        return parsed2.format('HH:mm');
                                    }
                                    return item.duty_start_time;
                                }
                                // If duty_start_time is missing, null, or '-', calculate from flight_start_time (45 mins before)
                                if (item.flight_start_time && item.flight_start_time !== '-' && item.flight_start_time !== null) {
                                    try {
                                        // Server sends flight_start_time in DD/MM/YYYY HH:mm format
                                        let flightStart = dayjs(item.flight_start_time, 'DD/MM/YYYY HH:mm');
                                        if (!flightStart.isValid()) {
                                            // Try other formats as fallback
                                            flightStart = dayjs(item.flight_start_time);
                                        }
                                        if (flightStart.isValid()) {
                                            // Subtract 45 minutes
                                            const dutyStart = flightStart.subtract(45, 'minute');
                                            return dutyStart.format('HH:mm');
                                        }
                                    } catch (e) {
                                        console.warn('Error calculating duty start time:', e);
                                    }
                                }
                                return '-';
                            })(),
                            duty_end_time: (() => {
                                // If duty_end_time exists and is not null or '-', use it
                                if (item.duty_end_time && item.duty_end_time !== '-' && item.duty_end_time !== null) {
                                    // Parse the date string and extract only time (HH:mm)
                                    const parsed = dayjs(item.duty_end_time, 'DD/MM/YYYY HH:mm');
                                    if (parsed.isValid()) {
                                        return parsed.format('HH:mm');
                                    }
                                    // Try other formats
                                    const parsed2 = dayjs(item.duty_end_time);
                                    if (parsed2.isValid()) {
                                        return parsed2.format('HH:mm');
                                    }
                                    return item.duty_end_time;
                                }
                                // If duty_end_time is missing, null, or '-', calculate from flight_end_time (45 mins after)
                                if (item.flight_end_time && item.flight_end_time !== '-' && item.flight_end_time !== null) {
                                    try {
                                        // Server sends flight_end_time in DD/MM/YYYY HH:mm format
                                        let flightEnd = dayjs(item.flight_end_time, 'DD/MM/YYYY HH:mm');
                                        if (!flightEnd.isValid()) {
                                            // Try other formats as fallback
                                            flightEnd = dayjs(item.flight_end_time);
                                        }
                                        if (flightEnd.isValid()) {
                                            // Add 45 minutes
                                            const dutyEnd = flightEnd.add(45, 'minute');
                                            return dutyEnd.format('HH:mm');
                                        }
                                    } catch (e) {
                                        console.warn('Error calculating duty end time:', e);
                                    }
                                }
                                return '-';
                            })(),
                            duty_time: item.duty_time || '-'
                        };
                        
                        // Helper function to convert field name to column key
                        const fieldToColumnKey = (fieldName) => {
                            return fieldName.toLowerCase().replace(/\s+/g, '_');
                        };
                        
                        // Add operational selections as columns
                        if (item.operational_selections) {
                            operationalFields.forEach(field => {
                                const columnKey = fieldToColumnKey(field);
                                baseData[columnKey] = item.operational_selections[field] || '-';
                            });
                        } else {
                            // If no operational_selections, set all to '-'
                            operationalFields.forEach(field => {
                                const columnKey = fieldToColumnKey(field);
                                baseData[columnKey] = '-';
                            });
                        }
                        
                        return baseData;
                    })}
                    columns={[
                        "row_id",                    // 1. ID
                        "flight_date",               // 2. Flight Date
                        "flight_period",            // 3. Flight Period
                        "location",                  // 4. Location
                        "flight_type_display",      // 5. Flight Type
                        "pax",                      // 6. Total Passengers
                        "balloon_resource",         // 7. Balloon Resource
                        "pilot",                    // 8. Pilot
                        "crew",                     // 9. Crew
                        "passenger_booking_id",     // 10. Passenger Booking ID
                        "flight_start_time",        // 11. Start time
                        "flight_end_time",          // 12. End time
                        "total_flight_time",        // 13. Total flight time
                        "duty_start_time",         // 14. Duty Start Time
                        "duty_end_time",           // 15. Duty End Time
                        "duty_time",                // 16. Duty time
                        "refuel_location",          // 17. Refuel location
                        "vehicle_used",             // 18. Vehicle used
                        "land_owner_gift",          // 19. Land owner gift
                        "landing_fee",              // 20. Landing fee
                        "aircraft_defects",          // 21. Aircraft / Balloon Defects or Issues
                        "vehicle_trailer_defects"    // 22. Vehicle / Trailer Issues
                    ]}
                    selectable={true}
                    onBookingIdClick={handleBookingIdClick}
                    onSelectionChange={setSelectedIds}
                />
            )}

            {/* Summary row: Total flight hours per balloon, Pilot Flight Hours, Pilot Duty Hours */}
            {!loading && filteredFlights.length > 0 && (
                <Box
                    sx={{
                        mt: 2,
                        p: 2,
                        backgroundColor: '#fff',
                        borderRadius: 1,
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 2,
                        alignItems: 'center',
                        justifyContent: 'flex-end'
                    }}
                >
                    {(flightSummary.balloonHours.length > 0 || flightSummary.totalPassengers > 0) && (
                        <Typography component="span" sx={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
                            {flightSummary.balloonHours.length > 0 && (
                                <>
                                    {' '}
                                    {flightSummary.balloonHours.map(({ balloon, formatted }) => (
                                        <Box key={balloon} component="span" sx={{ mr: 1 }}>
                                            Balloon {balloon}: {formatted}
                                        </Box>
                                    ))}
                                    {' '}|{' '}
                                </>
                            )}
                            Total Passengers Flown: {flightSummary.totalPassengers}
                        </Typography>
                    )}
                    {(flightSummary.balloonHours.length > 0 || flightSummary.totalPassengers > 0) && flightSummary.pilotFlightHours.length > 0 && (
                        <Typography component="span" sx={{ color: '#d1d5db', mx: 0.5 }}>|</Typography>
                    )}
                    {flightSummary.pilotFlightHours.length > 0 && (
                        <Typography component="span" sx={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
                            
                            {flightSummary.pilotFlightHours.map(({ pilot, formatted }) => (
                                <Box key={pilot} component="span" sx={{ mr: 1 }}>
                                    {pilot} Flight: {formatted}
                                </Box>
                            ))}
                        </Typography>
                    )}
                    {flightSummary.pilotFlightHours.length > 0 && flightSummary.pilotDutyHours.length > 0 && (
                        <Typography component="span" sx={{ color: '#d1d5db', mx: 0.5 }}>|</Typography>
                    )}
                    {flightSummary.pilotDutyHours.length > 0 && (
                        <Typography component="span" sx={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
               
                            {flightSummary.pilotDutyHours.map(({ pilot, formatted }) => (
                                <Box key={pilot} component="span" sx={{ mr: 1 }}>
                                    {pilot} Duty: {formatted}
                                </Box>
                            ))}
                        </Typography>
                    )}
                </Box>
            )}

            {/* Booking Details Dialog - Same as BookingPage */}
            <Dialog 
                open={detailDialogOpen} 
                onClose={() => { setDetailDialogOpen(false); setSelectedBookingId(null); setBookingDetail(null); }} 
                maxWidth="md" 
                fullWidth
                PaperProps={{
                    sx: isMobile ? {
                        margin: '8px',
                        maxHeight: 'calc(100% - 16px)',
                        height: 'calc(100% - 16px)'
                    } : {}
                }}
            >
                <DialogTitle style={{ background: '#2d4263', color: '#fff', fontWeight: 700, fontSize: isMobile ? 18 : 22 }}>
                    Booking Details
                </DialogTitle>
                <DialogContent style={{ background: '#f7f7f7', minHeight: isMobile ? 'auto' : 500, padding: isMobile ? '12px' : '24px' }}>
                    {loadingDetail ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                            <CircularProgress />
                        </Box>
                    ) : detailError ? (
                        <Typography color="error">{detailError}</Typography>
                    ) : bookingDetail && bookingDetail.success ? (
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
                                            Personal Details
                                        </Typography>
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
                                                    const passenger1 = bookingDetail.passengers && bookingDetail.passengers.length > 0 
                                                        ? bookingDetail.passengers[0] 
                                                        : null;
                                                    const passenger1Name = passenger1 
                                                        ? `${passenger1.first_name || ''} ${passenger1.last_name || ''}`.trim() 
                                                        : '';
                                                    return bookingDetail.booking.name || passenger1Name || '-';
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
                                        }}><b>Flight Attempts:</b> {editField === 'flight_attempts' ? (
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
                                                <Button size="small" onClick={handleEditSave} disabled={savingEdit}>Save</Button>
                                                <Button size="small" onClick={handleEditCancel}>Cancel</Button>
                                            </>
                                        ) : (
                                            <>
                                                <span style={{ color: bookingDetail.booking.due > 0 ? '#d32f2f' : '#666', fontWeight: bookingDetail.booking.due > 0 ? 600 : 400 }}>
                                                    £{parseFloat(bookingDetail.booking.due || 0).toFixed(2)}
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
                                    </Box>
                                    {/* Add On's */}
                                    <Box sx={{ background: '#fff', borderRadius: 2, p: 2, mb: 2, boxShadow: 1 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Add On's</Typography>
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
                                    <Box sx={{ background: '#fff', borderRadius: 2, p: 2, boxShadow: 1 }}>
                                        {/* Current Booking */}
                                        <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                            <Box>
                                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Current Booking</Typography>
                                                <Typography><b>Activity:</b> {bookingDetail.booking?.experience || bookingDetail.booking?.flight_type || '-'} - {bookingDetail.booking?.location || '-'}</Typography>
                                                {bookingDetail.booking?.status !== 'Cancelled' && (
                                                    <Typography><b>Booked For:</b> {bookingDetail.booking?.flight_date ? (
                                                        <a
                                                            href={`https://flyawayballooning-system.com/manifest?date=${dayjs(bookingDetail.booking.flight_date).format('YYYY-MM-DD')}&time=${dayjs(bookingDetail.booking.flight_date).format('HH:mm')}`}
                                                            style={{ color: '#3274b4', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                                                        >
                                                            {(() => {
                                                                const flightDateStr = bookingDetail.booking.flight_date;
                                                                if (typeof flightDateStr === 'string' && flightDateStr.match(/^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}/)) {
                                                                    const [datePart, timePart] = flightDateStr.split(/[\sT]/);
                                                                    const [year, month, day] = datePart.split('-');
                                                                    const [hour, minute] = (timePart || '00:00').split(':');
                                                                    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
                                                                    return dayjs(localDate).format('DD/MM/YYYY HH:mm');
                                                                }
                                                                return dayjs(bookingDetail.booking.flight_date).format('DD/MM/YYYY HH:mm');
                                                            })()}
                                                        </a>
                                                    ) : '-'}</Typography>
                                                )}
                                                {(() => {
                                                    const b = bookingDetail.booking || {};
                                                    const redeemed = (b.redeemed === true) || (b.voucher_redeemed === 1) || (typeof b.redeemed_at === 'string' && b.redeemed_at) || (b.redeemed_voucher === 'Yes');
                                                    const voucherCodeToDisplay = b.originalRedeemedVoucherCode || b.voucher_code || '';
                                                    return (
                                                        <Typography>
                                                            <b>Redeemed Voucher:</b> {redeemed ? <span style={{ color: 'green', fontWeight: 600 }}>Yes</span> : <span style={{ color: 'red', fontWeight: 600 }}>No</span>} <span style={{ fontWeight: 500 }}>{voucherCodeToDisplay}</span>
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
                                            </Box>
                                            <Box sx={{ 
                                                display: 'flex', 
                                                flexDirection: isMobile ? 'row' : 'column', 
                                                flexWrap: isMobile ? 'wrap' : 'nowrap',
                                                gap: isMobile ? '8px' : 1, 
                                                minWidth: isMobile ? 'auto' : 140,
                                                width: isMobile ? '100%' : 'auto'
                                            }}>
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
                                                        padding: isMobile ? '6px 8px' : '8px 16px',
                                                        background: '#2ECC71',
                                                        '&:hover': {
                                                            background: '#27AE60'
                                                        }
                                                    }} 
                                                    disabled={true}
                                                >
                                                    Rebook
                                                </Button>
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
                                                        padding: isMobile ? '6px 8px' : '8px 16px',
                                                        background: '#1ABC9C',
                                                        '&:hover': {
                                                            background: '#16A085'
                                                        }
                                                    }} 
                                                    disabled={true}
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
                                                        background: '#E74C3C',
                                                        flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                                        minWidth: isMobile ? 'auto' : 'auto',
                                                        fontSize: isMobile ? '12px' : '14px',
                                                        padding: isMobile ? '6px 8px' : '8px 16px',
                                                        '&:hover': {
                                                            background: '#C0392B'
                                                        }
                                                    }} 
                                                    disabled={true}
                                                >
                                                    Cancel Flight
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    sx={{ 
                                                        borderRadius: 2, 
                                                        fontWeight: 600, 
                                                        textTransform: 'none', 
                                                        background: '#3498DB',
                                                        mb: isMobile ? 0 : 1,
                                                        flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                                        minWidth: isMobile ? 'auto' : 'auto',
                                                        fontSize: isMobile ? '12px' : '14px',
                                                        padding: isMobile ? '6px 8px' : '8px 16px',
                                                        '&:hover': {
                                                            background: '#2980B9'
                                                        }
                                                    }}
                                                    disabled={!bookingDetail?.booking?.email}
                                                >
                                                    Email | SMS
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    color="secondary"
                                                    sx={{ 
                                                        borderRadius: 2, 
                                                        fontWeight: 600, 
                                                        textTransform: 'none', 
                                                        background: '#5B6CFF',
                                                        mb: isMobile ? 0 : 1,
                                                        flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                                        minWidth: isMobile ? 'auto' : 'auto',
                                                        fontSize: isMobile ? '12px' : '14px',
                                                        padding: isMobile ? '6px 8px' : '8px 16px',
                                                        '&:hover': {
                                                            background: '#4A5AE8'
                                                        }
                                                    }}
                                                    disabled={!bookingDetail?.booking}
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
                                                        background: '#8E44AD', 
                                                        mt: isMobile ? 0 : 1,
                                                        mb: isMobile ? 0 : 1,
                                                        flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                                        minWidth: isMobile ? 'auto' : 'auto',
                                                        fontSize: isMobile ? '12px' : '14px',
                                                        padding: isMobile ? '6px 8px' : '8px 16px',
                                                        '&:hover': {
                                                            background: '#7D3C98'
                                                        }
                                                    }}
                                                    disabled={!bookingDetail?.booking?.id}
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
                                                        background: '#7F8C8D', 
                                                        mt: isMobile ? 0 : 1,
                                                        flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                                                        minWidth: isMobile ? 'auto' : 'auto',
                                                        fontSize: isMobile ? '12px' : '14px',
                                                        padding: isMobile ? '6px 8px' : '8px 16px',
                                                        '&:hover': {
                                                            background: '#6C7A7B'
                                                        }
                                                    }}
                                                    disabled={!bookingDetail?.booking?.id}
                                                >
                                                    More
                                                </Button>
                                            </Box>
                                        </Box>
                                        <Divider sx={{ my: 2 }} />
                                        
                                        {/* Passenger Details */}
                                        {bookingDetail.passengers && bookingDetail.passengers.length > 0 && (
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Passenger Details</Typography>
                                                <Box>
                                                    {bookingDetail.passengers.map((p, i) => (
                                                        <Typography key={p.id} sx={{ mb: 1 }}>
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
                                                                                if (editPassengerPrice !== (p.price || '')) {
                                                                                    await axios.patch('/api/updatePassengerField', {
                                                                                        passenger_id: p.id,
                                                                                        field: 'price',
                                                                                        value: parseFloat(editPassengerPrice) || 0
                                                                                    });
                                                                                }
                                                                                const res = await axios.get(`/api/getBookingDetail?booking_id=${selectedBookingId}`);
                                                                                setBookingDetail(res.data);
                                                                                setEditingPassenger(null);
                                                                                setEditPassengerFirstName('');
                                                                                setEditPassengerLastName('');
                                                                                setEditPassengerWeight('');
                                                                                setEditPassengerPrice('');
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
                                                                    {p.first_name || '-'} {p.last_name || '-'}
                                                                    {p.weight ? (
                                                                        bookingDetail.booking?.experience === 'Private Charter' 
                                                                            ? ` (${p.weight}kg)` 
                                                                            : ` (${p.weight}kg £${parseFloat(p.price || 0).toFixed(2)})`
                                                                    ) : (
                                                                        p.price ? ` (£${parseFloat(p.price || 0).toFixed(2)})` : ''
                                                                    )}
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
                                                                    {i > 0 && (
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
                                                    ))}
                                                </Box>
                                            </Box>
                                        )}
                                        
                                        {/* Notes */}
                                        <Box sx={{ mt: 2 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Notes</Typography>
                                            <TextField
                                                fullWidth
                                                multiline
                                                rows={4}
                                                placeholder="Type your message here..."
                                                variant="outlined"
                                                sx={{ background: 'white' }}
                                            />
                                        </Box>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>
                    ) : (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="h6" color="text.secondary">
                                Booking details not available
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ background: '#f7f7f7' }}>
                    <Button 
                        onClick={() => { setDetailDialogOpen(false); setSelectedBookingId(null); setBookingDetail(null); }} 
                        color="primary" 
                        variant="contained"
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

                </Box>
            </Container>
        </div>
    );
};

export default FlownFlights;
