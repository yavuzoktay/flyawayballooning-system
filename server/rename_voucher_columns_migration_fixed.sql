-- Migration to rename voucher table columns
-- flight_type -> experience_type
-- voucher_type -> book_flight

-- First, check if columns exist before renaming
SET @sql = '';

-- Check if flight_type column exists and rename it
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'all_vouchers' AND COLUMN_NAME = 'flight_type';

SET @sql = IF(@col_exists > 0, 'ALTER TABLE all_vouchers CHANGE COLUMN flight_type experience_type VARCHAR(255);', 'SELECT "flight_type column does not exist" as message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if voucher_type column exists and rename it
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'all_vouchers' AND COLUMN_NAME = 'voucher_type';

SET @sql = IF(@col_exists > 0, 'ALTER TABLE all_vouchers CHANGE COLUMN voucher_type book_flight VARCHAR(255);', 'SELECT "voucher_type column does not exist" as message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add new voucher_type column for actual voucher type (Weekday Morning, Flexible Weekday, Any Day Flight)
-- Check if the column already exists
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'all_vouchers' AND COLUMN_NAME = 'voucher_type';

SET @sql = IF(@col_exists = 0, 'ALTER TABLE all_vouchers ADD COLUMN voucher_type VARCHAR(255) AFTER book_flight;', 'SELECT "voucher_type column already exists" as message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing data to populate the new voucher_type column
-- This will set the actual voucher type based on existing data
UPDATE all_vouchers SET voucher_type = book_flight WHERE book_flight IS NOT NULL AND voucher_type IS NULL;

-- Add indexes for better performance (only if they don't exist)
-- Check and create experience_type index
SELECT COUNT(*) INTO @idx_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'all_vouchers' AND INDEX_NAME = 'idx_experience_type';

SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_experience_type ON all_vouchers(experience_type);', 'SELECT "idx_experience_type index already exists" as message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and create book_flight index
SELECT COUNT(*) INTO @idx_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'all_vouchers' AND INDEX_NAME = 'idx_book_flight';

SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_book_flight ON all_vouchers(book_flight);', 'SELECT "idx_book_flight index already exists" as message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and create voucher_type index
SELECT COUNT(*) INTO @idx_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'all_vouchers' AND INDEX_NAME = 'idx_voucher_type';

SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_voucher_type ON all_vouchers(voucher_type);', 'SELECT "idx_voucher_type index already exists" as message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show final table structure
DESCRIBE all_vouchers; 