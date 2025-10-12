-- Check a specific booking's passenger prices
SELECT 
    b.id as booking_id,
    b.paid,
    b.due,
    (b.paid + b.due) as total,
    b.pax,
    ROUND((b.paid + b.due) / b.pax, 2) as correct_price_per_passenger,
    p.id as passenger_id,
    p.first_name,
    p.last_name,
    p.price as current_passenger_price,
    CASE 
        WHEN ABS(p.price - ROUND((b.paid + b.due) / b.pax, 2)) > 0.01 
        THEN '❌ INCORRECT' 
        ELSE '✅ CORRECT' 
    END as price_status
FROM all_booking b
LEFT JOIN passenger p ON b.id = p.booking_id
WHERE b.paid = 660 AND b.due = 220
ORDER BY b.id, p.id;
