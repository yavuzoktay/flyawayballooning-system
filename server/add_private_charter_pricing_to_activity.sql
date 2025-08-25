-- Add private_charter_pricing column to activity table
-- This field will store JSON data with individual pricing for each voucher type

ALTER TABLE activity ADD COLUMN private_charter_pricing JSON DEFAULT NULL COMMENT 'JSON object containing individual pricing for each private charter voucher type';

-- Update existing records to have empty private charter pricing
UPDATE activity SET private_charter_pricing = NULL WHERE private_charter_pricing IS NULL; 