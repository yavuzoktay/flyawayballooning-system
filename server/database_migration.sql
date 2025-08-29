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

-- Add to Booking Items tablosu oluşturma
CREATE TABLE IF NOT EXISTS add_to_booking_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL COMMENT 'Item title (e.g., FAB Cap, FAB Mug)',
    description TEXT COMMENT 'Detailed description of the item',
    image_url VARCHAR(500) DEFAULT NULL COMMENT 'Image URL for the item',
    image_file VARCHAR(255) DEFAULT NULL COMMENT 'Uploaded image file name',
    price DECIMAL(10,2) NOT NULL COMMENT 'Item price',
    price_unit ENUM('fixed', 'pp') DEFAULT 'fixed' COMMENT 'Price unit (fixed = fixed price, pp = per person)',
    category VARCHAR(100) DEFAULT 'Merchandise' COMMENT 'Item category (e.g., Merchandise, Food, Service)',
    stock_quantity INT DEFAULT 0 COMMENT 'Available stock quantity (0 = unlimited)',
    is_physical_item BOOLEAN DEFAULT TRUE COMMENT 'Whether this is a physical item that needs shipping',
    weight_grams INT DEFAULT 0 COMMENT 'Item weight in grams (for shipping calculations)',
    journey_types JSON DEFAULT '["Book Flight", "Flight Voucher", "Redeem Voucher", "Buy Gift"]' COMMENT 'JSON array of applicable journey types',
    sort_order INT DEFAULT 0 COMMENT 'Sort order for display',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this item is active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_title (title),
    INDEX idx_category (category),
    INDEX idx_is_active (is_active),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Additional items that can be added to bookings';

-- Add journey_types column to existing add_to_booking_items table if it doesn't exist
ALTER TABLE add_to_booking_items ADD COLUMN IF NOT EXISTS journey_types JSON DEFAULT '["Book Flight", "Flight Voucher", "Redeem Voucher", "Buy Gift"]' COMMENT 'JSON array of applicable journey types';

-- Update existing records to have default journey types
UPDATE add_to_booking_items SET journey_types = '["Book Flight", "Flight Voucher", "Redeem Voucher", "Buy Gift"]' WHERE journey_types IS NULL;

-- Örnek add to booking items ekleme
INSERT INTO add_to_booking_items (title, description, price, price_unit, category, stock_quantity, is_physical_item, weight_grams, sort_order, is_active) VALUES
('FAB Cap', 'High-quality embroidered cap with FlyAway Ballooning logo. Perfect souvenir from your ballooning experience.', 20.00, 'fixed', 'Merchandise', 100, TRUE, 150, 1, TRUE),
('FAB Mug', 'Ceramic mug featuring beautiful ballooning artwork. Great for your morning coffee or tea.', 15.00, 'fixed', 'Merchandise', 75, TRUE, 300, 2, TRUE),
('Flight Certificate', 'Personalized flight certificate to commemorate your ballooning adventure. Includes your name, date, and flight details.', 25.00, 'fixed', 'Service', 0, FALSE, 0, 3, TRUE),
('Photo Package', 'Professional photo package including 10 high-resolution images from your flight. Delivered digitally.', 35.00, 'fixed', 'Service', 0, FALSE, 0, 4, TRUE);

-- Additional Information Questions tablosu oluşturma
CREATE TABLE IF NOT EXISTS additional_information_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_text TEXT NOT NULL COMMENT 'The question text to display to users',
    question_type ENUM('dropdown', 'text', 'radio', 'checkbox') DEFAULT 'dropdown' COMMENT 'Type of input field',
    is_required BOOLEAN DEFAULT FALSE COMMENT 'Whether this question is mandatory',
    options TEXT COMMENT 'JSON array of options for dropdown/radio/checkbox (e.g., ["Option 1", "Option 2"])',
    placeholder_text VARCHAR(255) DEFAULT NULL COMMENT 'Placeholder text for text inputs',
    help_text VARCHAR(500) DEFAULT NULL COMMENT 'Additional help text below the question',
    category VARCHAR(100) DEFAULT 'General' COMMENT 'Question category for grouping',
    journey_types JSON DEFAULT '["Book Flight", "Flight Voucher", "Redeem Voucher", "Buy Gift"]' COMMENT 'JSON array of applicable journey types',
    sort_order INT DEFAULT 0 COMMENT 'Sort order for display',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this question is active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_question_type (question_type),
    INDEX idx_category (category),
    INDEX idx_is_active (is_active),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Additional information questions for booking forms';

-- Add journey_types column to existing additional_information_questions table if it doesn't exist
ALTER TABLE additional_information_questions ADD COLUMN IF NOT EXISTS journey_types JSON DEFAULT '["Book Flight", "Flight Voucher", "Redeem Voucher", "Buy Gift"]' COMMENT 'JSON array of applicable journey types';

-- Update existing records to have default journey types
UPDATE additional_information_questions SET journey_types = '["Book Flight", "Flight Voucher", "Redeem Voucher", "Buy Gift"]' WHERE journey_types IS NULL;

