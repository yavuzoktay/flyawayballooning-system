-- Migration to add add_to_booking_items column to all_vouchers table
-- This script handles MySQL version compatibility issues

USE flyawayballooning;

-- Check if the column already exists
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'all_vouchers' 
    AND column_name = 'add_to_booking_items'
);

-- Add the column only if it doesn't exist
SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE all_vouchers ADD COLUMN add_to_booking_items JSON DEFAULT NULL COMMENT "JSON array of selected add-to-booking items with their details"',
    'SELECT "Column add_to_booking_items already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show the results
SELECT 'Migration completed successfully' as status;

-- Verify the column was added
DESCRIBE all_vouchers;
