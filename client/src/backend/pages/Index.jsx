import { Container } from "@mui/material";
import React, { useEffect, useState } from "react";
import DateRangeSelector from "../components/Home/DateRangeSelector";
import axios from 'axios';

const Index = () => {
    const [bookingData, setBookingData] = useState([]);

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
                    <DateRangeSelector bookingData={bookingData} />
                </div>
            </Container>
        </div>
    )
}

export default Index;