-- Örnek additional information questions ekleme
INSERT INTO additional_information_questions (question_text, question_type, is_required, options, placeholder_text, help_text, category, sort_order, is_active) VALUES
('Would you like to receive short notice flight availability?', 'dropdown', FALSE, '["Please select", "Yes", "No", "Maybe"]', NULL, 'We may contact you if flights become available at short notice', 'Communication', 1, TRUE),
('How did you hear about us?', 'dropdown', TRUE, '["Please select", "Google Search", "Social Media", "Friend/Family", "Travel Agent", "Other"]', NULL, 'This helps us improve our marketing efforts', 'Marketing', 2, TRUE),
('Why Hot Air Ballooning?', 'dropdown', TRUE, '["Please select", "Bucket List", "Anniversary", "Birthday", "Proposal", "Adventure", "Gift", "Other"]', NULL, 'Tell us what makes this special for you', 'Experience', 3, TRUE),
('Any special requirements or requests?', 'text', FALSE, NULL, 'Please let us know if you have any special needs...', 'We will do our best to accommodate your requests', 'Special Requirements', 4, TRUE),
('Preferred contact method', 'radio', FALSE, '["Email", "Phone", "SMS", "WhatsApp"]', NULL, 'How would you prefer us to contact you?', 'Communication', 5, TRUE);

-- Terms & Conditions tablosu oluşturma
CREATE TABLE IF NOT EXISTS terms_and_conditions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL COMMENT 'Terms & Conditions title (e.g., Weekday Morning Terms)',
    content TEXT NOT NULL COMMENT 'The actual terms and conditions text content',
    voucher_type_ids JSON COMMENT 'Array of voucher type IDs this applies to (e.g., [1, 2, 3])',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether these terms are active',
    sort_order INT DEFAULT 0 COMMENT 'Sort order for display',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_title (title),
    INDEX idx_is_active (is_active),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Terms and conditions for different voucher types';

-- Örnek terms and conditions ekleme
INSERT INTO terms_and_conditions (title, content, voucher_type_ids, sort_order, is_active) VALUES
('Weekday Morning Terms', 'Your voucher is valid for weekday morning flights only. You may upgrade your voucher at any time to include weekday evenings or weekends if you wish.\n\nBallooning is a weather-dependent activity.\n\nYour voucher is valid for 18 months from the date of purchase.\n\nVouchers are non-refundable under any circumstances but remain fully re-bookable within the 18-month validity period.\n\nIf 6 separate flight attempts within the 18 months are cancelled by us due to weather, we will extend your voucher for an additional 12 months free of charge.\n\nNo changes or cancellations can be made within 48 hours of your scheduled flight.\n\nYour flight will never expire as long as you continue to meet the terms & conditions outlined above.', '[1]', 1, TRUE),
('Flexible Weekday Terms', 'Your voucher is valid for flexible weekday flights (morning and evening). You may upgrade your voucher at any time to include weekends if you wish.\n\nBallooning is a weather-dependent activity.\n\nYour voucher is valid for 18 months from the date of purchase.\n\nVouchers are non-refundable under any circumstances but remain fully re-bookable within the 18-month validity period.\n\nIf 6 separate flight attempts within the 18 months are cancelled by us due to weather, we will extend your voucher for an additional 12 months free of charge.\n\nNo changes or cancellations can be made within 48 hours of your scheduled flight.\n\nYour flight will never expire as long as you continue to meet the terms & conditions outlined above.', '[2]', 2, TRUE),
('Any Day Flight Terms', 'Your voucher is valid for flights on any day of the week (morning and evening).\n\nBallooning is a weather-dependent activity.\n\nYour voucher is valid for 18 months from the date of purchase.\n\nVouchers are non-refundable under any circumstances but remain fully re-bookable within the 18-month validity period.\n\nIf 6 separate flight attempts within the 18 months are cancelled by us due to weather, we will extend your voucher for an additional 12 months free of charge.\n\nNo changes or cancellations can be made within 48 hours of your scheduled flight.\n\nYour flight will never expire as long as you continue to meet the terms & conditions outlined above.', '[3]', 3, TRUE);

-- Additional Information Answers tablosu oluşturma
CREATE TABLE IF NOT EXISTS additional_information_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL COMMENT 'Reference to the booking',
    question_id INT NOT NULL COMMENT 'Reference to the additional_information_questions table',
    answer TEXT COMMENT 'The answer provided by the user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_booking_id (booking_id),
    INDEX idx_question_id (question_id),
    INDEX idx_booking_question (booking_id, question_id),
    
    FOREIGN KEY (booking_id) REFERENCES all_booking(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES additional_information_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores answers to additional information questions for bookings';

-- Add a column to all_booking table to store additional information as JSON for backward compatibility
ALTER TABLE all_booking ADD COLUMN IF NOT EXISTS additional_information_json JSON DEFAULT NULL COMMENT 'JSON object containing additional information answers'; 