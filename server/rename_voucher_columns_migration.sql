-- Migration to rename voucher table columns
-- flight_type -> experience_type
-- voucher_type -> book_flight

-- Rename flight_type column to experience_type
ALTER TABLE all_vouchers CHANGE COLUMN flight_type experience_type VARCHAR(255);

-- Rename voucher_type column to book_flight  
ALTER TABLE all_vouchers CHANGE COLUMN voucher_type book_flight VARCHAR(255);

-- Add new voucher_type column for actual voucher type (Weekday Morning, Flexible Weekday, Any Day Flight)
ALTER TABLE all_vouchers ADD COLUMN voucher_type VARCHAR(255) AFTER book_flight;

-- Update existing data to populate the new voucher_type column
-- This will set the actual voucher type based on existing data
UPDATE all_vouchers SET voucher_type = book_flight WHERE book_flight IS NOT NULL;

-- Add index for better performance
CREATE INDEX idx_experience_type ON all_vouchers(experience_type);
CREATE INDEX idx_book_flight ON all_vouchers(book_flight);
CREATE INDEX idx_voucher_type ON all_vouchers(voucher_type); 