-- Add experience_ids and private_voucher_type_ids columns to terms_and_conditions table
-- This migration adds support for experience-based terms and private charter voucher types

-- Check if experience_ids column exists, if not add it
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'terms_and_conditions' 
     AND COLUMN_NAME = 'experience_ids') = 0,
    'ALTER TABLE terms_and_conditions ADD COLUMN experience_ids JSON DEFAULT NULL COMMENT "Array of experience IDs this applies to (e.g., [1, 2] for Shared Flight and Private Charter)"',
    'SELECT "experience_ids column already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if private_voucher_type_ids column exists, if not add it
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'terms_and_conditions' 
     AND COLUMN_NAME = 'private_voucher_type_ids') = 0,
    'ALTER TABLE terms_and_conditions ADD COLUMN private_voucher_type_ids JSON DEFAULT NULL COMMENT "Array of private charter voucher type IDs this applies to"',
    'SELECT "private_voucher_type_ids column already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if voucher_type_id column exists, if not add it
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'terms_and_conditions' 
     AND COLUMN_NAME = 'voucher_type_id') = 0,
    'ALTER TABLE terms_and_conditions ADD COLUMN voucher_type_id INT DEFAULT NULL COMMENT "Single voucher type ID for backward compatibility"',
    'SELECT "voucher_type_id column already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing records to have empty arrays for new columns
UPDATE terms_and_conditions 
SET experience_ids = '[]' 
WHERE experience_ids IS NULL;

UPDATE terms_and_conditions 
SET private_voucher_type_ids = '[]' 
WHERE private_voucher_type_ids IS NULL;

-- Update existing records to populate voucher_type_id from voucher_type_ids if available
UPDATE terms_and_conditions 
SET voucher_type_id = JSON_UNQUOTE(JSON_EXTRACT(voucher_type_ids, '$[0]'))
WHERE voucher_type_id IS NULL 
AND voucher_type_ids IS NOT NULL 
AND voucher_type_ids != '[]';

-- Verify the migration
SELECT 
    id,
    title,
    voucher_type_id,
    voucher_type_ids,
    experience_ids,
    private_voucher_type_ids,
    is_active
FROM terms_and_conditions 
ORDER BY id;
