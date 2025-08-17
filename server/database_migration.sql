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
    valid_from DATE DEFAULT NULL COMMENT 'Start date of validity',
    valid_until DATE DEFAULT NULL COMMENT 'End date of validity',
    max_uses INT DEFAULT NULL COMMENT 'Maximum number of times this code can be used (NULL = unlimited)',
    current_uses INT DEFAULT 0 COMMENT 'Current number of times used',
    applicable_locations TEXT COMMENT 'Comma-separated list of applicable locations (NULL = all locations)',
    applicable_experiences TEXT COMMENT 'Comma-separated list of applicable experiences (NULL = all experiences)',
    applicable_voucher_types TEXT COMMENT 'Comma-separated list of applicable voucher types (NULL = all types)',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether the voucher code is active',
    created_by VARCHAR(100) DEFAULT 'admin' COMMENT 'Who created this voucher code',
    source_type ENUM('admin_created', 'user_generated') DEFAULT 'admin_created' COMMENT 'Source of voucher code creation',
    customer_email VARCHAR(255) DEFAULT NULL COMMENT 'Customer email for user-generated codes',
    paid_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Amount paid for user-generated codes',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_valid_until (valid_until),
    INDEX idx_is_active (is_active),
    INDEX idx_source_type (source_type),
    INDEX idx_customer_email (customer_email)
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
INSERT INTO voucher_codes (code, title, valid_from, valid_until, max_uses, applicable_locations, applicable_experiences, applicable_voucher_types, source_type) VALUES
('WELCOME10', 'Welcome Discount 10%', '2024-01-01', '2025-12-31', 100, 'Somerset,United Kingdom', 'Shared Flight,Private Charter', 'Weekday Morning,Flexible Weekday,Any Day Flight', 'admin_created'),
('SUMMER2024', 'Summer Special 15%', '2024-06-01', '2024-08-31', 50, 'Somerset', 'Shared Flight', 'Weekday Morning', 'admin_created'),
('SAVE20', 'Save £20', '2024-01-01', '2025-12-31', 200, 'United Kingdom', 'Private Charter', 'Any Day Flight', 'admin_created'),
('FIRSTFLIGHT', 'First Flight 25%', '2024-01-01', '2025-12-31', 75, 'Somerset,United Kingdom', 'Shared Flight', 'Weekday Morning', 'admin_created'); 

-- Create experiences table for managing flight experiences
CREATE TABLE IF NOT EXISTS experiences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    price_from DECIMAL(10,2) NOT NULL,
    price_unit VARCHAR(50) DEFAULT 'pp', -- pp (per person) or total
    max_passengers INT DEFAULT 8,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert sample experiences
INSERT INTO experiences (title, description, image_url, price_from, price_unit, max_passengers, sort_order) VALUES
('Shared Flight', 'Join a Shared Flight with a maximum of 8 passengers. Perfect for Solo Travellers, Couples and Groups looking to Celebrate Special Occasions or Experience Ballooning.', '/images/experiences/shared-flight.jpg', 180.00, 'pp', 8, 1),
('Private Charter', 'Private Charter balloon flights for 2,3,4 or 8 passengers. Mostly purchased for Significant Milestones, Proposals, Major Birthdays, Families or Groups of Friends.', '/images/experiences/private-charter.jpg', 900.00, 'total', 8, 2); 

-- Experiences tablosuna sadece gerekli kolonları ekleme
USE flyawayballooning;

-- Sadece temel ve gerekli kolonları ekle
ALTER TABLE experiences 
ADD COLUMN IF NOT EXISTS image_file VARCHAR(255) DEFAULT NULL COMMENT 'Uploaded image file name',
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Flight' COMMENT 'Experience category',
ADD COLUMN IF NOT EXISTS duration VARCHAR(50) DEFAULT '2-3 hours' COMMENT 'Flight duration',
ADD COLUMN IF NOT EXISTS min_passengers INT DEFAULT 1 COMMENT 'Minimum passengers required';

-- Basit index ekle
ALTER TABLE experiences 
ADD INDEX idx_category (category);

-- Mevcut verileri güncelle
UPDATE experiences SET 
    category = 'Flight',
    duration = '2-3 hours',
    min_passengers = 1
WHERE id > 0;

-- Voucher Types tablosu oluşturma
CREATE TABLE IF NOT EXISTS voucher_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL COMMENT 'Voucher type title (e.g., Weekday Morning, Flexible Weekday)',
    description TEXT COMMENT 'Detailed description of the voucher type',
    image_url VARCHAR(500) DEFAULT NULL COMMENT 'Image URL for the voucher type',
    image_file VARCHAR(255) DEFAULT NULL COMMENT 'Uploaded image file name',
    price_per_person DECIMAL(10,2) NOT NULL COMMENT 'Price per person',
    price_unit ENUM('pp', 'total') DEFAULT 'pp' COMMENT 'Price unit (pp = per person, total = total price)',
    max_passengers INT DEFAULT 8 COMMENT 'Maximum passengers allowed',
    validity_months INT DEFAULT 18 COMMENT 'Validity period in months',
    flight_days VARCHAR(100) DEFAULT 'Monday - Friday' COMMENT 'Available flight days',
    flight_time VARCHAR(100) DEFAULT 'AM' COMMENT 'Available flight time (AM, PM, AM & PM)',
    features TEXT COMMENT 'JSON array of features (e.g., ["1 Hour Air Time", "Complimentary Drink"])',
    terms TEXT COMMENT 'Terms and conditions',
    sort_order INT DEFAULT 0 COMMENT 'Sort order for display',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this voucher type is active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_title (title),
    INDEX idx_is_active (is_active),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Voucher types for different flight experiences';

-- Örnek voucher types ekleme
INSERT INTO voucher_types (title, description, price_per_person, price_unit, max_passengers, validity_months, flight_days, flight_time, features, terms, sort_order, is_active) VALUES
('Weekday Morning', 'Non-refundable weekday morning flights with maximum flexibility for your ballooning experience.', 180.00, 'pp', 8, 18, 'Monday - Friday', 'AM', '["Around 1 Hour of Air Time", "Complimentary Drink", "Inflight Photos and 3D Flight Track", "Upgradeable at Later Date"]', 'Flights subject to weather – your voucher will remain valid and re-bookable within its validity period if cancelled due to weather.', 1, TRUE),
('Flexible Weekday', 'Non-refundable flexible weekday flights with both morning and afternoon options for maximum convenience.', 200.00, 'pp', 8, 18, 'Monday - Friday', 'AM & PM', '["Around 1 Hour of Air Time", "Complimentary Drink", "Inflight Photos and 3D Flight Track", "Upgradeable at Later Date"]', 'Flights subject to weather – your voucher will remain valid and re-bookable within its validity period if cancelled due to weather.', 2, TRUE),
('Any Day Flight', 'Non-refundable flights available any day of the week with maximum flexibility for your schedule.', 250.00, 'pp', 8, 18, 'Any Day', 'AM & PM', '["Around 1 Hour of Air Time", "Complimentary Drink", "Inflight Photos and 3D Flight Track", "Upgradeable at Later Date"]', 'Flights subject to weather – your voucher will remain valid and re-bookable within its validity period if cancelled due to weather.', 3, TRUE); 