/**
 * One-off: run sync_redeemed_booking_expires_from_vouchers.sql using server/.env DB_* vars.
 * Usage: node scripts/run-sync-redeemed-booking-expires.js
 */
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const sqlPath = path.join(__dirname, '..', 'sync_redeemed_booking_expires_from_vouchers.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: false
});

con.query(sql, (err, result) => {
    if (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
    console.log('OK. affectedRows:', result.affectedRows);
    con.end();
    process.exit(0);
});
