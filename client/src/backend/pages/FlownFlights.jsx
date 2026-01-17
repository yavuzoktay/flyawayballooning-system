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
    Button
} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import dayjs from 'dayjs';
import PaginatedTable from "../components/BookingPage/PaginatedTable";

const FlownFlights = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    const [flownFlights, setFlownFlights] = useState([]);
    const [filteredFlights, setFilteredFlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [experienceFilter, setExperienceFilter] = useState('');
    const [voucherTypeFilter, setVoucherTypeFilter] = useState('');
    const [pilotFilter, setPilotFilter] = useState('');
    const [operationalFields, setOperationalFields] = useState([]);

    useEffect(() => {
        fetchFlownFlights();
    }, []);

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

        // Status filter
        if (statusFilter) {
            filtered = filtered.filter(flight => flight.status === statusFilter);
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

        // Voucher Type filter
        if (voucherTypeFilter) {
            filtered = filtered.filter(flight => flight.voucher_type === voucherTypeFilter);
        }

        // Pilot filter
        if (pilotFilter) {
            filtered = filtered.filter(flight => {
                const pilot = (flight.pilot || '').trim();
                return pilot !== '-' && pilot === pilotFilter;
            });
        }

        setFilteredFlights(filtered);
    }, [searchTerm, locationFilter, statusFilter, experienceFilter, voucherTypeFilter, pilotFilter, flownFlights]);

    // Get unique locations for filter
    const locations = useMemo(() => {
        const uniqueLocations = [...new Set(flownFlights.map(f => f.location).filter(Boolean))];
        return uniqueLocations.sort();
    }, [flownFlights]);

    // Get unique voucher types for filter
    const voucherTypes = useMemo(() => {
        const uniqueTypes = [...new Set(flownFlights.map(f => f.voucher_type).filter(Boolean))];
        return uniqueTypes.sort();
    }, [flownFlights]);

    // Get unique pilots for filter
    const pilots = useMemo(() => {
        const uniquePilots = [...new Set(flownFlights.map(f => {
            const pilot = (f.pilot || '').trim();
            return pilot !== '-' ? pilot : null;
        }).filter(Boolean))];
        return uniquePilots.sort();
    }, [flownFlights]);

    return (
        <div className="flown-flights-page-wrap">
            <Container maxWidth={false}>
                <div className="heading-wrap">
                    <h2>FLOWN FLIGHTS PAGE</h2>
                    <hr />
                </div>
                <Box sx={{ padding: isMobile ? 1 : 2 }}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="body1" color="text.secondary">
                            View and manage completed flights
                        </Typography>
                    </Box>

            {/* Filters */}
            <Box sx={{ mb: 3, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}
                    size="small"
                />
                <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
                    <InputLabel>Experience</InputLabel>
                    <Select
                        value={experienceFilter}
                        label="Experience"
                        onChange={(e) => setExperienceFilter(e.target.value)}
                    >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="Shared">Shared</MenuItem>
                        <MenuItem value="Private">Private</MenuItem>
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
                    <InputLabel>Pilot</InputLabel>
                    <Select
                        value={pilotFilter}
                        label="Pilot"
                        onChange={(e) => setPilotFilter(e.target.value)}
                    >
                        <MenuItem value="">All</MenuItem>
                        {pilots.map(pilot => (
                            <MenuItem key={pilot} value={pilot}>{pilot}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={statusFilter}
                        label="Status"
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="Flown">Flown</MenuItem>
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
                    <InputLabel>Voucher Type</InputLabel>
                    <Select
                        value={voucherTypeFilter}
                        label="Voucher Type"
                        onChange={(e) => setVoucherTypeFilter(e.target.value)}
                    >
                        <MenuItem value="">All</MenuItem>
                        {voucherTypes.map(type => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
                    <InputLabel>Location</InputLabel>
                    <Select
                        value={locationFilter}
                        label="Location"
                        onChange={(e) => setLocationFilter(e.target.value)}
                    >
                        <MenuItem value="">All</MenuItem>
                        {locations.map(loc => (
                            <MenuItem key={loc} value={loc}>{loc}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
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
                            location: item.location || '',
                            flight_date: item.flight_date_display || (item.flight_date ? dayjs(item.flight_date).format('DD/MM/YYYY HH:mm A') : ''),
                            pax: item.pax || item.passenger_count || 0,
                            status: item.status || 'Flown',
                            paid: item.paid || '0/0',
                            expires: item.expires || '',
                            pilot: item.pilot || '-',
                            crew: item.crew || '-',
                            flight_period: item.flight_period || '-',
                            flight_type_display: item.flight_type_display || '-',
                            balloon_resource: item.balloon_resource || 'N/A',
                            aircraft_defects: item.aircraft_defects || '-',
                            vehicle_trailer_defects: item.vehicle_trailer_defects || '-',
                            flight_start_time: item.flight_start_time || '-',
                            flight_end_time: item.flight_end_time || '-'
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
                        "row_id",
                        "location",
                        "flight_date",
                        "flight_period",
                        "flight_type_display",
                        "balloon_resource",
                        "pax",
                        "status",
                        "paid",
                        "expires",
                        "flight_start_time",
                        "flight_end_time",
                        "pilot",
                        "crew",
                        "aircraft_defects",
                        "vehicle_trailer_defects",
                        ...operationalFields.map(field => field.toLowerCase().replace(/\s+/g, '_'))
                    ]}
                    selectable={false}
                />
            )}

                </Box>
            </Container>
        </div>
    );
};

export default FlownFlights;
