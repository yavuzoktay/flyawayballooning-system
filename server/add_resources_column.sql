-- Migration to add resources column to all_booking and all_vouchers tables
-- This script handles MySQL version compatibility issues

-- ============================================
-- Add resources column to all_booking table
-- ============================================
-- Check if the column already exists
SET @column_exists_booking = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'all_booking' 
    AND column_name = 'resources'
);

-- Add the column only if it doesn't exist
SET @sql_booking = IF(@column_exists_booking = 0, 
    'ALTER TABLE all_booking ADD COLUMN resources VARCHAR(50) DEFAULT NULL COMMENT "Assigned balloon type: Balloon 210 or Balloon 105"',
    'SELECT "Column resources already exists in all_booking" as message'
);

PREPARE stmt FROM @sql_booking;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- Add resources column to all_vouchers table
-- ============================================
-- Check if the column already exists
SET @column_exists_vouchers = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'all_vouchers' 
    AND column_name = 'resources'
);

-- Add the column only if it doesn't exist
SET @sql_vouchers = IF(@column_exists_vouchers = 0, 
    'ALTER TABLE all_vouchers ADD COLUMN resources VARCHAR(50) DEFAULT NULL COMMENT "Assigned balloon type: Balloon 210 or Balloon 105"',
    'SELECT "Column resources already exists in all_vouchers" as message'
);

PREPARE stmt FROM @sql_vouchers;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show the results
SELECT 'Migration completed successfully' as status;

