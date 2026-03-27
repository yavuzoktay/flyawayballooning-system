import { TextareaAutosize } from "@mui/material";
import React from "react";
import {
    getManualBookingFieldRows,
    getManualBookingProfileFromSources
} from "../../utils/additionalInfo";
import { bookingHasWeatherRefund } from "../../utils/weatherRefund";

const AdditionInfo = ({ detail, bookingNote, setBookingNote }) => {
    const manualBookingProfile = getManualBookingProfileFromSources(
        detail?.additional_information?.additional_information_json,
        detail?.additional_information_json,
        detail?.voucher?.additional_information_json
    );
    const manualBookingFields = getManualBookingFieldRows(manualBookingProfile);

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
                    <p><b>WX Refundable:</b> {bookingHasWeatherRefund(detail) ? 'Yes' : 'No'}</p>
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
            {manualBookingFields.length > 0 && (
                <div className="additional-bt-wrap">
                    <h2>Manual Booking Details</h2>
                    {manualBookingFields.map((field) => (
                        <div className="additional-fields" key={field.label}>
                            <p><b>{field.label}:</b> {field.value}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default AdditionInfo;
