import { Alert, Modal, Snackbar, TextField } from "@mui/material";
import React, { useState } from "react";
import TimeSlotSelect from "./TimeSlotSelect";
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import axios from "axios";


const SpecificDataModal = ({ modal, handleClose, activityId, disabledDates, fetchSlots, showSnackbar }) => {
    const [specificTimeSlot, setSpecificTimeSlot] = useState('');
    const [specificSeats, setSpecificSeats] = useState('');
    const [selectedDate, setSelectedDate] = useState(null);

    // Function to determine if a date should be disabled
    const isDateDisabled = (date) => {
        const formattedDate = dayjs(date).format("DD-MM-YYYY");
        return disabledDates.includes(formattedDate); // Match against saved dates
    };

    // Handle Save Slot
    async function handleSaveSlot() {
        const formattedDate = dayjs(selectedDate).format("DD-MM-YYYY");
        try {
            const response = await axios.post("/api/addSpecificSlot", {
                activityId,
                date: formattedDate,
                slot: specificTimeSlot,
                seats: specificSeats
            });

            if (response.status === 200) {
                fetchSlots();
                handleClose();
                setSpecificTimeSlot('');
                setSpecificSeats('');
                setSelectedDate(null);
                // Show success Snackbar
                showSnackbar("Slot added successfully!", "success");
            } else {
                showSnackbar("Failed to add slot.", "error");
            }
        } catch (error) {

        }
    }

    return (
        <Modal
            keepMounted
            open={modal}
            onClose={handleClose}
            aria-labelledby="keep-mounted-modal-title"
            aria-describedby="keep-mounted-modal-description"
        >
            <div className="specific-slot-add">
                <h3>Add Slot</h3>
                <div className="specific-slot-field">
                    <TimeSlotSelect timeSlot={specificTimeSlot} setTimeSlot={setSpecificTimeSlot} />
                </div>
                <div className="specific-slot-field">
                    <TextField
                        id="add-outlined-controlled"
                        label="Select Seats"
                        type="number"
                        value={specificSeats}
                        onChange={(event) => {
                            setSpecificSeats(event.target.value);
                        }}
                    />
                </div>
                <div className="specific-slot-field calender-slot-add">
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DemoContainer components={["DatePicker"]}>
                            <DatePicker
                                label="Select Date"
                                value={selectedDate ? dayjs(selectedDate) : null}
                                onChange={(newDate) => setSelectedDate(newDate ? dayjs(newDate) : null)}
                                shouldDisableDate={isDateDisabled} // Disable specific dates
                            />
                        </DemoContainer>
                    </LocalizationProvider>
                </div>
                <div className="save-specific-details">
                    <Link className="final-btn slot-add-specific-btn" onClick={handleSaveSlot}>Save Slot</Link>
                </div>
            </div>
        </Modal>

    )
}

export default SpecificDataModal;