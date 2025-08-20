-- Crew Management Migration Script
-- This script creates the crew table for managing balloon crew members

USE trip_booking;

-- Create crew table
CREATE TABLE IF NOT EXISTS crew (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_crew_name (first_name, last_name)
) COMMENT 'Balloon crew members management table';

-- Create flight crew assignments table
CREATE TABLE IF NOT EXISTS flight_crew_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    crew_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_slot (activity_id, date, time)
) COMMENT 'Assigned crew per activity/date/time slot';

-- Insert some sample crew members
INSERT INTO crew (first_name, last_name) VALUES 
('John', 'Smith'),
('Sarah', 'Johnson'),
('Michael', 'Brown'),
('Emily', 'Davis');

-- Verify table creation
DESCRIBE crew;
DESCRIBE flight_crew_assignments;
SELECT * FROM crew; 