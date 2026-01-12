const fs = require('fs');

const allBookingData = JSON.parse(fs.readFileSync('server/uploads/email/allBooking.json', 'utf8'));
const reference = JSON.parse(fs.readFileSync('server/uploads/email/reference.json', 'utf8'));

function parseDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') return null;
    
    // Try to parse various formats
    try {
        // Format: "Tue, 23 Jan 2024 10:19:43 +0000"
        if (dateStr.includes(',')) {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toISOString().slice(0, 19).replace('T', ' ');
            }
        }
        
        // Format: "Monday, 12 May 2025 11:20:39 GMT"
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
    const lower = expType.toLowerCase();
    if (lower.includes('private')) return 'Private Charter';
    return 'Shared Flight';
}

function mapVoucherType(vType) {
    if (!vType) return null;
    return vType.trim();
}

function parsePaid(paidStr) {
    if (!paidStr) return 0;
    const cleaned = paidStr.replace(/[£\s\t]/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

function parseDue(dueStr) {
    if (!dueStr || dueStr.trim() === '') return 0;
    const cleaned = dueStr.replace(/[£\s\t]/g, '').trim();
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

const inserts = [];
allBookingData.forEach((item, index) => {
    const createdAt = parseDate(item['Created Date']);
    const firstName = (item['Customer First Name'] || '').trim();
    const lastName = (item['Customer Last Name'] || '').trim();
    const fullName = (firstName + ' ' + lastName).trim() || null;
    const pax = parseInt(item['Pax Count']) || 1;
    const customerEmail = item['Customer Email'] || null;
    const customerPhone = formatPhone(item['Customer Phone']);
    const bookingId = item['Booking ID'] || null;
    
    // Mevcut booking'i bulmak için WHERE koşulları
    // name, email ve created_at ile eşleştirme yapıyoruz
    const whereConditions = [];
    if (fullName) {
        whereConditions.push(`name = ${escapeSQL(fullName)}`);
    }
    if (customerEmail) {
        whereConditions.push(`email = ${escapeSQL(customerEmail)}`);
    }
    if (createdAt) {
        whereConditions.push(`DATE(created_at) = DATE(${escapeSQL(createdAt)})`);
    }
    
    if (whereConditions.length === 0) {
        console.warn(`Skipping item ${index}: No matching criteria`);
        return;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // 1. voucher_codes tablosuna Booking ID ekle (eğer yoksa)
    // Bu foreign key constraint'i karşılamak için gerekli
    if (bookingId) {
        // INSERT IGNORE kullanarak duplicate hatalarını önle
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
    ${escapeSQL(bookingId)},
    ${escapeSQL(`Booking Reference: ${bookingId}`)},
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);`;
        inserts.push(insertVoucherCodeSql);
        
        // 2. voucher_code UPDATE - Booking ID'yi voucher_code olarak güncelle
        const updateVoucherCodeSql = `UPDATE trip_booking.all_booking
SET voucher_code = ${escapeSQL(bookingId)}
WHERE ${whereClause}
  AND (voucher_code IS NULL OR voucher_code = '')
LIMIT 1;`;
        inserts.push(updateVoucherCodeSql);
    }
    
    // 2. Mevcut booking'i bul ve passenger kayıtlarını ekle
    // Her booking için pax sayısı kadar passenger oluştur
    // Sadece o booking'de passenger sayısı pax'tan azsa ekle
    // Her passenger için ayrı INSERT yapıyoruz (hepsi aynı booking_id'yi kullanacak)
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
WHERE ${whereClause}
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < ${pax}
LIMIT 1;`;
        inserts.push(passengerSql);
    }
    
    inserts.push(''); // Boş satır ekle
});

fs.writeFileSync('insert_all_bookings.sql', inserts.join('\n\n'));
console.log(`Generated ${inserts.length} INSERT statements in insert_all_bookings.sql`);
