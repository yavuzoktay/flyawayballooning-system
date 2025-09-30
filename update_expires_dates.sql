-- Update expires dates for Flexible Weekday and Weekday Morning to 18 months
-- Only update if current expires is more than 18 months from created_at
UPDATE all_booking 
SET expires = DATE_ADD(created_at, INTERVAL 18 MONTH) 
WHERE voucher_type IN ('Flexible Weekday', 'Weekday Morning') 
  AND experience = 'Shared Flight' 
  AND expires > DATE_ADD(created_at, INTERVAL 18 MONTH);

-- Also update all_vouchers table for consistency
UPDATE all_vouchers 
SET expires = DATE_ADD(created_at, INTERVAL 18 MONTH) 
WHERE voucher_type_detail IN ('Flexible Weekday', 'Weekday Morning') 
  AND experience_type = 'Shared Flight' 
  AND expires > DATE_ADD(created_at, INTERVAL 18 MONTH);

-- Show affected records
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
LIMIT 10;
