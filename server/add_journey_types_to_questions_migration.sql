-- Migration to add journey_types column to additional_information_questions table
USE flyawayballooning;

-- Add journey_types column to existing additional_information_questions table
ALTER TABLE additional_information_questions ADD COLUMN journey_types JSON COMMENT 'JSON array of applicable journey types';

-- Update existing records to have default journey types
UPDATE additional_information_questions SET journey_types = '["Book Flight", "Flight Voucher", "Redeem Voucher", "Buy Gift"]' WHERE journey_types IS NULL;

-- Verify the column was added
DESCRIBE additional_information_questions; 