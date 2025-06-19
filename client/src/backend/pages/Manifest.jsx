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
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]); // Default to today's date
    const { booking, loading: bookingLoading } = useBooking();
    const { passenger, loading: passengerLoading } = usePessanger();
    const { activity, loading: activityLoading } = useActivity();
    const [statusUpdtae, setStatusUpdtae] = useState(false);

    const [flights, setFlights] = useState([]);
    const [menuAnchorEl, setMenuAnchorEl] = useState(null);
    const [selectedFlightId, setSelectedFlightId] = useState(null);

    useEffect(() => {
        if (!bookingLoading && !passengerLoading) {
            // Combine bookings and passengers data
            const combinedFlights = booking.map((b) => ({
                ...b,
                passengers: passenger.filter((p) => p.booking_id === b.booking_id),
                totalWeight: passenger
                    .filter((p) => p.booking_id === b.booking_id)
                    .reduce((sum, p) => sum + parseFloat(p.weight), 0),
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
        if (flight.manualStatusOverride !== null) {
            // If there's a manual override, use it
            return flight.manualStatusOverride ? "Open" : "Closed";
        }

        // Otherwise, compute status dynamically
        const currentDate = new Date(selectedDate); // Selected date
        const flightDate = new Date(flight.flight_date); // Flight date
        const maxCapacity = activity.find((a) => a.activity_sku === flight.acitivity_id)?.seats || 0;

        if (flightDate < currentDate) {
            return "Closed";
        }

        return flight.passengers.length < maxCapacity ? "Open" : "Closed";
    };

    // OnClick Status Change
    const toggleFlightStatus = (flightId) => {
        setFlights((prevFlights) =>
            prevFlights.map((flight) =>
                flight.id === flightId
                    ? {
                        ...flight,
                        manualStatusOverride: flight.manualStatusOverride === null
                            ? getFlightStatus(flight) === "Closed" // Set override based on current status
                            : !flight.manualStatusOverride, // Toggle if already overridden
                    }
                    : flight
            )
        );
        handleMenuClose();
    };

    // Filter flights by the selected date
    const filteredFlights = flights?.filter(
        (flight) => flight.flight_date.split("-").reverse().join("-") === selectedDate
    );

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

                    {/* Flight Details */}
                    {filteredFlights.length > 0 ? (
                        filteredFlights.map((flight) => {
                            const matchingActivity = activity.find(
                                (a) => a.activity_sku == flight.acitivity_id
                            );

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
                                                {/* Three Dots Menu */}
                                                <Menu
                                                    anchorEl={menuAnchorEl}
                                                    open={Boolean(menuAnchorEl && selectedFlightId === flight.id)}
                                                    onClose={handleMenuClose}
                                                >
                                                    <MenuItem onClick={() => toggleFlightStatus(flight.id)}>
                                                        {statusUpdtae === true ? "Close Slot" : "Open Slot"}
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
                                                    {
                                                        flight.passengers.map((passenger, index) => (
                                                            <TableRow key={index}>
                                                                <TableCell>{passenger.booking_id}</TableCell>
                                                                <TableCell><Link to={`/profile/${passenger.booking_id}/${encodeURIComponent(passenger.email)}`}>{passenger.name}</Link></TableCell>
                                                                <TableCell>{passenger.weight} kg</TableCell>
                                                                <TableCell>{passenger.weather_insurance}</TableCell>
                                                                <TableCell>{passenger.add_ons_selected}</TableCell>
                                                                <TableCell>{passenger.notes}</TableCell>
                                                                <TableCell>{passenger.status}</TableCell>
                                                            </TableRow>
                                                        ))
                                                    }
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
                    )}
                </Box>
            </Container>
        </div>
    );
};

export default Manifest;
