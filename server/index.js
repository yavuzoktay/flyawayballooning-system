const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const app = express();
const path = require("path");
const fs = require("fs");
const moment = require('moment');

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
    var booking_data = "SELECT * FROM all_booking";
    con.query(booking_data, (err, result) => {
        if (err) {
            console.error("Error occurred:", err);
            res.status(500).send({ success: false, error: "Database query failed" });
            return;
        }
        if (result.length > 0) {
            res.send({ success: true, data: result });
        } else {
            res.send({ success: false, message: "No bookings found" });
        }
    });
});

// Get All Booking Data
app.get("/api/getAllBookingData", (req, res) => {
    const { flightType, location, search } = req.query;

    let sql = "SELECT * FROM all_booking";
    const values = [];
    let whereClauses = [];

    if (flightType) {
        whereClauses.push("flight_type = ?");
        values.push(flightType);
    }
    if (location) {
        whereClauses.push("location = ?");
        values.push(location);
    }
    if (search) {
        // Arama için name, id, voucher_code
        whereClauses.push(`(
            name LIKE ? OR
            id LIKE ? OR
            voucher_code LIKE ?
        )`);
        const likeSearch = `%${search}%`;
        values.push(likeSearch, likeSearch, likeSearch);
    }
    if (whereClauses.length > 0) {
        sql += " WHERE " + whereClauses.join(" AND ");
    }

    con.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error fetching booking data:", err);
            return res.status(500).send({ success: false, message: "Database query failed" });
        }
        if (result && result.length > 0) {
            // Parse choose_add_on and add chooseAddOnNames array
            const formatted = result.map(row => {
                let chooseAddOnNames = [];
                if (row.choose_add_on) {
                    try {
                        const parsed = JSON.parse(row.choose_add_on);
                        if (Array.isArray(parsed)) {
                            chooseAddOnNames = parsed.map(addOn => addOn.name).filter(Boolean);
                        }
                    } catch (e) {
                        // ignore parse error
                    }
                }
                return { ...row, chooseAddOnNames };
            });
            res.send({ success: true, data: formatted });
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
            // Null veya undefined alanları boş string olarak döndür
            const formatted = result.map(row => ({
                ...row,
                name: row.name ?? '',
                flight_type: row.flight_type ?? '',
                voucher_type: row.voucher_type ?? '',
                email: row.email ?? '',
                phone: row.phone ?? '',
                expires: row.expires ?? '',
                redeemed: row.redeemed ?? '',
                paid: row.paid ?? '',
                offer_code: row.offer_code ?? '',
                voucher_ref: row.voucher_ref ?? '',
                created_at: row.created_at ? moment(row.created_at).format('DD/MM/YYYY HH:mm') : ''
            }));
            res.send({ success: true, data: formatted });
        } else {
            res.send({ success: false, message: "No bookings found" });
        }
    });
});

