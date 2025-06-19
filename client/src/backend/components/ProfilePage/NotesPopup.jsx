import { Modal, TextareaAutosize } from "@mui/material";
import React, { useState } from "react";

const NotesPopup = ({ modal, handleClose, onSave }) => {
    const [note, setNote] = useState("");

    // Handle Save Notes
    const handleSaveNote = () => {
        const noteDate = new Date(); // Current date and time
        onSave(note, noteDate); // Pass note and date back to the parent
        setNote(""); // Reset the note field
    };

    return (
        <Modal
            keepMounted
            open={modal}
            onClose={handleClose}
            aria-labelledby="keep-mounted-modal-title"
            aria-describedby="keep-mounted-modal-description"
        >
            <div className="notes-modal-wrap active-modal">
                <h2>Add Notes</h2>
                <div className="notes-modal-cont">
                    <TextareaAutosize
                        minRows={4}
                        aria-label="maximum height"
                        placeholder="Write your note here..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                    <button onClick={handleSaveNote} className="final-btn" disabled={!note.trim()}>
                        Add Note
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default NotesPopup;
