import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../../config";
import { ADMIN_MANUAL_BOOKING_AUTH } from "../../auth/adminCredentials";
import { formatGbp } from "../../utils/formatGbp";

const DateRangeSelector = ({ bookingData, voucherData, onDateRangeChange }) => {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [summary, setSummary] = useState({});
    const [isMobile, setIsMobile] = useState(false);
    const [isLaunchingManualBooking, setIsLaunchingManualBooking] = useState(false);
    const [isLaunchingTheNewtBooking, setIsLaunchingTheNewtBooking] = useState(false);
    const [isLaunchingHotelManualBooking, setIsLaunchingHotelManualBooking] = useState(false);
    const API_BASE_URL = config.API_BASE_URL;

    const getBookingBaseUrl = () => {
        if (typeof window === 'undefined') {
            return 'https://flyawayballooning-book.com';
        }

        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }

        return 'https://flyawayballooning-book.com';
    };

    const parseMoney = (value) => {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number' && !Number.isNaN(value)) return value;
        const cleaned = String(value).replace(/£/g, '').replace(/,/g, '').trim();
        const n = Number.parseFloat(cleaned);
        return Number.isNaN(n) ? 0 : n;
    };

    const parseLooseDate = (raw) => {
        if (!raw) return null;
        if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
        const dateStr = String(raw).trim();
        if (!dateStr) return null;

        // ISO-like (YYYY-MM-DD...) works with Date constructor
        if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            const d = new Date(dateStr);
            return Number.isNaN(d.getTime()) ? null : d;
        }

        // DD/MM/YYYY (common in API display fields)
        const dmySlash = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (dmySlash) {
            const [, dd, mm, yyyy] = dmySlash;
            const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
            return Number.isNaN(d.getTime()) ? null : d;
        }

        // DD-MM-YYYY
        const dmyDash = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (dmyDash) {
            const [, dd, mm, yyyy] = dmyDash;
            const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
            return Number.isNaN(d.getTime()) ? null : d;
        }

        // Fallback
        const d = new Date(dateStr);
        return Number.isNaN(d.getTime()) ? null : d;
    };

    const isRedeemedLikeYes = (raw) => {
        const v = raw === null || raw === undefined ? '' : String(raw).trim().toLowerCase();
        return v === 'yes' || v === 'redeemed' || v === 'true' || v === '1';
    };

    const isExpired = (rawDate) => {
        const d = parseLooseDate(rawDate);
        if (!d) return false; // if we can't parse expiry, don't treat as expired
        const endOfDay = new Date(d);
        endOfDay.setHours(23, 59, 59, 999);
        return endOfDay < new Date();
    };

    const computeTotalLiabilityAllTime = () => {
        // Total Liability is all-time:
        // sum paid for unflown bookings + unredeemed/unexpired vouchers
        const bookingsLiability = (bookingData || []).reduce((sum, b) => {
            if (!b || typeof b !== 'object') return sum;
            const status = String(b.status || '').trim().toLowerCase();
            if (status === 'flown') return sum;
            if (status === 'cancelled' || status === 'canceled') return sum;
            if (status === 'expired') return sum;
            // If booking has an expires date and it's in the past, treat as expired
            if (b.expires && isExpired(b.expires)) return sum;
            return sum + parseMoney(b.paid);
        }, 0);

        const vouchersLiability = (voucherData || []).reduce((sum, v) => {
            if (!v || typeof v !== 'object') return sum;
            if (isRedeemedLikeYes(v.redeemed)) return sum;
            if (v.expires && isExpired(v.expires)) return sum;
            return sum + parseMoney(v.paid);
        }, 0);

        return bookingsLiability + vouchersLiability;
    };

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        // Calculate summary for all data on page load
        calculateSummary(bookingData, voucherData);
    }, [bookingData, voucherData]);

    const filterData = (start, end) => {
        setStartDate(start);
        setEndDate(end);
        if (onDateRangeChange) {
            onDateRangeChange({ start, end });
        }
        const startDateObj = parseLooseDate(start);
        const endDateObj = parseLooseDate(end);
        if (!startDateObj || !endDateObj) {
            calculateSummary(bookingData, voucherData);
            return;
        }

        // Make end date inclusive for the whole day
        endDateObj.setHours(23, 59, 59, 999);

        // Filter the data based on the date range
        const filtered = bookingData.filter((item) => {
            const dateStr = item?.created || item?.created_at || null;
            const createdDate = parseLooseDate(dateStr);
            if (!createdDate) return false;
            return createdDate >= startDateObj && createdDate <= endDateObj;
        });

        const filteredVouchers = (voucherData || []).filter((item) => {
            const dateStr = item?.created || item?.created_at || null;
            const createdDate = parseLooseDate(dateStr);
            if (!createdDate) return false;
            return createdDate >= startDateObj && createdDate <= endDateObj;
        });

        calculateSummary(filtered, filteredVouchers);
    };

    // Updated Quick Links
    const quickLinks = {
        allTime: () => {
            setStartDate("");
            setEndDate("");
            if (onDateRangeChange) {
                onDateRangeChange({ start: null, end: null });
            }
            calculateSummary(bookingData, voucherData);
        },
        last12Months: () => {
            const today = new Date();
            const lastYear = new Date(today);
            lastYear.setFullYear(today.getFullYear() - 1);
            const start = lastYear.toISOString().split("T")[0];
            const end = new Date().toISOString().split("T")[0];
            setStartDate(start);
            setEndDate(end);
            filterData(start, end);
        },
        quarter1: () => {
            const year = new Date().getFullYear();
            const start = `${year}-01-01`;
            const end = `${year}-03-31`;
            setStartDate(start);
            setEndDate(end);
            filterData(start, end);
        },
        quarter2: () => {
            const year = new Date().getFullYear();
            const start = `${year}-04-01`;
            const end = `${year}-06-30`;
            setStartDate(start);
            setEndDate(end);
            filterData(start, end);
        },
        quarter3: () => {
            const year = new Date().getFullYear();
            const start = `${year}-07-01`;
            const end = `${year}-09-30`;
            setStartDate(start);
            setEndDate(end);
            filterData(start, end);
        },
        quarter4: () => {
            const year = new Date().getFullYear();
            const start = `${year}-10-01`;
            const end = `${year}-12-31`;
            setStartDate(start);
            setEndDate(end);
            filterData(start, end);
        },
    };

    const getFlightDateRange = () => {
        const start = parseLooseDate(startDate);
        const end = parseLooseDate(endDate);
        if (!start || !end) return null;
        const endInclusive = new Date(end);
        endInclusive.setHours(23, 59, 59, 999);
        return { start, end: endInclusive };
    };

    // Add All Values Result
    const calculateSummary = (data, vouchers = []) => {
        const safeValue = (value) => isNaN(value) ? 0 : value;
        if(data){
            const flightRange = getFlightDateRange();

            const bookingsForFlights = (bookingData && bookingData.length > 0)
                ? bookingData
                : (data || []);

            const isInFlightRange = (item) => {
                if (!flightRange) return true; // all time
                const raw = item?.flight_date || item?.flight_date_display || null;
                if (!raw) return false;
                const dateOnly = String(raw).split(' ')[0]; // strip AM/PM etc.
                const d = parseLooseDate(dateOnly);
                if (!d) return false;
                return d >= flightRange.start && d <= flightRange.end;
            };

            // Filter flown flights: only count flights where status is exactly "Flown" (by flight_date range)
            const flownFlights = bookingsForFlights?.filter(item => {
                if (!item || typeof item !== 'object') return false;
                
                // Status must be exactly "Flown" (case-insensitive check)
                const status = (item.status || '').trim();
                if (status.toLowerCase() !== 'flown') return false;
                return isInFlightRange(item);
            });
            
            // Completed flights for monetary totals use same flownFlights set
            const completedFlightsData = flownFlights;

            // Flights Completed (gross, includes VAT): sum of paid for flown bookings in selected date range
            const completedFlightsGross = (completedFlightsData || []).reduce((sum, item) => {
                return sum + parseMoney(item?.paid);
            }, 0);
            
            // Total Sales:
            // We count voucher sale at the time the voucher is created.
            // When a voucher is redeemed into a booking, the booking's `paid` reflects that same purchase,
            // so we must NOT add redeemed-voucher bookings again to avoid double-counting.
            const bookingSales = data?.reduce((sum, item) => {
                const redeemedLike =
                    isRedeemedLikeYes(item?.redeemed_voucher) ||
                    isRedeemedLikeYes(item?.voucher_redeemed) ||
                    isRedeemedLikeYes(item?.is_voucher_redeemed);

                if (redeemedLike) return sum;
                return sum + parseMoney(item?.paid);
            }, 0) || 0;
            const voucherSales = (vouchers || []).reduce((sum, item) => {
                return sum + parseMoney(item?.paid);
            }, 0);
            const totalSales = bookingSales + voucherSales;
            const totalLiability = computeTotalLiabilityAllTime();

            // VAT Portion: extract VAT from completed flights gross (paid includes VAT)
            const VAT_RATE = 0.2;
            const totalVAT = completedFlightsGross * VAT_RATE / (1 + VAT_RATE);
            
            const summary = {
                totalFlights: flownFlights?.length || 0,
                totalPax: flownFlights?.reduce((sum, item) => sum + safeValue(parseInt(item.pax, 10)), 0) || 0,
                completedFlights: completedFlightsGross,
                totalSales: totalSales,
                totalLiability: totalLiability,
                totalVAT: totalVAT,
            };
            setSummary(summary);
        }
    };

    const handleFilter = () => {
        if (startDate && endDate) {
            filterData(startDate, endDate);
        }
    };

    const requestManualBookingToken = async () => {
        const response = await axios.post(
            `${API_BASE_URL}/api/admin/manual-booking-token`,
            ADMIN_MANUAL_BOOKING_AUTH
        );

        const token = response.data?.token;
        if (!response.data?.success || !token) {
            throw new Error(response.data?.message || 'Could not start manual booking.');
        }

        return token;
    };

    const navigateToManualBooking = (path, token, options = {}) => {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        const { tokenParam = 'manualBookingToken', includeLegacyParams = true } = options;
        const queryParams = new URLSearchParams();

        if (includeLegacyParams) {
            queryParams.set('manualBooking', '1');
            queryParams.set('source', 'admin');
        }

        queryParams.set(tokenParam, token);

        const bookingUrl = `${getBookingBaseUrl()}${normalizedPath}?${queryParams.toString()}`;

        if (typeof window !== 'undefined') {
            window.location.assign(bookingUrl);
        }
    };

    const handleManualBookingClick = async () => {
        if (isLaunchingManualBooking) return;

        try {
            setIsLaunchingManualBooking(true);
            const token = await requestManualBookingToken();
            navigateToManualBooking('/', token);
        } catch (error) {
            console.error('Error starting manual booking:', error);
            alert(error?.response?.data?.message || error.message || 'Could not start manual booking.');
        } finally {
            setIsLaunchingManualBooking(false);
        }
    };

    const handleHotelManualBookingClick = async () => {
        if (isLaunchingHotelManualBooking) return;

        try {
            setIsLaunchingHotelManualBooking(true);
            const token = await requestManualBookingToken();
            navigateToManualBooking('/hotel-manual-booking', token);
        } catch (error) {
            console.error('Error starting hotel manual booking:', error);
            alert(error?.response?.data?.message || error.message || 'Could not start hotel manual booking.');
        } finally {
            setIsLaunchingHotelManualBooking(false);
        }
    };

    const handleTheNewtManualBookingClick = async () => {
        if (isLaunchingTheNewtBooking) return;

        try {
            setIsLaunchingTheNewtBooking(true);
            const token = await requestManualBookingToken();
            navigateToManualBooking('/thenewt', token, {
                tokenParam: 't',
                includeLegacyParams: false
            });
        } catch (error) {
            console.error('Error starting The Newt manual booking:', error);
            alert(error?.response?.data?.message || error.message || 'Could not start The Newt balloon booking.');
        } finally {
            setIsLaunchingTheNewtBooking(false);
        }
    };

    const primaryButtonStyle = {
        background: "linear-gradient(135deg, #2d69c5 0%, #1f57ad 100%)",
        color: "#FFF",
        border: "none",
        cursor: "pointer",
        padding: isMobile ? '10px 14px' : '10px 18px',
        borderRadius: '10px',
        whiteSpace: 'nowrap',
        fontSize: isMobile ? '12px' : '12px',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        height: isMobile ? '40px' : '40px',
        boxShadow: '0 8px 20px rgba(31, 87, 173, 0.2)'
    };

    const quickFilterButtonStyle = {
        padding: isMobile ? '8px 12px' : '10px 14px',
        borderRadius: '10px',
        border: '1px solid #d4deec',
        background: '#e8eef8',
        color: '#35547f',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        fontSize: isMobile ? '12px' : '12px',
        fontWeight: 700,
        letterSpacing: '0.02em',
        textTransform: 'uppercase'
    };

    return (
        <div style={{ padding: isMobile ? "16px" : "24px", background: "#f4f7fc", borderRadius: "22px", border: "1px solid #e1e8f3" }} className="date-range-selector-container">
            {/* Date Inputs */}
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: isMobile ? '10px' : '14px',
                alignItems: 'flex-end'
            }} className="date-inputs-container">
                <label style={{
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: isMobile ? '2px' : '5px', 
                    flex: isMobile ? '1 1 calc(50% - 5px)' : '0 0 250px',
                    minWidth: isMobile ? '0' : '250px',
                    maxWidth: isMobile ? 'calc(50% - 5px)' : '250px',
                    fontSize: isMobile ? '11px' : '12px',
                    fontWeight: 600,
                    color: '#5e7393'
                }}>
                    Start Date:
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{
                            width: '100%', 
                            padding: isMobile ? '6px 8px' : '8px 10px',
                            borderRadius: '10px',
                            border: '1px solid #d8e3f2',
                            background: '#ffffff',
                            fontSize: isMobile ? '16px' : '12px', // Keep 16px for iOS zoom prevention
                            height: isMobile ? '36px' : '40px',
                            boxSizing: 'border-box'
                        }}
                    />
                </label>
                <label style={{
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: isMobile ? '2px' : '5px', 
                    flex: isMobile ? '1 1 calc(50% - 5px)' : '0 0 250px',
                    minWidth: isMobile ? '0' : '250px',
                    maxWidth: isMobile ? 'calc(50% - 5px)' : '250px',
                    fontSize: isMobile ? '11px' : '12px',
                    fontWeight: 600,
                    color: '#5e7393'
                }}>
                    End Date:
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{
                            width: '100%', 
                            padding: isMobile ? '6px 8px' : '8px 10px',
                            borderRadius: '10px',
                            border: '1px solid #d8e3f2',
                            background: '#ffffff',
                            fontSize: isMobile ? '16px' : '12px', // Keep 16px for iOS zoom prevention
                            height: isMobile ? '36px' : '40px',
                            boxSizing: 'border-box'
                        }}
                    />
                </label>
                <button 
                    onClick={handleFilter} 
                    style={{ 
                        ...primaryButtonStyle,
                        alignSelf: 'flex-end',
                        marginTop: 0,
                        marginLeft: isMobile ? 0 : '2px'
                    }}
                >
                    Filter
                </button>
            </div>

            {/* Quick Links */}
            <div style={{ marginTop: "20px" }} className="filter-range-btns">
                <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px',
                    marginTop: '10px'
                }}>
                    <button onClick={quickLinks.allTime} style={quickFilterButtonStyle}>All Time</button>
                    <button onClick={quickLinks.last12Months} style={quickFilterButtonStyle}>Last 12 Months</button>
                    <button onClick={quickLinks.quarter1} style={quickFilterButtonStyle}>Q1</button>
                    <button onClick={quickLinks.quarter2} style={quickFilterButtonStyle}>Q2</button>
                    <button onClick={quickLinks.quarter3} style={quickFilterButtonStyle}>Q3</button>
                    <button onClick={quickLinks.quarter4} style={quickFilterButtonStyle}>Q4</button>
                </div>
            </div>

            {/* Display Filtered Data */}
            <div style={{ marginTop: "20px" }}>
                <div className="home-filter-data-wrap">
                    <div style={{ display: 'flex', flexDirection: 'row', width: '100%', alignItems: 'center' }} className="totals-container">
                        <div className="home-filter-data-table" style={{ flex: 1 }}>
                            <h3 style={{ fontFamily: "Gilroy Light" }}>Totals:</h3>
                            {Object.keys(summary).length > 0 ? (
                                <div style={{ overflowX: 'auto', width: '100%' }} className="totals-table-wrapper">
                                    <table border="0" style={{ width: "100%", background: "#FFF", marginTop: "10px", borderCollapse: "separate", borderSpacing: 0, minWidth: '500px' }} className="totals-table">
                                        <thead style={{ background: "#2d69c5", color: "#FFF" }}>
                                            <tr>
                                                <th style={{ padding: "8px", fontSize: "14px", whiteSpace: "nowrap" }}>Pax Flown</th>
                                                <th style={{ padding: "8px", fontSize: "14px", whiteSpace: "nowrap" }}>Flights Completed</th>
                                                <th style={{ padding: "8px", fontSize: "14px", whiteSpace: "nowrap" }}>Sales</th>
                                                <th style={{ padding: "8px", fontSize: "14px", whiteSpace: "nowrap" }}>Total Liability</th>
                                                <th style={{ padding: "8px", fontSize: "14px", whiteSpace: "nowrap" }}>VAT</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td style={{ textAlign: "center", padding: "8px", fontSize: "14px" }}>{summary.totalPax}</td>
                                                <td style={{ textAlign: "center", padding: "8px", fontSize: "14px" }}>£{formatGbp(summary.completedFlights)}</td>
                                                <td style={{ textAlign: "center", padding: "8px", fontSize: "14px" }}>£{formatGbp(summary.totalSales)}</td>
                                                <td style={{ textAlign: "center", padding: "8px", fontSize: "14px" }}>£{formatGbp(summary.totalLiability)}</td>
                                                <td style={{ textAlign: "center", padding: "8px", fontSize: "14px" }}>£{formatGbp(summary.totalVAT)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p>No data found for the selected range.</p>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minWidth: 210, marginLeft: 32, marginTop: 38 }} className="manual-booking-button-container">
                            <button
                                type="button"
                                onClick={handleTheNewtManualBookingClick}
                                disabled={isLaunchingTheNewtBooking}
                                style={{
                                    display: 'inline-block',
                                    background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 10,
                                    padding: '10px 20px',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    letterSpacing: '0.04em',
                                    textTransform: 'uppercase',
                                    textAlign: 'center',
                                    textDecoration: 'none',
                                    cursor: isLaunchingTheNewtBooking ? 'wait' : 'pointer',
                                    boxShadow: '0 8px 20px rgba(15, 118, 110, 0.18)',
                                    width: '100%',
                                    maxWidth: 210,
                                    opacity: isLaunchingTheNewtBooking ? 0.75 : 1
                                }}
                            >
                                {isLaunchingTheNewtBooking ? 'Opening...' : 'Newt Balloon Booking'}
                            </button>
                            <button
                                type="button"
                                onClick={handleHotelManualBookingClick}
                                disabled={isLaunchingHotelManualBooking}
                                style={{
                                    display: 'inline-block',
                                    background: 'linear-gradient(135deg, #15746d 0%, #115e59 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 10,
                                    padding: '10px 20px',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    letterSpacing: '0.04em',
                                    textTransform: 'uppercase',
                                    textAlign: 'center',
                                    textDecoration: 'none',
                                    cursor: isLaunchingHotelManualBooking ? 'wait' : 'pointer',
                                    boxShadow: '0 8px 20px rgba(17, 94, 89, 0.18)',
                                    width: '100%',
                                    maxWidth: 210,
                                    opacity: isLaunchingHotelManualBooking ? 0.75 : 1
                                }}
                            >
                                {isLaunchingHotelManualBooking ? 'Opening...' : 'Hotel Booking'}
                            </button>
                            <button
                                type="button"
                                onClick={handleManualBookingClick}
                                disabled={isLaunchingManualBooking}
                                style={{
                                    display: 'inline-block',
                                    background: 'linear-gradient(135deg, #2d69c5 0%, #1f57ad 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 10,
                                    padding: '10px 20px',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    letterSpacing: '0.04em',
                                    textTransform: 'uppercase',
                                    textAlign: 'center',
                                    textDecoration: 'none',
                                    cursor: isLaunchingManualBooking ? 'wait' : 'pointer',
                                    boxShadow: '0 8px 20px rgba(31, 87, 173, 0.2)',
                                    width: '100%',
                                    maxWidth: 210,
                                    opacity: isLaunchingManualBooking ? 0.75 : 1
                                }}
                            >
                                {isLaunchingManualBooking ? 'Opening...' : 'Manual Booking'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DateRangeSelector;
