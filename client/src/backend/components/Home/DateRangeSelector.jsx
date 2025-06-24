import { Link } from "@mui/material";
import React, { useEffect, useState } from "react";

const DateRangeSelector = ({ bookingData }) => {
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
        const startDateObj = new Date(start);
        const endDateObj = new Date(end);

        // Filter the data based on the date range
        const filtered = bookingData.filter((item) => {
            const createdDate = new Date(item.created.split("-").reverse().join("-"));

            // Check if the created date is within the specified range
            return createdDate >= startDateObj && createdDate <= endDateObj;
        });

        calculateSummary(filtered);
    };

    // Updated Quick Links
    const quickLinks = {
        allTime: () => {
            setStartDate("");
            setEndDate("");
            calculateSummary(bookingData);
        },
        last12Months: () => {
            const today = new Date();
            const lastYear = new Date(today.setFullYear(today.getFullYear() - 1));
            filterData(lastYear.toISOString().split("T")[0], new Date().toISOString().split("T")[0]);
        },
        quarter1: () => filterData("2025-01-01", "2025-03-31"), // Updated to 'yyyy-mm-dd'
        quarter2: () => filterData("2025-04-01", "2025-06-30"), // Updated to 'yyyy-mm-dd'
        quarter3: () => filterData("2025-07-01", "2025-09-30"), // Updated to 'yyyy-mm-dd'
        quarter4: () => filterData("2025-10-01", "2025-12-31"), // Updated to 'yyyy-mm-dd'
    };

    // Add All Values Result
    const calculateSummary = (data) => {
        const safeValue = (value) => isNaN(value) ? 0 : value;
        if(data){
            const summary = {
                totalFlights: data?.length,
                totalPax: data?.reduce((sum, item) => sum + safeValue(parseInt(item.pax, 10)), 0),
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
                    <div className="home-filter-data-table">
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
                    <div className="filter-data-right-card">
                        <Link className="final-btn" to="#">Book Flight</Link>
                        <Link className="final-btn" to="#">Sell Voucher</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DateRangeSelector;
