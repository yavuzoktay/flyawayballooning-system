-- Pilots Management Migration Script
-- This script creates the pilots table for managing balloon pilots

USE trip_booking;

-- Create pilots table
CREATE TABLE IF NOT EXISTS pilots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_pilot_name (first_name, last_name)
) COMMENT 'Balloon pilots management table';

-- Verify table creation
DESCRIBE pilots;

