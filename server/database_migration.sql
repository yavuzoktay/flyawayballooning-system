-- Add new pricing columns to activity table
ALTER TABLE activity ADD COLUMN shared_price DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE activity ADD COLUMN private_price DECIMAL(10,2) DEFAULT NULL;

-- Update existing records to have default pricing if they don't have it
UPDATE activity SET shared_price = 205 WHERE shared_price IS NULL;
UPDATE activity SET private_price = 900 WHERE private_price IS NULL;

-- Make the new columns required for future records
ALTER TABLE activity MODIFY COLUMN shared_price DECIMAL(10,2) NOT NULL;
ALTER TABLE activity MODIFY COLUMN private_price DECIMAL(10,2) NOT NULL; 

-- Add recipient fields to all_vouchers
ALTER TABLE all_vouchers
ADD COLUMN recipient_name VARCHAR(255) DEFAULT NULL,
ADD COLUMN recipient_email VARCHAR(255) DEFAULT NULL,
ADD COLUMN recipient_phone VARCHAR(50) DEFAULT NULL,
ADD COLUMN recipient_gift_date DATE DEFAULT NULL; 

-- Add preferences fields to all_vouchers
ALTER TABLE all_vouchers
ADD COLUMN preferred_location VARCHAR(255) DEFAULT NULL,
ADD COLUMN preferred_time VARCHAR(255) DEFAULT NULL,
ADD COLUMN preferred_day VARCHAR(255) DEFAULT NULL; 

-- Add flight_types column to activity_availability table
ALTER TABLE activity_availability ADD COLUMN flight_types VARCHAR(255) DEFAULT 'All'; 

-- Add voucher_types column to activity_availability table
ALTER TABLE activity_availability ADD COLUMN voucher_types VARCHAR(255) DEFAULT 'All';

-- Add voucher_type column to activity table
ALTER TABLE activity ADD COLUMN voucher_type VARCHAR(255) DEFAULT 'All'; 