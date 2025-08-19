-- Migration to add journey_types column to add_to_booking_items table
USE flyawayballooning;

-- Add journey_types column (JSON columns cannot have default values in MySQL)
ALTER TABLE add_to_booking_items ADD COLUMN journey_types JSON COMMENT 'JSON array of applicable journey types';

-- Update existing records to have default journey types
UPDATE add_to_booking_items SET journey_types = '["Book Flight", "Flight Voucher", "Redeem Voucher", "Buy Gift"]' WHERE journey_types IS NULL;

-- Verify the column was added
DESCRIBE add_to_booking_items; 