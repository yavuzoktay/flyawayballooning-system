-- Quick fix: Update all passenger prices in one command
-- Run this directly in MySQL to fix all passenger prices immediately

UPDATE passenger p
INNER JOIN all_booking b ON p.booking_id = b.id
SET p.price = (b.paid + COALESCE(b.due, 0)) / GREATEST(b.pax, 1)
WHERE b.pax > 0;

