-- Simple version of purchaser/recipient data fix
-- Run this script manually if needed

-- Add purchaser columns if they don't exist
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

-- Fix existing Gift Voucher records
UPDATE all_vouchers 
SET 
    purchaser_name = name,
    purchaser_email = email,
    purchaser_phone = phone,
    purchaser_mobile = mobile
WHERE book_flight = 'Gift Voucher' 
AND (purchaser_name IS NULL OR purchaser_name = '' OR purchaser_name = recipient_name);

-- Fix non-Gift Vouchers
UPDATE all_vouchers 
SET 
    purchaser_name = name,
    purchaser_email = email,
    purchaser_phone = phone,
    purchaser_mobile = mobile
WHERE book_flight != 'Gift Voucher' 
AND (purchaser_name IS NULL OR purchaser_name = '');

-- Show results
SELECT 
    id,
    book_flight,
    name as main_contact_name,
    purchaser_name,
    recipient_name,
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
