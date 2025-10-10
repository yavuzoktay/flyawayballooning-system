-- Add 'booked' column to activity_availability table
-- This column tracks the number of booked passengers for each availability slot

ALTER TABLE activity_availability 
ADD COLUMN booked INT DEFAULT 0 AFTER available;

-- Update existing records to calculate booked from capacity - available
UPDATE activity_availability 
SET booked = capacity - available 
WHERE booked = 0 OR booked IS NULL;

-- Verify the changes
SELECT id, date, time, capacity, available, booked, status 
FROM activity_availability 
ORDER BY date, time 
LIMIT 10;

