-- Add private_charter_voucher_types column to activity table
-- This field will store the IDs of selected private charter voucher types

ALTER TABLE activity ADD COLUMN private_charter_voucher_types VARCHAR(500) DEFAULT NULL COMMENT 'Comma-separated list of private charter voucher type IDs';

-- Update existing records to have empty private charter voucher types
UPDATE activity SET private_charter_voucher_types = NULL WHERE private_charter_voucher_types IS NULL; 