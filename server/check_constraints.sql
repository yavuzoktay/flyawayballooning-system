-- Check if there are any unique constraints preventing multiple vouchers
SHOW CREATE TABLE all_vouchers;

-- Check for unique indexes
SELECT 
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'all_vouchers'
  AND NON_UNIQUE = 0;
