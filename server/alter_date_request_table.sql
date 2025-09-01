-- Add missing columns to existing date_request table
-- This script adds the required columns that are missing from the current table structure

-- Add phone column for customer phone number
ALTER TABLE date_request 
ADD COLUMN phone VARCHAR(50) NOT NULL COMMENT 'Customer phone number' 
AFTER name;

-- Add location column for requested location
ALTER TABLE date_request 
ADD COLUMN location VARCHAR(255) NOT NULL COMMENT 'Requested location (e.g., Bath, Devon, Somerset)' 
AFTER phone;

-- Add flight_type column for type of flight
ALTER TABLE date_request 
ADD COLUMN flight_type VARCHAR(100) NOT NULL COMMENT 'Type of flight (e.g., Shared Flight, Private Charter)' 
AFTER location;

-- Add notes column for additional comments
ALTER TABLE date_request 
ADD COLUMN notes TEXT COMMENT 'Additional notes or comments' 
AFTER status;

-- Add updated_at column for tracking modifications
ALTER TABLE date_request 
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'When the request was last updated' 
AFTER created_at;

-- Add indexes for better performance
ALTER TABLE date_request 
ADD INDEX idx_phone (phone),
ADD INDEX idx_location (location),
ADD INDEX idx_flight_type (flight_type),
ADD INDEX idx_requested_date (requested_date),
ADD INDEX idx_status (status);

-- Verify the updated table structure
DESCRIBE date_request;

-- Show sample data to confirm structure
SELECT * FROM date_request LIMIT 5;
