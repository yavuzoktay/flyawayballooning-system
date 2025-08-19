-- Check and fix journey_types for add_to_booking_items table
USE flyawayballooning;

-- Check current table structure
DESCRIBE add_to_booking_items;

-- Check if journey_types column exists
SHOW COLUMNS FROM add_to_booking_items LIKE 'journey_types';

-- If column doesn't exist, add it
-- (Run this only if the above SHOW COLUMNS returns no results)
ALTER TABLE add_to_booking_items ADD COLUMN journey_types JSON COMMENT 'JSON array of applicable journey types';

-- Check current data
SELECT id, title, journey_types FROM add_to_booking_items LIMIT 5;

-- Update existing records to have default journey types
UPDATE add_to_booking_items SET journey_types = '["Book Flight", "Flight Voucher", "Redeem Voucher", "Buy Gift"]' WHERE journey_types IS NULL;

-- Verify the update
SELECT id, title, journey_types FROM add_to_booking_items LIMIT 5; 