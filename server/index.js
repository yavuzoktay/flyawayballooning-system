const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const app = express();
const path = require("path");

// Enable CORS
app.use(cors({
    origin: '*', // Allow all origins or replace '*' with your frontend URL
    methods: "GET,POST,PUT,DELETE",
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// // MySQL Connection Pool
// const con = mysql.createPool({
//     host: "trip.c9mqyasow9hg.us-east-1.rds.amazonaws.com",
//     user: "test",
//     password: "test",
//     database: "test",
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0,
//     acquireTimeout: 10000,
// });

// API routes
app.get('/api/example', (req, res) => {
    res.json({ message: 'Hello from the backend!' });
});

// Other API routes go here...
// (Keeping your existing API routes unchanged)

// Serve static files (React build)
app.use(express.static(path.join(__dirname, '../client/build')));

// Catch-all route to serve React for any undefined routes
app.get('*', (req, res) => {
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({ message: 'API route not found' });
    }
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
