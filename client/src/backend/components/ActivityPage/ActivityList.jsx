import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import React from "react";
import EditNoteIcon from '@mui/icons-material/EditNote';
import {Link} from 'react-router-dom';

const ActivityList = ({ activity }) => {
    return (
        <div className="activity-list-wrap">
            <TableContainer component={Paper} style={{ marginTop: "30px" }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>S. No.</TableCell>
                            <TableCell>Activity Name</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {
                            activity.map((item, index) => {
                                return(
                                    <TableRow key={index}>
                                        <TableCell>{index+1}</TableCell>
                                        <TableCell>{item?.activity_name}</TableCell>
                                        <TableCell>{item?.status}</TableCell>
                                        <TableCell><Link to={`/specificActivity/${item?.activity_sku}`} className="edit-activity"><EditNoteIcon /></Link></TableCell>
                                    </TableRow>
                                )
                            })
                        }
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    )
}

export default ActivityList;