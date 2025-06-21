const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const app = express();
const path = require("path");
const fs = require("fs");

// Enable CORS
app.use(cors({
    origin: '*', // Ensure this matches your frontend domain
    methods: "GET,POST,PUT,DELETE",
    credentials: true
}));
app.use(express.json()); // To parse JSON-encoded request bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded request bodies

// MySQL Connection with Reconnection Handling
const con = mysql.createPool({
    host: "trip-booking-database.c9mqyasow9hg.us-east-1.rds.amazonaws.com",
    user: "admin",
    password: "qumton-jeghuz-doKxy3",
    database: "trip_booking",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
});

// API routes
app.get('/api/example', (req, res) => {
    res.json({ message: 'Hello from the backend!' });
});

// API endpoint to delete Manifest.jsx
app.delete('/delete-test', (req, res) => {
    const filePath = path.join(__dirname, '../client/src/backend/pages/FinalTest.jsx');

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    // Delete the file
    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete file' });
        }
        res.json({ message: 'Manifest.jsx deleted successfully' });
    });
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
    const { flightType } = req.query;

    let sql = "SELECT * FROM all_booking";
    const values = [];

    if (flightType) {
        sql += " WHERE flight_type = ?";
        values.push(flightType);
    }

    con.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error fetching booking data:", err);
            return res.status(500).send({ success: false, message: "Database query failed" });
        }
        if (result && result.length > 0) {
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
        if (err) {
            console.error("Error occurred:", err);
            res.status(500).send({ success: false, error: "Database query failed" });
            return;
        }
        if (result && result.length > 0) {
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
        if (err) {
            console.error("Error occurred:", err);
            res.status(500).send({ success: false, error: "Database query failed" });
            return;
        }
        if (result && result.length > 0) {
            res.send({ success: true, data: result });
        } else {
            res.send({ success: false, message: "No date requests found" });
        }
    });
});


// Get All Passengers Data
app.get('/api/getAllPassengers', (req, res) => {
    var date_request = 'SELECT * FROM passenger';
    con.query(date_request, (err, result) => {
        if (err) {
            console.error("Error occurred:", err);
            res.status(500).send({ success: false, error: "Database query failed" });
            return;
        }
        if (result && result.length > 0) {
            res.send({ success: true, data: result });
        } else {
            res.send({ success: false, message: "No passengers found" });
        }
    });
});


// Get All Activity Data
app.get('/api/getAllActivity', (req, res) => {
    var date_request = 'SELECT * FROM activity';
    con.query(date_request, (err, result) => {
        if (err) {
            console.error("Error occurred:", err);
            res.status(500).send({ success: false, error: "Database query failed" });
            return;
        }
        if (result && result.length > 0) {
            res.send({ success: true, data: result });
        } else {
            res.send({ success: false, message: "No activities found" });
        }
    });
});

// Get All Voucher Data
app.get('/api/getAllVoucher', (req, res) => {
    var date_request = 'SELECT * FROM all_vouchers';
    con.query(date_request, (err, result) => {
        if (err) {
            console.error("Error occurred:", err);
            res.status(500).send({ success: false, error: "Database query failed" });
            return;
        }
        if (result && result.length > 0) {
            res.send({ success: true, data: result });
        } else {
            res.send({ success: false, message: "No vouchers found" });
        }
    });
});

