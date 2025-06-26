import { TextareaAutosize } from "@mui/material";
import React, { useState } from "react";

const AdditionInfo = ({ detail, bookingNote, setBookingNote }) => {


    // Handle Booking Note Change
    function handleBookingChange(e) {
        setBookingNote(e);
    }

    return (
        <div className="personal-detail-card addition-wrap" style={{ marginTop: "20px" }}>
            <h2>Additional</h2>
            <div className="additional-fields">
                <TextareaAutosize
                    minRows={3}
                    aria-label="maximum height"
                    defaultValue={detail.booking_note}
                    onChange={(e) => handleBookingChange(e.target.value)}
                />
            </div>
            <div className="additional-bt-wrap">
                <h2>Add On's</h2>
                <div className="additional-fields">
                    <p><b>Fab Cap:</b> {detail.pax}</p>
                </div>
                <div className="additional-fields">
                    <p><b>WX Refundable:</b> {detail?.passengers?.[0]?.weather_insurance}</p>
                </div>
                {/* <div className="addition-add-on-btn">
                    <Button>+ Add On</Button>
                </div> */}
                <div className="additional-fields">
                    <p><b>Marketing:</b> Facebook</p>
                </div>
                <div className="additional-fields">
                    <p><b>Reason for Ballooning:</b> N/A</p>
                </div>
            </div>
        </div>
    )
}

export default AdditionInfo;