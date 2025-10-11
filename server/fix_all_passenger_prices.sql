-- Fix all passenger prices to reflect (Paid + Due) / Number of Passengers
-- This script recalculates and updates all passenger prices

-- Step 1: Show current incorrect prices
SELECT 
    b.id as booking_id,
    b.name,
    b.paid,
    b.due,
    b.paid + b.due as total_amount,
    b.pax,
    (b.paid + b.due) / b.pax as correct_price_per_passenger,
    COUNT(p.id) as actual_passenger_count,
    AVG(p.price) as current_avg_passenger_price
FROM all_booking b
LEFT JOIN passenger p ON b.id = p.booking_id
WHERE b.pax > 0
GROUP BY b.id
HAVING COUNT(p.id) > 0 AND ABS(AVG(p.price) - ((b.paid + b.due) / b.pax)) > 0.01
ORDER BY b.id DESC
LIMIT 20;

-- Step 2: Update all passenger prices
-- This uses a subquery to calculate the correct price for each booking
UPDATE passenger p
INNER JOIN (
    SELECT 
        b.id as booking_id,
        (b.paid + COALESCE(b.due, 0)) / GREATEST(b.pax, 1) as correct_price
    FROM all_booking b
    WHERE b.pax > 0
) calc ON p.booking_id = calc.booking_id
SET p.price = calc.correct_price;

-- Step 3: Verify the update
SELECT 
    'Fixed Passenger Prices' as message,
    COUNT(*) as total_passengers_updated
FROM passenger;

-- Step 4: Show sample of updated prices
SELECT 
    b.id as booking_id,
    b.name,
    b.paid,
    b.due,
    b.paid + b.due as total_amount,
    b.pax,
    p.id as passenger_id,
    CONCAT(p.first_name, ' ', p.last_name) as passenger_name,
    p.price as updated_price,
    (b.paid + b.due) / b.pax as expected_price
FROM all_booking b
INNER JOIN passenger p ON b.id = p.booking_id
WHERE b.pax > 0
ORDER BY b.id DESC
LIMIT 20;

