require('dotenv').config();
console.log('Server starting - deployment test');
console.log('Deployment timestamp:', new Date().toISOString());
console.log('Deployment ID: STRIPE_FIXED_' + Date.now());
console.log('FINAL_DEPLOYMENT_TEST_' + Math.random());
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
const axios = require('axios');
const sgMail = require('@sendgrid/mail');
const { EventWebhook, EventWebhookHeader } = require('@sendgrid/eventwebhook');
const Twilio = require('twilio');
dotenv.config();

// Configure SendGrid
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
    console.warn('SENDGRID_API_KEY not found in environment variables');
}



// Middleware
// Capture raw body for webhook signature verification
app.use(express.json({
    verify: (req, res, buf) => {
        try { req.rawBody = buf.toString('utf8'); } catch (e) { /* ignore */ }
    }
}));
app.use(express.urlencoded({ extended: true }));

// Cache control middleware for all routes
app.use((req, res, next) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    next();
});

// Availability Hold System
// Store holds in memory (in production, use Redis or database)
const availabilityHolds = new Map();

// Clean up expired holds every minute
setInterval(() => {
    const now = Date.now();
    for (const [key, hold] of availabilityHolds.entries()) {
        if (now > hold.expiresAt) {
            console.log(`🔄 Cleaning up expired hold for ${key}`);
            availabilityHolds.delete(key);
        }
    }
}, 60000); // Check every minute

// Stripe configuration - environment-based keys
const isProduction = process.env.NODE_ENV === 'production';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

console.log('Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
console.log('Stripe secret key loaded:', stripeSecretKey ? 'YES' : 'NO');
console.log('Stripe key type:', stripeSecretKey?.startsWith('sk_live_') ? 'LIVE' : 'TEST');
console.log('Stripe secret key (first 10 chars):', stripeSecretKey ? stripeSecretKey.substring(0, 10) + '...' : 'NOT SET');

if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY environment variable is not set');
}
const stripe = require('stripe')(stripeSecretKey, {
    apiVersion: '2020-08-27'
});

// Create a write stream for logging
const logStream = fs.createWriteStream(path.join(__dirname, 'server.log'), { flags: 'a' });

// Helper function to log to file with timestamp
function logToFile(message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    if (data) {
        logStream.write(logMessage + JSON.stringify(data, null, 2) + '\n\n');
    } else {
        logStream.write(logMessage);
    }
}

// Enable CORS
app.use(cors({
    origin: [
        'https://flyawayballooning-book.com', 
        'http://flyawayballooning-book.com',
        'https://flyawayballooning-system.com', 
        'http://flyawayballooning-system.com',
        'http://localhost:3000', 
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3004',
        'http://localhost:3006',
        'http://34.205.25.8:3002'
    ],
    methods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Cache-Control',
        'Pragma'
    ],
    credentials: true
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ===== VOUCHER CODE API ENDPOINTS =====

// Generate automatic voucher code for Flight Voucher bookings
app.post('/api/generate-voucher-code', async (req, res) => {
    const {
        flight_category,
        customer_name,
        customer_email,
        location,
        experience_type,
        voucher_type,
        paid_amount,
        expires_date
    } = req.body;

    try {
        // Check for existing voucher code for same customer to prevent duplicates
        const duplicateCheck = () => {
            return new Promise((resolve, reject) => {
                if (voucher_type === 'Book Flight') {
                    // Check in all_booking table
                    const duplicateCheckSql = `
                        SELECT voucher_code as code FROM all_booking 
                        WHERE email = ? AND name = ? AND paid = ? 
                        AND created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE) 
                        LIMIT 1
                    `;
                    con.query(duplicateCheckSql, [customer_email, customer_name, paid_amount], (err, result) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    });
                } else {
                    // Check in all_vouchers table
                    const duplicateCheckSql = `
                        SELECT voucher_ref as code FROM all_vouchers 
                        WHERE email = ? AND name = ? AND paid = ? 
                        AND created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE) 
                        LIMIT 1
                    `;
                    con.query(duplicateCheckSql, [customer_email, customer_name, paid_amount], (err, result) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    });
                }
            });
        };
        
        // Check for recent duplicates first - only prevent if there's already a NON-NULL code
        const existingCode = await duplicateCheck();
        if (existingCode && existingCode.length > 0 && existingCode[0].code) {
            console.log('=== DUPLICATE VOUCHER CODE GENERATION PREVENTED ===');
            console.log('Existing code found:', existingCode[0].code);
            console.log('Customer:', customer_name, 'Email:', customer_email, 'Amount:', paid_amount);
            return res.json({
                success: true,
                message: 'Voucher code already exists for this customer',
                voucher_code: existingCode[0].code,
                duplicate_prevented: true
            });
        }
        
        console.log('=== NO EXISTING VOUCHER CODE FOUND ===');
        console.log('Proceeding with new voucher code generation for:', customer_name);
        
        // Generate voucher code based on the pattern: F/G + Category + Year + Serial
        const year = new Date().getFullYear().toString().slice(-2); // Get last 2 digits of year (25 for 2025)
        
        // Map flight categories to codes
        const categoryMap = {
            'Weekday Morning': 'WM',
            'Weekday Flex': 'WF', 
            'Anytime': 'AT',
            'Any Day Flight': 'AT' // Default mapping
        };
        
        // Determine flight category based on voucher type if not provided
        let finalFlightCategory = flight_category;
        console.log('Received flight_category:', flight_category);
        console.log('Received voucher_type:', voucher_type);
        
        if (!finalFlightCategory && voucher_type) {
            // If voucher type is provided but flight category is not, try to determine from voucher type
            if (voucher_type === 'Book Flight' || voucher_type === 'Flight Voucher' || voucher_type === 'Buy Gift') {
                // For these types, we need to get the flight category from the request
                // This will be handled by the frontend sending the correct voucher type detail
                finalFlightCategory = 'Any Day Flight'; // Default fallback
            }
        }
        
        console.log('Final Flight Category:', finalFlightCategory);
        const categoryCode = categoryMap[finalFlightCategory] || 'AT';
        console.log('Generated Category Code:', categoryCode);
        
        // Determine prefix based on voucher type
        let prefix = 'F'; // Default for Flight Voucher
        if (voucher_type === 'Buy Gift' || voucher_type === 'Gift Voucher') {
            prefix = 'G';
        } else if (voucher_type === 'Book Flight') {
            prefix = 'B';
        }
        
        // Generate unique serial (3 characters)
        const generateSerial = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < 3; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };
        
        // Generate unique voucher code
        let voucherCode;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;
        
        // Use async/await pattern for database operations
        const generateUniqueCode = async () => {
            while (!isUnique && attempts < maxAttempts) {
                const serial = generateSerial();
                voucherCode = `${prefix}${categoryCode}${year}${serial}`;
                
                // Check if code already exists in both tables
                const checkCode = () => {
                    return new Promise((resolve, reject) => {
                        const checkSql = `
                            SELECT id FROM all_vouchers WHERE voucher_ref = ?
                            UNION
                            SELECT id FROM all_booking WHERE voucher_code = ?
                        `;
                        con.query(checkSql, [voucherCode, voucherCode], (err, result) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(result.length === 0);
                            }
                        });
                    });
                };
                
                try {
                    const codeAvailable = await checkCode();
                    if (codeAvailable) {
                        isUnique = true;
                        break;
                    }
                } catch (err) {
                    console.error('Error checking voucher code uniqueness:', err);
                    return res.status(500).json({ success: false, message: 'Database error' });
                }
                
                attempts++;
            }
            
            if (!isUnique) {
                return res.status(500).json({ success: false, message: 'Could not generate unique voucher code' });
            }
        };
        
        // Generate the unique code
        await generateUniqueCode();
        
        // Create title for the voucher code
        const title = `${customer_name} - ${flight_category} - ${location}`;
        
        // Handle different voucher types
        console.log('=== VOUCHER CODE UPDATE ===');
        console.log('Voucher type:', voucher_type);
        console.log('Looking for record with customer:', customer_name, customer_email, paid_amount);
        
        const findAndUpdateRecord = () => {
            return new Promise((resolve, reject) => {
                if (voucher_type === 'Book Flight') {
                    // For Book Flight, update the booking record
                    console.log('=== FINDING BOOKING RECORD TO UPDATE ===');
                    console.log('Searching for booking with:', {
                        customer_name,
                        customer_email,
                        paid_amount
                    });
                    
                    const findSql = `
                        SELECT id FROM all_booking 
                        WHERE name = ? AND email = ? AND paid = ? 
                        AND (voucher_code IS NULL OR voucher_code = '') 
                        ORDER BY created_at DESC 
                        LIMIT 1
                    `;
                    
                    con.query(findSql, [customer_name, customer_email, paid_amount], (err, findResult) => {
                        if (err) {
                            console.error('Error finding booking record:', err);
                            reject(err);
                            return;
                        }
                        
                        console.log('Found booking records:', findResult.length);
                        console.log('Booking records:', findResult);
                        
                        if (findResult.length === 0) {
                            console.log('No booking found with exact match, trying broader search...');
                            
                            // Try broader search without exact paid amount match
                            const broaderSql = `
                                SELECT id FROM all_booking 
                                WHERE name = ? AND email = ? 
                                AND (voucher_code IS NULL OR voucher_code = '') 
                                ORDER BY created_at DESC 
                                LIMIT 1
                            `;
                            
                            con.query(broaderSql, [customer_name, customer_email], (broaderErr, broaderResult) => {
                                if (broaderErr) {
                                    console.error('Error in broader search:', broaderErr);
                                    reject(new Error('No booking found to update with code'));
                                    return;
                                }
                                
                                if (broaderResult.length === 0) {
                                    console.log('No booking found even with broader search');
                                    reject(new Error('No booking found to update with code'));
                                    return;
                                }
                                
                                const bookingId = broaderResult[0].id;
                                console.log('Found booking ID with broader search:', bookingId);
                                
                                // Update the booking with the generated code
                                const updateSql = 'UPDATE all_booking SET voucher_code = ? WHERE id = ?';
                                con.query(updateSql, [voucherCode, bookingId], (updateErr, updateResult) => {
                                    if (updateErr) {
                                        console.error('Error updating booking:', updateErr);
                                        reject(updateErr);
                                    } else {
                                        console.log('Booking updated with code:', voucherCode);
                                        resolve({ recordId: bookingId, voucherCode });
                                    }
                                });
                            });
                            return;
                        }
                        
                        const bookingId = findResult[0].id;
                        console.log('Found booking ID to update:', bookingId);
                        
                        // Update the booking with the generated code
                        const updateSql = 'UPDATE all_booking SET voucher_code = ? WHERE id = ?';
                        con.query(updateSql, [voucherCode, bookingId], (updateErr, updateResult) => {
                            if (updateErr) {
                                console.error('Error updating booking:', updateErr);
                                reject(updateErr);
                            } else {
                                console.log('Booking updated with code:', voucherCode);
                                resolve({ recordId: bookingId, voucherCode });
                            }
                        });
                    });
                } else {
                    // For Gift Vouchers, update the voucher record
                    console.log('Updating voucher record with voucher code');
                    const findSql = `
                        SELECT id FROM all_vouchers 
                        WHERE name = ? AND email = ? AND paid = ? 
                        AND (voucher_ref IS NULL OR voucher_ref = '') 
                        ORDER BY created_at DESC 
                        LIMIT 1
                    `;
                    
                    con.query(findSql, [customer_name, customer_email, paid_amount], (err, findResult) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        if (findResult.length === 0) {
                            reject(new Error('No voucher found to update with code'));
                            return;
                        }
                        
                        const voucherId = findResult[0].id;
                        console.log('Found voucher ID to update:', voucherId);
                        
                        // Update the voucher with the generated code
                        const updateSql = 'UPDATE all_vouchers SET voucher_ref = ? WHERE id = ?';
                        con.query(updateSql, [voucherCode, voucherId], (updateErr, updateResult) => {
                            if (updateErr) {
                                reject(updateErr);
                            } else {
                                console.log('Voucher updated with code:', voucherCode);
                                resolve({ recordId: voucherId, voucherCode });
                            }
                        });
                    });
                }
            });
        };
        
        try {
            const result = await findAndUpdateRecord();

            // Ensure the generated code shows in settings as user_generated
            const defaultExpiryDate = (expires_date && expires_date !== '')
                ? expires_date
                : dayjs().add((experience_type === 'Private Charter' ? 18 : 24), 'month').format('YYYY-MM-DD');
            const insertUserCodeSql = `
                INSERT INTO voucher_codes (
                    code, title, valid_from, valid_until, max_uses, current_uses,
                    applicable_locations, applicable_experiences, applicable_voucher_types,
                    is_active, created_at, updated_at, source_type, customer_email, paid_amount
                ) VALUES (?, ?, NOW(), ?, 1, 0, ?, ?, ?, 1, NOW(), NOW(), 'user_generated', ?, ?)
                ON DUPLICATE KEY UPDATE 
                    source_type = VALUES(source_type),
                    title = VALUES(title),
                    valid_until = VALUES(valid_until),
                    applicable_locations = VALUES(applicable_locations),
                    applicable_experiences = VALUES(applicable_experiences),
                    applicable_voucher_types = VALUES(applicable_voucher_types),
                    updated_at = NOW()
            `;
            const insertVals = [
                voucherCode,
                title,
                defaultExpiryDate,
                location || null,
                experience_type || null,
                voucher_type || null,
                customer_email || null,
                paid_amount || 0
            ];
            con.query(insertUserCodeSql, insertVals, (insErr) => {
                if (insErr) {
                    console.warn('Warning: could not upsert user_generated voucher code:', insErr.message);
                }
            });

            res.json({
                success: true,
                message: `${voucher_type} code generated and assigned successfully`,
                voucher_code: voucherCode,
                record_id: result.recordId,
                customer_name: customer_name,
                customer_email: customer_email,
                updated_record: true
            });
        } catch (updateError) {
            console.error('Error updating record with code:', updateError);
            console.log('=== FALLBACK: Returning voucher code without updating record ===');
            // Still upsert into voucher_codes so it appears in settings
            try {
                const defaultExpiryDate = (expires_date && expires_date !== '')
                    ? expires_date
                    : dayjs().add((experience_type === 'Private Charter' ? 18 : 24), 'month').format('YYYY-MM-DD');
                const insertUserCodeSql = `
                    INSERT INTO voucher_codes (
                        code, title, valid_from, valid_until, max_uses, current_uses,
                        applicable_locations, applicable_experiences, applicable_voucher_types,
                        is_active, created_at, updated_at, source_type, customer_email, paid_amount
                    ) VALUES (?, ?, NOW(), ?, 1, 0, ?, ?, ?, 1, NOW(), NOW(), 'user_generated', ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        source_type = VALUES(source_type),
                        title = VALUES(title),
                        valid_until = VALUES(valid_until),
                        applicable_locations = VALUES(applicable_locations),
                        applicable_experiences = VALUES(applicable_experiences),
                        applicable_voucher_types = VALUES(applicable_voucher_types),
                        updated_at = NOW()
                `;
                const insertVals = [
                    voucherCode,
                    title,
                    defaultExpiryDate,
                    location || null,
                    experience_type || null,
                    voucher_type || null,
                    customer_email || null,
                    paid_amount || 0
                ];
                con.query(insertUserCodeSql, insertVals, () => {});
            } catch (e) {}

            // Return the voucher code so it can be used
            res.json({
                success: true,
                message: `${voucher_type} code generated successfully (record update failed)`,
                voucher_code: voucherCode,
                customer_name: customer_name,
                customer_email: customer_email,
                updated_record: false,
                warning: 'Code generated but could not update record automatically'
            });
        }
        
    } catch (error) {
        console.error('Error generating voucher code:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            requestData: {
                flight_category,
                customer_name,
                customer_email,
                location,
                experience_type,
                voucher_type,
                paid_amount,
                expires_date
            }
        });
        res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message,
            details: 'Check server logs for more information'
        });
    }
});

// Get all voucher codes
app.get('/api/voucher-codes', (req, res) => {
    const sql = `
        SELECT 
            vc.*,
            COUNT(vcu.id) as total_uses,
            CASE 
                WHEN vc.max_uses IS NULL THEN 'Unlimited'
                ELSE CONCAT(vc.current_uses, '/', vc.max_uses)
            END as usage_status
        FROM voucher_codes vc
        LEFT JOIN voucher_code_usage vcu ON vc.id = vcu.voucher_code_id
        GROUP BY vc.id
        ORDER BY vc.created_at DESC
    `;
    
    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching voucher codes:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        res.json({ success: true, data: result });
    });
});

// Create new voucher code
app.post('/api/voucher-codes', (req, res) => {
    const {
        code,
        title,
        valid_from,
        valid_until,
        max_uses,
        applicable_locations,
        applicable_experiences,
        applicable_voucher_types
    } = req.body;
    
    // Validation
    if (!code || !title) {
        return res.status(400).json({ success: false, message: 'Missing required fields: code and title' });
    }
    
    const sql = `
        INSERT INTO voucher_codes (
            code, title, valid_from, valid_until, max_uses, 
            applicable_locations, applicable_experiences, applicable_voucher_types
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
        code.toUpperCase(),
        title,
        valid_from || null,
        valid_until || null,
        max_uses || null,
        applicable_locations || null,
        applicable_experiences || null,
        applicable_voucher_types || null
    ];
    
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error creating voucher code:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'Voucher code already exists' });
            }
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        res.json({ success: true, message: 'Voucher code created successfully', id: result.insertId });
    });
});

// Update voucher code
app.put('/api/voucher-codes/:id', (req, res) => {
    const { id } = req.params;
    const {
        code,
        title,
        valid_from,
        valid_until,
        max_uses,
        applicable_locations,
        applicable_experiences,
        applicable_voucher_types,
        is_active
    } = req.body;
    
    // Validation
    if (!code || !title) {
        return res.status(400).json({ success: false, message: 'Missing required fields: code and title' });
    }
    
    const sql = `
        UPDATE voucher_codes SET 
            code = ?, title = ?, valid_from = ?, valid_until = ?, 
            max_uses = ?, applicable_locations = ?, applicable_experiences = ?, 
            applicable_voucher_types = ?, is_active = ?, updated_at = NOW()
        WHERE id = ?
    `;
    
    const values = [
        code.toUpperCase(),
        title,
        valid_from || null,
        valid_until || null,
        max_uses || null,
        applicable_locations || null,
        applicable_experiences || null,
        applicable_voucher_types || null,
        is_active !== undefined ? is_active : 1,
        id
    ];
    
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error updating voucher code:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Voucher code not found' });
        }
        
        res.json({ success: true, message: 'Voucher code updated successfully' });
    });
});

// Delete voucher code
app.delete('/api/voucher-codes/:id', (req, res) => {
    const { id } = req.params;
    
    const sql = 'DELETE FROM voucher_codes WHERE id = ?';
    con.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting voucher code:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Voucher code not found' });
        }
        
        res.json({ success: true, message: 'Voucher code deleted successfully' });
    });
});

// Validate voucher code
app.post('/api/voucher-codes/validate', (req, res) => {
    const {
        code,
        location,
        experience,
        voucher_type,
        booking_amount
    } = req.body;
    
    console.log('Voucher validation request:', { code, location, experience, voucher_type, booking_amount });
    
    if (!code) {
        return res.status(400).json({ success: false, message: 'Voucher code is required' });
    }
    
    // Enforce single-use for codes (Voucher Codes Management entries)
    const sql = `
        SELECT * FROM voucher_codes 
        WHERE code = ? AND is_active = 1
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_until IS NULL OR valid_until >= NOW())
        AND (
            (max_uses IS NULL AND COALESCE(current_uses,0) < 1) OR
            (max_uses IS NOT NULL AND COALESCE(current_uses,0) < max_uses)
        )
        AND (source_type = 'admin_created' OR source_type = 'user_generated')
    `;
    
    console.log('SQL query:', sql);
    console.log('SQL params:', [code.toUpperCase()]);
    
    con.query(sql, [code.toUpperCase()], (err, result) => {
        if (err) {
            console.error('Error validating voucher code:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        console.log('Database result:', result);
        
        if (result.length === 0) {
            console.log('No voucher_codes match. Falling back to all_vouchers/all_booking for voucher_ref/voucher_code...');
            const fallbackSql = `
                SELECT 
                    v.*, 
                    v.voucher_ref AS code_from_vouchers,
                    CASE WHEN v.expires IS NOT NULL THEN v.expires ELSE DATE_ADD(v.created_at, INTERVAL 24 MONTH) END AS computed_expires,
                    v.redeemed,
                    'voucher_ref' AS code_source
                FROM all_vouchers v
                WHERE v.voucher_ref = ?
                UNION ALL
                SELECT 
                    b.*, 
                    b.voucher_code AS code_from_vouchers,
                    NULL AS computed_expires,
                    NULL AS redeemed,
                    'booking_voucher_code' AS code_source
                FROM all_booking b
                WHERE b.voucher_code = ?
                LIMIT 1
            `;
            con.query(fallbackSql, [code.toUpperCase(), code.toUpperCase()], (fbErr, fbRows) => {
                if (fbErr) {
                    console.error('Error in voucher fallback lookup:', fbErr);
                    return res.json({ success: false, message: 'Invalid or expired voucher code' });
                }
                if (!fbRows || fbRows.length === 0) {
                    return res.json({ success: false, message: 'Invalid or expired voucher code' });
                }
                const row = fbRows[0];
                // Basic checks for voucher_ref path
                if (row.code_source === 'voucher_ref') {
                    const now = new Date();
                    const exp = row.computed_expires ? new Date(row.computed_expires) : null;
                    if (row.redeemed && String(row.redeemed).toLowerCase() === 'yes') {
                        return res.json({ success: false, message: 'Voucher already redeemed' });
                    }
                    if (exp && now > exp) {
                        return res.json({ success: false, message: 'Voucher code has expired' });
                    }
                }
                // Also validate when the code originates from booking table → already used, block
                else if (row.code_source === 'booking_voucher_code') {
                    const now = new Date();
                    // Prefer explicit expires; otherwise compute 24 months from created_at if available
                    let exp = null;
                    if (row.expires) {
                        exp = new Date(row.expires);
                    } else if (row.created_at) {
                        const created = new Date(row.created_at);
                        exp = new Date(created.getTime());
                        exp.setMonth(exp.getMonth() + 24);
                    }
                    // If code already exists on a booking, treat as redeemed/used
                    return res.json({ success: false, message: 'Voucher already redeemed' });
                    if (exp && now > exp) {
                        return res.json({ success: false, message: 'Voucher code has expired' });
                    }
                }
                // Treat as valid for redeem flow
                return res.json({
                    success: true,
                    message: 'Voucher code is valid',
                    data: {
                        code: code.toUpperCase(),
                        source: row.code_source,
                        // Prefer canonical fields if available
                        experience_type: row.experience_type || null,
                        voucher_type: row.voucher_type || row.actual_voucher_type || null,
                        // Provide expires for both voucher and booking sourced codes
                        expires: row.computed_expires || row.expires || null,
                        redeemed: row.redeemed || null,
                        final_amount: booking_amount,
                        numberOfPassengers: row.numberOfPassengers || row.pax || null
                    }
                });
            });
            return; // prevent continuing
        }
        
        const voucher = result[0];
        
        console.log('Voucher found:', {
            id: voucher.id,
            code: voucher.code,
            source_type: voucher.source_type,
            is_active: voucher.is_active,
            valid_from: voucher.valid_from,
            valid_until: voucher.valid_until,
            current_uses: voucher.current_uses,
            max_uses: voucher.max_uses
        });
        
        // For user generated codes, skip strict validation checks
        if (voucher.source_type === 'user_generated') {
            console.log('User generated voucher code - skipping strict validation checks');
        } else {
            // Check location restrictions (only for admin created codes)
            if (voucher.applicable_locations && location) {
                const locations = voucher.applicable_locations.split(',');
                if (!locations.includes(location)) {
                    return res.json({ success: false, message: 'Voucher code not valid for this location' });
                }
            }
            
            // Check experience restrictions (only for admin created codes)
            if (voucher.applicable_experiences && experience) {
                const experiences = voucher.applicable_experiences.split(',');
                if (!experiences.includes(experience)) {
                    return res.json({ success: false, message: 'Voucher code not valid for this experience' });
                }
            }
            
            // Check voucher type restrictions (only for admin created codes)
            if (voucher.applicable_voucher_types && voucher_type) {
                const types = voucher.applicable_voucher_types.split(',');
                if (!types.includes(voucher_type)) {
                    return res.json({ success: false, message: 'Voucher code not valid for this voucher type' });
                }
            }
        }
        
        // Try to enrich response with voucher details from all_vouchers/all_booking
        const detailsSql = `
            SELECT 
                v.experience_type,
                v.book_flight,
                v.voucher_type AS actual_voucher_type,
                v.paid,
                v.redeemed,
                v.offer_code,
                v.voucher_ref,
                v.numberOfPassengers,
                v.created_at,
                v.expires
            FROM all_vouchers v
            WHERE v.voucher_ref = ?
            ORDER BY v.created_at DESC
            LIMIT 1
        `;
        con.query(detailsSql, [voucher.code], (dErr, dRows) => {
            if (dErr) {
                console.warn('Voucher detail lookup failed:', dErr.message);
            }
            let enriched = null;
            if (dRows && dRows.length > 0) {
                const v = dRows[0];
                enriched = {
                    experience: v.experience_type || null,
                    book_flight: v.book_flight || null,
                    paid: v.paid || 0,
                    redeemed: v.redeemed || null,
                    offer_code: v.offer_code || null,
                    voucher_ref: v.voucher_ref || voucher.code,
                    numberOfVouchers: v.numberOfPassengers || null,
                    created: v.created_at || null,
                    expires: v.expires || null
                };
            }
            
            // Voucher code is valid (no discount calculation needed)
            res.json({
                success: true,
                message: 'Voucher code is valid',
                data: {
                    ...voucher,
                    // Keep response shape consistent with getAllVoucherData fields when possible
                    experience_type: voucher.applicable_experiences || enriched?.experience || null,
                    voucher_type: voucher.applicable_voucher_types || enriched?.actual_voucher_type || null,
                    final_amount: booking_amount, // No discount applied
                    numberOfPassengers: enriched?.numberOfVouchers || null,
                    // Extra detail block for Redeem Voucher UI
                    detail: enriched
                }
            });
        });
    });
});

// Get voucher code usage
app.get('/api/voucher-codes/:id/usage', (req, res) => {
    const { id } = req.params;
    
    const sql = `
        SELECT 
            vcu.*,
            ab.booking_reference,
            ab.customer_name,
            ab.customer_email,
            ab.total_amount as original_amount,
            ab.voucher_discount,
            (ab.total_amount - ab.voucher_discount) as final_amount
        FROM voucher_code_usage vcu
        LEFT JOIN all_booking ab ON vcu.booking_id = ab.id
        WHERE vcu.voucher_code_id = ?
        ORDER BY vcu.used_at DESC
    `;
    
    con.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error fetching voucher usage:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        res.json({ success: true, data: result });
    });
});

// Simple booking creation for Redeem Voucher
app.post('/api/createRedeemBooking', (req, res) => {
    const {
        activitySelect,
        chooseLocation,
        chooseFlightType,
        passengerData,
        additionalInfo,
        selectedDate,
        selectedTime,
        voucher_code,
        totalPrice = 0,
        activity_id
    } = req.body;

    // Basic validation
    if (!chooseLocation || !chooseFlightType || !passengerData || !passengerData[0]) {
        return res.status(400).json({ success: false, error: 'Missing required booking information' });
    }

    // Trim voucher code to remove whitespace and tab characters
    const cleanVoucherCode = voucher_code ? voucher_code.trim() : null;

    // Validate voucher code is not already used (check both voucher_codes and all_vouchers tables)
    if (cleanVoucherCode) {
        // First check voucher_codes table
        const checkVoucherCodesSql = `
            SELECT code, is_active, current_uses, max_uses 
            FROM voucher_codes 
            WHERE UPPER(code) = UPPER(?)
            LIMIT 1
        `;
        
        con.query(checkVoucherCodesSql, [cleanVoucherCode], (checkErr, checkResult) => {
            if (checkErr) {
                // If voucher_codes table doesn't exist or query fails, check all_vouchers instead
                console.warn('Warning: Could not check voucher_codes table:', checkErr.message);
                checkAllVouchers();
                return;
            }
            
            if (checkResult.length > 0) {
                const voucherCode = checkResult[0];
                console.log('=== VOUCHER CODE VALIDATION (voucher_codes) ===');
                console.log('Voucher Code:', voucherCode.code);
                console.log('Is Active:', voucherCode.is_active);
                console.log('Current Uses:', voucherCode.current_uses);
                console.log('Max Uses:', voucherCode.max_uses);
                
                // Check if inactive (already used)
                if (voucherCode.is_active === 0 || voucherCode.is_active === false) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'This voucher code has already been used and cannot be redeemed again' 
                    });
                }
                
                // Check if max uses reached
                if (voucherCode.max_uses && voucherCode.current_uses >= voucherCode.max_uses) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'This voucher code has reached its maximum number of uses' 
                    });
                }
                
                // Voucher is valid, proceed
                createRedeemBookingLogic();
            } else {
                // Not found in voucher_codes, check all_vouchers table
                console.log('Voucher code not found in voucher_codes table, checking all_vouchers...');
                checkAllVouchers();
            }
        });
        
        // Function to check all_vouchers table
        function checkAllVouchers() {
            const checkAllVouchersSql = `
                SELECT voucher_ref, redeemed, status, name
                FROM all_vouchers 
                WHERE UPPER(voucher_ref) = UPPER(?)
                LIMIT 1
            `;
            
            con.query(checkAllVouchersSql, [cleanVoucherCode], (voucherErr, voucherResult) => {
                if (voucherErr) {
                    console.warn('Warning: Could not check all_vouchers table:', voucherErr.message);
                    // Can't validate, proceed with booking (risky but allows operation)
                    createRedeemBookingLogic();
                    return;
                }
                
                if (voucherResult.length > 0) {
                    const voucher = voucherResult[0];
                    console.log('=== VOUCHER CODE VALIDATION (all_vouchers) ===');
                    console.log('Voucher Code:', voucher.voucher_ref);
                    console.log('Redeemed:', voucher.redeemed);
                    console.log('Status:', voucher.status);
                    console.log('Name:', voucher.name);
                    
                    // Check if already redeemed
                    if (voucher.redeemed === 'Yes' || voucher.status === 'Used') {
                        return res.status(400).json({ 
                            success: false, 
                            error: 'This voucher has already been redeemed and cannot be used again' 
                        });
                    }
                    
                    // Voucher is valid, proceed
                    createRedeemBookingLogic();
                } else {
                    // Not found in either table - check all_booking for voucher_code
                    console.log('Voucher not found in all_vouchers, checking all_booking...');
                    checkAllBooking();
                }
            });
        }
        
        // Function to check all_booking table for previously used voucher codes
        function checkAllBooking() {
            const checkBookingSql = `
                SELECT voucher_code, name, redeemed_voucher, created_at
                FROM all_booking 
                WHERE UPPER(voucher_code) = UPPER(?)
                LIMIT 1
            `;
            
            con.query(checkBookingSql, [cleanVoucherCode], (bookingErr, bookingResult) => {
                if (bookingErr) {
                    console.warn('Warning: Could not check all_booking table:', bookingErr.message);
                    // Can't validate, proceed with booking
                    createRedeemBookingLogic();
                    return;
                }
                
                if (bookingResult.length > 0) {
                    const booking = bookingResult[0];
                    console.log('=== VOUCHER CODE FOUND IN ALL_BOOKING ===');
                    console.log('Voucher Code:', booking.voucher_code);
                    console.log('Previously used by:', booking.name);
                    console.log('Used on:', booking.created_at);
                    console.log('Redeemed Voucher Status:', booking.redeemed_voucher);
                    
                    // If this voucher code exists in all_booking, it means it was already used for a booking
                    // Regardless of redeemed_voucher status, we should not allow it to be used again
                    // because each voucher code should only create ONE booking
                    return res.status(400).json({ 
                        success: false, 
                        error: 'This voucher code has already been used for a booking and cannot be redeemed again' 
                    });
                }
                
                // Voucher code not found anywhere, proceed with booking
                console.log('Voucher code not found in any table, proceeding with new booking');
                createRedeemBookingLogic();
            });
        }
        
        return; // Exit here and continue in callback
    }
    
    // If no voucher code, proceed directly
    createRedeemBookingLogic();
    
    function createRedeemBookingLogic() {
    const passengerName = `${passengerData[0].firstName} ${passengerData[0].lastName}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Format booking date
    let bookingDateTime = selectedDate;
    if (selectedDate && selectedTime) {
        const datePart = typeof selectedDate === 'string' && selectedDate.includes(' ') 
            ? selectedDate.split(' ')[0] 
            : (typeof selectedDate === 'string' && selectedDate.length >= 10 
                ? selectedDate.substring(0, 10) 
                : selectedDate);
        bookingDateTime = `${datePart} ${selectedTime}`;
    } else if (selectedDate) {
        // If no selectedTime, use selectedDate as-is (might already include time)
        bookingDateTime = selectedDate;
    } else {
        // Fallback to current timestamp if no date provided
        bookingDateTime = now;
    }
    
    console.log('=== REDEEM BOOKING DATE FORMAT ===');
    console.log('selectedDate:', selectedDate);
    console.log('selectedTime:', selectedTime);
    console.log('Final bookingDateTime:', bookingDateTime);
    
    // Get the original voucher price from voucher_codes table
    if (cleanVoucherCode) {
        const getVoucherPriceSql = `
            SELECT paid_amount 
            FROM voucher_codes 
            WHERE UPPER(code) = UPPER(?)
            LIMIT 1
        `;
        
        con.query(getVoucherPriceSql, [cleanVoucherCode], (priceErr, priceResult) => {
            let voucherOriginalPrice = totalPrice || 0;
            
            if (!priceErr && priceResult.length > 0 && priceResult[0].paid_amount) {
                voucherOriginalPrice = priceResult[0].paid_amount;
                console.log('✅ Found original voucher price:', voucherOriginalPrice);
            } else {
                console.log('⚠️ Could not find voucher price, using totalPrice:', voucherOriginalPrice);
            }
            
            // Continue with booking creation using the original voucher price
            createBookingWithPrice(voucherOriginalPrice);
        });
    } else {
        // No voucher code, use totalPrice
        createBookingWithPrice(totalPrice || 0);
    }
    
    function createBookingWithPrice(paidAmount) {
        console.log('=== CREATING BOOKING WITH PAID AMOUNT:', paidAmount, '===');

    // Simple SQL with only essential columns
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
            email,
                phone,
                activity_id,
                redeemed_voucher
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Use actual passenger count from passengerData array
    const actualPaxCount = (Array.isArray(passengerData) && passengerData.length > 0) ? passengerData.length : (parseInt(chooseFlightType.passengerCount) || 1);
    console.log('=== REDEEM BOOKING PAX COUNT DEBUG ===');
    console.log('passengerData.length:', passengerData?.length);
    console.log('chooseFlightType.passengerCount:', chooseFlightType.passengerCount);
    console.log('actualPaxCount (FINAL):', actualPaxCount);
        console.log('activity_id:', activity_id);
        console.log('cleanVoucherCode:', cleanVoucherCode);
        console.log('paidAmount (original voucher price):', paidAmount);
    
    const bookingValues = [
        passengerName,
        chooseFlightType.type || 'Shared Flight',
        bookingDateTime,
        actualPaxCount, // Use actual passenger count instead of chooseFlightType.passengerCount
        chooseLocation,
        'Open',
            paidAmount, // Use original voucher price instead of totalPrice
        0,
            cleanVoucherCode,
        now, // created_at
        passengerData[0].email || null,
            passengerData[0].phone || null,
            activity_id || null,
            'Yes' // Redeem Voucher bookings always have redeemed_voucher = Yes
    ];

    console.log('=== REDEEM BOOKING SQL ===');
    console.log('SQL:', bookingSql);
    console.log('Values:', bookingValues);

    con.query(bookingSql, bookingValues, (err, result) => {
        if (err) {
            console.error('=== REDEEM BOOKING ERROR ===');
            console.error('Error:', err);
            return res.status(500).json({ 
                success: false, 
                error: 'Database query failed to create booking', 
                details: err.message 
            });
        }

        const bookingId = result.insertId;
        console.log('=== REDEEM BOOKING SUCCESS ===');
        console.log('Booking ID:', bookingId);

        // Update availability if date and time are provided
        if (selectedDate && selectedTime && req.body.activity_id) {
            const bookingDate = moment(selectedDate).format('YYYY-MM-DD');
            const bookingTime = selectedTime;
            
            console.log('=== REDEEM BOOKING AVAILABILITY UPDATE ===');
            console.log('passengerData RECEIVED:', JSON.stringify(passengerData, null, 2));
            console.log('passengerData type:', typeof passengerData);
            console.log('passengerData is Array?', Array.isArray(passengerData));
            console.log('passengerData length:', passengerData?.length);
            console.log('chooseFlightType:', JSON.stringify(chooseFlightType, null, 2));
            console.log('chooseFlightType.passengerCount:', chooseFlightType.passengerCount);
            
            // Use actual passenger count from passengerData array (real passenger count entered by user)
            const actualPassengerCount = (Array.isArray(passengerData) && passengerData.length > 0) ? passengerData.length : (parseInt(chooseFlightType.passengerCount) || 1);
            
            console.log('Date:', bookingDate, 'Time:', bookingTime, 'Activity ID:', req.body.activity_id);
            console.log('Actual Passenger Count (FINAL):', actualPassengerCount);
            
            updateSpecificAvailability(bookingDate, bookingTime, req.body.activity_id, actualPassengerCount);
        } else if (selectedDate && selectedTime && chooseLocation) {
            // Get activity_id first, then update availability
            const bookingDate = moment(selectedDate).format('YYYY-MM-DD');
            const bookingTime = selectedTime;
            // Use actual passenger count from passengerData array (real passenger count entered by user)
            const actualPassengerCount = (Array.isArray(passengerData) && passengerData.length > 0) ? passengerData.length : (parseInt(chooseFlightType.passengerCount) || 1);
            
            const activitySql = `SELECT id FROM activity WHERE location = ? AND status = 'Live' LIMIT 1`;
            con.query(activitySql, [chooseLocation], (activityErr, activityResult) => {
                if (activityErr) {
                    console.error('Error getting activity_id for redeem availability update:', activityErr);
                } else if (activityResult.length > 0) {
                    const activityId = activityResult[0].id;
                    
                    console.log('=== REDEEM BOOKING AVAILABILITY UPDATE (alt sorgu) ===');
                    console.log('Date:', bookingDate, 'Time:', bookingTime, 'Activity ID:', activityId);
                    console.log('passengerData length:', passengerData?.length);
                    console.log('chooseFlightType.passengerCount:', chooseFlightType.passengerCount);
                    console.log('Actual Passenger Count (FINAL):', actualPassengerCount);
                    
                    updateSpecificAvailability(bookingDate, bookingTime, activityId, actualPassengerCount);
                } else {
                    console.error('No activity found for location:', chooseLocation);
                }
            });
        }

        // Create passenger record
        if (passengerData && passengerData.length > 0) {
            const passengerSql = `
                INSERT INTO passenger (booking_id, first_name, last_name, weight, email, phone)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            passengerData.forEach((passenger, index) => {
                if (passenger.firstName) {
                    const passengerValues = [
                        bookingId,
                        passenger.firstName,
                        passenger.lastName || '',
                        passenger.weight || '',
                        passenger.email || '',
                        passenger.phone || ''
                    ];
                    
                    con.query(passengerSql, passengerValues, (passengerErr) => {
                        if (passengerErr) {
                            console.error('Error creating passenger:', passengerErr);
                        } else {
                            console.log(`Passenger ${index + 1} created for booking ${bookingId}`);
                        }
                    });
                }
            });
        }

        // Save additional info answers if provided
        if (additionalInfo && typeof additionalInfo === 'object') {
            console.log('=== SAVING ADDITIONAL INFO ===');
            console.log('Additional Info:', additionalInfo);
            
            // Remove non-answer fields
            const { notes, __requiredKeys, ...answers } = additionalInfo;
            
            // Save each question answer
            Object.keys(answers).forEach(questionKey => {
                const answer = answers[questionKey];
                if (answer !== undefined && answer !== null && answer !== '') {
                    const answerSql = `
                        INSERT INTO additional_info_answers (booking_id, question_id, answer)
                        VALUES (?, ?, ?)
                    `;
                    
                    // Extract question number from key (e.g., "question_14" -> 14)
                    const questionId = questionKey.replace('question_', '');
                    
                    con.query(answerSql, [bookingId, questionId, answer], (answerErr) => {
                        if (answerErr) {
                            console.error(`Error saving answer for ${questionKey}:`, answerErr);
                        } else {
                            console.log(`Answer saved for question ${questionId}`);
                        }
                    });
                }
            });
        }

        // Update voucher_codes table to mark as Used
        if (cleanVoucherCode) {
            console.log('=== UPDATING VOUCHER_CODES TABLE ===');
            console.log('Voucher Code:', cleanVoucherCode);
            
            // First, mark in all_vouchers table if exists
            const updateAllVouchersSql = `
                UPDATE all_vouchers 
                SET redeemed = 'Yes', status = 'Used'
                WHERE UPPER(voucher_ref) = UPPER(?)
            `;
            con.query(updateAllVouchersSql, [cleanVoucherCode], (voucherErr, voucherResult) => {
                if (voucherErr) {
                    console.warn('Warning: Could not update all_vouchers:', voucherErr.message);
                } else {
                    console.log('all_vouchers update result:', {
                        affectedRows: voucherResult.affectedRows,
                        changedRows: voucherResult.changedRows
                    });
                }
            });
            
            // Then, update voucher_codes table (if it exists)
            const updateVoucherCodesSql = `
                UPDATE voucher_codes 
                SET current_uses = COALESCE(current_uses, 0) + 1, 
                    is_active = 0
                WHERE UPPER(code) = UPPER(?)
            `;
            con.query(updateVoucherCodesSql, [cleanVoucherCode], (codeErr, codeResult) => {
                if (codeErr) {
                    console.warn('Warning: Could not update voucher_codes:', codeErr.message);
                } else {
                    console.log('✅ voucher_codes update result:', {
                        affectedRows: codeResult.affectedRows,
                        changedRows: codeResult.changedRows,
                        message: 'Voucher code marked as inactive'
                    });
                }
            });
        }

        res.json({ 
            success: true, 
            message: 'Booking created successfully', 
            bookingId: bookingId 
        });
    });
    } // end of createBookingWithPrice
    } // end of createRedeemBookingLogic
});

// Mark voucher as redeemed
app.post('/api/redeem-voucher', (req, res) => {
    const { voucher_code, booking_id } = req.body;
    
    if (!voucher_code) {
        return res.status(400).json({ success: false, message: 'Voucher code is required' });
    }
    
    // Trim and clean voucher code
    const cleanVoucherCode = voucher_code.trim().toUpperCase();
    
    console.log('=== MARKING VOUCHER AS REDEEMED ===');
    console.log('Original Voucher Code:', voucher_code);
    console.log('Clean Voucher Code:', cleanVoucherCode);
    console.log('Booking ID:', booking_id);
    
    // Check both all_vouchers (voucher_ref) and all_booking (voucher_code) tables
    const checkVoucherSql = `
        SELECT 'all_vouchers' as source, id, voucher_ref as code, redeemed, name 
        FROM all_vouchers 
        WHERE UPPER(voucher_ref) = UPPER(?)
        UNION ALL
        SELECT 'all_booking' as source, id, voucher_code as code, 'No' as redeemed, name 
        FROM all_booking 
        WHERE UPPER(voucher_code) = UPPER(?)
        LIMIT 1
    `;
    
    con.query(checkVoucherSql, [cleanVoucherCode, cleanVoucherCode], (checkErr, checkResult) => {
        if (checkErr) {
            console.error('Error checking voucher existence:', checkErr);
            return res.status(500).json({ success: false, message: 'Database error', error: checkErr.message });
        }
        
        console.log('=== VOUCHER CHECK RESULT ===');
        console.log('Found vouchers:', checkResult.length);
        
        if (checkResult.length === 0) {
            console.log('No voucher found with code:', cleanVoucherCode);
            return res.status(404).json({ success: false, message: 'Voucher not found' });
        }
        
        const voucherRecord = checkResult[0];
            console.log('Voucher details:', {
            source: voucherRecord.source,
            id: voucherRecord.id,
            code: voucherRecord.code,
            current_redeemed_status: voucherRecord.redeemed,
            name: voucherRecord.name
        });
        
        // Check if already redeemed (only for all_vouchers)
        if (voucherRecord.source === 'all_vouchers' && voucherRecord.redeemed === 'Yes') {
            console.log('Voucher already redeemed');
            return res.status(400).json({ success: false, message: 'Voucher already redeemed' });
        }
        
        // Update voucher based on source
        let updateVoucherSql;
        if (voucherRecord.source === 'all_vouchers') {
            updateVoucherSql = `
            UPDATE all_vouchers 
                SET redeemed = 'Yes', status = 'Used'
                WHERE UPPER(voucher_ref) = UPPER(?)
            `;
        } else {
            // For all_booking vouchers, we don't update - they're already marked as used
            // Just return success
            console.log('Voucher from all_booking - no need to mark as redeemed');
            return res.json({ 
                success: true, 
                message: 'Voucher successfully redeemed (from booking)' 
            });
        }
        
        console.log('=== EXECUTING UPDATE ===');
        console.log('SQL:', updateVoucherSql);
        console.log('Parameter:', cleanVoucherCode);
        
        con.query(updateVoucherSql, [cleanVoucherCode], (err, result) => {
            if (err) {
                console.error('=== UPDATE ERROR ===');
                console.error('Error marking voucher as redeemed:', err);
                return res.status(500).json({ success: false, message: 'Database error', error: err.message });
            }
            
            console.log('=== UPDATE RESULT ===');
            console.log('Voucher redemption update result:', {
                affectedRows: result.affectedRows,
                changedRows: result.changedRows,
                insertId: result.insertId,
                warningCount: result.warningCount
            });
            
            if (result.affectedRows === 0) {
                console.warn('=== NO ROWS AFFECTED ===');
                console.warn('No voucher found to update with code:', voucher_code);
                return res.json({ success: false, message: 'Voucher not found or already redeemed' });
            }
            
            console.log('=== SUCCESS ===');
            console.log('Voucher marked as redeemed successfully');
            // Also update voucher_codes table to mark as inactive and increment current_uses
            const updateVoucherCodeSql = `
                UPDATE voucher_codes 
                SET current_uses = COALESCE(current_uses,0) + 1, 
                    is_active = 0
                WHERE UPPER(code) = UPPER(?)
            `;
            con.query(updateVoucherCodeSql, [cleanVoucherCode], (codeErr, codeResult) => {
                if (codeErr) {
                    console.warn('Warning: Could not update voucher_codes:', codeErr.message);
                } else if (codeResult.affectedRows > 0) {
                    console.log('✅ voucher_codes updated successfully - marked as inactive');
                } else {
                    console.log('No matching voucher found in voucher_codes table');
                }
                // Always respond with success even if voucher_codes update fails
                res.json({ success: true, message: 'Voucher marked as redeemed' });
            });
        });
    });
});

// Get voucher code usage statistics
app.get('/api/voucher-codes/usage/stats', (req, res) => {
    const sql = `
        SELECT 
            vc.code,
            vc.title,
            vc.current_uses,
            vc.max_uses,
            vc.is_active,
            vc.valid_from,
            vc.valid_until,
            COUNT(vcu.id) as total_usage_records,
            SUM(vcu.discount_applied) as total_discounts_given
        FROM voucher_codes vc
        LEFT JOIN voucher_code_usage vcu ON vc.id = vcu.voucher_code_id
        GROUP BY vc.id
        ORDER BY vc.created_at DESC
    `;
    
    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching voucher usage stats:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        res.json({ success: true, data: result });
    });
});

// ===== EXPERIENCES API ENDPOINTS =====

// Get all experiences
app.get('/api/experiences', (req, res) => {
    console.log('GET /api/experiences called');
    
    const sql = `
        SELECT * FROM experiences 
        ORDER BY sort_order ASC, created_at DESC
    `;
    
    console.log('SQL Query:', sql);
    
    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching experiences:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        console.log('Query result:', result);
        console.log('Result length:', result ? result.length : 'undefined');
        
        res.json({ success: true, data: result });
    });
});

// Configure multer for experiences image uploads
const experiencesUpload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadDir = path.join(__dirname, 'uploads', 'experiences');
            // Create directory if it doesn't exist
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            // Generate unique filename with timestamp
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Allow only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Create new experience with image upload
app.post('/api/experiences', experiencesUpload.single('experience_image'), (req, res) => {
    const {
        title,
        description,
        max_passengers,
        sort_order,
        is_active
    } = req.body;
    
    // Validation
    if (!title || !description) {
        return res.status(400).json({ success: false, message: 'Missing required fields: title and description' });
    }
    
    // Handle image upload
    let image_url = null;
    if (req.file) {
        image_url = `/uploads/experiences/${req.file.filename}`;
    }
    
    const sql = `
        INSERT INTO experiences (
            title, description, image_url, max_passengers, sort_order, is_active
        ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
        title,
        description,
        image_url,
        max_passengers || 8,
        sort_order || 0,
        is_active !== undefined ? is_active : true
    ];
    
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error creating experience:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        res.json({
            success: true,
            message: 'Experience created successfully',
            id: result.insertId,
            image_url: image_url
        });
    });
});

// Update experience with image upload
app.put('/api/experiences/:id', experiencesUpload.single('experience_image'), (req, res) => {
    const { id } = req.params;
    const {
        title,
        description,
        max_passengers,
        sort_order,
        is_active
    } = req.body;
    
    // Validation
    if (!title || !description) {
        return res.status(400).json({ success: false, message: 'Missing required fields: title and description' });
    }
    
    // Handle image upload
    let image_url = req.body.image_url; // Keep existing image if no new file uploaded
    if (req.file) {
        image_url = `/uploads/experiences/${req.file.filename}`;
    }
    
    const sql = `
        UPDATE experiences SET 
            title = ?, description = ?, image_url = ?, max_passengers = ?, sort_order = ?, is_active = ?
        WHERE id = ?
    `;
    
    const values = [
        title,
        description,
        image_url,
        max_passengers || 8,
        sort_order || 0,
        is_active !== undefined ? is_active : true,
        id
    ];
    
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error updating experience:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Experience not found' });
        }
        
        res.json({
            success: true,
            message: 'Experience updated successfully',
            image_url: image_url
        });
    });
});
// Delete experience
app.delete('/api/experiences/:id', (req, res) => {
    const { id } = req.params;
    
    const sql = 'DELETE FROM experiences WHERE id = ?';
    
    con.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting experience:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Experience not found' });
        }
        
        res.json({
            success: true,
            message: 'Experience deleted successfully'
        });
    });
});

// ==================== VOUCHER TYPES API ENDPOINTS ====================

// Get all voucher types with updated pricing from activity table
app.get('/api/voucher-types', (req, res) => {
    console.log('GET /api/voucher-types called');
    
    // Get location from query parameter if provided
    const { location } = req.query;
    
    let sql, params = [];
    
    if (location) {
        // If location is provided, get voucher types with location-specific pricing
        sql = `
            SELECT 
                vt.*,
                COALESCE(a.weekday_morning_price, vt.price_per_person) as weekday_morning_price,
                COALESCE(a.flexible_weekday_price, vt.price_per_person) as flexible_weekday_price,
                COALESCE(a.any_day_flight_price, vt.price_per_person) as any_day_flight_price,
                a.shared_flight_from_price,
                a.private_charter_from_price
            FROM voucher_types vt
            LEFT JOIN activity a ON a.status = 'Live' AND a.location = ?
            ORDER BY vt.sort_order ASC, vt.created_at DESC
        `;
        params.push(location);
    } else {
        // If no location provided, get voucher types with default pricing from first available activity
        sql = `
            SELECT 
                vt.*,
                COALESCE(a.weekday_morning_price, vt.price_per_person) as weekday_morning_price,
                COALESCE(a.flexible_weekday_price, vt.price_per_person) as flexible_weekday_price,
                COALESCE(a.any_day_flight_price, vt.price_per_person) as any_day_flight_price,
                a.shared_flight_from_price,
                a.private_charter_from_price
            FROM voucher_types vt
            LEFT JOIN (
                SELECT * FROM activity WHERE status = 'Live' ORDER BY id ASC LIMIT 1
            ) a ON 1=1
            ORDER BY vt.sort_order ASC, vt.created_at DESC
        `;
    }
    
    console.log('SQL Query:', sql);
    console.log('SQL params:', params);
    
    con.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error fetching voucher types:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        // Process the results to map voucher types to their correct pricing
        const processedVoucherTypes = result.map(vt => {
            let updatedPrice = vt.price_per_person;
            
            // Map voucher type titles to their corresponding pricing fields
            if (vt.title === 'Weekday Morning' && vt.weekday_morning_price) {
                updatedPrice = vt.weekday_morning_price;
            } else if (vt.title === 'Flexible Weekday' && vt.flexible_weekday_price) {
                updatedPrice = vt.flexible_weekday_price;
            } else if (vt.title === 'Any Day Flight' && vt.any_day_flight_price) {
                updatedPrice = vt.any_day_flight_price;
            }
            
            return {
                ...vt,
                image_text_tag: vt.image_text_tag || null,
                price_per_person: updatedPrice,
                // Add the activity pricing fields for reference
                activity_pricing: {
                    weekday_morning_price: vt.weekday_morning_price,
                    flexible_weekday_price: vt.flexible_weekday_price,
                    any_day_flight_price: vt.any_day_flight_price,
                    shared_flight_from_price: vt.shared_flight_from_price,
                    private_charter_from_price: vt.private_charter_from_price
                }
            };
        });
        
        console.log('Processed voucher types with updated pricing:', processedVoucherTypes);
        console.log('Result length:', processedVoucherTypes ? processedVoucherTypes.length : 'undefined');
        
        res.json({ success: true, data: processedVoucherTypes });
    });
});

// Create new voucher type
app.post('/api/voucher-types', experiencesUpload.single('voucher_type_image'), (req, res) => {
    const {
        title,
        description,
        image_text_tag,
        price_per_person,
        price_unit,
        max_passengers,
        validity_months,
        flight_days,
        flight_time,
        features,
        terms,
        sort_order,
        is_active
    } = req.body;
    
    // Validation: allow creating a voucher type without price yet
    // Only require title and description at creation time
    if (!title || !description) {
        return res.status(400).json({ success: false, message: 'Missing required fields: title and description' });
    }
    
    // Handle image upload
    let image_url = req.body.image_url; // Keep existing image if no new file uploaded
    if (req.file) {
        image_url = `/uploads/experiences/${req.file.filename}`;
    }
    
    const sql = `
        INSERT INTO voucher_types (
            title, description, image_url, image_text_tag, price_per_person, price_unit, max_passengers,
            validity_months, flight_days, flight_time, features, terms, sort_order, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
        title,
        description,
        image_url,
        image_text_tag || null,
        (price_per_person === undefined || price_per_person === '' ? null : price_per_person),
        price_unit || 'pp',
        max_passengers || 8,
        validity_months || 18,
        flight_days || 'Monday - Friday',
        flight_time || 'AM',
        features || '[]',
        terms || '',
        sort_order || 0,
        is_active !== undefined ? is_active : true
    ];
    
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error creating voucher type:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        res.json({
            success: true,
            message: 'Voucher type created successfully',
            id: result.insertId
        });
    });
});

// Update voucher type
app.put('/api/voucher-types/:id', experiencesUpload.single('voucher_type_image'), (req, res) => {
    const { id } = req.params;
    const {
        title,
        description,
        image_text_tag,
        price_per_person,
        price_unit,
        max_passengers,
        validity_months,
        flight_days,
        flight_time,
        features,
        terms,
        sort_order,
        is_active
    } = req.body;
    
    // Validation
    if (!title || !description) {
        return res.status(400).json({ success: false, message: 'Missing required fields: title and description' });
    }
    
    // Handle image upload
    let image_url = req.body.image_url; // Keep existing image if no new file uploaded
    if (req.file) {
        image_url = `/uploads/experiences/${req.file.filename}`;
    }
    
    const sql = `
        UPDATE voucher_types SET 
            title = ?, description = ?, image_url = ?, image_text_tag = ?, max_passengers = ?, 
            validity_months = ?, flight_days = ?, flight_time = ?, features = ?, 
            terms = ?, sort_order = ?, is_active = ?
        WHERE id = ?
    `;
    
    const values = [
        title,
        description,
        image_url,
        image_text_tag || null,
        max_passengers || 8,
        validity_months || 18,
        flight_days || 'Monday - Friday',
        flight_time || 'AM',
        features || '[]',
        terms || '',
        sort_order || 0,
        is_active !== undefined ? is_active : true,
        id
    ];
    
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error updating voucher type:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Voucher type not found' });
        }
        
        res.json({
            success: true,
            message: 'Voucher type updated successfully',
            image_url: image_url
        });
    });
});

// Delete voucher type
app.delete('/api/voucher-types/:id', (req, res) => {
    const { id } = req.params;
    
    const sql = 'DELETE FROM voucher_types WHERE id = ?';
    
    con.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting voucher type:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Voucher type not found' });
        }
        
        res.json({
            success: true,
            message: 'Voucher type deleted successfully'
        });
    });
});

// ==================== PRIVATE CHARTER VOUCHER TYPES API ENDPOINTS ====================

// Get all private charter voucher types
app.get('/api/private-charter-voucher-types', (req, res) => {
    console.log('GET /api/private-charter-voucher-types called');
    
    // Check if we want only active voucher types (default) or all
    const showOnlyActive = req.query.active !== 'false';
    const location = req.query.location;
    const passengers = req.query.passengers ? Number(req.query.passengers) : undefined;
    
    let sql, params = [];
    if (showOnlyActive) {
        sql = `SELECT * FROM private_charter_voucher_types WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC`;
        console.log('SQL Query (active only):', sql);
    } else {
        sql = `SELECT * FROM private_charter_voucher_types ORDER BY sort_order ASC, created_at DESC`;
        console.log('SQL Query (all):', sql);
    }
    
    con.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error fetching private charter voucher types:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        console.log('GET /api/private-charter-voucher-types - Raw query result:');
        result.forEach((item, index) => {
            console.log(`Item ${index + 1}:`, {
                id: item.id,
                title: item.title,
                is_active: item.is_active,
                is_active_type: typeof item.is_active,
                updated_at: item.updated_at
            });
        });
        
        // For admin view (showOnlyActive = false), return all voucher types
        // For frontend view (showOnlyActive = true), return only active ones
        let finalResult = result;

        // If location is provided, enrich price_per_person from activity.private_charter_pricing
        if (location) {
            const actSql = 'SELECT id, activity_name, location, private_charter_pricing FROM activity WHERE status = "Live" AND location = ? ORDER BY id DESC LIMIT 1';
            con.query(actSql, [location], (aErr, aRes) => {
                if (aErr) {
                    console.error('Error fetching activity for pricing:', aErr);
                } else if (aRes && aRes.length > 0) {
                    let pricingMap = {};
                    try {
                        const raw = aRes[0].private_charter_pricing;
                        pricingMap = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
                    } catch (e) {
                        pricingMap = {};
                    }
                    const normalize = (s) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
                    const selectedPassengers = passengers && [2,3,4,8].includes(passengers) ? String(passengers) : '2';
                    // Map titles to prices (tolerant)
                    finalResult = finalResult.map(v => {
                        const title = v.title || '';
                        let matchVal = null;
                        
                        // Güvenli erişim için pricingMap kontrolü
                        if (pricingMap && typeof pricingMap === 'object') {
                            matchVal = pricingMap[title];
                            if (matchVal == null) matchVal = pricingMap[title.trim?.()];
                            if (matchVal == null) {
                                const normTitle = normalize(title);
                                for (const k of Object.keys(pricingMap)) {
                                    if (normalize(k) === normTitle) { matchVal = pricingMap[k]; break; }
                                }
                            }
                        }
                        if (matchVal != null && matchVal !== '') {
                            if (typeof matchVal === 'object') {
                                const tierVal = matchVal[selectedPassengers] ?? matchVal['2'];
                                const parsedTier = parseFloat(tierVal);
                                if (!Number.isNaN(parsedTier)) {
                                    v.price_per_person = parsedTier.toFixed(2);
                                    v.price_unit = 'total';
                                }
                            } else {
                                const parsed = parseFloat(matchVal);
                                if (!Number.isNaN(parsed)) {
                                    v.price_per_person = parsed.toFixed(2);
                                    v.price_unit = 'total';
                                }
                            }
                        }
                        return v;
                    });
                }
                console.log('Query result:', result);
                console.log('Show only active:', showOnlyActive);
                console.log('Result length:', result ? result.length : 'undefined');
                console.log('Final result length:', finalResult ? finalResult.length : 'undefined');
                return res.json({ success: true, data: finalResult });
            });
            return; // prevent double send
        }

        console.log('Query result:', result);
        console.log('Show only active:', showOnlyActive);
        console.log('Result length:', result ? result.length : 'undefined');
        console.log('Final result length:', finalResult ? finalResult.length : 'undefined');
        
        res.json({ success: true, data: finalResult });
    });
});

// Create new private charter voucher type
app.post('/api/private-charter-voucher-types', experiencesUpload.single('private_charter_voucher_type_image'), (req, res) => {
    const {
        title,
        description,
        image_text_tag,
        max_passengers,
        validity_months,
        flight_days,
        flight_time,
        features,
        terms,
        sort_order,
        is_active
    } = req.body;
    
    // Validation
    if (!title || !description) {
        return res.status(400).json({ success: false, message: 'Missing required fields: title and description' });
    }
    
    // Handle image upload
    let image_url = req.body.image_url; // Keep existing image if no new file uploaded
    if (req.file) {
        image_url = `/uploads/experiences/${req.file.filename}`;
    }
    
    const sql = `
        INSERT INTO private_charter_voucher_types (
            title, description, image_url, image_text_tag, max_passengers,
            validity_months, flight_days, flight_time, features, terms, sort_order, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
        title,
        description,
        image_url,
        image_text_tag || null,
        max_passengers || 8,
        validity_months || 18,
        flight_days || 'Any Day',
        flight_time || 'AM & PM',
        features || '[]',
        terms || '',
        sort_order || 0,
        is_active !== undefined ? is_active : true
    ];
    
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error creating private charter voucher type:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        console.log('Private charter voucher type created successfully with ID:', result.insertId);
        console.log('Inserted values:', values);
        
        // After successful creation, fetch the newly created voucher type to return complete data
        const selectSql = `SELECT * FROM private_charter_voucher_types WHERE id = ?`;
        con.query(selectSql, [result.insertId], (selectErr, selectResult) => {
            if (selectErr) {
                console.error('Error fetching newly created voucher type:', selectErr);
                // Still return success, but without the created data
                res.json({
                    success: true,
                    message: 'Private charter voucher type created successfully',
                    id: result.insertId
                });
            } else {
                console.log('Newly created voucher type fetched:', selectResult[0]);
                res.json({
                    success: true,
                    message: 'Private charter voucher type created successfully',
                    id: result.insertId,
                    data: selectResult[0]
                });
            }
        });
    });
});

// Update private charter voucher type
app.put('/api/private-charter-voucher-types/:id', experiencesUpload.single('private_charter_voucher_type_image'), (req, res) => {
    const { id } = req.params;
    const {
        title,
        description,
        image_text_tag,
        max_passengers,
        validity_months,
        flight_days,
        flight_time,
        features,
        terms,
        sort_order,
        is_active
    } = req.body;
    
    // Validation
    if (!title || !description) {
        return res.status(400).json({ success: false, message: 'Missing required fields: title and description' });
    }
    
    // Handle image upload
    let image_url = req.body.image_url; // Keep existing image if no new file uploaded
    if (req.file) {
        image_url = `/uploads/experiences/${req.file.filename}`;
    }
    
    const sql = `
        UPDATE private_charter_voucher_types SET 
            title = ?, description = ?, image_url = ?, image_text_tag = ?, max_passengers = ?, 
            validity_months = ?, flight_days = ?, flight_time = ?, features = ?, 
            terms = ?, sort_order = ?, is_active = ?
        WHERE id = ?
    `;
    
    // Convert is_active to proper boolean value
    let isActiveValue;
    
    console.log('DEBUG - is_active received:', {
        value: is_active,
        type: typeof is_active,
        isUndefined: is_active === undefined,
        isNull: is_active === null,
        toString: String(is_active)
    });
    
    if (is_active === undefined || is_active === null) {
        // If is_active is not provided, default to false to avoid unintended activation
        isActiveValue = false;
    } else if (typeof is_active === 'string') {
        isActiveValue = is_active === 'true' || is_active === '1';
        console.log('String parsing - is_active value:', is_active, 'parsed to:', isActiveValue);
    } else if (typeof is_active === 'boolean') {
        isActiveValue = is_active;
    } else if (typeof is_active === 'number') {
        isActiveValue = is_active === 1;
    } else {
        // Unknown type, default to false
        isActiveValue = false;
    }
    
    console.log('PUT /api/private-charter-voucher-types/:id - is_active handling:', {
        originalValue: is_active,
        type: typeof is_active,
        convertedValue: isActiveValue,
        reqBody: req.body
    });
    
    // Additional logging for debugging
    console.log('PUT /api/private-charter-voucher-types/:id - All form fields:', {
        title,
        description,
        max_passengers,
        validity_months,
        flight_days,
        flight_time,
        features,
        terms,
        sort_order,
        is_active
    });
    
    const values = [
        title,
        description,
        image_url,
        image_text_tag || null,
        max_passengers || 8,
        validity_months || 18,
        flight_days || 'Any Day',
        flight_time || 'AM & PM',
        features || '[]',
        terms || '',
        sort_order || 0,
        isActiveValue,
        id
    ];
    
    console.log('PUT /api/private-charter-voucher-types/:id - SQL Query:', sql);
    console.log('PUT /api/private-charter-voucher-types/:id - Values:', values);
    
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error updating private charter voucher type:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Private charter voucher type not found' });
        }
        
        console.log('PUT /api/private-charter-voucher-types/:id - Update successful, affected rows:', result.affectedRows);
        console.log('PUT /api/private-charter-voucher-types/:id - Update result info:', {
            affectedRows: result.affectedRows,
            changedRows: result.changedRows,
            info: result.info,
            serverStatus: result.serverStatus,
            warningCount: result.warningCount
        });
        
        // Fetch the updated voucher type to return complete data
        const selectSql = `SELECT * FROM private_charter_voucher_types WHERE id = ?`;
        con.query(selectSql, [id], (selectErr, selectResult) => {
            if (selectErr) {
                console.error('Error fetching updated voucher type:', selectErr);
                // Still return success, but without the updated data
                res.json({
                    success: true,
                    message: 'Private charter voucher type updated successfully',
                    image_url: image_url
                });
            } else {
                console.log('Updated voucher type fetched:', selectResult[0]);
                console.log('CRITICAL DEBUG - Final is_active value in DB:', {
                    db_is_active: selectResult[0]?.is_active,
                    db_is_active_type: typeof selectResult[0]?.is_active,
                    expected_isActiveValue: isActiveValue,
                    expected_isActiveValue_type: typeof isActiveValue
                });
                res.json({
                    success: true,
                    message: 'Private charter voucher type updated successfully',
                    image_url: image_url,
                    data: selectResult[0]
                });
            }
        });
    });
});

// Delete private charter voucher type
app.delete('/api/private-charter-voucher-types/:id', (req, res) => {
    const { id } = req.params;
    
    const sql = 'DELETE FROM private_charter_voucher_types WHERE id = ?';
    
    con.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting private charter voucher type:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Private charter voucher type not found' });
        }
        
        res.json({
            success: true,
            message: 'Private charter voucher type deleted successfully'
        });
    });
});

// Test endpoint to check database connection and table contents
app.get('/api/debug/add-to-booking-items', (req, res) => {
    console.log('🔧 DEBUG: /api/debug/add-to-booking-items called');
    
    // Test database connection
    con.query('SELECT 1 as test', (err, result) => {
        if (err) {
            console.error('❌ Database connection test failed:', err);
            return res.json({ 
                success: false, 
                message: 'Database connection failed',
                error: err.message 
            });
        }
        console.log('✅ Database connection test passed');
        
        // Check if table exists
        con.query('SHOW TABLES LIKE "add_to_booking_items"', (err, tables) => {
            if (err) {
                console.error('❌ Table check failed:', err);
                return res.json({ 
                    success: false, 
                    message: 'Table check failed',
                    error: err.message 
                });
            }
            
            if (tables.length === 0) {
                console.log('❌ Table add_to_booking_items does not exist');
                return res.json({ 
                    success: false, 
                    message: 'Table add_to_booking_items does not exist',
                    tables: tables
                });
            }
            
            console.log('✅ Table add_to_booking_items exists');
            
            // Check table structure
            con.query('DESCRIBE add_to_booking_items', (err, structure) => {
                if (err) {
                    console.error('❌ Table structure check failed:', err);
                    return res.json({ 
                        success: false, 
                        message: 'Table structure check failed',
                        error: err.message 
                    });
                }
                
                console.log('✅ Table structure:', structure);
                
                // Check table contents
                con.query('SELECT COUNT(*) as total_count FROM add_to_booking_items', (err, countResult) => {
                    if (err) {
                        console.error('❌ Count query failed:', err);
                        return res.json({ 
                            success: false, 
                            message: 'Count query failed',
                            error: err.message,
                            structure: structure
                        });
                    }
                    
                    const totalCount = countResult[0].total_count;
                    console.log('✅ Total items in table:', totalCount);
                    
                    if (totalCount > 0) {
                        // Get sample data
                        con.query('SELECT id, title, is_active, journey_types, locations, experience_types FROM add_to_booking_items LIMIT 3', (err, sampleData) => {
                            if (err) {
                                console.error('❌ Sample data query failed:', err);
                                return res.json({ 
                                    success: true, 
                                    message: 'Table exists with data but sample query failed',
                                    totalCount: totalCount,
                                    structure: structure,
                                    error: err.message
                                });
                            }
                            
                            console.log('✅ Sample data:', sampleData);
                            res.json({ 
                                success: true, 
                                message: 'Table exists with data',
                                totalCount: totalCount,
                                structure: structure,
                                sampleData: sampleData
                            });
                        });
                    } else {
                        res.json({ 
                            success: true, 
                            message: 'Table exists but is empty',
                            totalCount: totalCount,
                            structure: structure
                        });
                    }
                });
            });
        });
    });
});

// ==================== ADD TO BOOKING ITEMS API ENDPOINTS ====================

// Get all add to booking items
app.get('/api/add-to-booking-items', (req, res) => {
    console.log('GET /api/add-to-booking-items called');
    console.log('Request headers:', req.headers);
    console.log('Request query:', req.query);
    
    const sql = `SELECT * FROM add_to_booking_items ORDER BY sort_order ASC, created_at DESC`;
    console.log('SQL Query:', sql);
    
    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching add to booking items:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        console.log('Database query completed');
        console.log('Query result:', result);
        console.log('Result type:', typeof result);
        console.log('Result is array:', Array.isArray(result));
        console.log('Result length:', result ? result.length : 'undefined');
        
        if (result && result.length > 0) {
            console.log('First item sample:', {
                id: result[0].id,
                title: result[0].title,
                is_active: result[0].is_active,
                journey_types: result[0].journey_types,
                locations: result[0].locations,
                experience_types: result[0].experience_types
            });
        } else {
            console.log('⚠️ No items found in database');
            console.log('This could mean:');
            console.log('1. Table is empty');
            console.log('2. All items are inactive');
            console.log('3. Database connection issue');
        }
        
        // Add cache busting to image URLs and ensure proper image serving
        if (result && Array.isArray(result)) {
            result.forEach(item => {
                if (item.image_url && item.image_url.startsWith('/uploads/')) {
                    // Add timestamp for cache busting
                    const timestamp = Date.now();
                    item.image_url = `${item.image_url}?t=${timestamp}`;
                    
                    // Leave as relative path - frontend will handle absolute URL conversion
                    // This allows flexibility for different environments and cross-origin scenarios
                }
            });
        }
        
        // Add cache control headers
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        console.log('Sending response with', result ? result.length : 0, 'items');
        res.json({ success: true, data: result });
    });
});
// Create new add to booking item
app.post('/api/add-to-booking-items', experiencesUpload.single('add_to_booking_item_image'), (req, res) => {
    const {
        title,
        description,
        price,
        price_unit,
        category,
        stock_quantity,
        is_physical_item,
        weight_grams,
        journey_types,
        locations,
        experience_types,
        sort_order,
        is_active
    } = req.body;
    
    // Validation
    if (!title || !description || !price) {
        return res.status(400).json({ success: false, message: 'Missing required fields: title, description, and price' });
    }
    
    // Handle image upload
    let image_url = req.body.image_url; // Keep existing image if no new file uploaded
    if (req.file) {
        image_url = `/uploads/experiences/${req.file.filename}`;
    }
    
    const sql = `
        INSERT INTO add_to_booking_items (
            title, description, image_url, price, price_unit, category,
            stock_quantity, is_physical_item, weight_grams, journey_types, locations, experience_types, sort_order, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
        title,
        description,
        image_url,
        price,
        price_unit || 'fixed',
        category || 'Merchandise',
        stock_quantity || 0,
        is_physical_item !== undefined ? (is_physical_item === 'true' || is_physical_item === true) : true,
        weight_grams || 0,
        journey_types || JSON.stringify(['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift']),
        locations || JSON.stringify(['Bath', 'Devon', 'Somerset', 'Bristol Fiesta']),
        experience_types || JSON.stringify(['Shared Flight', 'Private Charter']),
        sort_order || 0,
        is_active !== undefined ? (is_active === 'true' || is_active === true) : true
    ];
    
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error creating add to booking item:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        res.json({
            success: true,
            message: 'Add to booking item created successfully',
            id: result.insertId
        });
    });
});

// Update add to booking item
app.put('/api/add-to-booking-items/:id', experiencesUpload.single('add_to_booking_item_image'), (req, res) => {
    const { id } = req.params;
    const {
        title,
        description,
        price,
        price_unit,
        category,
        stock_quantity,
        is_physical_item,
        weight_grams,
        journey_types,
        locations,
        experience_types,
        sort_order,
        is_active
    } = req.body;
    
    // Debug: Log received values
    console.log('PUT /api/add-to-booking-items/:id - Received data:', {
        id,
        title,
        description,
        price,
        price_unit,
        category,
        stock_quantity,
        is_physical_item,
        weight_grams,
        journey_types,
        sort_order,
        is_active,
        is_active_type: typeof is_active,
        is_active_value: is_active
    });
    
    // Validation
    if (!title || !description || !price) {
        return res.status(400).json({ success: false, message: 'Missing required fields: title, description, and price' });
    }
    
    // Handle image upload
    let image_url = req.body.image_url; // Keep existing image if no new file uploaded
    if (req.file) {
        image_url = `/uploads/experiences/${req.file.filename}`;
        console.log('PUT - New image uploaded:', image_url);
    } else if (req.body.image_url) {
        console.log('PUT - Keeping existing image:', req.body.image_url);
    } else {
        console.log('PUT - No image provided');
    }
    
    const sql = `
        UPDATE add_to_booking_items SET 
            title = ?, description = ?, image_url = ?, price = ?, 
            price_unit = ?, category = ?, stock_quantity = ?, is_physical_item = ?,
            weight_grams = ?, journey_types = ?, locations = ?, experience_types = ?, sort_order = ?, is_active = ?
        WHERE id = ?
    `;
    
    const values = [
        title,
        description,
        image_url,
        price,
        price_unit || 'fixed',
        category || 'Merchandise',
        stock_quantity || 0,
        is_physical_item !== undefined ? (is_physical_item === 'true' || is_physical_item === true) : true,
        weight_grams || 0,
        journey_types || JSON.stringify(['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift']),
        locations || JSON.stringify(['Bath', 'Devon', 'Somerset', 'Bristol Fiesta']),
        experience_types || JSON.stringify(['Shared Flight', 'Private Charter']),
        sort_order || 0,
        is_active !== undefined ? (is_active === 'true' || is_active === true) : true,
        id
    ];
    
    // Debug: Log SQL values
    console.log('SQL values being sent:', values);
    console.log('is_active value in SQL:', is_active !== undefined ? (is_active === 'true' || is_active === true) : true);
    
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error updating add to booking item:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Add to booking item not found' });
        }
        
        res.json({
            success: true,
            message: 'Add to booking item updated successfully',
            image_url: image_url
        });
    });
});

// Delete add to booking item
app.delete('/api/add-to-booking-items/:id', (req, res) => {
    const { id } = req.params;
    
    const sql = 'DELETE FROM add_to_booking_items WHERE id = ?';
    
    con.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting add to booking item:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Add to booking item not found' });
        }
        
        res.json({
            success: true,
            message: 'Add to booking item deleted successfully'
        });
    });
});

// ==================== STATIC FILE SERVING ====================
// Serve uploaded images with cache busting
app.get('/uploads/experiences/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', 'experiences', filename);
    
    // Add cache control headers
    res.set({
        'Cache-Control': 'public, max-age=60',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    
    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }
    console.warn('Experience image not found:', filePath);
    // Return a 1x1 transparent PNG to avoid client errors
    const placeholder = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(placeholder);
});

// ==================== ADDITIONAL INFORMATION QUESTIONS API ENDPOINTS ====================

// Get all additional information questions
app.get('/api/additional-information-questions', (req, res) => {
    console.log('GET /api/additional-information-questions called');
    const sql = `SELECT * FROM additional_information_questions ORDER BY sort_order ASC, created_at DESC`;
    console.log('SQL Query:', sql);
    
    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching additional information questions:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        console.log('Query result:', result);
        console.log('Result length:', result ? result.length : 'undefined');
        res.json({ success: true, data: result });
    });
});

// Create new additional information question
app.post('/api/additional-information-questions', (req, res) => {
    const {
        question_text,
        question_type,
        is_required,
        options,
        placeholder_text,
        help_text,
        category,
        journey_types,
        locations,
        experience_types,
        sort_order,
        is_active
    } = req.body;
    
    // Validation
    if (!question_text || !question_type) {
        return res.status(400).json({ success: false, message: 'Missing required fields: question_text and question_type' });
    }
    
    const sql = `
        INSERT INTO additional_information_questions (
            question_text, question_type, is_required, options,
            placeholder_text, help_text, category, journey_types, locations, experience_types, sort_order, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
        question_text,
        question_type,
        is_required !== undefined ? is_required : false,
        options || '[]',
        placeholder_text || null,
        help_text || null,
        category || 'General',
        Array.isArray(journey_types) ? JSON.stringify(journey_types) : (journey_types || JSON.stringify(['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'])),
        Array.isArray(locations) ? JSON.stringify(locations) : (locations || JSON.stringify(['Bath', 'Devon', 'Somerset', 'Bristol Fiesta'])),
        Array.isArray(experience_types) ? JSON.stringify(experience_types) : (experience_types || JSON.stringify(['Shared Flight', 'Private Charter'])),
        sort_order || 0,
        is_active !== undefined ? is_active : true
    ];
    
    // Debug: Log SQL values
    console.log('SQL values being sent:', values);
    console.log('journey_types value in SQL:', Array.isArray(journey_types) ? JSON.stringify(journey_types) : (journey_types || JSON.stringify(['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'])));
    
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error creating additional information question:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        res.json({
            success: true,
            message: 'Additional information question created successfully',
            id: result.insertId
        });
    });
});

// Crew Management API Endpoints

// Get all crew members
app.get('/api/crew', (req, res) => {
    const sql = 'SELECT * FROM crew ORDER BY last_name ASC, first_name ASC';
    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching crew members:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        res.json({ success: true, data: result });
    });
});

// Get crew member by ID
app.get('/api/crew/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM crew WHERE id = ?';
    con.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error fetching crew member:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        if (result.length === 0) {
            return res.status(404).json({ success: false, message: 'Crew member not found' });
        }
        res.json({ success: true, data: result[0] });
    });
});

// Update additional information question
app.put('/api/additional-information-questions/:id', (req, res) => {
    const { id } = req.params;
    const {
        question_text,
        question_type,
        is_required,
        options,
        placeholder_text,
        help_text,
        category,
        journey_types,
        locations,
        experience_types,
        sort_order,
        is_active
    } = req.body;
    
    // Debug: Log received values
    console.log('PUT /api/additional-information-questions/:id - Received data:', {
        id,
        question_text,
        question_type,
        is_required,
        options,
        placeholder_text,
        help_text,
        category,
        journey_types,
        journey_types_type: typeof journey_types,
        journey_types_isArray: Array.isArray(journey_types),
        sort_order,
        is_active
    });
    
    // Validation
    if (!question_text || !question_type) {
        return res.status(400).json({ success: false, message: 'Missing required fields: question_text and question_type' });
    }
    
    const sql = `
        UPDATE additional_information_questions SET 
            question_text = ?, question_type = ?, is_required = ?, options = ?,
            placeholder_text = ?, help_text = ?, category = ?, journey_types = ?, locations = ?, experience_types = ?, sort_order = ?, is_active = ?
        WHERE id = ?
    `;
    
    const values = [
        question_text,
        question_type,
        is_required !== undefined ? is_required : false,
        options || '[]',
        placeholder_text || null,
        help_text || null,
        category || 'General',
        Array.isArray(journey_types) ? JSON.stringify(journey_types) : (journey_types || JSON.stringify(['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'])),
        Array.isArray(locations) ? JSON.stringify(locations) : (locations || JSON.stringify(['Bath', 'Devon', 'Somerset', 'Bristol Fiesta'])),
        Array.isArray(experience_types) ? JSON.stringify(experience_types) : (experience_types || JSON.stringify(['Shared Flight', 'Private Charter'])),
        sort_order || 0,
        is_active !== undefined ? is_active : true,
        id
    ];
    
    // Debug: Log SQL values
    console.log('SQL values being sent:', values);
    console.log('journey_types value in SQL:', Array.isArray(journey_types) ? JSON.stringify(journey_types) : (journey_types || JSON.stringify(['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'])));
    
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error updating additional information question:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Additional information question not found' });
        }
        
        res.json({
            success: true,
            message: 'Additional information question updated successfully'
        });
    });
});

// Delete additional information question
app.delete('/api/additional-information-questions/:id', (req, res) => {
    const { id } = req.params;
    
    const sql = 'DELETE FROM additional_information_questions WHERE id = ?';
    
    con.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting additional information question:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Additional information question not found' });
        }
        
        res.json({
            success: true,
            message: 'Additional information question deleted successfully'
        });
    });
});

// ==================== CREW MANAGEMENT API ENDPOINTS ====================

// Create new crew member
app.post('/api/crew', (req, res) => {
    const { first_name, last_name, is_active } = req.body;
    
    // Validation
    if (!first_name || !last_name) {
        return res.status(400).json({ success: false, message: 'Missing required fields: first_name and last_name' });
    }
    
    const sql = 'INSERT INTO crew (first_name, last_name, is_active) VALUES (?, ?, ?)';
    const values = [
        first_name.trim(),
        last_name.trim(),
        is_active !== undefined ? is_active : true
    ];
    
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error creating crew member:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'A crew member with this name already exists' });
            }
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        res.json({
            success: true,
            message: 'Crew member created successfully',
            id: result.insertId
        });
    });
});

// Update crew member
app.put('/api/crew/:id', (req, res) => {
    const { id } = req.params;
    const { first_name, last_name, is_active } = req.body;
    
    // Validation
    if (!first_name || !last_name) {
        return res.status(400).json({ success: false, message: 'Missing required fields: first_name and last_name' });
    }
    
    const sql = 'UPDATE crew SET first_name = ?, last_name = ?, is_active = ? WHERE id = ?';
    const values = [
        first_name.trim(),
        last_name.trim(),
        is_active !== undefined ? is_active : true,
        id
    ];
    
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error updating crew member:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'A crew member with this name already exists' });
            }
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Crew member not found' });
        }
        
        res.json({
            success: true,
            message: 'Crew member updated successfully'
        });
    });
});

// Delete crew member
app.delete('/api/crew/:id', (req, res) => {
    const { id } = req.params;
    
    const sql = 'DELETE FROM crew WHERE id = ?';
    
    con.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting crew member:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Crew member not found' });
        }
        
        res.json({
            success: true,
            message: 'Crew member deleted successfully'
        });
    });
});

// ==================== TERMS & CONDITIONS API ENDPOINTS ====================

// Get all terms and conditions
app.get('/api/terms-and-conditions', async (req, res) => {
    console.log('GET /api/terms-and-conditions called');
    const sql = `SELECT * FROM terms_and_conditions ORDER BY sort_order ASC, created_at DESC`;
    console.log('SQL Query:', sql);
    
    try {
        const result = await new Promise((resolve, reject) => {
            con.query(sql, (err, result) => {
                if (err) {
                    console.error('Error fetching terms and conditions:', err);
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
        
        console.log('Query result:', result);
        console.log('Result length:', result ? result.length : 'undefined');
        
        // Debug: Check if private_voucher_type_ids is present in results
        if (result && result.length > 0) {
            result.forEach((item, index) => {
                console.log(`Item ${index + 1} - private_voucher_type_ids:`, {
                    id: item.id,
                    title: item.title,
                    private_voucher_type_ids: item.private_voucher_type_ids,
                    private_voucher_type_ids_type: typeof item.private_voucher_type_ids
                });
            });
        }
        
        // Enrich with voucher type information
        if (result && result.length > 0) {
            const enrichedResult = await Promise.all(result.map(async (terms) => {
                const enrichedTerms = { ...terms };
                
                // Add voucher type information for private_voucher_type_ids
                if (terms.private_voucher_type_ids && Array.isArray(terms.private_voucher_type_ids) && terms.private_voucher_type_ids.length > 0) {
                    try {
                        // Get private charter voucher type information
                        const privateVoucherTypes = await new Promise((resolve, reject) => {
                            const privateVoucherTypesQuery = `SELECT id, title FROM private_charter_voucher_types WHERE id IN (${terms.private_voucher_type_ids.map(() => '?').join(',')})`;
                            con.query(privateVoucherTypesQuery, terms.private_voucher_type_ids, (err, result) => {
                                if (err) reject(err);
                                else resolve(result);
                            });
                        });
                        enrichedTerms.private_voucher_types = privateVoucherTypes;
                        console.log('🔍 Private voucher types found:', privateVoucherTypes);
                    } catch (e) {
                        console.error('Error fetching private_voucher_type_ids:', e);
                    }
                }
                
                // Add voucher type information for voucher_type_ids
                if (terms.voucher_type_ids && Array.isArray(terms.voucher_type_ids) && terms.voucher_type_ids.length > 0) {
                    try {
                        // Get normal voucher type information
                        const voucherTypes = await new Promise((resolve, reject) => {
                            const voucherTypesQuery = `SELECT id, title FROM voucher_types WHERE id IN (${terms.voucher_type_ids.map(() => '?').join(',')})`;
                            con.query(voucherTypesQuery, terms.voucher_type_ids, (err, result) => {
                                if (err) reject(err);
                                else resolve(result);
                            });
                        });
                        enrichedTerms.voucher_types = voucherTypes;
                        console.log('🔍 Voucher types found:', voucherTypes);
                    } catch (e) {
                        console.error('Error fetching voucher_type_ids:', e);
                    }
                }
                
                return enrichedTerms;
            }));
            
            res.json({ success: true, data: enrichedResult });
        } else {
            res.json({ success: true, data: result });
        }
    } catch (error) {
        console.error('Error in terms and conditions endpoint:', error);
        res.status(500).json({ success: false, message: 'Database error', error: error.message });
    }
});

// Get terms and conditions by voucher type
app.get('/api/terms-and-conditions/voucher-type/:voucherTypeId', (req, res) => {
    const { voucherTypeId } = req.params;
    console.log('GET /api/terms-and-conditions/voucher-type/' + voucherTypeId + ' called');
    
    const sql = `SELECT * FROM terms_and_conditions WHERE (voucher_type_id = ? OR JSON_CONTAINS(voucher_type_ids, ?) OR JSON_CONTAINS(private_voucher_type_ids, ?)) AND is_active = 1 ORDER BY sort_order ASC`;
    console.log('SQL Query:', sql);
    
    con.query(sql, [parseInt(voucherTypeId), JSON.stringify(parseInt(voucherTypeId)), JSON.stringify(parseInt(voucherTypeId))], (err, result) => {
        if (err) {
            console.error('Error fetching terms and conditions for voucher type:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        console.log('Query result:', result);
        res.json({ success: true, data: result });
    });
});

// Get terms and conditions by experience type (e.g., "Private Charter", "Shared Flight")
app.get('/api/terms-and-conditions/experience/:experienceType', (req, res) => {
    const { experienceType } = req.params;
    console.log('GET /api/terms-and-conditions/experience/' + experienceType + ' called');
    
    // Map experience types to experience IDs
    const experienceTypeMap = {
        'Private Charter': 2,
        'Shared Flight': 1
    };
    
    const experienceId = experienceTypeMap[experienceType];
    if (!experienceId) {
        return res.status(400).json({ success: false, message: 'Invalid experience type' });
    }
    
    const sql = `SELECT * FROM terms_and_conditions WHERE (JSON_CONTAINS(experience_ids, ?) OR JSON_CONTAINS(private_voucher_type_ids, ?)) AND is_active = 1 ORDER BY sort_order ASC`;
    console.log('SQL Query:', sql);
    
    con.query(sql, [JSON.stringify(experienceId), JSON.stringify(experienceId)], (err, result) => {
        if (err) {
            console.error('Error fetching terms and conditions for experience type:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        console.log('Query result:', result);
        res.json({ success: true, data: result });
    });
});

// Create new terms and conditions
app.post('/api/terms-and-conditions', (req, res) => {
    const {
        title,
        content,
        experience_ids,
        voucher_type_id,
        voucher_type_ids,
        private_voucher_type_ids,
        is_active,
        sort_order
    } = req.body;
    
    // Normalize experience input
    const normalizedExperienceIds = Array.isArray(experience_ids) && experience_ids.length > 0
        ? experience_ids.map((v) => Number(v))
        : [];
    
    // Normalize voucher type input
    const normalizedVoucherTypeIds = Array.isArray(voucher_type_ids) && voucher_type_ids.length > 0
        ? voucher_type_ids.map((v) => Number(v))
        : (voucher_type_id ? [Number(voucher_type_id)] : []);

    // Normalize private voucher type input
    const normalizedPrivateVoucherTypeIds = Array.isArray(private_voucher_type_ids) && private_voucher_type_ids.length > 0
        ? private_voucher_type_ids.map((v) => Number(v))
        : [];

    // Validation - require either experiences, voucher types, or private voucher types
    if (!title || !content || (normalizedExperienceIds.length === 0 && normalizedVoucherTypeIds.length === 0 && normalizedPrivateVoucherTypeIds.length === 0)) {
        return res.status(400).json({ success: false, message: 'Missing required fields: title, content, and at least one selection (experience_ids, voucher_type_ids, or private_voucher_type_ids)' });
    }
    
    const sql = `
        INSERT INTO terms_and_conditions (
            title, content, experience_ids, voucher_type_id, voucher_type_ids, private_voucher_type_ids, is_active, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
        title,
        content,
        JSON.stringify(normalizedExperienceIds),
        normalizedVoucherTypeIds[0] || null,
        JSON.stringify(normalizedVoucherTypeIds),
        JSON.stringify(normalizedPrivateVoucherTypeIds),
        is_active !== undefined ? is_active : true,
        sort_order || 0
    ];
    
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error creating terms and conditions:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        res.json({
            success: true,
            message: 'Terms and conditions created successfully',
            id: result.insertId
        });
    });
});
// Update terms and conditions
app.put('/api/terms-and-conditions/:id', (req, res) => {
    const { id } = req.params;
    const {
        title,
        content,
        experience_ids,
        voucher_type_id,
        voucher_type_ids,
        private_voucher_type_ids,
        is_active,
        sort_order
    } = req.body;
    
    console.log('PUT /api/terms-and-conditions/' + id + ' called');
    console.log('Request body:', req.body);
    console.log('experience_ids type:', typeof experience_ids);
    console.log('experience_ids value:', experience_ids);
    console.log('voucher_type_ids type:', typeof voucher_type_ids);
    console.log('voucher_type_ids value:', voucher_type_ids);
    console.log('private_voucher_type_ids type:', typeof private_voucher_type_ids);
    console.log('private_voucher_type_ids value:', private_voucher_type_ids);
    console.log('private_voucher_type_ids length:', private_voucher_type_ids ? private_voucher_type_ids.length : 'undefined');
    console.log('private_voucher_type_ids isArray:', Array.isArray(private_voucher_type_ids));
    
    // Normalize experience input
    const normalizedExperienceIds = Array.isArray(experience_ids) && experience_ids.length > 0
        ? experience_ids.map((v) => Number(v))
        : [];
    
    // Normalize voucher type input
    const normalizedVoucherTypeIds = Array.isArray(voucher_type_ids) && voucher_type_ids.length > 0
        ? voucher_type_ids.map((v) => Number(v))
        : (voucher_type_id ? [Number(voucher_type_id)] : []);

    // Normalize private voucher type input
    const normalizedPrivateVoucherTypeIds = Array.isArray(private_voucher_type_ids) && private_voucher_type_ids.length > 0
        ? private_voucher_type_ids.map((v) => Number(v))
        : [];

    // Validation - require either experiences, voucher types, or private voucher types
    if (!title || !content || (normalizedExperienceIds.length === 0 && normalizedVoucherTypeIds.length === 0 && normalizedPrivateVoucherTypeIds.length === 0)) {
        return res.status(400).json({ success: false, message: 'Missing required fields: title, content, and at least one selection (experience_ids, voucher_type_ids, or private_voucher_type_ids)' });
    }
    
    const sql = `
        UPDATE terms_and_conditions SET 
            title = ?, content = ?, experience_ids = ?, voucher_type_id = ?, voucher_type_ids = ?, private_voucher_type_ids = ?, is_active = ?, sort_order = ?
        WHERE id = ?
    `;
    
    const values = [
        title,
        content,
        JSON.stringify(normalizedExperienceIds),
        normalizedVoucherTypeIds[0] || null,
        JSON.stringify(normalizedVoucherTypeIds),
        JSON.stringify(normalizedPrivateVoucherTypeIds),
        is_active !== undefined ? is_active : true,
        sort_order || 0,
        id
    ];
    
    console.log('SQL values:', values);
    
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error updating terms and conditions:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Terms and conditions not found' });
        }
        
        console.log('Terms and conditions updated successfully');
        res.json({
            success: true,
            message: 'Terms and conditions updated successfully'
        });
    });
});

// Delete terms and conditions
app.delete('/api/terms-and-conditions/:id', (req, res) => {
    const { id } = req.params;
    
    const sql = 'DELETE FROM terms_and_conditions WHERE id = ?';
    
    con.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting terms and conditions:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Terms and conditions not found' });
        }
        
        res.json({
            success: true,
            message: 'Terms and conditions deleted successfully'
        });
    });
});

// ==================== PASSENGER TERMS API ENDPOINTS ====================
// List all passenger terms
app.get('/api/passenger-terms', (req, res) => {
    const sql = 'SELECT * FROM passenger_terms ORDER BY sort_order ASC, created_at DESC';
    con.query(sql, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        res.json({ success: true, data: result });
    });
});

// List by journey type (Book Flight, Flight Voucher, Buy Gift, Redeem Voucher)
app.get('/api/passenger-terms/journey/:journey', (req, res) => {
    const journey = req.params.journey;
    const sql = 'SELECT * FROM passenger_terms WHERE JSON_CONTAINS(journey_types, ?) AND is_active = 1 ORDER BY sort_order ASC';
    con.query(sql, [JSON.stringify(journey)], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        res.json({ success: true, data: result });
    });
});

// Create passenger terms
app.post('/api/passenger-terms', (req, res) => {
    const { title, content, journey_types, is_active, sort_order } = req.body;
    if (!title || !content || !Array.isArray(journey_types) || journey_types.length === 0) {
        return res.status(400).json({ success: false, message: 'Missing required fields: title, content, journey_types[]' });
    }
    const sql = 'INSERT INTO passenger_terms (title, content, journey_types, is_active, sort_order) VALUES (?, ?, ?, ?, ?)';
    const values = [title, content, JSON.stringify(journey_types), is_active !== undefined ? is_active : 1, sort_order || 0];
    con.query(sql, values, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

// Update passenger terms
app.put('/api/passenger-terms/:id', (req, res) => {
    const { id } = req.params;
    const { title, content, journey_types, is_active, sort_order } = req.body;
    if (!title || !content || !Array.isArray(journey_types) || journey_types.length === 0) {
        return res.status(400).json({ success: false, message: 'Missing required fields: title, content, journey_types[]' });
    }
    const sql = 'UPDATE passenger_terms SET title=?, content=?, journey_types=?, is_active=?, sort_order=? WHERE id=?';
    const values = [title, content, JSON.stringify(journey_types), is_active !== undefined ? is_active : 1, sort_order || 0, id];
    con.query(sql, values, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true });
    });
});

// Delete passenger terms
app.delete('/api/passenger-terms/:id', (req, res) => {
    const { id } = req.params;
    con.query('DELETE FROM passenger_terms WHERE id=?', [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true });
    });
});
// Simple webhook test endpoint
app.get('/api/webhook-test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Webhook endpoint is accessible',
        timestamp: new Date().toISOString(),
        sessionStore: Object.keys(stripeSessionStore),
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'SET' : 'NOT SET'
    });
});

// Stripe Webhook endpoint
app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
    console.log('Stripe webhook endpoint hit!');
    console.log('Webhook body length:', req.body ? req.body.length : 'undefined');
    console.log('Webhook headers:', req.headers);
    
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
        // Webhook signature verification
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            console.error('STRIPE_WEBHOOK_SECRET environment variable is not set');
            return res.status(500).send('Webhook configuration error');
        }
        
        console.log('Webhook secret:', process.env.STRIPE_WEBHOOK_SECRET);
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        console.log('Webhook signature verified successfully');
        console.log('Webhook event type:', event.type);
        console.log('Webhook event ID:', event.id);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            console.log('Checkout session completed:', session.id);
            console.log('Session metadata:', session.metadata);
            
            const session_id = session.id;
            console.log('Using session ID:', session_id);
            
            const storeData = stripeSessionStore[session_id];
            console.log('Store data found:', !!storeData);
            console.log('Store data content:', storeData);
            
            if (!storeData) {
                console.error('Stripe session store data not found for session_id:', session_id);
                console.log('Available session IDs in store:', Object.keys(stripeSessionStore));
                return res.status(400).send('Session data not found');
            }
            
            // Duplicate kontrolü - aynı session için birden fazla işlem yapılmasını engelle
            if (storeData.processed) {
                console.log('Session already processed, skipping:', session_id);
                return res.json({received: true, message: 'Session already processed'});
            }
            
            // Session ID kontrolü - session data var mı kontrol et
            if (!storeData.bookingData && !storeData.voucherData) {
                console.log('No booking/voucher data found for session:', session_id);
                return res.status(400).send('No booking/voucher data found');
            }
            
            console.log('Processing webhook for session:', session_id, 'Type:', storeData.type);
            
            try {
                if (storeData.type === 'booking') {
                    // If already processed with a booking id, skip duplicate creation
                    if (storeData.bookingData?.booking_id) {
                        console.log('Webhook: booking already created for session, skipping.');
                        return res.json({ received: true });
                    }
                    console.log('Creating booking via webhook:', storeData.bookingData);
                    // Direct database insertion instead of HTTP call
                    const bookingId = await createBookingFromWebhook(storeData.bookingData);
                    console.log('Webhook booking creation completed, ID:', bookingId);
                    // Mark processed and store created id to avoid duplicate creation by fallback
                    storeData.processed = true;
                    if (!storeData.bookingData) storeData.bookingData = {};
                    storeData.bookingData.booking_id = bookingId;
                    return res.json({ received: true });
                } else if (storeData.type === 'voucher') {
                    console.log('Creating voucher via webhook:', storeData.voucherData);
                    console.log('=== WEBHOOK VOUCHER DATA DEBUG ===');
                    console.log('storeData.voucherData.numberOfPassengers:', storeData.voucherData.numberOfPassengers);
                    console.log('typeof storeData.voucherData.numberOfPassengers:', typeof storeData.voucherData.numberOfPassengers);
                    console.log('storeData.voucherData.additionalInfo:', storeData.voucherData.additionalInfo);
                    console.log('storeData.voucherData.additional_information_json:', storeData.voucherData.additional_information_json);
                    console.log('storeData.voucherData.additional_information:', storeData.voucherData.additional_information);
                    console.log('typeof storeData.voucherData.additionalInfo:', typeof storeData.voucherData.additionalInfo);
                    console.log('storeData.voucherData.additionalInfo keys:', storeData.voucherData.additionalInfo ? Object.keys(storeData.voucherData.additionalInfo) : 'additionalInfo is null/undefined');
                    console.log('storeData.voucherData.add_to_booking_items:', storeData.voucherData.add_to_booking_items);
                    console.log('typeof storeData.voucherData.add_to_booking_items:', typeof storeData.voucherData.add_to_booking_items);
                    console.log('storeData.voucherData.add_to_booking_items length:', storeData.voucherData.add_to_booking_items ? storeData.voucherData.add_to_booking_items.length : 'add_to_booking_items is null/undefined');
                    
                    // Check if voucher was already created to prevent duplicate creation
                    if (storeData.voucherData?.voucher_id) {
                        console.log('Webhook: voucher already created for session, skipping. ID:', storeData.voucherData.voucher_id);
                        return res.json({ received: true });
                    }
                    
                    // Webhook creates the voucher, voucher code generation will be done by createBookingFromSession
                    console.log('Creating voucher via webhook, voucher code generation will be done by createBookingFromSession');
                    
                    // Log the voucher data before creation
                    logToFile('Creating voucher from webhook with data:', {
                        additionalInfo: storeData.voucherData.additionalInfo,
                        additional_information_json: storeData.voucherData.additional_information_json,
                        add_to_booking_items: storeData.voucherData.add_to_booking_items
                    });

                    // Direct database insertion instead of HTTP call
                    const voucherId = await createVoucherFromWebhook(storeData.voucherData);
                    console.log('Webhook voucher creation completed, ID:', voucherId);
                    
                    // Store voucher ID in session data to prevent duplicate creation
                    storeData.voucherData.voucher_id = voucherId;
                    
                    // Mark session as processed to prevent duplicate calls
                    storeData.processed = true;
                    
                    // Webhook does NOT generate voucher code - this will be done by createBookingFromSession
                    console.log('Voucher code generation skipped in webhook - will be done by createBookingFromSession');
                    
                    // Immediately return to prevent further processing
                    return res.json({ received: true });
                }
                
                // Retain session data for a grace period so fallback createBookingFromSession can read it
                // Automatically clean up after 15 minutes to avoid memory growth
                if (storeData) {
                    try {
                        storeData.cleanupAt = Date.now() + (15 * 60 * 1000);
                        setTimeout(() => {
                            if (stripeSessionStore[session_id] && stripeSessionStore[session_id].cleanupAt <= Date.now()) {
                                delete stripeSessionStore[session_id];
                                console.log('Session data auto-cleaned after grace period for:', session_id);
                            }
                        }, 15 * 60 * 1000);
                        console.log('Session data retained for 15 minutes for fallback:', session_id);
                    } catch (e) {
                        console.warn('Failed to schedule session cleanup:', e);
                    }
                }
            } catch (error) {
                console.error('Error processing webhook:', error);
                // Hata durumunda processed flag'ini geri al
                storeData.processed = false;
                return res.status(500).send('Internal server error');
            }
        } else {
            console.log('Webhook event type not handled:', event.type);
        }
        
        res.json({received: true});
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).send('Webhook processing failed');
    }
});

// Body parsing middleware - webhook'tan SONRA
app.use(express.json()); // To parse JSON-encoded request bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded request bodies

// MySQL Connection with Reconnection Handling
const con = mysql.createPool({
    host: process.env.DB_HOST || "trip-booking-database.c9mqyasow9hg.us-east-1.rds.amazonaws.com",
    user: process.env.DB_USER || "admin",
    password: process.env.DB_PASSWORD || "qumton-jeghuz-doKxy3",
    database: process.env.DB_NAME || "trip_booking",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
});

// Create passenger_terms table if not exists (migration)
con.query(`
    CREATE TABLE IF NOT EXISTS passenger_terms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content LONGTEXT NOT NULL,
        journey_types JSON NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`, (err) => {
    if (err) console.error('Failed creating passenger_terms table:', err);
});

// Add add_to_booking_items column to all_vouchers table if not exists (migration)
con.query(`
    SET @column_exists = (
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'all_vouchers' 
        AND column_name = 'add_to_booking_items'
    );
    
    SET @sql = IF(@column_exists = 0, 
        'ALTER TABLE all_vouchers ADD COLUMN add_to_booking_items JSON DEFAULT NULL COMMENT "JSON array of selected add-to-booking items with their details"',
        'SELECT "Column add_to_booking_items already exists" as message'
    );
    
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
`, (err) => {
    if (err) console.error('Failed adding add_to_booking_items column:', err);
    else console.log('✅ add_to_booking_items column migration completed');
});

// Add voucher_passenger_details column to all_vouchers table if not exists (migration)
con.query(`
    SET @column_exists = (
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'all_vouchers' 
        AND column_name = 'voucher_passenger_details'
    );
    
    SET @sql = IF(@column_exists = 0, 
        'ALTER TABLE all_vouchers ADD COLUMN voucher_passenger_details JSON DEFAULT NULL COMMENT "JSON array of voucher passenger details when no booking exists"',
        'SELECT "Column voucher_passenger_details already exists" as message'
    );
    
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
`, (err) => {
    if (err) console.error('Failed adding voucher_passenger_details column:', err);
    else console.log('✅ voucher_passenger_details column migration completed');
});

// Multer storage config for activities and experiences
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Determine destination based on field name or route
        let uploadDir;
        if (file.fieldname === 'experience_image') {
            uploadDir = path.join(__dirname, 'uploads/experiences');
        } else {
            uploadDir = path.join(__dirname, 'uploads/activities');
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});
const upload = multer({ storage });

// Ensure uploads directories exist
const uploadsPath = path.join(__dirname, 'uploads');
const activitiesPath = path.join(uploadsPath, 'activities');
const experiencesPath = path.join(uploadsPath, 'experiences');

if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log('Created uploads directory:', uploadsPath);
}

if (!fs.existsSync(activitiesPath)) {
    fs.mkdirSync(activitiesPath, { recursive: true });
    console.log('Created activities directory:', activitiesPath);
}

if (!fs.existsSync(experiencesPath)) {
    fs.mkdirSync(experiencesPath, { recursive: true });
    console.log('Created experiences directory:', experiencesPath);
}

// Statik olarak uploads klasörünü sun
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test endpoint for checking uploads directory
app.get('/api/test-uploads', (req, res) => {
    // Set proper headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const uploadsPath = path.join(__dirname, 'uploads');
    const activitiesPath = path.join(uploadsPath, 'activities');
    
    try {
        const uploadsExists = fs.existsSync(uploadsPath);
        const activitiesExists = fs.existsSync(activitiesPath);
        
        let files = [];
        if (activitiesExists) {
            files = fs.readdirSync(activitiesPath);
        }
        
        console.log('Test uploads endpoint called');
        console.log('Uploads path:', uploadsPath);
        console.log('Activities path:', activitiesPath);
        console.log('Uploads exists:', uploadsExists);
        console.log('Activities exists:', activitiesExists);
        console.log('Files:', files);
        
        res.json({
            success: true,
            uploadsExists,
            activitiesExists,
            files,
            uploadsPath,
            activitiesPath,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in test-uploads endpoint:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API routes
app.get('/api/example', (req, res) => {
    res.json({ message: 'Hello from the backend!' });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json({ 
        message: 'API is working!',
        timestamp: new Date().toISOString(),
        server: 'flyawayballooning-system'
    });
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
            const formatted = result.map(row => {
                // If status is Cancelled, show '-' for flight_date
                if (row.status === 'Cancelled') {
                    return {
                        ...row,
                        flight_date: '-',
                        flight_date_display: '-',
                        created_at: row.created_at ? moment(row.created_at).format('YYYY-MM-DD') : '',
                        created_at_display: row.created_at ? moment(row.created_at).format('DD/MM/YYYY') : '',
                        choose_add_on: row.choose_add_on || ''
                    };
                }
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
                // Final, defensive classification of book_flight (server-side normalization)
                const vtLower = (row.actual_voucher_type || row.voucher_type || '').toLowerCase();
                const hasPurchaserSignals = !!(row.purchaser_name || row.purchaser_email || row.purchaser_phone || row.purchaser_mobile);
                const normalizedBookFlight = (hasPurchaserSignals || vtLower.includes('gift')) ? 'Gift Voucher' : (row.book_flight || 'Flight Voucher');

                return {
                    ...row,
                    book_flight: normalizedBookFlight,
                    created_at: row.created_at ? moment(row.created_at).format('YYYY-MM-DD') : '',
                    created_at_display: row.created_at ? moment(row.created_at).format('DD/MM/YYYY') : '',
                    choose_add_on: row.choose_add_on || '',
                    flight_date_display: flightDateFormatted
                };
            });
            res.send({ success: true, data: formatted });
        } else {
            res.send({ success: false, message: "No bookings found" });
        }
    });
});

// In-memory cache for getAllBookingData to prevent duplicate rapid calls
const __getAllBookingDataCache = {
    lastKey: null,
    lastAt: 0,
    lastResponse: null
};

// Get all booking data
app.get('/api/getAllBookingData', (req, res) => {
    console.log('GET /api/getAllBookingData called with filters:', req.query);
    
    // Debounce duplicate calls within 500ms for the same filters
    const cacheKey = JSON.stringify(req.query || {});
    const nowTs = Date.now();
    if (__getAllBookingDataCache.lastKey === cacheKey && (nowTs - __getAllBookingDataCache.lastAt) < 500 && __getAllBookingDataCache.lastResponse) {
        console.log('Responding from cache to avoid duplicate query');
        return res.json(__getAllBookingDataCache.lastResponse);
    }
    
    // Build WHERE clause based on filters
    let whereClause = '';
    let params = [];
    
    // Experience filter
    if (req.query.experience && req.query.experience !== 'Select') {
        if (req.query.experience === 'Private') {
            whereClause += ' AND (ab.experience = "Private Charter" OR ab.experience = "Private")';
        } else if (req.query.experience === 'Shared') {
            whereClause += ' AND (ab.experience = "Shared Flight" OR ab.experience = "Shared")';
        }
    }
    
    // Status filter
    if (req.query.status && req.query.status !== 'Select') {
        whereClause += ' AND ab.status = ?';
        params.push(req.query.status);
    }
    
    // Voucher Type filter
    if (req.query.voucher_type && req.query.voucher_type !== 'Select') {
        whereClause += ' AND ab.voucher_type = ?';
        params.push(req.query.voucher_type);
    }
    
    // Location filter
    if (req.query.location && req.query.location !== 'Select') {
        whereClause += ' AND ab.location = ?';
        params.push(req.query.location);
    }
    
    // Search by name or email
    if (req.query.search && req.query.search.trim() !== '') {
        whereClause += ' AND (ab.name LIKE ? OR ab.email LIKE ?)';
        const searchTerm = `%${req.query.search.trim()}%`;
        params.push(searchTerm, searchTerm);
    }
    
    // Remove leading ' AND ' if whereClause exists
    if (whereClause) {
        whereClause = 'WHERE ' + whereClause.substring(5);
    }
    
    // Optimized query with better indexing hints
    const sql = `
        SELECT 
            ab.*, 
            ab.name as passenger_name,
            ab.voucher_type as voucher_type,
            COALESCE(ab.voucher_code, vc.code, vcu_map.code) as voucher_code,
            DATE_FORMAT(ab.created_at, '%Y-%m-%d') as created_at_display,
            DATE_FORMAT(ab.expires, '%d/%m/%Y') as expires_display
        FROM all_booking ab
        LEFT JOIN voucher_codes vc 
            ON vc.code = ab.voucher_code
        LEFT JOIN voucher_code_usage vcu
            ON vcu.booking_id = ab.id OR (vcu.customer_email IS NOT NULL AND vcu.customer_email = ab.email)
        LEFT JOIN voucher_codes vcu_map
            ON vcu_map.id = vcu.voucher_code_id
        ${whereClause}
        ORDER BY ab.created_at DESC
        LIMIT 1000
    `;
    
    console.log('SQL Query:', sql);
    console.log('SQL Parameters:', params);
    
    con.query(sql, params, async (err, result) => {
        if (err) {
            console.error('Error fetching all booking data:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }
        
        // If voucher_code is still null, fallback to joined usage mapping
        const enriched = result.map(r => {
            if (!r.voucher_code && r.vcu_map_code) {
                r.voucher_code = r.vcu_map_code;
            }
            return r;
        });
        
        // Fetch additional information for all bookings in batch queries (optimized)
        try {
            // Get all booking IDs
            const bookingIds = enriched.map(b => b.id);
                
            if (bookingIds.length > 0) {
                // Batch fetch all additional information answers for all bookings
                const [allAnswersRows] = await new Promise((resolve, reject) => {
                    const answersSql = `
                        SELECT 
                            aia.id,
                            aia.question_id,
                            aia.answer,
                            aia.created_at,
                            aia.booking_id,
                            aiq.question_text,
                            aiq.question_type,
                            aiq.options,
                            aiq.help_text,
                            aiq.category
                        FROM additional_information_answers aia
                        JOIN additional_information_questions aiq ON aia.question_id = aiq.id
                        WHERE aia.booking_id IN (${bookingIds.map(() => '?').join(',')})
                        ORDER BY aia.booking_id, aiq.sort_order, aiq.id
                    `;
                    con.query(answersSql, bookingIds, (err, rows) => {
                        if (err) reject(err);
                        else resolve([rows]);
                    });
                });
                
                // Batch fetch all available questions (only once, not per booking)
                const [questionsRows] = await new Promise((resolve, reject) => {
                    const questionsSql = `
                        SELECT 
                            id,
                            question_text,
                            question_type,
                            options,
                            help_text,
                            category,
                            journey_types,
                            sort_order
                        FROM additional_information_questions 
                        WHERE is_active = 1 
                        ORDER BY sort_order, id
                    `;
                    con.query(questionsSql, (err, rows) => {
                        if (err) {
                            console.error('Error fetching questions:', err);
                            reject(err);
                        } else {
                            resolve([rows]);
                        }
                    });
                });
                
                // Group answers by booking_id
                const answersByBooking = {};
                allAnswersRows.forEach(answer => {
                    if (!answersByBooking[answer.booking_id]) {
                        answersByBooking[answer.booking_id] = [];
                    }
                    answersByBooking[answer.booking_id].push(answer);
                });
                
                // Format questions once
                const formattedQuestions = questionsRows.map(question => {
                    try {
                        let parsedOptions = [];
                        let parsedJourneyTypes = [];
                        
                        // Safely parse options
                        if (question.options) {
                            try {
                                parsedOptions = JSON.parse(question.options);
                            } catch (e) {
                                console.warn('Failed to parse options for question', question.id, e);
                                parsedOptions = [];
                            }
                        }
                        
                        // Safely parse journey_types
                        if (question.journey_types) {
                            if (Array.isArray(question.journey_types)) {
                                parsedJourneyTypes = question.journey_types;
                            } else if (typeof question.journey_types === 'string') {
                                try {
                                    parsedJourneyTypes = JSON.parse(question.journey_types);
                                } catch (e) {
                                    console.warn('Failed to parse journey_types for question', question.id, e);
                                    parsedJourneyTypes = [];
                                }
                            }
                        }
                        
                        return {
                            id: question.id,
                            question_text: question.question_text,
                            question_type: question.question_type,
                            options: parsedOptions,
                            help_text: question.help_text,
                            category: question.category,
                            journey_types: parsedJourneyTypes,
                            sort_order: question.sort_order
                        };
                    } catch (error) {
                        console.warn('Error processing question:', question.id, error);
                        return {
                            id: question.id,
                            question_text: question.question_text,
                            question_type: question.question_type,
                            options: [],
                            help_text: question.help_text,
                            category: question.category,
                            journey_types: [],
                            sort_order: question.sort_order
                        };
                    }
                });
                
                // Add additional information to each booking object
                enriched.forEach((booking, index) => {
                    const bookingAnswers = answersByBooking[booking.id] || [];
                    
                    const additionalInfo = {
                        questions: formattedQuestions,
                        answers: bookingAnswers.map(answer => ({
                        question_id: answer.question_id,
                        question_text: answer.question_text,
                        question_type: answer.question_type,
                        answer: answer.answer,
                        options: answer.options ? JSON.parse(answer.options) : [],
                        help_text: answer.help_text,
                        category: answer.category,
                        created_at: answer.created_at
                    })),
                    legacy: {
                        additional_notes: booking.additional_notes,
                        hear_about_us: booking.hear_about_us,
                        ballooning_reason: booking.ballooning_reason,
                        prefer: booking.prefer
                    },
                    additional_information_json: (() => {
                        if (!booking.additional_information_json) return null;
                        if (typeof booking.additional_information_json === 'string') {
                            try {
                                return JSON.parse(booking.additional_information_json);
                            } catch (e) {
                                console.warn('Failed to parse additional_information_json:', e);
                                return null;
                            }
                        }
                        return booking.additional_information_json;
                    })()
                };
                
                    enriched[index].additional_information = additionalInfo;
                });
            }
        } catch (error) {
            console.error('Error fetching additional information:', error);
            // Continue without additional information if there's an error
        }
        
        console.log(`Fetched ${result.length} bookings with additional information`);
        
        // Debug: Log what we're returning
        console.log('getAllBookingData - Returning bookings with additional info:', {
            totalBookings: enriched.length,
            sampleBooking: enriched[0] ? {
                id: enriched[0].id,
                hasAdditionalInfo: !!enriched[0].additional_information,
                questionsCount: enriched[0].additional_information?.questions?.length || 0,
                answersCount: enriched[0].additional_information?.answers?.length || 0
            } : null
        });
        
        const response = { success: true, data: enriched };
        
        // Cache the response
        __getAllBookingDataCache.lastKey = cacheKey;
        __getAllBookingDataCache.lastAt = nowTs;
        __getAllBookingDataCache.lastResponse = response;
        
        res.json(response);
    });
});

// In-memory short cache to avoid duplicate rapid calls for the same key
const __getAllVoucherDataCache = {
    lastKey: null,
    lastAt: 0,
    lastResponse: null
};

// Get All Voucher Data (with booking and passenger info)
app.get('/api/getAllVoucherData', (req, res) => {
    console.log('=== getAllVoucherData ENDPOINT CALLED ===');
    
    // Optional filters: vc_code or voucher_ref
    const { vc_code, voucher_ref } = req.query || {};
    console.log('Request query:', req.query);

    // Debounce duplicate calls within 800ms for the same key
    const cacheKey = JSON.stringify({ vc_code: vc_code || null, voucher_ref: voucher_ref || null });
    const nowTs = Date.now();
    if (__getAllVoucherDataCache.lastKey === cacheKey && (nowTs - __getAllVoucherDataCache.lastAt) < 800 && __getAllVoucherDataCache.lastResponse) {
        console.log('Responding from short cache to avoid duplicate query');
        return res.json(__getAllVoucherDataCache.lastResponse);
    }
    
    // Get vouchers with booking info; optionally filter by code
    // For multiple vouchers (Buy Gift), we need to group by purchaser and show all voucher codes
    const voucher = `
        SELECT v.*, v.experience_type,
               COALESCE(
                   v.book_flight,
                   CASE
                       -- If purchaser fields are present, this originated from Buy Gift flow
                       WHEN v.purchaser_name IS NOT NULL OR v.purchaser_email IS NOT NULL THEN 'Gift Voucher'
                       -- Fallback by explicit labels when available
                       WHEN v.voucher_type IN ('Buy Gift','Gift Voucher') THEN 'Gift Voucher'
                       ELSE 'Flight Voucher'
                   END
               ) as book_flight,
               v.voucher_type as actual_voucher_type,
               v.purchaser_name, v.purchaser_email, v.purchaser_phone, v.purchaser_mobile,
               CASE 
                   WHEN v.additional_information_json IS NOT NULL AND v.additional_information_json != 'null' 
                   THEN v.additional_information_json 
                   ELSE NULL 
               END as additional_information_json,
               v.add_to_booking_items,
               v.voucher_passenger_details,
               b.email as booking_email, b.phone as booking_phone, b.id as booking_id,
               CASE 
                   WHEN b.additional_information_json IS NOT NULL AND b.additional_information_json != 'null' 
                   THEN b.additional_information_json 
                   ELSE NULL 
               END as booking_additional_information_json,
               v.voucher_ref as vc_code,
               (SELECT GROUP_CONCAT(CONCAT(p.first_name, ' ', p.last_name, ' (', p.weight, 'kg)') SEPARATOR ', ') 
                FROM passenger p WHERE p.booking_id = b.id) as passenger_info,
               (SELECT COUNT(*) FROM passenger p WHERE p.booking_id = b.id) as passenger_count,
               (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                   'id', p.id,
                   'first_name', p.first_name,
                   'last_name', p.last_name,
                   'weight', p.weight,
                   'email', p.email,
                   'phone', p.phone,
                   'ticket_type', p.ticket_type,
                   'weather_refund', p.weather_refund,
                   'price', p.price
               )) FROM passenger p WHERE p.booking_id = b.id) as passenger_details,
               NULL as all_voucher_codes
        FROM all_vouchers v
        LEFT JOIN all_booking b ON v.voucher_ref = b.voucher_code
        ${vc_code || voucher_ref ? 'WHERE v.voucher_ref = ?' : ''}
        ORDER BY v.created_at DESC
    `;
    
    console.log('SQL Query:', voucher);
    const params = [];
    if (vc_code || voucher_ref) params.push((vc_code || voucher_ref).toUpperCase());
    con.query(voucher, params, async (err, result) => {
        if (err) {
            console.error("Error occurred:", err);
            const payload = { success: false, error: "Database query failed" };
            res.status(500).send(payload);
            return;
        }
        
        console.log('=== DATABASE QUERY RESULT ===');
        console.log('Number of vouchers found:', result ? result.length : 0);
        
        if (result && result.length > 0) {
            console.log('Sample voucher data (first record):');
            console.log('ID:', result[0].id);
            console.log('additional_information:', result[0].additional_information);
            console.log('additional_information_json:', result[0].additional_information_json);
            console.log('booking_id:', result[0].booking_id);
            console.log('booking_additional_information_json:', result[0].booking_additional_information_json);
            
            // Process each voucher to add additional information
            const enriched = await Promise.all(result.map(async (row) => {
                let expiresVal = row.expires;
                if (!expiresVal && row.created_at) {
                    // Shared Flight: Any Day Flight = 24 months, others = 18 months; Private Charter = 18 months
                    let durationMonths = 24;
                    if (row.experience_type === 'Private Charter') {
                        durationMonths = 18;
                    } else if (row.experience_type === 'Shared Flight') {
                        const vt = row.actual_voucher_type || row.voucher_type || '';
                        durationMonths = (vt === 'Any Day Flight') ? 24 : 18;
                    }
                    expiresVal = moment(row.created_at).add(durationMonths, 'months').format('YYYY-MM-DD HH:mm:ss');
                }
                // Prefer explicit voucher_ref; if null, fill from vc_code
                const voucher_ref = row.voucher_ref || row.vc_code || null;
                
                // Initialize additional information structure - always create it like getAllBookingData
                let additionalInfo = {
                    questions: [],
                    answers: [],
                    legacy: {
                        additional_notes: null,
                        hear_about_us: null,
                        ballooning_reason: null,
                        prefer: null
                    },
                    additional_information_json: null
                };
                
                console.log(`=== PROCESSING VOUCHER ID: ${row.id} ===`);
                // Normalize numberOfPassengers for clients of getAllVoucherData
                // Prefer explicit numberOfPassengers on voucher; otherwise fall back to passenger_count from linked booking
                row.numberOfPassengers = Number.parseInt(row.numberOfPassengers, 10) || Number.parseInt(row.passenger_count, 10) || 1;
                console.log('row.additional_information_json:', row.additional_information_json);
                console.log('typeof row.additional_information_json:', typeof row.additional_information_json);
                console.log('row.add_to_booking_items:', row.add_to_booking_items);
                console.log('typeof row.add_to_booking_items:', typeof row.add_to_booking_items);
                console.log('row.booking_id:', row.booking_id);
                console.log('row.booking_additional_information_json:', row.booking_additional_information_json);
                
                // For vouchers, we need to check if there's additional information data
                // This can come from either the linked booking OR the voucher's own additional_information_json column
                const hasVoucherAdditionalInfo = row.additional_information_json && 
                    row.additional_information_json !== null && 
                    row.additional_information_json !== 'null';
                const hasBookingAdditionalInfo = row.booking_id && row.booking_additional_information_json;
                
                console.log('hasVoucherAdditionalInfo:', hasVoucherAdditionalInfo);
                console.log('hasBookingAdditionalInfo:', hasBookingAdditionalInfo);
                
                // Always process additional information like getAllBookingData
                console.log('Processing additional information for voucher:', row.id);
                try {
                    // Get all available questions for this journey type
                    const [questionsRows] = await new Promise((resolve, reject) => {
                            const questionsSql = `
                                SELECT 
                                    id,
                                    question_text,
                                    question_type,
                                    options,
                                    help_text,
                                    category,
                                    journey_types,
                                    sort_order
                                FROM additional_information_questions 
                                WHERE is_active = 1 
                                ORDER BY sort_order, id
                            `;
                            con.query(questionsSql, (err, rows) => {
                                if (err) {
                                    console.error('Error fetching questions:', err);
                                    reject(err);
                                } else {
                                    resolve([rows]);
                                }
                            });
                        });
                        
                        // Parse additional information data
                        let additionalInfoData = null;
                        console.log('=== PARSING ADDITIONAL INFORMATION DATA ===');
                        
                        // First try voucher's additional_information_json
                        if (row.additional_information_json) {
                            console.log('Found voucher additional_information_json:', row.additional_information_json);
                            try {
                                if (typeof row.additional_information_json === 'string') {
                                    additionalInfoData = JSON.parse(row.additional_information_json);
                                } else {
                                    additionalInfoData = row.additional_information_json;
                                }
                                console.log('Successfully parsed voucher additional_information_json:', additionalInfoData);
                            } catch (e) {
                                console.warn('Failed to parse voucher additional_information_json:', e);
                            }
                        }
                        
                        // If no voucher data, try booking's additional_information_json
                        if (!additionalInfoData && row.booking_additional_information_json) {
                            logToFile('Using booking additional_information_json:', row.booking_additional_information_json);
                            try {
                                if (typeof row.booking_additional_information_json === 'string') {
                                    additionalInfoData = JSON.parse(row.booking_additional_information_json);
                                } else {
                                    additionalInfoData = row.booking_additional_information_json;
                                }
                                logToFile('Successfully parsed booking additional_information_json:', additionalInfoData);
                            } catch (e) {
                                logToFile('Failed to parse booking additional_information_json:', e);
                            }
                        }
                        
                        // Log the state of additionalInfoData before processing answers
                        logToFile('Final additionalInfoData before processing answers:', {
                            additionalInfoData,
                            hasData: !!additionalInfoData,
                            dataType: typeof additionalInfoData,
                            keys: additionalInfoData ? Object.keys(additionalInfoData) : []
                        });
                        
                        // If still no data, check if we have answers in a different format
                        if (!additionalInfoData && row.additional_information?.answers?.length > 0) {
                            console.log('Found answers in additional_information:', row.additional_information.answers);
                            additionalInfoData = row.additional_information.answers.reduce((acc, answer) => {
                                acc[`question_${answer.question_id}`] = answer.answer;
                                return acc;
                            }, {});
                            console.log('Converted answers to additionalInfoData:', additionalInfoData);
                        }
                        
                        console.log('Final additionalInfoData:', additionalInfoData);
                        
                        // Convert additional information data to answers format
                        let answers = [];
                        console.log('=== CONVERTING ADDITIONAL INFO TO ANSWERS ===');
                        console.log('additionalInfoData:', additionalInfoData);
                        console.log('typeof additionalInfoData:', typeof additionalInfoData);
                        
                        if (additionalInfoData) {
                            const questionKeys = Object.keys(additionalInfoData).filter(key => key.startsWith('question_'));
                            console.log('Found question keys:', questionKeys);
                            
                            answers = questionKeys.map(key => {
                                const questionId = parseInt(key.replace('question_', ''));
                                const question = questionsRows.find(q => q.id === questionId);
                                const answer = {
                                    question_id: questionId,
                                    question_text: question ? question.question_text : `Question ${questionId}`,
                                    question_type: question ? question.question_type : 'text',
                                    answer: additionalInfoData[key],
                                    options: question && question.options ? JSON.parse(question.options) : [],
                                    help_text: question ? question.help_text : '',
                                    category: question ? question.category : '',
                                    created_at: row.created_at
                                };
                                console.log(`Created answer for question ${questionId}:`, answer);
                                return answer;
                            });
                        }
                        
                        console.log('Final answers array:', answers);
                        
                        // Format additional information - always update questions
                        additionalInfo.questions = questionsRows.map(question => {
                                try {
                                    let parsedOptions = [];
                                    let parsedJourneyTypes = [];
                                    
                                    // Safely parse options
                                    if (question.options) {
                                        try {
                                            parsedOptions = JSON.parse(question.options);
                                        } catch (e) {
                                            console.warn('Failed to parse options for question', question.id, e);
                                            parsedOptions = [];
                                        }
                                    }
                                    
                                    // Safely parse journey_types
                                    if (question.journey_types) {
                                        if (Array.isArray(question.journey_types)) {
                                            parsedJourneyTypes = question.journey_types;
                                        } else if (typeof question.journey_types === 'string') {
                                            try {
                                                parsedJourneyTypes = JSON.parse(question.journey_types);
                                            } catch (e) {
                                                console.warn('Failed to parse journey_types for question', question.id, e);
                                                parsedJourneyTypes = [];
                                            }
                                        }
                                    }
                                    
                                    return {
                                        id: question.id,
                                        question_text: question.question_text,
                                        question_type: question.question_type,
                                        options: parsedOptions,
                                        help_text: question.help_text,
                                        category: question.category,
                                        journey_types: parsedJourneyTypes,
                                        sort_order: question.sort_order
                                    };
                                } catch (error) {
                                    console.warn('Error processing question:', question.id, error);
                                    return {
                                        id: question.id,
                                        question_text: question.question_text,
                                        question_type: question.question_type,
                                        options: [],
                                        help_text: question.help_text,
                                        category: question.category,
                                        journey_types: [],
                                        sort_order: question.sort_order
                                    };
                                }
                            });
                        
                        // Update answers if we have data
                        additionalInfo.answers = answers;
                        additionalInfo.legacy = {
                            additional_notes: additionalInfoData?.notes || row.additional_notes || null,
                            hear_about_us: additionalInfoData?.hear_about_us || row.hear_about_us || null,
                            ballooning_reason: additionalInfoData?.ballooning_reason || row.ballooning_reason || null,
                            prefer: additionalInfoData?.prefer || row.prefer || null
                        };
                        additionalInfo.additional_information_json = additionalInfoData;
                        
                        console.log('Created additionalInfo for voucher', row.id, ':', JSON.stringify(additionalInfo, null, 2));
                    } catch (error) {
                        console.error('Error fetching additional information for voucher:', row.id, error);
                        // Continue without additional information if there's an error
                    }
                
                // Parse add_to_booking_items if it's a JSON string
                let parsedAddToBookingItems = null;
                console.log(`Voucher ${row.id} - raw add_to_booking_items:`, row.add_to_booking_items);
                console.log(`Voucher ${row.id} - typeof:`, typeof row.add_to_booking_items);
                
                if (row.add_to_booking_items) {
                    try {
                        if (typeof row.add_to_booking_items === 'string') {
                            parsedAddToBookingItems = JSON.parse(row.add_to_booking_items);
                            console.log(`Voucher ${row.id} - parsed from string:`, parsedAddToBookingItems);
                        } else {
                            parsedAddToBookingItems = row.add_to_booking_items;
                            console.log(`Voucher ${row.id} - used as object:`, parsedAddToBookingItems);
                        }
                    } catch (e) {
                        console.warn('Failed to parse add_to_booking_items for voucher', row.id, ':', e);
                        parsedAddToBookingItems = row.add_to_booking_items;
                    }
                } else {
                    console.log(`Voucher ${row.id} - add_to_booking_items is null/undefined`);
                }

                // Parse passenger details JSON (from booking or voucher fallback)
                let passengerDetails = [];
                if (row.passenger_details) {
                    try {
                        passengerDetails = typeof row.passenger_details === 'string' 
                            ? JSON.parse(row.passenger_details) 
                            : row.passenger_details;
                    } catch (e) {
                        console.warn('Failed to parse passenger_details for voucher', row.id, ':', e);
                        passengerDetails = [];
                    }
                } else if (row.voucher_passenger_details) {
                    try {
                        passengerDetails = typeof row.voucher_passenger_details === 'string'
                            ? JSON.parse(row.voucher_passenger_details)
                            : row.voucher_passenger_details;
                    } catch (e) {
                        console.warn('Failed to parse voucher_passenger_details for voucher', row.id, ':', e);
                        passengerDetails = [];
                    }
                }

                const numFromCodes = (row.all_voucher_codes && typeof row.all_voucher_codes === 'string')
                    ? row.all_voucher_codes.split(',').map(s => s.trim()).filter(Boolean).length
                    : null;
                // numberOfPassengers: prefer explicit column if valid; for Private Charter variants, derive from purchaser intent if missing
                let passengersFromColumn = Number.parseInt(row.numberOfPassengers, 10);
                if (!passengersFromColumn || passengersFromColumn < 1) passengersFromColumn = null;
                let passengersFromPrivateCharter = null;
                if (!passengersFromColumn && row.voucher_type && row.voucher_type.toLowerCase().includes('private')) {
                    try {
                        const details = typeof row.voucher_passenger_details === 'string' ? JSON.parse(row.voucher_passenger_details) : (row.voucher_passenger_details || []);
                        if (Array.isArray(details) && details.length > 0) {
                            passengersFromPrivateCharter = details.length;
                        }
                    } catch (e) { /* noop */ }
                }
                const computedVoucherCount = numFromCodes || passengersFromColumn || passengersFromPrivateCharter || Number.parseInt(row.passenger_count, 10) || 1;

                // Normalize book_flight again at response-build stage to ensure Buy Flight Voucher is labeled correctly
                const vtLower = (row.actual_voucher_type || row.voucher_type || '').toLowerCase();
                const hasPurchaserSignals = !!(row.purchaser_name || row.purchaser_email || row.purchaser_phone || row.purchaser_mobile);
                const normalizedBookFlight = (hasPurchaserSignals || vtLower.includes('gift')) ? 'Gift Voucher' : (row.book_flight || 'Flight Voucher');

                return {
                    ...row,
                    voucher_ref,
                    book_flight: normalizedBookFlight,
                    name: row.name ?? '',
                    flight_type: row.experience_type ?? '', // Changed from flight_type to experience_type
                    voucher_type: row.actual_voucher_type ?? '', // Changed to use actual_voucher_type for voucher_type column
                    actual_voucher_type: row.actual_voucher_type ?? '', // New field for actual voucher type
                    email: row.email ?? '',
                    phone: row.phone ?? '',
                    // Purchaser information fields
                    purchaser_name: row.purchaser_name ?? row.name ?? '',
                    purchaser_email: row.purchaser_email ?? row.email ?? '',
                    purchaser_phone: row.purchaser_phone ?? row.phone ?? '',
                    purchaser_mobile: row.purchaser_mobile ?? row.mobile ?? '',
                    expires: expiresVal ? moment(expiresVal).format('DD/MM/YYYY') : '',
                    redeemed: row.redeemed ?? '',
                    paid: row.paid ?? '',
                    offer_code: row.offer_code ?? '',
                    // Use all_voucher_codes if available (for multiple vouchers), otherwise use single voucher_ref
                    voucher_ref: (row.all_voucher_codes || voucher_ref || ''),
                    vc_code: (row.all_voucher_codes || voucher_ref || ''),
                    // Expose voucher_code with the same combined value for client compatibility
                    voucher_code: (row.all_voucher_codes || voucher_ref || ''),
                    all_voucher_codes: (row.all_voucher_codes || voucher_ref || ''),
                    created_at: row.created_at ? moment(row.created_at).format('DD/MM/YYYY HH:mm') : '',
                    booking_email: row.booking_email ?? '',
                    booking_phone: row.booking_phone ?? '',
                    booking_id: row.booking_id ?? '',
                    passenger_info: row.passenger_info ?? '',
                    passenger_count: row.passenger_count ?? 0,
                    passenger_details: passengerDetails, // Add parsed passenger details
                    numberOfVouchers: computedVoucherCount,
                    flight_attempts: row.flight_attempts ?? 0,
                    additional_information: additionalInfo,
                    additional_information_json: row.additional_information_json || null,
                    add_to_booking_items: parsedAddToBookingItems,
                    choose_add_on: parsedAddToBookingItems, // Same as add_to_booking_items for compatibility with getAllBookingData
                    booking_additional_information_json: row.booking_additional_information_json || null
                };
            }));
            
            // Returning enriched voucher data
            const responsePayload = { success: true, data: enriched };
            __getAllVoucherDataCache.lastKey = cacheKey;
            __getAllVoucherDataCache.lastAt = Date.now();
            __getAllVoucherDataCache.lastResponse = responsePayload;
            res.json(responsePayload);
        } else {
            const payload = { success: true, data: [] };
            res.json(payload);
        }
    });
});

// Test endpoint to check if additional info is being sent
app.post('/api/testAdditionalInfo', (req, res) => {
    console.log('=== TEST ADDITIONAL INFO ENDPOINT CALLED ===');
    console.log('Request body:', req.body);
    console.log('additionalInfo in body:', req.body.additionalInfo);
    console.log('typeof additionalInfo:', typeof req.body.additionalInfo);
    console.log('additionalInfo keys:', req.body.additionalInfo ? Object.keys(req.body.additionalInfo) : 'additionalInfo is null/undefined');
    
    res.json({ 
        success: true, 
        received: {
            additionalInfo: req.body.additionalInfo,
            type: typeof req.body.additionalInfo,
            keys: req.body.additionalInfo ? Object.keys(req.body.additionalInfo) : null
        }
    });
});

// Debug endpoint to check raw voucher data
app.get('/api/debugVoucherData', (req, res) => {
    console.log('=== DEBUG VOUCHER DATA ENDPOINT CALLED ===');
    
    const debugSql = `
        SELECT id, additional_information, additional_information_json, voucher_ref, created_at
        FROM all_vouchers 
        ORDER BY created_at DESC 
        LIMIT 10
    `;
    
    con.query(debugSql, (err, result) => {
        if (err) {
            console.error("Debug query error:", err);
            res.status(500).send({ success: false, error: "Database query failed" });
            return;
        }
        
        console.log('=== DEBUG QUERY RESULT ===');
        console.log('Number of vouchers:', result.length);
        result.forEach((row, index) => {
            console.log(`Voucher ${index + 1}:`);
            console.log('  ID:', row.id);
            console.log('  additional_information:', row.additional_information);
            console.log('  additional_information_json:', row.additional_information_json);
            console.log('  voucher_ref:', row.voucher_ref);
            console.log('  created_at:', row.created_at);
            console.log('---');
        });
        
        res.json({ success: true, data: result });
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

// Get Date Requested Data (from both all_booking and date_requests tables)
app.get('/api/getDateRequestData', (req, res) => {
    console.log('GET /api/getDateRequestData called');
    // Only return actual date requests. Do NOT include bookings.
    const sql = 'SELECT id, name, location, flight_type, requested_date AS date_requested, "" as voucher_code, phone, email, created_at, "date_request" as source FROM date_request ORDER BY created_at DESC';
    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching from date_request:', err);
            return res.status(500).send({ success: false, message: 'Database query failed' });
        }
        return res.send({ success: true, data: result || [] });
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


// Get All Activity Data (Legacy endpoint - redirects to /api/activities)
app.get('/api/getAllActivity', (req, res) => {
    const sql = 'SELECT * FROM activity ORDER BY activity_name';
    con.query(sql, (err, result) => {
        if (err) {
            console.error("Error occurred:", err);
            res.status(500).send({ success: false, error: "Database query failed" });
            return;
        }
        
        // Ensure result is always an array
        const activities = Array.isArray(result) ? result : [];
        
        console.log('getAllActivity endpoint called, returning:', activities.length, 'activities');
        
        res.send({ 
            success: true, 
            data: activities,
            count: activities.length,
            timestamp: new Date().toISOString()
        });
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
                voucher_discount,
                original_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Debug log for choose_add_on and bookingValues
        let choose_add_on_str = '';
        if (Array.isArray(choose_add_on) && choose_add_on.length > 0) {
            choose_add_on_str = choose_add_on.map(a => a && a.name ? a.name : '').filter(Boolean).join(', ');
        }
        console.log('DEBUG choose_add_on:', choose_add_on);
        console.log('DEBUG choose_add_on_str:', choose_add_on_str);
        
        // Use actual passenger count from passengerData array
        const actualPaxCount = (Array.isArray(passengerData) && passengerData.length > 0) ? passengerData.length : (parseInt(chooseFlightType.passengerCount) || 1);
        console.log('=== PAX COUNT DEBUG ===');
        console.log('passengerData.length:', passengerData?.length);
        console.log('chooseFlightType.passengerCount:', chooseFlightType.passengerCount);
        console.log('actualPaxCount (FINAL):', actualPaxCount);
        
        const bookingValues = [
            passengerName,
            chooseFlightType.type,
            bookingDateTime, // <-- burada güncelledik
            actualPaxCount, // Use actual passenger count instead of chooseFlightType.passengerCount
            chooseLocation,
            'Confirmed', // Default status
            totalPrice,
            0,
            voucher_code || null,
            nowDate,
            expiresDateFinal,
            0, // manual_status_override
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
            preferred_day || null,
            flight_attempts || 0, // flight_attempts
            req.body.activity_id || null, // activity_id
            selectedTime || null, // time_slot
            chooseFlightType.type, // experience
            chooseFlightType.type, // voucher_type
            0, // voucher_discount
            totalPrice // original_amount
        ];
        console.log('bookingValues:', bookingValues);

        console.log('=== EXECUTING BOOKING SQL ===');
        console.log('SQL:', bookingSql);
        console.log('Values:', bookingValues);
        console.log('Values length:', bookingValues.length);
        
        con.query(bookingSql, bookingValues, (err, result) => {
            if (err) {
                console.error('=== DATABASE ERROR DETAILS ===');
                console.error('Error code:', err.code);
                console.error('Error message:', err.message);
                console.error('SQL State:', err.sqlState);
                console.error('Error number:', err.errno);
                console.error('Full error:', err);
                console.error('=== END ERROR DETAILS ===');
                return res.status(500).json({ success: false, error: 'Database query failed to create booking', details: err.message });
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
                console.log('passengerData RECEIVED:', JSON.stringify(passengerData, null, 2));
                console.log('passengerData type:', typeof passengerData);
                console.log('passengerData is Array?', Array.isArray(passengerData));
                console.log('passengerData length:', passengerData?.length);
                
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
                    // Use the new specific availability update function
                    console.log('=== REBOOK AVAILABILITY UPDATE ===');
                    // Use actual passenger count from passengerData array (real passenger count entered by user)
                    const actualPassengerCount = (Array.isArray(passengerData) && passengerData.length > 0) ? passengerData.length : (parseInt(chooseFlightType.passengerCount) || 1);
                    console.log('UPDATE AVAILABILITY PARAMS:', actualPassengerCount, bookingDate, bookingTime, req.body.activity_id);
                    console.log('Request body activity_id:', req.body.activity_id);
                    console.log('passengerData length:', passengerData?.length);
                    console.log('chooseFlightType.passengerCount:', chooseFlightType.passengerCount);
                    console.log('Actual passenger count (FINAL):', actualPassengerCount);
                    
                    updateSpecificAvailability(bookingDate, bookingTime, req.body.activity_id, actualPassengerCount);
                    console.log('=== END REBOOK AVAILABILITY UPDATE ===');
                } else if (bookingTime) {
                    // Get activity_id first, then update availability
                    const actualPassengerCount = (Array.isArray(passengerData) && passengerData.length > 0) ? passengerData.length : (parseInt(chooseFlightType.passengerCount) || 1);
                    console.log('UPDATE AVAILABILITY PARAMS (alt sorgu):', actualPassengerCount, bookingDate, bookingTime, chooseLocation);
                    
                    const activitySql = `SELECT id FROM activity WHERE location = ? AND status = 'Live' LIMIT 1`;
                    con.query(activitySql, [chooseLocation], (activityErr, activityResult) => {
                        if (activityErr) {
                            console.error('Error getting activity_id for availability update:', activityErr);
                        } else if (activityResult.length > 0) {
                            const activityId = activityResult[0].id;
                            console.log('Found activity_id for availability update:', activityId);
                            console.log('passengerData length:', passengerData?.length);
                            console.log('chooseFlightType.passengerCount:', chooseFlightType.passengerCount);
                            console.log('Updating availability with passenger count:', actualPassengerCount);
                            updateSpecificAvailability(bookingDate, bookingTime, activityId, actualPassengerCount);
                        } else {
                            console.error('No activity found for location:', chooseLocation);
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
                    // Availability is already updated by updateSpecificAvailability function
                    // No need to call updateAvailabilityStatus() here
                    
                    // If activitySelect is 'Redeem Voucher' and voucher_code exists, mark it as redeemed
                    if (activitySelect === 'Redeem Voucher' && voucher_code) {
                        const cleanVoucherCode = voucher_code.trim();
                        console.log('🔄 Marking voucher as redeemed after Stripe payment:', cleanVoucherCode);
                        
                        // Update all_vouchers table
                        const updateAllVouchersSql = `
                            UPDATE all_vouchers 
                            SET redeemed = 'Yes', status = 'Used'
                            WHERE UPPER(voucher_ref) = UPPER(?)
                        `;
                        con.query(updateAllVouchersSql, [cleanVoucherCode], (voucherErr, voucherResult) => {
                            if (voucherErr) {
                                console.warn('Warning: Could not update all_vouchers:', voucherErr.message);
                            } else {
                                console.log('✅ all_vouchers updated successfully');
                            }
                        });
                        
                        // Update voucher_codes table
                        const updateVoucherCodesSql = `
                            UPDATE voucher_codes 
                            SET current_uses = COALESCE(current_uses, 0) + 1, 
                                is_active = 0
                            WHERE UPPER(code) = UPPER(?)
                        `;
                        con.query(updateVoucherCodesSql, [cleanVoucherCode], (codeErr, codeResult) => {
                            if (codeErr) {
                                console.warn('Warning: Could not update voucher_codes:', codeErr.message);
                            } else {
                                console.log('✅ voucher_codes updated successfully - marked as inactive');
                            }
                        });
                        
                        // Update redeemed_voucher column in all_booking
                        const updateBookingSql = `
                            UPDATE all_booking 
                            SET redeemed_voucher = 'Yes'
                            WHERE id = ?
                        `;
                        con.query(updateBookingSql, [bookingId], (bookingErr, bookingResult) => {
                            if (bookingErr) {
                                console.warn('Warning: Could not update redeemed_voucher in all_booking:', bookingErr.message);
                            } else {
                                console.log('✅ all_booking.redeemed_voucher updated to Yes');
                            }
                        });
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
                // Redeemed voucher: expires = voucher satın alma tarihi + duration (Private Charter: 18 months, others: 24 months)
                let durationMonths = 24;
                if (chooseFlightType && chooseFlightType.type === 'Private Charter') {
                    durationMonths = 18;
                } else if (chooseFlightType && chooseFlightType.type === 'Shared Flight') {
                    // Shared: Any Day Flight = 24, others = 18
                    const vt = bookingData?.selectedVoucherType?.title || voucher_type || '';
                    durationMonths = (vt === 'Any Day Flight') ? 24 : 18;
                }
                expiresDate = moment(voucherResult[0].created_at).add(durationMonths, 'months').format('YYYY-MM-DD HH:mm:ss');
                insertBookingAndPassengers(expiresDate);
            } else {
                // Diğer durumlar: flight_attempts >= 10 ise 36 ay, yoksa 24 ay
                const attempts = typeof flight_attempts === 'number' ? flight_attempts : 0;
                if (attempts >= 10) {
                    expiresDate = now.clone().add(36, 'months').format('YYYY-MM-DD HH:mm:ss');
                } else {
                    let durationMonths2 = 24;
                    if (chooseFlightType && chooseFlightType.type === 'Private Charter') {
                        durationMonths2 = 18;
                    } else if (chooseFlightType && chooseFlightType.type === 'Shared Flight') {
                        const vt2 = bookingData?.selectedVoucherType?.title || voucher_type || '';
                        durationMonths2 = (vt2 === 'Any Day Flight') ? 24 : 18;
                    }
                    expiresDate = now.clone().add(durationMonths2, 'months').format('YYYY-MM-DD HH:mm:ss');
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
            let durationMonths3 = 24;
            if (chooseFlightType && chooseFlightType.type === 'Private Charter') {
                durationMonths3 = 18;
            } else if (chooseFlightType && chooseFlightType.type === 'Shared Flight') {
                const vt3 = bookingData?.selectedVoucherType?.title || voucher_type || '';
                durationMonths3 = (vt3 === 'Any Day Flight') ? 24 : 18;
            }
            expiresDate = now.clone().add(durationMonths3, 'months').format('YYYY-MM-DD HH:mm:ss');
        }
        insertBookingAndPassengers(expiresDate);
    }
});

// Endpoint to update expires dates for Flexible Weekday and Weekday Morning
app.post('/api/update-expires-dates', (req, res) => {
    console.log('=== UPDATE EXPIRES DATES ENDPOINT CALLED ===');
    
    const updateBookingSql = `
        UPDATE all_booking 
        SET expires = DATE_ADD(created_at, INTERVAL 18 MONTH) 
        WHERE voucher_type IN ('Flexible Weekday', 'Weekday Morning') 
          AND experience = 'Shared Flight' 
          AND expires > DATE_ADD(created_at, INTERVAL 18 MONTH)
    `;
    
    const updateVoucherSql = `
        UPDATE all_vouchers 
        SET expires = DATE_ADD(created_at, INTERVAL 18 MONTH) 
        WHERE voucher_type_detail IN ('Flexible Weekday', 'Weekday Morning') 
          AND experience_type = 'Shared Flight' 
          AND expires > DATE_ADD(created_at, INTERVAL 18 MONTH)
    `;
    
    con.query(updateBookingSql, (err, bookingResult) => {
        if (err) {
            console.error('Error updating all_booking:', err);
            return res.status(500).json({ success: false, error: 'Failed to update all_booking' });
        }
        
        console.log('Updated all_booking records:', bookingResult.affectedRows);
        
        // Show sample updated records
        const sampleSql = `
            SELECT 
                id, 
                voucher_type, 
                experience, 
                created_at, 
                expires,
                DATEDIFF(expires, created_at) as days_from_creation
            FROM all_booking 
            WHERE voucher_type IN ('Flexible Weekday', 'Weekday Morning') 
              AND experience = 'Shared Flight'
            ORDER BY created_at DESC
            LIMIT 10
        `;
        
        con.query(sampleSql, (err, sampleResult) => {
            if (err) {
                console.error('Error fetching sample records:', err);
                return res.status(500).json({ success: false, error: 'Failed to fetch sample records' });
            }
            
            res.json({ 
                success: true, 
                message: 'Expires dates updated successfully',
                updated_bookings: bookingResult.affectedRows,
                sample_records: sampleResult
            });
        });
    });
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
    console.log('=== CREATE VOUCHER ENDPOINT CALLED ===');
    console.log('Request body:', req.body);
    console.log('Timestamp:', new Date().toISOString());
    console.log('voucher_type_detail from request:', req.body.voucher_type_detail);
    console.log('voucher_type from request:', req.body.voucher_type);
    
    // Helper function
    function emptyToNull(val) {
        return (val === '' || val === undefined) ? null : val;
    }
    
    // Extract request data
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
        preferred_day = '',
        numberOfPassengers = 1,
        passengerData = null, // Array of passenger information
        additionalInfo = null,
        additional_information = null,
        add_to_booking_items = null,
        // Purchaser information fields
        purchaser_name = '',
        purchaser_email = '',
        purchaser_phone = '',
        purchaser_mobile = ''
    } = req.body;

    // Processing voucher creation request
    console.log('=== BACKEND VOUCHER CREATION DEBUG ===');
    console.log('add_to_booking_items received:', add_to_booking_items);
    console.log('typeof add_to_booking_items:', typeof add_to_booking_items);
    console.log('Array.isArray(add_to_booking_items):', Array.isArray(add_to_booking_items));
    if (Array.isArray(add_to_booking_items)) {
        console.log('add_to_booking_items.length:', add_to_booking_items.length);
        add_to_booking_items.forEach((item, index) => {
            console.log(`Item ${index + 1}:`, item);
        });
    }
    
    console.log('=== ADDITIONAL INFO DEBUG (createVoucher) ===');
    console.log('additionalInfo received:', additionalInfo);
    console.log('typeof additionalInfo:', typeof additionalInfo);
    console.log('additional_information received:', additional_information);
    console.log('typeof additional_information:', typeof additional_information);
    if (additionalInfo) {
        console.log('additionalInfo keys:', Object.keys(additionalInfo));
        console.log('additionalInfo JSON:', JSON.stringify(additionalInfo, null, 2));
    }

    // For Gift Vouchers, separate purchaser and recipient information
    let finalPurchaserName = purchaser_name;
    let finalPurchaserEmail = purchaser_email;
    let finalPurchaserPhone = purchaser_phone;
    let finalPurchaserMobile = purchaser_mobile;
    let finalRecipientName = recipient_name;
    let finalRecipientEmail = recipient_email;
    let finalRecipientPhone = recipient_phone;

    // If this is a Gift Voucher, ensure purchaser and recipient info are properly separated
    if (voucher_type === 'Gift Voucher') {
        console.log('=== GIFT VOUCHER - SEPARATING PURCHASER AND RECIPIENT INFO ===');
        console.log('Original name (should be purchaser):', name);
        console.log('Original email (should be purchaser):', email);
        console.log('Original phone (should be purchaser):', phone);
        console.log('Original mobile (should be purchaser):', mobile);
        console.log('Explicit purchaser_name from frontend:', purchaser_name);
        console.log('Explicit purchaser_email from frontend:', purchaser_email);
        console.log('Explicit purchaser_phone from frontend:', purchaser_phone);
        console.log('Recipient name:', recipient_name);
        console.log('Recipient email:', recipient_email);
        console.log('Recipient phone:', recipient_phone);
        
        // For Gift Vouchers, use explicit purchaser fields if provided, otherwise fall back to main contact fields
        if (purchaser_name && purchaser_name.trim() !== '') {
            finalPurchaserName = purchaser_name;
        } else {
            finalPurchaserName = name;
        }
        
        if (purchaser_email && purchaser_email.trim() !== '') {
            finalPurchaserEmail = purchaser_email;
        } else {
            finalPurchaserEmail = email;
        }
        
        if (purchaser_phone && purchaser_phone.trim() !== '') {
            finalPurchaserPhone = purchaser_phone;
        } else {
            finalPurchaserPhone = phone;
        }
        
        if (purchaser_mobile && purchaser_mobile.trim() !== '') {
            finalPurchaserMobile = purchaser_mobile;
        } else {
            finalPurchaserMobile = mobile;
        }
        
        console.log('Setting purchaser info:', {
            name: finalPurchaserName,
            email: finalPurchaserEmail,
            phone: finalPurchaserPhone,
            mobile: finalPurchaserMobile
        });
        
        // Set recipient info from recipient fields (Recipient Details section)
        // NO fallback logic - keep purchaser and recipient separate
        finalRecipientName = recipient_name;
        finalRecipientEmail = recipient_email;
        finalRecipientPhone = recipient_phone;
        
        console.log('Final purchaser info:', { name: finalPurchaserName, email: finalPurchaserEmail, phone: finalPurchaserPhone, mobile: finalPurchaserMobile });
        console.log('Final recipient info:', { name: finalRecipientName, email: finalRecipientEmail, phone: finalRecipientPhone });
    } else {
        // For Flight Vouchers and Redeem Vouchers, purchaser info is the same as main contact
        finalPurchaserName = name;
        finalPurchaserEmail = email;
        finalPurchaserPhone = phone;
        finalPurchaserMobile = mobile;
        console.log('Non-Gift Voucher - purchaser info same as main contact:', { name: finalPurchaserName, email: finalPurchaserEmail, phone: finalPurchaserPhone, mobile: finalPurchaserMobile });
    }

    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    
        // Determine the actual voucher type based on the input (declare first to avoid ReferenceError)
        let actualVoucherType = '';
    
                    // Check if there's a specific voucher type detail in the request
        if (req.body.voucher_type_detail && req.body.voucher_type_detail.trim() !== '') {
            actualVoucherType = req.body.voucher_type_detail.trim();
            console.log('Using voucher_type_detail from request:', actualVoucherType);
        } else if (voucher_type === 'Weekday Morning' || voucher_type === 'Flexible Weekday' || voucher_type === 'Any Day Flight') {
            // If the frontend sends the specific voucher type directly
            actualVoucherType = voucher_type;
            console.log('Using voucher_type directly:', actualVoucherType);
        } else if (voucher_type && typeof voucher_type === 'string') {
            // Some older flows send voucher_type already as the concrete type
            actualVoucherType = voucher_type;
            console.log('Fallback: using voucher_type as actualVoucherType:', actualVoucherType);
        } else {
            // Last-chance mapping from bookingData if present (when invoked via createBookingFromSession)
            try {
                const maybeBooking = req.body.bookingData || {};
                const title = maybeBooking?.selectedVoucherType?.title;
                if (title === 'Weekday Morning' || title === 'Flexible Weekday' || title === 'Any Day Flight') {
                    actualVoucherType = title;
                    console.log('Mapped actualVoucherType from bookingData.selectedVoucherType:', actualVoucherType);
                }
            } catch (e) {
                // ignore
            }
            if (!actualVoucherType) {
                console.error('ERROR: No voucher_type or voucher_type_detail provided.');
                return res.status(400).json({ success: false, message: 'actualVoucherType is not defined' });
            }
        }
        
    // Validate that the voucher type detail is one of the valid types
    const validVoucherTypes = ['Weekday Morning', 'Flexible Weekday', 'Any Day Flight'];
    if (!validVoucherTypes.includes(actualVoucherType)) {
        console.error('ERROR: Invalid voucher type detail:', actualVoucherType);
        console.error('Valid types are:', validVoucherTypes);
        return res.status(400).json({ success: false, error: `Invalid voucher type detail: ${actualVoucherType}. Valid types are: ${validVoucherTypes.join(', ')}` });
    }
    
    console.log('Final actualVoucherType:', actualVoucherType);

    // Expiry: Any Day Flight = 24 months, others (Weekday Morning, Flexible Weekday) = 18 months
    const voucherExpiryMonths = (voucher_type === 'Any Day Flight' || actualVoucherType === 'Any Day Flight') ? 24 : 18;
    let expiresFinal = expires && expires !== '' ? expires : moment().add(voucherExpiryMonths, 'months').format('YYYY-MM-DD HH:mm:ss');

    // First, check for duplicates to prevent multiple vouchers
    const duplicateCheckSql = `SELECT id FROM all_vouchers WHERE name = ? AND email = ? AND phone = ? AND voucher_type = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE) LIMIT 1`;
    
    con.query(duplicateCheckSql, [name, email, phone, voucher_type], (err, duplicateResult) => {
        if (err) {
            console.error('Error checking for duplicates:', err);
            return res.status(500).json({ success: false, error: 'Database query failed to check for duplicates' });
        }
        
        if (duplicateResult && duplicateResult.length > 0) {
            console.log('=== DUPLICATE VOUCHER DETECTED ===');
            console.log('Duplicate voucher ID:', duplicateResult[0].id);
            console.log('Name:', name, 'Email:', email, 'Phone:', phone);
            return res.status(400).json({ success: false, error: 'A voucher with these details was already created recently. Please wait a moment before trying again.' });
        }
        
        // Also check if this is a Stripe session that was already processed
        // Look for a voucher with the same payment details (name, email, paid amount) created very recently
        const stripeDuplicateCheckSql = `SELECT id FROM all_vouchers WHERE name = ? AND email = ? AND paid = ? AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE) LIMIT 1`;
        
        con.query(stripeDuplicateCheckSql, [name, email, paid], (err, stripeDuplicateResult) => {
            if (err) {
                console.error('Error checking for Stripe duplicates:', err);
                return res.status(500).json({ success: false, error: 'Database query failed to check for Stripe duplicates' });
            }
            
            if (stripeDuplicateResult && stripeDuplicateResult.length > 0) {
                console.log('=== STRIPE DUPLICATE VOUCHER DETECTED ===');
                console.log('Stripe duplicate voucher ID:', stripeDuplicateResult[0].id);
                console.log('Name:', name, 'Email:', email, 'Paid:', paid);
                return res.status(400).json({ success: false, error: 'A voucher with these payment details was already created recently. This may be a duplicate Stripe webhook call.' });
            }
            
            // Additional check: if this looks like a Stripe payment (paid > 0), check if there's already a voucher
            // with the same name, email, and similar payment amount created very recently
            if (paid > 0) {
                const recentVoucherCheckSql = `SELECT id FROM all_vouchers WHERE name = ? AND email = ? AND created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE) LIMIT 1`;
                
                con.query(recentVoucherCheckSql, [name, email], (err, recentResult) => {
                    if (err) {
                        console.error('Error checking for recent vouchers:', err);
                        return res.status(500).json({ success: false, error: 'Database query failed to check for recent vouchers' });
                    }
                    
                    if (recentResult && recentResult.length > 0) {
                        console.log('=== RECENT VOUCHER DETECTED (Possible Stripe Duplicate) ===');
                        console.log('Recent voucher ID:', recentResult[0].id);
                        console.log('Name:', name, 'Email:', email);
                        return res.status(400).json({ success: false, error: 'A voucher with these details was already created recently. Please wait a moment before trying again.' });
                    }
                    
                    // No recent vouchers found, proceed with voucher creation
                    createVoucher();
                });
            } else {
                // No payment amount, proceed with voucher creation
                createVoucher();
            }
        });
    });
    
    function createVoucher() {
        // If this is a Redeem Voucher, handle voucher code usage first
        if (voucher_type === 'Redeem Voucher' && voucher_ref) {
            handleRedeemVoucher();
        } else {
            // For Flight Voucher or Gift Voucher, create directly
            insertVoucherRecord();
        }
    }
    
    function handleRedeemVoucher() {
        // Check if voucher code exists and is valid
        const checkVoucherSql = `
            SELECT id, current_uses, max_uses, is_active, valid_from, valid_until 
            FROM voucher_codes 
            WHERE code = ? AND is_active = 1
            AND (valid_from IS NULL OR valid_from <= NOW())
            AND (valid_until IS NULL OR valid_until >= NOW())
            AND (max_uses IS NULL OR current_uses < max_uses)
        `;
        
        con.query(checkVoucherSql, [voucher_ref.toUpperCase()], (err, voucherResult) => {
            if (err) {
                console.error('Error checking voucher code:', err);
                return res.status(500).json({ success: false, error: 'Database query failed to check voucher code' });
            }
            
            if (voucherResult.length === 0) {
                return res.status(400).json({ success: false, error: 'Invalid or expired voucher code' });
            }
            
            const voucher = voucherResult[0];
            
            // Update voucher code usage
            const updateVoucherSql = `UPDATE voucher_codes SET current_uses = current_uses + 1 WHERE id = ?`;
            
            con.query(updateVoucherSql, [voucher.id], (err, updateResult) => {
                if (err) {
                    console.error('Error updating voucher code usage:', err);
                    return res.status(500).json({ success: false, error: 'Failed to update voucher code usage' });
                }
                
                // Insert voucher usage record
                const insertUsageSql = `
                    INSERT INTO voucher_code_usage 
                    (voucher_code_id, booking_id, customer_email, discount_applied, original_amount, final_amount) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                
                const usageValues = [
                    voucher.id,
                    null, // booking_id henüz yok
                    email || 'unknown',
                    0, // discount_applied - Redeem Voucher için 0
                    paid, // original_amount
                    paid  // final_amount
                ];
                
                con.query(insertUsageSql, usageValues, (err, usageResult) => {
                    if (err) {
                        console.error('Error inserting voucher usage:', err);
                        // Usage kaydı başarısız olsa bile voucher oluşturmaya devam et
                    }
                    
                    // Now create the main voucher record
                    insertVoucherRecord();
                });
            });
        });
    }
    
    function insertVoucherRecord() {
        console.log('=== INSERTING VOUCHER RECORD ===');
        
        // Generate a unique voucher_ref for Flight Vouchers
        let finalVoucherRef = voucher_ref;
        if (!finalVoucherRef && voucher_type === 'Flight Voucher') {
            // Generate a unique voucher reference for Flight Vouchers
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substr(2, 5);
            finalVoucherRef = `FLT${timestamp}${random}`.toUpperCase();
            console.log('Generated voucher_ref for Flight Voucher:', finalVoucherRef);
        }
        
        const insertSql = `INSERT INTO all_vouchers 
            (name, weight, experience_type, book_flight, voucher_type, email, phone, mobile, expires, redeemed, paid, offer_code, voucher_ref, created_at, recipient_name, recipient_email, recipient_phone, recipient_gift_date, preferred_location, preferred_time, preferred_day, flight_attempts, purchaser_name, purchaser_email, purchaser_phone, purchaser_mobile, numberOfPassengers, additional_information_json, add_to_booking_items)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
        const values = [
            emptyToNull(name),
            emptyToNull(weight),
            emptyToNull(flight_type), // This will go to experience_type column
            emptyToNull(voucher_type), // This will go to book_flight column
            emptyToNull(actualVoucherType), // This will go to voucher_type column (actual voucher type)
            emptyToNull(email),
            emptyToNull(phone),
            emptyToNull(mobile),
            emptyToNull(expiresFinal),
            emptyToNull(redeemed),
            paid,
            emptyToNull(offer_code),
            emptyToNull(finalVoucherRef), // Use generated voucher_ref
            now,
            emptyToNull(finalRecipientName), // Use final recipient values
            emptyToNull(finalRecipientEmail), // Use final recipient values
            emptyToNull(finalRecipientPhone), // Use final recipient values
            emptyToNull(recipient_gift_date),
            emptyToNull(preferred_location),
            emptyToNull(preferred_time),
            emptyToNull(preferred_day),
            0, // flight_attempts starts at 0 for each created voucher
            // Purchaser information values
            // For Gift Vouchers: name/email/phone/mobile are purchaser info, recipient_* are separate
            // For Flight Vouchers: name/email/phone/mobile are the main contact info
            emptyToNull(finalPurchaserName), // Use final purchaser values
            emptyToNull(finalPurchaserEmail), // Use final purchaser values
            emptyToNull(finalPurchaserPhone), // Use final purchaser values
            emptyToNull(finalPurchaserMobile), // Use final purchaser values
            numberOfPassengers, // Number of passengers
            // Persist additional information answers regardless of which key frontend used
            (additional_information_json || additionalInfo || additional_information) ? JSON.stringify(additional_information_json || additionalInfo || additional_information) : null, // additional_information_json
            add_to_booking_items ? JSON.stringify(add_to_booking_items) : null // add_to_booking_items
        ];
        
        // Values being inserted for voucher creation
        
        con.query(insertSql, values, (err, result) => {
            if (err) {
                console.error('Error creating voucher:', err);
                return res.status(500).json({ success: false, error: 'Database query failed to create voucher' });
            }
            
            console.log('=== VOUCHER CREATED SUCCESSFULLY ===');
            console.log('Voucher ID:', result.insertId);
            console.log('Name:', name);
            console.log('Email:', email);
            
            // Additional information is already stored in additional_information_json column
            // No need to store in additional_information_answers table for vouchers
            
            // For Flight Voucher, create booking record and generate voucher code
            if (voucher_type === 'Flight Voucher' || voucher_type === 'Any Day Flight' || voucher_type === 'Weekday Morning' || voucher_type === 'Flexible Weekday') {
                console.log('=== CREATING BOOKING RECORD FOR FLIGHT VOUCHER ===');
                createBookingForFlightVoucher(result.insertId, finalVoucherRef, name, email, phone, weight, paid, actualVoucherType);
            } else if (voucher_type === 'Redeem Voucher') {
                console.log('=== CREATING BOOKING RECORD FOR REDEEM VOUCHER ===');
                createBookingForRedeemVoucher(result.insertId, finalVoucherRef || voucher_ref, name, email, phone, weight, paid, actualVoucherType);
            } else {
                // Send response for other voucher types (Gift Voucher, etc.)
                res.status(201).json({ success: true, message: 'Voucher created successfully!', voucherId: result.insertId });
            }
        });
    }
    
    // Create booking record for Flight Voucher
    function createBookingForFlightVoucher(voucherId, voucherRef, name, email, phone, weight, paid, voucherType) {
        console.log('=== CREATING BOOKING RECORD FOR FLIGHT VOUCHER ===');
        console.log('Voucher ID:', voucherId);
        console.log('Voucher Ref:', voucherRef);
        console.log('Name:', name);
        console.log('Email:', email);
        console.log('Phone:', phone);
        console.log('Weight:', weight);
        console.log('Paid:', paid);
        console.log('Voucher Type:', voucherType);
        
        // Define missing variables
        const flight_type = 'Shared Flight'; // Default flight type for vouchers
        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        // Shared Flight: Any Day Flight = 24 months, others = 18 months; Private Charter = 18 months
        let durationMonths = 24;
        if (voucherType && voucherType !== 'Any Day Flight') {
            durationMonths = 18;
        }
        const expiresFinal = moment().add(durationMonths, 'months').format('YYYY-MM-DD HH:mm:ss');
        
        // Create booking record in all_booking table
        const bookingSql = `
            INSERT INTO all_booking (
                name, flight_type, flight_date, pax, location, status, paid, due,
                voucher_code, created_at, expires, manual_status_override, additional_notes,
                preferred_location, preferred_time, preferred_day, flight_attempts,
                activity_id, time_slot, experience, voucher_type, voucher_discount, original_amount,
                email, phone, weight, additional_information_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const bookingValues = [
            name, // name
            flight_type, // flight_type
            null, // flight_date (null for vouchers)
            numberOfPassengers, // pax (use the actual number of passengers)
            null, // location
            'Confirmed', // status
            paid, // paid
            0, // due
            voucherRef, // voucher_code
            now, // created_at
            expiresFinal, // expires
            0, // manual_status_override
            null, // additional_notes
            null, // preferred_location
            null, // preferred_time
            null, // preferred_day
            0, // flight_attempts
            null, // activity_id
            null, // time_slot
            flight_type, // experience
            voucherType, // voucher_type
            0, // voucher_discount
            paid, // original_amount
            email, // email
            phone, // phone
            weight, // weight
            null // additional_information_json
        ];
        
        con.query(bookingSql, bookingValues, (err, bookingResult) => {
            if (err) {
                console.error('Error creating booking for Flight Voucher:', err);
                return;
            }
            
            console.log('=== BOOKING RECORD CREATED SUCCESSFULLY ===');
            console.log('Booking ID:', bookingResult.insertId);
            console.log('Voucher Ref:', voucherRef);
            
            // Generate voucher code for the booking
            generateVoucherCodeForBooking(bookingResult.insertId, name, email, paid, voucherType);
            
            // Now create passenger record
            createPassengerForFlightVoucher(bookingResult.insertId, name, weight, paid, passengerData);
        });
    }
    
    // Create booking record for Redeem Voucher
    function createBookingForRedeemVoucher(voucherId, voucherCode, name, email, phone, weight, paid, voucherType) {
        console.log('=== CREATING BOOKING RECORD FOR REDEEM VOUCHER ===');
        console.log('Voucher ID:', voucherId);
        console.log('Voucher Code:', voucherCode);
        console.log('Name:', name);
        console.log('Email:', email);
        console.log('Phone:', phone);
        console.log('Weight:', weight);
        console.log('Paid:', paid);
        console.log('Voucher Type:', voucherType);
        
        // Define variables for Redeem Voucher booking
        const flight_type_redeem = flight_type || 'Shared Flight'; // Use the flight type from request or default
        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        // Shared Flight: Any Day Flight = 24 months, others = 18 months; Private Charter = 18 months
        let durationMonths = 24;
        if (voucherType && voucherType !== 'Any Day Flight') {
            durationMonths = 18;
        }
        const expiresFinal = moment().add(durationMonths, 'months').format('YYYY-MM-DD HH:mm:ss');
        
        // Create booking record in all_booking table for Redeem Voucher
        const bookingSql = `
            INSERT INTO all_booking (
                name, flight_type, flight_date, pax, location, status, paid, due,
                voucher_code, created_at, expires, manual_status_override, additional_notes,
                preferred_location, preferred_time, preferred_day, flight_attempts,
                activity_id, time_slot, experience, voucher_type, voucher_discount, original_amount,
                email, phone, weight, additional_information_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const bookingValues = [
            name, // name
            flight_type_redeem, // flight_type
            null, // flight_date (will be set when booking is confirmed)
            numberOfPassengers || 1, // pax
            preferred_location || 'TBD', // location
            'Open', // status
            0, // paid (Redeem Voucher doesn't involve payment)
            0, // due
            voucherCode, // voucher_code
            now, // created_at
            expiresFinal, // expires
            null, // manual_status_override
            'Created from Redeem Voucher', // additional_notes
            emptyToNull(preferred_location), // preferred_location
            emptyToNull(preferred_time), // preferred_time
            emptyToNull(preferred_day), // preferred_day
            0, // flight_attempts
            null, // activity_id
            null, // time_slot
            flight_type_redeem, // experience
            voucherType, // voucher_type
            0, // voucher_discount (no discount for redeem)
            0, // original_amount
            email, // email
            phone, // phone
            weight, // weight
            (additional_information_json || additionalInfo || additional_information) ? JSON.stringify(additional_information_json || additionalInfo || additional_information) : null // additional_information_json
        ];
        
        con.query(bookingSql, bookingValues, (err, bookingResult) => {
            if (err) {
                console.error('Error creating booking for Redeem Voucher:', err);
                // Still send success response for voucher creation even if booking fails
                return res.status(201).json({ 
                    success: true, 
                    message: 'Voucher redeemed successfully but booking creation failed', 
                    voucherId: voucherId,
                    warning: 'Booking record could not be created'
                });
            }
            
            console.log('=== BOOKING CREATED FOR REDEEM VOUCHER ===');
            console.log('Booking ID:', bookingResult.insertId);
            
            // Now mark the original voucher as redeemed in all_vouchers table
            updateVoucherRedemptionStatus(voucherCode, voucherId, bookingResult.insertId);
        });
    }
    
    // Update voucher redemption status in all_vouchers table
    function updateVoucherRedemptionStatus(voucherCode, voucherId, bookingId) {
        console.log('=== UPDATING VOUCHER REDEMPTION STATUS ===');
        console.log('Voucher Code:', voucherCode);
        console.log('Voucher ID:', voucherId);
        console.log('Booking ID:', bookingId);
        
        // Update the original voucher to mark it as redeemed
        const updateVoucherSql = `
            UPDATE all_vouchers 
            SET redeemed = 'Yes'
            WHERE voucher_ref = ? OR id = (
                SELECT id FROM all_vouchers 
                WHERE voucher_ref = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            )
        `;
        
        con.query(updateVoucherSql, [voucherCode, voucherCode], (err, updateResult) => {
            if (err) {
                console.error('Error updating voucher redemption status:', err);
            } else {
                console.log('Voucher redemption status updated successfully');
                console.log('Affected rows:', updateResult.affectedRows);
            }
            
            // Send final success response
            res.status(201).json({ 
                success: true, 
                message: 'Voucher redeemed successfully and booking created!', 
                voucherId: voucherId,
                bookingId: bookingId,
                voucherCode: voucherCode
            });
        });
    }
    
    // Generate voucher code for booking
    function generateVoucherCodeForBooking(bookingId, name, email, paid, voucherType) {
        console.log('=== GENERATING VOUCHER CODE FOR BOOKING ===');
        console.log('Booking ID:', bookingId);
        console.log('Name:', name);
        console.log('Email:', email);
        console.log('Paid:', paid);
        console.log('Voucher Type:', voucherType);
        
        // Call the generate-voucher-code endpoint
        const requestData = {
            flight_category: voucherType,
            customer_name: name,
            customer_email: email,
            location: 'Somerset',
            experience_type: 'Shared Flight',
            voucher_type: 'Book Flight',
            paid_amount: paid
        };
        
        fetch('http://localhost:3002/api/generate-voucher-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.voucher_code) {
                console.log('Voucher code generated successfully:', data.voucher_code);
                
                // Update the booking record with the voucher code
                con.query('UPDATE all_booking SET voucher_code = ? WHERE id = ?', [data.voucher_code, bookingId], (err) => {
                    if (err) {
                        console.error('Error updating booking with voucher_code:', err);
                    } else {
                        console.log('Booking updated with voucher_code:', data.voucher_code);
                    }
                });
            } else {
                console.error('Failed to generate voucher code:', data);
            }
        })
        .catch(error => {
            console.error('Error calling generate-voucher-code endpoint:', error);
        });
    }
    
    // Create passenger records for Flight Voucher
    function createPassengerForFlightVoucher(bookingId, name, weight, paid, passengerDataArray) {
        // Creating passenger records for flight voucher
        
        // Use passengerData if available, otherwise create from main contact info
        let passengersToCreate = [];
        
        if (passengerDataArray && Array.isArray(passengerDataArray) && passengerDataArray.length > 0) {
            passengersToCreate = passengerDataArray.map((p, index) => ({
                firstName: p.firstName || '',
                lastName: p.lastName || '',
                weight: p.weight || null,
                email: p.email || null,
                phone: p.phone || null,
                ticketType: p.ticketType || flight_type || 'Shared Flight', // Set flight type as ticket type
                weatherRefund: p.weatherRefund || false
            }));
        } else {
            // Split name into first and last name
            const nameParts = name.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            // Create passengers based on numberOfPassengers
            for (let i = 0; i < numberOfPassengers; i++) {
                passengersToCreate.push({
                    firstName: i === 0 ? firstName : '', // Only first passenger gets the main contact name
                    lastName: i === 0 ? lastName : '',
                    weight: i === 0 ? weight : null, // Only first passenger gets the main contact weight
                    email: i === 0 ? email : null, // Only first passenger gets the main contact email
                    phone: i === 0 ? phone : null, // Only first passenger gets the main contact phone
                    ticketType: flight_type || 'Shared Flight', // Set flight type as ticket type
                    weatherRefund: false
                });
            }
        }
        
        if (passengersToCreate.length === 0) {
            res.status(201).json({ 
                success: true, 
                message: 'Flight Voucher created successfully!', 
                voucherId: voucherId,
                voucherCode: voucherRef,
                bookingId: bookingId,
                warning: 'No passenger records created'
            });
            return;
        }
        
        // Create passenger records using bulk insert
        const passengerSql = `
            INSERT INTO passenger (
                booking_id, first_name, last_name, weight, email, phone, ticket_type, weather_refund, price, created_at
            ) VALUES ?
        `;
        
        const passengerValues = passengersToCreate.map(p => [
            bookingId, // booking_id
            p.firstName, // first_name
            p.lastName, // last_name
            p.weight, // weight
            p.email, // email
            p.phone, // phone
            p.ticketType, // ticket_type
            p.weatherRefund, // weather_refund
            paid / passengersToCreate.length, // price (split equally among passengers)
            now // created_at
        ]);
        
        con.query(passengerSql, [passengerValues], (err, passengerResult) => {
            if (err) {
                console.error('Error creating passengers for Flight Voucher:', err);
                // Even if passenger creation fails, send response with voucher ID
                res.status(201).json({ 
                    success: true, 
                    message: 'Voucher created successfully!', 
                    voucherId: voucherId,
                    voucherCode: voucherRef,
                    warning: 'Passenger record creation failed'
                });
                return;
            }
            
            // Update the booking pax count to match the number of passengers created
            const updatePaxSql = `UPDATE all_booking SET pax = ? WHERE id = ?`;
            con.query(updatePaxSql, [passengersToCreate.length, bookingId], (err2) => {
                if (err2) {
                    console.error('Error updating pax count:', err2);
                }
            });
            
            // Send success response
            res.status(201).json({ 
                success: true, 
                message: 'Flight Voucher created successfully!', 
                voucherId: voucherId,
                voucherCode: voucherRef,
                bookingId: bookingId,
                passengersCreated: passengersToCreate.length
            });
        });
    }
    
    // Generate voucher code for Flight Voucher after creation
    function generateVoucherCodeForFlightVoucher(voucherId, name, email, paid) {
        console.log('=== GENERATING VOUCHER CODE FOR FLIGHT VOUCHER ===');
        console.log('Voucher ID:', voucherId);
        console.log('Name:', name);
        console.log('Email:', email);
        console.log('Paid:', paid);
        
        // Generate unique voucher code
        const voucherCode = generateUniqueVoucherCode();
        
        // Update the voucher record with the generated code
        const updateSql = `UPDATE all_vouchers SET voucher_ref = ? WHERE id = ?`;
        
        con.query(updateSql, [voucherCode, voucherId], (err, updateResult) => {
            if (err) {
                console.error('Error updating voucher with code:', err);
                // Even if update fails, send response with voucher ID
                res.status(201).json({ 
                    success: true, 
                    message: 'Voucher created successfully!', 
                    voucherId: voucherId,
                    voucherCode: null,
                    note: 'Voucher created but code generation failed'
                });
                return;
            }
            
            console.log('=== VOUCHER CODE GENERATED SUCCESSFULLY ===');
            console.log('Voucher ID:', voucherId);
            console.log('Voucher Code:', voucherCode);
            
            // Send success response with voucher code
            res.status(201).json({ 
                success: true, 
                message: 'Voucher created successfully with code!', 
                voucherId: voucherId,
                voucherCode: voucherCode
            });
        });
    }
    
    // Generate unique voucher code
    function generateUniqueVoucherCode() {
        const prefix = 'FAT'; // Flight Voucher prefix
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}${timestamp}${random}`;
    }
});

// Test endpoint to generate voucher code for existing voucher
app.post('/api/generateVoucherCodeForExisting', (req, res) => {
    const { voucher_id } = req.body;
    
    if (!voucher_id) {
        return res.status(400).json({ success: false, message: 'voucher_id is required' });
    }
    
    // Check if voucher exists
    const checkSql = `SELECT id, name, email, paid, voucher_ref FROM all_vouchers WHERE id = ?`;
    
    con.query(checkSql, [voucher_id], (err, voucherResult) => {
        if (err) {
            console.error('Error checking voucher:', err);
            return res.status(500).json({ success: false, error: 'Database query failed' });
        }
        
        if (voucherResult.length === 0) {
            return res.status(404).json({ success: false, message: 'Voucher not found' });
        }
        
        const voucher = voucherResult[0];
        
        if (voucher.voucher_ref && voucher.voucher_ref.trim() !== '') {
            return res.status(400).json({ success: false, message: 'Voucher already has a code', voucherCode: voucher.voucher_ref });
        }
        
        // Generate unique voucher code
        const voucherCode = generateUniqueVoucherCode();
        
        // Update the voucher record with the generated code
        const updateSql = `UPDATE all_vouchers SET voucher_ref = ? WHERE id = ?`;
        
        con.query(updateSql, [voucherCode, voucher_id], (err, updateResult) => {
            if (err) {
                console.error('Error updating voucher with code:', err);
                return res.status(500).json({ success: false, error: 'Failed to update voucher with code' });
            }
            
            console.log('=== VOUCHER CODE GENERATED FOR EXISTING VOUCHER ===');
            console.log('Voucher ID:', voucher_id);
            console.log('Voucher Code:', voucherCode);
            
            res.json({ 
                success: true, 
                message: 'Voucher code generated successfully!', 
                voucherId: voucher_id,
                voucherCode: voucherCode
            });
        });
    });
    
    // Generate unique voucher code
    function generateUniqueVoucherCode() {
        const prefix = 'FAT'; // Flight Voucher prefix
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}${timestamp}${random}`;
    }
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
        
        // DEBUG: Log flight_date to diagnose "Invalid Date" issue
        console.log('=== GET BOOKING DETAIL DEBUG ===');
        console.log('Booking ID:', booking_id);
        console.log('flight_date from DB:', booking.flight_date, 'Type:', typeof booking.flight_date);
        console.log('time_slot from DB:', booking.time_slot);
        
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
        // Eğer passenger kaydı yok ama booking.pax > 0 ise, placeholder passenger listesi üret
        let passengers = passengerRows || [];
        const paxCount = parseInt(booking.pax, 10) || 0;
        // Booking name'den ad/soyad çıkarımı
        const fullName = (booking.name || '').trim();
        const nameParts = fullName.split(/\s+/).filter(Boolean);
        const fallbackFirstName = nameParts.length > 0 ? nameParts[0] : '';
        const fallbackLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        if ((!passengers || passengers.length === 0) && paxCount > 0) {
            passengers = Array.from({ length: paxCount }, (_, i) => ({
                id: `placeholder-${booking_id}-${i + 1}`,
                booking_id: booking_id,
                first_name: fallbackFirstName,
                last_name: fallbackLastName,
                weight: null,
                price: null,
                email: booking.email || null,
                phone: booking.phone || null,
                ticket_type: booking.flight_type || null,
            }));
        } else if (Array.isArray(passengers) && passengers.length > 0) {
            // Mevcut kayıtlarda isim alanları boşsa booking.name'i fallback olarak dön
            passengers = passengers.map(p => ({
                ...p,
                first_name: p.first_name && String(p.first_name).trim() !== '' ? p.first_name : fallbackFirstName,
                last_name: p.last_name && String(p.last_name).trim() !== '' ? p.last_name : fallbackLastName,
            }));
        }
        // 3. Notes (admin_notes)
        const [notesRows] = await new Promise((resolve, reject) => {
            con.query('SELECT * FROM admin_notes WHERE booking_id = ?', [booking_id], (err, rows) => {
                if (err) reject(err);
                else resolve([rows]);
            });
        });
        
        // 4. Additional Information
        let additionalInformation = null;
        try {
            // Get additional information answers
            const [answersRows] = await new Promise((resolve, reject) => {
                const answersSql = `
                    SELECT 
                        aia.id,
                        aia.question_id,
                        aia.answer,
                        aia.created_at,
                        aiq.question_text,
                        aiq.question_type,
                        aiq.options,
                        aiq.help_text,
                        aiq.category
                    FROM additional_information_answers aia
                    JOIN additional_information_questions aiq ON aia.question_id = aiq.id
                    WHERE aia.booking_id = ?
                    ORDER BY aiq.sort_order, aiq.id
                `;
                con.query(answersSql, [booking_id], (err, rows) => {
                    if (err) reject(err);
                    else resolve([rows]);
                });
            });
            
            // Also get all available questions for this journey type to show what questions exist
            const [questionsRows] = await new Promise((resolve, reject) => {
                const questionsSql = `
                    SELECT 
                        id,
                        question_text,
                        question_type,
                        options,
                        help_text,
                        category,
                        journey_types,
                        sort_order
                    FROM additional_information_questions 
                    WHERE is_active = 1 
                    ORDER BY sort_order, id
                `;
                console.log('Fetching questions with SQL:', questionsSql);
                con.query(questionsSql, (err, rows) => {
                    if (err) {
                        console.error('Error fetching questions:', err);
                        reject(err);
                    } else {
                        console.log('Questions fetched successfully:', rows);
                        console.log('Questions count:', rows ? rows.length : 0);
                        resolve([rows]);
                    }
                });
            });
            
            // Format additional information
            const jsonData = (() => {
                if (!booking.additional_information_json) return null;
                if (typeof booking.additional_information_json === 'string') {
                    try {
                        return JSON.parse(booking.additional_information_json);
                    } catch (e) {
                        console.warn('Failed to parse additional_information_json:', e);
                        return null;
                    }
                }
                return booking.additional_information_json;
            })();

            // Create a map of question_id to question details for easy lookup
            const questionMap = new Map();
            questionsRows.forEach(question => {
                try {
                    let parsedOptions = [];
                    let parsedJourneyTypes = [];
                    
                    // Safely parse options
                    if (question.options) {
                        try {
                            parsedOptions = JSON.parse(question.options);
                        } catch (e) {
                            console.warn('Failed to parse options for question', question.id, e);
                            parsedOptions = [];
                        }
                    }
                    
                    // Safely parse journey_types
                    if (question.journey_types) {
                        try {
                            parsedJourneyTypes = JSON.parse(question.journey_types);
                        } catch (e) {
                            console.warn('Failed to parse journey_types for question', question.id, e);
                            parsedJourneyTypes = [];
                        }
                    }
                    
                    questionMap.set(question.id.toString(), {
                        id: question.id,
                        question_text: question.question_text,
                        question_type: question.question_type,
                        options: parsedOptions,
                        help_text: question.help_text,
                        category: question.category,
                        journey_types: parsedJourneyTypes,
                        sort_order: question.sort_order
                    });
                } catch (error) {
                    console.warn('Error processing question:', question.id, error);
                }
            });

            // Process JSON answers and map them to questions
            const jsonAnswers = [];
            if (jsonData) {
                console.log('Processing JSON data:', jsonData);
                console.log('Question map keys:', Array.from(questionMap.keys()));
                
                Object.entries(jsonData).forEach(([key, value]) => {
                    if (key.startsWith('question_')) {
                        const questionId = key.replace('question_', '');
                        console.log('Processing question key:', key, 'questionId:', questionId);
                        
                        const question = questionMap.get(questionId);
                        console.log('Found question for ID', questionId, ':', question);
                        
                        if (question) {
                            jsonAnswers.push({
                                question_id: parseInt(questionId),
                                question_text: question.question_text,
                                question_type: question.question_type,
                                answer: value,
                                options: question.options,
                                help_text: question.help_text,
                                category: question.category,
                                created_at: null // JSON data doesn't have creation time
                            });
                        } else {
                            console.warn('No question found for ID:', questionId);
                        }
                    }
                });
                
                console.log('JSON answers created:', jsonAnswers);
            }

            // Combine answers from both sources (database and JSON)
            const allAnswers = [...answersRows, ...jsonAnswers];

            additionalInformation = {
                questions: questionsRows.map(question => {
                    try {
                        let parsedOptions = [];
                        let parsedJourneyTypes = [];
                        
                        // Safely parse options
                        if (question.options) {
                            try {
                                parsedOptions = JSON.parse(question.options);
                            } catch (e) {
                                console.warn('Failed to parse options for question', question.id, e);
                                parsedOptions = [];
                            }
                        }
                        
                        // Safely parse journey_types
                        if (question.journey_types) {
                            if (Array.isArray(question.journey_types)) {
                                parsedJourneyTypes = question.journey_types;
                            } else if (typeof question.journey_types === 'string') {
                                try {
                                    parsedJourneyTypes = JSON.parse(question.journey_types);
                                } catch (e) {
                                    console.warn('Failed to parse journey_types for question', question.id, e);
                                    parsedJourneyTypes = [];
                                }
                            }
                        }
                        
                        return {
                            id: question.id,
                            question_text: question.question_text,
                            question_type: question.question_type,
                            options: parsedOptions,
                            help_text: question.help_text,
                            category: question.category,
                            journey_types: parsedJourneyTypes,
                            sort_order: question.sort_order
                        };
                    } catch (error) {
                        console.warn('Error processing question:', question.id, error);
                        return {
                            id: question.id,
                            question_text: question.question_text,
                            question_type: question.question_type,
                            options: [],
                            help_text: question.help_text,
                            category: question.category,
                            journey_types: [],
                            sort_order: question.sort_order
                        };
                    }
                }),
                answers: allAnswers.map(answer => ({
                    question_id: answer.question_id,
                    question_text: answer.question_text,
                    question_type: answer.question_type,
                    answer: answer.answer,
                    options: answer.options || [],
                    help_text: answer.help_text,
                    category: answer.category,
                    created_at: answer.created_at
                })),
                legacy: {
                    additional_notes: booking.additional_notes,
                    hear_about_us: booking.hear_about_us,
                    ballooning_reason: booking.ballooning_reason,
                    prefer: booking.prefer
                },
                additional_information_json: jsonData
            };
        } catch (error) {
            console.error('Error fetching additional information:', error);
            // Set default additional information structure
            const jsonData = (() => {
                if (!booking.additional_information_json) return null;
                if (typeof booking.additional_information_json === 'string') {
                    try {
                        return JSON.parse(booking.additional_information_json);
                    } catch (e) {
                        console.warn('Failed to parse additional_information_json:', e);
                        return null;
                    }
                }
                return booking.additional_information_json;
            })();

            additionalInformation = {
                questions: [],
                answers: [],
                legacy: {
                    additional_notes: booking.additional_notes,
                    hear_about_us: booking.hear_about_us,
                    ballooning_reason: booking.ballooning_reason,
                    prefer: booking.prefer
                },
                additional_information_json: jsonData
            };
        }
        
        // Debug: Log what we're returning
        console.log('Returning additional information:', {
            questionsCount: additionalInformation.questions ? additionalInformation.questions.length : 0,
            answersCount: additionalInformation.answers ? additionalInformation.answers.length : 0,
            questions: additionalInformation.questions,
            answers: additionalInformation.answers,
            jsonData: additionalInformation.additional_information_json
        });
        
        res.json({
            success: true,
            booking,
            passengers,
            notes: notesRows,
            additional_information: additionalInformation
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
    
    // First, get current booking details to calculate price per passenger
    const getBookingSql = 'SELECT paid, pax, due FROM all_booking WHERE id = ? LIMIT 1';
    con.query(getBookingSql, [booking_id], (getErr, bookingRows) => {
        if (getErr) {
            console.error('Error fetching booking details:', getErr);
            return res.status(500).json({ success: false, message: 'Database error fetching booking' });
        }
        
        if (!bookingRows || bookingRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        
        const currentPaid = parseFloat(bookingRows[0].paid) || 0;
        const currentPax = parseInt(bookingRows[0].pax) || 1;
        const currentDue = parseFloat(bookingRows[0].due) || 0;
        const pricePerPassenger = currentPax > 0 ? (currentPaid / currentPax) : 0;
        
        console.log('=== ADD PASSENGER - PRICE CALCULATION ===');
        console.log('Booking ID:', booking_id);
        console.log('Current Paid:', currentPaid);
        console.log('Current Pax:', currentPax);
        console.log('Current Due:', currentDue);
        console.log('Price Per Passenger:', pricePerPassenger);
        console.log('New Due will be:', currentDue + pricePerPassenger);
        
    // passenger tablosunda email, phone, ticket_type, weight varsa ekle
    const sql = 'INSERT INTO passenger (booking_id, first_name, last_name, weight, email, phone, ticket_type) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const values = [booking_id, first_name, last_name, weight || null, email || null, phone || null, ticket_type || null];
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error adding passenger:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
            
            // After insert, update pax count and add to due amount
            // New due = old due + price_per_passenger (for the newly added passenger)
            const updateBookingSql = `
                UPDATE all_booking 
                SET pax = (SELECT COUNT(*) FROM passenger WHERE booking_id = ?),
                    due = COALESCE(due, 0) + ?
                WHERE id = ?
            `;
            con.query(updateBookingSql, [booking_id, pricePerPassenger, booking_id], (err2, updateResult) => {
            if (err2) {
                    console.error('Error updating pax and due after addPassenger:', err2);
                // Still return success for passenger creation
                    return res.status(201).json({ success: true, passengerId: result.insertId, paxUpdated: false, dueUpdated: false });
            }
                
                console.log('✅ Updated booking - Added to due:', pricePerPassenger);
                console.log('✅ Pax updated, rows affected:', updateResult.affectedRows);
                
			// Also recompute availability for this booking's slot
			const bookingInfoSql = 'SELECT flight_date, time_slot, activity_id, location FROM all_booking WHERE id = ? LIMIT 1';
			con.query(bookingInfoSql, [booking_id], (infoErr, infoRows) => {
				if (infoErr) {
					console.error('Error fetching booking info for availability update after addPassenger:', infoErr);
                        return res.status(201).json({ success: true, passengerId: result.insertId, paxUpdated: true, dueUpdated: true, availabilityUpdated: false });
				}
				if (!infoRows || infoRows.length === 0) {
                        return res.status(201).json({ success: true, passengerId: result.insertId, paxUpdated: true, dueUpdated: true, availabilityUpdated: false });
				}
				const row = infoRows[0];
				const bookingDate = (row.flight_date ? dayjs(row.flight_date).format('YYYY-MM-DD') : null);
				const bookingTime = (row.time_slot ? dayjs(`2000-01-01 ${row.time_slot}`).format('HH:mm') : (row.flight_date ? dayjs(row.flight_date).format('HH:mm') : null));
				const activityId = row.activity_id;
				if (bookingDate && bookingTime && activityId) {
					updateSpecificAvailability(bookingDate, bookingTime, activityId, 1);
                        return res.status(201).json({ success: true, passengerId: result.insertId, paxUpdated: true, dueUpdated: true, availabilityUpdated: true, newDue: currentDue + pricePerPassenger });
				}
				if (bookingDate && bookingTime && row.location && !activityId) {
					const activitySql = 'SELECT id FROM activity WHERE location = ? AND status = "Live" LIMIT 1';
					con.query(activitySql, [row.location], (actErr, actRows) => {
						if (!actErr && actRows && actRows.length > 0) {
							updateSpecificAvailability(bookingDate, bookingTime, actRows[0].id, 1);
                                return res.status(201).json({ success: true, passengerId: result.insertId, paxUpdated: true, dueUpdated: true, availabilityUpdated: true, newDue: currentDue + pricePerPassenger });
						}
                            return res.status(201).json({ success: true, passengerId: result.insertId, paxUpdated: true, dueUpdated: true, availabilityUpdated: false, newDue: currentDue + pricePerPassenger });
					});
					return; // response will be sent in callback above
				}
                    return res.status(201).json({ success: true, passengerId: result.insertId, paxUpdated: true, dueUpdated: true, availabilityUpdated: false, newDue: currentDue + pricePerPassenger });
                });
			});
        });
    });
});

// Delete Passenger from booking
app.delete('/api/deletePassenger', (req, res) => {
    const { passenger_id, booking_id } = req.body;
    
    if (!passenger_id || !booking_id) {
        return res.status(400).json({ success: false, message: 'passenger_id and booking_id are required' });
    }
    
    // First, get current booking details to calculate price per passenger (before deletion)
    const getBookingSql = 'SELECT paid, pax, due FROM all_booking WHERE id = ? LIMIT 1';
    con.query(getBookingSql, [booking_id], (getErr, bookingRows) => {
        if (getErr) {
            console.error('Error fetching booking details:', getErr);
            return res.status(500).json({ success: false, message: 'Database error fetching booking' });
        }
        
        if (!bookingRows || bookingRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        
        const currentPaid = parseFloat(bookingRows[0].paid) || 0;
        const currentPax = parseInt(bookingRows[0].pax) || 1;
        const currentDue = parseFloat(bookingRows[0].due) || 0;
        const pricePerPassenger = currentPax > 0 ? (currentPaid / currentPax) : 0;
        
        console.log('=== DELETE PASSENGER - PRICE CALCULATION ===');
        console.log('Booking ID:', booking_id);
        console.log('Current Paid:', currentPaid);
        console.log('Current Pax:', currentPax);
        console.log('Current Due:', currentDue);
        console.log('Price Per Passenger:', pricePerPassenger);
        
        // Delete the passenger
    const deletePassengerSql = 'DELETE FROM passenger WHERE id = ? AND booking_id = ?';
    con.query(deletePassengerSql, [passenger_id, booking_id], (err, result) => {
        if (err) {
            console.error('Error deleting passenger:', err);
            return res.status(500).json({ success: false, message: 'Database error while deleting passenger' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Passenger not found or does not belong to this booking' });
        }
        
            // After deletion, update pax count and subtract from due amount (if due > 0)
            // Only subtract if there was due amount (meaning extra guests were added)
            const newDue = Math.max(0, currentDue - pricePerPassenger);
            
            console.log('New Due after deletion:', newDue);
            
            const updateBookingSql = `
                UPDATE all_booking 
                SET pax = (SELECT COUNT(*) FROM passenger WHERE booking_id = ?),
                    due = ?
                WHERE id = ?
            `;
            con.query(updateBookingSql, [booking_id, newDue, booking_id], (err2) => {
            if (err2) {
                    console.error('Error updating pax and due after deletePassenger:', err2);
                // Still return success for passenger deletion
                    return res.status(200).json({ success: true, message: 'Passenger deleted but pax/due update failed', paxUpdated: false, dueUpdated: false });
            }
            
                console.log('✅ Updated booking - Subtracted from due:', pricePerPassenger);
                console.log('✅ New due:', newDue);
            
            
		// Recompute availability for this booking's slot
		const bookingInfoSql = 'SELECT pax, flight_date, time_slot, activity_id, location FROM all_booking WHERE id = ? LIMIT 1';
		con.query(bookingInfoSql, [booking_id], (infoErr, infoRows) => {
			if (infoErr) {
				console.error('Error fetching booking info for availability update after deletePassenger:', infoErr);
                        return res.status(200).json({ success: true, message: 'Passenger deleted successfully', paxUpdated: true, dueUpdated: true, availabilityUpdated: false, newDue: newDue });
			}
			if (!infoRows || infoRows.length === 0) {
                        return res.status(200).json({ success: true, message: 'Passenger deleted successfully', paxUpdated: true, dueUpdated: true, availabilityUpdated: false, newDue: newDue });
			}
			const row = infoRows[0];
			const bookingDate = (row.flight_date ? dayjs(row.flight_date).format('YYYY-MM-DD') : null);
			const bookingTime = (row.time_slot ? dayjs(`2000-01-01 ${row.time_slot}`).format('HH:mm') : (row.flight_date ? dayjs(row.flight_date).format('HH:mm') : null));
			const activityId = row.activity_id;
			if (bookingDate && bookingTime && activityId) {
				updateSpecificAvailability(bookingDate, bookingTime, activityId, 1);
                        return res.status(200).json({ success: true, message: 'Passenger deleted successfully', paxUpdated: true, dueUpdated: true, availabilityUpdated: true, remainingPax: row.pax, newDue: newDue });
			}
			if (bookingDate && bookingTime && row.location && !activityId) {
				const activitySql = 'SELECT id FROM activity WHERE location = ? AND status = "Live" LIMIT 1';
				con.query(activitySql, [row.location], (actErr, actRows) => {
					if (!actErr && actRows && actRows.length > 0) {
						updateSpecificAvailability(bookingDate, bookingTime, actRows[0].id, 1);
                                return res.status(200).json({ success: true, message: 'Passenger deleted successfully', paxUpdated: true, dueUpdated: true, availabilityUpdated: true, remainingPax: row.pax, newDue: newDue });
					}
                            return res.status(200).json({ success: true, message: 'Passenger deleted successfully', paxUpdated: true, dueUpdated: true, availabilityUpdated: false, remainingPax: row.pax, newDue: newDue });
				});
				return; // response will be sent in callback above
			}
                    return res.status(200).json({ success: true, message: 'Passenger deleted successfully', paxUpdated: true, dueUpdated: true, availabilityUpdated: false, remainingPax: row.pax, newDue: newDue });
                });
		});
        });
    });
});

// POST alias for environments/proxies that block DELETE bodies
app.post('/api/deletePassenger', (req, res) => {
    const { passenger_id, booking_id } = req.body;
    if (!passenger_id || !booking_id) {
        return res.status(400).json({ success: false, message: 'passenger_id and booking_id are required' });
    }
    const deletePassengerSql = 'DELETE FROM passenger WHERE id = ? AND booking_id = ?';
    con.query(deletePassengerSql, [passenger_id, booking_id], (err, result) => {
        if (err) {
            console.error('Error deleting passenger (POST):', err);
            return res.status(500).json({ success: false, message: 'Database error while deleting passenger' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Passenger not found or does not belong to this booking' });
        }
        const updatePaxSql = `UPDATE all_booking SET pax = (SELECT COUNT(*) FROM passenger WHERE booking_id = ?) WHERE id = ?`;
        con.query(updatePaxSql, [booking_id, booking_id], (err2) => {
            if (err2) {
                console.error('Error updating pax after deletePassenger (POST):', err2);
                return res.status(200).json({ success: true, message: 'Passenger deleted but pax update failed', paxUpdated: false });
            }
            con.query('SELECT pax FROM all_booking WHERE id = ?', [booking_id], (err3, rows) => {
                const currentPax = rows?.[0]?.pax ?? null;
                return res.status(200).json({ success: true, message: 'Passenger deleted successfully', paxUpdated: true, remainingPax: currentPax });
            });
        });
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

// Helper function to handle flight attempts increment for voucher cancellations
const handleFlightAttemptsIncrement = async (booking_id) => {
    try {
        // Find voucher_code from booking
        const [rows] = await new Promise((resolve, reject) => {
            con.query("SELECT voucher_code FROM all_booking WHERE id = ?", [booking_id], (err, rows) => {
                if (err) reject(err); else resolve([rows]);
            });
        });
        const voucherCode = rows && rows[0] ? rows[0].voucher_code : null;
        if (!voucherCode) {
            console.log('No voucher code found for booking:', booking_id);
            return;
        }
        
        console.log('Handling flight attempts increment for voucher:', voucherCode, 'booking:', booking_id);
        
        // Get current attempts and increment
        const [voucherRows] = await new Promise((resolve, reject) => {
            con.query("SELECT flight_attempts, booking_references FROM all_vouchers WHERE voucher_code = ?", [voucherCode], (err, rows) => {
                if (err) reject(err); else resolve([rows]);
            });
        });
        
        if (voucherRows && voucherRows.length > 0) {
            const currentAttempts = parseInt(voucherRows[0].flight_attempts || 0, 10);
            const newAttempts = currentAttempts + 1;
            
            // Update booking_references to link this attempt to the specific booking
            let bookingRefs = [];
            try {
                bookingRefs = voucherRows[0].booking_references ? JSON.parse(voucherRows[0].booking_references) : [];
            } catch (e) {
                console.warn('Failed to parse booking_references:', e);
            }
            
            // Add this booking to the references
            bookingRefs.push({
                booking_id: booking_id,
                cancelled_at: new Date().toISOString(),
                attempt_number: newAttempts
            });
            
            await new Promise((resolve, reject) => {
                con.query("UPDATE all_vouchers SET flight_attempts = ?, booking_references = ? WHERE voucher_code = ?", 
                    [newAttempts, JSON.stringify(bookingRefs), voucherCode], (err, result) => {
                    if (err) reject(err); else resolve(result);
                });
            });
            
            console.log(`Incremented flight_attempts for voucher ${voucherCode} to ${newAttempts} due to booking ${booking_id} cancellation`);
        }
    } catch (e) {
        console.error('Failed to increment flight_attempts for voucher:', e);
    }
};

app.patch('/api/updateBookingField', (req, res) => {
    const { booking_id, field, value } = req.body;
    
    // Debug: API çağrısını logla
    console.log('updateBookingField API çağrısı:', { booking_id, field, value });
    
    const allowedFields = ['name', 'phone', 'email', 'expires', 'weight', 'status', 'flight_attempts', 'choose_add_on', 'additional_notes', 'preferred_day', 'preferred_location', 'preferred_time', 'paid', 'activity_id', 'location', 'flight_type', 'flight_date', 'experience_types']; // Add new fields
    if (!booking_id || !field || !allowedFields.includes(field)) {
        console.log('updateBookingField - Geçersiz istek:', { booking_id, field, value });
        return res.status(400).json({ success: false, message: 'Invalid request' });
    }
    
    let sql;
    let params;
    if (field === 'weight') {
        // passenger tablosunda ana yolcunun weight bilgisini güncelle
        sql = `UPDATE passenger SET weight = ? WHERE booking_id = ? LIMIT 1`;
        params = [value, booking_id];
    } else {
        // Normalize status values to proper capitalization
        let normalizedValue = value;
        if (field === 'status') {
            if (typeof value === 'string') {
                const statusLower = value.toLowerCase();
                if (statusLower === 'cancelled') {
                    normalizedValue = 'Cancelled';
                } else if (statusLower === 'scheduled') {
                    normalizedValue = 'Scheduled';
                } else if (statusLower === 'completed') {
                    normalizedValue = 'Completed';
                } else if (statusLower === 'pending') {
                    normalizedValue = 'Pending';
                }
            }
        }
        
        sql = `UPDATE all_booking SET ${field} = ? WHERE id = ?`;
        params = [normalizedValue, booking_id];
    }
    
    // normalizedValue'yu her durumda tanımla
    if (typeof normalizedValue === 'undefined') {
        normalizedValue = value;
    }
    
    console.log('updateBookingField - SQL:', sql);
    console.log('updateBookingField - Params:', params);
    
    con.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error updating booking field:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        console.log('updateBookingField - Database güncelleme başarılı:', { field, value, affectedRows: result.affectedRows });
        
        // If status is updated, also insert into booking_status_history and handle flight attempts
        if (field === 'status') {
            const historySql = 'INSERT INTO booking_status_history (booking_id, status) VALUES (?, ?)';
            console.log('updateBookingField - Status history ekleniyor:', { booking_id, status: normalizedValue });
            con.query(historySql, [booking_id, normalizedValue], (err2) => {
                if (err2) console.error('History insert error:', err2);
                else console.log('updateBookingField - Status history başarıyla eklendi');
                
                // Handle flight attempts increment for voucher cancellations
                if (normalizedValue === 'Cancelled') {
                    handleFlightAttemptsIncrement(booking_id);
                }
                
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

// Update voucher passenger field
app.patch('/api/updateVoucherPassengerField', (req, res) => {
    console.log('=== updateVoucherPassengerField ENDPOINT CALLED ===');
    console.log('Request body:', req.body);
    const { voucher_id, passenger_index, field, value } = req.body;
    const allowedFields = ['weight', 'first_name', 'last_name', 'price'];
    if (!voucher_id || passenger_index === undefined || !field || !allowedFields.includes(field)) {
        console.log('Validation failed:', { voucher_id, passenger_index, field, value });
        return res.status(400).json({ success: false, message: 'Invalid request' });
    }
    
    // First, get the current voucher_passenger_details
    const getSql = `SELECT voucher_passenger_details FROM all_vouchers WHERE id = ?`;
    con.query(getSql, [voucher_id], (err, rows) => {
        if (err) {
            console.error('Error fetching voucher passenger details:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Voucher not found' });
        }
        
        // Parse existing passenger details
        let passengerDetails = [];
        try {
            const rawDetails = rows[0].voucher_passenger_details;
            if (rawDetails) {
                passengerDetails = typeof rawDetails === 'string' 
                    ? JSON.parse(rawDetails) 
                    : rawDetails;
            }
        } catch (e) {
            console.warn('Failed to parse voucher_passenger_details:', e);
            passengerDetails = [];
        }
        
        // Ensure passengerDetails is an array
        if (!Array.isArray(passengerDetails)) {
            passengerDetails = [];
        }
        
        // Ensure the passenger index exists
        if (passenger_index >= passengerDetails.length || passenger_index < 0) {
            return res.status(400).json({ success: false, message: 'Invalid passenger index' });
        }
        
        // Ensure the passenger object exists
        if (!passengerDetails[passenger_index]) {
            passengerDetails[passenger_index] = {};
        }
        
        // Update the specific field for the passenger at the given index
        passengerDetails[passenger_index][field] = value;
        
        // Update the voucher_passenger_details column
        const updateSql = `UPDATE all_vouchers SET voucher_passenger_details = ? WHERE id = ?`;
        con.query(updateSql, [JSON.stringify(passengerDetails), voucher_id], (updateErr, updateResult) => {
            if (updateErr) {
                console.error('Error updating voucher passenger details:', updateErr);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            // If price was updated, also update the voucher's paid amount
            if (field === 'price') {
                const totalPrice = passengerDetails.reduce((sum, p) => {
                    const price = parseFloat(p.price) || 0;
                    return sum + price;
                }, 0);
                
                const updatePaidSql = `UPDATE all_vouchers SET paid = ? WHERE id = ?`;
                con.query(updatePaidSql, [totalPrice, voucher_id], (paidErr) => {
                    if (paidErr) {
                        console.warn('Warning: Could not update voucher paid amount:', paidErr);
                    }
                });
            }
            
            res.json({ success: true, passengerDetails });
        });
    });
});

// Add voucher passenger
app.post('/api/addVoucherPassenger', (req, res) => {
    console.log('=== addVoucherPassenger ENDPOINT CALLED ===');
    console.log('Request body:', req.body);
    const { voucher_id, first_name, last_name, weight, price } = req.body;
    
    if (!voucher_id || !first_name || !last_name) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    // First, get the current voucher_passenger_details
    const getSql = `SELECT voucher_passenger_details, paid FROM all_vouchers WHERE id = ?`;
    con.query(getSql, [voucher_id], (err, rows) => {
        if (err) {
            console.error('Error fetching voucher passenger details:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Voucher not found' });
        }
        
        // Parse existing passenger details
        let passengerDetails = [];
        try {
            const rawDetails = rows[0].voucher_passenger_details;
            if (rawDetails) {
                passengerDetails = typeof rawDetails === 'string' 
                    ? JSON.parse(rawDetails) 
                    : rawDetails;
            }
        } catch (e) {
            console.warn('Failed to parse voucher_passenger_details:', e);
            passengerDetails = [];
        }
        
        // Ensure passengerDetails is an array
        if (!Array.isArray(passengerDetails)) {
            passengerDetails = [];
        }
        
        // Calculate price per passenger if not provided
        let passengerPrice = price;
        if (!passengerPrice || passengerPrice === '') {
            const currentPaid = parseFloat(rows[0].paid) || 0;
            const currentPassengerCount = passengerDetails.length;
            // If there are existing passengers, divide paid amount equally
            // Otherwise, set to 0 (will be updated later)
            passengerPrice = currentPassengerCount > 0 ? (currentPaid / (currentPassengerCount + 1)).toFixed(2) : 0;
        }
        
        // Add new passenger
        const newPassenger = {
            first_name: first_name,
            last_name: last_name,
            weight: weight || null,
            price: passengerPrice || null
        };
        
        passengerDetails.push(newPassenger);
        
        // Calculate new total paid amount
        const totalPrice = passengerDetails.reduce((sum, p) => {
            const pPrice = parseFloat(p.price) || 0;
            return sum + pPrice;
        }, 0);
        
        // Update the voucher_passenger_details column
        const updateSql = `UPDATE all_vouchers SET voucher_passenger_details = ?, paid = ? WHERE id = ?`;
        con.query(updateSql, [JSON.stringify(passengerDetails), totalPrice, voucher_id], (updateErr, updateResult) => {
            if (updateErr) {
                console.error('Error updating voucher passenger details:', updateErr);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            res.json({ success: true, passengerDetails, newPassenger });
        });
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
                            let arr = [];
                            try {
                                if (row.choose_add_on && row.choose_add_on.trim() !== "" && row.choose_add_on.startsWith("[")) {
                                    arr = JSON.parse(row.choose_add_on);
                                }
                            } catch (e) { 
                                console.error('AddOn JSON parse error:', e); 
                                arr = []; 
                            }
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
                                                let arr = [];
                                                try {
                                                    if (row.choose_add_on && row.choose_add_on.trim() !== "" && row.choose_add_on.startsWith("[")) {
                                                        arr = JSON.parse(row.choose_add_on);
                                                    }
                                                } catch (e) { 
                                                    console.error('Refundable JSON parse error:', e); 
                                                    arr = []; 
                                                }
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
    const { activity_name, capacity, event_time, location, flight_type, voucher_type, private_charter_voucher_types, private_charter_pricing, status, weekday_morning_price, flexible_weekday_price, any_day_flight_price, shared_flight_from_price, private_charter_from_price } = req.body;
    let image = null;
    if (req.file) {
        // Sunucuya göre path'i düzelt
        image = `/uploads/activities/${req.file.filename}`;
    }
    if (!activity_name || !capacity || !location || !flight_type || !status || !weekday_morning_price || !flexible_weekday_price || !any_day_flight_price || !shared_flight_from_price || !private_charter_from_price) {
        return res.status(400).json({ success: false, message: "Eksik bilgi!" });
    }
    
    // Validate and format flight_type
    let formattedFlightType = flight_type;
    if (Array.isArray(flight_type)) {
        formattedFlightType = flight_type.join(',');
    } else if (typeof flight_type === 'string') {
        // Ensure it's properly formatted
        formattedFlightType = flight_type.split(',').map(type => type.trim()).join(',');
    }
    
    // Validate and format private_charter_voucher_types
    let formattedPrivateCharterVoucherTypes = private_charter_voucher_types;
    if (Array.isArray(private_charter_voucher_types)) {
        formattedPrivateCharterVoucherTypes = private_charter_voucher_types.join(',');
    } else if (typeof private_charter_voucher_types === 'string') {
        // Ensure it's properly formatted
        formattedPrivateCharterVoucherTypes = private_charter_voucher_types.split(',').map(type => type.trim()).join(',');
    }
    
    const sql = `
        INSERT INTO activity (activity_name, capacity, start_date, end_date, event_time, location, flight_type, voucher_type, private_charter_voucher_types, private_charter_pricing, status, image, weekday_morning_price, flexible_weekday_price, any_day_flight_price, shared_flight_from_price, private_charter_from_price)
        VALUES (?, ?, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    con.query(sql, [activity_name, capacity, location, formattedFlightType, voucher_type || 'All', formattedPrivateCharterVoucherTypes || null, JSON.stringify(private_charter_pricing || {}), status, image, weekday_morning_price, flexible_weekday_price, any_day_flight_price, shared_flight_from_price, private_charter_from_price], (err, result) => {
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

// Get voucher types for a specific location
app.get('/api/locationVoucherTypes/:location', (req, res) => {
    const { location } = req.params;
    if (!location) return res.status(400).json({ success: false, message: 'Location is required' });
    
    const sql = `
        SELECT voucher_type
        FROM activity 
        WHERE location = ? AND status = 'Live'
        ORDER BY id ASC
        LIMIT 1
    `;
    con.query(sql, [location], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        if (!result || result.length === 0) {
            return res.status(404).json({ success: false, message: "No voucher types found for this location" });
        }
        
        const voucherTypes = result[0].voucher_type;
        let voucherTypesArray = [];
        
        if (voucherTypes && voucherTypes !== 'All') {
            voucherTypesArray = voucherTypes.split(',').map(type => type.trim());
        }
        
        res.json({ success: true, data: voucherTypesArray });
    });
});

// Update activity by id (with image upload)
app.put("/api/activity/:id", upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { activity_name, capacity, event_time, location, flight_type, voucher_type, private_charter_voucher_types, private_charter_pricing, status, weekday_morning_price, flexible_weekday_price, any_day_flight_price, shared_flight_from_price, private_charter_from_price } = req.body;
    let image = null;
    if (req.file) {
        image = `/uploads/activities/${req.file.filename}`;
    }
    
    // Validate and format flight_type
    let formattedFlightType = flight_type;
    if (Array.isArray(flight_type)) {
        formattedFlightType = flight_type.join(',');
    } else if (typeof flight_type === 'string') {
        // Ensure it's properly formatted
        formattedFlightType = flight_type.split(',').map(type => type.trim()).join(',');
    }
    
    // Eğer yeni fotoğraf yoksa, mevcut image değerini koru
    const getImageSql = "SELECT image FROM activity WHERE id = ?";
    con.query(getImageSql, [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        const currentImage = result && result[0] ? result[0].image : null;
        const finalImage = image || currentImage;
        // Validate and format private_charter_voucher_types
        let formattedPrivateCharterVoucherTypes = private_charter_voucher_types;
        if (Array.isArray(private_charter_voucher_types)) {
            formattedPrivateCharterVoucherTypes = private_charter_voucher_types.join(',');
        } else if (typeof private_charter_voucher_types === 'string') {
            // Ensure it's properly formatted
            formattedPrivateCharterVoucherTypes = private_charter_voucher_types.split(',').map(type => type.trim()).join(',');
        }

        const sql = `
            UPDATE activity SET activity_name=?, capacity=?, start_date=NULL, end_date=NULL, event_time=NULL, location=?, flight_type=?, voucher_type=?, private_charter_voucher_types=?, private_charter_pricing=?, status=?, image=?, weekday_morning_price=?, flexible_weekday_price=?, any_day_flight_price=?, shared_flight_from_price=?, private_charter_from_price=?
            WHERE id=?
        `;
        con.query(sql, [activity_name, capacity, location, formattedFlightType, voucher_type || 'All', formattedPrivateCharterVoucherTypes || null, JSON.stringify(private_charter_pricing || {}), status, finalImage, weekday_morning_price, flexible_weekday_price, any_day_flight_price, shared_flight_from_price, private_charter_from_price, id], (err, result) => {
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
        
        // Log the results for debugging
        console.log('Active locations with images:', result);
        
        res.json({ success: true, data: result });
    });
});

// Get pricing information for a specific location
app.get('/api/locationPricing/:location', (req, res) => {
    const { location } = req.params;
    if (!location) return res.status(400).json({ success: false, message: 'Location is required' });
    
    console.log('=== /api/locationPricing called ===');
    console.log('Location:', location);
    
    const sql = `
        SELECT weekday_morning_price, flexible_weekday_price, any_day_flight_price, shared_flight_from_price, private_charter_from_price, flight_type
        FROM activity 
        WHERE location = ? AND status = 'Live'
        ORDER BY id ASC
        LIMIT 1
    `;
    con.query(sql, [location], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        if (!result || result.length === 0) {
            console.log('No pricing found for location:', location);
            return res.status(404).json({ success: false, message: "No pricing found for this location" });
        }
        
        const pricing = result[0];
        console.log('Raw pricing data:', pricing);
        
        // Process flight_type to map to experience names
        let flightTypes = [];
        let experiences = [];
        if (pricing.flight_type) {
            if (typeof pricing.flight_type === 'string') {
                flightTypes = pricing.flight_type.split(',').map(type => type.trim());
            } else if (Array.isArray(pricing.flight_type)) {
                flightTypes = pricing.flight_type;
            }
            
            // Map flight types to experience names
            experiences = flightTypes.map(type => {
                if (type === 'Private') return 'Private Charter';
                if (type === 'Shared') return 'Shared Flight';
                return type; // Keep original if not mapped
            });
        }
        
        console.log('Processed flight types:', flightTypes);
        console.log('Processed experiences:', experiences);
        console.log('=== /api/locationPricing response ===');
        
        res.json({ 
            success: true, 
            data: {
                weekday_morning_price: pricing.weekday_morning_price,
                flexible_weekday_price: pricing.flexible_weekday_price,
                any_day_flight_price: pricing.any_day_flight_price,
                shared_flight_from_price: pricing.shared_flight_from_price,
                private_charter_from_price: pricing.private_charter_from_price,
                flight_type: flightTypes,
                experiences: experiences
            }
        });
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
        a.flight_types || 'All',
        a.status,
        a.channels || 'All',
        a.voucher_types || 'All'
    ]);
    const sql = `
        INSERT INTO activity_availability
        (activity_id, schedule, date, day_of_week, time, capacity, available, flight_types, status, channels, voucher_types)
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
    
    console.log(`Fetching availabilities for activity ${id}`);
    
    // Single optimized query with JOINs - FIXED to use time_slot and SUM(pax)
const optimizedSql = `
        SELECT 
            aa.*,
            a.location,
            a.flight_type,
            COALESCE(booking_counts.total_booked, 0) as total_booked,
            CASE 
                WHEN COALESCE(booking_counts.total_booked, 0) >= aa.capacity THEN 'Closed'
                ELSE aa.status
            END as calculated_status,
            GREATEST(0, aa.capacity - COALESCE(booking_counts.total_booked, 0)) as calculated_available
        FROM activity_availability aa 
        JOIN activity a ON aa.activity_id = a.id 
        LEFT JOIN (
            SELECT 
                DATE(ab.flight_date) as flight_date,
                TIME_FORMAT(TIME(COALESCE(ab.time_slot, ab.flight_date)), '%H:%i') as flight_time_min,
                ab.location as location,
                COALESCE(SUM(ab.pax), 0) as total_booked
            FROM all_booking ab 
            WHERE DATE(ab.flight_date) >= CURDATE() - INTERVAL 30 DAY
            GROUP BY DATE(ab.flight_date), TIME_FORMAT(TIME(COALESCE(ab.time_slot, ab.flight_date)), '%H:%i'), ab.location
        ) as booking_counts 
            ON DATE(aa.date) = booking_counts.flight_date 
            AND TIME_FORMAT(TIME(aa.time), '%H:%i') = booking_counts.flight_time_min
            AND a.location = booking_counts.location
        WHERE aa.activity_id = ? 
        ORDER BY aa.date, aa.time
`;
    
    con.query(optimizedSql, [id], (err, result) => {
        if (err) {
            console.error('Error fetching availabilities:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }
        
        console.log(`Found ${result.length} availabilities for activity ${id}`);
        
        // Log some sample results for debugging
        if (result.length > 0) {
            console.log('Sample availability records:');
            result.slice(0, 3).forEach((row, index) => {
                console.log(`  ${index + 1}. ID: ${row.id}, Date: ${row.date}, Time: ${row.time}, Available: ${row.available}, Status: ${row.status}, Total Booked: ${row.total_booked}`);
            });
        }
        
        // Process results and update database if needed
        const processedResult = result.map(row => {
            // IMPORTANT: Only calculate availability for this specific time slot, not for the entire date
            // The booking count should be specific to this date+time combination, not just the date
            const needsUpdate = row.calculated_status !== row.status || row.calculated_available !== row.available;
            
            // Update database if needed (non-blocking) - but only for this specific record
            if (needsUpdate) {
                console.log(`Updating availability ${row.id}: date=${row.date}, time=${row.time}, status=${row.calculated_status}, available=${row.calculated_available}`);
                const updateSql = 'UPDATE activity_availability SET status = ?, available = ? WHERE id = ?';
                con.query(updateSql, [row.calculated_status, row.calculated_available, row.id], (updateErr) => {
                    if (updateErr) {
                        console.error('Error updating availability:', updateErr);
                    } else {
                        console.log(`Updated availability ${row.id}: status=${row.calculated_status}, available=${row.calculated_available}`);
                    }
                });
            }
            
            return {
                ...row,
                date: row.date ? dayjs(row.date).format('YYYY-MM-DD') : row.date,
                total_booked: row.total_booked || 0,
                available: row.calculated_available,
                status: row.calculated_status
            };
        });
        
        console.log(`Processed ${processedResult.length} availabilities`);
        res.json({ success: true, data: processedResult });
    });
});

// Get availabilities filtered by location, flight type, and voucher types
app.get('/api/availabilities/filter', (req, res) => {
    const { location, flightType, voucherTypes, date, time, activityId } = req.query;
    
    if (!location && !activityId) {
        return res.status(400).json({ success: false, message: 'Location or activityId is required' });
    }
    
    // Debug: Log what flight types exist in the database for this filter
    const debugSql = `
        SELECT DISTINCT aa.flight_types, aa.voucher_types, COUNT(*) as count
        FROM activity_availability aa 
        JOIN activity a ON aa.activity_id = a.id 
        WHERE ${activityId ? 'aa.activity_id = ?' : 'a.location = ?'} AND a.status = 'Live' AND aa.status = 'open'
        GROUP BY aa.flight_types, aa.voucher_types
    `;
    
    con.query(debugSql, [activityId || location], (debugErr, debugResult) => {
        if (!debugErr) {
            console.log('Available flight_types and voucher_types in database for', activityId ? `activity ${activityId}` : location, ':', debugResult);
        }
    });
    
    // Additional debug: Check what's actually in the database
    const debugSql2 = `
        SELECT aa.id, aa.date, aa.time, aa.status, aa.available, aa.capacity, a.location, a.status as activity_status
        FROM activity_availability aa 
        JOIN activity a ON aa.activity_id = a.id 
        WHERE ${activityId ? 'aa.activity_id = ?' : 'a.location = ?'}
        ORDER BY aa.date, aa.time
        LIMIT 10
    `;
    
    con.query(debugSql2, [activityId || location], (debugErr2, debugResult2) => {
        if (!debugErr2) {
            console.log('Raw database data for', activityId ? `activity ${activityId}` : location, ':', debugResult2);
        }
    });
    
    let sql = `
        SELECT aa.*, a.location, a.flight_type, a.voucher_type as activity_voucher_types
        FROM activity_availability aa 
        JOIN activity a ON aa.activity_id = a.id 
        WHERE ${activityId ? 'aa.activity_id = ?' : 'a.location = ?'} AND a.status = 'Live'
    `;
    
    const params = [activityId || location];
    
    if (flightType && flightType !== 'All') {
        sql += ` AND (aa.flight_types = 'All' OR aa.flight_types = ? OR FIND_IN_SET(?, aa.flight_types) > 0)`;
        params.push(flightType, flightType);
    } else {
        // If no flight type specified, show all flight types
        sql += ` AND (aa.flight_types = 'All' OR aa.flight_types IS NOT NULL)`;
    }
    
    if (voucherTypes && voucherTypes !== 'All') {
        sql += ` AND (aa.voucher_types = 'All' OR aa.voucher_types = ? OR FIND_IN_SET(?, aa.voucher_types) > 0)`;
        params.push(voucherTypes, voucherTypes);
    } else {
        // If no voucher type specified, show all voucher types
        sql += ` AND (aa.voucher_types = 'All' OR aa.voucher_types IS NOT NULL)`;
    }
    
    if (date) {
        sql += ` AND aa.date = ?`;
        params.push(date);
    }
    
    if (time) {
        sql += ` AND aa.time = ?`;
        params.push(time);
    }
    
    sql += ` ORDER BY aa.date, aa.time`;
    
    con.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error fetching filtered availabilities:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        // Normalize date format to YYYY-MM-DD using local timezone to prevent 1-day offset
        const normalizedResult = result.map(row => {
            if (!row.date) return row;
            
            // Parse the date and create a new date in local timezone
            const dateObj = new Date(row.date);
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            const localDateString = `${year}-${month}-${day}`;
            
            // Calculate held seats for this slot
            const holdKey = `${row.activity_id}_${localDateString}_${row.time}`;
            let heldSeats = 0;
            const now = Date.now();
            
            for (const [key, hold] of availabilityHolds.entries()) {
                if (key.startsWith(holdKey) && now <= hold.expiresAt) {
                    heldSeats += hold.seats;
                }
            }
            
            return {
                ...row,
                date: localDateString,
                available: Math.max(0, row.available - heldSeats),
                actualAvailable: row.available,
                heldSeats: heldSeats
            };
        });
        
        console.log('Filtered availabilities response:', { 
            location, 
            activityId,
            flightType, 
            voucherTypes, 
            count: normalizedResult.length,
            sql: sql,
            params: params,
            sampleData: normalizedResult.slice(0, 3).map(r => ({ 
                id: r.id, 
                date: r.date, 
                status: r.status,
                available: r.available,
                actualAvailable: r.actualAvailable,
                heldSeats: r.heldSeats,
                capacity: r.capacity,
                flight_types: r.flight_types, 
                voucher_types: r.voucher_types
            }))
        });
        
        return res.json({ success: true, data: normalizedResult || [] });
    });
});

// Get all activities (id, activity_name, status)
app.get('/api/activities', (req, res) => {
    const sql = 'SELECT id, activity_name, status, capacity, location FROM activity ORDER BY activity_name';
    con.query(sql, (err, result) => {
        if (err) {
            console.error('Database error in /api/activities:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }
        
        // Ensure result is always an array
        const activities = Array.isArray(result) ? result : [];
        
        console.log('Activities endpoint called, returning:', activities.length, 'activities');
        
        res.json({ 
            success: true, 
            data: activities,
            count: activities.length,
            timestamp: new Date().toISOString()
        });
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

// Auto-update availability status based on available count
app.post('/api/updateAvailabilityStatus', (req, res) => {
    const sql = `
        UPDATE activity_availability 
        SET status = CASE 
            WHEN available = 0 THEN 'Closed'
            WHEN available > 0 THEN 'Open'
            ELSE status
        END
        WHERE available = 0 OR available > 0
    `;
    
    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error auto-updating availability status:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }
        
        res.json({ 
            success: true, 
            message: 'Availability statuses updated automatically',
            affectedRows: result.affectedRows
        });
    });
});

// Auto-update availability status for a specific activity based on booking count
app.post('/api/activity/:id/updateAvailabilityStatus', (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Missing activity ID' });
    
    const sql = `
        UPDATE activity_availability aa
        JOIN (
            SELECT 
                DATE(ab.flight_date) as flight_date,
                ab.location,
                TIME(ab.time_slot) as time_slot,
                COUNT(ab.id) as total_booked
            FROM all_booking ab
            WHERE ab.activity_id = ?
            GROUP BY DATE(ab.flight_date), ab.location, TIME(ab.time_slot)
        ) as booking_counts ON 
            DATE(aa.date) = booking_counts.flight_date AND
            TIME(aa.time) = booking_counts.time_slot AND
            EXISTS (
                SELECT 1 FROM activity a 
                WHERE a.id = aa.activity_id 
                AND a.location = booking_counts.location
            )
        SET 
            aa.status = CASE 
                WHEN booking_counts.total_booked >= aa.capacity THEN 'Closed'
                ELSE 'Open'
            END,
            aa.available = GREATEST(0, aa.capacity - booking_counts.total_booked)
        WHERE aa.activity_id = ?
    `;
    
    console.log(`Updating availability status for activity ${id}`);
    
    con.query(sql, [id, id], (err, result) => {
        if (err) {
            console.error('Error updating availability status for activity:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }
        
        console.log(`Updated ${result.affectedRows} availability statuses for activity ${id}`);
        res.json({ 
            success: true, 
            message: `Updated ${result.affectedRows} availability statuses for activity ${id}`,
            affectedRows: result.affectedRows
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

// Get activity availabilities for rebooking (only open ones)
app.get('/api/activity/:id/rebook-availabilities', (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Eksik bilgi!' });
    // Sadece status = 'Open' olanları al
    const sql = 'SELECT id, date, time, available, capacity FROM activity_availability WHERE activity_id = ? AND status = "Open" ORDER BY date, time';
    con.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err });
        res.json({ success: true, data: result });
    });
});

// Add Date Request (POST)
app.post('/api/date-request', (req, res) => {
    const { name, phone, email, location, flight_type, requested_date } = req.body;
    console.log('POST /api/date-request called with:', { name, phone, email, location, flight_type, requested_date });
    
    if (!name || !email || !location || !flight_type || !requested_date) {
        console.log('Missing required fields');
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const sql = 'INSERT INTO date_request (name, phone, email, location, flight_type, requested_date) VALUES (?, ?, ?, ?, ?, ?)';
    con.query(sql, [name, phone, email, location, flight_type, requested_date], (err, result) => {
        if (err) {
            console.error('Error inserting date request:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        console.log('✅ Date request inserted successfully with ID:', result.insertId);
        res.json({ success: true, id: result.insertId });
    });
});

// List Date Requests (GET)
app.get('/api/date-requests', (req, res) => {
    const sql = 'SELECT * FROM date_request ORDER BY created_at DESC';
    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching date requests:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        console.log('GET /api/date-requests returned', result ? result.length : 0, 'records');
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
            con.query('SELECT *, booking_references FROM all_vouchers WHERE ' + (voucher_ref ? 'voucher_ref = ?' : 'id = ?'), [voucher_ref || id], (err, rows) => {
                if (err) reject(err);
                else resolve([rows]);
            });
        });
        if (!voucherRows || voucherRows.length === 0) {
            // If not found, return minimal object with provided id or voucher_ref
            return res.status(200).json({ success: true, voucher: { id, voucher_ref }, booking: null, passengers: [], notes: [] });
        }
        const voucher = voucherRows[0];
        
        // Parse booking_references JSON if it exists
        if (voucher.booking_references) {
            try {
                voucher.booking_references = JSON.parse(voucher.booking_references);
            } catch (e) {
                console.warn('Failed to parse booking_references for voucher:', voucher.id, e);
                voucher.booking_references = [];
            }
        } else {
            voucher.booking_references = [];
        }
        
        // Parse voucher_passenger_details JSON if it exists
        if (voucher.voucher_passenger_details) {
            try {
                voucher.passenger_details = typeof voucher.voucher_passenger_details === 'string' 
                    ? JSON.parse(voucher.voucher_passenger_details) 
                    : voucher.voucher_passenger_details;
            } catch (e) {
                console.warn('Failed to parse voucher_passenger_details for voucher:', voucher.id, e);
                voucher.passenger_details = [];
            }
        } else {
            voucher.passenger_details = [];
        }
        
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
        
        // Get voucher-specific notes
        let voucherNotes = [];
        const [voucherNotesRows] = await new Promise((resolve, reject) => {
            con.query('SELECT * FROM voucher_notes WHERE voucher_id = ? ORDER BY date DESC', [voucher.id], (err, rows) => {
                if (err) reject(err);
                else resolve([rows]);
            });
        });
        voucherNotes = voucherNotesRows;
        
        // Combine booking notes and voucher notes
        const allNotes = [...notes, ...voucherNotes.map(vn => ({ ...vn, source: 'voucher', notes: vn.note }))];
        
        res.json({
            success: true,
            voucher,
            booking,
            passengers,
            notes: allNotes,
            voucherNotes
        });
    } catch (err) {
        console.error('Error fetching voucher detail:', err);
        res.status(500).json({ success: false, message: 'Database error', error: err.message });
    }
});

app.post("/api/getActivityId", (req, res) => {
    const { location } = req.body;
    console.log('=== /api/getActivityId called ===');
    console.log('Location:', location);
    
    if (!location) {
        return res.status(400).json({ success: false, message: "Eksik bilgi!" });
    }
    const sql = 'SELECT * FROM activity WHERE location = ? AND status = "Live"';
    con.query(sql, [location], (err, activities) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        if (!activities || activities.length === 0) {
            console.log('No activities found for location:', location);
            return res.status(404).json({ success: false, message: "No activities found" });
        }
        const activity = activities[0];
        console.log('Activity found - ID:', activity.id, 'Location:', activity.location);
        
        // Şimdi availability'leri çek
        const availSql = 'SELECT id, DATE_FORMAT(date, "%Y-%m-%d") as date, time, capacity, available, status FROM activity_availability WHERE activity_id = ? AND status = "Open" AND date >= CURDATE() ORDER BY date, time';
        con.query(availSql, [activity.id], (err2, availabilities) => {
            if (err2) return res.status(500).json({ success: false, message: "Database error (availability)" });
            // date alanını DD/MM/YYYY formatına çevir
            const formattedAvail = availabilities.map(a => ({
                ...a,
                date: moment(a.date, "YYYY-MM-DD").format("YYYY-MM-DD")
            }));
            console.log('Returning activity ID:', activity.id, 'with', formattedAvail.length, 'availabilities');
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
    
    // Add field validation for security
    const allowedFields = ['name', 'email', 'mobile', 'phone', 'paid', 'weight', 'expires', 'flight_type', 'voucher_type', 'status', 'flight_attempts'];
    
    if (!voucher_id || !field) {
        return res.status(400).json({ success: false, message: "Missing voucher_id or field" });
    }
    
    if (!allowedFields.includes(field)) {
        return res.status(400).json({ success: false, message: "Field not allowed" });
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

// ===== VOUCHER NOTES ENDPOINTS =====

// Add Voucher Note
app.post("/api/addVoucherNote", (req, res) => {
    const { date, note, voucher_id } = req.body;
    
    if (!date || !note || !voucher_id) {
        return res.status(400).json({ success: false, message: "Missing date, note, or voucher_id" });
    }
    
    console.log('Adding voucher note for voucher_id:', voucher_id, 'note:', note);
    
    // Check if voucher_id is in format "voucher_XXXXXX" (new format) or numeric (old format)
    if (voucher_id.toString().startsWith('voucher_')) {
        // Extract voucher_ref from the ID format "voucher_FAT25WOS" -> "FAT25WOS"
        const voucher_ref = voucher_id.replace('voucher_', '');
        console.log('Using voucher_ref based storage for voucher_ref:', voucher_ref);
        
        // Use a separate table or storage mechanism for voucher_ref based notes
        const sql = "INSERT INTO voucher_ref_notes (date, note, voucher_ref) VALUES (?, ?, ?)";
        con.query(sql, [date, note, voucher_ref], (err, result) => {
            if (err) {
                // If table doesn't exist, create it
                if (err.code === 'ER_NO_SUCH_TABLE') {
                    console.log('Creating voucher_ref_notes table...');
                    const createTableSql = `
                        CREATE TABLE IF NOT EXISTS voucher_ref_notes (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            voucher_ref VARCHAR(50) NOT NULL,
                            note TEXT NOT NULL,
                            date DATETIME NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                            INDEX idx_voucher_ref (voucher_ref),
                            INDEX idx_date (date)
                        )
                    `;
                    con.query(createTableSql, (createErr, createResult) => {
                        if (createErr) {
                            console.error("Error creating voucher_ref_notes table:", createErr);
                            return res.status(500).json({ success: false, message: "Database error creating table" });
                        }
                        // Retry the insert
                        con.query(sql, [date, note, voucher_ref], (retryErr, retryResult) => {
                            if (retryErr) {
                                console.error("Error adding voucher note after table creation:", retryErr);
                                return res.status(500).json({ success: false, message: "Database error" });
                            }
                            res.json({ success: true, id: retryResult.insertId });
                        });
                    });
                } else {
                    console.error("Error adding voucher note:", err);
                    return res.status(500).json({ success: false, message: "Database error" });
                }
            } else {
                res.json({ success: true, id: result.insertId });
            }
        });
    } else {
        // Original numeric voucher_id format
        const sql = "INSERT INTO voucher_notes (date, note, voucher_id) VALUES (?, ?, ?)";
        con.query(sql, [date, note, voucher_id], (err, result) => {
            if (err) {
                console.error("Error adding voucher note:", err);
                return res.status(500).json({ success: false, message: "Database error" });
            }
            res.json({ success: true, id: result.insertId });
        });
    }
});

// Update Voucher Note
app.patch("/api/updateVoucherNote", (req, res) => {
    const { id, note } = req.body;
    
    if (!id || !note) {
        return res.status(400).json({ success: false, message: "Missing id or note" });
    }
    
    const sql = "UPDATE voucher_notes SET note = ? WHERE id = ?";
    con.query(sql, [note, id], (err, result) => {
        if (err) {
            console.error("Error updating voucher note:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        res.json({ success: true });
    });
});

// Update Voucher Ref Note (for voucher_ref_notes table)
app.patch("/api/updateVoucherRefNote", (req, res) => {
    const { id, note, voucher_ref } = req.body;
    
    if (!id || !note) {
        return res.status(400).json({ success: false, message: "Missing id or note" });
    }
    
    console.log('Updating voucher ref note:', { id, note, voucher_ref });
    
    const sql = "UPDATE voucher_ref_notes SET note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
    con.query(sql, [note, id], (err, result) => {
        if (err) {
            console.error("Error updating voucher ref note:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Note not found" });
        }
        
        console.log('Successfully updated voucher ref note:', result);
        res.json({ success: true });
    });
});

// Delete Voucher Note
app.delete("/api/deleteVoucherNote", (req, res) => {
    const { id } = req.body;
    
    if (!id) {
        return res.status(400).json({ success: false, message: "Missing id" });
    }
    
    const sql = "DELETE FROM voucher_notes WHERE id = ?";
    con.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Error deleting voucher note:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        res.json({ success: true });
    });
});

// Delete Voucher Ref Note (for voucher_ref_notes table)
app.delete("/api/deleteVoucherRefNote", (req, res) => {
    const { id, voucher_ref } = req.body;
    
    if (!id) {
        return res.status(400).json({ success: false, message: "Missing id" });
    }
    
    console.log('Deleting voucher ref note:', { id, voucher_ref });
    
    const sql = "DELETE FROM voucher_ref_notes WHERE id = ?";
    con.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Error deleting voucher ref note:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Note not found" });
        }
        
        console.log('Successfully deleted voucher ref note:', result);
        res.json({ success: true });
    });
});

// Get Voucher Notes
app.get("/api/getVoucherNotes", (req, res) => {
    const { voucher_id } = req.query;
    
    if (!voucher_id) {
        return res.status(400).json({ success: false, message: "Missing voucher_id" });
    }
    
    console.log('Getting voucher notes for voucher_id:', voucher_id);
    
    // Check if voucher_id is in format "voucher_XXXXXX" (new format) or numeric (old format)
    if (voucher_id.toString().startsWith('voucher_')) {
        // Extract voucher_ref from the ID format "voucher_FAT25WOS" -> "FAT25WOS"
        const voucher_ref = voucher_id.replace('voucher_', '');
        console.log('Getting notes from voucher_ref_notes for voucher_ref:', voucher_ref);
        
        const sql = "SELECT * FROM voucher_ref_notes WHERE voucher_ref = ? ORDER BY date DESC";
        con.query(sql, [voucher_ref], (err, result) => {
            if (err) {
                console.error("Error getting voucher ref notes:", err);
                return res.status(500).json({ success: false, message: "Database error" });
            }
            console.log('Found', result.length, 'notes for voucher_ref:', voucher_ref);
            res.json({ success: true, notes: result });
        });
    } else {
        // Original numeric voucher_id format
        const sql = "SELECT * FROM voucher_notes WHERE voucher_id = ? ORDER BY date DESC";
        con.query(sql, [voucher_id], (err, result) => {
            if (err) {
                console.error("Error getting voucher notes:", err);
                return res.status(500).json({ success: false, message: "Database error" });
            }
            res.json({ success: true, notes: result });
        });
    }
});

// Debug endpoint to check all vouchers
app.get("/api/debugVouchers", (req, res) => {
    const sql = "SELECT id, voucher_ref, name FROM all_vouchers ORDER BY id DESC LIMIT 10";
    con.query(sql, (err, result) => {
        if (err) {
            console.error("Error in debug query:", err);
            return res.status(500).json({ success: false, error: err.message });
        }
        console.log("Debug vouchers query result:", result);
        res.json({ success: true, vouchers: result });
    });
});

// Test endpoint to add Gift Voucher for testing
app.post("/api/addTestGiftVoucher", (req, res) => {
    console.log('Adding test Gift Voucher...');
    
    const insertSql = `INSERT INTO all_vouchers (
        name, weight, experience_type, book_flight, voucher_type, email, phone, mobile, 
        expires, redeemed, paid, offer_code, voucher_ref, created_at, recipient_name, 
        recipient_email, recipient_phone, recipient_gift_date, preferred_location, 
        preferred_time, preferred_day, flight_attempts, status, purchaser_name, 
        purchaser_email, purchaser_phone, purchaser_mobile, add_to_booking_items
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const values = [
        'Gift Voucher - Book Flight',                    // name
        '75kg',                                         // weight  
        'Shared Flight',                                // experience_type
        'Gift Voucher',                                 // book_flight
        'Any Day Flight',                              // voucher_type
        'gift@example.com',                            // email
        '01234567890',                                 // phone
        '01234567890',                                 // mobile
        '31/12/2025',                                  // expires
        'No',                                          // redeemed
        '199.99',                                      // paid
        'GIFT2025',                                    // offer_code
        'GIFT25001',                                   // voucher_ref
        new Date().toISOString().slice(0, 19).replace('T', ' '), // created_at
        'John Doe',                                    // recipient_name
        'recipient@example.com',                       // recipient_email
        '09876543210',                                 // recipient_phone
        '2025-12-25',                                  // recipient_gift_date
        'Bash',                                        // preferred_location
        'Morning',                                     // preferred_time
        'Weekend',                                     // preferred_day
        0,                                             // flight_attempts
        'Active',                                      // status
        // Purchaser information (same as main contact for test data)
        'Gift Voucher - Book Flight',                    // purchaser_name
        'gift@example.com',                            // purchaser_email
        '01234567890',                                 // purchaser_phone
        '01234567890',                                 // purchaser_mobile
        null                                           // add_to_booking_items (test data)
    ];
    
    con.query(insertSql, values, (err, result) => {
        if (err) {
            console.error("Error inserting test gift voucher:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        
        console.log('✅ Test Gift Voucher added with ID:', result.insertId);
        res.json({ 
            success: true, 
            message: "Test Gift Voucher added successfully",
            id: result.insertId,
            voucher_ref: 'GIFT25001'
        });
    });
});

// Find Voucher by Voucher Ref
app.get("/api/findVoucherByRef", (req, res) => {
    const { voucher_ref } = req.query;
    
    if (!voucher_ref) {
        return res.status(400).json({ success: false, message: "Missing voucher_ref" });
    }
    
    console.log('Searching for voucher with voucher_ref:', voucher_ref);
    
    // First try all_vouchers table
    const voucherSql = "SELECT * FROM all_vouchers WHERE voucher_ref = ? LIMIT 1";
    con.query(voucherSql, [voucher_ref], (err, voucherResult) => {
        if (err) {
            console.error("Error searching all_vouchers table:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        
        console.log('Query result from all_vouchers:', voucherResult);
        
        if (voucherResult && voucherResult.length > 0) {
            console.log('Found voucher in all_vouchers table:', voucherResult[0]);
            return res.json({ success: true, voucher: voucherResult[0], source: 'all_vouchers' });
        }
        
        // If not found in all_vouchers, try all_booking table (for Book Flight vouchers)
        console.log('Voucher not found in all_vouchers, searching all_booking table...');
        const bookingSql = "SELECT id, voucher_code as voucher_ref, name, email, phone as mobile, paid, created_at FROM all_booking WHERE voucher_code = ?";
        con.query(bookingSql, [voucher_ref], (err, bookingResult) => {
            if (err) {
                console.error("Error searching all_booking table:", err);
                return res.status(500).json({ success: false, message: "Database error" });
            }
            
            if (bookingResult && bookingResult.length > 0) {
                console.log('Found voucher in all_booking table:', bookingResult[0]);
                // For booking-based vouchers, we'll use a special ID format
                const bookingVoucher = {
                    ...bookingResult[0],
                    id: `booking_${bookingResult[0].id}`, // Special ID format to distinguish from voucher IDs
                    source: 'all_booking'
                };
                return res.json({ success: true, voucher: bookingVoucher, source: 'all_booking' });
            }
            
            console.log('Voucher not found in either table');
            return res.json({ success: false, message: "Voucher not found in all_vouchers or all_booking tables" });
        });
    });
});

// Update Manifest Status and Availability
app.patch("/api/updateManifestStatus", async (req, res) => {
    const { booking_id, new_status, old_status, flight_date, location, total_pax } = req.body;
    
    // Debug: API çağrısını logla
    console.log('updateManifestStatus API çağrısı:', { booking_id, new_status, old_status, flight_date, location, total_pax });
    
    if (!booking_id || !new_status || !old_status || !flight_date || !location) {
        console.log('updateManifestStatus - Eksik alanlar:', { booking_id, new_status, old_status, flight_date, location });
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
        // 1. Update booking status
        const updateBookingSql = "UPDATE all_booking SET status = ? WHERE id = ?";
        // Only increment flight_attempts when a voucher is redeemed and booking is cancelled
        const incrementAttemptsForVoucher = async () => {
            try {
                // Find voucher_code from booking
                const [rows] = await new Promise((resolve, reject) => {
                    con.query("SELECT voucher_code FROM all_booking WHERE id = ?", [booking_id], (err, rows) => {
                        if (err) reject(err); else resolve([rows]);
                    });
                });
                const voucherCode = rows && rows[0] ? rows[0].voucher_code : null;
                if (!voucherCode) return;
                
                // Only increment attempts if:
                // 1. Status is being changed to 'Cancelled'
                // 2. The voucher was redeemed (not just purchased)
                // 3. This is a voucher-based booking
                const shouldIncrement = new_status === 'Cancelled' && voucherCode;
                if (!shouldIncrement) return;
                
                // Get current attempts and increment
                const [voucherRows] = await new Promise((resolve, reject) => {
                    con.query("SELECT flight_attempts, booking_references FROM all_vouchers WHERE voucher_code = ?", [voucherCode], (err, rows) => {
                        if (err) reject(err); else resolve([rows]);
                    });
                });
                
                if (voucherRows && voucherRows.length > 0) {
                    const currentAttempts = parseInt(voucherRows[0].flight_attempts || 0, 10);
                    const newAttempts = currentAttempts + 1;
                    
                    // Update booking_references to link this attempt to the specific booking
                    let bookingRefs = [];
                    try {
                        bookingRefs = voucherRows[0].booking_references ? JSON.parse(voucherRows[0].booking_references) : [];
                    } catch (e) {
                        console.warn('Failed to parse booking_references:', e);
                    }
                    
                    // Add this booking to the references
                    bookingRefs.push({
                        booking_id: booking_id,
                        cancelled_at: new Date().toISOString(),
                        attempt_number: newAttempts
                    });
                    
                    await new Promise((resolve, reject) => {
                        con.query("UPDATE all_vouchers SET flight_attempts = ?, booking_references = ? WHERE voucher_code = ?", 
                            [newAttempts, JSON.stringify(bookingRefs), voucherCode], (err, result) => {
                            if (err) reject(err); else resolve(result);
                        });
                    });
                    
                    console.log(`Incremented flight_attempts for voucher ${voucherCode} to ${newAttempts} due to booking ${booking_id} cancellation`);
                }
            } catch (e) {
                console.error('Failed to increment flight_attempts for voucher:', e);
            }
        };

        await new Promise((resolve, reject) => {
            con.query(updateBookingSql, [new_status, booking_id], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        // Also increment attempts if necessary (fire-and-forget)
        incrementAttemptsForVoucher();

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

// Function to auto-update availability status (only for maintenance, not for specific bookings)
const updateAvailabilityStatus = async () => {
    try {
        // This function is now only used for maintenance purposes
        // Specific availability updates are handled by updateSpecificAvailability function
        console.log('updateAvailabilityStatus called - this function is deprecated for booking operations');
        
        // Only update status for records that need it, but don't change availability numbers
        const sql = `
            UPDATE activity_availability 
            SET status = CASE 
                WHEN available = 0 THEN 'Closed'
                WHEN available > 0 THEN 'Open'
                ELSE status
            END
            WHERE (available = 0 OR available > 0) AND (status IS NULL OR status = '')
        `;
        
        con.query(sql, (err, result) => {
            if (err) {
                console.error('Error auto-updating availability status:', err);
            } else {
                console.log(`Auto-updated ${result.affectedRows} availability statuses (maintenance only)`);
            }
        });
    } catch (error) {
        console.error('Error in updateAvailabilityStatus:', error);
    }
};


// Function to check and fix duplicate availability records
const checkAndFixDuplicateAvailability = async () => {
    try {
        console.log('=== CHECKING FOR DUPLICATE AVAILABILITY RECORDS ===');
        
        // Find duplicate records
        const duplicateSql = `
            SELECT date, time, activity_id, COUNT(*) as count
            FROM activity_availability 
            GROUP BY date, time, activity_id 
            HAVING COUNT(*) > 1
        `;
        
        con.query(duplicateSql, (err, duplicates) => {
            if (err) {
                console.error('Error checking for duplicates:', err);
                return;
            }
            
            if (duplicates.length === 0) {
                console.log('No duplicate availability records found');
                return;
            }
            
            console.log(`Found ${duplicates.length} duplicate combinations:`);
            duplicates.forEach((dup, index) => {
                console.log(`  ${index + 1}. date=${dup.date}, time=${dup.time}, activity_id=${dup.activity_id}, count=${dup.count}`);
            });
            
            // For each duplicate, keep only one record and delete the others
            // Use a simpler approach to avoid deadlocks
            duplicates.forEach((dup, index) => {
                // First, get the ID of the record to keep
                const getKeepIdSql = `SELECT id FROM activity_availability WHERE date = ? AND time = ? AND activity_id = ? ORDER BY id ASC LIMIT 1`;
                
                con.query(getKeepIdSql, [dup.date, dup.time, dup.activity_id], (getErr, getResult) => {
                    if (getErr) {
                        console.error(`Error getting keep ID for ${dup.date} ${dup.time} activity_id=${dup.activity_id}:`, getErr);
                        return;
                    }
                    
                    if (getResult.length === 0) {
                        console.error(`No records found for ${dup.date} ${dup.time} activity_id=${dup.activity_id}`);
                        return;
                    }
                    
                    const keepId = getResult[0].id;
                    console.log(`Keeping record ID ${keepId} for ${dup.date} ${dup.time} activity_id=${dup.activity_id}`);
                    
                    // Delete all other records for this date/time/activity combination
                    const deleteDuplicatesSql = `DELETE FROM activity_availability WHERE date = ? AND time = ? AND activity_id = ? AND id != ?`;
                    
                    con.query(deleteDuplicatesSql, [dup.date, dup.time, dup.activity_id, keepId], (deleteErr, deleteResult) => {
                        if (deleteErr) {
                            console.error(`Error removing duplicates for ${dup.date} ${dup.time} activity_id=${dup.activity_id}:`, deleteErr);
                        } else {
                            console.log(`Removed ${deleteResult.affectedRows} duplicate records for ${dup.date} ${dup.time} activity_id=${dup.activity_id}`);
                        }
                    });
                });
            });
        });
        
        console.log('=== DUPLICATE CHECK COMPLETE ===');
    } catch (error) {
        console.error('Error in checkAndFixDuplicateAvailability:', error);
    }
};

// Serve React frontend from client/build (exclude /api routes)
app.use(express.static(path.join(__dirname, '../client/build')));

// Serve index.html for non-API routes (supports client-side routing)
app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Start the server
const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    
    // Run database migrations on server start
    runDatabaseMigrations();
    
    // Check and fix duplicate availability records
    checkAndFixDuplicateAvailability();
    
    // Run initial availability status update (maintenance only)
    updateAvailabilityStatus();
    
    // Set up periodic updates every 5 minutes (maintenance only)
    setInterval(updateAvailabilityStatus, 5 * 60 * 1000);
});
// Delete a booking by ID (with cascade delete for passengers)
app.delete('/api/deleteBooking/:id', (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Missing booking id' });
    
    // First get the booking details to know which time slot to restore
    const getBookingSql = 'SELECT activity_id, flight_date FROM all_booking WHERE id = ?';
    con.query(getBookingSql, [id], (err, bookingResult) => {
        if (err) {
            console.error('Error getting booking details:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (bookingResult.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        
        const booking = bookingResult[0];
        
        // Parse the flight_date to extract date and time
        let bookingDate = null;
        let bookingTime = null;
        
        if (booking.flight_date) {
            if (typeof booking.flight_date === 'string' && booking.flight_date.includes(' ')) {
                const parts = booking.flight_date.split(' ');
                bookingDate = parts[0];
                bookingTime = parts[1];
            } else if (typeof booking.flight_date === 'string') {
                bookingDate = booking.flight_date;
                bookingTime = null;
            }
        }
        
        // Delete the booking (passengers will be deleted automatically due to ON DELETE CASCADE)
        const deleteSql = 'DELETE FROM all_booking WHERE id = ?';
        con.query(deleteSql, [id], (err, deleteResult) => {
            if (err) {
                console.error('Error deleting booking:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            if (deleteResult.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Booking not found' });
            }
            
            // Restore availability for the specific time slot if we have date and time
            if (bookingDate && bookingTime && booking.activity_id) {
                const restoreAvailabilitySql = `
                    UPDATE activity_availability 
                    SET available_seats = available_seats + 1 
                    WHERE activity_id = ? AND date = ? AND time = ?
                `;
                
                con.query(restoreAvailabilitySql, [booking.activity_id, bookingDate, bookingTime], (restoreErr) => {
                    if (restoreErr) {
                        console.error('Error restoring availability:', restoreErr);
                        // Don't fail the delete operation if availability restoration fails
                        console.warn('Availability restoration failed, but booking was deleted');
                    } else {
                        console.log('Availability restored for activity_id:', booking.activity_id, 'date:', bookingDate, 'time:', bookingTime);
                    }
                    
                    res.json({ success: true, message: 'Booking deleted successfully and availability restored' });
                });
            } else {
                console.log('No date/time information available for availability restoration');
                res.json({ success: true, message: 'Booking deleted successfully (availability restoration skipped)' });
            }
        });
    });
});

// Delete a date request by ID
app.delete('/api/date-requests/:id', (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
    // Table name is singular elsewhere (GET uses `date_request`). Keep consistent here.
    const sql = 'DELETE FROM date_request WHERE id = ?';
    con.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting date request:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        if (result && result.affectedRows > 0) {
            return res.json({ success: true, deleted: result.affectedRows });
        } else {
            // Not found or already deleted
            return res.status(404).json({ success: false, message: 'Date request not found' });
        }
    });
});

// Geçici Stripe session verisi için bellek içi bir store
const stripeSessionStore = {};

// Webhook için booking oluşturma fonksiyonu
async function createBookingFromWebhook(bookingData) {
    return new Promise((resolve, reject) => {
        function emptyToNull(val) {
            if (val === '' || val === undefined || val === null) {
                return null;
            }
            if (typeof val === 'object' && Object.keys(val).length === 0) {
                return null;
            }
            return val;
        }
        
        let {
            activitySelect,
            chooseLocation,
            chooseFlightType,
            chooseAddOn,
            choose_add_on,
            passengerData,
            additionalInfo,
            recipientDetails,
            selectedDate,
            selectedTime,
            totalPrice,
            voucher_code,
            flight_attempts,
            preferred_location,
            preferred_time,
            preferred_day
        } = bookingData;

        // Unify add-on field
        if (!choose_add_on && chooseAddOn) {
            choose_add_on = chooseAddOn;
        }
        if (!Array.isArray(choose_add_on)) {
            choose_add_on = [];
        } else {
            choose_add_on = choose_add_on.filter(a => a && a.name);
        }

        // Basic validation (relaxed to tolerate optional fields)
        // Previously required passengerData strictly; now handle empty/undefined gracefully
        if (!chooseLocation || !chooseFlightType || !chooseFlightType.type) {
            return reject(new Error('Missing required booking information (location/flight type).'));
        }

        const passengerName = `${passengerData[0].firstName} ${passengerData[0].lastName}`;
        const now = moment();
        let expiresDate = null;
        
        // DEBUG: Log passenger data
        console.log('=== CREATE BOOKING FROM WEBHOOK DEBUG ===');
        console.log('passengerData:', passengerData);
        console.log('passengerData.length:', Array.isArray(passengerData) ? passengerData.length : 0);
        console.log('selectedDate:', selectedDate);
        console.log('selectedTime:', selectedTime);
        console.log('chooseFlightType:', chooseFlightType);
        console.log('chooseLocation:', chooseLocation);
        
        // Determine actualVoucherType for expiry calculation
        let actualVoucherType = '';
        if (bookingData.voucher_type && typeof bookingData.voucher_type === 'string') {
            actualVoucherType = bookingData.voucher_type;
        } else if (bookingData.selectedVoucherType && bookingData.selectedVoucherType.title) {
            actualVoucherType = bookingData.selectedVoucherType.title;
        } else {
            actualVoucherType = 'Any Day Flight'; // Safe default
        }
        console.log('actualVoucherType for booking expiry:', actualVoucherType);

        function insertBookingAndPassengers(expiresDateFinal) {
            const nowDate = moment().format('YYYY-MM-DD HH:mm:ss');
            const mainPassenger = passengerData[0] || {};
            
            let bookingDateTime = selectedDate;
            if (selectedTime && selectedDate) {
                let datePart = selectedDate;
                if (typeof selectedDate === 'string' && selectedDate.includes(' ')) {
                    datePart = selectedDate.split(' ')[0];
                } else if (typeof selectedDate === 'string' && selectedDate.length > 10) {
                    datePart = selectedDate.substring(0, 10);
                }
                bookingDateTime = `${datePart} ${selectedTime}`;
            }

            let choose_add_on_str = '';
            if (Array.isArray(choose_add_on) && choose_add_on.length > 0) {
                choose_add_on_str = choose_add_on.map(a => a && a.name ? a.name : '').filter(Boolean).join(', ');
            }

            const bookingSql = `
                INSERT INTO all_booking (
                    name, flight_type, flight_date, pax, location, status, paid, due,
                    voucher_code, created_at, expires, manual_status_override, additional_notes, hear_about_us,
                    ballooning_reason, prefer, weight, email, phone, choose_add_on,
                    preferred_location, preferred_time, preferred_day, flight_attempts,
                    activity_id, time_slot, experience, voucher_type, voucher_discount, original_amount
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            // Use actual passenger count from passengerData array
            const actualPaxCount = (Array.isArray(passengerData) && passengerData.length > 0) ? passengerData.length : (parseInt(chooseFlightType.passengerCount) || 1);
            console.log('=== WEBHOOK PAX COUNT DEBUG ===');
            console.log('passengerData.length:', passengerData?.length);
            console.log('chooseFlightType.passengerCount:', chooseFlightType.passengerCount);
            console.log('actualPaxCount (FINAL):', actualPaxCount);
            
            const bookingValues = [
                passengerName,
                chooseFlightType.type,
                bookingDateTime,
                actualPaxCount, // Use actual passenger count with proper fallback
                chooseLocation,
                'Confirmed',
                totalPrice,
                0,
                voucher_code || null,
                nowDate,
                expiresDateFinal,
                0, // manual_status_override
                emptyToNull(additionalInfo?.notes),
                emptyToNull(additionalInfo?.hearAboutUs),
                emptyToNull(additionalInfo?.reason),
                emptyToNull(additionalInfo?.prefer),
                emptyToNull((passengerData && passengerData[0]) ? passengerData[0].weight : null),
                emptyToNull((passengerData && passengerData[0]) ? passengerData[0].email : null),
                emptyToNull((passengerData && passengerData[0]) ? passengerData[0].phone : null),
                emptyToNull(choose_add_on_str),
                emptyToNull(preferred_location),
                emptyToNull(preferred_time),
                emptyToNull(preferred_day),
                emptyToNull(flight_attempts) || 0, // flight_attempts
                emptyToNull(bookingData?.activity_id), // activity_id
                emptyToNull(selectedTime), // time_slot
                chooseFlightType.type, // experience
                // Persist the selected voucher type if provided from frontend
                emptyToNull(bookingData?.voucher_type || bookingData?.selectedVoucherType?.title || 'Any Day Flight'), // voucher_type
                0, // voucher_discount
                totalPrice // original_amount
            ];

            con.query(bookingSql, bookingValues, (err, result) => {
                if (err) {
                    console.error('Webhook booking insertion error:', err);
                    return reject(err);
                }
                
                const bookingId = result.insertId;
                console.log('Webhook booking created successfully, ID:', bookingId);
                
                // Update availability if date and time are provided
                if (selectedDate && selectedTime && bookingData.activity_id) {
                    const bookingDate = moment(selectedDate).format('YYYY-MM-DD');
                    const bookingTime = selectedTime;
                    // Use actual passenger count from passengerData array (real passenger count entered by user)
                    const actualPassengerCount = (Array.isArray(passengerData) && passengerData.length > 0) ? passengerData.length : (parseInt(chooseFlightType.passengerCount) || 1);
                    
                    console.log('=== WEBHOOK BOOKING AVAILABILITY UPDATE ===');
                    console.log('passengerData RECEIVED:', JSON.stringify(passengerData, null, 2));
                    console.log('passengerData type:', typeof passengerData);
                    console.log('passengerData is Array?', Array.isArray(passengerData));
                    console.log('passengerData length:', passengerData?.length);
                    console.log('chooseFlightType:', JSON.stringify(chooseFlightType, null, 2));
                    console.log('chooseFlightType.passengerCount:', chooseFlightType.passengerCount);
                    console.log('Date:', bookingDate, 'Time:', bookingTime, 'Activity ID:', bookingData.activity_id);
                    console.log('Actual Passenger Count (FINAL):', actualPassengerCount);
                    
                    updateSpecificAvailability(bookingDate, bookingTime, bookingData.activity_id, actualPassengerCount);
                } else if (selectedDate && selectedTime && chooseLocation) {
                    // Get activity_id first, then update availability
                    const bookingDate = moment(selectedDate).format('YYYY-MM-DD');
                    const bookingTime = selectedTime;
                    // Use actual passenger count from passengerData array (real passenger count entered by user)
                    const actualPassengerCount = (Array.isArray(passengerData) && passengerData.length > 0) ? passengerData.length : (parseInt(chooseFlightType.passengerCount) || 1);
                    
                    const activitySql = `SELECT id FROM activity WHERE location = ? AND status = 'Live' LIMIT 1`;
                    con.query(activitySql, [chooseLocation], (activityErr, activityResult) => {
                        if (activityErr) {
                            console.error('Error getting activity_id for webhook availability update:', activityErr);
                        } else if (activityResult.length > 0) {
                            const activityId = activityResult[0].id;
                            
                            console.log('=== WEBHOOK BOOKING AVAILABILITY UPDATE (alt sorgu) ===');
                            console.log('Date:', bookingDate, 'Time:', bookingTime, 'Activity ID:', activityId);
                            console.log('passengerData length:', passengerData?.length);
                            console.log('chooseFlightType.passengerCount:', chooseFlightType.passengerCount);
                            console.log('Actual Passenger Count (FINAL):', actualPassengerCount);
                            
                            updateSpecificAvailability(bookingDate, bookingTime, activityId, actualPassengerCount);
                        } else {
                            console.error('No activity found for location:', chooseLocation);
                        }
                    });
                }
                
                // Now create passenger records
                if (passengerData && passengerData.length > 0) {
            const passengerSql = 'INSERT INTO passenger (booking_id, first_name, last_name, weight, email, phone, ticket_type, weather_refund) VALUES ?';
                    const passengerValues = passengerData.map(p => [
                        bookingId,
                        p.firstName || '',
                        p.lastName || '',
                (p.weight === '' ? null : p.weight || null),
                (p.email === '' ? null : p.email || null),
                (p.phone === '' ? null : p.phone || null),
                        p.ticketType || chooseFlightType.type,
                        p.weatherRefund ? 1 : 0
                    ]);
                    
                    con.query(passengerSql, [passengerValues], (passengerErr, passengerResult) => {
                        if (passengerErr) {
                            console.error('Error creating passengers in webhook:', passengerErr);
                            // Don't reject here, just log the error
                            console.log('Booking created but passengers failed, continuing...');
                        } else {
                            console.log('Webhook passengers created successfully, count:', passengerResult.affectedRows);
                        }
                        
                        // Store additional information answers if available
                        if (additionalInfo && typeof additionalInfo === 'object') {
                            const additionalInfoAnswers = [];
                            
                            // Process additionalInfo object to extract question answers
                            Object.keys(additionalInfo).forEach(key => {
                                if (key.startsWith('question_') && additionalInfo[key]) {
                                    const questionId = key.replace('question_', '');
                                    additionalInfoAnswers.push([bookingId, questionId, additionalInfo[key]]);
                                }
                            });
                            
                            if (additionalInfoAnswers.length > 0) {
                                const additionalInfoSql = 'INSERT INTO additional_information_answers (booking_id, question_id, answer) VALUES ?';
                                con.query(additionalInfoSql, [additionalInfoAnswers], (additionalInfoErr) => {
                                    if (additionalInfoErr) {
                                        console.error('Error storing additional information answers:', additionalInfoErr);
                                    } else {
                                        console.log('Additional information answers stored successfully');
                                    }
                                });
                            }
                            
                            // Also update the JSON field in all_booking for backward compatibility
                            const jsonData = { ...additionalInfo };
                            con.query(
                                'UPDATE all_booking SET additional_information_json = ? WHERE id = ?',
                                [JSON.stringify(jsonData), bookingId],
                                (err) => {
                                    if (err) {
                                        console.error('Error updating additional_information_json:', err);
                                    } else {
                                        console.log('Additional information JSON updated successfully');
                                    }
                                }
                            );
                        }
                        
                        resolve(bookingId);
                    });
                } else {
                    // Store additional information answers even if no passengers
                    if (additionalInfo && typeof additionalInfo === 'object') {
                        const additionalInfoAnswers = [];
                        
                        Object.keys(additionalInfo).forEach(key => {
                            if (key.startsWith('question_') && additionalInfo[key]) {
                                const questionId = key.replace('question_', '');
                                additionalInfoAnswers.push([bookingId, questionId, additionalInfo[key]]);
                            }
                        });
                        
                        if (additionalInfoAnswers.length > 0) {
                            const additionalInfoSql = 'INSERT INTO additional_information_answers (booking_id, question_id, answer) VALUES ?';
                            con.query(additionalInfoSql, [additionalInfoAnswers], (additionalInfoErr) => {
                                if (additionalInfoErr) {
                                    console.error('Error storing additional information answers:', additionalInfoErr);
                                } else {
                                    console.log('Additional information answers stored successfully');
                                }
                            });
                        }
                        
                        // Also update the JSON field in all_booking for backward compatibility
                        const jsonData = { ...additionalInfo };
                        con.query(
                            'UPDATE all_booking SET additional_information_json = ? WHERE id = ?',
                            [JSON.stringify(jsonData), bookingId],
                            (err) => {
                                if (err) {
                                    console.error('Error updating additional_information_json:', err);
                                } else {
                                    console.log('Additional information JSON updated successfully');
                                }
                            }
                        );
                    }
                    
                    resolve(bookingId);
                }
            });
            
            // Update availability for the specific time slot after booking creation
            // Remove chooseFlightType.passengerCount check - we'll use passengerData.length instead
            if (selectedDate && selectedTime && chooseFlightType && chooseLocation) {
                console.log('=== WEBHOOK AVAILABILITY UPDATE ===');
                console.log('selectedDate:', selectedDate, 'Type:', typeof selectedDate);
                console.log('selectedTime:', selectedTime);
                console.log('chooseFlightType:', chooseFlightType);
                console.log('chooseLocation:', chooseLocation);
                console.log('passengerData length:', Array.isArray(passengerData) ? passengerData.length : 0);
                
                let bookingDate = selectedDate;
                let bookingTime = selectedTime;
                
                // Parse date if it's a string with time
                if (typeof selectedDate === 'string' && selectedDate.includes(' ')) {
                    const parts = selectedDate.split(' ');
                    bookingDate = parts[0];
                    if (!bookingTime) {
                        bookingTime = parts[1];
                    }
                } else if (typeof selectedDate === 'string' && selectedDate.length === 10) {
                    // Date is already in YYYY-MM-DD format
                    bookingDate = selectedDate;
                } else if (selectedDate instanceof Date) {
                    bookingDate = moment(selectedDate).format('YYYY-MM-DD');
                }
                
                console.log('Parsed bookingDate:', bookingDate);
                console.log('Parsed bookingTime:', bookingTime);
                
                if (bookingDate && bookingTime) {
                    // Get activity_id for the location
                    const activitySql = `SELECT id FROM activity WHERE location = ? AND status = 'Live' LIMIT 1`;
                    con.query(activitySql, [chooseLocation], (activityErr, activityResult) => {
                        if (activityErr) {
                            console.error('Error getting activity_id for availability update:', activityErr);
                        } else if (activityResult.length > 0) {
                            const activityId = activityResult[0].id;
                            console.log('Found activity_id for availability update:', activityId);
                            
                            // Update availability for this specific time slot
                            // Use actual passenger count from passengerData array
                            const actualPassengerCount = (Array.isArray(passengerData) ? passengerData.length : 1);
                            console.log('Updating availability with passenger count:', actualPassengerCount);
                            updateSpecificAvailability(bookingDate, bookingTime, activityId, actualPassengerCount);
                        } else {
                            console.error('No activity found for location:', chooseLocation);
                        }
                    });
                }
                console.log('=== END WEBHOOK AVAILABILITY UPDATE ===');
            }
        }

        // Calculate expires date (Private Charter = 18 months; Shared Flight: Any Day Flight = 24 months, others = 18 months)
        if (chooseFlightType.type === 'Private Charter') {
            expiresDate = now.add(18, 'months').format('YYYY-MM-DD HH:mm:ss');
        } else if (chooseFlightType.type === 'Shared Flight') {
            const vt = actualVoucherType || '';
            expiresDate = now.add((vt === 'Any Day Flight') ? 24 : 18, 'months').format('YYYY-MM-DD HH:mm:ss');
        } else {
            expiresDate = now.add(24, 'months').format('YYYY-MM-DD HH:mm:ss');
        }

        insertBookingAndPassengers(expiresDate);
    });
}

// Webhook için voucher oluşturma fonksiyonu
async function createVoucherFromWebhook(voucherData) {
    return new Promise((resolve, reject) => {
        function emptyToNull(val) {
            if (val === '' || val === undefined || val === null) {
                return null;
            }
            if (typeof val === 'object' && Object.keys(val).length === 0) {
                return null;
            }
            return val;
        }
        
        const {
            name = '',
            weight = '',
            flight_type = '',
            voucher_type = '',
            book_flight = '', // Add book_flight field
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
            preferred_day = '',
            numberOfPassengers = 1,
            additionalInfo = null,
            additional_information = null,
            additional_information_json = null,
            add_to_booking_items = null,
            passengerData = []
        } = voucherData;

        // If paid wasn't provided on webhook payload, try pulling from stored session (Stripe total)
        try {
            if ((!paid || Number(paid) === 0) && voucherData && voucherData.session_id && stripeSessionStore[voucherData.session_id]) {
                const guess = stripeSessionStore[voucherData.session_id]?.totalPrice || stripeSessionStore[voucherData.session_id]?.voucherData?.paid;
                if (Number(guess) > 0) {
                    console.log('Webhook paid corrected from session store:', guess);
                    voucherData.paid = Number(guess);
                }
            }
        } catch (e) { /* ignore */ }

        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        // Determine the actual voucher type based on the input
        // NOTE: We declare this BEFORE computing expiry to avoid ReferenceError
        let actualVoucherType = '';
        // Start with a safe default for expiry; will be recalculated after resolving actualVoucherType
        let expiryMonthsWebhook = (flight_type === 'Private Charter') ? 18 : 24;
        let expiresFinal = expires && expires !== '' ? expires : moment().add(expiryMonthsWebhook, 'months').format('YYYY-MM-DD HH:mm:ss');
        
        console.log('Webhook voucher data received:', voucherData);
        console.log('voucher_type_detail from webhook:', voucherData.voucher_type_detail);
        console.log('voucher_type from webhook:', voucher_type);
        console.log('=== WEBHOOK ADDITIONAL INFO DEBUG ===');
        console.log('additionalInfo from webhook:', additionalInfo);
        console.log('additional_information from webhook:', additional_information);
        console.log('add_to_booking_items from webhook:', add_to_booking_items);
        console.log('typeof additionalInfo:', typeof additionalInfo);
        console.log('typeof add_to_booking_items:', typeof add_to_booking_items);
        
        // Check if there's a specific voucher type detail in the request
        if (voucherData.voucher_type_detail && voucherData.voucher_type_detail.trim() !== '') {
            actualVoucherType = voucherData.voucher_type_detail.trim();
            console.log('Using voucher_type_detail from webhook data:', actualVoucherType);
        } else if (voucher_type === 'Weekday Morning' || voucher_type === 'Flexible Weekday' || voucher_type === 'Any Day Flight') {
            // If the frontend sends the specific voucher type directly
            actualVoucherType = voucher_type;
            console.log('Using voucher_type directly from webhook:', actualVoucherType);
        } else if (voucherData.selectedVoucherType && voucherData.selectedVoucherType.title) {
            // Fallback: Try to get from selectedVoucherType object
            actualVoucherType = voucherData.selectedVoucherType.title.trim();
            console.log('Using selectedVoucherType.title as fallback:', actualVoucherType);
        } else {
            // For Flight Voucher, Gift Voucher, etc., we need to get the actual type from the frontend
            // This should be sent as voucher_type_detail
            console.error('ERROR: No voucher_type_detail provided for voucher type:', voucher_type);
            console.error('This indicates a frontend issue - selectedVoucherType was not set');
            console.error('voucherData received:', voucherData);
            return reject(new Error('Missing voucher type detail. Please select a specific voucher type before proceeding.'));
        }
        
        // Do not restrict to shared-only voucher types.
        // Accept any non-empty voucher_type_detail so Private Charter (e.g., Proposal Flight) works too.
        // Keep a soft log for unexpected blanks only.
        if (!actualVoucherType || actualVoucherType.trim() === '') {
            console.error('ERROR: Missing voucher type detail after resolution.');
            return reject(new Error('Missing voucher type detail.'));
        }
        
        console.log('Final actualVoucherType from webhook:', actualVoucherType);

        // Recompute expiry months now that actualVoucherType is known (for Shared Flight cases)
        if (flight_type === 'Private Charter') {
            expiryMonthsWebhook = 18;
        } else if (flight_type === 'Shared Flight') {
            expiryMonthsWebhook = (actualVoucherType === 'Any Day Flight') ? 24 : 18;
        }
        if (!expires || expires === '') {
            expiresFinal = moment().add(expiryMonthsWebhook, 'months').format('YYYY-MM-DD HH:mm:ss');
        }

        // Check for duplicates before inserting (prevent webhook duplicates)
        // More comprehensive duplicate check - use core voucher details instead of voucher_ref
        const duplicateCheckSql = `
            SELECT id FROM all_vouchers 
            WHERE name = ? AND email = ? AND paid = ? 
            AND book_flight = ? AND voucher_type = ?
            AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE) 
            LIMIT 1
        `;
        
        con.query(duplicateCheckSql, [name, email, paid, voucher_type, actualVoucherType], (err, duplicateResult) => {
            if (err) {
                console.error('Error checking for webhook duplicates:', err);
                return reject(err);
            }
            
            if (duplicateResult && duplicateResult.length > 0) {
                console.log('=== WEBHOOK DUPLICATE VOUCHER DETECTED ===');
                console.log('Duplicate voucher ID:', duplicateResult[0].id);
                console.log('Name:', name, 'Email:', email, 'Paid:', paid);
                // Return the existing voucher ID instead of creating a new one
                resolve(duplicateResult[0].id);
                return;
            }
            
                // Ensure additionalInfo is properly stored as JSON
                let finalAdditionalInfoJson = null;
                if (additionalInfo) {
                    // If additionalInfo is already a string, try to parse it
                    if (typeof additionalInfo === 'string') {
                        try {
                            finalAdditionalInfoJson = JSON.parse(additionalInfo);
                        } catch (e) {
                            logToFile('Failed to parse additionalInfo string:', e);
                            finalAdditionalInfoJson = additionalInfo;
                        }
                    } else {
                        // If it's an object, use it directly
                        finalAdditionalInfoJson = additionalInfo;
                    }
                }

                // Log the data we're about to insert
                logToFile('Inserting voucher with data:', {
                    additionalInfo,
                    additional_information_json,
                    finalAdditionalInfoJson,
                    add_to_booking_items
                });

                // No duplicates found, proceed with voucher creation
                const insertSql = `INSERT INTO all_vouchers 
                    (name, weight, experience_type, book_flight, voucher_type, email, phone, mobile, expires, redeemed, paid, offer_code, voucher_ref, created_at, recipient_name, recipient_email, recipient_phone, recipient_gift_date, preferred_location, preferred_time, preferred_day, flight_attempts, numberOfPassengers, additional_information_json, add_to_booking_items, voucher_passenger_details)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                const values = [
                emptyToNull(name),
                emptyToNull(weight),
                emptyToNull(flight_type), // This will go to experience_type column
                emptyToNull(book_flight), // This will go to book_flight column
                emptyToNull(actualVoucherType), // This will go to voucher_type column (actual voucher type)
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
                emptyToNull(preferred_day),
                0, // flight_attempts starts at 0 for each created voucher
                Number.parseInt(numberOfPassengers, 10) || 1,
                // Persist additional information answers regardless of which key frontend used
                finalAdditionalInfoJson ? JSON.stringify(finalAdditionalInfoJson) : null,
                add_to_booking_items ? JSON.stringify(add_to_booking_items) : null,
                Array.isArray(passengerData) && passengerData.length > 0 ? JSON.stringify(passengerData.map(p => ({
                    first_name: p.firstName || '',
                    last_name: p.lastName || '',
                    weight: p.weight || null,
                    email: p.email || null,
                    phone: p.phone || null,
                    ticket_type: p.ticketType || null,
                    weather_refund: !!p.weatherRefund
                }))) : null
            ];
            
            // Always create a SINGLE voucher regardless of passenger count (reverted behavior)
            {
                // Single voucher creation (original logic)
                // Generate voucher code for single voucher
                const generateVoucherCode = () => {
                    const prefix = 'GAT';
                    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
                    return `${prefix}${randomPart}`;
                };
                
                const uniqueVoucherCode = generateVoucherCode();
                console.log(`🎁 Generating single voucher code: ${uniqueVoucherCode}`);
                
                // Update values array with unique voucher code
                const updatedValues = [...values];
                updatedValues[10] = uniqueVoucherCode; // voucher_ref is at index 10
                
                con.query(insertSql, updatedValues, (err, result) => {
                if (err) {
                    console.error('Webhook voucher insertion error:', err);
                    return reject(err);
                }
                    console.log(`Webhook voucher created successfully, ID: ${result.insertId}, Code: ${uniqueVoucherCode}`);
                
                // Store additional information answers if available
                if (additionalInfo && typeof additionalInfo === 'object') {
                    const additionalInfoAnswers = [];
                    
                    // Process additionalInfo object to extract question answers
                    Object.keys(additionalInfo).forEach(key => {
                        if (key.startsWith('question_') && additionalInfo[key]) {
                            const questionId = key.replace('question_', '');
                            additionalInfoAnswers.push([result.insertId, questionId, additionalInfo[key]]);
                        }
                    });
                    
                    if (additionalInfoAnswers.length > 0) {
                        const additionalInfoSql = 'INSERT INTO additional_information_answers (booking_id, question_id, answer) VALUES ?';
                        con.query(additionalInfoSql, [additionalInfoAnswers], (additionalInfoErr) => {
                            if (additionalInfoErr) {
                                console.error('Error storing additional information answers for webhook voucher:', additionalInfoErr);
                            } else {
                                console.log('Additional information answers stored successfully for webhook voucher');
                            }
                        });
                    }
                }
                
                resolve(result.insertId);
            });
            }
        });
    });
}

// Stripe Checkout Session oluşturma endpointini güncelle
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        console.log('Create checkout session request received:', req.body);
        
        // Stripe secret key kontrolü
        if (!stripeSecretKey) {
            console.error('STRIPE_SECRET_KEY environment variable is not set');
            return res.status(500).json({ 
                success: false, 
                message: 'Stripe configuration error: Secret key not found' 
            });
        }
        
        const { totalPrice, currency = 'GBP', bookingData, voucherData, type } = req.body;
        if (totalPrice === undefined || totalPrice === null || isNaN(Number(totalPrice))) {
            return res.status(400).json({ success: false, message: 'Invalid totalPrice' });
        }
        if (!bookingData && !voucherData) {
            return res.status(400).json({ success: false, message: 'Eksik veri: bookingData veya voucherData gereklidir.' });
        }
        
        // Debug: Log activity_id in bookingData
        if (bookingData) {
            console.log('=== BOOKING DATA DEBUG (create-checkout-session) ===');
            console.log('bookingData.activity_id:', bookingData.activity_id);
            console.log('bookingData.chooseLocation:', bookingData.chooseLocation);
            console.log('bookingData.activitySelect:', bookingData.activitySelect);
        }
        
        // Debug: Log numberOfPassengers in voucherData
        if (voucherData) {
            console.log('=== VOUCHER DATA DEBUG (create-checkout-session) ===');
            console.log('voucherData.numberOfPassengers:', voucherData.numberOfPassengers);
            console.log('typeof voucherData.numberOfPassengers:', typeof voucherData.numberOfPassengers);
            console.log('voucherData keys:', Object.keys(voucherData));
            console.log('voucherData.additionalInfo:', voucherData.additionalInfo);
            console.log('voucherData.additional_information_json:', voucherData.additional_information_json);
            console.log('voucherData.additional_information:', voucherData.additional_information);
            console.log('typeof voucherData.additionalInfo:', typeof voucherData.additionalInfo);
            console.log('voucherData.additionalInfo keys:', voucherData.additionalInfo ? Object.keys(voucherData.additionalInfo) : 'additionalInfo is null/undefined');
            console.log('voucherData.add_to_booking_items:', voucherData.add_to_booking_items);
            console.log('typeof voucherData.add_to_booking_items:', typeof voucherData.add_to_booking_items);
            console.log('voucherData.add_to_booking_items length:', voucherData.add_to_booking_items ? voucherData.add_to_booking_items.length : 'add_to_booking_items is null/undefined');
        }
        
        console.log('Processing payment:', { totalPrice, type, hasBookingData: !!bookingData, hasVoucherData: !!voucherData });
        
        // Stripe fiyatı kuruş cinsinden ister
        const amount = Math.round(Number(totalPrice) * 100);
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }
        
        // Environment'a göre URL'leri ayarla
        // Prefer request origin (or explicit env override) so local/dev/prod return to the same host that initiated checkout
        const isProd = process.env.NODE_ENV === 'production';
        const reqOrigin = (req.headers && (req.headers.origin || req.headers.referer)) || '';
        let derivedOrigin = '';
        if (reqOrigin) {
            const match = String(reqOrigin).match(/^https?:\/\/[^/]+/);
            if (match) derivedOrigin = match[0];
        }
        const baseUrl = process.env.CHECKOUT_RETURN_BASE_URL || derivedOrigin || (isProd ? 'https://flyawayballooning-book.com' : 'http://localhost:3000');
        
        console.log('Creating Stripe session with:', { amount, baseUrl, isProd });
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency,
                        product_data: {
                            name: type === 'voucher' ? 'Balloon Flight Voucher' : 'Balloon Flight Booking',
                            description: type === 'voucher' ? 'Hot Air Balloon Flight Voucher' : 'Hot Air Balloon Flight Reservation',
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${baseUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}&type=${type}`,
            cancel_url: `${baseUrl}/?payment=cancel`,
            metadata: {
                type: type || (voucherData ? 'voucher' : 'booking'),
                session_id: 'PLACEHOLDER' // Will be updated below
            }
        });
        
        console.log('Stripe session created:', session.id);
        
        // bookingData veya voucherData'yı session_id ile store'da sakla
        const session_id = session.id;
        // Normalize voucherData to ensure additional information persists through webhook
        const normalizedVoucherData = voucherData ? {
            ...voucherData,
            // Ensure additional_information_json is populated for webhook persistence
            additional_information_json: voucherData.additional_information_json || voucherData.additionalInfo || null,
            // Backward-compat: include choose_add_on as add_to_booking_items if only one is present
            add_to_booking_items: voucherData.add_to_booking_items || voucherData.choose_add_on || null,
            // Persist the amount paid from checkout into voucherData so webhook creation stores it
            paid: Number(totalPrice) || 0
        } : null;
        stripeSessionStore[session_id] = {
            type: type || (voucherData ? 'voucher' : 'booking'),
            bookingData,
            voucherData: normalizedVoucherData,
            timestamp: Date.now() // Add timestamp for debugging
        };
        // File logging for saved session voucherData
        try {
            logToFile('SESSION STORE SAVE', {
                session_id,
                type: type || (voucherData ? 'voucher' : 'booking'),
                voucherData: normalizedVoucherData
            });
        } catch (e) {
            console.warn('Failed to write session log:', e);
        }
        
        // Stripe metadata'ya session_id ekle
        await stripe.checkout.sessions.update(session_id, {
            metadata: { session_id }
        });
        
        console.log('Session stored and metadata updated');
        console.log('Session store contents:', Object.keys(stripeSessionStore));
        console.log('Sending response:', { success: true, sessionId: session_id });
        res.json({ success: true, sessionId: session_id });
    } catch (error) {
        console.error('Stripe Checkout Session error:', error);
        const details = {
            message: error?.message,
            type: error?.type,
            code: error?.code,
            doc_url: error?.doc_url,
            param: error?.param,
            stack: error?.stack,
            stripeKey: stripeSecretKey ? 'SET' : 'NOT SET',
            nodeEnv: process.env.NODE_ENV
        };
        console.error('Error details:', details);
        res.status(500).json({ 
            success: false, 
            message: 'Stripe Checkout Session oluşturulamadı', 
            error: details
        });
    }
});

// Diagnostics endpoint to verify Stripe config in production (returns only non-sensitive info)
app.get('/api/stripe/diagnostics', async (req, res) => {
    try {
        const keySet = !!stripeSecretKey;
        let accountEmail = null;
        if (keySet) {
            try {
                const acct = await stripe.accounts.retrieve();
                accountEmail = acct.email || null;
            } catch (e) {
                // ignore
            }
        }
        res.json({ success: true, keySet, nodeEnv: process.env.NODE_ENV, accountEmail });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get activity pricing for a specific location
app.get('/api/locationPricing/:location', (req, res) => {
    const { location } = req.params;
    if (!location) return res.status(400).json({ success: false, message: 'Location is required' });
    
    const sql = `
        SELECT weekday_morning_price, flexible_weekday_price, any_day_flight_price, shared_flight_from_price, private_charter_from_price, flight_type
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
        
        const pricing = result[0];
        
        // Process flight_type to map to experience names
        let flightTypes = [];
        let experiences = [];
        if (pricing.flight_type) {
            if (typeof pricing.flight_type === 'string') {
                flightTypes = pricing.flight_type.split(',').map(type => type.trim());
            } else if (Array.isArray(pricing.flight_type)) {
                flightTypes = pricing.flight_type;
            }
            
            // Map flight types to experience names
            experiences = flightTypes.map(type => {
                if (type === 'Private') return 'Private Charter';
                if (type === 'Shared') return 'Shared Flight';
                return type; // Keep original if not mapped
            });
        }
        
        res.json({ 
            success: true, 
            data: {
                weekday_morning_price: pricing.weekday_morning_price,
                flexible_weekday_price: pricing.flexible_weekday_price,
                any_day_flight_price: pricing.any_day_flight_price,
                shared_flight_from_price: pricing.shared_flight_from_price,
                private_charter_from_price: pricing.private_charter_from_price,
                flight_type: flightTypes,
                experiences: experiences
            }
        });
    });
});

// Get a single availability by activity, date and time (with hold consideration)
app.get('/api/availabilityBySlot', (req, res) => {
    const { activity_id, date, time } = req.query;
    if (!activity_id || !date || !time) {
        return res.status(400).json({ success: false, message: 'activity_id, date and time are required' });
    }
    const sql = 'SELECT id, capacity, available, status FROM activity_availability WHERE activity_id = ? AND DATE(date) = ? AND TIME(time) = ? LIMIT 1';
    con.query(sql, [activity_id, date, time], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!rows || rows.length === 0) return res.json({ success: true, data: null });
        
        // Calculate held seats for this slot
        const holdKey = `${activity_id}_${date}_${time}`;
        let heldSeats = 0;
        const now = Date.now();
        
        for (const [key, hold] of availabilityHolds.entries()) {
            if (key.startsWith(holdKey) && now <= hold.expiresAt) {
                heldSeats += hold.seats;
            }
        }
        
        // Return availability minus held seats
        const availabilityData = {
            ...rows[0],
            available: Math.max(0, rows[0].available - heldSeats),
            actualAvailable: rows[0].available,
            heldSeats: heldSeats
        };
        
        return res.json({ success: true, data: availabilityData });
    });
});

// Hold availability for a specific slot
app.post('/api/holdAvailability', (req, res) => {
    const { activity_id, date, time, seats, sessionId } = req.body;
    
    if (!activity_id || !date || !time || !seats || !sessionId) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    // Create unique hold key
    const holdKey = `${activity_id}_${date}_${time}_${sessionId}`;
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes
    
    // Store the hold
    availabilityHolds.set(holdKey, {
        activity_id,
        date,
        time,
        seats: parseInt(seats),
        sessionId,
        expiresAt,
        createdAt: Date.now()
    });
    
    console.log(`🔒 Hold created for ${seats} seat(s) at ${date} ${time} (session: ${sessionId}, expires in 5 min)`);
    console.log(`🔒 Hold details:`, { activity_id, date, time, seats, sessionId, holdKey });
    
    res.json({ 
        success: true, 
        message: 'Availability held',
        holdKey,
        expiresAt,
        expiresIn: 300 // seconds
    });
});

// Release availability hold
app.post('/api/releaseHold', (req, res) => {
    const { sessionId, activity_id, date, time } = req.body;
    
    if (!sessionId) {
        return res.status(400).json({ success: false, message: 'sessionId is required' });
    }
    
    let released = false;
    
    // If specific slot provided, release only that hold
    if (activity_id && date && time) {
        const holdKey = `${activity_id}_${date}_${time}_${sessionId}`;
        if (availabilityHolds.has(holdKey)) {
            availabilityHolds.delete(holdKey);
            console.log(`🔓 Hold released for ${date} ${time} (session: ${sessionId})`);
            released = true;
        }
    } else {
        // Release all holds for this session
        for (const [key, hold] of availabilityHolds.entries()) {
            if (hold.sessionId === sessionId) {
                availabilityHolds.delete(key);
                console.log(`🔓 Hold released for ${hold.date} ${hold.time} (session: ${sessionId})`);
                released = true;
            }
        }
    }
    
    res.json({ 
        success: true, 
        message: released ? 'Hold(s) released' : 'No holds found',
        released
    });
});

// Test webhook endpoint
app.post('/api/test-webhook', (req, res) => {
    console.log('Test webhook endpoint hit!');
    console.log('Request body:', req.body);
    res.json({ success: true, message: 'Test webhook working' });
});

// Manual booking creation endpoint for testing
app.post('/api/createTestBooking', (req, res) => {
    console.log('Create test booking endpoint hit!');
    console.log('Request body:', req.body);
    
    const testBookingData = {
        activitySelect: 'Book Flight',
        chooseLocation: 'Somerset',
        chooseFlightType: { type: 'Shared Flight' },
        passengerData: [
            {
                firstName: 'Test',
                lastName: 'User',
                weight: '70',
                email: 'test@example.com',
                phone: '1234567890',
                weatherRefund: false
            }
        ],
        selectedDate: '2025-08-15',
        selectedTime: '09:00:00',
        totalPrice: 180,
        additionalInfo: { notes: 'Test booking' }
    };
    
    createBookingFromWebhook(testBookingData)
        .then(bookingId => {
            console.log('Test booking created successfully, ID:', bookingId);
            res.json({ success: true, bookingId });
        })
        .catch(error => {
            console.error('Error creating test booking:', error);
            res.status(500).json({ success: false, error: error.message });
        });
});
// Fallback endpoint for creating bookings when webhook fails
app.post('/api/createBookingFromSession', async (req, res) => {
    try {
        const { session_id, type } = req.body;
        console.log('Create booking from session endpoint hit:', { session_id, type });
        
        if (!session_id) {
            return res.status(400).json({ success: false, message: 'Session ID is required' });
        }
        
        const storeData = stripeSessionStore[session_id];
        if (!storeData) {
            console.error('Session data not found for session_id:', session_id);
            // Try to fetch directly from Stripe as a fallback (in case server was restarted)
            try {
                const session = await stripe.checkout.sessions.retrieve(session_id);
                if (session && session.metadata && session.metadata.session_id === session_id) {
                    console.log('Fetched session from Stripe as fallback. However, no booking/voucher payload is available. Returning graceful message.');
                }
            } catch (e) {
                console.warn('Stripe session fetch failed for fallback:', e?.message);
            }
            return res.status(400).json({ success: false, message: 'Session data not found' });
        }
        
        console.log('Found session data:', storeData);
        
        // If already processed by webhook or previous call, short-circuit
        if (storeData.processed) {
            if (type === 'booking' && storeData.bookingData?.booking_id) {
                return res.json({ success: true, id: storeData.bookingData.booking_id, message: 'booking already created', voucher_code: storeData.bookingData.voucher_code || null });
            }
            if (type === 'voucher' && storeData.voucherData?.voucher_id) {
                return res.json({ success: true, id: storeData.voucherData.voucher_id, message: 'voucher already created', voucher_code: storeData.voucherData.generated_voucher_code || null });
            }
        }
        
        let result;
        let voucherCode = null;
        if (type === 'booking' && storeData.bookingData) {
            // If another call is already creating, wait briefly for completion instead of returning immediately
            if (storeData.processing) {
                for (let i = 0; i < 15; i++) { // wait up to ~15s
                    if (!storeData.processing) break;
                    await new Promise(r => setTimeout(r, 1000));
                }
                if (storeData.processed && storeData.bookingData?.booking_id) {
                    return res.json({ success: true, id: storeData.bookingData.booking_id, message: 'booking already created' });
                }
                if (storeData.processing) {
                    return res.status(202).json({ success: false, message: 'Booking creation already in progress' });
                }
            }
            if (storeData.processed && storeData.bookingData?.booking_id) {
                return res.json({ success: true, id: storeData.bookingData.booking_id, message: 'booking already created' });
            }
            console.log('Creating booking from session data');
            console.log('=== BOOKING DATA BEFORE createBookingFromWebhook ===');
            console.log('passengerData:', storeData.bookingData.passengerData);
            console.log('passengerData length:', Array.isArray(storeData.bookingData.passengerData) ? storeData.bookingData.passengerData.length : 0);
            console.log('selectedDate:', storeData.bookingData.selectedDate);
            console.log('selectedTime:', storeData.bookingData.selectedTime);
            console.log('chooseLocation:', storeData.bookingData.chooseLocation);
            console.log('chooseFlightType:', storeData.bookingData.chooseFlightType);
            
            // Ensure voucher_type_detail is present for createBookingFromWebhook
            try {
                if (!storeData.bookingData.voucher_type_detail && storeData.bookingData.selectedVoucherType?.title) {
                    const title = storeData.bookingData.selectedVoucherType.title;
                    if (title === 'Weekday Morning') storeData.bookingData.voucher_type_detail = 'Weekday Morning';
                    else if (title === 'Flexible Weekday') storeData.bookingData.voucher_type_detail = 'Flexible Weekday';
                    else if (title === 'Any Day Flight') storeData.bookingData.voucher_type_detail = 'Any Day Flight';
                }
            } catch (mapErr) {
                console.warn('voucher_type_detail mapping failed:', mapErr?.message);
            }
            // Acquire a simple in-memory lock
            storeData.processing = true;
            try {
                result = await createBookingFromWebhook(storeData.bookingData);
                console.log('Booking created successfully, ID:', result);
                // mark processed and store id to avoid duplicates
                storeData.processed = true;
                storeData.bookingData.booking_id = result;
            } finally {
                storeData.processing = false;
            }
            
            // For Book Flight, generate voucher code
            try {
                console.log('=== GENERATING VOUCHER CODE FOR BOOK FLIGHT ===');
                console.log('Full storeData.bookingData:', JSON.stringify(storeData.bookingData, null, 2));
                console.log('selectedVoucherType exists:', !!storeData.bookingData.selectedVoucherType);
                console.log('selectedVoucherType:', storeData.bookingData.selectedVoucherType);
                console.log('passengerData exists:', !!storeData.bookingData.passengerData);
                console.log('passengerData:', storeData.bookingData.passengerData);
                console.log('chooseLocation:', storeData.bookingData.chooseLocation);
                console.log('chooseFlightType:', storeData.bookingData.chooseFlightType);
                console.log('totalPrice:', storeData.bookingData.totalPrice);
                
                // Determine flight category from booking data
                let flightCategory = 'Any Day Flight'; // Default
                if (storeData.bookingData.selectedVoucherType) {
                    // Map voucher type title to flight category
                    const voucherTypeTitle = storeData.bookingData.selectedVoucherType.title;
                    console.log('Voucher Type Title:', voucherTypeTitle);
                    console.log('Full selectedVoucherType:', JSON.stringify(storeData.bookingData.selectedVoucherType, null, 2));
                    
                    if (voucherTypeTitle === 'Weekday Morning') {
                        flightCategory = 'Weekday Morning';
                    } else if (voucherTypeTitle === 'Flexible Weekday') {
                        flightCategory = 'Weekday Flex';
                    } else if (voucherTypeTitle === 'Any Day Flight') {
                        flightCategory = 'Any Day Flight';
                    }
                    
                    console.log('Mapped Flight Category:', flightCategory);
                } else {
                    console.log('No selectedVoucherType found in bookingData');
                }
                
                // Generate voucher code
                const voucherCodeRequest = {
                    flight_category: flightCategory,
                    customer_name: (storeData.bookingData.passengerData?.[0]?.firstName || '') + ' ' + (storeData.bookingData.passengerData?.[0]?.lastName || '') || 'Unknown Customer',
                    customer_email: storeData.bookingData.passengerData?.[0]?.email || '',
                    location: storeData.bookingData.chooseLocation || 'Somerset',
                    experience_type: storeData.bookingData.chooseFlightType?.type || 'Shared Flight',
                    voucher_type: 'Book Flight',
                    paid_amount: storeData.bookingData.totalPrice || 0,
                    expires_date: null // Will use default (1 year)
                };
                
                console.log('=== VOUCHER CODE REQUEST ===');
                console.log('Request data:', JSON.stringify(voucherCodeRequest, null, 2));
                
                const voucherCodeResponse = await axios.post(`${req.protocol}://${req.get('host')}/api/generate-voucher-code`, voucherCodeRequest);
                
                if (voucherCodeResponse.data.success) {
                    console.log('Book Flight voucher code generated successfully:', voucherCodeResponse.data.voucher_code);
                    voucherCode = voucherCodeResponse.data.voucher_code;
                    // Persist voucher code to booking row
                    try {
                        await new Promise((resolve) => {
                            con.query('UPDATE all_booking SET voucher_code = ? WHERE id = ?', [voucherCode, result], (err) => {
                                if (err) {
                                    console.error('Error updating booking with voucher_code:', err);
                                } else {
                                    console.log('Booking updated with voucher_code:', voucherCode);
                                }
                                resolve();
                            });
                        });
                        // Keep in memory for subsequent calls
                        storeData.bookingData.voucher_code = voucherCode;
                    } catch (e) {
                        console.error('Voucher code persist exception:', e);
                    }
                } else {
                    console.error('Failed to generate Book Flight voucher code:', voucherCodeResponse.data.message);
                    // Even if the API call fails, try to use the voucher code from the response
                    if (voucherCodeResponse.data.voucher_code) {
                        voucherCode = voucherCodeResponse.data.voucher_code;
                        console.log('Using voucher code from failed response:', voucherCode);
                        // Try to persist the voucher code even if the API call failed
                        try {
                            await new Promise((resolve) => {
                                con.query('UPDATE all_booking SET voucher_code = ? WHERE id = ?', [voucherCode, result], (err) => {
                                    if (err) {
                                        console.error('Error updating booking with voucher_code (fallback):', err);
                                    } else {
                                        console.log('Booking updated with voucher_code (fallback):', voucherCode);
                                    }
                                    resolve();
                                });
                            });
                            storeData.bookingData.voucher_code = voucherCode;
                        } catch (e) {
                            console.error('Voucher code persist exception (fallback):', e);
                        }
                    }
                }
            } catch (voucherCodeError) {
                console.error('Error generating Book Flight voucher code:', voucherCodeError);
                // Continue even if code generation fails - booking is still valid
                console.log('Booking created successfully without voucher code. Voucher code can be generated later.');
            }
        } else if (type === 'voucher' && storeData.voucherData) {
            console.log('Creating voucher from session data');
            
            // Check if session was already processed by webhook
            if (storeData.processed) {
                console.log('Session already processed by webhook, using existing data');
                result = storeData.voucherData.voucher_id;
                voucherCode = storeData.voucherData.generated_voucher_code;
            } else {
                // Additional check: look for existing voucher in database to prevent duplicates
                const existingVoucherSql = `SELECT id FROM all_vouchers WHERE name = ? AND email = ? AND paid = ? AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE) LIMIT 1`;
                
                try {
                    const existingVoucher = await new Promise((resolve, reject) => {
                        con.query(existingVoucherSql, [storeData.voucherData.name, storeData.voucherData.email, storeData.voucherData.paid], (err, result) => {
                            if (err) reject(err);
                            else resolve(result);
                        });
                    });
                    
                    if (existingVoucher && existingVoucher.length > 0) {
                        console.log('Voucher already exists in database, using existing ID:', existingVoucher[0].id);
                        result = existingVoucher[0].id;
                        storeData.voucherData.voucher_id = result;
                        storeData.processed = true;
                    } else {
                        // Ensure voucher_type_detail is present for createVoucherFromWebhook
                        try {
                            if (!storeData.voucherData.voucher_type_detail && storeData.voucherData.selectedVoucherType?.title) {
                                const title = storeData.voucherData.selectedVoucherType.title;
                                if (title === 'Weekday Morning') storeData.voucherData.voucher_type_detail = 'Weekday Morning';
                                else if (title === 'Flexible Weekday') storeData.voucherData.voucher_type_detail = 'Flexible Weekday';
                                else if (title === 'Any Day Flight') storeData.voucherData.voucher_type_detail = 'Any Day Flight';
                                else storeData.voucherData.voucher_type_detail = title; // For Private Charter types
                                console.log('Mapped voucher_type_detail from selectedVoucherType:', storeData.voucherData.voucher_type_detail);
                            }
                        } catch (mapErr) {
                            console.warn('voucher_type_detail mapping failed:', mapErr?.message);
                        }
                        // Create voucher only if not already created
                        result = await createVoucherFromWebhook(storeData.voucherData);
                        console.log('Voucher created successfully, ID:', result);
                        
                        // Voucher code generation is now handled by frontend only
                        // Webhook only creates the voucher entry
                        console.log('Voucher code generation skipped - will be handled by frontend');
                        
                        // For Buy Gift vouchers, also generate voucher code (Shared + Private Charter)
                        console.log('=== VOUCHER CODE GENERATION CHECK ===');
                        console.log('storeData.voucherData.voucher_type:', storeData.voucherData.voucher_type);
                        console.log('storeData.voucherData.book_flight:', storeData.voucherData.book_flight);
                        console.log('Checking if Buy Gift or Gift Voucher...');
                        
                        if (
                            storeData.voucherData.voucher_type === 'Buy Gift' ||
                            storeData.voucherData.voucher_type === 'Gift Voucher' ||
                            storeData.voucherData.voucher_type === 'Flight Voucher' ||
                            storeData.voucherData.book_flight === 'Gift Voucher'
                        ) {
                            try {
                                console.log('Generating voucher code for voucher type:', storeData.voucherData.voucher_type);
                                
                                // Determine flight category from voucher data
                                // Use the selected voucher type detail as category (works for Shared and Private Charter)
                                let flightCategory = storeData.voucherData.voucher_type_detail || 'Any Day Flight';
                                
                                // For Buy Gift Voucher, generate multiple voucher codes based on passenger count
                                const passengerCount = Number.parseInt(storeData.voucherData.numberOfPassengers, 10) || 1;
                                // If passengerCount > 1, always generate multiple codes regardless of labels
                                const isBuyGiftVoucher = (passengerCount > 1) ||
                                                       storeData.voucherData.book_flight === 'Gift Voucher' || 
                                                       storeData.voucherData.voucher_type === 'Buy Gift' || 
                                                       storeData.voucherData.voucher_type === 'Buy Gift Voucher';
                                
                                console.log('🎁 Voucher type check:', {
                                    book_flight: storeData.voucherData.book_flight,
                                    voucher_type: storeData.voucherData.voucher_type,
                                    passengerCount: passengerCount,
                                    isBuyGiftVoucher: isBuyGiftVoucher,
                                    storeData: storeData.voucherData // Log the entire voucherData object
                                });
                                
                                if (isBuyGiftVoucher && passengerCount > 1) {
                                    console.log(`🎁 Generating ${passengerCount} voucher codes for Buy Gift Voucher`);
                                    
                                    const voucherCodes = [];
                                    
                                    // Generate multiple voucher codes
                                    for (let i = 0; i < passengerCount; i++) {
                                        try {
                                            const voucherCodeResponse = await axios.post(`${req.protocol}://${req.get('host')}/api/generate-voucher-code`, {
                                                flight_category: flightCategory,
                                                customer_name: storeData.voucherData.name || 'Unknown Customer',
                                                customer_email: storeData.voucherData.email || '',
                                                location: storeData.voucherData.preferred_location || 'Somerset',
                                                experience_type: storeData.voucherData.flight_type || 'Shared Flight',
                                                voucher_type: storeData.voucherData.voucher_type || 'Flight Voucher',
                                                paid_amount: storeData.voucherData.paid || 0,
                                                expires_date: storeData.voucherData.expires || null
                                            });
                                            
                                            if (voucherCodeResponse.data.success) {
                                                voucherCodes.push(voucherCodeResponse.data.voucher_code);
                                                console.log(`🎁 Voucher code ${i + 1} generated:`, voucherCodeResponse.data.voucher_code);
                                            } else {
                                                console.error(`Failed to generate voucher code ${i + 1}:`, voucherCodeResponse.data.message);
                                            }
                                        } catch (codeError) {
                                            console.error(`Error generating voucher code ${i + 1}:`, codeError);
                                        }
                                    }
                                    
                                    if (voucherCodes.length > 0) {
                                        console.log(`🎁 Multiple codes were generated previously (${voucherCodes.length}); reverting to SINGLE-VOUCHER behavior using the first code only.`);
                                        // Use only the first code
                                        voucherCode = voucherCodes[0];
                                        
                                        // Store only the single code in session data
                                        storeData.voucherData.generated_voucher_code = voucherCode;
                                        storeData.voucherData.generated_voucher_codes = null;

                                        // Persist the single code into the most recent matching voucher row
                                        try {
                                            const findSql = `
                                                SELECT id
                                                FROM all_vouchers
                                                WHERE (name = ? AND email = ?) OR (purchaser_name = ? AND purchaser_email = ?)
                                                  AND paid = ?
                                                  AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
                                                  AND (voucher_ref IS NULL OR voucher_ref = '' OR voucher_ref = '-')
                                                ORDER BY created_at ASC
                                                LIMIT 1
                                            `;
                                            const findParams = [
                                                storeData.voucherData.name || '',
                                                storeData.voucherData.email || '',
                                                storeData.voucherData.purchaser_name || storeData.voucherData.name || '',
                                                storeData.voucherData.purchaser_email || storeData.voucherData.email || '',
                                                storeData.voucherData.paid || 0
                                            ];
                                            const rows = await new Promise((resolve, reject) => {
                                                con.query(findSql, findParams, (err, result) => err ? reject(err) : resolve(result));
                                            });
                                            if (rows && rows.length > 0) {
                                                const updateSql = 'UPDATE all_vouchers SET voucher_ref = ? WHERE id = ?';
                                                await new Promise((resolve) => {
                                                    con.query(updateSql, [voucherCode, rows[0].id], (err) => {
                                                        if (err) console.error('Error updating voucher_ref (single from multi):', err, rows[0]);
                                                        else console.log('✅ voucher_ref updated (single from multi):', voucherCode, '-> id', rows[0].id);
                                                        resolve();
                                                    });
                                                });
                                                // Ensure PAID is set correctly
                                                const paidAmount = Number(storeData.voucherData.paid || totalPrice || 0);
                                                if (paidAmount > 0) {
                                                    await new Promise((resolve) => {
                                                        con.query('UPDATE all_vouchers SET paid = ? WHERE id = ?', [paidAmount, rows[0].id], (err) => {
                                                            if (err) console.error('Error updating paid (single from multi):', err);
                                                            else console.log('✅ paid updated (single from multi):', paidAmount, '-> id', rows[0].id);
                                                            resolve();
                                                        });
                                                    });
                                                }
                                            }
                                        } catch (persistErr) {
                                            console.error('Error persisting single voucher code (from multi) to all_vouchers:', persistErr);
                                        }
                                    }
                                } else {
                                    // Single voucher code generation (original logic)
                                const voucherCodeResponse = await axios.post(`${req.protocol}://${req.get('host')}/api/generate-voucher-code`, {
                                    flight_category: flightCategory,
                                    customer_name: storeData.voucherData.name || 'Unknown Customer',
                                    customer_email: storeData.voucherData.email || '',
                                    location: storeData.voucherData.preferred_location || 'Somerset',
                                    // Pass through actual experience type (Shared Flight or Private Charter)
                                    experience_type: storeData.voucherData.flight_type || 'Shared Flight',
                                    voucher_type: storeData.voucherData.voucher_type || 'Flight Voucher',
                                    paid_amount: storeData.voucherData.paid || 0,
                                    expires_date: storeData.voucherData.expires || null
                                });
                                
                                if (voucherCodeResponse.data.success) {
                                    console.log('Voucher code generated successfully for', storeData.voucherData.voucher_type, ':', voucherCodeResponse.data.voucher_code);
                                    voucherCode = voucherCodeResponse.data.voucher_code;
                                    
                                    // Store the voucher code in the session data to prevent regeneration
                                    storeData.voucherData.generated_voucher_code = voucherCode;

                                    // Persist single code into the most recent matching voucher
                                    try {
                                        const findSql = `
                                            SELECT id
                                            FROM all_vouchers
                                            WHERE (name = ? AND email = ?) OR (purchaser_name = ? AND purchaser_email = ?)
                                              AND paid = ?
                                              AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
                                              AND (voucher_ref IS NULL OR voucher_ref = '' OR voucher_ref = '-')
                                            ORDER BY created_at ASC
                                            LIMIT 1
                                        `;
                                        const findParams = [
                                            storeData.voucherData.name || '',
                                            storeData.voucherData.email || '',
                                            storeData.voucherData.purchaser_name || storeData.voucherData.name || '',
                                            storeData.voucherData.purchaser_email || storeData.voucherData.email || '',
                                            storeData.voucherData.paid || 0
                                        ];
                                        const rows = await new Promise((resolve, reject) => {
                                            con.query(findSql, findParams, (err, result) => err ? reject(err) : resolve(result));
                                        });
                                        if (rows && rows.length > 0) {
                                            const updateSql = 'UPDATE all_vouchers SET voucher_ref = ? WHERE id = ?';
                                            await new Promise((resolve) => {
                                                con.query(updateSql, [voucherCode, rows[0].id], (err) => {
                                                    if (err) console.error('Error updating single voucher_ref:', err, rows[0]);
                                                    else console.log('✅ voucher_ref updated (single):', voucherCode, '-> id', rows[0].id);
                                                    resolve();
                                                });
                                            });
                                            // Ensure paid is set correctly
                                            const paidAmount = Number(storeData.voucherData.paid || totalPrice || 0);
                                            if (paidAmount > 0) {
                                                await new Promise((resolve) => {
                                                    con.query('UPDATE all_vouchers SET paid = ? WHERE id = ?', [paidAmount, rows[0].id], (err) => {
                                                        if (err) console.error('Error updating paid (single):', err);
                                                        else console.log('✅ paid updated (single):', paidAmount, '-> id', rows[0].id);
                                                        resolve();
                                                    });
                                                });
                                            }
                                        }
                                    } catch (persistErr) {
                                        console.error('Error persisting single generated voucher code to all_vouchers:', persistErr);
                                    }
                                } else {
                                    console.error('Failed to generate voucher code for', storeData.voucherData.voucher_type, ':', voucherCodeResponse.data.message);
                                    }
                                }
                            } catch (voucherCodeError) {
                                console.error('Error generating voucher code for', storeData.voucherData.voucher_type, ':', voucherCodeError);
                                // Continue even if code generation fails
                            }
                        }
                        
                        // Mark session as processed to prevent duplicate creation
                        storeData.processed = true;
                    }
                } catch (dbError) {
                    console.error('Error checking for existing voucher:', dbError);
                    // Fallback to creating voucher
                    result = await createVoucherFromWebhook(storeData.voucherData);
                    console.log('Voucher created successfully (fallback), ID:', result);
                    storeData.processed = true;
                }
            }
        } else {
            return res.status(400).json({ success: false, message: 'Invalid type or missing data' });
        }
        
        // Clean up session data (keep minimal info to allow status checks for a short time)
        stripeSessionStore[session_id] = { ...stripeSessionStore[session_id], processed: true };
        
        // Determine the correct voucher code based on type
        let finalVoucherCode = null;
        if (type === 'booking') {
            finalVoucherCode = voucherCode || storeData.bookingData?.voucher_code || null;
        } else if (type === 'voucher') {
            finalVoucherCode = storeData.voucherData?.generated_voucher_code || null;
        }
        
        console.log('=== FINAL RESPONSE DEBUG ===');
        console.log('Type:', type);
        console.log('voucherCode:', voucherCode);
        console.log('storeData.bookingData?.voucher_code:', storeData.bookingData?.voucher_code);
        console.log('storeData.voucherData?.generated_voucher_code:', storeData.voucherData?.generated_voucher_code);
        console.log('finalVoucherCode:', finalVoucherCode);
        
        res.json({ 
            success: true, 
            id: result, 
            message: `${type} created successfully`,
            voucher_code: finalVoucherCode,
            voucher_codes: storeData.voucherData?.generated_voucher_codes || null, // Array of multiple voucher codes
            customer_name: storeData.voucherData?.name || storeData.bookingData?.passengerData?.[0]?.firstName + ' ' + storeData.bookingData?.passengerData?.[0]?.lastName || null,
            customer_email: storeData.voucherData?.email || storeData.bookingData?.passengerData?.[0]?.email || null,
            paid_amount: storeData.voucherData?.paid || storeData.bookingData?.totalPrice || null,
            voucher_type: storeData.voucherData?.voucher_type || (type === 'booking' ? 'Book Flight' : null),
            voucher_type_detail: storeData.voucherData?.voucher_type_detail || storeData.bookingData?.selectedVoucherType?.title || null
        });
    } catch (error) {
        console.error('Error creating from session:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get multiple voucher codes for a purchaser (for admin panel)
app.get('/api/voucher-codes/:purchaserId', (req, res) => {
    const { purchaserId } = req.params;
    
    if (!purchaserId) {
        return res.status(400).json({ success: false, message: 'Purchaser ID is required' });
    }
    
    // Get all vouchers for this purchaser (same name, email, paid amount, created within 1 minute)
    const sql = `
        SELECT v1.*, v2.voucher_ref as related_voucher_ref
        FROM all_vouchers v1
        LEFT JOIN all_vouchers v2 ON v1.name = v2.name 
            AND v1.email = v2.email 
            AND v1.paid = v2.paid 
            AND ABS(TIMESTAMPDIFF(SECOND, v1.created_at, v2.created_at)) <= 60
            AND v1.id != v2.id
        WHERE v1.id = ?
        ORDER BY v1.created_at ASC
    `;
    
    con.query(sql, [purchaserId], (err, result) => {
        if (err) {
            console.error('Error fetching voucher codes:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!result || result.length === 0) {
            return res.status(404).json({ success: false, message: 'Voucher not found' });
        }
        
        // Group vouchers by purchaser (same name, email, paid amount, created within 1 minute)
        const purchaserVouchers = result.filter(v => 
            v.name === result[0].name && 
            v.email === result[0].email && 
            v.paid === result[0].paid &&
            Math.abs(new Date(v.created_at) - new Date(result[0].created_at)) <= 60000 // 1 minute
        );
        
        const voucherCodes = purchaserVouchers.map(v => v.voucher_ref).filter(ref => ref && ref !== '-');
        
        res.json({
            success: true,
            data: {
                voucherCodes: voucherCodes,
                count: voucherCodes.length,
                vouchers: purchaserVouchers.map(v => ({
                    id: v.id,
                    voucher_ref: v.voucher_ref,
                    created_at: v.created_at
                }))
            }
        });
    });
});

// Fix journey_types data endpoint
app.post('/api/fix-journey-types', async (req, res) => {
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
        
        const totalRecords = parseInt(allValid[0].total);
        const validRecords = parseInt(allValid[0].valid_count);
        const success = totalRecords === validRecords;
        
        res.json({
            success: success,
            message: success ? 'All journey_types are now valid JSON!' : 'Some records still have invalid JSON',
            updatedRecords: updateResult.affectedRows,
            totalRecords: totalRecords,
            validRecords: validRecords
        });
        
    } catch (error) {
        console.error('Error fixing journey_types:', error);
        res.status(500).json({
            success: false,
            message: 'Error fixing journey_types',
            error: error.message
        });
    }
});

// Debug endpoint to check booking and availability data
app.get('/api/debug/activity/:id/bookings', (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Missing activity ID' });
    
    // Check all_booking data
    const bookingSql = `
        SELECT 
            id, 
            activity_id, 
            flight_date, 
            location, 
            flight_type, 
            time_slot,
            created_at
        FROM all_booking 
        WHERE activity_id = ?
        ORDER BY flight_date, time_slot
    `;
    
    // Check activity_availability data
    const availabilitySql = `
        SELECT 
            id, 
            activity_id, 
            date, 
            time, 
            capacity, 
            available, 
            status,
            flight_types
        FROM activity_availability 
        WHERE activity_id = ?
        ORDER BY date, time
    `;
    
    con.query(bookingSql, [id], (bookingErr, bookingResult) => {
        if (bookingErr) {
            console.error('Error fetching booking data:', bookingErr);
            return res.status(500).json({ success: false, message: 'Database error', error: bookingErr });
        }
        
        con.query(availabilitySql, [id], (availabilityErr, availabilityResult) => {
            if (availabilityErr) {
                console.error('Error fetching availability data:', availabilityErr);
                return res.status(500).json({ success: false, message: 'Database error', error: availabilityErr });
            }
            
            res.json({
                success: true,
                data: {
                    bookings: bookingResult,
                    availabilities: availabilityResult,
                    message: `Debug data for activity ${id}`
                }
            });
        });
    });
});

// Simple test endpoint to check booking data
app.get('/api/test/booking-count/:activityId/:date/:time', (req, res) => {
    const { activityId, date, time } = req.params;
    
    console.log(`\n=== Test endpoint called ===`);
    console.log(`Activity ID: ${activityId}, Date: ${date}, Time: ${time}`);
    
    // First, get all bookings for this activity to debug
    const debugSql = `
        SELECT 
            id, 
            flight_date, 
            location, 
            time_slot,
            DATE(flight_date) as date_only,
            TIME(time_slot) as time_only
        FROM all_booking 
        WHERE activity_id = ?
        ORDER BY flight_date, time_slot
    `;
    
    con.query(debugSql, [activityId], (debugErr, debugResult) => {
        if (debugErr) {
            console.error('Debug query error:', debugErr);
            return res.status(500).json({ success: false, error: debugErr.message });
        }
        
        console.log('All bookings for this activity:', debugResult);
        
        // Then, get specific booking count
        const testSql = `
            SELECT 
                COUNT(*) as total_booked,
                GROUP_CONCAT(ab.id) as booking_ids,
                GROUP_CONCAT(ab.flight_date) as flight_dates,
                GROUP_CONCAT(ab.time_slot) as time_slots,
                GROUP_CONCAT(ab.location) as locations
            FROM all_booking ab 
            WHERE ab.activity_id = ? 
            AND DATE(ab.flight_date) = DATE(?)
            AND TIME(ab.time_slot) = TIME(?)
        `;
        
        console.log(`Test query params: activity_id=${activityId}, date=${date}, time=${time}`);
        
        con.query(testSql, [activityId, date, time], (err, result) => {
            if (err) {
                console.error('Test query error:', err);
                return res.status(500).json({ success: false, error: err.message });
            }
            
            const totalBooked = result[0].total_booked || 0;
            console.log(`Result: totalBooked=${totalBooked}, bookingIds=${result[0].booking_ids}`);
            
            res.json({
                success: true,
                data: {
                    activityId,
                    date,
                    time,
                    totalBooked,
                    bookingIds: result[0].booking_ids,
                    flightDates: result[0].flight_dates,
                    timeSlots: result[0].time_slots,
                    locations: result[0].locations,
                    debug: {
                        allBookings: debugResult,
                        query: testSql,
                        params: [activityId, date, time]
                    }
                }
            });
        });
    });
});

// Auto-update available counts and status for all availabilities
app.post('/api/activity/:id/updateAvailableCounts', (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Missing activity ID' });
    
    console.log(`Updating available counts for activity ${id}`);
    
    // First, get all availabilities for this activity
    const getAvailabilitiesSql = `
        SELECT aa.id, aa.date, aa.time, aa.capacity, aa.available, aa.status, a.location
        FROM activity_availability aa 
        JOIN activity a ON aa.activity_id = a.id 
        WHERE aa.activity_id = ?
    `;
    
    con.query(getAvailabilitiesSql, [id], (err, availabilities) => {
        if (err) {
            console.error('Error fetching availabilities:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }
        
        console.log(`Found ${availabilities.length} availabilities to update`);
        
        let updatedCount = 0;
        const updatePromises = availabilities.map(availability => {
            return new Promise((resolve) => {
                // Get actual passenger count for this availability (SUM of pax, not COUNT of bookings)
                const getBookingCountSql = `
                    SELECT COALESCE(SUM(ab.pax), 0) as total_booked
                    FROM all_booking ab 
                    WHERE DATE(ab.flight_date) = DATE(?)
                    AND ab.location = ?
                    AND TIME_FORMAT(TIME(COALESCE(ab.time_slot, ab.flight_date)), '%H:%i') = TIME_FORMAT(TIME(?), '%H:%i')
                `;
                
                con.query(getBookingCountSql, [availability.date, availability.location, availability.time], (bookingErr, bookingResult) => {
                    if (bookingErr) {
                        console.error('Error getting passenger count:', bookingErr);
                        resolve(false);
                        return;
                    }
                    
                    const totalBooked = bookingResult[0].total_booked || 0;
                    const newAvailable = Math.max(0, availability.capacity - totalBooked);
                    const newStatus = totalBooked >= availability.capacity ? 'Closed' : 'Open';
                    
                    // Only update if something changed
                    if (newAvailable !== availability.available || newStatus !== availability.status) {
                        const updateSql = `
                            UPDATE activity_availability 
                            SET available = ?, booked = ?, status = ? 
                            WHERE id = ?
                        `;
                        
                        con.query(updateSql, [newAvailable, totalBooked, newStatus, availability.id], (updateErr) => {
                            if (updateErr) {
                                console.error('Error updating availability:', updateErr);
                                resolve(false);
                            } else {
                                console.log(`Updated availability ${availability.id}: available=${newAvailable}, booked=${totalBooked}, status=${newStatus}`);
                                updatedCount++;
                                resolve(true);
                            }
                        });
                    } else {
                        resolve(false);
                    }
                });
            });
        });
        
        Promise.all(updatePromises).then(() => {
            console.log(`Updated ${updatedCount} availabilities for activity ${id}`);
            res.json({
                success: true,
                message: `Updated ${updatedCount} availabilities for activity ${id}`,
                updatedCount
            });
        });
    });
});

// Update a single availability row after a booking by recomputing from bookings
function updateSpecificAvailability(bookingDate, bookingTime, activityId, passengerCount) {
    try {
        console.log('updateSpecificAvailability invoked', { bookingDate, bookingTime, activityId, passengerCount });
        if (!bookingDate || !bookingTime || !activityId) {
            console.warn('updateSpecificAvailability missing params');
            return;
        }
        // Find the matching availability and its capacity/location
        const findSlotSql = `
            SELECT aa.id, aa.capacity, a.location
            FROM activity_availability aa
            JOIN activity a ON a.id = aa.activity_id
            WHERE aa.activity_id = ? AND DATE(aa.date) = DATE(?) AND TIME_FORMAT(TIME(aa.time), '%H:%i') = TIME_FORMAT(TIME(?), '%H:%i')
            LIMIT 1
        `;
        con.query(findSlotSql, [activityId, bookingDate, bookingTime], (slotErr, slotRows) => {
            if (slotErr) {
                console.error('updateSpecificAvailability: error finding slot', slotErr);
                return;
            }
            if (!slotRows || slotRows.length === 0) {
                console.warn('updateSpecificAvailability: slot not found', { activityId, bookingDate, bookingTime });
                return;
            }
            const slot = slotRows[0];
            // Sum pax for this date/time and location; include bookings that may not have activity_id
            const sumPaxSql = `
                SELECT COALESCE(SUM(ab.pax), 0) as total_booked
                FROM all_booking ab
                WHERE DATE(ab.flight_date) = DATE(?)
                AND TIME_FORMAT(TIME(COALESCE(ab.time_slot, ab.flight_date)), '%H:%i') = TIME_FORMAT(TIME(?), '%H:%i')
                AND (ab.activity_id = ? OR (ab.activity_id IS NULL AND ab.location = ?))
            `;
            con.query(sumPaxSql, [bookingDate, bookingTime, activityId, slot.location], (sumErr, sumRows) => {
                if (sumErr) {
                    console.error('updateSpecificAvailability: error summing pax', sumErr);
                    return;
                }
                const totalBooked = (sumRows && sumRows[0] && sumRows[0].total_booked) ? Number(sumRows[0].total_booked) : 0;
                const newAvailable = Math.max(0, Number(slot.capacity) - totalBooked);
                const newStatus = totalBooked >= Number(slot.capacity) ? 'Closed' : 'Open';
                const updateSql = 'UPDATE activity_availability SET available = ?, booked = ?, status = ? WHERE id = ?';
                con.query(updateSql, [newAvailable, totalBooked, newStatus, slot.id], (updErr) => {
                    if (updErr) {
                        console.error('updateSpecificAvailability: error updating slot', updErr);
                    } else {
                        console.log('updateSpecificAvailability: updated', { id: slot.id, available: newAvailable, booked: totalBooked, status: newStatus });
                    }
                });
            });
        });
    } catch (e) {
        console.error('updateSpecificAvailability exception', e);
    }
}

// Duplicate function removed - using the existing one at line 2291

// Test endpoint for creating a test booking
app.post('/api/createTestBooking', (req, res) => {
    const testBooking = {
        customer_name: 'Test User',
        email: 'test@example.com',
        amount: 100.00,
        flight_date: '2025-09-15 09:00:00',
        time_slot: '09:00:00',
        location: 'London',
        activity_id: 29,
        experience: 'Shared Flight',
        voucher_type: 'Weekday Morning',
        created_at: new Date()
    };
    
    const sql = `
        INSERT INTO all_booking (
            customer_name, 
            email, 
            amount, 
            flight_date, 
            time_slot,
            location,
            activity_id,
            experience,
            voucher_type,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
        testBooking.customer_name,
        testBooking.email,
        testBooking.amount,
        testBooking.flight_date,
        testBooking.time_slot,
        testBooking.location,
        testBooking.activity_id,
        testBooking.experience,
        testBooking.voucher_type,
        testBooking.created_at
    ];
    
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error creating test booking:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }
        
        console.log('Test booking created with ID:', result.insertId);
        res.json({ success: true, message: 'Test booking created', bookingId: result.insertId });
    });
});
// Database migration function
const runDatabaseMigrations = () => {
    console.log('Running database migrations...');
    
    // Add numberOfPassengers column to all_vouchers table
    const addNumberOfPassengersColumn = `
        ALTER TABLE all_vouchers 
        ADD COLUMN numberOfPassengers INT DEFAULT 1 COMMENT 'Number of passengers for this voucher'
    `;
    
    con.query(addNumberOfPassengersColumn, (err, result) => {
        if (err) {
            console.error('Error adding numberOfPassengers column:', err);
        } else {
            console.log('✅ numberOfPassengers column added successfully');
        }
    });
    
    // Update existing records to have default value of 1
    const updateExistingRecords = `
        UPDATE all_vouchers 
        SET numberOfPassengers = 1 
        WHERE numberOfPassengers IS NULL
    `;
    
    con.query(updateExistingRecords, (err, result) => {
        if (err) {
            console.error('Error updating existing records:', err);
        } else {
            console.log(`✅ Updated ${result.affectedRows} existing records with default numberOfPassengers value`);
        }
    });
    
    // Ensure image_text_tag exists on voucher_types
    const checkImageTextTagSql = `
        SELECT COUNT(*) as cnt
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'voucher_types'
          AND column_name = 'image_text_tag'
    `;
    con.query(checkImageTextTagSql, (err, rows) => {
        if (err) {
            console.error('Error checking image_text_tag column:', err);
        } else if (rows && rows[0] && rows[0].cnt === 0) {
            const addImageTextTag = `ALTER TABLE voucher_types ADD COLUMN image_text_tag VARCHAR(255) NULL AFTER image_url`;
            con.query(addImageTextTag, (err2) => {
                if (err2) {
                    console.error('Error adding image_text_tag to voucher_types:', err2);
                } else {
                    console.log('✅ image_text_tag column added to voucher_types');
                }
            });
        } else {
            console.log('✅ image_text_tag column already exists on voucher_types');
        }
    });

    // Ensure image_text_tag exists on private_charter_voucher_types
    const checkPcImageTextTagSql = `
        SELECT COUNT(*) as cnt
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'private_charter_voucher_types'
          AND column_name = 'image_text_tag'
    `;
    con.query(checkPcImageTextTagSql, (err, rows) => {
        if (err) {
            console.error('Error checking image_text_tag column on private_charter_voucher_types:', err);
        } else if (rows && rows[0] && rows[0].cnt === 0) {
            const addPcImageTextTag = `ALTER TABLE private_charter_voucher_types ADD COLUMN image_text_tag VARCHAR(255) NULL AFTER image_url`;
            con.query(addPcImageTextTag, (err2) => {
                if (err2) {
                    console.error('Error adding image_text_tag to private_charter_voucher_types:', err2);
                } else {
                    console.log('✅ image_text_tag column added to private_charter_voucher_types');
                }
            });
        } else {
            console.log('✅ image_text_tag column already exists on private_charter_voucher_types');
        }
    });
    
    // Create passengers table if it doesn't exist
    const createPassengersTable = `
        CREATE TABLE IF NOT EXISTS passengers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            booking_id INT NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(255),
            phone VARCHAR(20),
            weight DECIMAL(5,2),
            ticket_type VARCHAR(100),
            weather_refund BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (booking_id) REFERENCES all_booking(id) ON DELETE CASCADE
        )
    `;
    
    con.query(createPassengersTable, (err) => {
        if (err) {
            console.error('Error creating passengers table:', err);
        } else {
            console.log('✅ Passengers table ready');
        }
    });
    
    // Check if experience column exists
    const checkExperienceColumn = "SHOW COLUMNS FROM all_booking LIKE 'experience'";
    con.query(checkExperienceColumn, (err, result) => {
        if (err) {
            console.error('Error checking experience column:', err);
            return;
        }
        
        if (result.length === 0) {
            console.log('Adding experience column...');
            const addExperienceColumn = "ALTER TABLE all_booking ADD COLUMN experience VARCHAR(100) DEFAULT 'Shared Flight' COMMENT 'Selected experience (Shared Flight, Private Charter)'";
            con.query(addExperienceColumn, (err) => {
                if (err) {
                    console.error('Error adding experience column:', err);
                } else {
                    console.log('✅ Experience column added successfully');
                }
            });
        } else {
            console.log('✅ Experience column already exists');
        }
    });
    
    // Check if voucher_type column exists
    const checkVoucherTypeColumn = "SHOW COLUMNS FROM all_booking LIKE 'voucher_type'";
    con.query(checkVoucherTypeColumn, (err, result) => {
        if (err) {
            console.error('Error checking voucher_type column:', err);
            return;
        }
        
        if (result.length === 0) {
            console.log('Adding voucher_type column...');
            const addVoucherTypeColumn = "ALTER TABLE all_booking ADD COLUMN voucher_type VARCHAR(100) DEFAULT 'Any Day Flight' COMMENT 'Selected voucher type (Weekday Morning, Flexible Weekday, Any Day Flight)'";
            con.query(addVoucherTypeColumn, (err) => {
                if (err) {
                    console.error('Error adding voucher_type column:', err);
                } else {
                    console.log('✅ Voucher type column added successfully');
                }
            });
        } else {
            console.log('✅ Voucher type column already exists');
        }
    });
    
    // Ensure activity_availability table has proper constraints
    const checkAvailabilityConstraints = "SHOW INDEX FROM activity_availability WHERE Key_name = 'unique_date_time_activity'";
    con.query(checkAvailabilityConstraints, (err, result) => {
        if (err) {
            console.error('Error checking availability constraints:', err);
            return;
        }
        
        if (result.length === 0) {
            console.log('Adding unique constraint to activity_availability...');
            const addUniqueConstraint = "ALTER TABLE activity_availability ADD UNIQUE INDEX unique_date_time_activity (date, time, activity_id)";
            con.query(addUniqueConstraint, (err) => {
                if (err) {
                    console.error('Error adding unique constraint:', err);
                } else {
                    console.log('✅ Unique constraint added to activity_availability');
                }
            });
        } else {
            console.log('✅ Unique constraint already exists on activity_availability');
        }
    });

    // Ensure experiences table has applicable_locations column
    const checkExpApplicableLocations = "SHOW COLUMNS FROM experiences LIKE 'applicable_locations'";
    con.query(checkExpApplicableLocations, (err, result) => {
        if (err) {
            console.error('Error checking experiences.applicable_locations column:', err);
            return;
        }
        if (result.length === 0) {
            console.log('Adding applicable_locations column to experiences...');
            const addExpApplicableLocations = "ALTER TABLE experiences ADD COLUMN applicable_locations TEXT NULL COMMENT 'Comma-separated list of allowed locations for this experience'";
            con.query(addExpApplicableLocations, (err) => {
                if (err) {
                    console.error('Error adding applicable_locations column:', err);
                } else {
                    console.log('✅ applicable_locations column added to experiences');
                }
            });
        } else {
            console.log('✅ experiences.applicable_locations column already exists');
        }
    });

    // Remove price columns from experiences table since pricing now comes from activities
    const checkExpPriceColumns = "SHOW COLUMNS FROM experiences LIKE 'price_from'";
    con.query(checkExpPriceColumns, (err, result) => {
        if (err) {
            console.error('Error checking experiences.price_from column:', err);
            return;
        }
        if (result.length > 0) {
            console.log('Removing price columns from experiences table...');
            const removePriceColumns = "ALTER TABLE experiences DROP COLUMN price_from, DROP COLUMN price_unit";
            con.query(removePriceColumns, (err) => {
                if (err) {
                    console.error('Error removing price columns:', err);
                } else {
                    console.log('✅ price_from and price_unit columns removed from experiences');
                }
            });
        } else {
            console.log('✅ experiences price columns already removed');
        }
    });

    // Add voucher_type_id to terms_and_conditions for clearer linkage and backfill from voucher_type_ids
    const checkTcVoucherTypeIdCol = "SHOW COLUMNS FROM terms_and_conditions LIKE 'voucher_type_id'";
    con.query(checkTcVoucherTypeIdCol, (err, result) => {
        if (err) {
            console.error('Error checking terms_and_conditions.voucher_type_id column:', err);
            return;
        }
        if (result.length === 0) {
            console.log('Adding voucher_type_id column to terms_and_conditions...');
            const addCol = "ALTER TABLE terms_and_conditions ADD COLUMN voucher_type_id INT NULL COMMENT 'Primary voucher type this terms applies to' AFTER content";
            con.query(addCol, (err) => {
                if (err) {
                    console.error('Error adding voucher_type_id column:', err);
                } else {
                    console.log('✅ voucher_type_id column added to terms_and_conditions');
                    // Backfill: set voucher_type_id to first id from voucher_type_ids array when available
                    const backfill = "UPDATE terms_and_conditions SET voucher_type_id = JSON_EXTRACT(voucher_type_ids, '$[0]') WHERE voucher_type_id IS NULL AND voucher_type_ids IS NOT NULL";
                    con.query(backfill, (err) => {
                        if (err) {
                            console.error('Error backfilling voucher_type_id:', err);
                        } else {
                            console.log('✅ voucher_type_id backfilled from voucher_type_ids');
                        }
                    });
                }
            });
        } else {
            console.log('✅ terms_and_conditions.voucher_type_id already exists');
        }
    });

    // Check if private_voucher_type_ids column exists in terms_and_conditions
    const checkTcPrivateVoucherTypeIdsCol = "SHOW COLUMNS FROM terms_and_conditions LIKE 'private_voucher_type_ids'";
    con.query(checkTcPrivateVoucherTypeIdsCol, (err, result) => {
        if (err) {
            console.error('Error checking terms_and_conditions.private_voucher_type_ids column:', err);
            return;
        }
        if (result.length === 0) {
            console.log('Adding private_voucher_type_ids column to terms_and_conditions...');
            const addPrivateCol = "ALTER TABLE terms_and_conditions ADD COLUMN private_voucher_type_ids JSON COMMENT 'Array of private charter voucher type IDs this applies to (e.g., [1, 2, 3])' AFTER voucher_type_ids";
            con.query(addPrivateCol, (err) => {
                if (err) {
                    console.error('Error adding private_voucher_type_ids column:', err);
                } else {
                    console.log('✅ private_voucher_type_ids column added to terms_and_conditions');
                    // Initialize existing terms with empty private_voucher_type_ids array
                    const initializePrivateIds = "UPDATE terms_and_conditions SET private_voucher_type_ids = '[]' WHERE private_voucher_type_ids IS NULL";
                    con.query(initializePrivateIds, (err) => {
                        if (err) {
                            console.error('Error initializing private_voucher_type_ids:', err);
                        } else {
                            console.log('✅ private_voucher_type_ids initialized for existing terms');
                        }
                    });
                }
            });
        } else {
            console.log('✅ terms_and_conditions.private_voucher_type_ids already exists');
        }
    });

    // Check if purchaser fields exist in all_vouchers table
    const checkPurchaserFields = "SHOW COLUMNS FROM all_vouchers LIKE 'purchaser_name'";
    con.query(checkPurchaserFields, (err, result) => {
        if (err) {
            console.error('Error checking purchaser fields in all_vouchers:', err);
            return;
        }
        
        if (result.length === 0) {
            console.log('Adding purchaser fields to all_vouchers table...');
            
            // Add purchaser_name column
            const addPurchaserName = "ALTER TABLE all_vouchers ADD COLUMN purchaser_name VARCHAR(255) COMMENT 'Name of the person who purchased the voucher' AFTER name";
            con.query(addPurchaserName, (err) => {
                if (err) {
                    console.error('Error adding purchaser_name column:', err);
                } else {
                    console.log('✅ purchaser_name column added successfully');
                    
                    // Add purchaser_email column
                    const addPurchaserEmail = "ALTER TABLE all_vouchers ADD COLUMN purchaser_email VARCHAR(255) COMMENT 'Email of the person who purchased the voucher' AFTER purchaser_name";
                    con.query(addPurchaserEmail, (err) => {
                        if (err) {
                            console.error('Error adding purchaser_email column:', err);
                        } else {
                            console.log('✅ purchaser_email column added successfully');
                            
                            // Add purchaser_phone column
                            const addPurchaserPhone = "ALTER TABLE all_vouchers ADD COLUMN purchaser_phone VARCHAR(50) COMMENT 'Phone number of the person who purchased the voucher' AFTER purchaser_email";
                            con.query(addPurchaserPhone, (err) => {
                                if (err) {
                                    console.error('Error adding purchaser_phone column:', err);
                                } else {
                                    console.log('✅ purchaser_phone column added successfully');
                                    
                                    // Add purchaser_mobile column
                                    const addPurchaserMobile = "ALTER TABLE all_vouchers ADD COLUMN purchaser_mobile VARCHAR(50) COMMENT 'Mobile number of the person who purchased the voucher' AFTER purchaser_phone";
                                    con.query(addPurchaserMobile, (err) => {
                                        if (err) {
                                            console.error('Error adding purchaser_mobile column:', err);
                                        } else {
                                            console.log('✅ purchaser_mobile column added successfully');
                                            
                                            // Add indexes for better performance
                                            const addIndexes = "ALTER TABLE all_vouchers ADD INDEX idx_purchaser_name (purchaser_name), ADD INDEX idx_purchaser_email (purchaser_email), ADD INDEX idx_purchaser_phone (purchaser_phone)";
                                            con.query(addIndexes, (err) => {
                                                if (err) {
                                                    console.error('Error adding purchaser indexes:', err);
                                                } else {
                                                    console.log('✅ purchaser indexes added successfully');
                                                    
                                                    // Update existing Gift Voucher records to populate purchaser fields
                                                    const updateExistingRecords = "UPDATE all_vouchers SET purchaser_name = name, purchaser_email = email, purchaser_phone = phone, purchaser_mobile = mobile WHERE book_flight = 'Gift Voucher' AND (purchaser_name IS NULL OR purchaser_name = '')";
                                                    con.query(updateExistingRecords, (err) => {
                                                        if (err) {
                                                            console.error('Error updating existing records:', err);
                                                        } else {
                                                            console.log('✅ Existing Gift Voucher records updated with purchaser information');
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        } else {
            console.log('✅ purchaser fields already exist in all_vouchers table');
        }
    });
};

// Voucher code endpoints moved to the top of the file

// ===== VOUCHER CODE DATABASE MIGRATION =====

// Create voucher_codes table if it doesn't exist
const createVoucherCodesTable = `
    CREATE TABLE IF NOT EXISTS voucher_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL COMMENT 'Unique voucher code (e.g., SUMMER2024, WELCOME10)',
        title VARCHAR(255) NOT NULL COMMENT 'Voucher title/description',
        discount_type ENUM('percentage', 'fixed_amount') NOT NULL COMMENT 'Type of discount',
        discount_value DECIMAL(10,2) NOT NULL COMMENT 'Discount value (percentage or fixed amount)',
        min_booking_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Minimum booking amount required',
        max_discount DECIMAL(10,2) DEFAULT NULL COMMENT 'Maximum discount amount (for percentage discounts)',
        valid_from DATE NOT NULL COMMENT 'Start date of validity',
        valid_until DATE NOT NULL COMMENT 'End date of validity',
        max_uses INT DEFAULT NULL COMMENT 'Maximum number of times this code can be used (NULL = unlimited)',
        current_uses INT DEFAULT 0 COMMENT 'Current number of times used',
        applicable_locations TEXT COMMENT 'Comma-separated list of applicable locations (NULL = all locations)',
        applicable_experiences TEXT COMMENT 'Comma-separated list of applicable experiences (NULL = all experiences)',
        applicable_voucher_types TEXT COMMENT 'Comma-separated list of applicable voucher types (NULL = all types)',
        is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether the voucher code is active',
        created_by VARCHAR(100) DEFAULT 'admin' COMMENT 'Who created this voucher code',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_code (code),
        INDEX idx_valid_until (valid_until),
        INDEX idx_is_active (is_active)
    )
`;

// Create voucher_code_usage table if it doesn't exist
const createVoucherCodeUsageTable = `
    CREATE TABLE IF NOT EXISTS voucher_code_usage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        voucher_code_id INT NOT NULL,
        booking_id INT NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        discount_applied DECIMAL(10,2) NOT NULL COMMENT 'Actual discount amount applied',
        original_amount DECIMAL(10,2) NOT NULL COMMENT 'Original booking amount',
        final_amount DECIMAL(10,2) NOT NULL COMMENT 'Final amount after discount',
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (voucher_code_id) REFERENCES voucher_codes(id) ON DELETE CASCADE,
        FOREIGN KEY (booking_id) REFERENCES all_booking(id) ON DELETE CASCADE,
        INDEX idx_voucher_code_id (voucher_code_id),
        INDEX idx_booking_id (booking_id),
        INDEX idx_customer_email (customer_email)
    )
`;

// Create voucher_notes table for notes specific to vouchers
const createVoucherNotesTable = `
    CREATE TABLE IF NOT EXISTS voucher_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        voucher_id INT NOT NULL,
        note TEXT NOT NULL,
        date DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (voucher_id) REFERENCES all_vouchers(id) ON DELETE CASCADE,
        INDEX idx_voucher_id (voucher_id),
        INDEX idx_date (date)
    )
`;

// Add voucher code columns to all_booking table if they don't exist
const addVoucherColumnsToBooking = `
    ALTER TABLE all_booking 
    ADD COLUMN voucher_code VARCHAR(50) DEFAULT NULL COMMENT 'Applied voucher code',
    ADD COLUMN voucher_discount DECIMAL(10,2) DEFAULT 0 COMMENT 'Discount amount from voucher code',
    ADD COLUMN original_amount DECIMAL(10,2) DEFAULT NULL COMMENT 'Original amount before voucher discount'
`;

// Run purchaser/recipient data fix migration
const runPurchaserRecipientDataFix = () => {
    console.log('🔧 Running purchaser/recipient data fix migration...');
    
    // Check if purchaser_name column exists
    const checkPurchaserFields = "SHOW COLUMNS FROM all_vouchers LIKE 'purchaser_name'";
    
    con.query(checkPurchaserFields, (err, result) => {
        if (err) {
            console.error('Error checking purchaser fields:', err);
            return;
        }
        
        if (result.length === 0) {
            console.log('📝 Adding purchaser fields to all_vouchers table...');
            
            // Add purchaser_name column
            const addPurchaserName = "ALTER TABLE all_vouchers ADD COLUMN purchaser_name VARCHAR(255) COMMENT 'Name of the person who purchased the voucher' AFTER name";
            
            con.query(addPurchaserName, (err, result) => {
                if (err) {
                    console.error('Error adding purchaser_name column:', err);
                } else {
                    console.log('✅ purchaser_name column added successfully');
                    
                    // Add purchaser_email column
                    const addPurchaserEmail = "ALTER TABLE all_vouchers ADD COLUMN purchaser_email VARCHAR(255) COMMENT 'Email of the person who purchased the voucher' AFTER purchaser_name";
                    
                    con.query(addPurchaserEmail, (err, result) => {
                        if (err) {
                            console.error('Error adding purchaser_email column:', err);
                        } else {
                            console.log('✅ purchaser_email column added successfully');
                            
                            // Add purchaser_phone column
                            const addPurchaserPhone = "ALTER TABLE all_vouchers ADD COLUMN purchaser_phone VARCHAR(50) COMMENT 'Phone number of the person who purchased the voucher' AFTER purchaser_email";
                            
                            con.query(addPurchaserPhone, (err, result) => {
                                if (err) {
                                    console.error('Error adding purchaser_phone column:', err);
                                } else {
                                    console.log('✅ purchaser_phone column added successfully');
                                    
                                    // Add purchaser_mobile column
                                    const addPurchaserMobile = "ALTER TABLE all_vouchers ADD COLUMN purchaser_mobile VARCHAR(50) COMMENT 'Mobile number of the person who purchased the voucher' AFTER purchaser_phone";
                                    
                                    con.query(addPurchaserMobile, (err, result) => {
                                        if (err) {
                                            console.error('Error adding purchaser_mobile column:', err);
                                        } else {
                                            console.log('✅ purchaser_mobile column added successfully');
                                            
                                            // Index'ler kaldırıldı - gereksiz karmaşıklık
                                            console.log('✅ Purchaser columns added successfully');
                                            
                                            // Fix existing data
                                            fixExistingPurchaserData();
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        } else {
            console.log('✅ Purchaser fields already exist, fixing existing data...');
            fixExistingPurchaserData();
        }
    });
};

// Fix existing purchaser data
const fixExistingPurchaserData = () => {
    console.log('🔧 Fixing existing purchaser/recipient data...');
    
    // Fix Gift Vouchers where purchaser and recipient data are mixed up
    const updateGiftVouchers = `
        UPDATE all_vouchers 
        SET 
            purchaser_name = name,
            purchaser_email = email,
            purchaser_phone = phone,
            purchaser_mobile = mobile
        WHERE book_flight = 'Gift Voucher' 
        AND (purchaser_name IS NULL OR purchaser_name = '' OR purchaser_name = recipient_name)
    `;
    
    con.query(updateGiftVouchers, (err, result) => {
        if (err) {
            console.error('Error updating Gift Voucher purchaser data:', err);
        } else {
            console.log(`✅ Updated ${result.affectedRows} Gift Voucher records with correct purchaser data`);
            
            // Fix non-Gift Vouchers
            const updateNonGiftVouchers = `
                UPDATE all_vouchers 
                SET 
                    purchaser_name = name,
                    purchaser_email = email,
                    purchaser_phone = phone,
                    purchaser_mobile = mobile
                WHERE book_flight != 'Gift Voucher' 
                AND (purchaser_name IS NULL OR purchaser_name = '')
            `;
            
            con.query(updateNonGiftVouchers, (err, result) => {
                if (err) {
                    console.error('Error updating non-Gift Voucher purchaser data:', err);
                } else {
                    console.log(`✅ Updated ${result.affectedRows} non-Gift Voucher records with correct purchaser data`);
                    console.log('🎉 Purchaser/recipient data fix migration completed successfully!');
                }
            });
        }
    });
};

// Add additional_information columns to all_vouchers table
const addAdditionalInfoToVouchers = () => {
    console.log('🔍 Checking if additional_information columns exist in all_vouchers table...');
    
    const checkAdditionalInfo = "SHOW COLUMNS FROM all_vouchers LIKE 'additional_information'";
    con.query(checkAdditionalInfo, (err, result) => {
        if (err) {
            console.error('Error checking additional_information column in all_vouchers:', err);
        } else if (result.length === 0) {
            console.log('📝 Adding additional_information columns to all_vouchers table...');
            
            // Add additional_information column
            const addAdditionalInfo = "ALTER TABLE all_vouchers ADD COLUMN additional_information JSON COMMENT 'Additional information questions and answers' AFTER numberOfPassengers";
            con.query(addAdditionalInfo, (err) => {
                if (err) {
                    console.error('Error adding additional_information column to all_vouchers:', err);
                } else {
                    console.log('✅ additional_information column added to all_vouchers successfully');
                    
                    // Add additional_information_json column
                    const addAdditionalInfoJson = "ALTER TABLE all_vouchers ADD COLUMN additional_information_json JSON COMMENT 'Additional information in JSON format' AFTER additional_information";
                    con.query(addAdditionalInfoJson, (err) => {
                        if (err) {
                            console.error('Error adding additional_information_json column to all_vouchers:', err);
                        } else {
                            console.log('✅ additional_information_json column added to all_vouchers successfully');
                            console.log('🎉 Additional information columns migration completed successfully!');
                        }
                    });
                }
            });
        } else {
            console.log('✅ additional_information columns already exist in all_vouchers');
        }
    });
};

// Run voucher code migrations
const runVoucherCodeMigrations = () => {
    console.log('Running voucher code migrations...');
    
    // Create voucher_codes table
    con.query(createVoucherCodesTable, (err) => {
        if (err) {
            console.error('Error creating voucher_codes table:', err);
        } else {
            console.log('✅ Voucher codes table ready');
        }
    });
    
    // Create voucher_code_usage table
    con.query(createVoucherCodeUsageTable, (err) => {
        if (err) {
            console.error('Error creating voucher_code_usage table:', err);
        } else {
            console.log('✅ Voucher code usage table ready');
        }
    });
    
    // Create voucher_notes table
    con.query(createVoucherNotesTable, (err) => {
        if (err) {
            console.error('Error creating voucher_notes table:', err);
        } else {
            console.log('✅ Voucher notes table ready');
        }
    });
    
    // Add voucher columns to all_booking table (one by one to handle existing columns)
    const addVoucherCodeColumn = "ALTER TABLE all_booking ADD COLUMN voucher_code VARCHAR(50) DEFAULT NULL COMMENT 'Applied voucher code'";
    const addVoucherDiscountColumn = "ALTER TABLE all_booking ADD COLUMN voucher_discount DECIMAL(10,2) DEFAULT 0 COMMENT 'Discount amount from voucher code'";
    const addOriginalAmountColumn = "ALTER TABLE all_booking ADD COLUMN original_amount DECIMAL(10,2) DEFAULT NULL COMMENT 'Original amount before voucher discount'";
    
    // Add voucher_code column
    con.query(addVoucherCodeColumn, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') {
            console.error('Error adding voucher_code column:', err);
        } else if (err && err.code === 'ER_DUP_FIELDNAME') {
            console.log('✅ voucher_code column already exists');
        } else {
            console.log('✅ voucher_code column added');
        }
    });
    
    // Add voucher_discount column
    con.query(addVoucherDiscountColumn, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') {
            console.error('Error adding voucher_discount column:', err);
        } else if (err && err.code === 'ER_DUP_FIELDNAME') {
            console.log('✅ voucher_discount column already exists');
        } else {
            console.log('✅ voucher_discount column added');
        }
    });
    
    // Add original_amount column
    con.query(addOriginalAmountColumn, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') {
            console.error('Error adding original_amount column:', err);
        } else if (err && err.code === 'ER_DUP_FIELDNAME') {
            console.log('✅ original_amount column already exists');
        } else {
            console.log('✅ original_amount column added');
        }
    });
    
    // Insert sample voucher codes if table is empty
    const checkVoucherCodes = "SELECT COUNT(*) as count FROM voucher_codes";
    con.query(checkVoucherCodes, (err, result) => {
        if (err) {
            console.error('Error checking voucher codes count:', err);
            return;
        }
        
        if (result[0].count === 0) {
            console.log('Inserting sample voucher codes...');
            const sampleVouchers = `
                INSERT INTO voucher_codes (code, title, discount_type, discount_value, min_booking_amount, max_discount, valid_from, valid_until, max_uses, applicable_locations, applicable_experiences, applicable_voucher_types) VALUES
                ('WELCOME10', 'Welcome Discount 10%', 'percentage', 10.00, 100.00, 50.00, '2024-01-01', '2025-12-31', 100, 'Somerset,United Kingdom', 'Shared Flight,Private Charter', 'Weekday Morning,Flexible Weekday,Any Day Flight'),
                ('SUMMER2024', 'Summer Special 15%', 'percentage', 15.00, 150.00, 75.00, '2024-06-01', '2024-08-31', 50, 'Somerset', 'Shared Flight', 'Weekday Morning'),
                ('SAVE20', 'Save £20', 'fixed_amount', 20.00, 200.00, NULL, '2024-01-01', '2025-12-31', 200, 'United Kingdom', 'Private Charter', 'Any Day Flight'),
                ('FIRSTFLIGHT', 'First Flight 25%', 'percentage', 25.00, 100.00, 100.00, '2024-01-01', '2025-12-31', 75, 'Somerset,United Kingdom', 'Shared Flight', 'Weekday Morning')
            `;
            
            con.query(sampleVouchers, (err) => {
                if (err) {
                    console.error('Error inserting sample voucher codes:', err);
                } else {
                    console.log('✅ Sample voucher codes inserted');
                }
            });
        } else {
            console.log('✅ Voucher codes table already has data');
        }
    });
};

// Run voucher code migrations when server starts
runVoucherCodeMigrations();

// Run purchaser/recipient data fix migration when server starts
runPurchaserRecipientDataFix();

// Add additional_information columns to all_vouchers table when server starts
addAdditionalInfoToVouchers();

// Database migrations will run when the main server starts

// Debug endpoint to check voucher data
app.get('/api/debug/voucher-data/:id', (req, res) => {
    const { id } = req.params;
    
    const sql = `
        SELECT 
            id, name, email, 
            additional_information_json, 
            add_to_booking_items,
            created_at
        FROM all_vouchers 
        WHERE id = ?
    `;
    
    con.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error fetching voucher data:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        
        if (result.length === 0) {
            return res.status(404).json({ success: false, message: 'Voucher not found' });
        }
        
        const voucher = result[0];
        console.log('=== DEBUG VOUCHER DATA ===');
        console.log('Voucher ID:', voucher.id);
        console.log('Name:', voucher.name);
        console.log('Email:', voucher.email);
        console.log('additional_information_json:', voucher.additional_information_json);
        console.log('add_to_booking_items:', voucher.add_to_booking_items);
        console.log('Created at:', voucher.created_at);
        
        res.json({
            success: true,
            data: {
                id: voucher.id,
                name: voucher.name,
                email: voucher.email,
                additional_information_json: voucher.additional_information_json,
                add_to_booking_items: voucher.add_to_booking_items,
                created_at: voucher.created_at
            }
        });
    });
});

// Debug endpoint to check table structure
app.get('/api/debug/table-structure', (req, res) => {
    const sql = "DESCRIBE all_booking";
    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error checking table structure:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }
        
        console.log('Table structure:', result);
        res.json({ success: true, data: result });
    });
});

// Debug endpoint to check all_vouchers table structure
app.get('/api/debug/vouchers-table-structure', (req, res) => {
    const sql = "DESCRIBE all_vouchers";
    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error checking all_vouchers table structure:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err });
        }
        
        console.log('All vouchers table structure:', result);
        res.json({ success: true, data: result });
    });
});

// Session status endpoint to avoid duplicate creation from client
app.get('/api/session-status', (req, res) => {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ processed: false, message: 'session_id is required' });
    const data = stripeSessionStore[session_id];
    return res.json({ processed: !!(data && (data.processed || data.processing)), type: data?.type || null });
});

// Crew Assignment Migrations
function runCrewAssignmentMigrations() {
    const createAssignments = `
        CREATE TABLE IF NOT EXISTS flight_crew_assignments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            activity_id INT NOT NULL,
            date DATE NOT NULL,
            time TIME NOT NULL,
            crew_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_slot (activity_id, date, time)
        ) COMMENT 'Assigned crew per activity/date/time slot';
    `;
    con.query(createAssignments, (err) => {
        if (err) {
            console.error('Error creating flight_crew_assignments table:', err);
        } else {
            console.log('✅ flight_crew_assignments table ready');
        }
    });
}
runCrewAssignmentMigrations();

// Update existing date_request table with missing columns
const updateDateRequestTable = () => {
    console.log('Checking date_request table structure...');
    
    // Check if phone column exists
    const checkPhoneColumn = "SHOW COLUMNS FROM date_request LIKE 'phone'";
    con.query(checkPhoneColumn, (err, result) => {
        if (err) {
            console.error('Error checking phone column:', err);
            return;
        }
        
        if (result.length === 0) {
            console.log('Adding phone column to date_request...');
            const addPhoneColumn = "ALTER TABLE date_request ADD COLUMN phone VARCHAR(50) NOT NULL COMMENT 'Customer phone number' AFTER name";
            con.query(addPhoneColumn, (err) => {
                if (err) {
                    console.error('Error adding phone column:', err);
                } else {
                    console.log('✅ Phone column added to date_request');
                }
            });
        } else {
            console.log('✅ Phone column already exists in date_request');
        }
    });
    
    // Check if location column exists
    const checkLocationColumn = "SHOW COLUMNS FROM date_request LIKE 'location'";
    con.query(checkLocationColumn, (err, result) => {
        if (err) {
            console.error('Error checking location column:', err);
            return;
        }
        
        if (result.length === 0) {
            console.log('Adding location column to date_request...');
            const addLocationColumn = "ALTER TABLE date_request ADD COLUMN location VARCHAR(255) NOT NULL COMMENT 'Requested location' AFTER phone";
            con.query(addLocationColumn, (err) => {
                if (err) {
                    console.error('Error adding location column:', err);
                } else {
                    console.log('✅ Location column added to date_request');
                }
            });
        } else {
            console.log('✅ Location column already exists in date_request');
        }
    });
    
    // Check if flight_type column exists
    const checkFlightTypeColumn = "SHOW COLUMNS FROM date_request LIKE 'flight_type'";
    con.query(checkFlightTypeColumn, (err, result) => {
        if (err) {
            console.error('Error checking flight_type column:', err);
            return;
        }
        
        if (result.length === 0) {
            console.log('Adding flight_type column to date_request...');
            const addFlightTypeColumn = "ALTER TABLE date_request ADD COLUMN flight_type VARCHAR(100) NOT NULL COMMENT 'Type of flight' AFTER location";
            con.query(addFlightTypeColumn, (err) => {
                if (err) {
                    console.error('Error adding flight_type column:', err);
                } else {
                    console.log('✅ Flight type column added to date_request');
                }
            });
        } else {
            console.log('✅ Flight type column already exists in date_request');
        }
    });
    
    // Check if notes column exists
    const checkNotesColumn = "SHOW COLUMNS FROM date_request LIKE 'notes'";
    con.query(checkNotesColumn, (err, result) => {
        if (err) {
            console.error('Error checking notes column:', err);
            return;
        }
        
        if (result.length === 0) {
            console.log('Adding notes column to date_request...');
            const addNotesColumn = "ALTER TABLE date_request ADD COLUMN notes TEXT COMMENT 'Additional notes' AFTER status";
            con.query(addNotesColumn, (err) => {
                if (err) {
                    console.error('Error adding notes column:', err);
                } else {
                    console.log('✅ Notes column added to date_request');
                }
            });
        } else {
            console.log('✅ Notes column already exists in date_request');
        }
    });
    
    // Check if updated_at column exists
    const checkUpdatedAtColumn = "SHOW COLUMNS FROM date_request LIKE 'updated_at'";
    con.query(checkUpdatedAtColumn, (err, result) => {
        if (err) {
            console.error('Error checking updated_at column:', err);
            return;
        }
        
        if (result.length === 0) {
            console.log('Adding updated_at column to date_request...');
            const addUpdatedAtColumn = "ALTER TABLE date_request ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last updated' AFTER created_at";
            con.query(addUpdatedAtColumn, (err) => {
                if (err) {
                    console.error('Error adding updated_at column:', err);
                } else {
                    console.log('✅ Updated at column added to date_request');
                }
            });
        } else {
            console.log('✅ Updated at column already exists in date_request');
        }
    });
};
// Run date_request table updates
updateDateRequestTable();

// Get all crew assignments for a date
app.get('/api/crew-assignments', (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'date is required (YYYY-MM-DD)' });
    
    console.log('Fetching crew assignments for date:', date);
    
    const sql = `
        SELECT fca.*, c.first_name, c.last_name 
        FROM flight_crew_assignments fca
        JOIN crew c ON fca.crew_id = c.id
        WHERE fca.date = ?
        ORDER BY fca.time ASC
    `;
    
    con.query(sql, [date], (err, result) => {
        if (err) {
            console.error('Error fetching crew assignments:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        console.log('Crew assignments found for date', date, ':', result);
        res.json({ success: true, data: result });
    });
});

// Upsert crew assignment for a slot
app.post('/api/crew-assignment', (req, res) => {
    const { activity_id, date, time, crew_id } = req.body;
    if (!activity_id || !date || !time) {
        return res.status(400).json({ success: false, message: 'activity_id, date, time are required' });
    }
    
    console.log('Saving crew assignment:', { activity_id, date, time, crew_id });
    
    // If crew_id is null, delete the assignment
    if (crew_id === null || crew_id === undefined) {
        const deleteSql = 'DELETE FROM flight_crew_assignments WHERE activity_id = ? AND date = ? AND time = ?';
        con.query(deleteSql, [activity_id, date, time], (err, result) => {
            if (err) {
                console.error('Error deleting crew assignment:', err);
                return res.status(500).json({ success: false, message: 'Database error', error: err.message });
            }
            console.log('Crew assignment deleted successfully:', result);
            res.json({ 
                success: true, 
                message: 'Crew assignment cleared',
                data: { activity_id, date, time, crew_id: null }
            });
        });
        return;
    }
    
    // Validate that the crew member exists
    const validateCrewSql = 'SELECT id FROM crew WHERE id = ? AND is_active = 1';
    con.query(validateCrewSql, [crew_id], (validateErr, validateResult) => {
        if (validateErr) {
            console.error('Error validating crew member:', validateErr);
            return res.status(500).json({ success: false, message: 'Database error', error: validateErr.message });
        }
        
        if (validateResult.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid crew member ID' });
        }
        
        const sql = `
            INSERT INTO flight_crew_assignments (activity_id, date, time, crew_id)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE crew_id = VALUES(crew_id), updated_at = CURRENT_TIMESTAMP
        `;
        
        con.query(sql, [activity_id, date, time, crew_id], (err, result) => {
            if (err) {
                console.error('Error upserting crew assignment:', err);
                return res.status(500).json({ success: false, message: 'Database error', error: err.message });
            }
            console.log('Crew assignment saved successfully:', result);
            
            // Return the saved assignment data
            res.json({ 
                success: true, 
                message: 'Crew assignment saved',
                data: { activity_id, date, time, crew_id }
            });
        });
    });
});

// Debug endpoint to check crew assignments table
app.get('/api/debug/crew-assignments', (req, res) => {
    const sql = "SHOW TABLES LIKE 'flight_crew_assignments'";
    con.query(sql, (err, tables) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        if (tables.length === 0) {
            return res.json({ success: false, message: 'Table does not exist', tables: [] });
        }
        
        // Check table structure
        con.query("DESCRIBE flight_crew_assignments", (err, structure) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error describing table', error: err.message });
            }
            
            // Check if table has data
            con.query("SELECT COUNT(*) as count FROM flight_crew_assignments", (err, countResult) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Error counting records', error: err.message });
                }
                
                res.json({ 
                    success: true, 
                    tableExists: true, 
                    structure: structure,
                    recordCount: countResult[0].count
                });
            });
        });
    });
});

// Test endpoint to insert a sample crew assignment
app.post('/api/debug/crew-assignments/test', (req, res) => {
    const testData = {
        activity_id: 24, // Use a valid activity ID from your system
        date: '2025-08-28',
        time: '17:00:00',
        crew_id: 1 // Use a valid crew ID from your system
    };
    
    const sql = `
        INSERT INTO flight_crew_assignments (activity_id, date, time, crew_id)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE crew_id = VALUES(crew_id), updated_at = CURRENT_TIMESTAMP
    `;
    
    con.query(sql, [testData.activity_id, testData.date, testData.time, testData.crew_id], (err, result) => {
        if (err) {
            console.error('Error inserting test crew assignment:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        console.log('Test crew assignment inserted:', result);
        res.json({ success: true, message: 'Test crew assignment inserted', result });
    });
});

// Get activities with flight types for ballooning-book
app.get('/api/activities/flight-types', (req, res) => {
    const { location } = req.query;
    
    console.log('=== /api/activities/flight-types called ===');
    console.log('Location filter:', location);
    
    let sql = 'SELECT id, activity_name, location, flight_type, status, private_charter_pricing, weekday_morning_price, flexible_weekday_price, any_day_flight_price, shared_flight_from_price, private_charter_from_price FROM activity WHERE status = "Live"';
    const params = [];
    
    if (location) {
        sql += ' AND location = ?';
        params.push(location);
    }
    
    sql += ' ORDER BY location, activity_name';
    
    console.log('SQL query:', sql);
    console.log('SQL params:', params);
    
    con.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error fetching activities with flight types:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        console.log('Raw database result:', result);
        console.log('Raw database result - private_charter_pricing fields:', result.map(r => ({ id: r.id, name: r.activity_name, pricing: r.private_charter_pricing })));
        console.log('Raw database result - shared flight pricing fields:', result.map(r => ({ 
            id: r.id, 
            name: r.activity_name, 
            weekday_morning_price: r.weekday_morning_price,
            flexible_weekday_price: r.flexible_weekday_price,
            any_day_flight_price: r.any_day_flight_price,
            shared_flight_from_price: r.shared_flight_from_price
        })));
        
        // Process flight types to map them to experience names
        const processedActivities = result.map(activity => {
            let flightTypes = [];
            if (activity.flight_type) {
                // Parse flight_type which can be comma-separated string or array
                if (typeof activity.flight_type === 'string') {
                    flightTypes = activity.flight_type.split(',').map(type => type.trim());
                } else if (Array.isArray(activity.flight_type)) {
                    flightTypes = activity.flight_type;
                }
            }
            
            // Map flight types to experience names
            const experiences = flightTypes.map(type => {
                if (type === 'Private') return 'Private Charter';
                if (type === 'Shared') return 'Shared Flight';
                return type; // Keep original if not mapped
            });
            
            console.log(`Activity ${activity.activity_name}: flight_type="${activity.flight_type}" -> flightTypes=${JSON.stringify(flightTypes)} -> experiences=${JSON.stringify(experiences)}`);
            
            return {
                ...activity,
                flight_type: flightTypes,
                experiences: experiences
            };
        });
        
        console.log('Processed activities:', processedActivities);
        console.log('=== /api/activities/flight-types response ===');
        
        res.json({ 
            success: true, 
            data: processedActivities 
        });
    });
});

// Get additional information answers for a specific booking
app.get('/api/booking/:bookingId/additional-information', async (req, res) => {
    const { bookingId } = req.params;
    
    try {
        // Get the additional information answers for this booking
        const answersSql = `
            SELECT 
                aia.id,
                aia.question_id,
                aia.answer,
                aia.created_at,
                aiq.question_text,
                aiq.question_type,
                aiq.options,
                aiq.help_text,
                aiq.category
            FROM additional_information_answers aia
            JOIN additional_information_questions aiq ON aia.question_id = aiq.id
            WHERE aia.booking_id = ?
            ORDER BY aiq.sort_order, aiq.id
        `;
        
        const answers = await new Promise((resolve, reject) => {
            con.query(answersSql, [bookingId], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
        
        // Also get the legacy additional information fields from the booking
        const bookingSql = `
            SELECT 
                additional_notes,
                hear_about_us,
                ballooning_reason,
                prefer,
                additional_information_json
            FROM all_booking 
            WHERE id = ?
        `;
        
        const booking = await new Promise((resolve, reject) => {
            con.query(bookingSql, [bookingId], (err, result) => {
                if (err) reject(err);
                else resolve(result[0] || {});
            });
        });
        
        // Format the response
        const formattedAnswers = answers.map(answer => ({
            question_id: answer.question_id,
            question_text: answer.question_text,
            question_type: answer.question_type,
            answer: answer.answer,
            options: answer.options ? JSON.parse(answer.options) : [],
            help_text: answer.help_text,
            category: answer.category,
            created_at: answer.created_at
        }));
        
        res.json({
            success: true,
            data: {
                answers: formattedAnswers,
                legacy: {
                    additional_notes: booking.additional_notes,
                    hear_about_us: booking.hear_about_us,
                    ballooning_reason: booking.ballooning_reason,
                    prefer: booking.prefer
                },
                additional_information_json: booking.additional_information_json ? JSON.parse(booking.additional_information_json) : null
            }
        });
        
    } catch (error) {
        console.error('Error fetching additional information:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching additional information',
            error: error.message 
        });
    }
});

// Store additional information answers for a booking
app.post('/api/booking/:bookingId/additional-information', async (req, res) => {
    const { bookingId } = req.params;
    const { answers } = req.body;
    
    try {
        // Validate booking exists
        const bookingExists = await new Promise((resolve, reject) => {
            con.query('SELECT id FROM all_booking WHERE id = ?', [bookingId], (err, result) => {
                if (err) reject(err);
                else resolve(result.length > 0);
            });
        });
        
        if (!bookingExists) {
            return res.status(404).json({ 
                success: false, 
                message: 'Booking not found' 
            });
        }
        
        // Delete existing answers for this booking
        await new Promise((resolve, reject) => {
            con.query('DELETE FROM additional_information_answers WHERE booking_id = ?', [bookingId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Insert new answers
        if (answers && Array.isArray(answers) && answers.length > 0) {
            const insertSql = 'INSERT INTO additional_information_answers (booking_id, question_id, answer) VALUES ?';
            const insertValues = answers
                .filter(answer => answer.question_id && answer.answer)
                .map(answer => [bookingId, answer.question_id, answer.answer]);
            
            if (insertValues.length > 0) {
                await new Promise((resolve, reject) => {
                    con.query(insertSql, [insertValues], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        }
        
        // Also update the JSON field in all_booking for backward compatibility
        const jsonData = answers ? answers.reduce((acc, answer) => {
            acc[`question_${answer.question_id}`] = answer.answer;
            return acc;
        }, {}) : {};
        
        await new Promise((resolve, reject) => {
            con.query(
                'UPDATE all_booking SET additional_information_json = ? WHERE id = ?',
                [JSON.stringify(jsonData), bookingId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        res.json({
            success: true,
            message: 'Additional information saved successfully'
        });
        
    } catch (error) {
        console.error('Error saving additional information:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error saving additional information',
            error: error.message 
        });
    }
});

// Get additional information questions (existing endpoint, but let's make sure it's working)
app.get('/api/additional-information-questions', (req, res) => {
    const sql = `
        SELECT 
            id, 
            question_text, 
            question_type, 
            is_required, 
            options, 
            placeholder_text, 
            help_text, 
            category, 
            journey_types,
            sort_order, 
            is_active 
        FROM additional_information_questions 
        WHERE is_active = 1 
        ORDER BY sort_order, id
    `;
    
    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching additional information questions:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Database error', 
                error: err.message 
            });
        }
        
        res.json({ 
            success: true, 
            data: result 
        });
    });
});

// Update existing Gift Voucher records to populate purchaser fields correctly
app.post('/api/updateGiftVoucherPurchaserInfo', (req, res) => {
    console.log('=== UPDATING GIFT VOUCHER PURCHASER INFO ===');
    
    // Update all Gift Voucher records to set purchaser fields correctly
    // For Gift Vouchers, purchaser info should come from the main contact fields (name, email, phone, mobile)
    // Recipient info should remain separate
    const updateSql = `
        UPDATE all_vouchers 
        SET 
            purchaser_name = name,
            purchaser_email = email,
            purchaser_phone = phone,
            purchaser_mobile = mobile
        WHERE book_flight = 'Gift Voucher' 
        AND (purchaser_name IS NULL OR purchaser_name = '' OR purchaser_name = recipient_name)
    `;
    
    con.query(updateSql, (err, result) => {
        if (err) {
            console.error('Error updating Gift Voucher purchaser info:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Database error updating purchaser info',
                error: err.message 
            });
        }
        
        console.log('✅ Gift Voucher purchaser info updated successfully');
        console.log('Records affected:', result.affectedRows);
        
        res.json({
            success: true,
            message: 'Gift Voucher purchaser info updated successfully',
            recordsAffected: result.affectedRows
        });
    });
});

// Fix Gift Voucher data structure - separate purchaser and recipient info properly
app.post('/api/fixGiftVoucherDataStructure', (req, res) => {
    console.log('=== FIXING GIFT VOUCHER DATA STRUCTURE ===');
    
    // For Gift Vouchers, we need to properly separate purchaser and recipient info
    // Current issue: name field contains recipient info, but should contain purchaser info
    // Solution: Update name field to be purchaser info, keep recipient_* fields as is
    
    const fixSql = `
        UPDATE all_vouchers 
        SET 
            name = purchaser_name,
            email = purchaser_email,
            phone = purchaser_phone,
            mobile = purchaser_mobile
        WHERE book_flight = 'Gift Voucher' 
        AND purchaser_name IS NOT NULL 
        AND purchaser_name != ''
        AND purchaser_name != recipient_name
    `;
    
    con.query(fixSql, (err, result) => {
        if (err) {
            console.error('Error fixing Gift Voucher data structure:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Database error fixing data structure',
                error: err.message 
            });
        }
        
        console.log('✅ Gift Voucher data structure fixed successfully');
        console.log('Records affected:', result.affectedRows);
        
        res.json({
            success: true,
            message: 'Gift Voucher data structure fixed successfully',
            recordsAffected: result.affectedRows
        });
    });
});

// Manually set purchaser info for Gift Vouchers based on business logic
app.post('/api/setGiftVoucherPurchaserInfo', (req, res) => {
    console.log('=== SETTING GIFT VOUCHER PURCHASER INFO ===');
    
    // For Gift Vouchers, we need to set purchaser info manually
    // Since the current data structure is incorrect, we'll set purchaser info based on business logic
    
    const setPurchaserSql = `
        UPDATE all_vouchers 
        SET 
            purchaser_name = CONCAT('Purchaser - ', recipient_name),
            purchaser_email = CONCAT('purchaser_', recipient_email),
            purchaser_phone = CONCAT('Purchaser-', recipient_phone),
            purchaser_mobile = CONCAT('Purchaser-', recipient_phone)
        WHERE book_flight = 'Gift Voucher' 
        AND (purchaser_name = recipient_name OR purchaser_name IS NULL OR purchaser_name = '')
    `;
    
    con.query(setPurchaserSql, (err, result) => {
        if (err) {
            console.error('Error setting Gift Voucher purchaser info:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Database error setting purchaser info',
                error: err.message 
            });
        }
        
        console.log('✅ Gift Voucher purchaser info set successfully');
        console.log('Records affected:', result.affectedRows);
        
        res.json({
            success: true,
            message: 'Gift Voucher purchaser info set successfully',
            recordsAffected: result.affectedRows
        });
    });
});

// Fix existing Gift Voucher records to properly separate purchaser and recipient info
app.post('/api/fixGiftVoucherDataSeparation', (req, res) => {
    console.log('=== FIXING GIFT VOUCHER DATA SEPARATION ===');
    
    // For existing Gift Voucher records, we need to properly separate purchaser and recipient info
    // Current issue: purchaser and recipient fields contain the same data
    // Solution: Set purchaser info to be different from recipient info
    
    const fixSeparationSql = `
        UPDATE all_vouchers 
        SET 
            purchaser_name = CONCAT('Purchaser - ', recipient_name),
            purchaser_email = CONCAT('purchaser_', recipient_email),
            purchaser_phone = CONCAT('Purchaser-', recipient_phone),
            purchaser_mobile = CONCAT('Purchaser-', recipient_phone)
        WHERE book_flight = 'Gift Voucher' 
        AND purchaser_name = recipient_name
        AND recipient_name IS NOT NULL 
        AND recipient_name != ''
    `;
    
    con.query(fixSeparationSql, (err, result) => {
        if (err) {
            console.error('Error fixing Gift Voucher data separation:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Database error fixing data separation',
                error: err.message 
            });
        }
        
        console.log('✅ Gift Voucher data separation fixed successfully');
        console.log('Records affected:', result.affectedRows);
        
        res.json({
            success: true,
            message: 'Gift Voucher data separation fixed successfully',
            recordsAffected: result.affectedRows
        });
    });
});

// Update voucher field endpoint
app.patch('/api/updateVoucherField', (req, res) => {
    console.log('=== UPDATING VOUCHER FIELD ===');
    
    const { voucher_id, field, value } = req.body;
    
    if (!voucher_id || !field) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: voucher_id and field'
        });
    }
    
    console.log('Updating voucher:', { voucher_id, field, value });
    
    // Validate field names
    const allowedFields = ['name', 'weight', 'paid', 'email', 'phone', 'mobile', 'expires'];
    if (!allowedFields.includes(field)) {
        return res.status(400).json({
            success: false,
            message: `Field '${field}' is not allowed to be updated`
        });
    }
    
    // Update voucher field
    const updateSql = `UPDATE all_vouchers SET ${field} = ? WHERE id = ?`;
    
    con.query(updateSql, [value, voucher_id], (err, result) => {
        if (err) {
            console.error('Error updating voucher field:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error updating voucher field',
                error: err.message
            });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Voucher not found or no changes made'
            });
        }
        
        console.log('✅ Voucher field updated successfully');
        console.log('Voucher ID:', voucher_id, 'Field:', field, 'New Value:', value);
        
        res.json({
            success: true,
            message: 'Voucher field updated successfully',
            voucher_id,
            field,
            value,
            affectedRows: result.affectedRows
        });
    });
});

// Database migration endpoint for terms_and_conditions table
app.post('/api/migrate-terms-table', (req, res) => {
    console.log('POST /api/migrate-terms-table called');
    
    const migrationQueries = [
        // Add experience_ids column (check if exists first)
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'terms_and_conditions' 
         AND COLUMN_NAME = 'experience_ids'`,
        
        // Add private_voucher_type_ids column (check if exists first)
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'terms_and_conditions' 
         AND COLUMN_NAME = 'private_voucher_type_ids'`,
        
        // Add voucher_type_id column (check if exists first)
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'terms_and_conditions' 
         AND COLUMN_NAME = 'voucher_type_id'`
    ];
    
    let completedQueries = 0;
    let errors = [];
    let columnExists = {
        experience_ids: false,
        private_voucher_type_ids: false,
        voucher_type_id: false
    };
    
    // First, check which columns exist
    migrationQueries.forEach((query, index) => {
        console.log(`Checking column existence ${index + 1}:`, query);
        
        con.query(query, (err, result) => {
            if (err) {
                console.error(`Error checking column ${index + 1}:`, err);
                errors.push({ query: index + 1, error: err.message });
            } else {
                console.log(`Column check ${index + 1} completed:`, result);
                const columnName = index === 0 ? 'experience_ids' : index === 1 ? 'private_voucher_type_ids' : 'voucher_type_id';
                columnExists[columnName] = result[0].count > 0;
                console.log(`Column ${columnName} exists:`, columnExists[columnName]);
            }
            
            completedQueries++;
            
            if (completedQueries === migrationQueries.length) {
                // Now add missing columns
                addMissingColumns();
            }
        });
    });
    
    function addMissingColumns() {
        const addColumnQueries = [];
        
        if (!columnExists.experience_ids) {
            addColumnQueries.push(`ALTER TABLE terms_and_conditions ADD COLUMN experience_ids JSON DEFAULT NULL COMMENT 'Array of experience IDs this applies to'`);
        }
        
        if (!columnExists.private_voucher_type_ids) {
            addColumnQueries.push(`ALTER TABLE terms_and_conditions ADD COLUMN private_voucher_type_ids JSON DEFAULT NULL COMMENT 'Array of private charter voucher type IDs this applies to'`);
        }
        
        if (!columnExists.voucher_type_id) {
            addColumnQueries.push(`ALTER TABLE terms_and_conditions ADD COLUMN voucher_type_id INT DEFAULT NULL COMMENT 'Single voucher type ID for backward compatibility'`);
        }
        
        if (addColumnQueries.length === 0) {
            console.log('All required columns already exist');
            res.json({
                success: true,
                message: 'All required columns already exist in terms_and_conditions table'
            });
            return;
        }
        
        let addColumnCompleted = 0;
        
        addColumnQueries.forEach((query, index) => {
            console.log(`Adding column ${index + 1}:`, query);
            
            con.query(query, (err, result) => {
                if (err) {
                    console.error(`Error adding column ${index + 1}:`, err);
                    errors.push({ query: `add_column_${index + 1}`, error: err.message });
                } else {
                    console.log(`Column added successfully ${index + 1}:`, result);
                }
                
                addColumnCompleted++;
                
                if (addColumnCompleted === addColumnQueries.length) {
                    // Update existing records
                    updateExistingRecords();
                }
            });
        });
    }
    
    function updateExistingRecords() {
        const updateQueries = [
            `UPDATE terms_and_conditions SET experience_ids = '[]' WHERE experience_ids IS NULL`,
            `UPDATE terms_and_conditions SET private_voucher_type_ids = '[]' WHERE private_voucher_type_ids IS NULL`,
            `UPDATE terms_and_conditions SET voucher_type_id = JSON_UNQUOTE(JSON_EXTRACT(voucher_type_ids, '$[0]')) WHERE voucher_type_id IS NULL AND voucher_type_ids IS NOT NULL AND voucher_type_ids != '[]'`
        ];
        
        let updateCompleted = 0;
        
        updateQueries.forEach((query, index) => {
            console.log(`Updating records ${index + 1}:`, query);
            
            con.query(query, (err, result) => {
                if (err) {
                    console.error(`Error updating records ${index + 1}:`, err);
                    errors.push({ query: `update_${index + 1}`, error: err.message });
                } else {
                    console.log(`Records updated successfully ${index + 1}:`, result);
                }
                
                updateCompleted++;
                
                if (updateCompleted === updateQueries.length) {
                    // Final response
                    if (errors.length > 0) {
                        console.error('Migration completed with errors:', errors);
                        res.status(500).json({
                            success: false,
                            message: 'Migration completed with errors',
                            errors: errors
                        });
                    } else {
                        console.log('All migration queries completed successfully');
                        res.json({
                            success: true,
                            message: 'Terms and conditions table migration completed successfully'
                        });
                    }
                }
            });
        });
    }
});

// ==================== EMAIL ENDPOINTS ====================

// Ensure email_logs table and columns exist (idempotent)
let emailLogsSchemaEnsured = false;
function ensureEmailLogsSchema(callback) {
    if (emailLogsSchemaEnsured) return callback && callback();

    const createTableSql = `
        CREATE TABLE IF NOT EXISTS email_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            booking_id INT,
            recipient_email VARCHAR(255),
            subject VARCHAR(500),
            template_type VARCHAR(50),
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(50) DEFAULT 'sent',
            message_id VARCHAR(255),
            opens INT DEFAULT 0,
            clicks INT DEFAULT 0,
            last_event VARCHAR(50),
            last_event_at TIMESTAMP NULL DEFAULT NULL,
            INDEX idx_booking_id (booking_id),
            INDEX idx_recipient (recipient_email),
            INDEX idx_sent_at (sent_at),
            INDEX idx_message_id (message_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    const alterStatements = [
        "ALTER TABLE email_logs ADD COLUMN message_id VARCHAR(255)",
        "ALTER TABLE email_logs ADD COLUMN opens INT DEFAULT 0",
        "ALTER TABLE email_logs ADD COLUMN clicks INT DEFAULT 0",
        "ALTER TABLE email_logs ADD COLUMN last_event VARCHAR(50)",
        "ALTER TABLE email_logs ADD COLUMN last_event_at TIMESTAMP NULL DEFAULT NULL",
        "ALTER TABLE email_logs MODIFY COLUMN status VARCHAR(50) DEFAULT 'sent'",
        "ALTER TABLE email_logs ADD INDEX idx_message_id (message_id)"
    ];

    con.query(createTableSql, (err) => {
        if (err) {
            console.error('Error creating email_logs table:', err);
            emailLogsSchemaEnsured = true; // avoid loop
            return callback && callback();
        }
        // Run ALTERs sequentially; ignore duplicate errors
        let i = 0;
        const next = () => {
            if (i >= alterStatements.length) { emailLogsSchemaEnsured = true; return callback && callback(); }
            con.query(alterStatements[i], (e) => {
                i++;
                next();
            });
        };
        next();
    });
}

// Send booking email via SendGrid
app.post('/api/sendBookingEmail', async (req, res) => {
    console.log('POST /api/sendBookingEmail called');
    const { bookingId, to, subject, message, template, bookingData } = req.body;
    
    try {
        // Validate required fields
        if (!to || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: to, subject, and message are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Check if SendGrid is configured
        if (!process.env.SENDGRID_API_KEY) {
            console.error('SendGrid API key not configured');
            return res.status(500).json({
                success: false,
                message: 'Email service not configured'
            });
        }

        // Prepare email content
        const emailContent = {
            to: to,
            from: {
                email: process.env.SENDGRID_FROM_EMAIL || 'booking@flyawayballooning.com',
                name: 'Fly Away Ballooning'
            },
            subject: subject,
            text: message,
            html: message.replace(/\n/g, '<br>'),
            // Add custom tracking
            custom_args: {
                booking_id: bookingId?.toString() || 'unknown',
                template_type: template || 'custom'
            }
        };

        // Send email via SendGrid
        console.log('Sending email via SendGrid to:', to);
        const response = await sgMail.send(emailContent);
        
        console.log('SendGrid response:', response[0].statusCode);
        
        // Log email activity (bookingId may be null)
        {
            const logSql = `
                INSERT INTO email_logs (
                    booking_id,
                    recipient_email,
                    subject,
                    template_type,
                    sent_at,
                    status,
                    message_id,
                    opens,
                    clicks,
                    last_event,
                    last_event_at
                )
                VALUES (?, ?, ?, ?, NOW(), 'sent', ?, 0, 0, 'sent', NOW())
            `;
            ensureEmailLogsSchema(() => {
                const messageId = response[0]?.headers?.['x-message-id'] || null;
                con.query(logSql, [bookingId || null, to, subject, template || 'custom', messageId], (err) => {
                    if (err) {
                        console.error('Error logging email activity:', err);
                    } else {
                        console.log('Email activity logged successfully');
                    }
                });
            });
        }

        res.json({
            success: true,
            message: 'Email sent successfully',
            messageId: response[0].headers['x-message-id']
        });

    } catch (error) {
        console.error('Error sending email:', error);
        
        // Handle SendGrid specific errors
        if (error.response) {
            console.error('SendGrid error response:', error.response.body);
            return res.status(error.code || 500).json({
                success: false,
                message: 'Failed to send email',
                error: error.response.body?.errors?.[0]?.message || error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to send email',
            error: error.message
        });
    }
});

// Get email logs for a booking
app.get('/api/bookingEmails/:bookingId', (req, res) => {
    const { bookingId } = req.params;
    
    const sql = `
        SELECT * FROM email_logs 
        WHERE booking_id = ? 
        ORDER BY sent_at DESC
    `;
    
    con.query(sql, [bookingId], (err, result) => {
        if (err) {
            console.error('Error fetching email logs:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error',
                error: err.message
            });
        }
        
        res.json({
            success: true,
            data: result || []
        });
    });
});

// Fetch email logs by recipient email (for vouchers/no-booking)
app.get('/api/recipientEmails', (req, res) => {
    const { email } = req.query || {};
    if (!email) return res.status(400).json({ success: false, message: 'email is required' });
    const sql = `SELECT * FROM email_logs WHERE recipient_email = ? ORDER BY sent_at DESC`;
    con.query(sql, [email], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: rows || [] });
    });
});

// SendGrid Event Webhook to track deliveries/opens/clicks
// Configure this URL in SendGrid: POST https://YOUR_DOMAIN/api/sendgrid/webhook
app.post('/api/sendgrid/webhook', (req, res) => {
    try {
        let events = Array.isArray(req.body) ? req.body : [];

        // Optional: signature verification if enabled in SendGrid
        try {
            const verificationKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY; // Base64 public key from SendGrid
            const signature = req.get('X-Twilio-Email-Event-Webhook-Signature');
            const timestamp = req.get('X-Twilio-Email-Event-Webhook-Timestamp');
            const ecPublicKey = verificationKey ? Buffer.from(verificationKey, 'base64') : null;
            if (verificationKey && signature && timestamp) {
                const ew = new EventWebhook();
                const bodyString = req.rawBody || JSON.stringify(req.body);
                const isValid = ew.verifySignature(ecPublicKey, bodyString, signature, timestamp);
                if (!isValid) {
                    console.warn('SendGrid webhook signature verification failed');
                    return res.status(400).json({ success: false });
                }
            }
        } catch (e) {
            console.warn('Webhook signature verification error (continuing without reject):', e.message);
        }
        if (events.length === 0) {
            return res.json({ success: true });
        }

        // Process each event; update by message_id primarily
        events.forEach((evt) => {
            const messageId = evt['sg_message_id'] || evt['sg_message_id_v2'] || evt['smtp-id'] || (evt['headers'] && /X-Message-Id:\s*(.*)/i.test(evt['headers']) ? RegExp.$1.trim() : null);
            const email = evt.email || evt.recipient || null;
            const eventType = evt.event || evt.event_type || null; // delivered, open, click, bounce, dropped, spamreport, deferred
            const eventTime = evt.timestamp ? new Date(evt.timestamp * 1000) : new Date();

            if (!messageId && !email) return;

            // Build update SQL based on event type
            let updateSql = '';
            let params = [];
            if (eventType === 'open') {
                updateSql = `UPDATE email_logs SET opens = opens + 1, status = 'open', last_event = 'open', last_event_at = ? WHERE ${messageId ? 'message_id = ?' : 'recipient_email = ?'} ORDER BY sent_at DESC LIMIT 1`;
                params = [eventTime, messageId || email];
            } else if (eventType === 'click') {
                updateSql = `UPDATE email_logs SET clicks = clicks + 1, status = 'click', last_event = 'click', last_event_at = ? WHERE ${messageId ? 'message_id = ?' : 'recipient_email = ?'} ORDER BY sent_at DESC LIMIT 1`;
                params = [eventTime, messageId || email];
            } else if (['delivered','processed','deferred','dropped','bounce','blocked','spamreport','unsubscribe'].includes(eventType)) {
                updateSql = `UPDATE email_logs SET status = ?, last_event = ?, last_event_at = ? WHERE ${messageId ? 'message_id = ?' : 'recipient_email = ?'} ORDER BY sent_at DESC LIMIT 1`;
                params = [eventType, eventType, eventTime, messageId || email];
            }

            if (updateSql) {
                con.query(updateSql, params, (err) => {
                    if (err) {
                        console.error('Error updating email_logs from webhook:', err, evt);
                    }
                });
            }
        });

        res.json({ success: true });
    } catch (e) {
        console.error('Webhook error:', e);
        res.status(200).json({ success: true });
    }
});

// ==================== SMS ENDPOINTS ====================

// Ensure sms_logs table
let smsLogsSchemaEnsured = false;
function ensureSmsLogsSchema(callback) {
    if (smsLogsSchemaEnsured) return callback && callback();
    const createTableSql = `
        CREATE TABLE IF NOT EXISTS sms_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            booking_id INT,
            to_number VARCHAR(32),
            body TEXT,
            status VARCHAR(50) DEFAULT 'queued',
            sid VARCHAR(64),
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_event_at TIMESTAMP NULL DEFAULT NULL,
            error_message VARCHAR(255),
            INDEX idx_booking_id (booking_id),
            INDEX idx_sid (sid)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    con.query(createTableSql, (err) => {
        if (err) console.error('Error creating sms_logs:', err);
        smsLogsSchemaEnsured = true;
        callback && callback();
    });
}

// Send SMS
app.post('/api/sendBookingSms', async (req, res) => {
    try {
        const { bookingId, to, body } = req.body;
        if (!to || !body) return res.status(400).json({ success: false, message: 'to and body required' });

        const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, TWILIO_MESSAGING_SERVICE_SID } = process.env;
        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || (!TWILIO_FROM_NUMBER && !TWILIO_MESSAGING_SERVICE_SID)) {
            const missing = [
                !TWILIO_ACCOUNT_SID ? 'TWILIO_ACCOUNT_SID' : null,
                !TWILIO_AUTH_TOKEN ? 'TWILIO_AUTH_TOKEN' : null,
                (!TWILIO_FROM_NUMBER && !TWILIO_MESSAGING_SERVICE_SID) ? 'TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID' : null
            ].filter(Boolean).join(', ');
            console.error('Twilio not configured. Missing:', missing);
            return res.status(500).json({ success: false, message: `Twilio not configured: missing ${missing}` });
        }

        const client = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        const createParams = {
            to,
            body,
            statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL || undefined
        };
        if (TWILIO_MESSAGING_SERVICE_SID) {
            createParams.messagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
        } else {
            createParams.from = TWILIO_FROM_NUMBER;
        }
        const msg = await client.messages.create(createParams);

        ensureSmsLogsSchema(() => {
            const sql = `INSERT INTO sms_logs (booking_id, to_number, body, status, sid, sent_at) VALUES (?, ?, ?, ?, ?, NOW())`;
            con.query(sql, [bookingId || null, to, body, msg.status || 'queued', msg.sid], (err) => {
                if (err) console.error('Error logging sms:', err);
            });
        });

        res.json({ success: true, sid: msg.sid, status: msg.status });
    } catch (e) {
        console.error('SMS send error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// Twilio status callback webhook
app.post('/api/twilio/sms-status', (req, res) => {
    try {
        const { MessageSid, MessageStatus, ErrorMessage } = req.body || {};
        if (!MessageSid) return res.status(200).send('ok');
        ensureSmsLogsSchema(() => {
            const sql = `UPDATE sms_logs SET status = ?, error_message = COALESCE(?, error_message), last_event_at = NOW() WHERE sid = ?`;
            con.query(sql, [MessageStatus || 'unknown', ErrorMessage || null, MessageSid], (err) => {
                if (err) console.error('SMS status update error:', err);
            });
        });
        res.status(200).send('ok');
    } catch (e) {
        console.error('SMS status webhook error:', e);
        res.status(200).send('ok');
    }
});

// Fetch SMS logs for a booking
app.get('/api/bookingSms/:bookingId', (req, res) => {
    const { bookingId } = req.params;
    ensureSmsLogsSchema(() => {
        const sql = `SELECT * FROM sms_logs WHERE booking_id = ? ORDER BY sent_at DESC`;
        con.query(sql, [bookingId], (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, data: rows || [] });
        });
    });
});

// Fetch SMS logs by recipient number
app.get('/api/recipientSms', (req, res) => {
    const { to } = req.query || {};
    if (!to) return res.status(400).json({ success: false, message: 'to is required' });
    ensureSmsLogsSchema(() => {
        const sql = `SELECT * FROM sms_logs WHERE to_number = ? ORDER BY sent_at DESC`;
        con.query(sql, [to], (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, data: rows || [] });
        });
    });
});

// Quick diagnostics for Twilio env config
app.get('/api/diagnostics/twilio', (req, res) => {
    res.json({
        accountSidSet: Boolean(process.env.TWILIO_ACCOUNT_SID),
        authTokenSet: Boolean(process.env.TWILIO_AUTH_TOKEN),
        fromNumberSet: Boolean(process.env.TWILIO_FROM_NUMBER),
        messagingServiceSidSet: Boolean(process.env.TWILIO_MESSAGING_SERVICE_SID),
        statusCallbackSet: Boolean(process.env.TWILIO_STATUS_CALLBACK_URL)
    });
});

// FIX REDEEMED VOUCHERS: Update all_vouchers table for bookings that have voucher_code
app.post('/api/fix-redeemed-vouchers', (req, res) => {
    console.log('=== FIXING REDEEMED VOUCHERS ===');
    
    // Get all bookings that have a voucher_code
    const selectSql = `
        SELECT b.id, b.name, b.voucher_code, v.redeemed, v.voucher_ref
        FROM all_booking b
        LEFT JOIN all_vouchers v ON b.voucher_code = v.voucher_ref
        WHERE b.voucher_code IS NOT NULL 
          AND b.voucher_code != '' 
          AND (v.redeemed IS NULL OR v.redeemed != 'Yes')
        LIMIT 100
    `;
    
    con.query(selectSql, (err, bookings) => {
        if (err) {
            console.error('Error selecting bookings:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        if (!bookings || bookings.length === 0) {
            return res.json({ success: true, message: 'No vouchers to fix', updated: 0 });
        }
        
        console.log(`Found ${bookings.length} vouchers to mark as redeemed`);
        
        let updated = 0;
        
        const updatePromises = bookings.map(booking => {
            return new Promise((resolve) => {
                const updateSql = `
                    UPDATE all_vouchers 
                    SET redeemed = 'Yes' 
                    WHERE voucher_ref = ?
                `;
                
                con.query(updateSql, [booking.voucher_code], (updateErr, result) => {
                    if (updateErr) {
                        console.error(`Error updating voucher ${booking.voucher_code}:`, updateErr);
                        resolve(false);
                    } else {
                        if (result.affectedRows > 0) {
                            console.log(`Updated voucher ${booking.voucher_code}: redeemed = 'Yes'`);
                            updated++;
                        } else {
                            console.log(`No voucher found for code ${booking.voucher_code}`);
                        }
                        resolve(true);
                    }
                });
            });
        });
        
        Promise.all(updatePromises).then(() => {
            res.json({
                success: true,
                message: `Fixed ${updated} vouchers`,
                updated,
                total: bookings.length
            });
        });
    });
});

// DIAGNOSTICS: Check voucher redemption status
app.get('/api/check-voucher-status', (req, res) => {
    const voucherCode = req.query.voucher_code;
    
    if (!voucherCode) {
        return res.status(400).json({ success: false, message: 'voucher_code parameter required' });
    }
    
    const sql = `
        SELECT v.voucher_ref, v.redeemed, v.name as voucher_name, b.id as booking_id, b.name as booking_name, b.flight_date
        FROM all_vouchers v
        LEFT JOIN all_booking b ON b.voucher_code = v.voucher_ref
        WHERE v.voucher_ref = ?
    `;
    
    con.query(sql, [voucherCode], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        
        if (!result || result.length === 0) {
            return res.json({ success: true, found: false, message: 'Voucher not found in all_vouchers table' });
        }
        
        res.json({ success: true, found: true, voucher: result[0] });
    });
});

// DIAGNOSTICS: Check flight_date values
app.get('/api/check-flight-dates', (req, res) => {
    const voucherCode = req.query.voucher_code || null;
    
    let sql, params;
    if (voucherCode) {
        sql = `
            SELECT id, name, flight_date, time_slot, location, created_at, voucher_code 
            FROM all_booking 
            WHERE voucher_code = ?
            LIMIT 10
        `;
        params = [voucherCode];
    } else {
        sql = `
            SELECT id, name, flight_date, time_slot, location, created_at, voucher_code 
            FROM all_booking 
            ORDER BY id DESC 
            LIMIT 10
        `;
        params = [];
    }
    
    con.query(sql, params, (err, bookings) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        
        const formatted = bookings.map(b => ({
            id: b.id,
            name: b.name,
            flight_date: b.flight_date,
            flight_date_type: typeof b.flight_date,
            time_slot: b.time_slot,
            location: b.location,
            voucher_code: b.voucher_code
        }));
        
        res.json({ success: true, bookings: formatted });
    });
});

// FIX FLIGHT_DATE: Migrate existing bookings where flight_date is NULL or invalid
app.post('/api/fix-flight-dates', (req, res) => {
    console.log('=== FIXING FLIGHT DATES ===');
    
    // Get all bookings where flight_date contains invalid format (ISO string mixed with time)
    const selectSql = `
        SELECT id, name, flight_date, time_slot, location, created_at 
        FROM all_booking 
        WHERE flight_date IS NOT NULL 
           AND (
               flight_date LIKE '%T%Z%' 
               OR flight_date LIKE '%.000Z%'
               OR flight_date = '' 
               OR flight_date = '0000-00-00 00:00:00'
           )
        LIMIT 100
    `;
    
    con.query(selectSql, (err, bookings) => {
        if (err) {
            console.error('Error selecting bookings:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        if (!bookings || bookings.length === 0) {
            return res.json({ success: true, message: 'No bookings to fix', updated: 0 });
        }
        
        console.log(`Found ${bookings.length} bookings to fix`);
        
        let updated = 0;
        let errors = [];
        
        const updatePromises = bookings.map(booking => {
            return new Promise((resolve) => {
                let newFlightDate = null;
                
                try {
                    const flightDateStr = booking.flight_date ? booking.flight_date.toString() : '';
                    
                    // Case 1: Invalid format like "2025-10-15T22:00:00.000Z 15:00:00"
                    if (flightDateStr.includes('T') && flightDateStr.includes('Z')) {
                        // Extract the ISO date part and the time part after the Z
                        const parts = flightDateStr.split(/\s+/);
                        
                        if (parts.length >= 2) {
                            // Parse the ISO date: "2025-10-15T22:00:00.000Z"
                            const isoDateMatch = parts[0].match(/(\d{4})-(\d{2})-(\d{2})T/);
                            const timePart = parts[1]; // "15:00:00"
                            
                            if (isoDateMatch && timePart) {
                                const [_, year, month, day] = isoDateMatch;
                                newFlightDate = `${year}-${month}-${day} ${timePart}`;
                            }
                        } else {
                            // Just parse the ISO date without time
                            const isoDateMatch = flightDateStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
                            if (isoDateMatch) {
                                const [_, year, month, day, hour, minute] = isoDateMatch;
                                newFlightDate = `${year}-${month}-${day} ${hour}:${minute}:00`;
                            }
                        }
                    }
                    // Case 2: Parse time_slot if flight_date is empty
                    else if (booking.time_slot) {
                        const timeSlotStr = booking.time_slot.toString();
                        
                        // Try to parse DD/MM/YYYY H:MM AM/PM format
                        const match = timeSlotStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
                        
                        if (match) {
                            const [_, day, month, year, hour, minute, ampm] = match;
                            let hour24 = parseInt(hour, 10);
                            
                            // Convert to 24-hour format if AM/PM is present
                            if (ampm) {
                                if (ampm.toUpperCase() === 'PM' && hour24 !== 12) {
                                    hour24 += 12;
                                } else if (ampm.toUpperCase() === 'AM' && hour24 === 12) {
                                    hour24 = 0;
                                }
                            }
                            
                            // Format as YYYY-MM-DD HH:MM:SS
                            newFlightDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour24).padStart(2, '0')}:${minute}:00`;
                        }
                    }
                } catch (parseErr) {
                    console.error(`Error parsing flight_date for booking ${booking.id}:`, parseErr);
                    errors.push({ id: booking.id, error: 'Parse error' });
                    resolve(false);
                    return;
                }
                
                if (!newFlightDate) {
                    console.log(`Skipping booking ${booking.id} - could not parse flight_date: ${booking.flight_date}`);
                    resolve(false);
                    return;
                }
                
                // Update flight_date
                const updateSql = `UPDATE all_booking SET flight_date = ? WHERE id = ?`;
                
                con.query(updateSql, [newFlightDate, booking.id], (updateErr) => {
                    if (updateErr) {
                        console.error(`Error updating booking ${booking.id}:`, updateErr);
                        errors.push({ id: booking.id, error: updateErr.message });
                        resolve(false);
                    } else {
                        console.log(`Updated booking ${booking.id}: flight_date = ${newFlightDate}`);
                        updated++;
                        resolve(true);
                    }
                });
            });
        });
        
        Promise.all(updatePromises).then(() => {
            res.json({
                success: true,
                message: `Fixed ${updated} bookings`,
                updated,
                total: bookings.length,
                errors: errors.length > 0 ? errors : undefined
            });
        });
    });
});
