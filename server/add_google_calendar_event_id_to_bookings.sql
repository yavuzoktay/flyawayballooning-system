-- Add google_calendar_event_id column to all_booking table
-- This column stores the Google Calendar event ID for tracking and updating events

ALTER TABLE all_booking 
ADD COLUMN google_calendar_event_id VARCHAR(255) DEFAULT NULL 
COMMENT 'Google Calendar event ID for this booking';

-- Add index for faster lookups
CREATE INDEX idx_google_calendar_event_id ON all_booking(google_calendar_event_id);

