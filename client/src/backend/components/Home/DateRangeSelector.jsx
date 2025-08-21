import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const DateRangeSelector = ({ bookingData, onDateRangeChange }) => {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [summary, setSummary] = useState({});

    useEffect(() => {
        // Calculate summary for all data on page load
        calculateSummary(bookingData);
    }, [bookingData]);

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

        calculateSummary(filtered);
    };

    // Updated Quick Links
    const quickLinks = {
        allTime: () => {
            setStartDate("");
            setEndDate("");
            if (onDateRangeChange) {
                onDateRangeChange({ start: null, end: null });
            }
            calculateSummary(bookingData);
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
    const calculateSummary = (data) => {
        const safeValue = (value) => isNaN(value) ? 0 : value;
        if(data){
            // Filter flown flights: only count flights that are not cancelled, have flight_date, and flight_date is in the past
            const flownFlights = data?.filter(item => {
                // Must not be cancelled
                if (item.status === 'Cancelled') return false;
                
                // Must have flight_date
                if (!item.flight_date) return false;
                
                // Flight date must be in the past (flown)
                const flightDate = new Date(item.flight_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Reset time to start of day
                
                return flightDate < today;
            });
            
            const summary = {
                totalFlights: flownFlights?.length || 0,
                totalPax: flownFlights?.reduce((sum, item) => sum + safeValue(parseInt(item.pax, 10)), 0) || 0,
                completedFlights: data?.reduce((sum, item) => sum + safeValue(parseInt((item.paid || "0").replace("£", ""), 10)), 0),
                totalSales: data?.reduce((sum, item) => sum + safeValue(parseFloat((item.paid || "0").replace("£", ""))), 0),
                totalLiability: data?.reduce((sum, item) => sum + safeValue(parseFloat((item.due || "0").replace("£", ""))), 0),
                totalVAT: data?.reduce((sum, item) => sum + safeValue(parseFloat((item.paid || "0").replace("£", "")) * 0.2), 0),
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
        <div style={{ padding: "20px", background: "#f9f9f9", borderRadius: "20px" }}>
            <h2 style={{ fontFamily: "Gilroy Semi Bold" }}>Date Range Selector 2</h2>

            {/* Date Inputs */}
            <div>
                <label>
                    Start Date:
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </label>
                <label style={{ marginLeft: "10px" }}>
                    End Date:
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </label>
                <button onClick={handleFilter} style={{ marginLeft: "10px", background: "#3274b4", color: "#FFF", border: "1px solid #3274b4", cursor: "pointer" }}>
                    Filter
                </button>
            </div>

            {/* Quick Links */}
            <div style={{ marginTop: "20px" }} className="filter-range-btns">
                <h3 style={{ fontFamily: "Gilroy Light" }}>Quick Links</h3>
                <button onClick={quickLinks.allTime} style={{ marginRight: "10px" }}>All Time</button>
                <button onClick={quickLinks.last12Months} style={{ marginRight: "10px" }}>Last 12 Months</button>
                <button onClick={quickLinks.quarter1} style={{ marginRight: "10px" }}>Q1</button>
                <button onClick={quickLinks.quarter2} style={{ marginRight: "10px" }}>Q2</button>
                <button onClick={quickLinks.quarter3} style={{ marginRight: "10px" }}>Q3</button>
                <button onClick={quickLinks.quarter4} style={{ marginRight: "10px" }}>Q4</button>
            </div>

            {/* Display Filtered Data */}
            <div style={{ marginTop: "20px" }}>
                <div className="home-filter-data-wrap">
                    <div style={{ display: 'flex', flexDirection: 'row', width: '100%', alignItems: 'center' }}>
                        <div className="home-filter-data-table" style={{ flex: 1 }}>
                            <h3 style={{ fontFamily: "Gilroy Light" }}>Totals:</h3>
                            {Object.keys(summary).length > 0 ? (
                                <table border="1" style={{ width: "100%", background: "#FFF", marginTop: "10px", borderCollapse: "collapse" }}>
                                    <thead style={{ background: "#3274b4", color: "#FFF" }}>
                                        <tr>
                                            <th>Flown Flights</th>
                                            <th>Pax Flown</th>
                                            <th>Flights Completed</th>
                                            <th>Sales</th>
                                            <th>Total Liability</th>
                                            <th>VAT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ textAlign: "center", padding: "8px" }}>{summary.totalFlights}</td>
                                            <td style={{ textAlign: "center", padding: "8px" }}>{summary.totalPax}</td>
                                            <td style={{ textAlign: "center", padding: "8px" }}>£{summary.completedFlights}</td>
                                            <td style={{ textAlign: "center", padding: "8px" }}>£{summary.totalSales.toFixed(2)}</td>
                                            <td style={{ textAlign: "center", padding: "8px" }}>£{summary.totalLiability.toFixed(2)}</td>
                                            <td style={{ textAlign: "center", padding: "8px" }}>£{summary.totalVAT.toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            ) : (
                                <p>No data found for the selected range.</p>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 180, marginLeft: 32, marginTop: 38 }}>
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
