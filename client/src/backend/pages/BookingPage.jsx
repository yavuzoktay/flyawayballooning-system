import axios from "axios";
import React, { useEffect, useState } from "react";
import PaginatedTable from "../components/BookingPage/PaginatedTable";
import { Container, FormControl, InputLabel, MenuItem, OutlinedInput, Select, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";

const BookingPage = () => {
    const [activeTab, setActiveTab] = useState("bookings");
    const [booking, setBooking] = useState([]);
    const [dateRequested, setDateRequested] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [voucher, setVoucher] = useState([]);

    // Filters
    const [filters, setFilters] = useState({
        search: "",
        flightType: "",
        status: "",
        location: "",
        voucherType: "",
        redeemedStatus: "",
    });

    const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
    const [voucherForm, setVoucherForm] = useState({
        name: '',
        flight_type: '',
        voucher_type: '',
        email: '',
        phone: '',
        expires: '',
        redeemed: 'No',
        paid: '',
        offer_code: '',
        voucher_ref: ''
    });

    // Fetch data
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
            const response = await axios.get(`/api/getDateRequestData`);
            setDateRequested(response.data.data || []);
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

    const handleVoucherFormChange = (field, value) => {
        setVoucherForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleVoucherCreate = async () => {
        if (!voucherForm.name || voucherForm.name.trim() === '') {
            alert('Name alanı zorunludur. Lütfen yolcu adını giriniz.');
            return;
        }
        try {
            await axios.post('/api/createVoucher', voucherForm);
            setVoucherDialogOpen(false);
            voucherData(); // Tabloyu güncelle
        } catch (err) {
            alert('Error creating voucher');
        }
    };

    // Load data on component mount
    useEffect(() => {
        voucherData();
        dateRequestedData();
    }, []);

    // Tab değiştiğinde ilgili veriyi sunucudan çek
    useEffect(() => {
        if (activeTab === "bookings") {
            (async () => {
                try {
                    const response = await axios.get(`/api/getAllBookingData`, { params: filters });
                    setBooking(response.data.data || []);
                    setFilteredData(response.data.data || []);
                } catch (err) {
                    setBooking([]);
                    setFilteredData([]);
                }
            })();
        } else if (activeTab === "vouchers") {
            (async () => {
                try {
                    const resp = await axios.get(`/api/getAllVoucherData`);
                    setVoucher(resp.data.data || []);
                    setFilteredData((resp.data.data || []).map(item => ({
                        created: item.created_at || '',
                        name: item.name || '',
                        flight_type: item.flight_type || '',
                        voucher_type: item.voucher_type || '',
                        email: item.email || '',
                        phone: item.phone || '',
                        expires: item.expires || '',
                        redeemed: item.redeemed || '',
                        paid: item.paid || '',
                        offer_code: item.offer_code || '',
                        voucher_ref: item.voucher_ref || ''
                    })));
                } catch (err) {
                    setVoucher([]);
                    setFilteredData([]);
                }
            })();
        } else if (activeTab === "dateRequests") {
            (async () => {
                try {
                    const response = await axios.get(`/api/getDateRequestData`);
                    setDateRequested(response.data.data || []);
                    setFilteredData((response.data.data || []).map((item) => ({
                        name: item.name || "",
                        number: item.number || item.phone || item.mobile || "",
                        email: item.email || "",
                        location: item.location || "",
                        date_requested: item.date_requested || item.requested_date || item.created_at || item.created || "",
                        voucher_booking_id: item.voucher_code || item.booking_id || item.id || ""
                    })));
                } catch (err) {
                    setDateRequested([]);
                    setFilteredData([]);
                }
            })();
        }
    }, [activeTab]);

    // filteredData'yı voucher tablosu için backend key'lerine göre map'le
    useEffect(() => {
        if (activeTab === "vouchers") {
            setFilteredData(voucher.map(item => ({
                created: item.created_at || '',
                name: item.name || '',
                flight_type: item.flight_type || '',
                voucher_type: item.voucher_type || '',
                email: item.email || '',
                phone: item.phone || '',
                expires: item.expires || '',
                redeemed: item.redeemed || '',
                paid: item.paid || '',
                offer_code: item.offer_code || '',
                voucher_ref: item.voucher_ref || ''
            })));
        }
    }, [voucher, activeTab]);

    // Status filtresini hem Confirmed hem Scheduled için uygula
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (filters.status) {
            setFilteredData(
                booking.filter((item) => {
                    if (filters.status === 'Scheduled') {
                        return item.status === 'Scheduled' || item.status === 'Confirmed';
                    }
                    return item.status === filters.status;
                })
            );
        } else {
            setFilteredData(booking);
        }
    }, [filters.status, booking]);

    console.log("PaginatedTable data:", filteredData);
    console.log("PaginatedTable columns:", [
        "created_at",
        "name",
        "flight_type",
        "flight_date",
        "pax",
        "email",
        "location",
        "status",
        "paid",
        "due",
        "voucher_code",
        "flight_attempts",
        "expires"
    ]);

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
                            All Bookings2
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
                                        <h3 style={{ fontFamily: "Gilroy Light" }}>All Bookings2</h3>
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
                                                    <MenuItem value="Private Flight">Private</MenuItem>
                                                    <MenuItem value="Shared Flight">Shared</MenuItem>
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
                                        "email",
                                        "location",
                                        "status",
                                        "paid",
                                        "due",
                                        "voucher_code",
                                        "flight_attempts",
                                        "expires"
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
                                                    <MenuItem value="Private Flight">Private</MenuItem>
                                                    <MenuItem value="Shared Flight">Shared</MenuItem>
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
                                        <Button variant="contained" color="primary" onClick={() => setVoucherDialogOpen(true)} style={{ marginLeft: 16 }}>
                                            + Add Voucher
                                        </Button>
                                    </div>
                                </div>
                                <PaginatedTable
                                    data={filteredData}
                                    columns={["created", "name", "flight_type", "voucher_type", "email", "phone", "expires", "redeemed", "paid", "offer_code", "voucher_ref"]}
                                />
                                <Dialog open={voucherDialogOpen} onClose={() => setVoucherDialogOpen(false)}>
                                    <DialogTitle>Add Voucher</DialogTitle>
                                    <DialogContent>
                                        <TextField label="Name" value={voucherForm.name} onChange={e => handleVoucherFormChange('name', e.target.value)} fullWidth margin="dense" required />
                                        <TextField label="Flight Type" value={voucherForm.flight_type} onChange={e => handleVoucherFormChange('flight_type', e.target.value)} select fullWidth margin="dense">
                                            <MenuItem value="Shared Flight">Shared Flight</MenuItem>
                                            <MenuItem value="Private Flight">Private Flight</MenuItem>
                                        </TextField>
                                        <TextField label="Voucher Type" value={voucherForm.voucher_type} onChange={e => handleVoucherFormChange('voucher_type', e.target.value)} select fullWidth margin="dense">
                                            <MenuItem value="Flight">Flight Voucher</MenuItem>
                                            <MenuItem value="Gift">Gift Voucher</MenuItem>
                                            <MenuItem value="Redeem">Redeem Voucher</MenuItem>
                                        </TextField>
                                        <TextField label="Email" value={voucherForm.email} onChange={e => handleVoucherFormChange('email', e.target.value)} fullWidth margin="dense" />
                                        <TextField label="Phone" value={voucherForm.phone} onChange={e => handleVoucherFormChange('phone', e.target.value)} fullWidth margin="dense" />
                                        <TextField label="Expires" value={voucherForm.expires} onChange={e => handleVoucherFormChange('expires', e.target.value)} fullWidth margin="dense" />
                                        <TextField label="Paid" value={voucherForm.paid} onChange={e => handleVoucherFormChange('paid', e.target.value)} fullWidth margin="dense" />
                                        <TextField label="Offer Code" value={voucherForm.offer_code} onChange={e => handleVoucherFormChange('offer_code', e.target.value)} fullWidth margin="dense" />
                                        <TextField label="Voucher Ref" value={voucherForm.voucher_ref} onChange={e => handleVoucherFormChange('voucher_ref', e.target.value)} fullWidth margin="dense" />
                                    </DialogContent>
                                    <DialogActions>
                                        <Button onClick={() => setVoucherDialogOpen(false)}>Cancel</Button>
                                        <Button onClick={handleVoucherCreate} variant="contained" color="primary">Create</Button>
                                    </DialogActions>
                                </Dialog>
                            </>
                        )}
                        {activeTab === "dateRequests" && (
                            <>
                                <h3 style={{ fontFamily: "Gilroy Light" }}>Date Requests</h3>
                                {console.log('DateRequests API data:', dateRequested)}
                                <PaginatedTable
                                    data={dateRequested.map((item) => {
                                        console.log('DateRequest item:', item);
                                        return {
                                            name: item.name || "",
                                            number: item.number || item.phone || item.mobile || "",
                                            email: item.email || "",
                                            location: item.location || "",
                                            date_requested: item.date_requested || item.requested_date || item.created_at || item.created || "",
                                            voucher_booking_id: item.voucher_code || item.booking_id || item.id || ""
                                        }
                                    })}
                                    columns={["name", "number", "email", "location", "date_requested", "voucher_booking_id"]}
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
