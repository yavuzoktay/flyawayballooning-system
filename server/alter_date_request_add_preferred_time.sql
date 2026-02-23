-- Add preferred_time column to date_request table (for Request Date popup)
-- Run this manually if the server migration doesn't add it automatically.
-- Safe to run: if column already exists, you'll get an error - ignore it.

ALTER TABLE date_request 
ADD COLUMN preferred_time VARCHAR(50) DEFAULT NULL 
COMMENT 'Preferred time (Morning/Evening)' 
AFTER requested_date;
