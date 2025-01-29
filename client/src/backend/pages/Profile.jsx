import { Container, Grid } from "@mui/material";
import React, { useEffect, useState } from "react";
import PersonalDetail from "../components/ProfilePage/PersonalDetail";
import useBooking from "../api/useBooking";
import usePessanger from "../api/usePessanger";
import { useParams } from "react-router-dom";
import AdditionInfo from "../components/ProfilePage/AdditionInfo";
import CurrentBooking from "../components/ProfilePage/CurrentBooking";
import useActivity from "../api/useActivity";
import useVoucher from "../api/useVoucher";
import PassengerDetail from "../components/ProfilePage/PassengerDetail";
import Notes from "../components/ProfilePage/Notes";
import History from "../components/ProfilePage/History";

const Profile = () => {
    const { booking, loading: bookingLoading } = useBooking();
    const { passenger, loading: passengerLoading } = usePessanger();
    const { activity, loading: activityLoading } = useActivity();
    const { voucher, loading: voucherLoading } = useVoucher();
    const [detail, setDetail] = useState([]);
    const [bookingNote, setBookingNote] = useState(null);
    const { booking_id, email } = useParams();
    

    // Combine booking and passenger details by booking_id
    useEffect(() => {
        if (!bookingLoading && !passengerLoading && !activityLoading && !voucherLoading) {
            // Find the booking with the matching booking_id
            const filteredBooking = booking.find((b) => b.booking_id == booking_id);
            
            if (filteredBooking) {
                // Filter passengers belonging to the specific booking_id
                const filteredPassengers = passenger.filter(
                    (p) => p.booking_id == booking_id
                );

                // Filter Activity 
                const filteredActivity = activity.filter((a) => a.activity_sku == filteredBooking.acitivity_id);

                // Filter Voucher 
                const filteredVoucher = voucher.filter((v) => v.voucher_ref == filteredBooking.voucher_code);

                // Combine data
                const combinedDetails = {
                    ...filteredBooking,
                    passengers: filteredPassengers,
                    activity: filteredActivity,
                    voucher: filteredVoucher,
                };
    
                // Update state with the combined details
                setDetail(combinedDetails);
            }
        }
        // Ensure the dependency array size and order remain constant
    }, [booking, passenger, bookingLoading, passengerLoading, booking_id, activityLoading, activity]);
    



    console.log('detail', detail);

    return (
        <div>
            <Container maxWidth="xl">
                <div className="heading-wrap">
                    <h2>PROFILE PAGE</h2>
                    <hr />
                </div>
                <div className="final-profile-wrap" style={{marginTop: "30px"}}>
                    <Grid container spacing={2}>
                        <Grid item xs={4}>
                            <PersonalDetail detail={detail} email={email} />
                            <AdditionInfo detail={detail} bookingNote={bookingNote} setBookingNote={setBookingNote} />
                        </Grid>
                        <Grid item xs={8}>
                            <CurrentBooking detail={detail} />
                            <PassengerDetail detail={detail} />
                            <Notes detail={detail} />
                            <History detail={detail} email={email} />
                        </Grid>
                    </Grid>
                </div>
            </Container>
        </div>
    )
}

export default Profile;