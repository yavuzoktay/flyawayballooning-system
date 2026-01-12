const fs = require('fs');

const allBookingData = JSON.parse(fs.readFileSync('server/uploads/email/allBooking.json', 'utf8'));
const reference = JSON.parse(fs.readFileSync('server/uploads/email/reference.json', 'utf8'));

function parseDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') return null;
    
    // Try to parse various formats
    try {
        // Format: "Thu, 04 Jul 2024 10:45:30 +0000"
        if (dateStr.includes(',')) {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toISOString().slice(0, 19).replace('T', ' ');
            }
        }
        
        // Format: "Saturday, 7 December 2024 10:37:51 GMT"
        if (dateStr.includes('GMT')) {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toISOString().slice(0, 19).replace('T', ' ');
            }
        }
        
        // Already in YYYY-MM-DD HH:mm:ss format
        if (dateStr.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)) {
            return dateStr;
        }
    } catch (e) {
        console.error('Date parse error:', dateStr, e);
    }
    
    return null;
}

function addMonths(dateStr, months) {
    if (!dateStr) return null;
    try {
        // Parse the date string and extract components
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        
        // Get UTC components to preserve the exact time
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        const day = date.getUTCDate();
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const seconds = date.getUTCSeconds();
        
        // Add 18 months
        const newDate = new Date(Date.UTC(year, month + months, day, hours, minutes, seconds));
        return newDate.toISOString().slice(0, 19).replace('T', ' ');
    } catch (e) {
        return null;
    }
}

function escapeSQL(str) {
    if (str === null || str === undefined || str === '') return 'NULL';
    if (typeof str === 'number') return str;
    return "'" + String(str).replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
}

function mapExperienceType(expType) {
    if (!expType) return 'Shared Flight';
    const lower = expType.toLowerCase().trim();
    if (lower.includes('private')) return 'Private Charter';
    return 'Shared Flight';
}

function mapVoucherType(vType) {
    if (!vType) return null;
    return vType.trim();
}

function parsePaid(paidStr) {
    if (!paidStr) return 0;
    // Handle both comma and dot as decimal separator
    const cleaned = paidStr.replace(/[£\s\t]/g, '').trim().replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

function formatPhone(phone) {
    if (!phone) return null;
    const phoneStr = String(phone).trim();
    if (phoneStr.startsWith('+')) return phoneStr;
    if (phoneStr.length > 0) return '+' + phoneStr;
    return null;
}

function cleanLocation(location) {
    if (!location || location.trim() === '' || location.trim() === '-') return null;
    return location.trim();
}

const inserts = [];
allBookingData.forEach((item, index) => {
    const createdAt = parseDate(item['Created At']);
    const expires = createdAt ? addMonths(createdAt, 18) : null;
    const firstName = (item['Customer First Name'] || '').trim();
    const lastName = (item['Customer Last Name'] || '').trim();
    const fullName = (firstName + ' ' + lastName).trim() || null;
    const paid = parsePaid(item['Paid']);
    const due = 0; // Due bilgisi yok, 0 olarak ayarla
    const pax = parseInt(item['Pax Count']) || 1;
    const experienceType = mapExperienceType(item['Experience Type']);
    const voucherType = mapVoucherType(item['Voucher Type']);
    const location = cleanLocation(item['Experience Name']);
    const customerEmail = item['Customer Email'] || null;
    const customerPhone = formatPhone(item['Customer Phone']);
    const confirmationCode = item['Confirmation Code'] || null;
    
    // 1. voucher_codes tablosuna Confirmation Code ekle (eğer yoksa)
    // Bu foreign key constraint'i karşılamak için gerekli
    if (confirmationCode) {
        const insertVoucherCodeSql = `INSERT IGNORE INTO trip_booking.voucher_codes (
    code,
    title,
    valid_from,
    valid_until,
    max_uses,
    current_uses,
    is_active,
    created_by
) VALUES (
    ${escapeSQL(confirmationCode)},
    ${escapeSQL(`Booking Reference: ${confirmationCode}`)},
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);`;
        inserts.push(insertVoucherCodeSql);
    }
    
    // 2. Booking INSERT
    const bookingSql = `INSERT INTO trip_booking.all_booking (
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
    manual_status_override,
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
    preferred_day,
    flight_attempts,
    activity_id,
    time_slot,
    experience,
    voucher_type,
    voucher_type_detail,
    voucher_discount,
    original_amount,
    add_to_booking_items_total_price,
    weather_refund_total_price,
    current_total_price,
    flight_type_source,
    resources,
    google_calendar_event_id
) VALUES (
    ${escapeSQL(fullName)},
    ${escapeSQL(experienceType)},
    NULL,
    ${pax},
    ${escapeSQL(location)},
    'Confirmed',
    ${paid},
    ${due},
    ${escapeSQL(confirmationCode)},
    ${escapeSQL(createdAt)},
    ${escapeSQL(expires)},
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    ${escapeSQL(customerEmail)},
    ${escapeSQL(customerPhone)},
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    NULL,
    ${escapeSQL(experienceType)},
    ${escapeSQL(voucherType)},
    NULL,
    0.00,
    NULL,
    0.00,
    0.00,
    NULL,
    ${escapeSQL(experienceType)},
    NULL,
    NULL
);`;
    
    inserts.push(bookingSql);
    
    // 3. Passenger INSERT'leri - her booking için pax sayısı kadar passenger oluştur
    // Booking'i WHERE koşullarıyla bulup ID'sini kullanıyoruz (LAST_INSERT_ID() güvenilir değil)
    const passengerWhereConditions = [];
    if (fullName) {
        passengerWhereConditions.push(`ab.name = ${escapeSQL(fullName)}`);
    }
    if (customerEmail) {
        passengerWhereConditions.push(`ab.email = ${escapeSQL(customerEmail)}`);
    }
    if (createdAt) {
        passengerWhereConditions.push(`DATE(ab.created_at) = DATE(${escapeSQL(createdAt)})`);
    }
    if (confirmationCode) {
        passengerWhereConditions.push(`ab.voucher_code = ${escapeSQL(confirmationCode)}`);
    }
    
    const passengerWhereClause = passengerWhereConditions.join(' AND ');
    
    for (let i = 0; i < pax; i++) {
        const passengerSql = `INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    ${escapeSQL(firstName || 'Passenger')},
    ${escapeSQL(lastName || String(i + 1))},
    NULL,
    ${escapeSQL(customerEmail)},
    ${escapeSQL(customerPhone)},
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ${passengerWhereClause}
LIMIT 1;`;
        inserts.push(passengerSql);
    }
    
    inserts.push(''); // Boş satır ekle
});

fs.writeFileSync('insert_new_bookings.sql', inserts.join('\n\n'));
console.log(`Generated ${inserts.length} statements in insert_new_bookings.sql`);
console.log(`Total bookings: ${allBookingData.length}`);
