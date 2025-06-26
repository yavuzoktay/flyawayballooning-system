import React from "react";
import { Link } from "react-router-dom";

const CurrentBooking = ({ detail }) => {

    return (
        <div className="personal-detail-card current-booking">
            <h2>Current Booking</h2>
            <div className="current-booking-wrap">
                <div className="current-booking-left">
                    <div className="current-booking-field">
                        <p><b>Activity Name:</b> {detail?.activity?.[0]?.activity_name}</p>
                    </div>
                    <div className="current-booking-field">
                        <p><b>Activity Type:</b> {detail?.activity?.[0]?.flight_type}</p>
                    </div>
                    <div className="current-booking-field">
                        <p><b>Location:</b> {detail?.activity?.[0]?.location}</p>
                    </div>
                    <div className="current-booking-field">
                        <p><b>Booked For:</b> {detail?.flight_date} - {detail?.time_slot}</p>
                    </div>
                    <div className="current-booking-field">
                        <p><b>Redeemed Voucher:</b> {detail?.voucher?.[0]?.redeemed} - {detail?.voucher?.[0]?.voucher_ref}</p>
                    </div>
                </div>
                <div className="current-booking-right">
                    <Link className="final-btn" to="#">Rebook</Link>
                    {/* <Link className="final-btn" to="#">Add Guest</Link> */}
                    <Link className="final-btn" to="#">Cancel Flight</Link>
                </div>
            </div>
        </div>
    )
}

export default CurrentBooking;