-- Migrate voucher codes from all_vouchers and all_booking to voucher_codes table
-- This ensures all voucher codes are tracked in voucher_codes table with proper status

-- Step 1: Insert voucher codes from all_vouchers table (if not already in voucher_codes)
INSERT INTO voucher_codes (code, paid_amount, is_active, current_uses, max_uses, created_at, updated_at)
SELECT 
    av.voucher_ref AS code,
    av.paid AS paid_amount,
    CASE 
        WHEN av.redeemed = 'Yes' OR av.status = 'Used' THEN 0 
        ELSE 1 
    END AS is_active,
    CASE 
        WHEN av.redeemed = 'Yes' OR av.status = 'Used' THEN 1 
        ELSE 0 
    END AS current_uses,
    1 AS max_uses,
    av.created_at,
    NOW() AS updated_at
FROM all_vouchers av
WHERE av.voucher_ref IS NOT NULL 
  AND av.voucher_ref != ''
  AND NOT EXISTS (
      SELECT 1 FROM voucher_codes vc WHERE UPPER(vc.code) = UPPER(av.voucher_ref)
  )
ORDER BY av.created_at;

-- Step 2: Insert voucher codes from all_booking table (if not already in voucher_codes)
-- Only for bookings that have a voucher_code and were marked as redeemed
INSERT INTO voucher_codes (code, paid_amount, is_active, current_uses, max_uses, created_at, updated_at)
SELECT 
    ab.voucher_code AS code,
    ab.paid AS paid_amount,
    CASE 
        WHEN ab.redeemed_voucher = 'Yes' THEN 0 
        ELSE 1 
    END AS is_active,
    CASE 
        WHEN ab.redeemed_voucher = 'Yes' THEN 1 
        ELSE 0 
    END AS current_uses,
    1 AS max_uses,
    ab.created_at,
    NOW() AS updated_at
FROM all_booking ab
WHERE ab.voucher_code IS NOT NULL 
  AND ab.voucher_code != ''
  AND ab.voucher_code NOT IN (SELECT id FROM all_booking) -- Exclude booking IDs used as voucher codes
  AND NOT EXISTS (
      SELECT 1 FROM voucher_codes vc WHERE UPPER(vc.code) = UPPER(ab.voucher_code)
  )
ORDER BY ab.created_at;

-- Step 3: Update existing voucher_codes based on all_vouchers status
UPDATE voucher_codes vc
INNER JOIN all_vouchers av ON UPPER(vc.code) = UPPER(av.voucher_ref)
SET 
    vc.is_active = CASE 
        WHEN av.redeemed = 'Yes' OR av.status = 'Used' THEN 0 
        ELSE vc.is_active 
    END,
    vc.current_uses = CASE 
        WHEN av.redeemed = 'Yes' OR av.status = 'Used' THEN GREATEST(vc.current_uses, 1) 
        ELSE vc.current_uses 
    END,
    vc.updated_at = NOW()
WHERE (av.redeemed = 'Yes' OR av.status = 'Used') AND vc.is_active = 1;

-- Step 4: Update existing voucher_codes based on all_booking status
UPDATE voucher_codes vc
INNER JOIN all_booking ab ON UPPER(vc.code) = UPPER(ab.voucher_code)
SET 
    vc.is_active = CASE 
        WHEN ab.redeemed_voucher = 'Yes' THEN 0 
        ELSE vc.is_active 
    END,
    vc.current_uses = CASE 
        WHEN ab.redeemed_voucher = 'Yes' THEN GREATEST(vc.current_uses, 1) 
        ELSE vc.current_uses 
    END,
    vc.updated_at = NOW()
WHERE ab.redeemed_voucher = 'Yes' AND vc.is_active = 1;

-- Step 5: Show summary
SELECT 
    'Total voucher codes' AS description,
    COUNT(*) AS count
FROM voucher_codes
UNION ALL
SELECT 
    'Active voucher codes' AS description,
    COUNT(*) AS count
FROM voucher_codes
WHERE is_active = 1
UNION ALL
SELECT 
    'Inactive voucher codes' AS description,
    COUNT(*) AS count
FROM voucher_codes
WHERE is_active = 0;

