-- Migration to add locations column to add_to_booking_items table
-- This script handles MySQL version compatibility issues

USE flyawayballooning;

-- Check if the column already exists
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'add_to_booking_items' 
    AND column_name = 'locations'
);

-- Add the column only if it doesn't exist
SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE add_to_booking_items ADD COLUMN locations JSON DEFAULT NULL COMMENT "JSON array of applicable locations (e.g., [\"Bath\", \"Devon\", \"Somerset\", \"Bristol Fiesta\"])"',
    'SELECT "Column locations already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing records to have default locations (all locations)
UPDATE add_to_booking_items SET locations = '["Bath", "Devon", "Somerset", "Bristol Fiesta"]' WHERE locations IS NULL;

-- Show the results
SELECT 'Migration completed successfully' as status;

-- Verify the column was added
DESCRIBE add_to_booking_items; 