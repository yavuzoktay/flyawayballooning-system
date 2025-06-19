import React from "react";
import { Snackbar, Alert } from "@mui/material";

const SnackbarNotification = ({ open, handleClose, message, severity, position }) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: position.vertical, horizontal: position.horizontal }}
    >
      <Alert onClose={handleClose} severity={severity} variant="filled" sx={{ width: "100%" }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default SnackbarNotification;
