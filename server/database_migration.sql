-- Select the database first
USE flyawayballooning;

-- Create passengers table if it doesn't exist
CREATE TABLE IF NOT EXISTS passengers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    weight DECIMAL(5,2),
    ticket_type VARCHAR(100),
    weather_refund BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES all_booking(id) ON DELETE CASCADE
);

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

-- Add per-person pricing columns to activity table
ALTER TABLE activity ADD COLUMN weekday_morning_price DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE activity ADD COLUMN flexible_weekday_price DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE activity ADD COLUMN any_day_flight_price DECIMAL(10,2) DEFAULT NULL;

-- Update existing records to have default pricing if they don't have it
UPDATE activity SET weekday_morning_price = 180 WHERE weekday_morning_price IS NULL;
UPDATE activity SET flexible_weekday_price = 200 WHERE flexible_weekday_price IS NULL;
UPDATE activity SET any_day_flight_price = 220 WHERE any_day_flight_price IS NULL;

-- Make the new columns required for future records
ALTER TABLE activity MODIFY COLUMN weekday_morning_price DECIMAL(10,2) NOT NULL;
ALTER TABLE activity MODIFY COLUMN flexible_weekday_price DECIMAL(10,2) NOT NULL;
ALTER TABLE activity MODIFY COLUMN any_day_flight_price DECIMAL(10,2) NOT NULL;

-- Add From Price columns to activity table
ALTER TABLE activity ADD COLUMN shared_flight_from_price DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE activity ADD COLUMN private_charter_from_price DECIMAL(10,2) DEFAULT NULL;

-- Update existing records to have default From Price if they don't have it
UPDATE activity SET shared_flight_from_price = 180 WHERE shared_flight_from_price IS NULL;
UPDATE activity SET private_charter_from_price = 900 WHERE private_charter_from_price IS NULL;

-- Make the new From Price columns required for future records
ALTER TABLE activity MODIFY COLUMN shared_flight_from_price DECIMAL(10,2) NOT NULL;
ALTER TABLE activity MODIFY COLUMN private_charter_from_price DECIMAL(10,2) NOT NULL;

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

-- Add new columns for experience and voucher type
ALTER TABLE all_booking 
ADD COLUMN experience VARCHAR(100) DEFAULT NULL COMMENT 'Selected experience (Shared Flight, Private Charter)',
ADD COLUMN voucher_type VARCHAR(100) DEFAULT NULL COMMENT 'Selected voucher type (Weekday Morning, Flexible Weekday, Any Day Flight)';

-- Update existing records with default values if needed
UPDATE all_booking SET experience = 'Shared Flight' WHERE experience IS NULL;
UPDATE all_booking SET voucher_type = 'Any Day Flight' WHERE voucher_type IS NULL; 