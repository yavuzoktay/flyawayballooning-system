-- Fix Purchaser and Recipient Data Separation
-- This script ensures proper separation of purchaser and recipient information in all_vouchers table

-- First, ensure all purchaser columns exist
ALTER TABLE all_vouchers 
ADD COLUMN IF NOT EXISTS purchaser_name VARCHAR(255) COMMENT 'Name of the person who purchased the voucher' 
AFTER name;

ALTER TABLE all_vouchers 
ADD COLUMN IF NOT EXISTS purchaser_email VARCHAR(255) COMMENT 'Email of the person who purchased the voucher' 
AFTER purchaser_name;

ALTER TABLE all_vouchers 
ADD COLUMN IF NOT EXISTS purchaser_phone VARCHAR(50) COMMENT 'Phone number of the person who purchased the voucher' 
AFTER purchaser_email;

ALTER TABLE all_vouchers 
ADD COLUMN IF NOT EXISTS purchaser_mobile VARCHAR(50) COMMENT 'Mobile number of the person who purchased the voucher' 
AFTER purchaser_phone;

-- Index'ler kaldırıldı - gereksiz karmaşıklık

-- Fix existing Gift Voucher records where purchaser and recipient data are mixed up
-- For Gift Vouchers, the main contact fields (name, email, phone, mobile) should be purchaser info
-- and recipient_* fields should be separate recipient info

-- Update Gift Vouchers where purchaser_name is empty or same as recipient_name
UPDATE all_vouchers 
SET 
    purchaser_name = name,
    purchaser_email = email,
    purchaser_phone = phone,
    purchaser_mobile = mobile
WHERE book_flight = 'Gift Voucher' 
AND (purchaser_name IS NULL OR purchaser_name = '' OR purchaser_name = recipient_name);

-- For non-Gift Vouchers, purchaser info should be the same as main contact info
UPDATE all_vouchers 
SET 
    purchaser_name = name,
    purchaser_email = email,
    purchaser_phone = phone,
    purchaser_mobile = mobile
WHERE book_flight != 'Gift Voucher' 
AND (purchaser_name IS NULL OR purchaser_name = '');

-- Verify the data separation
SELECT 
    id,
    book_flight,
    name as main_contact_name,
    email as main_contact_email,
    phone as main_contact_phone,
    purchaser_name,
    purchaser_email,
    purchaser_phone,
    recipient_name,
    recipient_email,
    recipient_phone,
    CASE 
        WHEN book_flight = 'Gift Voucher' THEN 
            CASE 
                WHEN purchaser_name != recipient_name AND purchaser_name IS NOT NULL AND recipient_name IS NOT NULL THEN 'CORRECT'
                ELSE 'NEEDS_FIX'
            END
        ELSE 
            CASE 
                WHEN purchaser_name = name OR purchaser_name IS NULL THEN 'CORRECT'
                ELSE 'NEEDS_FIX'
            END
    END as data_status
FROM all_vouchers 
ORDER BY created_at DESC 
LIMIT 10;

-- Show summary of data status
SELECT 
    book_flight,
    COUNT(*) as total_records,
    SUM(CASE 
        WHEN book_flight = 'Gift Voucher' THEN 
            CASE 
                WHEN purchaser_name != recipient_name AND purchaser_name IS NOT NULL AND recipient_name IS NOT NULL THEN 1
                ELSE 0
            END
        ELSE 
            CASE 
                WHEN purchaser_name = name OR purchaser_name IS NULL THEN 1
                ELSE 0
            END
    END) as correct_records
FROM all_vouchers 
GROUP BY book_flight;
