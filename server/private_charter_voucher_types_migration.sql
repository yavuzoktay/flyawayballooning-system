-- Private Charter Voucher Types Migration
-- This migration creates a new table for managing private charter voucher types

-- Create Private Charter Voucher Types table
CREATE TABLE IF NOT EXISTS private_charter_voucher_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL COMMENT 'Private charter voucher type title (e.g., Private Morning Charter, Private Evening Charter)',
    description TEXT COMMENT 'Detailed description of the private charter voucher type',
    image_url VARCHAR(500) DEFAULT NULL COMMENT 'Image URL for the private charter voucher type',
    image_file VARCHAR(255) DEFAULT NULL COMMENT 'Uploaded image file name',
    price_per_person DECIMAL(10,2) NOT NULL COMMENT 'Price per person for private charter',
    price_unit ENUM('pp', 'total') DEFAULT 'pp' COMMENT 'Price unit (pp = per person, total = total price)',
    max_passengers INT DEFAULT 8 COMMENT 'Maximum passengers allowed for private charter',
    validity_months INT DEFAULT 18 COMMENT 'Validity period in months',
    flight_days VARCHAR(100) DEFAULT 'Any Day' COMMENT 'Available flight days for private charter',
    flight_time VARCHAR(100) DEFAULT 'AM & PM' COMMENT 'Available flight time (AM, PM, AM & PM)',
    features TEXT COMMENT 'JSON array of features (e.g., ["Private Balloon", "Flexible Timing", "Personalized Experience"])',
    terms TEXT COMMENT 'Terms and conditions for private charter',
    sort_order INT DEFAULT 0 COMMENT 'Sort order for display',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this private charter voucher type is active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_title (title),
    INDEX idx_is_active (is_active),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Private charter voucher types for exclusive ballooning experiences';

-- Insert sample private charter voucher types
INSERT INTO private_charter_voucher_types (title, description, price_per_person, price_unit, max_passengers, validity_months, flight_days, flight_time, features, terms, sort_order, is_active) VALUES
('Private Morning Charter', 'Exclusive private balloon experience for your group with morning flight times. Perfect for special occasions and intimate groups.', 300.00, 'pp', 8, 18, 'Any Day', 'AM', '["Private Balloon", "Flexible Morning Timing", "Personalized Experience", "Complimentary Drinks", "Professional Photos", "3D Flight Track"]', 'Private charters subject to weather conditions. Your voucher remains valid and re-bookable within its validity period if cancelled due to weather.', 1, TRUE),
('Private Evening Charter', 'Exclusive private balloon experience with evening flight times. Ideal for romantic occasions and sunset flights.', 350.00, 'pp', 8, 18, 'Any Day', 'PM', '["Private Balloon", "Evening/Sunset Timing", "Romantic Experience", "Complimentary Drinks", "Professional Photos", "3D Flight Track"]', 'Private charters subject to weather conditions. Your voucher remains valid and re-bookable within its validity period if cancelled due to weather.', 2, TRUE),
('Flexible Private Charter', 'Ultimate flexibility with private balloon experience available any time of day. Perfect for groups with specific timing requirements.', 400.00, 'pp', 8, 18, 'Any Day', 'AM & PM', '["Private Balloon", "Maximum Flexibility", "Custom Timing", "Personalized Experience", "Complimentary Drinks", "Professional Photos", "3D Flight Track"]', 'Private charters subject to weather conditions. Your voucher remains valid and re-bookable within its validity period if cancelled due to weather.', 3, TRUE);

-- Add private_charter_voucher_type_id column to existing voucher_types table if it doesn't exist
ALTER TABLE voucher_types ADD COLUMN IF NOT EXISTS private_charter_voucher_type_id INT DEFAULT NULL COMMENT 'Reference to private charter voucher type if applicable';

-- Add foreign key constraint
ALTER TABLE voucher_types ADD CONSTRAINT fk_voucher_types_private_charter 
FOREIGN KEY (private_charter_voucher_type_id) REFERENCES private_charter_voucher_types(id) ON DELETE SET NULL;

-- Add index for the foreign key
CREATE INDEX idx_private_charter_voucher_type_id ON voucher_types(private_charter_voucher_type_id); 