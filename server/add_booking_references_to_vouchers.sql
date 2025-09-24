-- Add booking_references column to all_vouchers table to track which bookings caused flight attempts
-- This column will store JSON data linking each flight attempt to the specific booking that caused it

ALTER TABLE all_vouchers 
ADD COLUMN booking_references TEXT DEFAULT NULL 
COMMENT 'JSON array storing booking references for each flight attempt';

-- Example structure of booking_references JSON:
-- [
--   {
--     "booking_id": 123,
--     "cancelled_at": "2024-01-15T10:30:00.000Z",
--     "attempt_number": 1
--   },
--   {
--     "booking_id": 456,
--     "cancelled_at": "2024-02-20T14:45:00.000Z", 
--     "attempt_number": 2
--   }
-- ]
