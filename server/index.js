const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const app = express();
const path = require("path");
const fs = require("fs");
const dayjs = require("dayjs");
const moment = require('moment');
const multer = require('multer');
const dotenv = require('dotenv');
dotenv.config();

// Enable CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || '*', // Environment'a göre frontend domaini
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

// Multer storage config for activities
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'uploads/activities'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});
const upload = multer({ storage });

// Statik olarak uploads klasörünü sun
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
    var booking_data = "SELECT * FROM all_booking ORDER BY created_at DESC";
    con.query(booking_data, (err, result) => {
        if (err) {
            console.error("Error occurred:", err);
            res.status(500).send({ success: false, error: "Database query failed" });
            return;
        }
        if (result.length > 0) {
            const formatted = result.map(row => ({
                ...row,
                created_at: row.created_at ? moment(row.created_at).format('YYYY-MM-DD') : '',
                created_at_display: row.created_at ? moment(row.created_at).format('DD/MM/YYYY') : '',
                choose_add_on: row.choose_add_on || ''
            }));
            res.send({ success: true, data: formatted });
        } else {
            res.send({ success: false, message: "No bookings found" });
        }
    });
});

// Get All Booking Data
app.get("/api/getAllBookingData", (req, res) => {
    const { flightType, location, search, status } = req.query;

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
    if (status) {
        if (status === 'Scheduled') {
            whereClauses.push("(status = 'Scheduled' OR status = 'Confirmed')");
        } else {
            whereClauses.push("status = ?");
            values.push(status);
        }
    }
    if (search) {
        console.log('Search term:', search);
        
        // Eğer DD/MM/YYYY formatındaysa, DATE() sorgularını da ekle
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(search)) {
            const [d, m, y] = search.split('/');
            const dateSearch = `${y}-${m}-${d}`;
            console.log('Converted date:', dateSearch);
            
        whereClauses.push(`(
            name LIKE ? OR
            id LIKE ? OR
                voucher_code LIKE ? OR
                created_at LIKE ? OR
                DATE_FORMAT(created_at, '%d/%m/%Y') LIKE ? OR
                DATE(created_at) = ? OR
                DATE(CONVERT_TZ(created_at, '+00:00', '+03:00')) = ?
        )`);
        const likeSearch = `%${search}%`;
            values.push(likeSearch, likeSearch, likeSearch, likeSearch, likeSearch, dateSearch, dateSearch);
        } else {
            // Sadece LIKE aramaları yap, DATE() fonksiyonlarını kullanma
            whereClauses.push(`(
                name LIKE ? OR
                id LIKE ? OR
                voucher_code LIKE ? OR
                created_at LIKE ? OR
                DATE_FORMAT(created_at, '%d/%m/%Y') LIKE ?
            )`);
            const likeSearch = `%${search}%`;
            values.push(likeSearch, likeSearch, likeSearch, likeSearch, likeSearch);
        }
        
        console.log('SQL values:', values);
    }
    if (whereClauses.length > 0) {
        sql += " WHERE " + whereClauses.join(" AND ");
    }
    sql += " ORDER BY created_at DESC";
    
    console.log('Final SQL:', sql);
    console.log('Final values:', values);

    con.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error fetching booking data:", err);
            return res.status(500).send({ success: false, message: "Database query failed" });
        }
        
        // Debug: İlk birkaç kaydın created_at değerlerini göster
        if (result && result.length > 0) {
            console.log('Sample created_at values:');
            result.slice(0, 3).forEach((row, index) => {
                console.log(`Row ${index + 1}:`, row.created_at);
            });
        }
        if (result && result.length > 0) {
            // choose_add_on'u doğrudan string olarak döndür
            const formatted = result.map(row => {
                // Format flight_date as DD/MM/YYYY AM/PM if time exists
                let flightDateFormatted = '';
                if (row.flight_date) {
                    // Try to parse as date+time
                    const dateTime = moment(row.flight_date, ["YYYY-MM-DD HH:mm", "YYYY-MM-DDTHH:mm", "YYYY-MM-DD", "DD/MM/YYYY HH:mm", "DD/MM/YYYY"]);
                    if (dateTime.isValid()) {
                        const hour = dateTime.hour();
                        const ampm = hour < 12 ? 'AM' : 'PM';
                        flightDateFormatted = dateTime.format('DD/MM/YYYY') + (row.flight_date.length > 10 ? ' ' + ampm : '');
                    } else {
                        // Fallback: just show as is
                        flightDateFormatted = row.flight_date;
                    }
                }
                return {
                    ...row,
                    created_at: row.created_at ? moment(row.created_at).format('YYYY-MM-DD') : '',
                    created_at_display: row.created_at ? moment(row.created_at).format('DD/MM/YYYY') : '',
                    choose_add_on: row.choose_add_on || '',
                    flight_date_display: flightDateFormatted,
                    preferred_location: row.preferred_location || null,
                    preferred_time: row.preferred_time || null,
                    preferred_day: row.preferred_day || null
                };
            });
            res.send({ success: true, data: formatted });
        } else {
            res.send({ success: false, message: "No bookings found" });
        }
    });
});

