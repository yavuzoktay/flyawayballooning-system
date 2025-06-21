import axios from "axios";
import React, { useEffect, useState } from "react";
import PaginatedTable from "../components/BookingPage/PaginatedTable";
import { Container, FormControl, InputLabel, MenuItem, OutlinedInput, Select, TextField } from "@mui/material";
import { Link } from "react-router-dom";

const BookingPage = () => {
    const [activeTab, setActiveTab] = useState("bookings");
    const [booking, setBooking] = useState([]);
    const [voucher, setVoucher] = useState([]);
    const [dateRequested, setDateRequested] = useState([]);
    const [filteredData, setFilteredData] = useState([]);

    // Filters
    const [filters, setFilters] = useState({
        search: "",
        flightType: "",
        status: "",
        location: "",
        voucherType: "",
        redeemedStatus: "",
    });

    // Fetch data
    const bookingData = async () => {
        try {
            console.log('BookingPage filters:', filters); // Debug log
            const resp = await axios.get(`/api/getAllBookingData`, { params: filters });
            setBooking(resp.data.data || []);
            setFilteredData(resp.data.data || []); // Also update filteredData directly
        } catch (err) {
            setBooking([]); // Clear data on error
            setFilteredData([]);
        }
    };

    const voucherData = async () => {
        try {
            const resp = await axios.get(`/api/getAllVoucherData`);
            setVoucher(resp.data.data || []);
        } catch (err) {
            console.error("Error fetching vouchers:", err);
        }
    };

    const dateRequestedData = async () => {
        try {
            const resp = await axios.get(`/api/getDateRequestData`);
            setDateRequested(resp.data.data || []);
        } catch (err) {
            console.error("Error fetching date requests:", err);
        }
    };

    // Handle Filter Change
    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // Load data on component mount
    useEffect(() => {
        voucherData();
        dateRequestedData();
    }, []);

    // Fetch booking data when filters change
    useEffect(() => {
        bookingData();
    }, [filters]);

    return (
        <div className="booking-page-wrap">
            <Container maxWidth="xl">
                <div className="heading-wrap">
                    <h2>
                        BOOKING PAGE
                    </h2>
                    <hr />
                </div>
                <div style={{ padding: "50px", background: "#f9f9f9", borderRadius: "20px" }}>
                    {/* Tabs */}
                    <div style={{ marginBottom: "20px" }}>
                        <button
                            onClick={() => setActiveTab("bookings")}
                            style={{
                                marginRight: "10px",
                                background: activeTab === "bookings" ? "#3274b4" : "#A6A6A6",
                                color: "#FFF",
                                padding: "8px",
                                border: "none",
                                cursor: "pointer"
                            }}
                        >
                            All Bookings
                        </button>
                        <button
                            onClick={() => setActiveTab("vouchers")}
                            style={{
                                marginRight: "10px",
                                background: activeTab === "vouchers" ? "#3274b4" : "#A6A6A6",
                                color: "#FFF",
                                padding: "8px",
                                border: "none",
                                cursor: "pointer"
                            }}
                        >
                            All Vouchers
                        </button>
                        <button
                            onClick={() => setActiveTab("dateRequests")}
                            style={{
                                background: activeTab === "dateRequests" ? "#3274b4" : "#A6A6A6",
                                color: "#FFF",
                                padding: "8px",
                                border: "none",
                                cursor: "pointer"
                            }}
                        >
                            Date Requests
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div>
                        {activeTab === "bookings" && (
                            <>
                                <div className="booking-top-wrap">
                                    <div className="booking-filter-heading">
                                        <h3 style={{ fontFamily: "Gilroy Light" }}>All Bookings</h3>
                                    </div>
                                    <div className="booking-search-booking">
                                        <OutlinedInput placeholder="Search here" value={filters.search}
                                            onChange={(e) => handleFilterChange("search", e.target.value)} />
                                    </div>
                                    <div className="booking-filter-wrap">
                                        <div className="booking-filter-field">
                                            <FormControl sx={{ m: 1, minWidth: 120 }} size="small" className="booking-filter-field">
                                                <InputLabel id="book-flight-type-label">Flight Type</InputLabel>
                                                <Select
                                                    labelId="book-flight-type-label"
                                                    value={filters.flightType}
                                                    label="Flight Type"
                                                    onChange={(e) => handleFilterChange("flightType", e.target.value)}
                                                >
                                                    <MenuItem value="">
                                                        <em>Select</em>
                                                    </MenuItem>
                                                    <MenuItem value="Private">Private</MenuItem>
                                                    <MenuItem value="Shared">Shared</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </div>
                                        <div className="booking-filter-field">
                                            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                                                <InputLabel id="book-Select-label">Status</InputLabel>
                                                <Select
                                                    labelId="book-Select-label"
                                                    value={filters.status}
                                                    onChange={(e) => handleFilterChange("status", e.target.value)}
                                                    label="Status"
                                                >
                                                    <MenuItem value="">
                                                        <em>Select</em>
                                                    </MenuItem>
                                                    <MenuItem value="Scheduled">Scheduled</MenuItem>
                                                    <MenuItem value="Waiting">Waiting</MenuItem>
                                                    <MenuItem value="Expired">Expired</MenuItem>
                                                    <MenuItem value="Flown">Flown</MenuItem>
                                                    <MenuItem value="No Show">No Show</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </div>
                                        <div className="booking-filter-field">
                                            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                                                <InputLabel id="book-location-label">Location</InputLabel>
                                                <Select
                                                    labelId="book-location-label"
                                                    value={filters.location}
                                                    onChange={(e) => handleFilterChange("location", e.target.value)}
                                                    label="Location"
                                                >
                                                    <MenuItem value="">
                                                        <em>Select</em>
                                                    </MenuItem>
                                                    <MenuItem value="Bath">Bath</MenuItem>
                                                    <MenuItem value="Somerset">Somerset</MenuItem>
                                                    <MenuItem value="Devon">Devon</MenuItem>
                                                    <MenuItem value="Bristol Fiesta">Bristol Fiesta</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </div>
                                    </div>
                                </div>
                                <PaginatedTable
                                    data={filteredData}
                                    columns={[
                                        "created_at",
                                        "name",
                                        "flight_type",
                                        "flight_date",
                                        "pax",
                                        "location",
                                        "status",
                                        "paid",
                                        "due",
                                    ]}
                                />
                            </>
                        )}
                        {activeTab === "vouchers" && (
                            <>
                                <div className="booking-top-wrap">
                                    <div className="booking-filter-heading">
                                        <h3 style={{ fontFamily: "Gilroy Light" }}>All Vouchers</h3>
                                    </div>
                                    <div className="booking-search-booking">
                                        <OutlinedInput placeholder="Search here" value={filters.search}
                                            onChange={(e) => handleFilterChange("search", e.target.value)} />
                                    </div>
                                    <div className="booking-filter-wrap">
                                        <div className="booking-filter-field">
                                            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                                                <InputLabel id="book-voucher-type-label">Voucher Type</InputLabel>
                                                <Select
                                                    labelId="book-voucher-type-label"
                                                    value={filters.voucherType}
                                                    onChange={(e) => handleFilterChange("voucherType", e.target.value)}
                                                    label="Voucher Type"
                                                >
                                                    <MenuItem value="">
                                                        <em>Select</em>
                                                    </MenuItem>
                                                    <MenuItem value="Flight">Flight Voucher</MenuItem>
                                                    <MenuItem value="Gift">Gift Voucher</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </div>
                                        <div className="booking-filter-field">
                                            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                                                <InputLabel id="book-flight-type-label">Flight Type</InputLabel>
                                                <Select
                                                    labelId="book-flight-type-label"
                                                    value={filters.flightType}
                                                    label="Flight Type"
                                                    onChange={(e) => handleFilterChange("flightType", e.target.value)}
                                                >
                                                    <MenuItem value="">
                                                        <em>Select</em>
                                                    </MenuItem>
                                                    <MenuItem value="Private">Private</MenuItem>
                                                    <MenuItem value="Shared">Shared</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </div>
                                        <div className="booking-filter-field">
                                            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
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
                                <PaginatedTable
                                    data={filteredData}
                                    columns={["created", "name", "flight_type", "voucher_type", "email", "phone", "expires", "redeemed", "paid", "offer_code", "voucher_ref"]}
                                />
                            </>
                        )}
                        {activeTab === "dateRequests" && (
                            <>
                                <h3 style={{ fontFamily: "Gilroy Light" }}>Date Requests</h3>
                                <PaginatedTable
                                    data={dateRequested}
                                    columns={["name", "number", "email", "location", "date_requested"]}
                                />
                            </>
                        )}
                    </div>
                </div>
            </Container>
        </div>
    );
};

export default BookingPage;
