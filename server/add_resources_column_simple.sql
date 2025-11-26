-- Simple SQL commands to add resources column to all_booking and all_vouchers tables
-- Run these commands one by one in your MySQL client

-- Add resources column to all_booking table
ALTER TABLE all_booking 
ADD COLUMN resources VARCHAR(50) DEFAULT NULL 
COMMENT 'Assigned balloon type: Balloon 210 or Balloon 105';

-- Add resources column to all_vouchers table
ALTER TABLE all_vouchers 
ADD COLUMN resources VARCHAR(50) DEFAULT NULL 
COMMENT 'Assigned balloon type: Balloon 210 or Balloon 105';

