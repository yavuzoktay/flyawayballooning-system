const mysql = require('mysql2/promise');

// Database connection configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'flyawayballooning'
};

async function fixJourneyTypes() {
    let connection;
    
    try {
        // Connect to database
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database');
        
        // First, let's see what broken data we have
        console.log('\n=== CHECKING BROKEN DATA ===');
        const [brokenData] = await connection.execute(`
            SELECT id, question_text, journey_types 
            FROM additional_information_questions 
            WHERE journey_types IS NOT NULL 
            AND journey_types NOT LIKE '["%"]'
            AND journey_types NOT LIKE '[]'
            AND JSON_VALID(journey_types) = 0
            LIMIT 10
        `);
        
        console.log('Broken records found:', brokenData.length);
        brokenData.forEach(record => {
            console.log(`ID: ${record.id}, Text: ${record.question_text.substring(0, 50)}..., Journey Types: ${record.journey_types}`);
        });
        
        // Check for specific problematic records (13, 14, 16)
        console.log('\n=== CHECKING SPECIFIC RECORDS ===');
        const [specificRecords] = await connection.execute(`
            SELECT id, question_text, journey_types, JSON_VALID(journey_types) as is_valid
            FROM additional_information_questions 
            WHERE id IN (13, 14, 16)
            ORDER BY id
        `);
        
        specificRecords.forEach(record => {
            console.log(`ID: ${record.id}, Valid JSON: ${record.is_valid}, Journey Types: ${record.journey_types}`);
        });
        
        // Fix the broken journey_types data
        console.log('\n=== FIXING BROKEN DATA ===');
        const [updateResult] = await connection.execute(`
            UPDATE additional_information_questions 
            SET journey_types = '["Book Flight", "Flight Voucher", "Redeem Voucher", "Buy Gift"]'
            WHERE journey_types IS NULL 
            OR journey_types = ''
            OR journey_types NOT LIKE '["%"]'
            OR journey_types NOT LIKE '[]'
            OR journey_types LIKE '%Book Fligh%'
            OR journey_types LIKE '%Book Flight%'
            OR JSON_VALID(journey_types) = 0
        `);
        
        console.log(`Updated ${updateResult.affectedRows} records`);
        
        // Verify the fix
        console.log('\n=== VERIFICATION ===');
        const [fixedRecords] = await connection.execute(`
            SELECT id, question_text, journey_types, JSON_VALID(journey_types) as is_valid
            FROM additional_information_questions 
            WHERE id IN (13, 14, 16)
            ORDER BY id
        `);
        
        fixedRecords.forEach(record => {
            console.log(`ID: ${record.id}, Valid JSON: ${record.is_valid}, Journey Types: ${record.journey_types}`);
        });
        
        // Check all journey_types are now valid JSON
        const [allValid] = await connection.execute(`
            SELECT COUNT(*) as total, 
                   SUM(CASE WHEN JSON_VALID(journey_types) = 1 THEN 1 ELSE 0 END) as valid_count
            FROM additional_information_questions 
            WHERE journey_types IS NOT NULL
        `);
        
        console.log(`\nTotal records with journey_types: ${allValid[0].total}`);
        console.log(`Valid JSON records: ${allValid[0].valid_count}`);
        
        if (allValid[0].total === allValid[0].valid_count) {
            console.log('✅ All journey_types are now valid JSON!');
        } else {
            console.log('❌ Some records still have invalid JSON');
        }
        
    } catch (error) {
        console.error('Error fixing journey_types:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed');
        }
    }
}

// Run the fix
fixJourneyTypes();
