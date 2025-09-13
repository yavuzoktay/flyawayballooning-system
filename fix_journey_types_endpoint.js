// Add this endpoint to the existing server to fix journey_types
// This can be called via HTTP request

const fixJourneyTypesEndpoint = async (req, res) => {
    try {
        console.log('=== FIXING JOURNEY_TYPES DATA ===');
        
        // First, check what broken data we have
        const [brokenData] = await new Promise((resolve, reject) => {
            con.query(`
                SELECT id, question_text, journey_types 
                FROM additional_information_questions 
                WHERE journey_types IS NOT NULL 
                AND journey_types NOT LIKE '["%"]'
                AND journey_types NOT LIKE '[]'
                AND JSON_VALID(journey_types) = 0
                LIMIT 10
            `, (err, result) => {
                if (err) reject(err);
                else resolve([result]);
            });
        });
        
        console.log('Broken records found:', brokenData.length);
        brokenData.forEach(record => {
            console.log(`ID: ${record.id}, Text: ${record.question_text.substring(0, 50)}..., Journey Types: ${record.journey_types}`);
        });
        
        // Check specific problematic records (13, 14, 16)
        const [specificRecords] = await new Promise((resolve, reject) => {
            con.query(`
                SELECT id, question_text, journey_types, JSON_VALID(journey_types) as is_valid
                FROM additional_information_questions 
                WHERE id IN (13, 14, 16)
                ORDER BY id
            `, (err, result) => {
                if (err) reject(err);
                else resolve([result]);
            });
        });
        
        console.log('Specific records before fix:');
        specificRecords.forEach(record => {
            console.log(`ID: ${record.id}, Valid JSON: ${record.is_valid}, Journey Types: ${record.journey_types}`);
        });
        
        // Fix the broken journey_types data
        const [updateResult] = await new Promise((resolve, reject) => {
            con.query(`
                UPDATE additional_information_questions 
                SET journey_types = '["Book Flight", "Flight Voucher", "Redeem Voucher", "Buy Gift"]'
                WHERE journey_types IS NULL 
                OR journey_types = ''
                OR journey_types NOT LIKE '["%"]'
                OR journey_types NOT LIKE '[]'
                OR journey_types LIKE '%Book Fligh%'
                OR journey_types LIKE '%Book Flight%'
                OR JSON_VALID(journey_types) = 0
            `, (err, result) => {
                if (err) reject(err);
                else resolve([result]);
            });
        });
        
        console.log(`Updated ${updateResult.affectedRows} records`);
        
        // Verify the fix
        const [fixedRecords] = await new Promise((resolve, reject) => {
            con.query(`
                SELECT id, question_text, journey_types, JSON_VALID(journey_types) as is_valid
                FROM additional_information_questions 
                WHERE id IN (13, 14, 16)
                ORDER BY id
            `, (err, result) => {
                if (err) reject(err);
                else resolve([result]);
            });
        });
        
        console.log('Specific records after fix:');
        fixedRecords.forEach(record => {
            console.log(`ID: ${record.id}, Valid JSON: ${record.is_valid}, Journey Types: ${record.journey_types}`);
        });
        
        // Check all journey_types are now valid JSON
        const [allValid] = await new Promise((resolve, reject) => {
            con.query(`
                SELECT COUNT(*) as total, 
                       SUM(CASE WHEN JSON_VALID(journey_types) = 1 THEN 1 ELSE 0 END) as valid_count
                FROM additional_information_questions 
                WHERE journey_types IS NOT NULL
            `, (err, result) => {
                if (err) reject(err);
                else resolve([result]);
            });
        });
        
        console.log(`Total records with journey_types: ${allValid[0].total}`);
        console.log(`Valid JSON records: ${allValid[0].valid_count}`);
        
        const success = allValid[0].total === allValid[0].valid_count;
        
        res.json({
            success: success,
            message: success ? 'All journey_types are now valid JSON!' : 'Some records still have invalid JSON',
            updatedRecords: updateResult.affectedRows,
            totalRecords: allValid[0].total,
            validRecords: allValid[0].valid_count
        });
        
    } catch (error) {
        console.error('Error fixing journey_types:', error);
        res.status(500).json({
            success: false,
            message: 'Error fixing journey_types',
            error: error.message
        });
    }
};

module.exports = fixJourneyTypesEndpoint;
