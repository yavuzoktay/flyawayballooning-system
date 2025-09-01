-- Add purchaser fields to all_vouchers table
-- This script adds dedicated fields for purchaser information to separate it from recipient information

-- Add purchaser_name column for the person who purchased the voucher
ALTER TABLE all_vouchers 
ADD COLUMN purchaser_name VARCHAR(255) COMMENT 'Name of the person who purchased the voucher' 
AFTER name;

-- Add purchaser_email column for purchaser's email
ALTER TABLE all_vouchers 
ADD COLUMN purchaser_email VARCHAR(255) COMMENT 'Email of the person who purchased the voucher' 
AFTER purchaser_name;

-- Add purchaser_phone column for purchaser's phone number
ALTER TABLE all_vouchers 
ADD COLUMN purchaser_phone VARCHAR(50) COMMENT 'Phone number of the person who purchased the voucher' 
AFTER purchaser_email;

-- Add purchaser_mobile column for purchaser's mobile number
ALTER TABLE all_vouchers 
ADD COLUMN purchaser_mobile VARCHAR(50) COMMENT 'Mobile number of the person who purchased the voucher' 
AFTER purchaser_phone;

-- Add indexes for better performance
ALTER TABLE all_vouchers 
ADD INDEX idx_purchaser_name (purchaser_name),
ADD INDEX idx_purchaser_email (purchaser_email),
ADD INDEX idx_purchaser_phone (purchaser_phone);

-- Update existing records to populate purchaser fields with current name/email/phone for Gift Vouchers
-- This ensures existing data is preserved
UPDATE all_vouchers 
SET 
    purchaser_name = name,
    purchaser_email = email,
    purchaser_phone = phone,
    purchaser_mobile = mobile
WHERE book_flight = 'Gift Voucher' 
AND (purchaser_name IS NULL OR purchaser_name = '');

-- Verify the updated table structure
DESCRIBE all_vouchers;

-- Show sample data to confirm structure
SELECT id, name, purchaser_name, email, purchaser_email, phone, purchaser_phone, book_flight 
FROM all_vouchers 
WHERE book_flight = 'Gift Voucher' 
LIMIT 5;
