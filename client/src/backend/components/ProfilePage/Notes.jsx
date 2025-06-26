import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import NotesPopup from "./NotesPopup";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from "@mui/material";
import axios from "axios";

const Notes = ({ detail }) => {
    const [notes, setNotes] = useState([]);
    const [modal, setModal] = useState(false);

    // Fetch notes from the server
    const fetchNotes = async () => {
        try {
            const response = await axios.get(`/api/getAdminNotes?booking_id=${detail?.booking_id}`);
            if (response.status === 200) {
                setNotes(response.data.notes || []);
            }
        } catch (error) {
            console.error("Error fetching notes:", error);
        }
    };

    // Load notes on component mount
    useEffect(() => {
        fetchNotes();
    }, [detail?.booking_id]);

    // Handle Modal
    const handleModal = () => {
        setModal(true);
    };

    const handleClose = () => {
        setModal(false);
    };

    const handleAddNote = async (note, noteDate) => {
        const booking_id = detail?.booking_id;

        try {
            const response = await axios.post("/api/addAdminNotes", {
                date: noteDate,
                booking_id,
                note,
            });

            if (response.status === 200) {
                // Reload notes after successfully saving the new note
                await fetchNotes();
                setModal(false);
            } else {
                alert("Failed to save note. Please try again.");
            }
        } catch (error) {
            console.error("Error saving note:", error);
            alert("Failed to save note. Please try again.");
        }
    };

    return (
        <div className="personal-detail-card notes-card-wrap" style={{ marginTop: "20px" }}>
            <h2>Notes</h2>
            <div className="main-notes-field">
                <Link onClick={handleModal} className="final-btn" to="#">
                    + Add Notes
                </Link>
                <NotesPopup modal={modal} handleClose={handleClose} onSave={handleAddNote} />

                {notes.length > 0 ? (
                    <TableContainer component={Paper} style={{ marginTop: "30px" }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Note</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {notes.map((note, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{new Date(note.date).toLocaleString()}</TableCell>
                                        <TableCell>{note.notes}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <p style={{ marginTop: "20px" }}>No notes available.</p>
                )}
            </div>
        </div>
    );
};

export default Notes;
