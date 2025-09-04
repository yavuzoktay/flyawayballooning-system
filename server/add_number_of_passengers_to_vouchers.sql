-- Add numberOfPassengers column to all_vouchers table
ALTER TABLE all_vouchers ADD COLUMN numberOfPassengers INT DEFAULT 1 COMMENT 'Number of passengers for this voucher';

-- Update existing records to have default value of 1
UPDATE all_vouchers SET numberOfPassengers = 1 WHERE numberOfPassengers IS NULL;
