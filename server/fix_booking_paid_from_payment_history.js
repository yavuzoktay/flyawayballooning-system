const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function main() {
    const shouldApply = process.argv.includes('--apply');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'trip-booking-database.c9mqyasow9hg.us-east-1.rds.amazonaws.com',
        user: process.env.DB_USER || 'admin',
        password: process.env.DB_PASSWORD || 'qumton-jeghuz-doKxy3',
        database: process.env.DB_NAME || 'trip_booking'
    });

    const [rows] = await connection.query(`
        SELECT
            ab.id,
            DATE_FORMAT(ab.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
            ab.name,
            ab.paid AS current_paid,
            ph.payment_history_paid,
            ab.stripe_session_id
        FROM all_booking ab
        INNER JOIN (
            SELECT booking_id, ROUND(SUM(amount), 2) AS payment_history_paid
            FROM payment_history
            WHERE booking_id IS NOT NULL
            GROUP BY booking_id
        ) ph ON ph.booking_id = ab.id
        WHERE ABS(COALESCE(ab.paid, 0) - ph.payment_history_paid) > 0.009
        ORDER BY ab.created_at DESC
    `);

    console.log(`Found ${rows.length} booking row(s) with paid mismatches.`);
    if (rows.length > 0) {
        console.table(rows);
    }

    if (!shouldApply || rows.length === 0) {
        await connection.end();
        return;
    }

    for (const row of rows) {
        await connection.query(
            'UPDATE all_booking SET paid = ? WHERE id = ?',
            [row.payment_history_paid, row.id]
        );
    }

    console.log(`Applied ${rows.length} booking paid update(s).`);
    await connection.end();
}

main().catch((error) => {
    console.error('Failed to sync booking paid values from payment_history:', error);
    process.exit(1);
});
