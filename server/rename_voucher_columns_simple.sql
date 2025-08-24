-- Simple step-by-step migration to rename voucher table columns
-- Run these commands one by one to avoid errors

-- Step 1: Rename flight_type column to experience_type
ALTER TABLE all_vouchers CHANGE COLUMN flight_type experience_type VARCHAR(255);

-- Step 2: Rename voucher_type column to book_flight
ALTER TABLE all_vouchers CHANGE COLUMN voucher_type book_flight VARCHAR(255);

-- Step 3: Add new voucher_type column for actual voucher type
ALTER TABLE all_vouchers ADD COLUMN voucher_type VARCHAR(255) AFTER book_flight;

-- Step 4: Update existing data to populate the new voucher_type column
UPDATE all_vouchers SET voucher_type = book_flight WHERE book_flight IS NOT NULL;

-- Step 5: Create indexes for better performance
CREATE INDEX idx_experience_type ON all_vouchers(experience_type);
CREATE INDEX idx_book_flight ON all_vouchers(book_flight);
CREATE INDEX idx_voucher_type ON all_vouchers(voucher_type);

-- Step 6: Verify the changes
DESCRIBE all_vouchers; 