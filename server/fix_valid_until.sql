-- Fix valid_until column constraint issue
USE flyawayballooning;

-- Make valid_until column nullable
ALTER TABLE voucher_codes MODIFY COLUMN valid_until DATE DEFAULT NULL;

-- Update existing records that might have invalid dates
UPDATE voucher_codes SET valid_until = NULL WHERE valid_until = '0000-00-00' OR valid_until = '1970-01-01';

-- Verify the change
DESCRIBE voucher_codes; 