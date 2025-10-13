-- Check if multiple vouchers are being created for Buy Gift Voucher
-- This query will show vouchers with the same purchaser details created within 1 minute

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
    -- Count how many vouchers were created for the same purchaser within 1 minute
    (SELECT COUNT(*) 
     FROM all_vouchers v2 
     WHERE v2.name = v1.name 
       AND v2.email = v1.email 
       AND v2.paid = v1.paid 
       AND ABS(TIMESTAMPDIFF(SECOND, v2.created_at, v1.created_at)) <= 60) as voucher_count
FROM all_vouchers v1
WHERE book_flight = 'Gift Voucher'
  AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR) -- Check last hour
ORDER BY created_at DESC
LIMIT 20;

-- Check specific voucher by ID (replace 269 with actual voucher ID)
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
WHERE id = 269;

-- Check all vouchers for the same purchaser as voucher ID 269
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
WHERE v1.id = 269;
