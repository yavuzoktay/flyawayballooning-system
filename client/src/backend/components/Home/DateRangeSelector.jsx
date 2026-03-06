import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const DateRangeSelector = ({ bookingData, voucherData, onDateRangeChange }) => {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [summary, setSummary] = useState({});
    const [isMobile, setIsMobile] = useState(false);

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

    // Set default dates for mobile on mount
    useEffect(() => {
        if (isMobile && !startDate && !endDate) {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            setStartDate(todayStr);
            setEndDate(todayStr);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMobile]);

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
            // Sum Paid from all bookings + all vouchers in the selected date range
            // Includes everything purchased, regardless of redeemed/flown status
            const bookingSales = data?.reduce((sum, item) => sum + parseMoney(item?.paid), 0) || 0;
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

    return (
        <div style={{ padding: "20px", background: "#f9f9f9", borderRadius: "20px" }} className="date-range-selector-container">
            {/* Date Inputs */}
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: isMobile ? '6px' : '20px',
                alignItems: 'center'
            }} className="date-inputs-container">
                <label style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: isMobile ? '2px' : '5px', 
                    flex: '0 0 auto', 
                    minWidth: isMobile ? '80px' : '90px',
                    maxWidth: isMobile ? 'none' : '90px',
                    fontSize: isMobile ? '10px' : '12px'
                }}>
                    Start Date:
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{ 
                            width: '100%', 
                            padding: isMobile ? '4px' : '5px', 
                            borderRadius: '4px', 
                            border: '1px solid #ccc',
                            fontSize: isMobile ? '16px' : '12px', // Keep 16px for iOS zoom prevention
                            height: isMobile ? '25px' : '25px'
                        }}
                    />
                </label>
                <label style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: isMobile ? '2px' : '5px', 
                    flex: '0 0 auto', 
                    minWidth: isMobile ? '80px' : '90px',
                    maxWidth: isMobile ? 'none' : '90px',
                    fontSize: isMobile ? '10px' : '12px'
                }}>
                    End Date:
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{ 
                            width: '100%', 
                            padding: isMobile ? '4px' : '5px', 
                            borderRadius: '4px', 
                            border: '1px solid #ccc',
                            fontSize: isMobile ? '16px' : '12px', // Keep 16px for iOS zoom prevention
                            height: isMobile ? '25px' : '25px'
                        }}
                    />
                </label>
                <button 
                    onClick={handleFilter} 
                    style={{ 
                        background: "#3274b4", 
                        color: "#FFF", 
                        border: "1px solid #3274b4", 
                        cursor: "pointer",
                        padding: isMobile ? '4px 10px' : '5px 16px',
                        borderRadius: '4px',
                        alignSelf: isMobile ? 'flex-end' : 'flex-start',
                        whiteSpace: 'nowrap',
                        fontSize: isMobile ? '11px' : 'inherit',
                        height: isMobile ? '35px' : '36px',
                        marginTop: isMobile ? 0 : '20px'
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
                    <button onClick={quickLinks.allTime} style={{ 
                        marginRight: "10px",
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        background: '#fff',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}>All Time</button>
                    <button onClick={quickLinks.last12Months} style={{ 
                        marginRight: "10px",
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        background: '#fff',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}>Last 12 Months</button>
                    <button onClick={quickLinks.quarter1} style={{ 
                        marginRight: "10px",
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        background: '#fff',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}>Q1</button>
                    <button onClick={quickLinks.quarter2} style={{ 
                        marginRight: "10px",
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        background: '#fff',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}>Q2</button>
                    <button onClick={quickLinks.quarter3} style={{ 
                        marginRight: "10px",
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        background: '#fff',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}>Q3</button>
                    <button onClick={quickLinks.quarter4} style={{ 
                        marginRight: "10px",
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        background: '#fff',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}>Q4</button>
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
                                    <table border="1" style={{ width: "100%", background: "#FFF", marginTop: "10px", borderCollapse: "collapse", minWidth: '500px' }} className="totals-table">
                                        <thead style={{ background: "#3274b4", color: "#FFF" }}>
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
                                                <td style={{ textAlign: "center", padding: "8px", fontSize: "14px" }}>£{summary.completedFlights}</td>
                                                <td style={{ textAlign: "center", padding: "8px", fontSize: "14px" }}>£{summary.totalSales.toFixed(2)}</td>
                                                <td style={{ textAlign: "center", padding: "8px", fontSize: "14px" }}>£{summary.totalLiability.toFixed(2)}</td>
                                                <td style={{ textAlign: "center", padding: "8px", fontSize: "14px" }}>£{summary.totalVAT.toFixed(2)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p>No data found for the selected range.</p>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 180, marginLeft: 32, marginTop: 38 }} className="manual-booking-button-container">
                            <a
                                href="https://flyawayballooning-book.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-block',
                                    background: '#3274b4',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    padding: '10px 24px',
                                    fontSize: 18,
                                    fontWeight: 600,
                                    textAlign: 'center',
                                    textDecoration: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                                    width: '100%',
                                    maxWidth: 200
                                }}
                            >
                                Manual Booking
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DateRangeSelector;