// Get All Voucher Data (with booking and passenger info)
app.get('/api/getAllVoucherData', (req, res) => {
    // Join all_vouchers with all_booking and passenger (if available)
    const voucher = `
        SELECT v.*, b.email as booking_email, b.phone as booking_phone, b.id as booking_id, p.weight as passenger_weight
        FROM all_vouchers v
        LEFT JOIN all_booking b ON v.voucher_ref = b.voucher_code
        LEFT JOIN passenger p ON b.id = p.booking_id
        ORDER BY v.created_at DESC
    `;
    con.query(voucher, (err, result) => {
        if (err) {
            console.error("Error occurred:", err);
            res.status(500).send({ success: false, error: "Database query failed" });
            return;
        }
        if (result && result.length > 0) {
            const formatted = result.map(row => {
                let expiresVal = row.expires;
                if (!expiresVal && row.created_at) {
                    expiresVal = moment(row.created_at).add(24, 'months').format('YYYY-MM-DD HH:mm:ss');
                }
                return {
                    ...row,
                    name: row.name ?? '',
                    flight_type: row.flight_type ?? '',
                    voucher_type: row.voucher_type ?? '',
                    email: row.email ?? '',
                    phone: row.phone ?? '',
                    expires: expiresVal ? moment(expiresVal).format('DD/MM/YYYY') : '',
                    redeemed: row.redeemed ?? '',
                    paid: row.paid ?? '',
                    offer_code: row.offer_code ?? '',
                    voucher_ref: row.voucher_ref ?? '',
                    created_at: row.created_at ? moment(row.created_at).format('DD/MM/YYYY HH:mm') : '',
                    booking_email: row.booking_email ?? '',
                    booking_phone: row.booking_phone ?? '',
                    booking_id: row.booking_id ?? '',
                    passenger_weight: row.passenger_weight ?? ''
                };
            });
            res.send({ success: true, data: formatted });
        } else {
            res.send({ success: false, message: "No bookings found" });
        }
    });
});

// Get All Voucher Data (alternate)
app.get('/api/getAllVoucher', (req, res) => {
    var date_request = 'SELECT * FROM all_vouchers ORDER BY created_at DESC';
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

// Get Date Requested Data (from all_booking)
app.get('/api/getDateRequestData', (req, res) => {
    const sql = 'SELECT id, name, location, flight_date AS date_requested, voucher_code, phone, email FROM all_booking';
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
    const { activity_name, location, flight_type, status } = req.body;
    if (!activity_name || !location || !flight_type) {
        return res.status(400).json({ success: false, message: "Eksik bilgi!" });
    }
    const sql = 'UPDATE activity SET status = ? WHERE activity_name = ? AND location = ? AND flight_type = ?';
    con.query(sql, [status, activity_name, location, flight_type], (err, resp) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Database error" });
        }
        res.json({ success: true, data: resp });
    });
});

