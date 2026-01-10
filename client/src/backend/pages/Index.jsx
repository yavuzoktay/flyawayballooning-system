import { Container } from "@mui/material";
import React, { useEffect, useState } from "react";
import DateRangeSelector from "../components/Home/DateRangeSelector";
import axios from 'axios';
import AnalyticsDashboard from '../components/Home/AnalyticsDashboard';

const Index = () => {
    const [bookingData, setBookingData] = useState([]);
    const [voucherData, setVoucherData] = useState([]);
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

    function getAllVoucherData() {
        axios
            .get(
                `/api/getAllVoucherData`
            )
            .then((response) => {
                var final_data = response.data.data || [];
                setVoucherData(final_data);
            })
            .catch((error) => {
                console.error("Error fetching voucher data:", error);
                setVoucherData([]);
            });
    }

    useEffect(() => {
        getAllBookingData();
        getAllVoucherData();
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
                    <DateRangeSelector bookingData={bookingData} voucherData={voucherData} onDateRangeChange={setDateRange} />
                    <AnalyticsDashboard dateRange={dateRange} />
                </div>
            </Container>
        </div>
    )
}

export default Index;