import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from "@mui/material";
import React, { useEffect, useState, useCallback } from "react";
import TimeSlotSelect from "./TimeSlotSelect";
import SpecificLocation from "./SpecificLocation";
import { Link, useNavigate } from "react-router-dom";
import AddIcon from '@mui/icons-material/Add';
import SpecificDataModal from "./SpecificDataModal";
import axios from "axios";
import SnackbarNotification from "../SnackBar/SnackbarNotification";


const SpecificActivityPage = ({ activityData }) => {
    const [timeSlot, setTimeSlot] = useState(activityData?.[0]?.timing_slot);
    const [defaultLocation, setDefaultLocation] = useState([]);
    const [defaultSeats, setDefaultSeats] = useState('');
    const [activeModal, setActiveModal] = useState(false);
    const [disabledDates, setDisabledDates] = useState([]);
    const [availableSlot, setAvailableSlot] = useState([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success", position: { vertical: "top", horizontal: "right" } });

    const navigate = useNavigate();

    // Function to Show Snackbar with Dynamic Message
    const showSnackbar = useCallback((message, severity) => {
        setSnackbar({ open: true, message, severity, position: { vertical: "top", horizontal: "right" } });
    }, []);

    // Get All Specific Available Slot
    const specificAvailableSlot = useCallback(async () => {
        if (!activityData?.[0]?.activity_sku) return;

        try {
            const response = await axios.post("/api/getAllAvailableSlot", {
                activity_id: activityData[0].activity_sku
            });

            if (response.status === 200) {
                const data = response?.data.data;
                setAvailableSlot(data);
                var available_date = [];
                if (data.length > 0) {
                    for (var i = 0; i < data.length; i++) {
                        var final_date = data[i].date;
                        available_date.push(final_date);
                    }
                    setDisabledDates(available_date);
                }

            }
        } catch (error) {
            console.error("Error fetching slots:", error);
            showSnackbar("Failed to fetch slots!", "error");
        }
    }, [activityData, showSnackbar]);

    // Fetch available slots when component mounts
    useEffect(() => {
        specificAvailableSlot();
    }, [specificAvailableSlot]);


    // Initialize default values when `activityData` changes
    useEffect(() => {
        if (activityData?.[0]?.timing_slot) {
            setTimeSlot(activityData[0].timing_slot);
        }
        if (activityData?.[0]?.location) {
            setDefaultLocation([activityData[0].location]); // Preselect location
        }
        if (activityData?.[0]?.seats) {
            setDefaultSeats([activityData[0].seats]); // Preselect location
        }
    }, [activityData]);

    // Handle Modal Open
    function handleModalClick() {
        setActiveModal(true);
    }

    // Modal Close
    const handleClose = () => {
        setActiveModal(false);
    };

    // Handle Save Activity Data 
    async function handleSaveActivity() {
        try {
            const response = await axios.post("/api/updateActivityData", {
                activityId: activityData?.[0]?.activity_sku,
                location: defaultLocation,
                slot: timeSlot,
                seats: defaultSeats
            });

            if (response.status === 200) {
                var data = response?.data;
                console.log('data??', data);
                showSnackbar("Activity Updated Successfully!", "success");
                setTimeout(() => {
                    navigate('/activity');
                }, 1000);
            } else {
                showSnackbar("Failed to update activity!", "error");
            }
        } catch (error) {
            console.error("Error saving note:", error);
        }
    }

    // Handle Snackbar Close
    const handleSnackbarClose = (event, reason) => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    return (
        <div className="final-spec-activity-wrap">
            <div className="default-activity-wrap-edit">
                <h2>Default Slot</h2>
                <div className="default-card-wrap">
                    <div className="specific-activity-fields">
                        <TimeSlotSelect timeSlot={timeSlot} setTimeSlot={setTimeSlot} />
                    </div>
                    <div className="specific-activity-fields">
                        <SpecificLocation defaultLocation={defaultLocation} setDefaultLocation={setDefaultLocation} />
                    </div>
                    <div className="specific-activity-fields">
                        <TextField
                            id="outlined-controlled"
                            label="Default Seats"
                            type="number"
                            value={defaultSeats}
                            onChange={(event) => {
                                setDefaultSeats(event.target.value);
                            }}
                        />
                    </div>
                    <div className="default-save-btn final-btn" onClick={handleSaveActivity}>
                        <span>Save</span>
                    </div>
                </div>
            </div>
            <div className="add-slot-btn">
                <Link className="final-btn" onClick={handleModalClick}><AddIcon /> Add Slot</Link>
            </div>
            {
                availableSlot.length > 0 ?
                    <div className="specific-new-slot-edit">
                        <h2>Specific Slot</h2>
                        <div className="specific-card-wrap">
                            <TableContainer component={Paper} style={{ marginTop: "30px" }}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>S. No.</TableCell>
                                            <TableCell>Slot</TableCell>
                                            <TableCell>Seats</TableCell>
                                            <TableCell>Date</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {
                                            availableSlot.map((item, index) => {
                                                return (
                                                    <TableRow key={index}>
                                                        <TableCell>{index + 1}</TableCell>
                                                        <TableCell>{item?.time_slot}</TableCell>
                                                        <TableCell>{item?.seats}</TableCell>
                                                        <TableCell>{item?.date}</TableCell>
                                                    </TableRow>
                                                )
                                            })
                                        }
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </div>
                    </div>
                    :
                    ""
            }
            <SpecificDataModal modal={activeModal} handleClose={handleClose} activityId={activityData?.[0]?.activity_sku} disabledDates={disabledDates} fetchSlots={specificAvailableSlot} showSnackbar={showSnackbar}  />

            <SnackbarNotification
                open={snackbar.open}
                handleClose={handleSnackbarClose}
                message={snackbar.message}
                severity={snackbar.severity}
                position={snackbar.position}
            />
        </div>
    )
}

export default SpecificActivityPage;