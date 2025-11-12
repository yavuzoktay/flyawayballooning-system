-- Migration to add add_to_booking_items_total_price column to all_booking table
-- This column stores the total price of all add-on items for a booking
-- Separate from passenger pricing to prevent calculation conflicts

USE trip_booking;

-- Check if the column already exists
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'all_booking' 
    AND column_name = 'add_to_booking_items_total_price'
);

-- Add the column only if it doesn't exist
SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE all_booking ADD COLUMN add_to_booking_items_total_price DECIMAL(10, 2) DEFAULT 0.00 COMMENT "Total price of selected add-to-booking items (e.g., FAB Cap)"',
    'SELECT "Column add_to_booking_items_total_price already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show the results
SELECT 'Migration completed successfully' as status;

-- Verify the column was added
DESCRIBE all_booking;

