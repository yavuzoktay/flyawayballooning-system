-- Migration script to add email and phone columns to crew and pilots tables
-- This allows storing contact information for crew members and pilots

USE trip_booking;

-- Add email and phone columns to crew table
ALTER TABLE crew 
ADD COLUMN email VARCHAR(255) NULL COMMENT 'Email address of the crew member' 
AFTER last_name;

ALTER TABLE crew 
ADD COLUMN phone VARCHAR(50) NULL COMMENT 'Phone number of the crew member' 
AFTER email;

-- Add indexes for email and phone in crew table
ALTER TABLE crew 
ADD INDEX idx_email (email),
ADD INDEX idx_phone (phone);

-- Add email and phone columns to pilots table
ALTER TABLE pilots 
ADD COLUMN email VARCHAR(255) NULL COMMENT 'Email address of the pilot' 
AFTER last_name;

ALTER TABLE pilots 
ADD COLUMN phone VARCHAR(50) NULL COMMENT 'Phone number of the pilot' 
AFTER email;

-- Add indexes for email and phone in pilots table
ALTER TABLE pilots 
ADD INDEX idx_email (email),
ADD INDEX idx_phone (phone);