// Get Date Requested Data (from all_booking)
app.get('/api/getDateRequestData', (req, res) => {
    const sql = 'SELECT id, name, location, flight_date AS date_requested, voucher_code FROM all_booking';
    con.query(sql, (err, result) => {
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
        totalPrice,
        voucher_code,
        flight_attempts // frontend'den geliyorsa, yoksa undefined
    } = req.body;

    // Debug log for chooseAddOn
    console.log('chooseAddOn received:', chooseAddOn, 'Type:', typeof chooseAddOn);

    // Basic validation
    if (!chooseLocation || !chooseFlightType || !passengerData) {
        return res.status(400).json({ success: false, message: 'Missing required booking information.' });
    }

    const passengerName = `${passengerData[0].firstName} ${passengerData[0].lastName}`;
    const now = moment();
    let expiresDate = null;

    function insertBookingAndPassengers(expiresDateFinal) {
        const nowDate = moment().format('YYYY-MM-DD HH:mm:ss');
        const mainPassenger = passengerData[0] || {};
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
                voucher_code,
                created_at,
                expires,
                additional_notes,
                hear_about_us,
                ballooning_reason,
                prefer,
                weight,
                email,
                phone,
                choose_add_on
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Debug log for chooseAddOn and bookingValues
        console.log('chooseAddOn before insert:', chooseAddOn);
        const bookingValues = [
            passengerName,
            chooseFlightType.type,
            selectedDate,
            chooseFlightType.passengerCount,
            chooseLocation,
            'Confirmed', // Default status
            totalPrice,
            0,
            voucher_code || null,
            nowDate,
            expiresDateFinal,
            (additionalInfo && additionalInfo.notes) || null,
            (additionalInfo && additionalInfo.hearAboutUs) || null,
            (additionalInfo && additionalInfo.reason) || null,
            (additionalInfo && additionalInfo.prefer && typeof additionalInfo.prefer === 'object' && Object.keys(additionalInfo.prefer).length > 0
                ? Object.keys(additionalInfo.prefer).filter(k => additionalInfo.prefer[k]).join(', ')
                : (typeof additionalInfo?.prefer === 'string' && additionalInfo.prefer ? additionalInfo.prefer : null)),
            mainPassenger.weight || null,
            mainPassenger.email || null,
            mainPassenger.phone || null,
            (chooseAddOn && chooseAddOn.length > 0 ? JSON.stringify(chooseAddOn) : null)
        ];
        console.log('bookingValues:', bookingValues);

        con.query(bookingSql, bookingValues, (err, result) => {
            if (err) {
                console.error('Error creating booking:', err);
                return res.status(500).json({ success: false, error: 'Database query failed to create booking' });
            }

            const bookingId = result.insertId;
            const createdAt = nowDate;

            function insertPassengers() {
                const passengerSql = 'INSERT INTO passenger (booking_id, first_name, last_name, weight, email, phone, ticket_type, weather_refund) VALUES ?';
                const passengerValues = passengerData.map(p => [
                    bookingId,
                    p.firstName,
                    p.lastName,
                    p.weight,
                    p.email || null,
                    p.phone || null,
                    p.ticketType || null,
                    p.weatherRefund ? 1 : 0
                ]);
                con.query(passengerSql, [passengerValues], (err, result) => {
                    if (err) {
                        console.error('Error creating passengers:', err);
                        return res.status(500).json({ success: false, error: 'Database query failed to create passengers' });
                    }
                    res.status(201).json({ success: true, message: 'Booking created successfully!', bookingId: bookingId, created_at: createdAt });
                });
            }

            // Eğer voucher_code boşsa, booking'in kendi ID'sini voucher_code olarak güncelle
            if (!voucher_code) {
                const updateVoucherSql = 'UPDATE all_booking SET voucher_code = ? WHERE id = ?';
                con.query(updateVoucherSql, [bookingId, bookingId], (err) => {
                    if (err) {
                        console.error('Error updating voucher_code:', err);
                    }
                    insertPassengers();
                });
            } else {
                insertPassengers();
            }
        });
    }

    // expires hesaplama akışı
    if (voucher_code) {
        // Voucher redeemed mi ve satın alma tarihi nedir?
        const voucherQuery = 'SELECT created_at, status FROM all_vouchers WHERE voucher_code = ? LIMIT 1';
        con.query(voucherQuery, [voucher_code], (err, voucherResult) => {
            if (err) {
                console.error('Error fetching voucher:', err);
                return res.status(500).json({ success: false, error: 'Database query failed to fetch voucher' });
            }
            if (voucherResult.length > 0 && voucherResult[0].status === 'redeemed') {
                // Redeemed voucher: expires = voucher satın alma tarihi + 24 ay
                expiresDate = moment(voucherResult[0].created_at).add(24, 'months').format('YYYY-MM-DD HH:mm:ss');
                insertBookingAndPassengers(expiresDate);
            } else {
                // Diğer durumlar: flight_attempts >= 10 ise 36 ay, yoksa 24 ay
                const attempts = typeof flight_attempts === 'number' ? flight_attempts : 0;
                if (attempts >= 10) {
                    expiresDate = now.clone().add(36, 'months').format('YYYY-MM-DD HH:mm:ss');
                } else {
                    expiresDate = now.clone().add(24, 'months').format('YYYY-MM-DD HH:mm:ss');
                }
                insertBookingAndPassengers(expiresDate);
            }
        });
    } else {
        // Voucher yoksa: flight_attempts >= 10 ise 36 ay, yoksa 24 ay
        const attempts = typeof flight_attempts === 'number' ? flight_attempts : 0;
        if (attempts >= 10) {
            expiresDate = now.clone().add(36, 'months').format('YYYY-MM-DD HH:mm:ss');
        } else {
            expiresDate = now.clone().add(24, 'months').format('YYYY-MM-DD HH:mm:ss');
        }
        insertBookingAndPassengers(expiresDate);
    }
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
            voucher_code VARCHAR(255),
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

// Create Voucher (Flight Voucher veya Redeem Voucher)
app.post('/api/createVoucher', (req, res) => {
    // Boş stringleri null'a çeviren yardımcı fonksiyon
    function emptyToNull(val) {
        return (val === '' || val === undefined) ? null : val;
    }
    const {
        name = '',
        flight_type = '',
        voucher_type = '',
        email = '',
        phone = '',
        expires = '',
        redeemed = 'No',
        paid = 0,
        offer_code = '',
        voucher_ref = ''
    } = req.body;

    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const insertSql = `INSERT INTO all_vouchers 
        (name, flight_type, voucher_type, email, phone, expires, redeemed, paid, offer_code, voucher_ref, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
        emptyToNull(name),
        emptyToNull(flight_type),
        emptyToNull(voucher_type),
        emptyToNull(email),
        emptyToNull(phone),
        emptyToNull(expires),
        emptyToNull(redeemed),
        paid,
        emptyToNull(offer_code),
        emptyToNull(voucher_ref),
        now
    ];
    con.query(insertSql, values, (err, result) => {
        if (err) {
            console.error('Error creating voucher:', err);
            return res.status(500).json({ success: false, error: 'Database query failed to create voucher' });
        }
        res.status(201).json({ success: true, message: 'Voucher created successfully!', voucherId: result.insertId });
    });
});

// Get Booking Detail (all info for popup)
app.get('/api/getBookingDetail', async (req, res) => {
    const booking_id = req.query.booking_id;
    if (!booking_id) {
        return res.status(400).json({ success: false, message: 'booking_id is required' });
    }
    try {
        // 1. Booking ana bilgileri
        const [bookingRows] = await new Promise((resolve, reject) => {
            con.query('SELECT * FROM all_booking WHERE id = ?', [booking_id], (err, rows) => {
                if (err) reject(err);
                else resolve([rows]);
            });
        });
        if (!bookingRows || bookingRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        const booking = bookingRows[0];

        // 2. Passenger bilgileri
        const [passengerRows] = await new Promise((resolve, reject) => {
            con.query('SELECT * FROM passenger WHERE booking_id = ?', [booking_id], (err, rows) => {
                if (err) reject(err);
                else resolve([rows]);
            });
        });

        // 3. Notes (admin_notes)
        const [notesRows] = await new Promise((resolve, reject) => {
            con.query('SELECT * FROM admin_notes WHERE booking_id = ?', [booking_id], (err, rows) => {
                if (err) reject(err);
                else resolve([rows]);
            });
        });

        // 4. Add On (varsayım: all_booking tablosunda veya ayrı bir tablo varsa ekle)
        // Şimdilik booking tablosunda chooseAddOn alanı varsa onu döndür
        // 5. Additional Info (varsayım: all_booking tablosunda veya ayrı bir tablo varsa ekle)
        // Şimdilik booking tablosunda additionalInfo alanı varsa onu döndür

        res.json({
            success: true,
            booking,
            passengers: passengerRows,
            notes: notesRows,
            // addOn: booking.chooseAddOn || null, // Eğer varsa
            // additional: booking.additionalInfo || null // Eğer varsa
        });
    } catch (err) {
        console.error('Error fetching booking detail:', err);
        res.status(500).json({ success: false, message: 'Database error', error: err.message });
    }
});

// Add Passenger (Guest) to booking
app.post('/api/addPassenger', (req, res) => {
    const { booking_id, first_name, last_name, email, phone, ticket_type } = req.body;
    if (!booking_id || !first_name || !last_name) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    // passenger tablosunda email, phone, ticket_type yoksa sadece temel alanları ekle
    const sql = 'INSERT INTO passenger (booking_id, first_name, last_name) VALUES (?, ?, ?)';
    const values = [booking_id, first_name, last_name];
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error adding passenger:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.status(201).json({ success: true, passengerId: result.insertId });
    });
});

// Update Booking Status (manual_status_override)
app.post('/api/updateBookingStatus', (req, res) => {
    const { booking_id, manual_status_override } = req.body;
    if (typeof booking_id === 'undefined' || typeof manual_status_override === 'undefined') {
        return res.status(400).json({ success: false, message: 'booking_id and manual_status_override are required' });
    }
    const sql = 'UPDATE all_booking SET manual_status_override = ? WHERE id = ?';
    con.query(sql, [manual_status_override, booking_id], (err, result) => {
        if (err) {
            console.error('Error updating booking status:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, message: 'Booking status updated' });
    });
});

app.patch('/api/updateBookingField', (req, res) => {
    const { booking_id, field, value } = req.body;
    const allowedFields = ['name', 'phone', 'email'];
    if (!booking_id || !field || !allowedFields.includes(field)) {
        return res.status(400).json({ success: false, message: 'Invalid request' });
    }
    const sql = `UPDATE all_booking SET ${field} = ? WHERE id = ?`;
    con.query(sql, [value, booking_id], (err, result) => {
        if (err) {
            console.error('Error updating booking field:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true });
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
