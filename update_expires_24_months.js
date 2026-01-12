const fs = require('fs');

// Read JSON file
const jsonData = JSON.parse(fs.readFileSync('./server/uploads/email/123.json', 'utf8'));

// Generate UPDATE statements
let updateStatements = [];
updateStatements.push('SET SQL_SAFE_UPDATES = 0;');
updateStatements.push('');
updateStatements.push('-- Update expires to created_at + 24 months for all bookings in 123.json');
updateStatements.push('');

jsonData.forEach((item) => {
    if (item.id && item.created_at) {
        // Parse created_at date
        const createdDate = new Date(item.created_at);
        
        // Add 24 months
        const expiresDate = new Date(createdDate);
        expiresDate.setMonth(expiresDate.getMonth() + 24);
        
        // Format as MySQL datetime
        const expiresFormatted = expiresDate.toISOString().slice(0, 19).replace('T', ' ');
        
        updateStatements.push(`UPDATE trip_booking.all_booking SET expires = '${expiresFormatted}' WHERE id = ${item.id};`);
    }
});

updateStatements.push('');
updateStatements.push('SET SQL_SAFE_UPDATES = 1;');

// Write to file
fs.writeFileSync('./update_expires_24_months.sql', updateStatements.join('\n'));
console.log(`Generated ${updateStatements.length - 4} UPDATE statements`);
console.log('SQL file created: update_expires_24_months.sql');
