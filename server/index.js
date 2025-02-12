const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");

const app = express();

// Enable CORS
app.use(cors({
    origin: 'https://flyawayballooning-system.com', // Ensure this matches your frontend domain
    methods: "GET,POST,PUT,DELETE",
    credentials: true
}));

app.use(express.json()); // To parse JSON-encoded request bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded request bodies

// ✅ Use Connection Pool to prevent timeouts
const pool = mysql.createPool({
    host: "trip-booking-backend.c9mqyasow9hg.us-east-1.rds.amazonaws.com",
    user: "admin",
    password: "tripbookingapp",
    database: "trip_booking",
    waitForConnections: true,
    connectionLimit: 10,  // Max connections
    queueLimit: 0
});

// ✅ Keep the connection alive
setInterval(() => {
    pool.query("SELECT 1")
        .catch(err => console.error("Keep-alive query failed", err));
}, 30000); // Every 30 seconds

// ✅ Helper function to handle queries
const executeQuery = async (sql, params = []) => {
    try {
        const [rows] = await pool.promise().query(sql, params);
        return { success: true, data: rows };
    } catch (error) {
        console.error("Database error:", error);
        return { success: false, error: "Database query failed" };
    }
};

// ✅ Example API Route
app.get('/api/example', async (req, res) => {
    res.json({ message: 'Hello from the backend!' });
});

// ✅ Filtered Bookings Data
app.get("/api/getfilteredBookings", async (req, res) => {
    const query = "SELECT * FROM all_booking WHERE STR_TO_DATE(flight_date, '%d-%m-%Y') > CURDATE() AND status != 'Cancelled'";
    const result = await executeQuery(query);
    res.status(result.success ? 200 : 500).json(result);
});

// ✅ Get All Booking Data
app.get("/api/getAllBookingData", async (req, res) => {
    const result = await executeQuery("SELECT * FROM all_booking");
    res.status(result.success ? 200 : 500).json(result);
});

// ✅ Get All Voucher Data
app.get('/api/getAllVoucherData', async (req, res) => {
    const result = await executeQuery("SELECT * FROM all_vouchers");
    res.status(result.success ? 200 : 500).json(result);
});

// ✅ Get Date Requested Data
app.get('/api/getDateRequestData', async (req, res) => {
    const result = await executeQuery('SELECT * FROM date_request');
    res.status(result.success ? 200 : 500).json(result);
});

// ✅ Get All Passengers Data
app.get('/api/getAllPassengers', async (req, res) => {
    const result = await executeQuery('SELECT * FROM passenger');
    res.status(result.success ? 200 : 500).json(result);
});

// ✅ Get All Activity Data
app.get('/api/getAllActivity', async (req, res) => {
    const result = await executeQuery('SELECT * FROM activity');
    res.status(result.success ? 200 : 500).json(result);
});

// ✅ Insert Admin Notes
app.post("/api/addAdminNotes", async (req, res) => {
    const { date, note, booking_id } = req.body;
    const result = await executeQuery('INSERT INTO admin_notes (date, notes, booking_id) VALUES (?, ?, ?)', [date, note, booking_id]);
    res.status(result.success ? 200 : 500).json(result);
});

// ✅ Get Admin Notes
app.get("/api/getAdminNotes", async (req, res) => {
    const { booking_id } = req.query;
    const result = await executeQuery("SELECT * FROM admin_notes WHERE booking_id = ?", [booking_id]);
    res.status(result.success ? 200 : 500).json(result);
});

// ✅ Get Specific Availability Slots
app.post("/api/getAllAvailableSlot", async (req, res) => {
    const { activity_id } = req.body;
    const result = await executeQuery("SELECT * FROM specific_availability WHERE activity_id = ?", [activity_id]);
    res.status(result.success ? 200 : 500).json(result);
});

// ✅ Add Slot Data
app.post("/api/addSpecificSlot", async (req, res) => {
    const { activityId, date, seats, slot } = req.body;
    const result = await executeQuery('INSERT INTO specific_availability (time_slot, date, seats, activity_id) VALUES (?, ?, ?, ?)', [slot, date, seats, activityId]);
    res.status(result.success ? 200 : 500).json(result);
});

// ✅ Edit Save Activity Data
app.post("/api/updateActivityData", async (req, res) => {
    const { seats, location, slot, activityId } = req.body;
    const result = await executeQuery('UPDATE activity SET timing_slot = ?, seats = ?, location = ? WHERE activity_sku = ?', [slot, seats, location, activityId]);
    res.status(result.success ? 200 : 500).json(result);
});

// ✅ Serve static files after API routes
const buildPath = path.join(__dirname, "../client/build");
app.use(express.static(buildPath));

// ✅ Catch-all route to serve React's `index.html`
app.get("/*", function (req, res) {
    if (req.path.startsWith("/api/")) {
        return next(); // Skip React, go to API
    }
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
});

// ✅ Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
