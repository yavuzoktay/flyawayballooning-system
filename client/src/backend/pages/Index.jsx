import { Container } from "@mui/material";
import React, { useEffect, useState } from "react";
import DateRangeSelector from "../components/Home/DateRangeSelector";
import axios from 'axios';
import AnalyticsDashboard from '../components/Home/AnalyticsDashboard';

const Index = () => {
    const [bookingData, setBookingData] = useState([]);
    const [dateRange, setDateRange] = useState({ start: null, end: null });

    function getAllBookingData() {
        axios
            .get(
                `/api/getfilteredBookings`
            )
            .then((response) => {
                var final_data = response.data.data;
                setBookingData(final_data);
            });
    }

    useEffect(() => {
        getAllBookingData();
    }, []);
    return (
        <div className="home-page-wrap">
            <Container maxWidth="xl">
                <div className="heading-wrap">
                    <h2>
                        FLY AWAY BALLOONING
                    </h2>
                    <hr />
                </div>
                <div className="home-body-wrap">
                    <DateRangeSelector bookingData={bookingData} onDateRangeChange={setDateRange} />
                    <AnalyticsDashboard dateRange={dateRange} />
                    <div style={{ marginTop: 24 }}>
                      <a href="http://localhost:3002/" target="_blank" rel="noopener noreferrer">
                        <button style={{ background: '#3274b4', color: '#fff', border: 'none', borderRadius: 6, padding: '12px 32px', fontWeight: 600, fontSize: 18, cursor: 'pointer' }}>
                          Manual Booking
                        </button>
                      </a>
                    </div>
                </div>
            </Container>
        </div>
    )
}

export default Index;