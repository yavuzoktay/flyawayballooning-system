import { Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import React from "react";

const History = ({ detail, email }) => {

    return (
        <div className="personal-detail-card history-wrap" style={{ marginTop: "20px" }}>
            <h2>History</h2>
            <div className="history-cont-wrap">
                <div className="history-field">
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Booking Date</TableCell>
                                <TableCell>Booking ID</TableCell>
                                <TableCell>Activity Type</TableCell>
                                <TableCell>Location</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <TableCell>{detail.flight_date} - {detail.time_slot}</TableCell>
                                <TableCell>{detail.booking_id}</TableCell>
                                <TableCell>{detail.flight_type}</TableCell>
                                <TableCell>{detail.location}</TableCell>
                                <TableCell>{detail.status}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}

export default History;