// Insert Admin Notes
app.post("/api/addAdminNotes", (req, res) => {
    console.log('ssdas', req.body);

    var date = req?.body?.date;
    var note = req?.body?.note;
    var booking_id = req?.body?.booking_id;
    var admin_note = 'INSERT INTO admin_notes (date, notes, booking_id) VALUES ("' + date + '","' + note + '","' + booking_id + '")';
    con.query(admin_note, (err, result) => {
        res.send({ result });
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
    var addSlot = 'INSERT INTO specific_availability (time_slot, date, seats, activity_id) VALUES ("' + slot + '","' + date + '","' + seats + '","' + activity_id + '")';
    console.log('addSlot', addSlot);

    con.query(addSlot, (err, resp) => {
        if (resp) {
            res.send({ data: resp });
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
    var updateActivityData = 'UPDATE activity SET timing_slot="' + timing_slot + '", seats="' + seats + '", location="' + location + '" WHERE activity_sku="' + sku + '"';
    con.query(updateActivityData, (err, resp) => {
        if (resp) {
            res.send({ data: resp });
        }
    });
});

// Add this new endpoint to handle booking creation
app.post('/api/createBooking', (req, res) => {
    const {
        activitySelect,
        chooseLocation,
        chooseFlightType,
        chooseAddOn,
        passengerData,
        additionalInfo,
        recipientDetails,
        selectedDate,
        totalPrice
    } = req.body;

    // Basic validation
    if (!chooseLocation || !chooseFlightType || !passengerData) {
        return res.status(400).json({ success: false, message: 'Missing required booking information.' });
    }

    const passengerName = `${passengerData[0].firstName} ${passengerData[0].lastName}`;

    const bookingSql = `
        INSERT INTO all_booking (
            name,
            flight_type, 
            flight_date, 
            pax, 
            location, 
            status, 
            paid, 
            due,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const bookingValues = [
        passengerName,
        chooseFlightType.type,
        selectedDate,
        chooseFlightType.passengerCount,
        chooseLocation,
        'Confirmed', // Default status
        totalPrice,
        0
    ];

    con.query(bookingSql, bookingValues, (err, result) => {
        if (err) {
            console.error('Error creating booking:', err);
            return res.status(500).json({ success: false, error: 'Database query failed to create booking' });
        }

        const bookingId = result.insertId;

        // Now, insert passengers
        const passengerSql = 'INSERT INTO passenger (booking_id, first_name, last_name, weight) VALUES ?';
        const passengerValues = passengerData.map(p => [bookingId, p.firstName, p.lastName, p.weight]);

        con.query(passengerSql, [passengerValues], (err, result) => {
            if (err) {
                console.error('Error creating passengers:', err);
                // Optional: Delete the booking if passenger insertion fails
                return res.status(500).json({ success: false, error: 'Database query failed to create passengers' });
            }
            res.status(201).json({ success: true, message: 'Booking created successfully!', bookingId: bookingId });
        });
    });
});

// Endpoint to create necessary tables
app.get('/api/setup-database', (req, res) => {
    const setupQueries = `
        CREATE TABLE IF NOT EXISTS all_booking (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            flight_type VARCHAR(255),
            flight_date VARCHAR(255),
            pax INT,
            location VARCHAR(255),
            status VARCHAR(255),
            paid DECIMAL(10, 2),
            due DECIMAL(10, 2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    
        CREATE TABLE IF NOT EXISTS passenger (
            id INT AUTO_INCREMENT PRIMARY KEY,
            booking_id INT,
            first_name VARCHAR(255),
            last_name VARCHAR(255),
            weight VARCHAR(255),
            FOREIGN KEY (booking_id) REFERENCES all_booking(id) ON DELETE CASCADE
        );
    
        CREATE TABLE IF NOT EXISTS all_vouchers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            voucher_code VARCHAR(255),
            discount_percentage INT,
            status VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    
        CREATE TABLE IF NOT EXISTS date_request (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            email VARCHAR(255),
            requested_date VARCHAR(255),
            status VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    con.query(setupQueries, (err, result) => {
        if (err) {
            console.error('Error creating database tables:', err);
            return res.status(500).json({ success: false, message: 'Failed to create database tables.' });
        }
        console.log('Database tables created successfully or already exist.');
        res.status(200).json({ success: true, message: 'Database tables created successfully!' });
    });
});

app.use(express.static(path.join(__dirname, '../client/build')));
app.get('*', (req, res) => {
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({ message: 'API route not found' });
    }
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
