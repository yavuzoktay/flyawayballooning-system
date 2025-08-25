-- Check current activity data and private_charter_pricing
SELECT id, activity_name, location, flight_type, private_charter_voucher_types, private_charter_pricing 
FROM activity 
WHERE location = 'Bath' 
ORDER BY id; 