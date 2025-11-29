-- Migration script to add flight_date column to booking_status_history table
-- This allows tracking which flight date each history entry refers to

USE trip_booking;

-- ============================================
-- Add flight_date column to booking_status_history table
-- ============================================

-- Add flight_date column (will fail silently if column already exists)
ALTER TABLE booking_status_history 
ADD COLUMN flight_date DATETIME NULL COMMENT 'The actual flight date this history entry refers to' 
AFTER changed_at;

-- Add index for flight_date for faster queries (will fail silently if index already exists)
ALTER TABLE booking_status_history 
ADD INDEX idx_flight_date (flight_date);

