import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import {
    CalendarToday,
    MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import useBooking from "../api/useBooking";
import usePessanger from "../api/usePessanger";
import useActivity from "../api/useActivity";
import { Link } from "react-router-dom";


const Manifest = () => {
    // Hook'lar her zaman bir dizi döndürsün, yoksa boş dizi olsun
    const bookingHook = useBooking() || {};
    const pessangerHook = usePessanger() || {};
    const activityHook = useActivity();

    // HOOKLAR KOŞULSUZ OLARAK EN ÜSTE ALINDI
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [statusUpdate, setStatusUpdate] = useState(false);
    const [flights, setFlights] = useState([]);
    const [menuAnchorEl, setMenuAnchorEl] = useState(null);
    const [selectedFlightId, setSelectedFlightId] = useState(null);
    const [error, setError] = useState(null);

    const booking = Array.isArray(bookingHook.booking) ? bookingHook.booking : [];
    const bookingLoading = typeof bookingHook.loading === 'boolean' ? bookingHook.loading : true;
    const passenger = Array.isArray(pessangerHook.passenger) ? pessangerHook.passenger : [];
    const passengerLoading = typeof pessangerHook.loading === 'boolean' ? pessangerHook.loading : true;
    const activity = Array.isArray(activityHook && activityHook.activity) ? activityHook.activity : [];
    const activityLoading = activityHook && typeof activityHook.loading === 'boolean' ? activityHook.loading : true;

    // Hatalı veri durumunu kontrol et
    useEffect(() => {
        if (!Array.isArray(booking) || !Array.isArray(passenger)) {
            setError("Data could not be retrieved. Please try again later.");
        }
    }, [booking, passenger]);

    useEffect(() => {
        if (!bookingLoading && !passengerLoading) {
            const safeBooking = Array.isArray(booking) ? booking : [];
            const safePassenger = Array.isArray(passenger) ? passenger : [];
            if (!safeBooking.length && !safePassenger.length) {
                setError("Data could not be retrieved. Please try again later.");
                setFlights([]);
                return;
            }
            const combinedFlights = safeBooking.map((b) => ({
                ...b,
                passengers: safePassenger.filter((p) => p.booking_id === b.booking_id),
                totalWeight: safePassenger
                    .filter((p) => p.booking_id === b.booking_id)
                    .reduce((sum, p) => sum + parseFloat(p.weight || 0), 0),
            }));
            setFlights(combinedFlights);
        }
    }, [booking, passenger, bookingLoading, passengerLoading]);

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
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
        if (flight.manualStatusOverride !== null && flight.manualStatusOverride !== undefined) {
            return flight.manualStatusOverride ? "Open" : "Closed";
        }
        const currentDate = new Date(selectedDate);
        const flightDate = new Date(flight.flight_date);
        const maxCapacity = activity.find((a) => a.activity_sku === flight.activity_id)?.seats || 0;
        if (flightDate < currentDate) {
            return "Closed";
        }
        return flight.passengers.length < maxCapacity ? "Open" : "Closed";
    };

    const toggleFlightStatus = (flightId) => {
        setFlights((prevFlights) =>
            prevFlights.map((flight) =>
                flight.id === flightId
                    ? {
                        ...flight,
                        manualStatusOverride: flight.manualStatusOverride === null || flight.manualStatusOverride === undefined
                            ? getFlightStatus(flight) === "Closed"
                            : !flight.manualStatusOverride,
                    }
                    : flight
            )
        );
        handleMenuClose();
    };

    // Dummy flight data for today
    const today = new Date().toISOString().split("T")[0];
    let filteredFlights = [];
    if (selectedDate === today) {
        filteredFlights = [
            {
                id: 1,
                time_slot: "07:00",
                activity_name: "Bath & North East Somerset - Shared",
                pax: 8,
                passengers: [
                    {
                        booking_id: "FAB1345",
                        name: "John Hux",
                        weight: 54,
                        mobile: "447845718",
                        weather_insurance: "No",
                        add_ons_selected: "Cap",
                        notes: "",
                        status: "Scheduled",
                        email: "john@example.com"
                    },
                    {}, // Boş satır için
                ],
                balloon_resources: "FABX",
                status: "Open",
                flight_type: "Shared",
                totalWeight: 54,
                paid: "£410.00",
                activity_id: "FABX",
                manualStatusOverride: true,
                flight_date: today
            }
        ];
    }

    return (
        <div className="final-menifest-wrap">
            <Container maxWidth="xl">
                <div className="heading-wrap">
                    <h2>MANIFEST PAGE</h2>
                    <hr />
                </div>
                <Box sx={{ padding: 2 }}>
                    {/* Header Section */}
                    <Box sx={{ marginBottom: 3 }}>
                        <Box display="flex" alignItems="center" gap={2}>
                            <TextField
                                type="date"
                                value={selectedDate}
                                onChange={handleDateChange}
                                label="Select Date"
                                InputLabelProps={{ shrink: true }}
                            />
                        </Box>
                    </Box>

                    {/* Dummy data için özel render */}
                    {selectedDate === today ? (
                        filteredFlights.length > 0 ? (
                            filteredFlights.map((flight) => {
                                const activityName = flight.activity_name;
                                const timeSlot = flight.time_slot || "N/A";
                                const status = flight.status;
                                return (
                                    <Card key={flight.id} sx={{ marginBottom: 2 }}>
                                        <CardContent>
                                            <Grid container spacing={2} alignItems="center">
                                                {/* Flight Details */}
                                                <Grid item xs={12} md={3}>
                                                    <Typography variant="h6">{activityName} - {timeSlot}</Typography>
                                                </Grid>
                                                <Grid item xs={12} md={3}>
                                                    <Typography>
                                                        Pax Booked: {flight.passengers.length} / {flight.pax}
                                                    </Typography>
                                                    <Typography>Balloon Resource: {flight.balloon_resources || "N/A"}</Typography>
                                                </Grid>
                                                <Grid item xs={12} md={3}>
                                                    <Typography>Status: <span style={{color: 'green', fontWeight: 'bold'}}>{status}</span></Typography>
                                                    <Typography>Type: {flight.flight_type}</Typography>
                                                </Grid>
                                                <Grid item xs={12} md={3} display="flex" justifyContent="flex-end">
                                                    <IconButton>
                                                        <MoreVertIcon />
                                                    </IconButton>
                                                </Grid>
                                            </Grid>

                                            <Divider sx={{ marginY: 2 }} />

                                            {/* Passenger Details Table */}
                                            <TableContainer component={Paper} sx={{ marginTop: 2 }}>
                                                <Table>
                                                    <TableHead sx={{ marginTop: 2, background: "#d3d3d3", color: "#000" }}>
                                                        <TableRow>
                                                            <TableCell>Booking ID</TableCell>
                                                            <TableCell>Name</TableCell>
                                                            <TableCell>Weight</TableCell>
                                                            <TableCell>Mobile</TableCell>
                                                            <TableCell>WX Ins</TableCell>
                                                            <TableCell>Add On's</TableCell>
                                                            <TableCell>Notes</TableCell>
                                                            <TableCell>Status</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {flight.passengers.map((passenger, index) => (
                                                            <TableRow key={index}>
                                                                <TableCell>{passenger.booking_id || ''}</TableCell>
                                                                <TableCell>{passenger.name || ''}</TableCell>
                                                                <TableCell>{passenger.weight || ''}</TableCell>
                                                                <TableCell>{passenger.mobile || ''}</TableCell>
                                                                <TableCell>{passenger.weather_insurance || ''}</TableCell>
                                                                <TableCell>{passenger.add_ons_selected || ''}</TableCell>
                                                                <TableCell>{passenger.notes || ''}</TableCell>
                                                                <TableCell>{passenger.status || ''}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>

                                            {/* Summary */}
                                            <Divider sx={{ marginY: 2 }} />
                                            <Box display="flex" justifyContent="flex-end">
                                                <Typography variant="h6">{flight.paid}</Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        ) : (
                            <Typography>No flights scheduled for the selected date.</Typography>
                        )
                    ) : (
                        // Diğer tarihler için eski koşullar
                        <>
                            {(bookingLoading || passengerLoading || activityLoading) && (
                                <Typography>Yükleniyor...</Typography>
                            )}
                            {error && (
                                <Typography color="error">{error}</Typography>
                            )}
                            {!bookingLoading && !passengerLoading && !activityLoading && !error && (
                                filteredFlights.length > 0 ? (
                                    filteredFlights.map((flight) => {
                                        const matchingActivity = activity && Array.isArray(activity)
                                            ? activity.find((a) => a.activity_sku == flight.activity_id)
                                            : null;

                                        const activityName = matchingActivity ? matchingActivity.activity_name : "N/A";
                                        const timeSlot = flight.time_slot || "N/A";
                                        const status = getFlightStatus(flight);

                                        return (
                                            <Card key={flight.id} sx={{ marginBottom: 2 }}>
                                                <CardContent>
                                                    <Grid container spacing={2} alignItems="center">
                                                        {/* Flight Details */}
                                                        <Grid item xs={12} md={3}>
                                                            <Typography variant="h6">{activityName} - {timeSlot}</Typography>
                                                        </Grid>
                                                        <Grid item xs={12} md={3}>
                                                            <Typography>
                                                                Pax Booked: {flight.passengers.length} / {flight.pax}
                                                            </Typography>
                                                            <Typography>Balloon Resource: {flight.balloon_resources || "N/A"}</Typography>
                                                        </Grid>
                                                        <Grid item xs={12} md={3}>
                                                            <Typography>Status: {status}</Typography>
                                                            <Typography>Type: {flight.flight_type}</Typography>
                                                        </Grid>
                                                        <Grid item xs={12} md={3} display="flex" justifyContent="flex-end">
                                                            <IconButton onClick={(event) => handleMenuOpen(event, flight.id)}>
                                                                <MoreVertIcon />
                                                            </IconButton>
                                                            <Menu
                                                                anchorEl={menuAnchorEl}
                                                                open={Boolean(menuAnchorEl && selectedFlightId === flight.id)}
                                                                onClose={handleMenuClose}
                                                            >
                                                                <MenuItem onClick={() => toggleFlightStatus(flight.id)}>
                                                                    {statusUpdate === true ? "Close Slot" : "Open Slot"}
                                                                </MenuItem>
                                                                <MenuItem onClick={() => sendMessageToPassengers(flight.id)}>
                                                                    Send Message to Passengers
                                                                </MenuItem>
                                                                <MenuItem onClick={() => cancelFlight(flight.id)}>Cancel Flight</MenuItem>
                                                            </Menu>
                                                        </Grid>
                                                    </Grid>

                                                    <Divider sx={{ marginY: 2 }} />

                                                    {/* Passenger Details Table */}
                                                    <Typography variant="h6">Passenger List:</Typography>
                                                    <TableContainer component={Paper} sx={{ marginTop: 2 }}>
                                                        <Table>
                                                            <TableHead sx={{ marginTop: 2, background: "#3274b4", color: "#fff" }}>
                                                                <TableRow>
                                                                    <TableCell sx={{ color: "#fff" }}>Booking ID</TableCell>
                                                                    <TableCell sx={{ color: "#fff" }}>Name</TableCell>
                                                                    <TableCell sx={{ color: "#fff" }}>Weight</TableCell>
                                                                    <TableCell sx={{ color: "#fff" }}>Weather Insurance</TableCell>
                                                                    <TableCell sx={{ color: "#fff" }}>Add-ons Selected</TableCell>
                                                                    <TableCell sx={{ color: "#fff" }}>Notes</TableCell>
                                                                    <TableCell sx={{ color: "#fff" }}>Status</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {flight.passengers.map((passenger, index) => (
                                                                    <TableRow key={index}>
                                                                        <TableCell>{passenger.booking_id}</TableCell>
                                                                        <TableCell>
                                                                            <Link to={`/profile/${passenger.booking_id}/${encodeURIComponent(passenger.email)}`}>
                                                                                {passenger.name}
                                                                            </Link>
                                                                        </TableCell>
                                                                        <TableCell>{passenger.weight} kg</TableCell>
                                                                        <TableCell>{passenger.weather_insurance}</TableCell>
                                                                        <TableCell>{passenger.add_ons_selected}</TableCell>
                                                                        <TableCell>{passenger.notes}</TableCell>
                                                                        <TableCell>{passenger.status}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </TableContainer>

                                                    {/* Summary */}
                                                    <Divider sx={{ marginY: 2 }} />
                                                    <Box display="flex" justifyContent="space-between">
                                                        <Typography>Total Weight: {flight.totalWeight} kg</Typography>
                                                        <Typography>Total Passengers: {flight.passengers.length}</Typography>
                                                        <Typography>Total Value: {flight.paid}</Typography>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        );
                                    })
                                ) : (
                                    <Typography>No flights scheduled for the selected date.</Typography>
                                )
                            )}
                        </>
                    )}
                </Box>
            </Container>
        </div>
    );
};

export default Manifest;
