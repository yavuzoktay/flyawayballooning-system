const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const app = express();
const path = require("path");

// Enable CORS
app.use(cors());
app.use(express.json()); // To parse JSON-encoded request bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded request bodies

// Serve static files from React
app.use(express.static(path.join(__dirname, 'client/build')));

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "trip_booking_backend",
});

// Catch-all route to serve React's index.html for any undefined routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Filtered Bookings Data
app.get("/api/getfilteredBookings", (req, res) => {
    var booking_data = "SELECT * FROM all_booking WHERE STR_TO_DATE(flight_date, '%d-%m-%Y') > CURDATE() AND status != 'Cancelled'";
    console.log('booking_data', booking_data);

    con.query(booking_data, (err, result) => { // Corrected the parameter order
        if (err) {
            console.error("Error occurred:", err);
            res.status(500).send({ success: false, error: "Database query failed" });
            return;
        }
        console.log("result", result);
        if (result.length > 0) {
            res.send({ success: true, data: result });
        } else {
            res.send({ success: false, message: "No bookings found" });
        }
    });
});

// Get All Booking Data
app.get("/api/getAllBookingData", (req, res) => {
    const sql = "SELECT * FROM all_booking";
    con.query(sql, (err, result) => {
        if (result.length > 0) {
            res.send({ success: true, data: result });
        } else {
            res.send({ success: false, message: "No bookings found" });
        }
    });
});

// Get All Voucher Data
app.get('/api/getAllVoucherData', (req, res) => {
    var voucher = "SELECT * FROM all_vouchers";
    con.query(voucher, (err, result) => {
        if (result.length > 0) {
            res.send({ success: true, data: result });
        } else {
            res.send({ success: false, message: "No bookings found" });
        }
    });
});

// Get Date Requested Data
app.get('/api/getDateRequestData', (req, res) => {
    var date_request = 'SELECT * FROM date_request';
    con.query(date_request, (err, result) => {
        if (result.length > 0) {
            res.send({ success: true, data: result });
        }
    });
});


// Get All Passengers Data
app.get('/api/getAllPassengers', (req, res) => {
    var date_request = 'SELECT * FROM passenger';
    con.query(date_request, (err, result) => {
        if (result.length > 0) {
            res.send({ success: true, data: result });
        }
    });
});


// Get All Activity Data
app.get('/api/getAllActivity', (req, res) => {
    var date_request = 'SELECT * FROM activity';
    con.query(date_request, (err, result) => {
        if (result.length > 0) {
            res.send({ success: true, data: result });
        }
    });
});

// Get All Voucher Data
app.get('/api/getAllVoucher', (req, res) => {
    var date_request = 'SELECT * FROM all_vouchers';
    con.query(date_request, (err, result) => {
        if (result.length > 0) {
            res.send({ success: true, data: result });
        }
    });
});

// Insert Admin Notes
app.post("/api/addAdminNotes", (req, res) => {
    console.log('ssdas', req.body);
    
    var date = req?.body?.date;
    var note = req?.body?.note;
    var booking_id = req?.body?.booking_id;
    var admin_note = 'INSERT INTO admin_notes (date, notes, booking_id) VALUES ("'+date+'","'+note+'","'+booking_id+'")';
    con.query(admin_note, (err, result) => {
        res.send({result});
    })
});

// Get Specific Availability Slots
app.post("/api/getAllAvailableSlot", (req, res) => {
    const id = req.body.activity_id;
    console.log('id??', id);
    
    const availableSlot = `SELECT * FROM specific_availability WHERE activity_id="${id}"`;
    con.query(availableSlot, (err, result) => {
        if (err) {
            res.status(500).send({ error: "Database query error" });
        } else {
            res.send({ data: result });
        }
    });
});


// Get Admin Notes
app.get("/api/getAdminNotes", (req, res) => {
    const booking_id = req.query.booking_id;

    const query = "SELECT * FROM admin_notes WHERE booking_id = ?";
    con.query(query, [booking_id], (err, results) => {
        if (err) {
            console.error("Error fetching notes:", err);
            return res.status(500).send({ error: "Failed to fetch notes" });
        }
        res.status(200).send({ notes: results });
    });
});

// Add Slot Data
app.post("/api/addSpecificSlot", (req, res) => {
    var data = req.body;
    
    var activity_id = data.activityId;
    var date = data.date;
    var seats = data.seats;
    var slot = data.slot;
    var addSlot =  'INSERT INTO specific_availability (time_slot, date, seats, activity_id) VALUES ("'+slot+'","'+date+'","'+seats+'","'+activity_id+'")';
    console.log('addSlot', addSlot);
    
    con.query(addSlot, (err, resp) => {
        if(resp){
            res.send({data: resp});
        }
    })
});

// Edit Save Activity Data
app.post("/api/updateActivityData", (req, res) => {
    var update_data = req.body;
    var seats = update_data?.seats;
    var location = update_data?.location;
    var timing_slot = update_data?.slot;
    var sku = update_data?.activityId;
    var updateActivityData = 'UPDATE activity SET timing_slot="'+timing_slot+'", seats="'+seats+'", location="'+location+'" WHERE activity_sku="'+sku+'"';
    con.query(updateActivityData, (err, resp) => {
        if(resp){
            res.send({data: resp});
        }
    });
});


app.listen(3000, () => { console.log("Backend start on 3000") });