// Add this new endpoint to handle booking creation
app.post('/api/createBooking', (req, res) => {
    let {
        activitySelect,
        chooseLocation,
        chooseFlightType,
        chooseAddOn, // legacy or frontend field
        choose_add_on, // preferred field
        passengerData,
        additionalInfo,
        recipientDetails,
        selectedDate,
        selectedTime, // <-- yeni eklenen alan
        totalPrice,
        voucher_code,
        flight_attempts, // frontend'den geliyorsa, yoksa undefined
        preferred_location,
        preferred_time,
        preferred_day
    } = req.body;

    // Unify add-on field: always use choose_add_on as array of {name, price}
    if (!choose_add_on && chooseAddOn) {
        choose_add_on = chooseAddOn;
    }
    if (!Array.isArray(choose_add_on)) {
        choose_add_on = [];
    } else {
        // Ensure each add-on has name and price
        choose_add_on = choose_add_on.filter(a => a && a.name);
    }

    // Debug log for choose_add_on
    console.log('choose_add_on received:', choose_add_on, 'Type:', typeof choose_add_on);

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
        // Eğer selectedTime varsa, selectedDate ile birleştir
        let bookingDateTime = selectedDate;
        if (selectedTime && selectedDate) {
            // selectedDate string ise, sadece tarih kısmını al
            let datePart = selectedDate;
            if (typeof selectedDate === 'string' && selectedDate.includes(' ')) {
                datePart = selectedDate.split(' ')[0];
            } else if (typeof selectedDate === 'string' && selectedDate.length > 10) {
                datePart = selectedDate.substring(0, 10);
            }
            bookingDateTime = `${datePart} ${selectedTime}`;
        }
        // bookingSql ve bookingValues'da selectedDate yerine bookingDateTime kullan
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
                choose_add_on,
                preferred_location,
                preferred_time,
                preferred_day
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Debug log for choose_add_on and bookingValues
        let choose_add_on_str = '';
        if (Array.isArray(choose_add_on) && choose_add_on.length > 0) {
            choose_add_on_str = choose_add_on.map(a => a && a.name ? a.name : '').filter(Boolean).join(', ');
        }
        console.log('DEBUG choose_add_on:', choose_add_on);
        console.log('DEBUG choose_add_on_str:', choose_add_on_str);
        const bookingValues = [
            passengerName,
            chooseFlightType.type,
            bookingDateTime, // <-- burada güncelledik
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
            choose_add_on_str,
            preferred_location || null,
            preferred_time || null,
            preferred_day || null
        ];
        console.log('bookingValues:', bookingValues);

        con.query(bookingSql, bookingValues, (err, result) => {
            if (err) {
                console.error('Error creating booking:', err);
                return res.status(500).json({ success: false, error: 'Database query failed to create booking' });
            }

            const bookingId = result.insertId;
            const createdAt = nowDate;

            // --- Availability güncelleme ---
            // selectedDate ve selectedTime ile availability güncellenir
            if (selectedDate && chooseFlightType && chooseFlightType.passengerCount && chooseLocation) {
                console.log('=== AVAILABILITY UPDATE DEBUG ===');
                console.log('selectedDate:', selectedDate, 'Type:', typeof selectedDate);
                console.log('chooseFlightType:', chooseFlightType);
                console.log('chooseLocation:', chooseLocation);
                console.log('req.body.activity_id:', req.body.activity_id);
                
                let bookingDate = moment(selectedDate).format('YYYY-MM-DD');
                let bookingTime = null;
                // Eğer selectedTime varsa onu kullan
                if (selectedTime) {
                    bookingTime = selectedTime;
                } else if (typeof selectedDate === 'string' && selectedDate.includes(' ')) {
                    const parts = selectedDate.split(' ');
                    bookingDate = parts[0];
                    bookingTime = parts[1];
                } else if (typeof selectedDate === 'string' && selectedDate.includes('T')) {
                    bookingTime = moment(selectedDate).format('HH:mm');
                } else if (selectedDate instanceof Date) {
                    bookingTime = moment(selectedDate).format('HH:mm');
                } else if (typeof selectedDate === 'string' && selectedDate.length === 10) {
                    bookingTime = null;
                }
                
                console.log('Parsed bookingDate:', bookingDate);
                console.log('Parsed bookingTime:', bookingTime);
                if (bookingTime && req.body.activity_id) {
                    // Doğrudan activity_id ile güncelle
                    const updateAvailSql = `UPDATE activity_availability SET available = available - ? WHERE date = ? AND time = ? AND activity_id = ? AND available >= ?`;
                    console.log('=== REBOOK AVAILABILITY UPDATE ===');
                    console.log('UPDATE AVAILABILITY PARAMS:', chooseFlightType.passengerCount, bookingDate, bookingTime, req.body.activity_id, chooseFlightType.passengerCount);
                    console.log('Request body activity_id:', req.body.activity_id);
                    console.log('Request body:', req.body);
                    con.query(updateAvailSql, [chooseFlightType.passengerCount, bookingDate, bookingTime, req.body.activity_id, chooseFlightType.passengerCount], (err2, result2) => {
                        if (err2) {
                            console.error('Error updating availability:', err2);
                        } else {
                            console.log('Availability updated successfully:', result2.affectedRows, 'rows affected');
                            console.log('=== END REBOOK AVAILABILITY UPDATE ===');
                        }
                    });
                } else if (bookingTime) {
                    // Eski yöntem: alt sorgu ile activity_id bul
                    const updateAvailSql = `UPDATE activity_availability SET available = available - ? WHERE date = ? AND time = ? AND activity_id = (SELECT id FROM activity WHERE location = ? AND status = 'Live' LIMIT 1) AND available >= ?`;
                    console.log('UPDATE AVAILABILITY PARAMS (alt sorgu):', chooseFlightType.passengerCount, bookingDate, bookingTime, chooseLocation, chooseFlightType.passengerCount);
                    con.query(updateAvailSql, [chooseFlightType.passengerCount, bookingDate, bookingTime, chooseLocation, chooseFlightType.passengerCount], (err2, result2) => {
                        if (err2) {
                            console.error('Error updating availability (alt sorgu):', err2);
                        } else {
                            console.log('Availability updated (alt sorgu):', result2.affectedRows, 'rows');
                        }
                    });
                }
            }
            // --- Availability güncelleme sonu ---

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
    function emptyToNull(val) {
        return (val === '' || val === undefined) ? null : val;
    }
    const {
        name = '',
        weight = '',
        flight_type = '',
        voucher_type = '',
        email = '',
        phone = '',
        mobile = '',
        expires = '',
        redeemed = 'No',
        paid = 0,
        offer_code = '',
        voucher_ref = '',
        recipient_name = '',
        recipient_email = '',
        recipient_phone = '',
        recipient_gift_date = '',
        preferred_location = '',
        preferred_time = '',
        preferred_day = ''
    } = req.body;

    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    let expiresFinal = expires && expires !== '' ? expires : moment().add(24, 'months').format('YYYY-MM-DD HH:mm:ss');

    const insertSql = `INSERT INTO all_vouchers 
        (name, weight, flight_type, voucher_type, email, phone, mobile, expires, redeemed, paid, offer_code, voucher_ref, created_at, recipient_name, recipient_email, recipient_phone, recipient_gift_date, preferred_location, preferred_time, preferred_day)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
        emptyToNull(name),
        emptyToNull(weight),
        emptyToNull(flight_type),
        emptyToNull(voucher_type),
        emptyToNull(email),
        emptyToNull(phone),
        emptyToNull(mobile),
        emptyToNull(expiresFinal),
        emptyToNull(redeemed),
        paid,
        emptyToNull(offer_code),
        emptyToNull(voucher_ref),
        now,
        emptyToNull(recipient_name),
        emptyToNull(recipient_email),
        emptyToNull(recipient_phone),
        emptyToNull(recipient_gift_date),
        emptyToNull(preferred_location),
        emptyToNull(preferred_time),
        emptyToNull(preferred_day)
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
        // Ensure preferred fields are always present and not null
        booking.preferred_location = booking.preferred_location || '';
        booking.preferred_time = booking.preferred_time || '';
        booking.preferred_day = booking.preferred_day || '';
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
        res.json({
            success: true,
            booking,
            passengers: passengerRows,
            notes: notesRows,
        });
    } catch (err) {
        console.error('Error fetching booking detail:', err);
        res.status(500).json({ success: false, message: 'Database error', error: err.message });
    }
});

// Add Passenger (Guest) to booking
app.post('/api/addPassenger', (req, res) => {
    const { booking_id, first_name, last_name, email, phone, ticket_type, weight } = req.body;
    if (!booking_id || !first_name || !last_name) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    // passenger tablosunda email, phone, ticket_type, weight varsa ekle
    const sql = 'INSERT INTO passenger (booking_id, first_name, last_name, weight, email, phone, ticket_type) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const values = [booking_id, first_name, last_name, weight || null, email || null, phone || null, ticket_type || null];
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
    const allowedFields = ['name', 'phone', 'email', 'expires', 'weight', 'status', 'flight_attempts', 'choose_add_on', 'additional_notes', 'preferred_day', 'preferred_location', 'preferred_time', 'paid', 'activity_id', 'location', 'flight_type', 'flight_date']; // Add new fields
    if (!booking_id || !field || !allowedFields.includes(field)) {
        return res.status(400).json({ success: false, message: 'Invalid request' });
    }
    let sql;
    let params;
    if (field === 'weight') {
        // passenger tablosunda ana yolcunun weight bilgisini güncelle
        sql = `UPDATE passenger SET weight = ? WHERE booking_id = ? LIMIT 1`;
        params = [value, booking_id];
    } else {
        sql = `UPDATE all_booking SET ${field} = ? WHERE id = ?`;
        params = [value, booking_id];
    }
    con.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error updating booking field:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        // If status is updated, also insert into booking_status_history
        if (field === 'status') {
            const historySql = 'INSERT INTO booking_status_history (booking_id, status) VALUES (?, ?)';
            con.query(historySql, [booking_id, value], (err2) => {
                if (err2) console.error('History insert error:', err2);
                // Do not block main response
                res.json({ success: true });
            });
        } else {
            res.json({ success: true });
        }
    });
});

// Get booking status history for a booking
app.get('/api/getBookingHistory', (req, res) => {
    const booking_id = req.query.booking_id;
    if (!booking_id) return res.status(400).json({ success: false, message: 'booking_id is required' });
    con.query('SELECT * FROM booking_status_history WHERE booking_id = ? ORDER BY changed_at ASC', [booking_id], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'DB error' });
        res.json({ success: true, history: rows });
    });
});

// Passenger tablosunda herhangi bir yolcunun weight bilgisini güncellemek için
app.patch('/api/updatePassengerField', (req, res) => {
    const { passenger_id, field, value } = req.body;
    const allowedFields = ['weight', 'first_name', 'last_name', 'price']; // Add 'price'
    if (!passenger_id || !field || !allowedFields.includes(field)) {
        return res.status(400).json({ success: false, message: 'Invalid request' });
    }
    const sql = `UPDATE passenger SET ${field} = ? WHERE id = ?`;
    con.query(sql, [value, passenger_id], (err, result) => {
        if (err) {
            console.error('Error updating passenger field:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true });
    });
});

// Analytics endpoint
app.get('/api/analytics', async (req, res) => {
    const { start_date, end_date } = req.query;
    // Helper for date filter
    const dateFilter = (field = 'flight_date') => {
        let sql = '';
        if (start_date) sql += ` AND ${field} >= '${start_date}'`;
        if (end_date) sql += ` AND ${field} <= '${end_date}'`;
        return sql;
    };
    // 1. Booking Attempts
    const attemptsSql = `
        SELECT flight_attempts
        FROM all_booking
        WHERE flight_date IS NOT NULL
        AND status IN ('Flown', 'Confirmed', 'Scheduled')
        ${dateFilter()}
    `;
    con.query(attemptsSql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch booking attempts' });
        const total = rows.length;
        let first=0, second=0, third=0, fourth=0, fifth=0, sixthPlus=0;
        rows.forEach(r => {
            // Fallback: if flight_attempts is undefined/null, treat as 1
            const att = Number((r.flight_attempts !== undefined && r.flight_attempts !== null) ? r.flight_attempts : 1);
            if (att === 1) first++;
            else if (att === 2) second++;
            else if (att === 3) third++;
            else if (att === 4) fourth++;
            else if (att === 5) fifth++;
            else sixthPlus++;
        });
        const pct = n => total ? Math.round((n/total)*100) : 0;
        const bookingAttempts = {
            first: pct(first),
            second: pct(second),
            third: pct(third),
            fourth: pct(fourth),
            fifth: pct(fifth),
            sixthPlus: pct(sixthPlus)
        };
        // 2. Sales by Source
        const sourceSql = `
            SELECT hear_about_us, COUNT(*) as count
            FROM all_booking
            WHERE flight_date IS NOT NULL
            AND status IN ('Flown', 'Confirmed', 'Scheduled')
            ${dateFilter()}
            GROUP BY hear_about_us
        `;
        con.query(sourceSql, [], (err2, srcRows) => {
            if (err2) return res.status(500).json({ error: 'Failed to fetch sales by source' });
            const totalSrc = srcRows.reduce((sum, r) => sum + r.count, 0);
            const salesBySource = srcRows.map(r => ({
                source: r.hear_about_us || 'Other',
                percent: totalSrc ? Math.round((r.count/totalSrc)*100) : 0
            }));
            // 3. Non Redemption (expired, not flown or not redeemed)
            const nonRedemptionSql = `
                SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Expired' THEN 1 ELSE 0 END) as expired
                FROM all_booking
                WHERE 1=1 ${dateFilter('expires')}
            `;
            con.query(nonRedemptionSql, [], (err3, nonRows) => {
                if (err3) return res.status(500).json({ error: 'Failed to fetch non redemption' });
                const total = nonRows[0]?.total || 0;
                const expired = nonRows[0]?.expired || 0;
                const nonRedemption = {
                    value: expired,
                    percent: total ? Math.round((expired/total)*100) : 0
                };
                // 4. Add Ons (sum revenue by add on name)
                const addOnSql = `
                    SELECT choose_add_on
                    FROM all_booking
                    WHERE choose_add_on IS NOT NULL AND choose_add_on != '' ${dateFilter()}
                `;
                con.query(addOnSql, [], (err4, addOnRows) => {
                    if (err4) return res.status(500).json({ error: 'Failed to fetch add ons' });
                    const addOnMap = {};
                    addOnRows.forEach(row => {
                        try {
                            if (!row.choose_add_on || typeof row.choose_add_on !== 'string' || row.choose_add_on.trim() === '') return;
                            const arr = JSON.parse(row.choose_add_on);
                            if (Array.isArray(arr)) {
                                arr.forEach(a => {
                                    if (!a.name || !a.price) return;
                                    if (!addOnMap[a.name]) addOnMap[a.name] = 0;
                                    addOnMap[a.name] += Number(a.price);
                                });
                            }
                        } catch (e) { console.error('AddOn JSON parse error:', e); }
                    });
                    const addOns = Object.entries(addOnMap).map(([name, value]) => ({ name, value: Math.round(value) }));
                    // 5. Sales by Location
                    const locSql = `
                        SELECT location, COUNT(*) as count
                        FROM all_booking
                        WHERE flight_date IS NOT NULL AND status IN ('Flown', 'Confirmed', 'Scheduled') ${dateFilter()}
                        GROUP BY location
                    `;
                    con.query(locSql, [], (err5, locRows) => {
                        if (err5) return res.status(500).json({ error: 'Failed to fetch sales by location' });
                        const totalLoc = locRows.reduce((sum, r) => sum + r.count, 0);
                        const salesByLocation = locRows.map(r => ({
                            location: r.location || 'Other',
                            percent: totalLoc ? Math.round((r.count/totalLoc)*100) : 0
                        }));
                        // 6. Sales by Booking Type
                        const typeSql = `
                            SELECT flight_type, COUNT(*) as count
                            FROM all_booking
                            WHERE flight_date IS NOT NULL AND status IN ('Flown', 'Confirmed', 'Scheduled') ${dateFilter()}
                            GROUP BY flight_type
                        `;
                        con.query(typeSql, [], (err6, typeRows) => {
                            if (err6) return res.status(500).json({ error: 'Failed to fetch sales by booking type' });
                            const totalType = typeRows.reduce((sum, r) => sum + r.count, 0);
                            const salesByBookingType = typeRows.map(r => ({
                                type: r.flight_type || 'Other',
                                percent: totalType ? Math.round((r.count/totalType)*100) : 0
                            }));
                            // 7. Liability by Location
                            const liabilityLocSql = `
                                SELECT location, SUM(paid) as value
                                FROM all_booking
                                WHERE paid IS NOT NULL AND paid > 0 ${dateFilter()}
                                GROUP BY location
                            `;
                            con.query(liabilityLocSql, [], (err7, liabLocRows) => {
                                if (err7) return res.status(500).json({ error: 'Failed to fetch liability by location' });
                                const liabilityByLocation = liabLocRows.map(r => ({
                                    location: r.location || 'Other',
                                    value: Math.round(r.value || 0)
                                }));
                                // 8. Liability by Flight Type
                                const liabilityTypeSql = `
                                    SELECT flight_type, SUM(paid) as value
                                    FROM all_booking
                                    WHERE paid IS NOT NULL AND paid > 0 ${dateFilter()}
                                    GROUP BY flight_type
                                `;
                                con.query(liabilityTypeSql, [], (err8, liabTypeRows) => {
                                    if (err8) return res.status(500).json({ error: 'Failed to fetch liability by flight type' });
                                    const liabilityByFlightType = liabTypeRows.map(r => ({
                                        type: r.flight_type || 'Other',
                                        value: Math.round(r.value || 0)
                                    }));
                                    // 9. Refundable Liability (paid for WX Refundable, not expired)
                                    const refundableSql = `
                                        SELECT choose_add_on, paid, status
                                        FROM all_booking
                                        WHERE paid IS NOT NULL AND paid > 0 AND status != 'Expired' ${dateFilter()}
                                    `;
                                    con.query(refundableSql, [], (err9, refRows) => {
                                        if (err9) return res.status(500).json({ error: 'Failed to fetch refundable liability' });
                                        let refundableLiability = 0;
                                        refRows.forEach(row => {
                                            try {
                                                if (!row.choose_add_on || typeof row.choose_add_on !== 'string' || row.choose_add_on.trim() === '') return;
                                                const arr = JSON.parse(row.choose_add_on);
                                                if (Array.isArray(arr)) {
                                                    arr.forEach(a => {
                                                        if (a.name && a.name.toLowerCase().includes('wx')) {
                                                            refundableLiability += Number(row.paid) - (Number(a.price) || 47.5);
                                                        }
                                                    });
                                                }
                                            } catch (e) { console.error('Refundable JSON parse error:', e); }
                                        });
                                        // 10. Flown Flights by Location (only after manifest date and not cancelled)
                                        const flownSql = `
                                            SELECT location, COUNT(*) as count
                                            FROM all_booking
                                            WHERE status != 'Cancelled' 
                                            AND flight_date IS NOT NULL 
                                            AND flight_date < CURDATE()
                                            ${dateFilter()}
                                            GROUP BY location
                                        `;
                                        con.query(flownSql, [], (err10, flownRows) => {
                                            if (err10) return res.status(500).json({ error: 'Failed to fetch flown flights by location' });
                                            const flownFlightsByLocation = flownRows.map(r => ({
                                                location: r.location || 'Other',
                                                count: r.count
                                            }));
                                            // Return all real analytics
                                            res.json({
                                                bookingAttempts,
                                                salesBySource,
                                                nonRedemption,
                                                addOns,
                                                salesByLocation,
                                                salesByBookingType,
                                                liabilityByLocation,
                                                liabilityByFlightType,
                                                refundableLiability: Math.round(refundableLiability),
                                                flownFlightsByLocation
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// Create Activity endpoint (with image upload)
app.post("/api/createActivity", upload.single('image'), (req, res) => {
    const { activity_name, shared_price, private_price, capacity, event_time, location, flight_type, status } = req.body;
    let image = null;
    if (req.file) {
        // Sunucuya göre path'i düzelt
        image = `/uploads/activities/${req.file.filename}`;
    }
    if (!activity_name || !shared_price || !private_price || !capacity || !event_time || !location || !flight_type || !status) {
        return res.status(400).json({ success: false, message: "Eksik bilgi!" });
    }
    const sql = `
        INSERT INTO activity (activity_name, shared_price, private_price, capacity, start_date, end_date, event_time, location, flight_type, status, image)
        VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?)
    `;
    con.query(sql, [activity_name, shared_price, private_price, capacity, event_time, location, flight_type, status, image], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Database error" });
        }
        res.json({ success: true, data: result });
    });
});

// Get single activity by id
app.get("/api/activity/:id", (req, res) => {
    const { id } = req.params;
    con.query("SELECT * FROM activity WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        if (!result || result.length === 0) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, data: result[0] });
    });
});

// Update activity by id (with image upload)
app.put("/api/activity/:id", upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { activity_name, shared_price, private_price, capacity, event_time, location, flight_type, status } = req.body;
    let image = null;
    if (req.file) {
        image = `/uploads/activities/${req.file.filename}`;
    }
    // Eğer yeni fotoğraf yoksa, mevcut image değerini koru
    const getImageSql = "SELECT image FROM activity WHERE id = ?";
    con.query(getImageSql, [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        const currentImage = result && result[0] ? result[0].image : null;
        const finalImage = image || currentImage;
        const sql = `
            UPDATE activity SET activity_name=?, shared_price=?, private_price=?, capacity=?, start_date=NULL, end_date=NULL, event_time=?, location=?, flight_type=?, status=?, image=?
            WHERE id=?
        `;
        con.query(sql, [activity_name, shared_price, private_price, capacity, event_time, location, flight_type, status, finalImage, id], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: "Database error" });
            res.json({ success: true, data: result });
        });
    });
});

// Get unique live locations from activity table (with image)
app.get('/api/activeLocations', (req, res) => {
    const sql = `
        SELECT a.id, a.location, a.image
        FROM activity a
        INNER JOIN (
            SELECT MIN(id) as min_id
            FROM activity
            WHERE status = 'Live'
            GROUP BY location
        ) b ON a.id = b.min_id
    `;
    con.query(sql, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        res.json({ success: true, data: result });
    });
});

// Get pricing information for a specific location
app.get('/api/locationPricing/:location', (req, res) => {
    const { location } = req.params;
    if (!location) return res.status(400).json({ success: false, message: 'Location is required' });
    
    const sql = `
        SELECT id, activity_name, shared_price, private_price, location, flight_type, status
        FROM activity 
        WHERE location = ? AND status = 'Live'
        ORDER BY id ASC
        LIMIT 1
    `;
    con.query(sql, [location], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        if (!result || result.length === 0) {
            return res.status(404).json({ success: false, message: "No pricing found for this location" });
        }
        res.json({ success: true, data: result[0] });
    });
});

// Create Availabilities for an activity
app.post('/api/activity/:id/availabilities', (req, res) => {
    const { id } = req.params;
    let availabilities = req.body.availabilities;
    if (!Array.isArray(availabilities)) {
        availabilities = [req.body];
    }
    if (!id || !availabilities.length) {
        return res.status(400).json({ success: false, message: 'Eksik bilgi!' });
    }
    const values = availabilities.map(a => [
        id,
        a.schedule || null,
        a.date,
        a.day_of_week,
        a.time,
        a.capacity,
        a.available,
        a.status,
        a.channels || 'All'
    ]);
    const sql = `
        INSERT INTO activity_availability
        (activity_id, schedule, date, day_of_week, time, capacity, available, status, channels)
        VALUES ?
    `;
    con.query(sql, [values], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }
        res.json({ success: true, data: result });
    });
});

// Get Availabilities for an activity
app.get('/api/activity/:id/availabilities', (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Eksik bilgi!' });
    // Join with activity to get location and flight_type
    const sql = `SELECT aa.*, a.location, a.flight_type FROM activity_availability aa JOIN activity a ON aa.activity_id = a.id WHERE aa.activity_id = ? ORDER BY aa.date, aa.time`;
    con.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err });
        
        // Normalize date format to YYYY-MM-DD
        const normalizedResult = result.map(row => ({
            ...row,
            date: row.date ? dayjs(row.date).format('YYYY-MM-DD') : row.date
        }));
        
        console.log('Availabilities for activity', id, ':', normalizedResult);
        res.json({ success: true, data: normalizedResult });
    });
});

// Get all activities (id, activity_name)
app.get('/api/activities', (req, res) => {
    const sql = 'SELECT id, activity_name FROM activity ORDER BY activity_name';
    con.query(sql, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err });
        res.json({ success: true, data: result });
    });
});

// Get all activities with location and pricing info for rebooking
app.get('/api/activitiesForRebook', (req, res) => {
    const sql = `
        SELECT id, activity_name, location, shared_price, private_price, flight_type, status 
        FROM activity 
        WHERE status = 'Live' 
        ORDER BY activity_name, location
    `;
    con.query(sql, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err });
        res.json({ success: true, data: result });
    });
});

// Update a single availability (only date)
app.put('/api/availability/:id', (req, res) => {
    const { id } = req.params;
    const { date } = req.body;
    if (!id || !date) return res.status(400).json({ success: false, message: 'Eksik bilgi!' });
    const sql = 'UPDATE activity_availability SET date = ? WHERE id = ?';
    con.query(sql, [date, id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err });
        res.json({ success: true, data: result });
    });
});

// Delete a single availability
app.delete('/api/availability/:id', (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Eksik bilgi!' });
    const sql = 'DELETE FROM activity_availability WHERE id = ?';
    con.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err });
        res.json({ success: true, data: result });
    });
});

// Update availability status (Open/Close)
app.patch('/api/availability/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!id || !status) {
        return res.status(400).json({ success: false, message: 'Missing availability id or status' });
    }
    
    if (status !== 'Open' && status !== 'Closed') {
        return res.status(400).json({ success: false, message: 'Status must be either "Open" or "Closed"' });
    }
    
    const sql = 'UPDATE activity_availability SET status = ? WHERE id = ?';
    con.query(sql, [status, id], (err, result) => {
        if (err) {
            console.error('Error updating availability status:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Availability not found' });
        }
        
        res.json({ 
            success: true, 
            message: `Availability status updated to ${status}`,
            data: { id, status }
        });
    });
});

// Get activity open availabilities
app.get('/api/activity/:id/open-availabilities', (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Eksik bilgi!' });
    // Sadece status = 'Open' olanları al
    const sql = 'SELECT date, time FROM activity_availability WHERE activity_id = ? AND status = "Open" ORDER BY date, time';
    con.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err });
        // Gün ve saatleri grupla
        const grouped = {};
        result.forEach(row => {
            if (!grouped[row.date]) grouped[row.date] = [];
            grouped[row.date].push(row.time);
        });
        // { date: '2025-07-03', times: ['09:00', '18:00'] } formatına çevir
        const data = Object.entries(grouped).map(([date, times]) => ({ date, times }));
        res.json({ success: true, data });
    });
});

// Add Date Request (POST)
app.post('/api/date-request', (req, res) => {
    const { name, phone, email, location, flight_type, requested_date } = req.body;
    if (!name || !email || !location || !flight_type || !requested_date) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const sql = 'INSERT INTO date_requests (name, phone, email, location, flight_type, requested_date) VALUES (?, ?, ?, ?, ?, ?)';
    con.query(sql, [name, phone, email, location, flight_type, requested_date], (err, result) => {
        if (err) {
            console.error('Error inserting date request:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, id: result.insertId });
    });
});

// List Date Requests (GET)
app.get('/api/date-requests', (req, res) => {
    const sql = 'SELECT * FROM date_requests ORDER BY created_at DESC';
    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching date requests:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, data: result });
    });
});

// Get Voucher Detail
app.get('/api/getVoucherDetail', async (req, res) => {
    const { voucher_ref, id } = req.query;
    if (!voucher_ref && !id) {
        // If no identifier, return minimal object
        return res.status(200).json({ success: true, voucher: {}, booking: null, passengers: [], notes: [] });
    }
    try {
        // 1. Voucher ana bilgileri
        const [voucherRows] = await new Promise((resolve, reject) => {
            con.query('SELECT * FROM all_vouchers WHERE ' + (voucher_ref ? 'voucher_ref = ?' : 'id = ?'), [voucher_ref || id], (err, rows) => {
                if (err) reject(err);
                else resolve([rows]);
            });
        });
        if (!voucherRows || voucherRows.length === 0) {
            // If not found, return minimal object with provided id or voucher_ref
            return res.status(200).json({ success: true, voucher: { id, voucher_ref }, booking: null, passengers: [], notes: [] });
        }
        const voucher = voucherRows[0];
        // 2. İlgili booking (varsa)
        let booking = null;
        let passengers = [];
        let notes = [];
        if (voucher.voucher_ref) {
            const [bookingRows] = await new Promise((resolve, reject) => {
                con.query('SELECT * FROM all_booking WHERE voucher_code = ?', [voucher.voucher_ref], (err, rows) => {
                    if (err) reject(err);
                    else resolve([rows]);
                });
            });
            if (bookingRows && bookingRows.length > 0) {
                booking = bookingRows[0];
                // 3. Passenger bilgileri
                const [passengerRows] = await new Promise((resolve, reject) => {
                    con.query('SELECT * FROM passenger WHERE booking_id = ?', [booking.id], (err, rows) => {
                        if (err) reject(err);
                        else resolve([rows]);
                    });
                });
                passengers = passengerRows;
                // 4. Notes (admin_notes)
                const [notesRows] = await new Promise((resolve, reject) => {
                    con.query('SELECT * FROM admin_notes WHERE booking_id = ?', [booking.id], (err, rows) => {
                        if (err) reject(err);
                        else resolve([rows]);
                    });
                });
                notes = notesRows;
            }
        }
        res.json({
            success: true,
            voucher,
            booking,
            passengers,
            notes
        });
    } catch (err) {
        console.error('Error fetching voucher detail:', err);
        res.status(500).json({ success: false, message: 'Database error', error: err.message });
    }
});

app.post("/api/getActivityId", (req, res) => {
    const { location } = req.body;
    if (!location) {
        return res.status(400).json({ success: false, message: "Eksik bilgi!" });
    }
    const sql = 'SELECT * FROM activity WHERE location = ? AND status = "Live"';
    con.query(sql, [location], (err, activities) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        if (!activities || activities.length === 0) return res.status(404).json({ success: false, message: "No activities found" });
        const activity = activities[0];
        // Şimdi availability'leri çek
        const availSql = 'SELECT id, DATE_FORMAT(date, "%Y-%m-%d") as date, time, capacity, available, status FROM activity_availability WHERE activity_id = ? AND status = "Open" AND date >= CURDATE() ORDER BY date, time';
        con.query(availSql, [activity.id], (err2, availabilities) => {
            if (err2) return res.status(500).json({ success: false, message: "Database error (availability)" });
            // date alanını DD/MM/YYYY formatına çevir
            const formattedAvail = availabilities.map(a => ({
                ...a,
                date: moment(a.date, "YYYY-MM-DD").format("YYYY-MM-DD")
            }));
            res.json({ success: true, activity, availabilities: formattedAvail });
        });
    });
});

// Delete an activity and its availabilities
app.delete('/api/activity/:id', (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Eksik bilgi!' });
    // Önce ilişkili availabilities silinsin
    const deleteAvailSql = 'DELETE FROM activity_availability WHERE activity_id = ?';
    con.query(deleteAvailSql, [id], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error (availabilities)' });
        // Sonra activity silinsin
        const deleteActivitySql = 'DELETE FROM activity WHERE id = ?';
        con.query(deleteActivitySql, [id], (err2) => {
            if (err2) return res.status(500).json({ success: false, message: 'Database error (activity)' });
            res.json({ success: true });
        });
    });
});

// Edit Admin Note
app.patch("/api/updateAdminNote", (req, res) => {
    const { id, note } = req.body;
    if (!id || !note) {
        return res.status(400).json({ success: false, message: "Missing id or note" });
    }
    const sql = "UPDATE admin_notes SET notes = ? WHERE id = ?";
    con.query(sql, [note, id], (err, result) => {
        if (err) {
            console.error("Error updating note:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        res.json({ success: true });
    });
});

// Update Voucher Field
app.patch("/api/updateVoucherField", (req, res) => {
    const { voucher_id, field, value } = req.body;
    if (!voucher_id || !field) {
        return res.status(400).json({ success: false, message: "Missing voucher_id or field" });
    }
    const sql = `UPDATE all_vouchers SET ${field} = ? WHERE id = ?`;
    con.query(sql, [value, voucher_id], (err, result) => {
        if (err) {
            console.error("Error updating voucher field:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        res.json({ success: true });
    });
});

// Delete Admin Note
app.delete("/api/deleteAdminNote", (req, res) => {
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ success: false, message: "Missing id" });
    }
    const sql = "DELETE FROM admin_notes WHERE id = ?";
    con.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Error deleting note:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        res.json({ success: true });
    });
});

// Update Manifest Status and Availability
app.patch("/api/updateManifestStatus", async (req, res) => {
    const { booking_id, new_status, old_status, flight_date, location, total_pax } = req.body;
    
    if (!booking_id || !new_status || !old_status || !flight_date || !location) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
        // 1. Update booking status
        const updateBookingSql = "UPDATE all_booking SET status = ? WHERE id = ?";
        await new Promise((resolve, reject) => {
            con.query(updateBookingSql, [new_status, booking_id], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        // 2. Get activity_id for the location
        const getActivitySql = "SELECT id FROM activity WHERE location = ? AND status = 'Live'";
        const [activityRows] = await new Promise((resolve, reject) => {
            con.query(getActivitySql, [location], (err, rows) => {
                if (err) reject(err);
                else resolve([rows]);
            });
        });

        if (!activityRows || activityRows.length === 0) {
            return res.status(404).json({ success: false, message: "Activity not found" });
        }

        const activity_id = activityRows[0].id;

        // 3. Format flight_date to match availability date and time
        let formattedDate = moment(flight_date).format('YYYY-MM-DD');
        let formattedTime = null;
        // Saat bilgisini flight_date'ten çek
        if (typeof flight_date === 'string' && flight_date.includes(' ')) {
            formattedTime = flight_date.split(' ')[1];
        } else if (typeof flight_date === 'string' && flight_date.length > 10) {
            formattedTime = flight_date.substring(11, 16); // 'YYYY-MM-DD HH:mm:ss' veya 'YYYY-MM-DD HH:mm'
        }

        // 4. Get pax (passenger count) for this booking (default 1)
        let pax = 1;
        if (typeof total_pax === 'number' && total_pax > 0) {
            pax = total_pax;
        } else {
            const [bookingRows] = await new Promise((resolve, reject) => {
                con.query('SELECT pax, flight_date FROM all_booking WHERE id = ?', [booking_id], (err, rows) => {
                    if (err) reject(err);
                    else resolve([rows]);
                });
            });
            if (bookingRows && bookingRows.length > 0) {
                pax = Number(bookingRows[0].pax) || 1;
                // Eğer booking'in flight_date'inde saat varsa onu kullan
                if (!formattedTime && bookingRows[0].flight_date) {
                    const fd = bookingRows[0].flight_date;
                    if (typeof fd === 'string' && fd.includes(' ')) {
                        formattedTime = fd.split(' ')[1];
                    } else if (typeof fd === 'string' && fd.length > 10) {
                        formattedTime = fd.substring(11, 16);
                    }
                }
            }
        }

        // 5. Get current availability (hem date hem time ile)
        let getAvailabilitySql = "SELECT available, capacity FROM activity_availability WHERE activity_id = ? AND date = ?";
        let getAvailabilityParams = [activity_id, formattedDate];
        if (formattedTime) {
            getAvailabilitySql += " AND time = ?";
            getAvailabilityParams.push(formattedTime);
        }
        const [availabilityRows] = await new Promise((resolve, reject) => {
            con.query(getAvailabilitySql, getAvailabilityParams, (err, rows) => {
                if (err) reject(err);
                else resolve([rows]);
            });
        });

        if (!availabilityRows || availabilityRows.length === 0) {
            return res.status(404).json({ success: false, message: "Availability not found" });
        }

        const currentAvailability = availabilityRows[0];
        let newAvailable = currentAvailability.available;

        // 6. Calculate new available count based on status change and pax
        if (old_status === 'Open' && new_status === 'Closed') {
            // From Open to Closed: decrease available by pax
            newAvailable = Math.max(0, currentAvailability.available - pax);
        } else if (old_status === 'Closed' && new_status === 'Open') {
            // From Closed to Open: increase available by pax
            newAvailable = Math.min(currentAvailability.capacity, currentAvailability.available + pax);
        }

        // 7. Update availability (hem date hem time ile)
        let updateAvailabilitySql = "UPDATE activity_availability SET available = ? WHERE activity_id = ? AND date = ?";
        let updateAvailabilityParams = [newAvailable, activity_id, formattedDate];
        if (formattedTime) {
            updateAvailabilitySql += " AND time = ?";
            updateAvailabilityParams.push(formattedTime);
        }
        await new Promise((resolve, reject) => {
            con.query(updateAvailabilitySql, updateAvailabilityParams, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        res.json({ 
            success: true, 
            message: "Status and availability updated successfully",
            newAvailable: newAvailable
        });

    } catch (err) {
        console.error("Error updating manifest status:", err);
        res.status(500).json({ success: false, message: "Database error", error: err.message });
    }
});

// Place this at the very end, after all API endpoints:
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
