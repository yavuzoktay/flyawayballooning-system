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
    const [status, setStatus] = useState(activityData?.[0]?.status || '');
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success", position: { vertical: "top", horizontal: "right" } });
    const navigate = useNavigate();

    // Function to Show Snackbar with Dynamic Message
    const showSnackbar = useCallback((message, severity) => {
        setSnackbar({ open: true, message, severity, position: { vertical: "top", horizontal: "right" } });
    }, []);

    // Handle Save Activity Data 
    async function handleSaveActivity() {
        try {
            const response = await axios.post("/api/updateActivityData", {
                activity_name: activityData?.[0]?.activity_name,
                location: activityData?.[0]?.location,
                flight_type: activityData?.[0]?.flight_type,
                status
            });

            if (response.status === 200) {
                showSnackbar("Activity Updated Successfully!", "success");
                setTimeout(() => {
                    navigate('/activity');
                }, 1000);
            } else {
                showSnackbar("Failed to update activity!", "error");
            }
        } catch (error) {
            showSnackbar("Failed to update activity!", "error");
        }
    }

    // Handle Snackbar Close
    const handleSnackbarClose = (event, reason) => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    return (
        <div className="final-spec-activity-wrap">
            <div className="default-activity-wrap-edit">
                <h2>Activity Details</h2>
                <div className="default-card-wrap">
                    <div className="specific-activity-fields">
                        <b>Name:</b> {activityData?.[0]?.activity_name}
                    </div>
                    <div className="specific-activity-fields">
                        <b>Location:</b> {activityData?.[0]?.location}
                    </div>
                    <div className="specific-activity-fields">
                        <b>Type:</b> {activityData?.[0]?.flight_type}
                    </div>
                    <div className="specific-activity-fields">
                        <TextField
                            id="outlined-status"
                            label="Status"
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                        />
                    </div>
                    <div className="default-save-btn final-btn" onClick={handleSaveActivity}>
                        <span>Save</span>
                    </div>
                </div>
            </div>
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