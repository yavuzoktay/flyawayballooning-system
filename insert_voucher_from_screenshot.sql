-- INSERT statement for all_vouchers table based on Flight Voucher Details screenshot
-- Voucher Code: FAB1325, FAB24000
-- Note: Using FAB1325 as voucher_ref (first voucher code in the list)

INSERT INTO trip_booking.all_vouchers (
    voucher_ref,
    name,
    purchaser_name,
    purchaser_email,
    purchaser_phone,
    purchaser_mobile,
    experience_type,
    book_flight,
    voucher_type,
    voucher_type_detail,
    email,
    expires,
    redeemed,
    paid,
    offer_code,
    created_at,
    status,
    voucher_code,
    weight,
    mobile,
    phone,
    recipient_name,
    recipient_email,
    recipient_phone,
    recipient_gift_date,
    preferred_location,
    preferred_time,
    preferred_day,
    flight_attempts,
    numberOfPassengers
) VALUES (
    'FAB1325',                    -- voucher_ref (using first voucher code from the list)
    'Shopify',                     -- name
    'Shopify',                     -- purchaser_name
    NULL,                          -- purchaser_email
    NULL,                          -- purchaser_phone
    NULL,                          -- purchaser_mobile
    'Shared Flight',               -- experience_type
    'Flight Voucher',              -- book_flight
    'Any Day Flight',              -- voucher_type
    NULL,                          -- voucher_type_detail
    NULL,                          -- email
    '2026-06-09 00:00:00',        -- expires (09/06/26 converted to MySQL format)
    'No',                          -- redeemed
    205.00,                        -- paid (£205.00)
    NULL,                          -- offer_code
    '2024-06-09 00:00:00',        -- created_at (09/06/2024 converted to MySQL format)
    'active',                      -- status
    NULL,                          -- voucher_code
    NULL,                          -- weight
    NULL,                          -- mobile
    NULL,                          -- phone
    NULL,                          -- recipient_name
    NULL,                          -- recipient_email
    NULL,                          -- recipient_phone
    NULL,                          -- recipient_gift_date
    NULL,                          -- preferred_location
    NULL,                          -- preferred_time
    NULL,                          -- preferred_day
    0,                             -- flight_attempts
    2                              -- numberOfPassengers
);
