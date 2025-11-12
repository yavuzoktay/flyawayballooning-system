-- Fix original_amount to exclude add-on prices
-- Formula: original_amount = paid - due - add_to_booking_items_total_price

USE trip_booking;

-- Show current incorrect values
SELECT 
    id,
    name,
    paid,
    due,
    COALESCE(add_to_booking_items_total_price, 0) as add_on_price,
    original_amount as current_original_amount,
    (paid - due - COALESCE(add_to_booking_items_total_price, 0)) as correct_original_amount,
    choose_add_on,
    experience,
    pax
FROM all_booking
WHERE choose_add_on IS NOT NULL 
    AND choose_add_on != '' 
    AND choose_add_on != 'null'
    AND COALESCE(add_to_booking_items_total_price, 0) > 0
ORDER BY id DESC
LIMIT 20;

-- Update original_amount for bookings with add-ons
UPDATE all_booking
SET original_amount = paid - due - COALESCE(add_to_booking_items_total_price, 0)
WHERE choose_add_on IS NOT NULL 
    AND choose_add_on != '' 
    AND choose_add_on != 'null'
    AND COALESCE(add_to_booking_items_total_price, 0) > 0;

-- Show results
SELECT 
    'Updated original_amount for bookings with add-ons' as message,
    COUNT(*) as affected_rows
FROM all_booking
WHERE choose_add_on IS NOT NULL 
    AND choose_add_on != '' 
    AND choose_add_on != 'null'
    AND COALESCE(add_to_booking_items_total_price, 0) > 0;

-- Verify the update
SELECT 
    id,
    name,
    paid,
    due,
    COALESCE(add_to_booking_items_total_price, 0) as add_on_price,
    original_amount,
    choose_add_on,
    experience,
    pax,
    CASE 
        WHEN original_amount = (paid - due - COALESCE(add_to_booking_items_total_price, 0)) 
        THEN '✓ Correct' 
        ELSE '✗ Still Wrong' 
    END as validation
FROM all_booking
WHERE choose_add_on IS NOT NULL 
    AND choose_add_on != '' 
    AND choose_add_on != 'null'
    AND COALESCE(add_to_booking_items_total_price, 0) > 0
ORDER BY id DESC
LIMIT 20;

