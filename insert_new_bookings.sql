INSERT IGNORE INTO trip_booking.voucher_codes (
    code,
    title,
    valid_from,
    valid_until,
    max_uses,
    current_uses,
    is_active,
    created_by
) VALUES (
    'EFYR-KKGS',
    'Booking Reference: EFYR-KKGS',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

INSERT INTO trip_booking.all_booking (
    name,
    flight_type,
    flight_date,
    pax,
    location,
    status,
    paid,
    due,
    voucher_code,
    created_at,
    expires,
    manual_status_override,
    additional_notes,
    hear_about_us,
    ballooning_reason,
    prefer,
    weight,
    email,
    phone,
    choose_add_on,
    preferred_location,
    preferred_time,
    preferred_day,
    flight_attempts,
    activity_id,
    time_slot,
    experience,
    voucher_type,
    voucher_type_detail,
    voucher_discount,
    original_amount,
    add_to_booking_items_total_price,
    weather_refund_total_price,
    current_total_price,
    flight_type_source,
    resources,
    google_calendar_event_id
) VALUES (
    'Anil Kalsi',
    'Private Charter',
    NULL,
    2,
    NULL,
    'Confirmed',
    1000,
    0,
    'EFYR-KKGS',
    '2024-07-04 10:45:30',
    '2026-01-04 09:45:30',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'askalsi9@gmail.com',
    '+447500686865',
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    NULL,
    'Private Charter',
    'Private Charter',
    NULL,
    0.00,
    NULL,
    0.00,
    0.00,
    NULL,
    'Private Charter',
    NULL,
    NULL
);

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'Anil',
    'Kalsi',
    NULL,
    'askalsi9@gmail.com',
    '+447500686865',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'Anil Kalsi' AND ab.email = 'askalsi9@gmail.com' AND DATE(ab.created_at) = DATE('2024-07-04 10:45:30') AND ab.voucher_code = 'EFYR-KKGS'
LIMIT 1;

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'Anil',
    'Kalsi',
    NULL,
    'askalsi9@gmail.com',
    '+447500686865',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'Anil Kalsi' AND ab.email = 'askalsi9@gmail.com' AND DATE(ab.created_at) = DATE('2024-07-04 10:45:30') AND ab.voucher_code = 'EFYR-KKGS'
LIMIT 1;



INSERT IGNORE INTO trip_booking.voucher_codes (
    code,
    title,
    valid_from,
    valid_until,
    max_uses,
    current_uses,
    is_active,
    created_by
) VALUES (
    'WSJU-PMWY',
    'Booking Reference: WSJU-PMWY',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

INSERT INTO trip_booking.all_booking (
    name,
    flight_type,
    flight_date,
    pax,
    location,
    status,
    paid,
    due,
    voucher_code,
    created_at,
    expires,
    manual_status_override,
    additional_notes,
    hear_about_us,
    ballooning_reason,
    prefer,
    weight,
    email,
    phone,
    choose_add_on,
    preferred_location,
    preferred_time,
    preferred_day,
    flight_attempts,
    activity_id,
    time_slot,
    experience,
    voucher_type,
    voucher_type_detail,
    voucher_discount,
    original_amount,
    add_to_booking_items_total_price,
    weather_refund_total_price,
    current_total_price,
    flight_type_source,
    resources,
    google_calendar_event_id
) VALUES (
    'Kate Strudwick',
    'Shared Flight',
    NULL,
    2,
    NULL,
    'Confirmed',
    610,
    0,
    'WSJU-PMWY',
    '2024-07-08 10:14:29',
    '2026-01-08 09:14:29',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'kmstrudwick@hotmail.com',
    '+447789718410',
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    NULL,
    'Shared Flight',
    'Any Day Voucher',
    NULL,
    0.00,
    NULL,
    0.00,
    0.00,
    NULL,
    'Shared Flight',
    NULL,
    NULL
);

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'Kate',
    'Strudwick',
    NULL,
    'kmstrudwick@hotmail.com',
    '+447789718410',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'Kate Strudwick' AND ab.email = 'kmstrudwick@hotmail.com' AND DATE(ab.created_at) = DATE('2024-07-08 10:14:29') AND ab.voucher_code = 'WSJU-PMWY'
LIMIT 1;

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'Kate',
    'Strudwick',
    NULL,
    'kmstrudwick@hotmail.com',
    '+447789718410',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'Kate Strudwick' AND ab.email = 'kmstrudwick@hotmail.com' AND DATE(ab.created_at) = DATE('2024-07-08 10:14:29') AND ab.voucher_code = 'WSJU-PMWY'
LIMIT 1;



INSERT IGNORE INTO trip_booking.voucher_codes (
    code,
    title,
    valid_from,
    valid_until,
    max_uses,
    current_uses,
    is_active,
    created_by
) VALUES (
    'DBXX-PKDV',
    'Booking Reference: DBXX-PKDV',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

INSERT INTO trip_booking.all_booking (
    name,
    flight_type,
    flight_date,
    pax,
    location,
    status,
    paid,
    due,
    voucher_code,
    created_at,
    expires,
    manual_status_override,
    additional_notes,
    hear_about_us,
    ballooning_reason,
    prefer,
    weight,
    email,
    phone,
    choose_add_on,
    preferred_location,
    preferred_time,
    preferred_day,
    flight_attempts,
    activity_id,
    time_slot,
    experience,
    voucher_type,
    voucher_type_detail,
    voucher_discount,
    original_amount,
    add_to_booking_items_total_price,
    weather_refund_total_price,
    current_total_price,
    flight_type_source,
    resources,
    google_calendar_event_id
) VALUES (
    'Natalja Racjo',
    'Shared Flight',
    NULL,
    2,
    NULL,
    'Confirmed',
    610,
    0,
    'DBXX-PKDV',
    '2024-08-01 10:09:05',
    '2026-02-01 09:09:05',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'natalja.racko@outlook.com',
    '+447927761346',
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    NULL,
    'Shared Flight',
    'Any Day Voucher',
    NULL,
    0.00,
    NULL,
    0.00,
    0.00,
    NULL,
    'Shared Flight',
    NULL,
    NULL
);

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'Natalja',
    'Racjo',
    NULL,
    'natalja.racko@outlook.com',
    '+447927761346',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'Natalja Racjo' AND ab.email = 'natalja.racko@outlook.com' AND DATE(ab.created_at) = DATE('2024-08-01 10:09:05') AND ab.voucher_code = 'DBXX-PKDV'
LIMIT 1;

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'Natalja',
    'Racjo',
    NULL,
    'natalja.racko@outlook.com',
    '+447927761346',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'Natalja Racjo' AND ab.email = 'natalja.racko@outlook.com' AND DATE(ab.created_at) = DATE('2024-08-01 10:09:05') AND ab.voucher_code = 'DBXX-PKDV'
LIMIT 1;



INSERT IGNORE INTO trip_booking.voucher_codes (
    code,
    title,
    valid_from,
    valid_until,
    max_uses,
    current_uses,
    is_active,
    created_by
) VALUES (
    'JJPN-BTKP',
    'Booking Reference: JJPN-BTKP',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

INSERT INTO trip_booking.all_booking (
    name,
    flight_type,
    flight_date,
    pax,
    location,
    status,
    paid,
    due,
    voucher_code,
    created_at,
    expires,
    manual_status_override,
    additional_notes,
    hear_about_us,
    ballooning_reason,
    prefer,
    weight,
    email,
    phone,
    choose_add_on,
    preferred_location,
    preferred_time,
    preferred_day,
    flight_attempts,
    activity_id,
    time_slot,
    experience,
    voucher_type,
    voucher_type_detail,
    voucher_discount,
    original_amount,
    add_to_booking_items_total_price,
    weather_refund_total_price,
    current_total_price,
    flight_type_source,
    resources,
    google_calendar_event_id
) VALUES (
    'John Wilkin',
    'Shared Flight',
    NULL,
    2,
    NULL,
    'Confirmed',
    650,
    0,
    'JJPN-BTKP',
    '2024-08-04 20:14:26',
    '2026-02-04 19:14:26',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'johngwilkin@googlemail.com',
    '+447955808717',
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    NULL,
    'Shared Flight',
    'Any Day Voucher',
    NULL,
    0.00,
    NULL,
    0.00,
    0.00,
    NULL,
    'Shared Flight',
    NULL,
    NULL
);

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'John',
    'Wilkin',
    NULL,
    'johngwilkin@googlemail.com',
    '+447955808717',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'John Wilkin' AND ab.email = 'johngwilkin@googlemail.com' AND DATE(ab.created_at) = DATE('2024-08-04 20:14:26') AND ab.voucher_code = 'JJPN-BTKP'
LIMIT 1;

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'John',
    'Wilkin',
    NULL,
    'johngwilkin@googlemail.com',
    '+447955808717',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'John Wilkin' AND ab.email = 'johngwilkin@googlemail.com' AND DATE(ab.created_at) = DATE('2024-08-04 20:14:26') AND ab.voucher_code = 'JJPN-BTKP'
LIMIT 1;



INSERT IGNORE INTO trip_booking.voucher_codes (
    code,
    title,
    valid_from,
    valid_until,
    max_uses,
    current_uses,
    is_active,
    created_by
) VALUES (
    'FSBP-PCJS',
    'Booking Reference: FSBP-PCJS',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

INSERT INTO trip_booking.all_booking (
    name,
    flight_type,
    flight_date,
    pax,
    location,
    status,
    paid,
    due,
    voucher_code,
    created_at,
    expires,
    manual_status_override,
    additional_notes,
    hear_about_us,
    ballooning_reason,
    prefer,
    weight,
    email,
    phone,
    choose_add_on,
    preferred_location,
    preferred_time,
    preferred_day,
    flight_attempts,
    activity_id,
    time_slot,
    experience,
    voucher_type,
    voucher_type_detail,
    voucher_discount,
    original_amount,
    add_to_booking_items_total_price,
    weather_refund_total_price,
    current_total_price,
    flight_type_source,
    resources,
    google_calendar_event_id
) VALUES (
    'Anne Lie Vesterager',
    'Shared Flight',
    NULL,
    2,
    NULL,
    'Confirmed',
    610,
    0,
    'FSBP-PCJS',
    '2024-08-06 08:25:31',
    '2026-02-06 07:25:31',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'annelie27@hotmail.com',
    '+41797080623',
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    NULL,
    'Shared Flight',
    'Any Day Voucher',
    NULL,
    0.00,
    NULL,
    0.00,
    0.00,
    NULL,
    'Shared Flight',
    NULL,
    NULL
);

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'Anne Lie',
    'Vesterager',
    NULL,
    'annelie27@hotmail.com',
    '+41797080623',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'Anne Lie Vesterager' AND ab.email = 'annelie27@hotmail.com' AND DATE(ab.created_at) = DATE('2024-08-06 08:25:31') AND ab.voucher_code = 'FSBP-PCJS'
LIMIT 1;

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'Anne Lie',
    'Vesterager',
    NULL,
    'annelie27@hotmail.com',
    '+41797080623',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'Anne Lie Vesterager' AND ab.email = 'annelie27@hotmail.com' AND DATE(ab.created_at) = DATE('2024-08-06 08:25:31') AND ab.voucher_code = 'FSBP-PCJS'
LIMIT 1;



INSERT IGNORE INTO trip_booking.voucher_codes (
    code,
    title,
    valid_from,
    valid_until,
    max_uses,
    current_uses,
    is_active,
    created_by
) VALUES (
    'KWDC-BUER',
    'Booking Reference: KWDC-BUER',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

INSERT INTO trip_booking.all_booking (
    name,
    flight_type,
    flight_date,
    pax,
    location,
    status,
    paid,
    due,
    voucher_code,
    created_at,
    expires,
    manual_status_override,
    additional_notes,
    hear_about_us,
    ballooning_reason,
    prefer,
    weight,
    email,
    phone,
    choose_add_on,
    preferred_location,
    preferred_time,
    preferred_day,
    flight_attempts,
    activity_id,
    time_slot,
    experience,
    voucher_type,
    voucher_type_detail,
    voucher_discount,
    original_amount,
    add_to_booking_items_total_price,
    weather_refund_total_price,
    current_total_price,
    flight_type_source,
    resources,
    google_calendar_event_id
) VALUES (
    'JAMES HEWITT',
    'Shared Flight',
    NULL,
    2,
    NULL,
    'Confirmed',
    610,
    0,
    'KWDC-BUER',
    '2024-10-31 05:04:31',
    '2026-05-01 05:04:31',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Jamiehewitt21@hotmail.co.uk',
    '+447746246389',
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    NULL,
    'Shared Flight',
    'Any Day Voucher',
    NULL,
    0.00,
    NULL,
    0.00,
    0.00,
    NULL,
    'Shared Flight',
    NULL,
    NULL
);

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'JAMES',
    'HEWITT',
    NULL,
    'Jamiehewitt21@hotmail.co.uk',
    '+447746246389',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'JAMES HEWITT' AND ab.email = 'Jamiehewitt21@hotmail.co.uk' AND DATE(ab.created_at) = DATE('2024-10-31 05:04:31') AND ab.voucher_code = 'KWDC-BUER'
LIMIT 1;

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'JAMES',
    'HEWITT',
    NULL,
    'Jamiehewitt21@hotmail.co.uk',
    '+447746246389',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'JAMES HEWITT' AND ab.email = 'Jamiehewitt21@hotmail.co.uk' AND DATE(ab.created_at) = DATE('2024-10-31 05:04:31') AND ab.voucher_code = 'KWDC-BUER'
LIMIT 1;



INSERT IGNORE INTO trip_booking.voucher_codes (
    code,
    title,
    valid_from,
    valid_until,
    max_uses,
    current_uses,
    is_active,
    created_by
) VALUES (
    'VNSY-HPWC',
    'Booking Reference: VNSY-HPWC',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

INSERT INTO trip_booking.all_booking (
    name,
    flight_type,
    flight_date,
    pax,
    location,
    status,
    paid,
    due,
    voucher_code,
    created_at,
    expires,
    manual_status_override,
    additional_notes,
    hear_about_us,
    ballooning_reason,
    prefer,
    weight,
    email,
    phone,
    choose_add_on,
    preferred_location,
    preferred_time,
    preferred_day,
    flight_attempts,
    activity_id,
    time_slot,
    experience,
    voucher_type,
    voucher_type_detail,
    voucher_discount,
    original_amount,
    add_to_booking_items_total_price,
    weather_refund_total_price,
    current_total_price,
    flight_type_source,
    resources,
    google_calendar_event_id
) VALUES (
    'Pia Schardt',
    'Shared Flight',
    NULL,
    1,
    NULL,
    'Confirmed',
    305,
    0,
    'VNSY-HPWC',
    '2024-11-30 18:22:41',
    '2026-05-30 18:22:41',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'pia2001@hotmail.de',
    '+447746219712',
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    NULL,
    'Shared Flight',
    'Any Day Voucher',
    NULL,
    0.00,
    NULL,
    0.00,
    0.00,
    NULL,
    'Shared Flight',
    NULL,
    NULL
);

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'Pia',
    'Schardt',
    NULL,
    'pia2001@hotmail.de',
    '+447746219712',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'Pia Schardt' AND ab.email = 'pia2001@hotmail.de' AND DATE(ab.created_at) = DATE('2024-11-30 18:22:41') AND ab.voucher_code = 'VNSY-HPWC'
LIMIT 1;



INSERT IGNORE INTO trip_booking.voucher_codes (
    code,
    title,
    valid_from,
    valid_until,
    max_uses,
    current_uses,
    is_active,
    created_by
) VALUES (
    'YRAN-GFIJ',
    'Booking Reference: YRAN-GFIJ',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

INSERT INTO trip_booking.all_booking (
    name,
    flight_type,
    flight_date,
    pax,
    location,
    status,
    paid,
    due,
    voucher_code,
    created_at,
    expires,
    manual_status_override,
    additional_notes,
    hear_about_us,
    ballooning_reason,
    prefer,
    weight,
    email,
    phone,
    choose_add_on,
    preferred_location,
    preferred_time,
    preferred_day,
    flight_attempts,
    activity_id,
    time_slot,
    experience,
    voucher_type,
    voucher_type_detail,
    voucher_discount,
    original_amount,
    add_to_booking_items_total_price,
    weather_refund_total_price,
    current_total_price,
    flight_type_source,
    resources,
    google_calendar_event_id
) VALUES (
    'Emmitt Bradstock',
    'Shared Flight',
    NULL,
    3,
    NULL,
    'Confirmed',
    915,
    0,
    'YRAN-GFIJ',
    '2024-12-10 12:01:56',
    '2026-06-10 12:01:56',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'emmittbradstock65@hotmail.com',
    '+447771966501',
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    NULL,
    'Shared Flight',
    'Any Day Voucher',
    NULL,
    0.00,
    NULL,
    0.00,
    0.00,
    NULL,
    'Shared Flight',
    NULL,
    NULL
);

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'Emmitt',
    'Bradstock',
    NULL,
    'emmittbradstock65@hotmail.com',
    '+447771966501',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'Emmitt Bradstock' AND ab.email = 'emmittbradstock65@hotmail.com' AND DATE(ab.created_at) = DATE('2024-12-10 12:01:56') AND ab.voucher_code = 'YRAN-GFIJ'
LIMIT 1;

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'Emmitt',
    'Bradstock',
    NULL,
    'emmittbradstock65@hotmail.com',
    '+447771966501',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'Emmitt Bradstock' AND ab.email = 'emmittbradstock65@hotmail.com' AND DATE(ab.created_at) = DATE('2024-12-10 12:01:56') AND ab.voucher_code = 'YRAN-GFIJ'
LIMIT 1;

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'Emmitt',
    'Bradstock',
    NULL,
    'emmittbradstock65@hotmail.com',
    '+447771966501',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'Emmitt Bradstock' AND ab.email = 'emmittbradstock65@hotmail.com' AND DATE(ab.created_at) = DATE('2024-12-10 12:01:56') AND ab.voucher_code = 'YRAN-GFIJ'
LIMIT 1;



INSERT IGNORE INTO trip_booking.voucher_codes (
    code,
    title,
    valid_from,
    valid_until,
    max_uses,
    current_uses,
    is_active,
    created_by
) VALUES (
    'KQRM-BARQ',
    'Booking Reference: KQRM-BARQ',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

INSERT INTO trip_booking.all_booking (
    name,
    flight_type,
    flight_date,
    pax,
    location,
    status,
    paid,
    due,
    voucher_code,
    created_at,
    expires,
    manual_status_override,
    additional_notes,
    hear_about_us,
    ballooning_reason,
    prefer,
    weight,
    email,
    phone,
    choose_add_on,
    preferred_location,
    preferred_time,
    preferred_day,
    flight_attempts,
    activity_id,
    time_slot,
    experience,
    voucher_type,
    voucher_type_detail,
    voucher_discount,
    original_amount,
    add_to_booking_items_total_price,
    weather_refund_total_price,
    current_total_price,
    flight_type_source,
    resources,
    google_calendar_event_id
) VALUES (
    'James Harman',
    'Shared Flight',
    NULL,
    2,
    NULL,
    'Confirmed',
    615,
    0,
    'KQRM-BARQ',
    '2025-01-27 17:04:38',
    '2026-07-27 17:04:38',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'james.sortition@gmail.com',
    '+447752654676',
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    NULL,
    'Shared Flight',
    'Any Day Voucher',
    NULL,
    0.00,
    NULL,
    0.00,
    0.00,
    NULL,
    'Shared Flight',
    NULL,
    NULL
);

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'James',
    'Harman',
    NULL,
    'james.sortition@gmail.com',
    '+447752654676',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'James Harman' AND ab.email = 'james.sortition@gmail.com' AND DATE(ab.created_at) = DATE('2025-01-27 17:04:38') AND ab.voucher_code = 'KQRM-BARQ'
LIMIT 1;

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'James',
    'Harman',
    NULL,
    'james.sortition@gmail.com',
    '+447752654676',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'James Harman' AND ab.email = 'james.sortition@gmail.com' AND DATE(ab.created_at) = DATE('2025-01-27 17:04:38') AND ab.voucher_code = 'KQRM-BARQ'
LIMIT 1;



INSERT IGNORE INTO trip_booking.voucher_codes (
    code,
    title,
    valid_from,
    valid_until,
    max_uses,
    current_uses,
    is_active,
    created_by
) VALUES (
    'PBFP-PBAJ',
    'Booking Reference: PBFP-PBAJ',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

INSERT INTO trip_booking.all_booking (
    name,
    flight_type,
    flight_date,
    pax,
    location,
    status,
    paid,
    due,
    voucher_code,
    created_at,
    expires,
    manual_status_override,
    additional_notes,
    hear_about_us,
    ballooning_reason,
    prefer,
    weight,
    email,
    phone,
    choose_add_on,
    preferred_location,
    preferred_time,
    preferred_day,
    flight_attempts,
    activity_id,
    time_slot,
    experience,
    voucher_type,
    voucher_type_detail,
    voucher_discount,
    original_amount,
    add_to_booking_items_total_price,
    weather_refund_total_price,
    current_total_price,
    flight_type_source,
    resources,
    google_calendar_event_id
) VALUES (
    'Leon Ruth',
    'Shared Flight',
    NULL,
    4,
    NULL,
    'Confirmed',
    1220,
    0,
    'PBFP-PBAJ',
    '2024-12-07 10:37:51',
    '2026-06-07 10:37:51',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'ruthleon13@gmail.com',
    '+447989176731',
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    NULL,
    'Shared Flight',
    'Any Day Voucher',
    NULL,
    0.00,
    NULL,
    0.00,
    0.00,
    NULL,
    'Shared Flight',
    NULL,
    NULL
);

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'Leon',
    'Ruth',
    NULL,
    'ruthleon13@gmail.com',
    '+447989176731',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'Leon Ruth' AND ab.email = 'ruthleon13@gmail.com' AND DATE(ab.created_at) = DATE('2024-12-07 10:37:51') AND ab.voucher_code = 'PBFP-PBAJ'
LIMIT 1;

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'Leon',
    'Ruth',
    NULL,
    'ruthleon13@gmail.com',
    '+447989176731',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'Leon Ruth' AND ab.email = 'ruthleon13@gmail.com' AND DATE(ab.created_at) = DATE('2024-12-07 10:37:51') AND ab.voucher_code = 'PBFP-PBAJ'
LIMIT 1;

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'Leon',
    'Ruth',
    NULL,
    'ruthleon13@gmail.com',
    '+447989176731',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'Leon Ruth' AND ab.email = 'ruthleon13@gmail.com' AND DATE(ab.created_at) = DATE('2024-12-07 10:37:51') AND ab.voucher_code = 'PBFP-PBAJ'
LIMIT 1;

INSERT INTO trip_booking.passenger (
    booking_id,
    first_name,
    last_name,
    weight,
    email,
    phone,
    ticket_type,
    weather_refund
)
SELECT 
    ab.id,
    'Leon',
    'Ruth',
    NULL,
    'ruthleon13@gmail.com',
    '+447989176731',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE ab.name = 'Leon Ruth' AND ab.email = 'ruthleon13@gmail.com' AND DATE(ab.created_at) = DATE('2024-12-07 10:37:51') AND ab.voucher_code = 'PBFP-PBAJ'
LIMIT 1;

