import { TextareaAutosize } from "@mui/material";
import React from "react";
import { bookingHasWeatherRefund } from "../../utils/weatherRefund";

const AdditionInfo = ({ detail, bookingNote, setBookingNote }) => {
    const parseManualBookingProfile = () => {
        const possibleSources = [
            detail?.additional_information?.additional_information_json,
            detail?.additional_information_json,
            detail?.voucher?.additional_information_json
        ];

        for (const source of possibleSources) {
            if (!source) continue;

            let parsedSource = source;

            if (typeof parsedSource === "string") {
                try {
                    parsedSource = JSON.parse(parsedSource);
                } catch (error) {
                    parsedSource = null;
                }
            }

            const profile = parsedSource?.manual_booking_profile;
            if (!profile) continue;

            if (typeof profile === "string") {
                try {
                    return JSON.parse(profile);
                } catch (error) {
                    return null;
                }
            }

            return profile;
        }

        return null;
    };

    const manualBookingProfile = parseManualBookingProfile();
    const manualBookingFields = [
        { label: "Hotel / Accommodation Name", value: manualBookingProfile?.accommodation_name },
        { label: "Email Address", value: manualBookingProfile?.contact_email },
        { label: "Staff Name", value: manualBookingProfile?.staff_name }
    ].filter((field) => field.value);

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
