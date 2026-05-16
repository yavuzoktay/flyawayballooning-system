import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../../config";
import { ADMIN_MANUAL_BOOKING_AUTH } from "../../auth/adminCredentials";
import { isAdminDateExpired, parseAdminDate } from "../../utils/adminDateUtils";

const ANALYTICS_LIVE_DATA_START_DATE =
    process.env.REACT_APP_ANALYTICS_LIVE_DATA_START_DATE || "2026-01-01";
const VAT_RATE = 0.2;

const DateRangeSelector = ({ bookingData, voucherData, onDateRangeChange, onSummaryChange }) => {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [activeQuickFilter, setActiveQuickFilter] = useState("allTime");
    const [isMobile, setIsMobile] = useState(false);
    const [isLaunchingManualBooking, setIsLaunchingManualBooking] = useState(false);
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
        const parsedDate = parseAdminDate(raw);
        return parsedDate ? parsedDate.toDate() : null;
    };

    const isLiveAnalyticsRecord = (item) => {
        const liveStartDate = parseLooseDate(ANALYTICS_LIVE_DATA_START_DATE);
        if (!liveStartDate) return true;

        const createdDate = parseLooseDate(item?.created || item?.created_at || null);
        return createdDate ? createdDate >= liveStartDate : false;
    };

    const getLiveAnalyticsRecords = (items = []) =>
        (items || []).filter((item) => isLiveAnalyticsRecord(item));

    const isRedeemedLikeYes = (raw) => {
        const v = raw === null || raw === undefined ? '' : String(raw).trim().toLowerCase();
        return v === 'yes' || v === 'redeemed' || v === 'true' || v === '1';
    };

    const isRedeemedVoucherBooking = (item) =>
        isRedeemedLikeYes(item?.redeemed_voucher) ||
        isRedeemedLikeYes(item?.voucher_redeemed) ||
        isRedeemedLikeYes(item?.is_voucher_redeemed);

    const getCreatedDate = (item) => parseLooseDate(item?.created || item?.created_at || null);

    const getVatPortion = (grossAmount) => grossAmount * VAT_RATE / (1 + VAT_RATE);

    const calculateVatByQuarter = (bookings = [], vouchers = []) => {
        const quarters = {};

        const addPaymentToQuarter = (item) => {
            const paid = parseMoney(item?.paid);
            if (paid <= 0) return;

            const createdDate = getCreatedDate(item);
            if (!createdDate) return;

            const year = createdDate.getFullYear();
            const quarter = Math.floor(createdDate.getMonth() / 3) + 1;
            const key = `${year}-Q${quarter}`;

            if (!quarters[key]) {
                quarters[key] = {
                    key,
                    label: `Q${quarter} ${year}`,
                    year,
                    quarter,
                    gross: 0,
                    vat: 0,
                    count: 0
                };
            }

            quarters[key].gross += paid;
            quarters[key].vat += getVatPortion(paid);
            quarters[key].count += 1;
        };

        (bookings || []).forEach((item) => {
            if (isRedeemedVoucherBooking(item)) return;
            addPaymentToQuarter(item);
        });

        (vouchers || []).forEach(addPaymentToQuarter);

        return Object.values(quarters).sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.quarter - b.quarter;
        });
    };

    const isExpired = (rawDate) => isAdminDateExpired(rawDate);

    const formatDateInputValue = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const computeTotalLiability = (bookings = [], vouchers = []) => {
        const bookingsLiability = (bookings || []).reduce((sum, b) => {
            if (!b || typeof b !== 'object') return sum;
            const status = String(b.status || '').trim().toLowerCase();
            if (status === 'flown') return sum;
            if (status === 'expired') return sum;
            if (b.expires && isExpired(b.expires)) return sum;
            return sum + parseMoney(b.paid);
        }, 0);

        const vouchersLiability = (vouchers || []).reduce((sum, v) => {
            if (!v || typeof v !== 'object') return sum;
            if (isRedeemedLikeYes(v.redeemed)) return sum;
            const status = String(v.status || '').trim().toLowerCase();
            if (status === 'used' || status === 'flown' || status === 'expired') return sum;
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
        const liveBookings = getLiveAnalyticsRecords(bookingData);
        const liveVouchers = getLiveAnalyticsRecords(voucherData);

        if (startDate && endDate) {
            const startDateObj = parseLooseDate(startDate);
            const endDateObj = parseLooseDate(endDate);

            if (startDateObj && endDateObj) {
                endDateObj.setHours(23, 59, 59, 999);

                const filteredBookings = liveBookings.filter((item) => {
                    const createdDate = parseLooseDate(item?.created || item?.created_at || null);
                    return createdDate ? createdDate >= startDateObj && createdDate <= endDateObj : false;
                });

                const filteredVouchers = liveVouchers.filter((item) => {
                    const createdDate = parseLooseDate(item?.created || item?.created_at || null);
                    return createdDate ? createdDate >= startDateObj && createdDate <= endDateObj : false;
                });

                calculateSummary(filteredBookings, filteredVouchers, { start: startDate, end: endDate });
                return;
            }
        }

        calculateSummary(liveBookings, liveVouchers, { start: null, end: null });
    }, [bookingData, voucherData, startDate, endDate]);

    const filterData = (start, end, quickFilterKey = "custom") => {
        if (onDateRangeChange) {
            onDateRangeChange({ start, end });
        }
        setActiveQuickFilter(quickFilterKey);
        setStartDate(start);
        setEndDate(end);
        const startDateObj = parseLooseDate(start);
        const endDateObj = parseLooseDate(end);
        const liveBookings = getLiveAnalyticsRecords(bookingData);
        const liveVouchers = getLiveAnalyticsRecords(voucherData);
        if (!startDateObj || !endDateObj) {
            calculateSummary(liveBookings, liveVouchers, { start: null, end: null });
            return;
        }

        // Make end date inclusive for the whole day
        endDateObj.setHours(23, 59, 59, 999);

        // Filter the data based on the date range
        const filtered = liveBookings.filter((item) => {
            const dateStr = item?.created || item?.created_at || null;
            const createdDate = parseLooseDate(dateStr);
            if (!createdDate) return false;
            return createdDate >= startDateObj && createdDate <= endDateObj;
        });

        const filteredVouchers = liveVouchers.filter((item) => {
            const dateStr = item?.created || item?.created_at || null;
            const createdDate = parseLooseDate(dateStr);
            if (!createdDate) return false;
            return createdDate >= startDateObj && createdDate <= endDateObj;
        });

        calculateSummary(filtered, filteredVouchers, { start, end });
    };

    // Updated Quick Links
    const quickLinks = {
        allTime: () => {
            setStartDate("");
            setEndDate("");
            setActiveQuickFilter("allTime");
            if (onDateRangeChange) {
                onDateRangeChange({ start: null, end: null });
            }
            calculateSummary(getLiveAnalyticsRecords(bookingData), getLiveAnalyticsRecords(voucherData), { start: null, end: null });
        },
        today: () => {
            const today = new Date();
            const formattedToday = formatDateInputValue(today);
            filterData(formattedToday, formattedToday, "today");
        },
        last12Months: () => {
            const today = new Date();
            const lastYear = new Date(today);
            lastYear.setFullYear(today.getFullYear() - 1);
            const start = formatDateInputValue(lastYear);
            const end = formatDateInputValue(today);
            filterData(start, end, "last12Months");
        },
        monthToDate: () => {
            const today = new Date();
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const start = formatDateInputValue(monthStart);
            const end = formatDateInputValue(today);
            filterData(start, end, "monthToDate");
        },
        yearToDate: () => {
            const today = new Date();
            const yearStart = new Date(today.getFullYear(), 0, 1);
            const start = formatDateInputValue(yearStart);
            const end = formatDateInputValue(today);
            filterData(start, end, "yearToDate");
        },
        quarter1: () => {
            const year = new Date().getFullYear();
            const start = `${year}-01-01`;
            const end = `${year}-03-31`;
            filterData(start, end, "quarter1");
        },
        quarter2: () => {
            const year = new Date().getFullYear();
            const start = `${year}-04-01`;
            const end = `${year}-06-30`;
            filterData(start, end, "quarter2");
        },
        quarter3: () => {
            const year = new Date().getFullYear();
            const start = `${year}-07-01`;
            const end = `${year}-09-30`;
            filterData(start, end, "quarter3");
        },
        quarter4: () => {
            const year = new Date().getFullYear();
            const start = `${year}-10-01`;
            const end = `${year}-12-31`;
            filterData(start, end, "quarter4");
        },
    };

    const getFlightDateRange = (rangeStart = startDate, rangeEnd = endDate) => {
        const start = parseLooseDate(rangeStart);
        const end = parseLooseDate(rangeEnd);
        if (!start || !end) return null;
        const endInclusive = new Date(end);
        endInclusive.setHours(23, 59, 59, 999);
        return { start, end: endInclusive };
    };

    // Add All Values Result
    const calculateSummary = (data, vouchers = [], range = { start: startDate, end: endDate }) => {
        const safeValue = (value) => isNaN(value) ? 0 : value;
        if(data){
            const flightRange = getFlightDateRange(range?.start, range?.end);
            const liveBookings = getLiveAnalyticsRecords(bookingData);
            const liveVouchers = getLiveAnalyticsRecords(voucherData);

            const bookingsForFlights = (liveBookings && liveBookings.length > 0)
                ? liveBookings
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
                if (isRedeemedVoucherBooking(item)) return sum;
                return sum + parseMoney(item?.paid);
            }, 0) || 0;
            const voucherSales = (vouchers || []).reduce((sum, item) => {
                return sum + parseMoney(item?.paid);
            }, 0);
            const totalSales = bookingSales + voucherSales;
            // Liability must always reflect the current live balance, not the selected sales date range.
            const totalLiability = computeTotalLiability(liveBookings || [], liveVouchers || []);

            // VAT is split by payment quarter from gross sales values, where paid includes VAT.
            const vatByQuarter = calculateVatByQuarter(data || [], vouchers || []);
            const totalVAT = vatByQuarter.reduce((sum, item) => sum + item.vat, 0);
            
            const summary = {
                totalFlights: flownFlights?.length || 0,
                totalPax: flownFlights?.reduce((sum, item) => sum + safeValue(parseInt(item.pax, 10)), 0) || 0,
                completedFlights: completedFlightsGross,
                totalSales: totalSales,
                totalLiability: totalLiability,
                totalVAT: totalVAT,
                vatByQuarter,
            };
            if (onSummaryChange) onSummaryChange(summary);
        }
    };

    const handleFilter = () => {
        if (startDate && endDate) {
            filterData(startDate, endDate, "custom");
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
    const getQuickFilterButtonStyle = (key) => ({
        ...quickFilterButtonStyle,
        border: activeQuickFilter === key ? '2px solid #d78d38' : quickFilterButtonStyle.border,
        background: activeQuickFilter === key ? '#f8fbff' : quickFilterButtonStyle.background,
        color: activeQuickFilter === key ? '#1c3458' : quickFilterButtonStyle.color,
        padding: activeQuickFilter === key
            ? (isMobile ? '7px 11px' : '9px 13px')
            : quickFilterButtonStyle.padding
    });
    const renderQuickFilterButton = (key, label, onClick) => (
        <button
            type="button"
            onClick={onClick}
            style={getQuickFilterButtonStyle(key)}
            aria-pressed={activeQuickFilter === key}
        >
            {label}
        </button>
    );

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
                        onChange={(e) => {
                            setStartDate(e.target.value);
                            setActiveQuickFilter("custom");
                        }}
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
                        onChange={(e) => {
                            setEndDate(e.target.value);
                            setActiveQuickFilter("custom");
                        }}
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
                    {renderQuickFilterButton("today", "Today", quickLinks.today)}
                    {renderQuickFilterButton("monthToDate", "MTD", quickLinks.monthToDate)}
                    {renderQuickFilterButton("yearToDate", "YTD", quickLinks.yearToDate)}
                    {renderQuickFilterButton("allTime", "All Time", quickLinks.allTime)}
                    {renderQuickFilterButton("last12Months", "Last 12 Months", quickLinks.last12Months)}
                    {renderQuickFilterButton("quarter1", "Q1", quickLinks.quarter1)}
                    {renderQuickFilterButton("quarter2", "Q2", quickLinks.quarter2)}
                    {renderQuickFilterButton("quarter3", "Q3", quickLinks.quarter3)}
                    {renderQuickFilterButton("quarter4", "Q4", quickLinks.quarter4)}
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: isMobile ? 'stretch' : 'flex-end',
                    marginTop: "20px"
                }}
                className="manual-booking-button-container"
            >
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
                        width: isMobile ? '100%' : 210,
                        maxWidth: isMobile ? '100%' : 210,
                        opacity: isLaunchingManualBooking ? 0.75 : 1
                    }}
                >
                    {isLaunchingManualBooking ? 'Opening...' : 'Manual Booking'}
                </button>
            </div>
        </div>
    );
};

export default DateRangeSelector;
