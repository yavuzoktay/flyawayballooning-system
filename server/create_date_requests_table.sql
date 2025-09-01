-- Create date_requests table if it doesn't exist
-- This table stores date request submissions from the frontend

CREATE TABLE IF NOT EXISTS date_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT 'Customer name',
    phone VARCHAR(50) NOT NULL COMMENT 'Customer phone number',
    email VARCHAR(255) NOT NULL COMMENT 'Customer email address',
    location VARCHAR(255) NOT NULL COMMENT 'Requested location (e.g., Bath, Devon, Somerset)',
    flight_type VARCHAR(100) NOT NULL COMMENT 'Type of flight (e.g., Shared Flight, Private Charter)',
    requested_date DATE NOT NULL COMMENT 'Requested flight date',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT 'Request status',
    notes TEXT COMMENT 'Additional notes or comments',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When the request was created',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'When the request was last updated',
    
    INDEX idx_email (email),
    INDEX idx_location (location),
    INDEX idx_requested_date (requested_date),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Date requests submitted by customers';

-- Verify the table was created
DESCRIBE date_requests;
