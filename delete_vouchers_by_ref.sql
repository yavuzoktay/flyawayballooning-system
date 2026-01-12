-- Delete vouchers from all_vouchers table where voucher_ref matches FAB1325 or FAB24000
-- Note: This will also cascade delete related records in voucher_notes table (if any)

-- First, check what will be deleted (optional - run this first to verify)
-- SELECT id, voucher_ref, name, email, created_at, paid 
-- FROM all_vouchers 
-- WHERE voucher_ref IN ('FAB1325', 'FAB24000');

-- Delete the vouchers
SET SQL_SAFE_UPDATES = 0;

DELETE FROM all_vouchers 
WHERE voucher_ref IN ('FAB1325', 'FAB24000');

SET SQL_SAFE_UPDATES = 1;

-- Verify deletion (optional - run this after to confirm)
-- SELECT COUNT(*) as deleted_count 
-- FROM all_vouchers 
-- WHERE voucher_ref IN ('FAB1325', 'FAB24000');
-- Should return 0 if deletion was successful
