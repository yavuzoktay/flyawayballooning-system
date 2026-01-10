import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const DateRangeSelector = ({ bookingData, voucherData, onDateRangeChange }) => {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [summary, setSummary] = useState({});
    const [isMobile, setIsMobile] = useState(false);

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
        const startDateObj = new Date(start);
        const endDateObj = new Date(end);

        // Filter the data based on the date range
        const filtered = bookingData.filter((item) => {
            // Güvenli şekilde tarih alanı seç
            let dateStr = item.created || item.created_at || null;
            if (!dateStr) return false;
            // Tarih formatı: dd-mm-yyyy veya yyyy-mm-dd olabilir, otomatik algıla
            let createdDate;
            if (dateStr.includes("-")) {
                const parts = dateStr.split("-");
                if (parts[0].length === 4) {
                    // yyyy-mm-dd
                    createdDate = new Date(dateStr);
                } else {
                    // dd-mm-yyyy
                    createdDate = new Date(parts.reverse().join("-"));
                }
            } else {
                createdDate = new Date(dateStr);
            }
            if (isNaN(createdDate.getTime())) return false;
            return createdDate >= startDateObj && createdDate <= endDateObj;
        });

        calculateSummary(filtered, voucherData);
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
            setStartDate("2025-01-01");
            setEndDate("2025-03-31");
            filterData("2025-01-01", "2025-03-31");
        },
        quarter2: () => {
            setStartDate("2025-04-01");
            setEndDate("2025-06-30");
            filterData("2025-04-01", "2025-06-30");
        },
        quarter3: () => {
            setStartDate("2025-07-01");
            setEndDate("2025-09-30");
            filterData("2025-07-01", "2025-09-30");
        },
        quarter4: () => {
            setStartDate("2025-10-01");
            setEndDate("2025-12-31");
            filterData("2025-10-01", "2025-12-31");
        },
    };

    // Add All Values Result
    const calculateSummary = (data, vouchers = []) => {
        const safeValue = (value) => isNaN(value) ? 0 : value;
        if(data){
            // Filter flown flights: only count flights where status is exactly "Flown"
            const flownFlights = data?.filter(item => {
                if (!item || typeof item !== 'object') return false;
                
                // Status must be exactly "Flown" (case-insensitive check)
                const status = (item.status || '').trim();
                if (status.toLowerCase() !== 'flown') return false;
                
                // Must have pax count to calculate total passengers
                // (flight_date check removed as status "Flown" is sufficient)
                
                return true;
            });
            
            // Filter completed flights: only count flights where status is exactly "Flown" for Flights Completed column
            const completedFlightsData = data?.filter(item => {
                if (!item || typeof item !== 'object') return false;
                
                // Status must be exactly "Flown" (case-insensitive check)
                const status = (item.status || '').trim();
                return status.toLowerCase() === 'flown';
            });
            
            // Filter non-flown bookings: all bookings where status is NOT "Flown" for Total Liability calculation
            const nonFlownBookings = data?.filter(item => {
                if (!item || typeof item !== 'object') return false;
                
                // Status must NOT be "Flown" (case-insensitive check)
                const status = (item.status || '').trim();
                return status.toLowerCase() !== 'flown';
            });
            
            // Calculate Sales: All Booking paid values + All Vouchers with "Redeemed: No" paid values
            // 1. All Booking tablosundaki tüm paid değerleri
            const bookingSales = data?.reduce((sum, item) => sum + safeValue(parseFloat((item.paid || "0").replace("£", ""))), 0) || 0;
            
            // 2. All Vouchers tablosunda "Redeemed: No" olan tüm paid değerleri
            const nonRedeemedVouchers = vouchers?.filter(voucher => {
                if (!voucher || typeof voucher !== 'object') return false;
                const redeemed = (voucher.redeemed || '').trim();
                return redeemed.toLowerCase() !== 'yes';
            }) || [];
            
            const voucherSales = nonRedeemedVouchers.reduce((sum, item) => {
                const paidValue = safeValue(parseFloat((item.paid || "0").replace("£", "")));
                return sum + paidValue;
            }, 0);
            
            // Total Sales = Booking Sales + Voucher Sales
            const totalSales = bookingSales + voucherSales;
            
            const summary = {
                totalFlights: flownFlights?.length || 0,
                totalPax: flownFlights?.reduce((sum, item) => sum + safeValue(parseInt(item.pax, 10)), 0) || 0,
                completedFlights: completedFlightsData?.reduce((sum, item) => sum + safeValue(parseInt((item.paid || "0").replace("£", ""), 10)), 0) || 0,
                totalSales: totalSales,
                totalLiability: nonFlownBookings?.reduce((sum, item) => sum + safeValue(parseFloat((item.paid || "0").replace("£", ""))), 0) || 0,
                totalVAT: totalSales * 0.2, // VAT is 20% of total sales
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
