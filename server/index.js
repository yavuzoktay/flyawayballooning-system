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
dotenv.config();



// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
                
                // Check if code already exists using Promise
                const checkCode = () => {
                    return new Promise((resolve, reject) => {
                        const checkSql = 'SELECT id FROM voucher_codes WHERE code = ?';
                        con.query(checkSql, [voucherCode], (err, result) => {
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
        
        // Insert into voucher_codes table
        const insertSql = `
            INSERT INTO voucher_codes (
                code, title, valid_from, valid_until, max_uses, current_uses,
                applicable_locations, applicable_experiences, applicable_voucher_types,
                is_active, created_at, updated_at, source_type, customer_email, paid_amount
            ) VALUES (?, ?, NOW(), ?, 1, 0, ?, ?, ?, 1, NOW(), NOW(), 'user_generated', ?, ?)
        `;
        
        // Set default expiration date if none provided (1 year from now)
        const defaultExpiryDate = expires_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const values = [
            voucherCode,
            title,
            defaultExpiryDate,
            location || null,
            experience_type || null,
            voucher_type || null,
            customer_email || null,
            paid_amount || 0
        ];
        
        // Use Promise for database insertion
        const insertVoucherCode = () => {
            return new Promise((resolve, reject) => {
                con.query(insertSql, values, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        };
        
        try {
            const result = await insertVoucherCode();
            res.json({
                success: true,
                message: 'Voucher code generated successfully',
                voucher_code: voucherCode,
                voucher_id: result.insertId,
                title: title
            });
        } catch (insertError) {
            console.error('Error creating voucher code:', insertError);
            res.status(500).json({ success: false, message: 'Database error', error: insertError.message });
        }
        
    } catch (error) {
        console.error('Error generating voucher code:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
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
    
    const sql = `
        SELECT * FROM voucher_codes 
        WHERE code = ? AND is_active = 1
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_until IS NULL OR valid_until >= NOW())
        AND (max_uses IS NULL OR current_uses < max_uses)
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
            console.log('No voucher found - checking conditions...');
            // Let's check what's in the database for this code
            con.query('SELECT * FROM voucher_codes WHERE code = ?', [code.toUpperCase()], (err2, checkResult) => {
                if (err2) {
                    console.error('Error checking voucher details:', err2);
                } else {
                    console.log('Voucher details found:', checkResult);
                    if (checkResult.length > 0) {
                        const v = checkResult[0];
                        console.log('Voucher status:', {
                            is_active: v.is_active,
                            valid_from: v.valid_from,
                            valid_until: v.valid_until,
                            current_uses: v.current_uses,
                            max_uses: v.max_uses,
                            source_type: v.source_type,
                            now: new Date()
                        });
                        
                        // Daha detaylı hata mesajları
                        if (!v.is_active) {
                            return res.json({ success: false, message: 'Voucher code is inactive' });
                        }
                        if (v.valid_from && new Date() < new Date(v.valid_from)) {
                            return res.json({ success: false, message: 'Voucher code is not yet valid' });
                        }
                        if (v.valid_until && new Date() > new Date(v.valid_until)) {
                            return res.json({ success: false, message: 'Voucher code has expired' });
                        }
                        if (v.max_uses && v.current_uses >= v.max_uses) {
                            return res.json({ success: false, message: `Voucher code usage limit reached (${v.current_uses}/${v.max_uses})` });
                        }
                        if (v.source_type && v.source_type !== 'admin_created' && v.source_type !== 'user_generated') {
                            return res.json({ success: false, message: 'Voucher code source type is invalid' });
                        }
                    }
                }
            });
            return res.json({ success: false, message: 'Invalid or expired voucher code' });
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
        
        // For user generated codes, skip strict location/experience/voucher_type checks
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
        
        // Voucher code is valid (no discount calculation needed)
        res.json({
            success: true,
            message: 'Voucher code is valid',
            data: {
                ...voucher,
                final_amount: booking_amount // No discount applied
            }
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

// Get all voucher types
app.get('/api/voucher-types', (req, res) => {
    console.log('GET /api/voucher-types called');
    const sql = `SELECT * FROM voucher_types ORDER BY sort_order ASC, created_at DESC`;
    console.log('SQL Query:', sql);
    
    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching voucher types:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        console.log('Query result:', result);
        console.log('Result length:', result ? result.length : 'undefined');
        res.json({ success: true, data: result });
    });
});

// Create new voucher type
app.post('/api/voucher-types', experiencesUpload.single('voucher_type_image'), (req, res) => {
    const {
        title,
        description,
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
    if (!title || !description || !price_per_person) {
        return res.status(400).json({ success: false, message: 'Missing required fields: title, description, and price_per_person' });
    }
    
    // Handle image upload
    let image_url = req.body.image_url; // Keep existing image if no new file uploaded
    if (req.file) {
        image_url = `/uploads/experiences/${req.file.filename}`;
    }
    
    const sql = `
        INSERT INTO voucher_types (
            title, description, image_url, price_per_person, price_unit, max_passengers,
            validity_months, flight_days, flight_time, features, terms, sort_order, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
        title,
        description,
        image_url,
        price_per_person,
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
    if (!title || !description || !price_per_person) {
        return res.status(400).json({ success: false, message: 'Missing required fields: title, description, and price_per_person' });
    }
    
    // Handle image upload
    let image_url = req.body.image_url; // Keep existing image if no new file uploaded
    if (req.file) {
        image_url = `/uploads/experiences/${req.file.filename}`;
    }
    
    const sql = `
        UPDATE voucher_types SET 
            title = ?, description = ?, image_url = ?, price_per_person = ?, 
            price_unit = ?, max_passengers = ?, validity_months = ?, flight_days = ?,
            flight_time = ?, features = ?, terms = ?, sort_order = ?, is_active = ?
        WHERE id = ?
    `;
    
    const values = [
        title,
        description,
        image_url,
        price_per_person,
        price_unit || 'pp',
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

// ==================== ADD TO BOOKING ITEMS API ENDPOINTS ====================

// Get all add to booking items
app.get('/api/add-to-booking-items', (req, res) => {
    console.log('GET /api/add-to-booking-items called');
    const sql = `SELECT * FROM add_to_booking_items ORDER BY sort_order ASC, created_at DESC`;
    console.log('SQL Query:', sql);
    
    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching add to booking items:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        console.log('Query result:', result);
        console.log('Result length:', result ? result.length : 'undefined');
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
            stock_quantity, is_physical_item, weight_grams, journey_types, sort_order, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    }
    
    const sql = `
        UPDATE add_to_booking_items SET 
            title = ?, description = ?, image_url = ?, price = ?, 
            price_unit = ?, category = ?, stock_quantity = ?, is_physical_item = ?,
            weight_grams = ?, journey_types = ?, sort_order = ?, is_active = ?
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
            placeholder_text, help_text, category, journey_types, sort_order, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            placeholder_text = ?, help_text = ?, category = ?, journey_types = ?, sort_order = ?, is_active = ?
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

// ==================== TERMS & CONDITIONS API ENDPOINTS ====================

// Get all terms and conditions
app.get('/api/terms-and-conditions', (req, res) => {
    console.log('GET /api/terms-and-conditions called');
    const sql = `SELECT * FROM terms_and_conditions ORDER BY sort_order ASC, created_at DESC`;
    console.log('SQL Query:', sql);
    
    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching terms and conditions:', err);
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        console.log('Query result:', result);
        console.log('Result length:', result ? result.length : 'undefined');
        res.json({ success: true, data: result });
    });
});

// Get terms and conditions by voucher type
app.get('/api/terms-and-conditions/voucher-type/:voucherTypeId', (req, res) => {
    const { voucherTypeId } = req.params;
    console.log('GET /api/terms-and-conditions/voucher-type/' + voucherTypeId + ' called');
    
    const sql = `SELECT * FROM terms_and_conditions WHERE JSON_CONTAINS(voucher_type_ids, ?) AND is_active = 1 ORDER BY sort_order ASC`;
    console.log('SQL Query:', sql);
    
    con.query(sql, [JSON.stringify(parseInt(voucherTypeId))], (err, result) => {
        if (err) {
            console.error('Error fetching terms and conditions for voucher type:', err);
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
        voucher_type_ids,
        is_active,
        sort_order
    } = req.body;
    
    // Validation
    if (!title || !content || !voucher_type_ids) {
        return res.status(400).json({ success: false, message: 'Missing required fields: title, content, and voucher_type_ids' });
    }
    
    const sql = `
        INSERT INTO terms_and_conditions (
            title, content, voucher_type_ids, is_active, sort_order
        ) VALUES (?, ?, ?, ?, ?)
    `;
    
    const values = [
        title,
        content,
        JSON.stringify(voucher_type_ids),
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
        voucher_type_ids,
        is_active,
        sort_order
    } = req.body;
    
    console.log('PUT /api/terms-and-conditions/' + id + ' called');
    console.log('Request body:', req.body);
    console.log('voucher_type_ids type:', typeof voucher_type_ids);
    console.log('voucher_type_ids value:', voucher_type_ids);
    
    // Validation
    if (!title || !content || !voucher_type_ids) {
        return res.status(400).json({ success: false, message: 'Missing required fields: title, content, and voucher_type_ids' });
    }
    
    const sql = `
        UPDATE terms_and_conditions SET 
            title = ?, content = ?, voucher_type_ids = ?, is_active = ?, sort_order = ?
        WHERE id = ?
    `;
    
    const values = [
        title,
        content,
        JSON.stringify(voucher_type_ids),
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
            
            // İşlem başlamadan önce processed flag'ini set et
            storeData.processed = true;
            
            console.log('Processing webhook for session:', session_id, 'Type:', storeData.type);
            
            try {
                if (storeData.type === 'booking') {
                    // If already processed with a booking id, skip duplicate creation
                    if (storeData.processed && storeData.bookingData?.booking_id) {
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
                    
                    // Check if session was already processed to prevent duplicate creation
                    if (storeData.processed) {
                        console.log('Session already processed by webhook, skipping duplicate creation');
                        return res.json({ received: true });
                    }
                    
                    // Webhook only creates the voucher, voucher code generation will be done by frontend
                    console.log('Voucher created by webhook, voucher code generation will be done by frontend');
                    
                    // Direct database insertion instead of HTTP call
                    const voucherId = await createVoucherFromWebhook(storeData.voucherData);
                    console.log('Webhook voucher creation completed, ID:', voucherId);
                    
                    // Store voucher ID in session data to prevent duplicate creation
                    storeData.voucherData.voucher_id = voucherId;
                    
                    // Mark session as processed to prevent duplicate calls
                    storeData.processed = true;
                    
                    // Webhook does NOT generate voucher code - this will be done by frontend
                    console.log('Voucher code generation skipped in webhook - will be done by frontend');
                    
                    // Immediately return to prevent further processing
                    return res.json({ received: true });
                }
                
                // Session data temizle (only for non-voucher types)
                if (storeData.type !== 'voucher') {
                    delete stripeSessionStore[session_id];
                    console.log('Session data cleaned up for:', session_id);
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
                return {
                    ...row,
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

// Get all booking data
app.get('/api/getAllBookingData', (req, res) => {
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
        ORDER BY ab.created_at DESC
    `;
    
    con.query(sql, (err, result) => {
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
        
        console.log(`Fetched ${result.length} bookings`);
        res.json({ success: true, data: enriched });
    });
});

// Get All Voucher Data (with booking and passenger info)
app.get('/api/getAllVoucherData', (req, res) => {
    // Join all_vouchers with all_booking and passenger (if available)
    const voucher = `
        SELECT v.*, b.email as booking_email, b.phone as booking_phone, b.id as booking_id, p.weight as passenger_weight,
               vc.code as vc_code
        FROM all_vouchers v
        LEFT JOIN all_booking b ON v.voucher_ref = b.voucher_code
        LEFT JOIN passenger p ON b.id = p.booking_id
        LEFT JOIN voucher_codes vc ON vc.code = v.voucher_ref OR (vc.customer_email IS NOT NULL AND vc.customer_email = v.email)
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
                // Prefer explicit voucher_ref; if null, fill from vc_code
                const voucher_ref = row.voucher_ref || row.vc_code || null;
                return {
                    ...row,
                    voucher_ref,
                    name: row.name ?? '',
                    flight_type: row.flight_type ?? '',
                    voucher_type: row.voucher_type ?? '',
                    email: row.email ?? '',
                    phone: row.phone ?? '',
                    expires: expiresVal ? moment(expiresVal).format('DD/MM/YYYY') : '',
                    redeemed: row.redeemed ?? '',
                    paid: row.paid ?? '',
                    offer_code: row.offer_code ?? '',
                    voucher_ref: voucher_ref ?? '',
                    created_at: row.created_at ? moment(row.created_at).format('DD/MM/YYYY HH:mm') : '',
                    booking_email: row.booking_email ?? '',
                    booking_phone: row.booking_phone ?? '',
                    booking_id: row.booking_id ?? '',
                    passenger_weight: row.passenger_weight ?? ''
                };
            });
            res.json({ success: true, data: formatted });
        } else {
            res.json({ success: true, data: [] });
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    // Use the new specific availability update function
                    console.log('=== REBOOK AVAILABILITY UPDATE ===');
                    console.log('UPDATE AVAILABILITY PARAMS:', chooseFlightType.passengerCount, bookingDate, bookingTime, req.body.activity_id, chooseFlightType.passengerCount);
                    console.log('Request body activity_id:', req.body.activity_id);
                    console.log('Request body:', req.body);
                    
                    updateSpecificAvailability(bookingDate, bookingTime, req.body.activity_id, chooseFlightType.passengerCount);
                    console.log('=== END REBOOK AVAILABILITY UPDATE ===');
                } else if (bookingTime) {
                    // Get activity_id first, then update availability
                    console.log('UPDATE AVAILABILITY PARAMS (alt sorgu):', chooseFlightType.passengerCount, bookingDate, bookingTime, chooseLocation, chooseFlightType.passengerCount);
                    
                    const activitySql = `SELECT id FROM activity WHERE location = ? AND status = 'Live' LIMIT 1`;
                    con.query(activitySql, [chooseLocation], (activityErr, activityResult) => {
                        if (activityErr) {
                            console.error('Error getting activity_id for availability update:', activityErr);
                        } else if (activityResult.length > 0) {
                            const activityId = activityResult[0].id;
                            console.log('Found activity_id for availability update:', activityId);
                            
                            updateSpecificAvailability(bookingDate, bookingTime, activityId, chooseFlightType.passengerCount);
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

    // Eğer Redeem Voucher ise, voucher code usage'ını güncelle
    if (voucher_type === 'Redeem Voucher' && voucher_ref) {
        // Önce voucher code'un mevcut olup olmadığını ve kullanılabilir olup olmadığını kontrol et
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
            
            // Voucher code usage'ını güncelle
            const updateVoucherSql = `
                UPDATE voucher_codes 
                SET current_uses = current_uses + 1 
                WHERE id = ?
            `;
            
            con.query(updateVoucherSql, [voucher.id], (err, updateResult) => {
                if (err) {
                    console.error('Error updating voucher code usage:', err);
                    return res.status(500).json({ success: false, error: 'Failed to update voucher code usage' });
                }
                
                // Şimdi voucher usage kaydını ekle
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
                    
                    // Ana voucher kaydını oluştur
                    createVoucherRecord();
                });
            });
        });
        
        // Ana voucher kaydını oluşturan fonksiyon
        function createVoucherRecord() {
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
        }
    } else {
        // Flight Voucher veya Gift Voucher için normal işlem
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
        res.json({
            success: true,
            booking,
            passengers,
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
        // After insert, recompute pax for this booking from passenger table to keep counts in sync
        const updatePaxSql = `UPDATE all_booking SET pax = (SELECT COUNT(*) FROM passenger WHERE booking_id = ?) WHERE id = ?`;
        con.query(updatePaxSql, [booking_id, booking_id], (err2) => {
            if (err2) {
                console.error('Error updating pax after addPassenger:', err2);
                // Still return success for passenger creation
                return res.status(201).json({ success: true, passengerId: result.insertId, paxUpdated: false });
            }
            res.status(201).json({ success: true, passengerId: result.insertId, paxUpdated: true });
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
    const { activity_name, capacity, event_time, location, flight_type, voucher_type, status, weekday_morning_price, flexible_weekday_price, any_day_flight_price, shared_flight_from_price, private_charter_from_price } = req.body;
    let image = null;
    if (req.file) {
        // Sunucuya göre path'i düzelt
        image = `/uploads/activities/${req.file.filename}`;
    }
    if (!activity_name || !capacity || !location || !flight_type || !status || !weekday_morning_price || !flexible_weekday_price || !any_day_flight_price || !shared_flight_from_price || !private_charter_from_price) {
        return res.status(400).json({ success: false, message: "Eksik bilgi!" });
    }
    const sql = `
        INSERT INTO activity (activity_name, capacity, start_date, end_date, event_time, location, flight_type, voucher_type, status, image, weekday_morning_price, flexible_weekday_price, any_day_flight_price, shared_flight_from_price, private_charter_from_price)
        VALUES (?, ?, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    con.query(sql, [activity_name, capacity, location, flight_type, voucher_type || 'All', status, image, weekday_morning_price, flexible_weekday_price, any_day_flight_price, shared_flight_from_price, private_charter_from_price], (err, result) => {
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
    const { activity_name, capacity, event_time, location, flight_type, voucher_type, status, weekday_morning_price, flexible_weekday_price, any_day_flight_price, shared_flight_from_price, private_charter_from_price } = req.body;
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
            UPDATE activity SET activity_name=?, capacity=?, start_date=NULL, end_date=NULL, event_time=NULL, location=?, flight_type=?, voucher_type=?, status=?, image=?, weekday_morning_price=?, flexible_weekday_price=?, any_day_flight_price=?, shared_flight_from_price=?, private_charter_from_price=?
            WHERE id=?
        `;
        con.query(sql, [activity_name, capacity, location, flight_type, voucher_type || 'All', status, finalImage, weekday_morning_price, flexible_weekday_price, any_day_flight_price, shared_flight_from_price, private_charter_from_price, id], (err, result) => {
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
    
    const sql = `
        SELECT weekday_morning_price, flexible_weekday_price, any_day_flight_price, shared_flight_from_price, private_charter_from_price
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
        res.json({ 
            success: true, 
            data: {
                weekday_morning_price: pricing.weekday_morning_price,
                flexible_weekday_price: pricing.flexible_weekday_price,
                any_day_flight_price: pricing.any_day_flight_price,
                shared_flight_from_price: pricing.shared_flight_from_price,
                private_charter_from_price: pricing.private_charter_from_price
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
    
    // Single optimized query with JOINs - FIXED to only affect specific time slots
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
                TIME(ab.flight_date) as flight_time,
                COUNT(*) as total_booked
            FROM all_booking ab 
            WHERE DATE(ab.flight_date) >= CURDATE() - INTERVAL 30 DAY
            GROUP BY DATE(ab.flight_date), TIME(ab.flight_date)
        ) as booking_counts ON DATE(aa.date) = booking_counts.flight_date AND TIME(aa.time) = booking_counts.flight_time
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
            
            return {
                ...row,
                date: localDateString
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

// Function to update availability for a specific time slot
const updateSpecificAvailability = async (date, time, activityId, passengerCount) => {
    try {
        console.log(`=== UPDATE SPECIFIC AVAILABILITY START ===`);
        console.log(`Parameters: date=${date}, time=${time}, activityId=${activityId}, passengerCount=${passengerCount}`);
        
        // First, let's check what availability records exist for this date/time/activity
        const checkSql = `SELECT id, date, time, activity_id, available, capacity, status FROM activity_availability WHERE date = ? AND time = ? AND activity_id = ?`;
        
        con.query(checkSql, [date, time, activityId], (checkErr, checkResult) => {
            if (checkErr) {
                console.error('Error checking availability records:', checkErr);
                return;
            }
            
            console.log(`Found ${checkResult.length} availability records for date=${date}, time=${time}, activityId=${activityId}:`);
            checkResult.forEach((record, index) => {
                console.log(`  Record ${index + 1}: id=${record.id}, available=${record.available}, capacity=${record.capacity}, status=${record.status}`);
            });
            
            if (checkResult.length === 0) {
                console.error('No availability records found for the specified date/time/activity combination');
                return;
            }
            
            if (checkResult.length > 1) {
                console.warn('Multiple availability records found for the same date/time/activity - this might cause issues');
            }
            
            // Update the specific time slot availability
            const updateSql = `UPDATE activity_availability SET available = available - ? WHERE date = ? AND time = ? AND activity_id = ? AND available >= ?`;
            console.log(`Executing SQL: ${updateSql}`);
            console.log(`SQL Parameters: [${passengerCount}, ${date}, ${time}, ${activityId}, ${passengerCount}]`);
            
            con.query(updateSql, [passengerCount, date, time, activityId, passengerCount], (err, result) => {
                if (err) {
                    console.error('Error updating specific availability:', err);
                } else {
                    console.log(`Specific availability updated successfully: ${result.affectedRows} rows affected`);
                    
                    if (result.affectedRows === 0) {
                        console.warn('No rows were updated - this might indicate a problem with the WHERE clause');
                    }
                    
                    // Verify the update by checking the new values
                    const verifySql = `SELECT id, available, capacity, status FROM activity_availability WHERE date = ? AND time = ? AND activity_id = ?`;
                    con.query(verifySql, [date, time, activityId], (verifyErr, verifyResult) => {
                        if (verifyErr) {
                            console.error('Error verifying availability update:', verifyErr);
                        } else {
                            console.log('Verification after update:');
                            verifyResult.forEach((record, index) => {
                                console.log(`  Record ${index + 1}: id=${record.id}, available=${record.available}, capacity=${record.capacity}, status=${record.status}`);
                            });
                        }
                    });
                    
                    // Update the status for this specific slot only
                    const statusSql = `UPDATE activity_availability SET status = CASE WHEN available = 0 THEN 'Closed' WHEN available > 0 THEN 'Open' ELSE status END WHERE date = ? AND time = ? AND activity_id = ?`;
                    
                    con.query(statusSql, [date, time, activityId], (statusErr, statusResult) => {
                        if (statusErr) {
                            console.error('Error updating availability status:', statusErr);
                        } else {
                            console.log(`Availability status updated for specific slot: ${statusResult.affectedRows} rows affected`);
                        }
                    });
                }
            });
        });
        
        console.log(`=== UPDATE SPECIFIC AVAILABILITY END ===`);
    } catch (error) {
        console.error('Error in updateSpecificAvailability:', error);
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
    const sql = 'DELETE FROM date_requests WHERE id = ?';
    con.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting date request:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true });
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

        // Basic validation
        if (!chooseLocation || !chooseFlightType || !passengerData) {
            return reject(new Error('Missing required booking information.'));
        }

        const passengerName = `${passengerData[0].firstName} ${passengerData[0].lastName}`;
        const now = moment();
        let expiresDate = null;

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

            const bookingValues = [
                passengerName,
                chooseFlightType.type,
                bookingDateTime,
                passengerData.length,
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
                emptyToNull(mainPassenger.weight),
                emptyToNull(mainPassenger.email),
                emptyToNull(mainPassenger.phone),
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
                
                // Now create passenger records
                if (passengerData && passengerData.length > 0) {
                    const passengerSql = 'INSERT INTO passenger (booking_id, first_name, last_name, weight, email, phone, ticket_type, weather_refund) VALUES ?';
                    const passengerValues = passengerData.map(p => [
                        bookingId,
                        p.firstName || '',
                        p.lastName || '',
                        p.weight || null,
                        p.email || null,
                        p.phone || null,
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
                        resolve(bookingId);
                    });
                } else {
                    resolve(bookingId);
                }
            });
            
            // Update availability for the specific time slot after booking creation
            if (selectedDate && selectedTime && chooseFlightType && chooseFlightType.passengerCount && chooseLocation) {
                console.log('=== WEBHOOK AVAILABILITY UPDATE ===');
                console.log('selectedDate:', selectedDate, 'Type:', typeof selectedDate);
                console.log('selectedTime:', selectedTime);
                console.log('chooseFlightType:', chooseFlightType);
                console.log('chooseLocation:', chooseLocation);
                
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
                            updateSpecificAvailability(bookingDate, bookingTime, activityId, chooseFlightType.passengerCount);
                        } else {
                            console.error('No activity found for location:', chooseLocation);
                        }
                    });
                }
                console.log('=== END WEBHOOK AVAILABILITY UPDATE ===');
            }
        }

        // Calculate expires date
        if (chooseFlightType.type === 'Private Charter') {
            expiresDate = now.add(24, 'months').format('YYYY-MM-DD HH:mm:ss');
        } else {
            expiresDate = now.add(18, 'months').format('YYYY-MM-DD HH:mm:ss');
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
        } = voucherData;

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
                console.error('Webhook voucher insertion error:', err);
                return reject(err);
            }
            console.log('Webhook voucher created successfully, ID:', result.insertId);
            resolve(result.insertId);
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
        if (!totalPrice || (!bookingData && !voucherData)) {
            return res.status(400).json({ success: false, message: 'Eksik veri: totalPrice veya bookingData/voucherData yok.' });
        }
        
        console.log('Processing payment:', { totalPrice, type, hasBookingData: !!bookingData, hasVoucherData: !!voucherData });
        
        // Stripe fiyatı kuruş cinsinden ister
        const amount = Math.round(Number(totalPrice) * 100);
        
        // Environment'a göre URL'leri ayarla
        const isProduction = process.env.NODE_ENV === 'production';
        const baseUrl = isProduction ? 'https://flyawayballooning-book.com' : 'http://localhost:3000';
        
        console.log('Creating Stripe session with:', { amount, baseUrl, isProduction });
        
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
        stripeSessionStore[session_id] = {
            type: type || (voucherData ? 'voucher' : 'booking'),
            bookingData,
            voucherData,
            timestamp: Date.now() // Add timestamp for debugging
        };
        
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
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            stripeKey: stripeSecretKey ? 'SET' : 'NOT SET',
            environment: isProduction ? 'PRODUCTION' : 'DEVELOPMENT'
        });
        res.status(500).json({ 
            success: false, 
            message: 'Stripe Checkout Session oluşturulamadı', 
            error: error.message,
            details: error.stack
        });
    }
});

// Get activity pricing for a specific location
app.get('/api/locationPricing/:location', (req, res) => {
    const { location } = req.params;
    if (!location) return res.status(400).json({ success: false, message: 'Location is required' });
    
    const sql = `
        SELECT weekday_morning_price, flexible_weekday_price, any_day_flight_price, shared_flight_from_price, private_charter_from_price
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
        res.json({ 
            success: true, 
            data: {
                weekday_morning_price: pricing.weekday_morning_price,
                flexible_weekday_price: pricing.flexible_weekday_price,
                any_day_flight_price: pricing.any_day_flight_price,
                shared_flight_from_price: pricing.shared_flight_from_price,
                private_charter_from_price: pricing.private_charter_from_price
            }
        });
    });
});

// Get a single availability by activity, date and time
app.get('/api/availabilityBySlot', (req, res) => {
    const { activity_id, date, time } = req.query;
    if (!activity_id || !date || !time) {
        return res.status(400).json({ success: false, message: 'activity_id, date and time are required' });
    }
    const sql = 'SELECT id, capacity, available, status FROM activity_availability WHERE activity_id = ? AND DATE(date) = ? AND TIME(time) = ? LIMIT 1';
    con.query(sql, [activity_id, date, time], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!rows || rows.length === 0) return res.json({ success: true, data: null });
        return res.json({ success: true, data: rows[0] });
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
            if (storeData.processing) {
                return res.status(202).json({ success: false, message: 'Booking creation already in progress' });
            }
            if (storeData.processed && storeData.bookingData?.booking_id) {
                return res.json({ success: true, id: storeData.bookingData.booking_id, message: 'booking already created' });
            }
            console.log('Creating booking from session data');
            // Acquire a simple in-memory lock
            storeData.processing = true;
            result = await createBookingFromWebhook(storeData.bookingData);
            console.log('Booking created successfully, ID:', result);
            // mark processed and store id to avoid duplicates
            storeData.processed = true;
            storeData.processing = false;
            storeData.bookingData.booking_id = result;
            
            // For Book Flight, generate voucher code
            try {
                console.log('Generating voucher code for Book Flight...');
                console.log('Full storeData.bookingData:', JSON.stringify(storeData.bookingData, null, 2));
                
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
                const voucherCodeResponse = await axios.post(`${req.protocol}://${req.get('host')}/api/generate-voucher-code`, {
                    flight_category: flightCategory,
                    customer_name: storeData.bookingData.passengerData?.[0]?.firstName + ' ' + storeData.bookingData.passengerData?.[0]?.lastName || 'Unknown Customer',
                    customer_email: storeData.bookingData.passengerData?.[0]?.email || '',
                    location: storeData.bookingData.chooseLocation || 'Somerset',
                    experience_type: storeData.bookingData.chooseFlightType?.type || 'Shared Flight',
                    voucher_type: 'Book Flight',
                    paid_amount: storeData.bookingData.totalPrice || 0,
                    expires_date: null // Will use default (1 year)
                });
                
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
                }
            } catch (voucherCodeError) {
                console.error('Error generating Book Flight voucher code:', voucherCodeError);
                // Continue even if code generation fails
            }
        } else if (type === 'voucher' && storeData.voucherData) {
            console.log('Creating voucher from session data');
            
            // Check if session was already processed by webhook
            if (storeData.processed) {
                console.log('Session already processed by webhook, using existing data');
                result = storeData.voucherData.voucher_id;
                voucherCode = storeData.voucherData.generated_voucher_code;
            } else {
                // Create voucher only if not already created
                result = await createVoucherFromWebhook(storeData.voucherData);
                console.log('Voucher created successfully, ID:', result);
                
                                        // Voucher code generation is now handled by frontend only
                        // Webhook only creates the voucher entry
                        console.log('Voucher code generation skipped - will be handled by frontend');
                        
                        // For Buy Gift vouchers, also generate voucher code
                        if (storeData.voucherData.voucher_type === 'Buy Gift' || storeData.voucherData.voucher_type === 'Gift Voucher') {
                            try {
                                console.log('Generating voucher code for Buy Gift...');
                                
                                // Determine flight category from voucher data
                                let flightCategory = 'Any Day Flight'; // Default
                                if (storeData.voucherData.voucher_type_detail) {
                                    flightCategory = storeData.voucherData.voucher_type_detail;
                                }
                                
                                // Generate voucher code
                                const voucherCodeResponse = await axios.post(`${req.protocol}://${req.get('host')}/api/generate-voucher-code`, {
                                    flight_category: flightCategory,
                                    customer_name: storeData.voucherData.name || 'Unknown Customer',
                                    customer_email: storeData.voucherData.email || '',
                                    location: storeData.voucherData.preferred_location || 'Somerset',
                                    experience_type: storeData.voucherData.flight_type || 'Shared Flight',
                                    voucher_type: 'Buy Gift',
                                    paid_amount: storeData.voucherData.paid || 0,
                                    expires_date: storeData.voucherData.expires || null
                                });
                                
                                if (voucherCodeResponse.data.success) {
                                    console.log('Buy Gift voucher code generated successfully:', voucherCodeResponse.data.voucher_code);
                                    voucherCode = voucherCodeResponse.data.voucher_code;
                                    
                                    // Store the voucher code in the session data to prevent regeneration
                                    storeData.voucherData.generated_voucher_code = voucherCode;
                                } else {
                                    console.error('Failed to generate Buy Gift voucher code:', voucherCodeResponse.data.message);
                                }
                            } catch (voucherCodeError) {
                                console.error('Error generating Buy Gift voucher code:', voucherCodeError);
                                // Continue even if code generation fails
                            }
                        }
                
                // Mark session as processed to prevent duplicate creation
                storeData.processed = true;
            }
        } else {
            return res.status(400).json({ success: false, message: 'Invalid type or missing data' });
        }
        
        // Clean up session data (keep minimal info to allow status checks for a short time)
        stripeSessionStore[session_id] = { ...stripeSessionStore[session_id], processed: true };
        
        res.json({ 
            success: true, 
            id: result, 
            message: `${type} created successfully`,
            voucher_code: voucherCode || storeData.voucherData?.generated_voucher_code || null,
            customer_name: storeData.voucherData?.name || storeData.bookingData?.name || null,
            customer_email: storeData.voucherData?.email || storeData.bookingData?.email || null,
            paid_amount: storeData.voucherData?.paid || storeData.bookingData?.totalPrice || null
        });
    } catch (error) {
        console.error('Error creating from session:', error);
        res.status(500).json({ success: false, message: error.message });
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
                // Get actual booking count for this availability
                const getBookingCountSql = `
                    SELECT COUNT(*) as total_booked
                    FROM all_booking ab 
                    WHERE ab.activity_id = ? 
                    AND DATE(ab.flight_date) = DATE(?)
                    AND ab.location = ?
                    AND TIME(ab.time_slot) = TIME(?)
                `;
                
                con.query(getBookingCountSql, [id, availability.date, availability.location, availability.time], (bookingErr, bookingResult) => {
                    if (bookingErr) {
                        console.error('Error getting booking count:', bookingErr);
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
                            SET available = ?, status = ? 
                            WHERE id = ?
                        `;
                        
                        con.query(updateSql, [newAvailable, newStatus, availability.id], (updateErr) => {
                            if (updateErr) {
                                console.error('Error updating availability:', updateErr);
                                resolve(false);
                            } else {
                                console.log(`Updated availability ${availability.id}: available=${newAvailable}, status=${newStatus}, total_booked=${totalBooked}`);
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

// Add voucher code columns to all_booking table if they don't exist
const addVoucherColumnsToBooking = `
    ALTER TABLE all_booking 
    ADD COLUMN voucher_code VARCHAR(50) DEFAULT NULL COMMENT 'Applied voucher code',
    ADD COLUMN voucher_discount DECIMAL(10,2) DEFAULT 0 COMMENT 'Discount amount from voucher code',
    ADD COLUMN original_amount DECIMAL(10,2) DEFAULT NULL COMMENT 'Original amount before voucher discount'
`;

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

// Database migrations will run when the main server starts

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

// Place this at the very end, after all API endpoints:
app.use(express.static(path.join(__dirname, '../client/build')));

// Catch-all route for SPA - must be at the very end
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Session status endpoint to avoid duplicate creation from client
app.get('/api/session-status', (req, res) => {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ processed: false, message: 'session_id is required' });
    const data = stripeSessionStore[session_id];
    return res.json({ processed: !!(data && (data.processed || data.processing)), type: data?.type || null });
});