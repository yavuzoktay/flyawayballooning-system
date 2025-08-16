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

-- Make the From Price columns required for future records
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

-- ===== VOUCHER CODE SYSTEM =====

-- Create voucher_codes table for the new voucher code system
CREATE TABLE IF NOT EXISTS voucher_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL COMMENT 'Unique voucher code (e.g., SUMMER2024, WELCOME10)',
    title VARCHAR(255) NOT NULL COMMENT 'Voucher title/description',
    discount_type ENUM('percentage', 'fixed_amount') NOT NULL COMMENT 'Type of discount',
    discount_value DECIMAL(10,2) NOT NULL COMMENT 'Discount value (percentage or fixed amount)',
    min_booking_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Minimum booking amount required',
    max_discount DECIMAL(10,2) DEFAULT NULL COMMENT 'Maximum discount amount (for percentage discounts)',
    valid_from DATE NOT NULL COMMENT 'Start date of validity',
    valid_until DATE NOT NULL COMMENT 'End date of validity',
    max_uses INT DEFAULT NULL COMMENT 'Maximum number of times this code can be used (NULL = unlimited)',
    current_uses INT DEFAULT 0 COMMENT 'Current number of times used',
    applicable_locations TEXT COMMENT 'Comma-separated list of applicable locations (NULL = all locations)',
    applicable_experiences TEXT COMMENT 'Comma-separated list of applicable experiences (NULL = all experiences)',
    applicable_voucher_types TEXT COMMENT 'Comma-separated list of applicable voucher types (NULL = all types)',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether the voucher code is active',
    created_by VARCHAR(100) DEFAULT 'admin' COMMENT 'Who created this voucher code',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_valid_until (valid_until),
    INDEX idx_is_active (is_active)
);

-- Create voucher_code_usage table to track usage
CREATE TABLE IF NOT EXISTS voucher_code_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voucher_code_id INT NOT NULL,
    booking_id INT NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    discount_applied DECIMAL(10,2) NOT NULL COMMENT 'Actual discount amount applied',
    original_amount DECIMAL(10,2) NOT NULL COMMENT 'Original booking amount',
    final_amount DECIMAL(10,2) NOT NULL COMMENT 'Final amount after discount',
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (voucher_code_id) REFERENCES voucher_codes(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES all_booking(id) ON DELETE CASCADE,
    INDEX idx_voucher_code_id (voucher_code_id),
    INDEX idx_booking_id (booking_id),
    INDEX idx_customer_email (customer_email)
);

-- Add voucher_code column to all_booking table
ALTER TABLE all_booking 
ADD COLUMN voucher_code VARCHAR(50) DEFAULT NULL COMMENT 'Applied voucher code',
ADD COLUMN voucher_discount DECIMAL(10,2) DEFAULT 0 COMMENT 'Discount amount from voucher code',
ADD COLUMN original_amount DECIMAL(10,2) DEFAULT NULL COMMENT 'Original amount before voucher discount',
ADD FOREIGN KEY (voucher_code) REFERENCES voucher_codes(code) ON DELETE SET NULL;

-- Insert sample voucher codes for testing
INSERT INTO voucher_codes (code, title, discount_type, discount_value, min_booking_amount, max_discount, valid_from, valid_until, max_uses, applicable_locations, applicable_experiences, applicable_voucher_types) VALUES
('WELCOME10', 'Welcome Discount 10%', 'percentage', 10.00, 100.00, 50.00, '2024-01-01', '2025-12-31', 100, 'Somerset,United Kingdom', 'Shared Flight,Private Charter', 'Weekday Morning,Flexible Weekday,Any Day Flight'),
('SUMMER2024', 'Summer Special 15%', 'percentage', 15.00, 150.00, 75.00, '2024-06-01', '2024-08-31', 50, 'Somerset', 'Shared Flight', 'Weekday Morning'),
('SAVE20', 'Save £20', 'fixed_amount', 20.00, 200.00, NULL, '2024-01-01', '2025-12-31', 200, 'United Kingdom', 'Private Charter', 'Any Day Flight'),
('FIRSTFLIGHT', 'First Flight 25%', 'percentage', 25.00, 100.00, 100.00, '2024-01-01', '2025-12-31', 75, 'Somerset,United Kingdom', 'Shared Flight', 'Weekday Morning'); 