-- Test SQL to check if multiple vouchers are being created
-- Run this after making a Buy Gift Voucher purchase with 2 passengers

-- 1. Check recent Gift Voucher purchases
SELECT 
    id,
    name,
    email,
    paid,
    book_flight,
    voucher_type,
    voucher_ref,
    numberOfPassengers,
    created_at,
    -- Count vouchers for same purchaser within 1 minute
    (SELECT COUNT(*) 
     FROM all_vouchers v2 
     WHERE v2.name = v1.name 
       AND v2.email = v1.email 
       AND v2.paid = v1.paid 
       AND ABS(TIMESTAMPDIFF(SECOND, v2.created_at, v1.created_at)) <= 60) as voucher_count
FROM all_vouchers v1
WHERE book_flight = 'Gift Voucher'
  AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check specific voucher by ID (replace with actual ID)
SELECT 
    id,
    name,
    email,
    paid,
    book_flight,
    voucher_type,
    voucher_ref,
    numberOfPassengers,
    created_at
FROM all_vouchers
WHERE id = 269; -- Replace with actual voucher ID

-- 3. Check all vouchers for the same purchaser
SELECT 
    v1.id,
    v1.name,
    v1.email,
    v1.paid,
    v1.book_flight,
    v1.voucher_type,
    v1.voucher_ref,
    v1.numberOfPassengers,
    v1.created_at,
    -- Show all voucher codes for this purchaser
    (SELECT GROUP_CONCAT(v2.voucher_ref SEPARATOR ', ') 
     FROM all_vouchers v2 
     WHERE v2.name = v1.name 
       AND v2.email = v1.email 
       AND v2.paid = v1.paid 
       AND ABS(TIMESTAMPDIFF(SECOND, v2.created_at, v1.created_at)) <= 60
       AND v2.voucher_ref IS NOT NULL 
       AND v2.voucher_ref != '-'
     ORDER BY v2.created_at ASC) as all_voucher_codes
FROM all_vouchers v1
WHERE v1.id = 269; -- Replace with actual voucher ID

-- 4. Check if there are any constraints preventing multiple vouchers
SHOW CREATE TABLE all_vouchers;

-- 5. Check for any unique indexes that might prevent multiple vouchers
SELECT 
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'all_vouchers'
  AND NON_UNIQUE = 0;
