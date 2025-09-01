-- Add private_voucher_type_ids column to terms_and_conditions table
-- This migration adds support for linking terms to private charter voucher types

-- Add private_voucher_type_ids column
ALTER TABLE terms_and_conditions 
ADD COLUMN private_voucher_type_ids JSON COMMENT 'Array of private charter voucher type IDs this applies to (e.g., [1, 2, 3])' 
AFTER voucher_type_ids;

-- Add index for better performance
CREATE INDEX idx_private_voucher_type_ids ON terms_and_conditions((CAST(private_voucher_type_ids AS CHAR(36))));

-- Update existing terms to have empty private_voucher_type_ids array
UPDATE terms_and_conditions 
SET private_voucher_type_ids = '[]' 
WHERE private_voucher_type_ids IS NULL;

-- Verify the column was added
DESCRIBE terms_and_conditions;
