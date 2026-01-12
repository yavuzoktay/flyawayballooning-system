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
    'UWXU-FUQH',
    'Booking Reference: UWXU-FUQH',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'UWXU-FUQH'
WHERE name = 'Henry Skeete' AND email = 'skeetehenry@gmail.com' AND DATE(created_at) = DATE('2024-01-23 10:19:43')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Henry',
    'Skeete',
    NULL,
    'skeetehenry@gmail.com',
    '+447759933632',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Henry Skeete' AND email = 'skeetehenry@gmail.com' AND DATE(created_at) = DATE('2024-01-23 10:19:43')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Henry',
    'Skeete',
    NULL,
    'skeetehenry@gmail.com',
    '+447759933632',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Henry Skeete' AND email = 'skeetehenry@gmail.com' AND DATE(created_at) = DATE('2024-01-23 10:19:43')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'FGDR-HDCF',
    'Booking Reference: FGDR-HDCF',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'FGDR-HDCF'
WHERE name = 'olivia foster' AND email = 'ojfoster582@gmail.com' AND DATE(created_at) = DATE('2024-04-08 15:56:20')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'olivia',
    'foster',
    NULL,
    'ojfoster582@gmail.com',
    '+447476903923',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'olivia foster' AND email = 'ojfoster582@gmail.com' AND DATE(created_at) = DATE('2024-04-08 15:56:20')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'olivia',
    'foster',
    NULL,
    'ojfoster582@gmail.com',
    '+447476903923',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'olivia foster' AND email = 'ojfoster582@gmail.com' AND DATE(created_at) = DATE('2024-04-08 15:56:20')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'XFGZ-MEUK',
    'Booking Reference: XFGZ-MEUK',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'XFGZ-MEUK'
WHERE name = 'James Paver' AND email = 'jamespaver@hotmail.com' AND DATE(created_at) = DATE('2024-04-10 08:53:40')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Paver',
    NULL,
    'jamespaver@hotmail.com',
    '+447507633507',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'James Paver' AND email = 'jamespaver@hotmail.com' AND DATE(created_at) = DATE('2024-04-10 08:53:40')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Paver',
    NULL,
    'jamespaver@hotmail.com',
    '+447507633507',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'James Paver' AND email = 'jamespaver@hotmail.com' AND DATE(created_at) = DATE('2024-04-10 08:53:40')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'CIYM-ERZR',
    'Booking Reference: CIYM-ERZR',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'CIYM-ERZR'
WHERE name = 'Andrew Frazer' AND email = 'andyfrazer1000@gmail.com' AND DATE(created_at) = DATE('2024-04-14 10:18:07')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Andrew',
    'Frazer',
    NULL,
    'andyfrazer1000@gmail.com',
    '+447500542636',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Andrew Frazer' AND email = 'andyfrazer1000@gmail.com' AND DATE(created_at) = DATE('2024-04-14 10:18:07')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Andrew',
    'Frazer',
    NULL,
    'andyfrazer1000@gmail.com',
    '+447500542636',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Andrew Frazer' AND email = 'andyfrazer1000@gmail.com' AND DATE(created_at) = DATE('2024-04-14 10:18:07')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'DBYW-VHYX',
    'Booking Reference: DBYW-VHYX',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'DBYW-VHYX'
WHERE name = 'Mark Sullivan' AND email = 'mark@massivebrains.com' AND DATE(created_at) = DATE('2024-05-07 18:47:10')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Mark',
    'Sullivan',
    NULL,
    'mark@massivebrains.com',
    '+19808750030',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Mark Sullivan' AND email = 'mark@massivebrains.com' AND DATE(created_at) = DATE('2024-05-07 18:47:10')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Mark',
    'Sullivan',
    NULL,
    'mark@massivebrains.com',
    '+19808750030',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Mark Sullivan' AND email = 'mark@massivebrains.com' AND DATE(created_at) = DATE('2024-05-07 18:47:10')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'GEVH-XDDH',
    'Booking Reference: GEVH-XDDH',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'GEVH-XDDH'
WHERE name = 'Janis Raine' AND email = 'janis362@gmail.com' AND DATE(created_at) = DATE('2024-05-13 11:41:05')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Janis',
    'Raine',
    NULL,
    'janis362@gmail.com',
    '+447751270491',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Janis Raine' AND email = 'janis362@gmail.com' AND DATE(created_at) = DATE('2024-05-13 11:41:05')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 8
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
    'Janis',
    'Raine',
    NULL,
    'janis362@gmail.com',
    '+447751270491',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Janis Raine' AND email = 'janis362@gmail.com' AND DATE(created_at) = DATE('2024-05-13 11:41:05')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 8
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
    'Janis',
    'Raine',
    NULL,
    'janis362@gmail.com',
    '+447751270491',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Janis Raine' AND email = 'janis362@gmail.com' AND DATE(created_at) = DATE('2024-05-13 11:41:05')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 8
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
    'Janis',
    'Raine',
    NULL,
    'janis362@gmail.com',
    '+447751270491',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Janis Raine' AND email = 'janis362@gmail.com' AND DATE(created_at) = DATE('2024-05-13 11:41:05')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 8
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
    'Janis',
    'Raine',
    NULL,
    'janis362@gmail.com',
    '+447751270491',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Janis Raine' AND email = 'janis362@gmail.com' AND DATE(created_at) = DATE('2024-05-13 11:41:05')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 8
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
    'Janis',
    'Raine',
    NULL,
    'janis362@gmail.com',
    '+447751270491',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Janis Raine' AND email = 'janis362@gmail.com' AND DATE(created_at) = DATE('2024-05-13 11:41:05')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 8
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
    'Janis',
    'Raine',
    NULL,
    'janis362@gmail.com',
    '+447751270491',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Janis Raine' AND email = 'janis362@gmail.com' AND DATE(created_at) = DATE('2024-05-13 11:41:05')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 8
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
    'Janis',
    'Raine',
    NULL,
    'janis362@gmail.com',
    '+447751270491',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Janis Raine' AND email = 'janis362@gmail.com' AND DATE(created_at) = DATE('2024-05-13 11:41:05')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 8
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
    'MGIZ-FNKJ',
    'Booking Reference: MGIZ-FNKJ',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'MGIZ-FNKJ'
WHERE name = 'Lizzie Dekkers' AND email = 'lizziedekkers2000@yahoo.co.uk' AND DATE(created_at) = DATE('2024-05-27 09:37:56')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Lizzie',
    'Dekkers',
    NULL,
    'lizziedekkers2000@yahoo.co.uk',
    '+447771758688',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Lizzie Dekkers' AND email = 'lizziedekkers2000@yahoo.co.uk' AND DATE(created_at) = DATE('2024-05-27 09:37:56')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 4
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
    'Lizzie',
    'Dekkers',
    NULL,
    'lizziedekkers2000@yahoo.co.uk',
    '+447771758688',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Lizzie Dekkers' AND email = 'lizziedekkers2000@yahoo.co.uk' AND DATE(created_at) = DATE('2024-05-27 09:37:56')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 4
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
    'Lizzie',
    'Dekkers',
    NULL,
    'lizziedekkers2000@yahoo.co.uk',
    '+447771758688',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Lizzie Dekkers' AND email = 'lizziedekkers2000@yahoo.co.uk' AND DATE(created_at) = DATE('2024-05-27 09:37:56')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 4
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
    'Lizzie',
    'Dekkers',
    NULL,
    'lizziedekkers2000@yahoo.co.uk',
    '+447771758688',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Lizzie Dekkers' AND email = 'lizziedekkers2000@yahoo.co.uk' AND DATE(created_at) = DATE('2024-05-27 09:37:56')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 4
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
    'FAPF-HSNZ',
    'Booking Reference: FAPF-HSNZ',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'FAPF-HSNZ'
WHERE name = 'Cory Marvel' AND email = 'cmarvel21@gmail.com' AND DATE(created_at) = DATE('2024-05-30 00:59:25')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Cory',
    'Marvel',
    NULL,
    'cmarvel21@gmail.com',
    '+15017339022',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Cory Marvel' AND email = 'cmarvel21@gmail.com' AND DATE(created_at) = DATE('2024-05-30 00:59:25')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Cory',
    'Marvel',
    NULL,
    'cmarvel21@gmail.com',
    '+15017339022',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Cory Marvel' AND email = 'cmarvel21@gmail.com' AND DATE(created_at) = DATE('2024-05-30 00:59:25')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'CWPX-IPZK',
    'Booking Reference: CWPX-IPZK',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'CWPX-IPZK'
WHERE name = 'James Macey' AND email = 'jamesd.macey@gmail.com' AND DATE(created_at) = DATE('2024-05-31 12:22:22')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Macey',
    NULL,
    'jamesd.macey@gmail.com',
    '+19176172826',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'James Macey' AND email = 'jamesd.macey@gmail.com' AND DATE(created_at) = DATE('2024-05-31 12:22:22')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Macey',
    NULL,
    'jamesd.macey@gmail.com',
    '+19176172826',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'James Macey' AND email = 'jamesd.macey@gmail.com' AND DATE(created_at) = DATE('2024-05-31 12:22:22')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'XNHT-EPKN',
    'Booking Reference: XNHT-EPKN',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'XNHT-EPKN'
WHERE name = 'Kristina Adonay' AND email = 'renanddax@gmail.com' AND DATE(created_at) = DATE('2024-06-15 05:41:05')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Kristina',
    'Adonay',
    NULL,
    'renanddax@gmail.com',
    '+13237194555',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Kristina Adonay' AND email = 'renanddax@gmail.com' AND DATE(created_at) = DATE('2024-06-15 05:41:05')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Kristina',
    'Adonay',
    NULL,
    'renanddax@gmail.com',
    '+13237194555',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Kristina Adonay' AND email = 'renanddax@gmail.com' AND DATE(created_at) = DATE('2024-06-15 05:41:05')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Kristina',
    'Adonay',
    NULL,
    'renanddax@gmail.com',
    '+13237194555',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Kristina Adonay' AND email = 'renanddax@gmail.com' AND DATE(created_at) = DATE('2024-06-15 05:41:05')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'ESDS-CHZE',
    'Booking Reference: ESDS-CHZE',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'ESDS-CHZE'
WHERE name = 'margaret morrtson' AND email = 'maidamorrison@gmail.com' AND DATE(created_at) = DATE('2024-06-20 20:27:42')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'margaret',
    'morrtson',
    NULL,
    'maidamorrison@gmail.com',
    '+447775834299',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'margaret morrtson' AND email = 'maidamorrison@gmail.com' AND DATE(created_at) = DATE('2024-06-20 20:27:42')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 1
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
    'QKEB-GSUT',
    'Booking Reference: QKEB-GSUT',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'QKEB-GSUT'
WHERE name = 'Shaun Barnard' AND email = 'shaun_barnard@hotmail.co.uk' AND DATE(created_at) = DATE('2024-06-24 20:22:00')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Shaun',
    'Barnard',
    NULL,
    'shaun_barnard@hotmail.co.uk',
    '+447500906667',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Shaun Barnard' AND email = 'shaun_barnard@hotmail.co.uk' AND DATE(created_at) = DATE('2024-06-24 20:22:00')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Shaun',
    'Barnard',
    NULL,
    'shaun_barnard@hotmail.co.uk',
    '+447500906667',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Shaun Barnard' AND email = 'shaun_barnard@hotmail.co.uk' AND DATE(created_at) = DATE('2024-06-24 20:22:00')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Shaun',
    'Barnard',
    NULL,
    'shaun_barnard@hotmail.co.uk',
    '+447500906667',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Shaun Barnard' AND email = 'shaun_barnard@hotmail.co.uk' AND DATE(created_at) = DATE('2024-06-24 20:22:00')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'DURA-PKGT',
    'Booking Reference: DURA-PKGT',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'DURA-PKGT'
WHERE name = 'Kelly Holmes' AND email = 'kellyelizabethholmes@gmail.com' AND DATE(created_at) = DATE('2024-07-03 17:42:59')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Kelly',
    'Holmes',
    NULL,
    'kellyelizabethholmes@gmail.com',
    '+447985614421',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Kelly Holmes' AND email = 'kellyelizabethholmes@gmail.com' AND DATE(created_at) = DATE('2024-07-03 17:42:59')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Kelly',
    'Holmes',
    NULL,
    'kellyelizabethholmes@gmail.com',
    '+447985614421',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Kelly Holmes' AND email = 'kellyelizabethholmes@gmail.com' AND DATE(created_at) = DATE('2024-07-03 17:42:59')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'CTUV-PHPH',
    'Booking Reference: CTUV-PHPH',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'CTUV-PHPH'
WHERE name = 'Elisabetta d’Aloia' AND email = 'elidaloia@yahoo.co.uk' AND DATE(created_at) = DATE('2024-07-19 21:43:39')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Elisabetta',
    'd’Aloia',
    NULL,
    'elidaloia@yahoo.co.uk',
    '+447932068595',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Elisabetta d’Aloia' AND email = 'elidaloia@yahoo.co.uk' AND DATE(created_at) = DATE('2024-07-19 21:43:39')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Elisabetta',
    'd’Aloia',
    NULL,
    'elidaloia@yahoo.co.uk',
    '+447932068595',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Elisabetta d’Aloia' AND email = 'elidaloia@yahoo.co.uk' AND DATE(created_at) = DATE('2024-07-19 21:43:39')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'QDFV-EJHV',
    'Booking Reference: QDFV-EJHV',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'QDFV-EJHV'
WHERE name = 'Sarah Jones' AND email = 'sarah@perdiemconsulting.co.uk' AND DATE(created_at) = DATE('2024-07-31 07:44:06')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Sarah',
    'Jones',
    NULL,
    'sarah@perdiemconsulting.co.uk',
    '+447802475779',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Sarah Jones' AND email = 'sarah@perdiemconsulting.co.uk' AND DATE(created_at) = DATE('2024-07-31 07:44:06')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Sarah',
    'Jones',
    NULL,
    'sarah@perdiemconsulting.co.uk',
    '+447802475779',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Sarah Jones' AND email = 'sarah@perdiemconsulting.co.uk' AND DATE(created_at) = DATE('2024-07-31 07:44:06')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'UUGH-SZJI',
    'Booking Reference: UUGH-SZJI',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'UUGH-SZJI'
WHERE name = 'Ming Lo' AND email = 'minglo98@outlook.com' AND DATE(created_at) = DATE('2024-08-09 16:52:27')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Ming',
    'Lo',
    NULL,
    'minglo98@outlook.com',
    '+447397548889',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Ming Lo' AND email = 'minglo98@outlook.com' AND DATE(created_at) = DATE('2024-08-09 16:52:27')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Ming',
    'Lo',
    NULL,
    'minglo98@outlook.com',
    '+447397548889',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Ming Lo' AND email = 'minglo98@outlook.com' AND DATE(created_at) = DATE('2024-08-09 16:52:27')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'QSKM-DUFP',
    'Booking Reference: QSKM-DUFP',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'QSKM-DUFP'
WHERE name = 'Tamaraebi Itoko' AND email = 'tamzytoks@gmail.com' AND DATE(created_at) = DATE('2024-08-10 19:28:36')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Tamaraebi',
    'Itoko',
    NULL,
    'tamzytoks@gmail.com',
    '+447407952631',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Tamaraebi Itoko' AND email = 'tamzytoks@gmail.com' AND DATE(created_at) = DATE('2024-08-10 19:28:36')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 1
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
    'SKHZ-VJQH',
    'Booking Reference: SKHZ-VJQH',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'SKHZ-VJQH'
WHERE name = 'Zarina Rich' AND email = 'richzarina@gmail.com' AND DATE(created_at) = DATE('2024-08-23 10:16:09')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Zarina',
    'Rich',
    NULL,
    'richzarina@gmail.com',
    '+447720614748',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Zarina Rich' AND email = 'richzarina@gmail.com' AND DATE(created_at) = DATE('2024-08-23 10:16:09')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Zarina',
    'Rich',
    NULL,
    'richzarina@gmail.com',
    '+447720614748',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Zarina Rich' AND email = 'richzarina@gmail.com' AND DATE(created_at) = DATE('2024-08-23 10:16:09')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'FRYW-DFVT',
    'Booking Reference: FRYW-DFVT',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'FRYW-DFVT'
WHERE name = 'Chris Bowles' AND email = 'chrisbowlesap@gmail.com' AND DATE(created_at) = DATE('2024-08-24 10:17:47')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Chris',
    'Bowles',
    NULL,
    'chrisbowlesap@gmail.com',
    '+447547967407',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Chris Bowles' AND email = 'chrisbowlesap@gmail.com' AND DATE(created_at) = DATE('2024-08-24 10:17:47')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Chris',
    'Bowles',
    NULL,
    'chrisbowlesap@gmail.com',
    '+447547967407',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Chris Bowles' AND email = 'chrisbowlesap@gmail.com' AND DATE(created_at) = DATE('2024-08-24 10:17:47')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'KEXI-QMHX',
    'Booking Reference: KEXI-QMHX',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'KEXI-QMHX'
WHERE name = 'Aaron Rance' AND email = 'aaronrance@outlook.com' AND DATE(created_at) = DATE('2024-08-28 08:51:34')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Aaron',
    'Rance',
    NULL,
    'aaronrance@outlook.com',
    '+447889878385',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Aaron Rance' AND email = 'aaronrance@outlook.com' AND DATE(created_at) = DATE('2024-08-28 08:51:34')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Aaron',
    'Rance',
    NULL,
    'aaronrance@outlook.com',
    '+447889878385',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Aaron Rance' AND email = 'aaronrance@outlook.com' AND DATE(created_at) = DATE('2024-08-28 08:51:34')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'KRVT-CKND',
    'Booking Reference: KRVT-CKND',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'KRVT-CKND'
WHERE name = 'Millie Honrby' AND email = 'milliehornby@sky.com' AND DATE(created_at) = DATE('2024-09-17 19:21:53')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Millie',
    'Honrby',
    NULL,
    'milliehornby@sky.com',
    '+447824858687',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Millie Honrby' AND email = 'milliehornby@sky.com' AND DATE(created_at) = DATE('2024-09-17 19:21:53')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Millie',
    'Honrby',
    NULL,
    'milliehornby@sky.com',
    '+447824858687',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Millie Honrby' AND email = 'milliehornby@sky.com' AND DATE(created_at) = DATE('2024-09-17 19:21:53')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'YIAV-NMUF',
    'Booking Reference: YIAV-NMUF',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'YIAV-NMUF'
WHERE name = 'Harry De Pree' AND email = 'haxd@capgroup.com' AND DATE(created_at) = DATE('2024-09-18 09:49:13')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Harry',
    'De Pree',
    NULL,
    'haxd@capgroup.com',
    '+447856354065',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Harry De Pree' AND email = 'haxd@capgroup.com' AND DATE(created_at) = DATE('2024-09-18 09:49:13')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Harry',
    'De Pree',
    NULL,
    'haxd@capgroup.com',
    '+447856354065',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Harry De Pree' AND email = 'haxd@capgroup.com' AND DATE(created_at) = DATE('2024-09-18 09:49:13')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'SFMF-GHUK',
    'Booking Reference: SFMF-GHUK',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'SFMF-GHUK'
WHERE name = 'Shandin Rickard-Hughes' AND email = 'shandlin_24@hotmail.com' AND DATE(created_at) = DATE('2024-09-21 16:35:53')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Shandin',
    'Rickard-Hughes',
    NULL,
    'shandlin_24@hotmail.com',
    '+447707448393',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Shandin Rickard-Hughes' AND email = 'shandlin_24@hotmail.com' AND DATE(created_at) = DATE('2024-09-21 16:35:53')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Shandin',
    'Rickard-Hughes',
    NULL,
    'shandlin_24@hotmail.com',
    '+447707448393',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Shandin Rickard-Hughes' AND email = 'shandlin_24@hotmail.com' AND DATE(created_at) = DATE('2024-09-21 16:35:53')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'YBXT-VETG',
    'Booking Reference: YBXT-VETG',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'YBXT-VETG'
WHERE name = 'Bettina Archer' AND email = 'bettinaarcher@gmail.com' AND DATE(created_at) = DATE('2024-10-02 19:29:54')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Bettina',
    'Archer',
    NULL,
    'bettinaarcher@gmail.com',
    '+447842626162',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Bettina Archer' AND email = 'bettinaarcher@gmail.com' AND DATE(created_at) = DATE('2024-10-02 19:29:54')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Bettina',
    'Archer',
    NULL,
    'bettinaarcher@gmail.com',
    '+447842626162',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Bettina Archer' AND email = 'bettinaarcher@gmail.com' AND DATE(created_at) = DATE('2024-10-02 19:29:54')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'ZSCM-TJMC',
    'Booking Reference: ZSCM-TJMC',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'ZSCM-TJMC'
WHERE name = 'Mia Shute' AND email = 'miacarus@hotmail.co.uk' AND DATE(created_at) = DATE('2024-11-15 15:27:58')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Mia',
    'Shute',
    NULL,
    'miacarus@hotmail.co.uk',
    '+447787420445',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Mia Shute' AND email = 'miacarus@hotmail.co.uk' AND DATE(created_at) = DATE('2024-11-15 15:27:58')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Mia',
    'Shute',
    NULL,
    'miacarus@hotmail.co.uk',
    '+447787420445',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Mia Shute' AND email = 'miacarus@hotmail.co.uk' AND DATE(created_at) = DATE('2024-11-15 15:27:58')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'SPGH-FAHV',
    'Booking Reference: SPGH-FAHV',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'SPGH-FAHV'
WHERE name = 'Jason potts' AND email = 'pottsj53@yahoo.com' AND DATE(created_at) = DATE('2024-12-08 15:41:22')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Jason',
    'potts',
    NULL,
    'pottsj53@yahoo.com',
    '+447908225779',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Jason potts' AND email = 'pottsj53@yahoo.com' AND DATE(created_at) = DATE('2024-12-08 15:41:22')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Jason',
    'potts',
    NULL,
    'pottsj53@yahoo.com',
    '+447908225779',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Jason potts' AND email = 'pottsj53@yahoo.com' AND DATE(created_at) = DATE('2024-12-08 15:41:22')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'BDXI-FQYZ',
    'Booking Reference: BDXI-FQYZ',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'BDXI-FQYZ'
WHERE name = 'Madeleine Achurch' AND email = 'madeleineachurch@gmail.com' AND DATE(created_at) = DATE('2025-01-30 12:08:13')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Madeleine',
    'Achurch',
    NULL,
    'madeleineachurch@gmail.com',
    '+447826492639',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Madeleine Achurch' AND email = 'madeleineachurch@gmail.com' AND DATE(created_at) = DATE('2025-01-30 12:08:13')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 4
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
    'Madeleine',
    'Achurch',
    NULL,
    'madeleineachurch@gmail.com',
    '+447826492639',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Madeleine Achurch' AND email = 'madeleineachurch@gmail.com' AND DATE(created_at) = DATE('2025-01-30 12:08:13')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 4
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
    'Madeleine',
    'Achurch',
    NULL,
    'madeleineachurch@gmail.com',
    '+447826492639',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Madeleine Achurch' AND email = 'madeleineachurch@gmail.com' AND DATE(created_at) = DATE('2025-01-30 12:08:13')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 4
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
    'Madeleine',
    'Achurch',
    NULL,
    'madeleineachurch@gmail.com',
    '+447826492639',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Madeleine Achurch' AND email = 'madeleineachurch@gmail.com' AND DATE(created_at) = DATE('2025-01-30 12:08:13')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 4
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
    'FUFR-BTZT',
    'Booking Reference: FUFR-BTZT',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'FUFR-BTZT'
WHERE name = 'Jackie Kendrick' AND email = 'jaxkendrick@yahoo.co.uk' AND DATE(created_at) = DATE('2025-02-04 12:40:10')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Jackie',
    'Kendrick',
    NULL,
    'jaxkendrick@yahoo.co.uk',
    '+447968416360',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Jackie Kendrick' AND email = 'jaxkendrick@yahoo.co.uk' AND DATE(created_at) = DATE('2025-02-04 12:40:10')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Jackie',
    'Kendrick',
    NULL,
    'jaxkendrick@yahoo.co.uk',
    '+447968416360',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Jackie Kendrick' AND email = 'jaxkendrick@yahoo.co.uk' AND DATE(created_at) = DATE('2025-02-04 12:40:10')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'BEBU-KJXY',
    'Booking Reference: BEBU-KJXY',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'BEBU-KJXY'
WHERE name = 'Alistair Veness' AND email = 'alistairveness@gmail.com' AND DATE(created_at) = DATE('2025-02-04 22:37:36')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Alistair',
    'Veness',
    NULL,
    'alistairveness@gmail.com',
    '+447771801208',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Alistair Veness' AND email = 'alistairveness@gmail.com' AND DATE(created_at) = DATE('2025-02-04 22:37:36')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Alistair',
    'Veness',
    NULL,
    'alistairveness@gmail.com',
    '+447771801208',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Alistair Veness' AND email = 'alistairveness@gmail.com' AND DATE(created_at) = DATE('2025-02-04 22:37:36')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'MTRY-QTGU',
    'Booking Reference: MTRY-QTGU',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'MTRY-QTGU'
WHERE name = 'Nicolas Silkov-yianni' AND email = 'nicolassy@icloud.com' AND DATE(created_at) = DATE('2025-02-05 16:45:48')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Nicolas',
    'Silkov-yianni',
    NULL,
    'nicolassy@icloud.com',
    '+447909093888',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Nicolas Silkov-yianni' AND email = 'nicolassy@icloud.com' AND DATE(created_at) = DATE('2025-02-05 16:45:48')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Nicolas',
    'Silkov-yianni',
    NULL,
    'nicolassy@icloud.com',
    '+447909093888',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Nicolas Silkov-yianni' AND email = 'nicolassy@icloud.com' AND DATE(created_at) = DATE('2025-02-05 16:45:48')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'WTBW-AXIV',
    'Booking Reference: WTBW-AXIV',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'WTBW-AXIV'
WHERE name = 'Robert Miller' AND email = 'rm.uk@outlook.com' AND DATE(created_at) = DATE('2025-02-27 12:14:30')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Robert',
    'Miller',
    NULL,
    'rm.uk@outlook.com',
    '+447973641361',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Robert Miller' AND email = 'rm.uk@outlook.com' AND DATE(created_at) = DATE('2025-02-27 12:14:30')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Robert',
    'Miller',
    NULL,
    'rm.uk@outlook.com',
    '+447973641361',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Robert Miller' AND email = 'rm.uk@outlook.com' AND DATE(created_at) = DATE('2025-02-27 12:14:30')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Robert',
    'Miller',
    NULL,
    'rm.uk@outlook.com',
    '+447973641361',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Robert Miller' AND email = 'rm.uk@outlook.com' AND DATE(created_at) = DATE('2025-02-27 12:14:30')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'XNBA-ZAAQ',
    'Booking Reference: XNBA-ZAAQ',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'XNBA-ZAAQ'
WHERE name = 'Sarah Heath' AND email = 'sarah.heath91@yahoo.co.uk' AND DATE(created_at) = DATE('2025-02-28 13:05:34')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Sarah',
    'Heath',
    NULL,
    'sarah.heath91@yahoo.co.uk',
    '+447955371435',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Sarah Heath' AND email = 'sarah.heath91@yahoo.co.uk' AND DATE(created_at) = DATE('2025-02-28 13:05:34')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Sarah',
    'Heath',
    NULL,
    'sarah.heath91@yahoo.co.uk',
    '+447955371435',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Sarah Heath' AND email = 'sarah.heath91@yahoo.co.uk' AND DATE(created_at) = DATE('2025-02-28 13:05:34')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'CYPJ-CCYD',
    'Booking Reference: CYPJ-CCYD',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'CYPJ-CCYD'
WHERE name = 'Charlie Merson' AND email = 'Charlie.merson1469@gmail.com' AND DATE(created_at) = DATE('2025-03-02 14:56:47')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Charlie',
    'Merson',
    NULL,
    'Charlie.merson1469@gmail.com',
    '+447496832491',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Charlie Merson' AND email = 'Charlie.merson1469@gmail.com' AND DATE(created_at) = DATE('2025-03-02 14:56:47')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Charlie',
    'Merson',
    NULL,
    'Charlie.merson1469@gmail.com',
    '+447496832491',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Charlie Merson' AND email = 'Charlie.merson1469@gmail.com' AND DATE(created_at) = DATE('2025-03-02 14:56:47')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'NIXP-HUDC',
    'Booking Reference: NIXP-HUDC',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'NIXP-HUDC'
WHERE name = 'Rob Oswick' AND email = 'robert.oswick@btinternet.com' AND DATE(created_at) = DATE('2025-03-12 22:23:10')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Rob',
    'Oswick',
    NULL,
    'robert.oswick@btinternet.com',
    '+447546835262',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Rob Oswick' AND email = 'robert.oswick@btinternet.com' AND DATE(created_at) = DATE('2025-03-12 22:23:10')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Rob',
    'Oswick',
    NULL,
    'robert.oswick@btinternet.com',
    '+447546835262',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Rob Oswick' AND email = 'robert.oswick@btinternet.com' AND DATE(created_at) = DATE('2025-03-12 22:23:10')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'AEPB-TING',
    'Booking Reference: AEPB-TING',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'AEPB-TING'
WHERE name = 'Feng Qiu' AND email = 'fq.fengqiu@googlemail.com' AND DATE(created_at) = DATE('2025-03-17 21:48:02')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Feng',
    'Qiu',
    NULL,
    'fq.fengqiu@googlemail.com',
    '+447534211801',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Feng Qiu' AND email = 'fq.fengqiu@googlemail.com' AND DATE(created_at) = DATE('2025-03-17 21:48:02')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 1
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
    'WQJP-VRPH',
    'Booking Reference: WQJP-VRPH',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'WQJP-VRPH'
WHERE name = 'PETER LAMPEY' AND email = 'peteratwessex@aol.com' AND DATE(created_at) = DATE('2025-03-26 12:44:50')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'PETER',
    'LAMPEY',
    NULL,
    'peteratwessex@aol.com',
    '+447774999602',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'PETER LAMPEY' AND email = 'peteratwessex@aol.com' AND DATE(created_at) = DATE('2025-03-26 12:44:50')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'PETER',
    'LAMPEY',
    NULL,
    'peteratwessex@aol.com',
    '+447774999602',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'PETER LAMPEY' AND email = 'peteratwessex@aol.com' AND DATE(created_at) = DATE('2025-03-26 12:44:50')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'MFXK-MFJU',
    'Booking Reference: MFXK-MFJU',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'MFXK-MFJU'
WHERE name = 'Russell Wilmot' AND email = 'russellwilmot@hotmail.co.uk' AND DATE(created_at) = DATE('2025-04-04 13:07:47')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Russell',
    'Wilmot',
    NULL,
    'russellwilmot@hotmail.co.uk',
    '+447554614854',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Russell Wilmot' AND email = 'russellwilmot@hotmail.co.uk' AND DATE(created_at) = DATE('2025-04-04 13:07:47')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Russell',
    'Wilmot',
    NULL,
    'russellwilmot@hotmail.co.uk',
    '+447554614854',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Russell Wilmot' AND email = 'russellwilmot@hotmail.co.uk' AND DATE(created_at) = DATE('2025-04-04 13:07:47')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'ZBQK-DKUH',
    'Booking Reference: ZBQK-DKUH',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'ZBQK-DKUH'
WHERE name = 'Justin Osborne' AND email = 'justinosborne@blueyonder.co.uk' AND DATE(created_at) = DATE('2025-04-05 05:15:31')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Justin',
    'Osborne',
    NULL,
    'justinosborne@blueyonder.co.uk',
    '+447810051840',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Justin Osborne' AND email = 'justinosborne@blueyonder.co.uk' AND DATE(created_at) = DATE('2025-04-05 05:15:31')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Justin',
    'Osborne',
    NULL,
    'justinosborne@blueyonder.co.uk',
    '+447810051840',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Justin Osborne' AND email = 'justinosborne@blueyonder.co.uk' AND DATE(created_at) = DATE('2025-04-05 05:15:31')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'PEBC-AQSJ',
    'Booking Reference: PEBC-AQSJ',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'PEBC-AQSJ'
WHERE name = 'peter dallmann' AND email = 'paulidalle@gmail.com' AND DATE(created_at) = DATE('2025-04-05 08:24:01')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'peter',
    'dallmann',
    NULL,
    'paulidalle@gmail.com',
    '+4915122805664',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'peter dallmann' AND email = 'paulidalle@gmail.com' AND DATE(created_at) = DATE('2025-04-05 08:24:01')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'peter',
    'dallmann',
    NULL,
    'paulidalle@gmail.com',
    '+4915122805664',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'peter dallmann' AND email = 'paulidalle@gmail.com' AND DATE(created_at) = DATE('2025-04-05 08:24:01')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'YUAF-WPAG',
    'Booking Reference: YUAF-WPAG',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'YUAF-WPAG'
WHERE name = 'Ben Deane' AND email = 'deaneben57@gmail.com' AND DATE(created_at) = DATE('2025-04-06 16:40:49')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Ben',
    'Deane',
    NULL,
    'deaneben57@gmail.com',
    '+447359708853',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Ben Deane' AND email = 'deaneben57@gmail.com' AND DATE(created_at) = DATE('2025-04-06 16:40:49')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Ben',
    'Deane',
    NULL,
    'deaneben57@gmail.com',
    '+447359708853',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Ben Deane' AND email = 'deaneben57@gmail.com' AND DATE(created_at) = DATE('2025-04-06 16:40:49')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'UMAB-FAYV',
    'Booking Reference: UMAB-FAYV',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'UMAB-FAYV'
WHERE name = 'Warren Caie' AND email = 'warrenc69@outlook.com' AND DATE(created_at) = DATE('2025-04-14 15:25:27')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Warren',
    'Caie',
    NULL,
    'warrenc69@outlook.com',
    '+447970032377',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Warren Caie' AND email = 'warrenc69@outlook.com' AND DATE(created_at) = DATE('2025-04-14 15:25:27')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 1
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
    'ETZP-GQSU',
    'Booking Reference: ETZP-GQSU',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'ETZP-GQSU'
WHERE name = 'Jacob Alpier' AND email = 'jacob.alpier@aol.com' AND DATE(created_at) = DATE('2025-05-01 11:00:40')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Jacob',
    'Alpier',
    NULL,
    'jacob.alpier@aol.com',
    '+447847222412',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Jacob Alpier' AND email = 'jacob.alpier@aol.com' AND DATE(created_at) = DATE('2025-05-01 11:00:40')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Jacob',
    'Alpier',
    NULL,
    'jacob.alpier@aol.com',
    '+447847222412',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Jacob Alpier' AND email = 'jacob.alpier@aol.com' AND DATE(created_at) = DATE('2025-05-01 11:00:40')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'GNFM-WVYF',
    'Booking Reference: GNFM-WVYF',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'GNFM-WVYF'
WHERE name = 'Mark Clarridge' AND email = 'donamark60@gmail.com' AND DATE(created_at) = DATE('2025-05-04 13:04:35')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Mark',
    'Clarridge',
    NULL,
    'donamark60@gmail.com',
    '+447854509310',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Mark Clarridge' AND email = 'donamark60@gmail.com' AND DATE(created_at) = DATE('2025-05-04 13:04:35')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Mark',
    'Clarridge',
    NULL,
    'donamark60@gmail.com',
    '+447854509310',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Mark Clarridge' AND email = 'donamark60@gmail.com' AND DATE(created_at) = DATE('2025-05-04 13:04:35')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'BFCM-APRA',
    'Booking Reference: BFCM-APRA',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'BFCM-APRA'
WHERE name = 'Ewen Paterson' AND email = 'ewenpaterson@aol.com' AND DATE(created_at) = DATE('2025-05-11 18:20:49')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Ewen',
    'Paterson',
    NULL,
    'ewenpaterson@aol.com',
    '+447920792938',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Ewen Paterson' AND email = 'ewenpaterson@aol.com' AND DATE(created_at) = DATE('2025-05-11 18:20:49')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Ewen',
    'Paterson',
    NULL,
    'ewenpaterson@aol.com',
    '+447920792938',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Ewen Paterson' AND email = 'ewenpaterson@aol.com' AND DATE(created_at) = DATE('2025-05-11 18:20:49')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'DRGK-IKGR',
    'Booking Reference: DRGK-IKGR',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'DRGK-IKGR'
WHERE name = 'Mark Davies' AND email = 'md40108@gmail.com' AND DATE(created_at) = DATE('2025-05-15 13:04:53')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Mark',
    'Davies',
    NULL,
    'md40108@gmail.com',
    '+447732883259',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Mark Davies' AND email = 'md40108@gmail.com' AND DATE(created_at) = DATE('2025-05-15 13:04:53')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Mark',
    'Davies',
    NULL,
    'md40108@gmail.com',
    '+447732883259',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Mark Davies' AND email = 'md40108@gmail.com' AND DATE(created_at) = DATE('2025-05-15 13:04:53')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'SVXH-NEDP',
    'Booking Reference: SVXH-NEDP',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'SVXH-NEDP'
WHERE name = 'Joan Dowling' AND email = 'dowlinggirls9194@gmail.com' AND DATE(created_at) = DATE('2025-05-19 13:06:35')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Joan',
    'Dowling',
    NULL,
    'dowlinggirls9194@gmail.com',
    '+447375686703',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Joan Dowling' AND email = 'dowlinggirls9194@gmail.com' AND DATE(created_at) = DATE('2025-05-19 13:06:35')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Joan',
    'Dowling',
    NULL,
    'dowlinggirls9194@gmail.com',
    '+447375686703',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Joan Dowling' AND email = 'dowlinggirls9194@gmail.com' AND DATE(created_at) = DATE('2025-05-19 13:06:35')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Joan',
    'Dowling',
    NULL,
    'dowlinggirls9194@gmail.com',
    '+447375686703',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Joan Dowling' AND email = 'dowlinggirls9194@gmail.com' AND DATE(created_at) = DATE('2025-05-19 13:06:35')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'MMBR-HMEE',
    'Booking Reference: MMBR-HMEE',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'MMBR-HMEE'
WHERE name = 'Kirsty Cole' AND email = 'misskirstycole@gmail.com' AND DATE(created_at) = DATE('2025-05-22 08:13:19')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Kirsty',
    'Cole',
    NULL,
    'misskirstycole@gmail.com',
    '+447730181266',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Kirsty Cole' AND email = 'misskirstycole@gmail.com' AND DATE(created_at) = DATE('2025-05-22 08:13:19')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 1
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
    'GTUZ-WNAT',
    'Booking Reference: GTUZ-WNAT',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'GTUZ-WNAT'
WHERE name = 'Jenny McLynn' AND email = 'jennymclynn@gmail.com' AND DATE(created_at) = DATE('2025-06-04 19:48:37')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Jenny',
    'McLynn',
    NULL,
    'jennymclynn@gmail.com',
    '+447913383322',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Jenny McLynn' AND email = 'jennymclynn@gmail.com' AND DATE(created_at) = DATE('2025-06-04 19:48:37')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 1
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
    'KCMP-WPCP',
    'Booking Reference: KCMP-WPCP',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'KCMP-WPCP'
WHERE name = 'Mae Draper' AND email = 'maedraper72@gmail.com' AND DATE(created_at) = DATE('2025-06-05 09:49:38')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Mae',
    'Draper',
    NULL,
    'maedraper72@gmail.com',
    '+447521535366',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Mae Draper' AND email = 'maedraper72@gmail.com' AND DATE(created_at) = DATE('2025-06-05 09:49:38')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Mae',
    'Draper',
    NULL,
    'maedraper72@gmail.com',
    '+447521535366',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Mae Draper' AND email = 'maedraper72@gmail.com' AND DATE(created_at) = DATE('2025-06-05 09:49:38')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Mae',
    'Draper',
    NULL,
    'maedraper72@gmail.com',
    '+447521535366',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Mae Draper' AND email = 'maedraper72@gmail.com' AND DATE(created_at) = DATE('2025-06-05 09:49:38')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'DIMY-XIGH',
    'Booking Reference: DIMY-XIGH',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'DIMY-XIGH'
WHERE name = 'Fay Griffiths' AND email = 'fayhewitt@hotmail.com' AND DATE(created_at) = DATE('2025-06-07 16:33:47')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Fay',
    'Griffiths',
    NULL,
    'fayhewitt@hotmail.com',
    '+447772343145',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Fay Griffiths' AND email = 'fayhewitt@hotmail.com' AND DATE(created_at) = DATE('2025-06-07 16:33:47')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Fay',
    'Griffiths',
    NULL,
    'fayhewitt@hotmail.com',
    '+447772343145',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Fay Griffiths' AND email = 'fayhewitt@hotmail.com' AND DATE(created_at) = DATE('2025-06-07 16:33:47')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'GMDV-MPVD',
    'Booking Reference: GMDV-MPVD',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'GMDV-MPVD'
WHERE name = 'Max Colquhoun' AND email = 'mcolquhoun0@gmail.com' AND DATE(created_at) = DATE('2025-06-14 15:54:52')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Max',
    'Colquhoun',
    NULL,
    'mcolquhoun0@gmail.com',
    '+447775002543',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Max Colquhoun' AND email = 'mcolquhoun0@gmail.com' AND DATE(created_at) = DATE('2025-06-14 15:54:52')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Max',
    'Colquhoun',
    NULL,
    'mcolquhoun0@gmail.com',
    '+447775002543',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Max Colquhoun' AND email = 'mcolquhoun0@gmail.com' AND DATE(created_at) = DATE('2025-06-14 15:54:52')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'DNVV-UXQW',
    'Booking Reference: DNVV-UXQW',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'DNVV-UXQW'
WHERE name = 'Wayne Dyamond' AND email = 'waynedyamond@gmail.com' AND DATE(created_at) = DATE('2025-06-18 09:59:52')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Wayne',
    'Dyamond',
    NULL,
    'waynedyamond@gmail.com',
    '+447775843121',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Wayne Dyamond' AND email = 'waynedyamond@gmail.com' AND DATE(created_at) = DATE('2025-06-18 09:59:52')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Wayne',
    'Dyamond',
    NULL,
    'waynedyamond@gmail.com',
    '+447775843121',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Wayne Dyamond' AND email = 'waynedyamond@gmail.com' AND DATE(created_at) = DATE('2025-06-18 09:59:52')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Wayne',
    'Dyamond',
    NULL,
    'waynedyamond@gmail.com',
    '+447775843121',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Wayne Dyamond' AND email = 'waynedyamond@gmail.com' AND DATE(created_at) = DATE('2025-06-18 09:59:52')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'EVAX-RDKA',
    'Booking Reference: EVAX-RDKA',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'EVAX-RDKA'
WHERE name = 'Kenneth Dentremont' AND email = 'kremer.lori@gmail.com' AND DATE(created_at) = DATE('2025-06-21 19:52:21')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Kenneth',
    'Dentremont',
    NULL,
    'kremer.lori@gmail.com',
    '+18014556387',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Kenneth Dentremont' AND email = 'kremer.lori@gmail.com' AND DATE(created_at) = DATE('2025-06-21 19:52:21')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Kenneth',
    'Dentremont',
    NULL,
    'kremer.lori@gmail.com',
    '+18014556387',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Kenneth Dentremont' AND email = 'kremer.lori@gmail.com' AND DATE(created_at) = DATE('2025-06-21 19:52:21')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'FMAN-DZIF',
    'Booking Reference: FMAN-DZIF',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'FMAN-DZIF'
WHERE name = 'Tim Tippetts' AND email = 'tim.tippetts@icloud.com' AND DATE(created_at) = DATE('2025-06-30 13:22:43')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Tim',
    'Tippetts',
    NULL,
    'tim.tippetts@icloud.com',
    '+447506032262',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Tim Tippetts' AND email = 'tim.tippetts@icloud.com' AND DATE(created_at) = DATE('2025-06-30 13:22:43')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Tim',
    'Tippetts',
    NULL,
    'tim.tippetts@icloud.com',
    '+447506032262',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Tim Tippetts' AND email = 'tim.tippetts@icloud.com' AND DATE(created_at) = DATE('2025-06-30 13:22:43')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'TSAB-WPBP',
    'Booking Reference: TSAB-WPBP',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'TSAB-WPBP'
WHERE name = 'Sam Sharland' AND email = 'sam.sharland6@gmail.com' AND DATE(created_at) = DATE('2025-06-30 17:59:57')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Sam',
    'Sharland',
    NULL,
    'sam.sharland6@gmail.com',
    '+447979186351',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Sam Sharland' AND email = 'sam.sharland6@gmail.com' AND DATE(created_at) = DATE('2025-06-30 17:59:57')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Sam',
    'Sharland',
    NULL,
    'sam.sharland6@gmail.com',
    '+447979186351',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Sam Sharland' AND email = 'sam.sharland6@gmail.com' AND DATE(created_at) = DATE('2025-06-30 17:59:57')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'GSJU-VKNK',
    'Booking Reference: GSJU-VKNK',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'GSJU-VKNK'
WHERE name = 'Beatrix Bliss' AND email = 'Be@beatrixbliss.co.uk' AND DATE(created_at) = DATE('2025-07-01 21:38:17')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Beatrix',
    'Bliss',
    NULL,
    'Be@beatrixbliss.co.uk',
    '+447817479532',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Beatrix Bliss' AND email = 'Be@beatrixbliss.co.uk' AND DATE(created_at) = DATE('2025-07-01 21:38:17')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Beatrix',
    'Bliss',
    NULL,
    'Be@beatrixbliss.co.uk',
    '+447817479532',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Beatrix Bliss' AND email = 'Be@beatrixbliss.co.uk' AND DATE(created_at) = DATE('2025-07-01 21:38:17')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'TTGG-BNVZ',
    'Booking Reference: TTGG-BNVZ',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'TTGG-BNVZ'
WHERE name = 'Sarah Weiss' AND email = 'Sarah.k.weiss@hotmail.com' AND DATE(created_at) = DATE('2025-07-04 06:23:08')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Sarah',
    'Weiss',
    NULL,
    'Sarah.k.weiss@hotmail.com',
    '+447852213934',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Sarah Weiss' AND email = 'Sarah.k.weiss@hotmail.com' AND DATE(created_at) = DATE('2025-07-04 06:23:08')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Sarah',
    'Weiss',
    NULL,
    'Sarah.k.weiss@hotmail.com',
    '+447852213934',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Sarah Weiss' AND email = 'Sarah.k.weiss@hotmail.com' AND DATE(created_at) = DATE('2025-07-04 06:23:08')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'AMDM-ZYFD',
    'Booking Reference: AMDM-ZYFD',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'AMDM-ZYFD'
WHERE name = 'Deborah Wilder-Wood' AND email = 'debs@deborahwilder.co.uk' AND DATE(created_at) = DATE('2025-07-04 11:56:03')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Deborah',
    'Wilder-Wood',
    NULL,
    'debs@deborahwilder.co.uk',
    '+447903031383',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Deborah Wilder-Wood' AND email = 'debs@deborahwilder.co.uk' AND DATE(created_at) = DATE('2025-07-04 11:56:03')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Deborah',
    'Wilder-Wood',
    NULL,
    'debs@deborahwilder.co.uk',
    '+447903031383',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Deborah Wilder-Wood' AND email = 'debs@deborahwilder.co.uk' AND DATE(created_at) = DATE('2025-07-04 11:56:03')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'YZTN-AETQ',
    'Booking Reference: YZTN-AETQ',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'YZTN-AETQ'
WHERE name = 'Stuart Tannahill' AND email = 'tannahillj95@gmail.com' AND DATE(created_at) = DATE('2025-07-13 07:06:12')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Stuart',
    'Tannahill',
    NULL,
    'tannahillj95@gmail.com',
    '+447714747475',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Stuart Tannahill' AND email = 'tannahillj95@gmail.com' AND DATE(created_at) = DATE('2025-07-13 07:06:12')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 1
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
    'MIBN-JXDF',
    'Booking Reference: MIBN-JXDF',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'MIBN-JXDF'
WHERE name = 'Guy Monson' AND email = 'guymonson2@yahoo.com' AND DATE(created_at) = DATE('2025-07-14 14:15:45')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Guy',
    'Monson',
    NULL,
    'guymonson2@yahoo.com',
    '+447595306038',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Guy Monson' AND email = 'guymonson2@yahoo.com' AND DATE(created_at) = DATE('2025-07-14 14:15:45')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Guy',
    'Monson',
    NULL,
    'guymonson2@yahoo.com',
    '+447595306038',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Guy Monson' AND email = 'guymonson2@yahoo.com' AND DATE(created_at) = DATE('2025-07-14 14:15:45')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Guy',
    'Monson',
    NULL,
    'guymonson2@yahoo.com',
    '+447595306038',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Guy Monson' AND email = 'guymonson2@yahoo.com' AND DATE(created_at) = DATE('2025-07-14 14:15:45')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'DMME-VRXT',
    'Booking Reference: DMME-VRXT',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'DMME-VRXT'
WHERE name = 'Nic Salter' AND email = 'nic.salter@yahoo.co.uk' AND DATE(created_at) = DATE('2025-07-15 08:09:56')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Nic',
    'Salter',
    NULL,
    'nic.salter@yahoo.co.uk',
    '+447748603921',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Nic Salter' AND email = 'nic.salter@yahoo.co.uk' AND DATE(created_at) = DATE('2025-07-15 08:09:56')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Nic',
    'Salter',
    NULL,
    'nic.salter@yahoo.co.uk',
    '+447748603921',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Nic Salter' AND email = 'nic.salter@yahoo.co.uk' AND DATE(created_at) = DATE('2025-07-15 08:09:56')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Nic',
    'Salter',
    NULL,
    'nic.salter@yahoo.co.uk',
    '+447748603921',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Nic Salter' AND email = 'nic.salter@yahoo.co.uk' AND DATE(created_at) = DATE('2025-07-15 08:09:56')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'SHNS-INSG',
    'Booking Reference: SHNS-INSG',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'SHNS-INSG'
WHERE name = 'Eamonn Hughes' AND email = 'eamonnh@gmail.com' AND DATE(created_at) = DATE('2025-07-25 13:23:23')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Eamonn',
    'Hughes',
    NULL,
    'eamonnh@gmail.com',
    '+447984726816',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Eamonn Hughes' AND email = 'eamonnh@gmail.com' AND DATE(created_at) = DATE('2025-07-25 13:23:23')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Eamonn',
    'Hughes',
    NULL,
    'eamonnh@gmail.com',
    '+447984726816',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Eamonn Hughes' AND email = 'eamonnh@gmail.com' AND DATE(created_at) = DATE('2025-07-25 13:23:23')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'UYDI-DFII',
    'Booking Reference: UYDI-DFII',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'UYDI-DFII'
WHERE name = 'Frazer Keam' AND email = 'frazer.keam@gmail.com' AND DATE(created_at) = DATE('2025-07-28 13:43:42')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Frazer',
    'Keam',
    NULL,
    'frazer.keam@gmail.com',
    '+447385372760',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Frazer Keam' AND email = 'frazer.keam@gmail.com' AND DATE(created_at) = DATE('2025-07-28 13:43:42')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Frazer',
    'Keam',
    NULL,
    'frazer.keam@gmail.com',
    '+447385372760',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Frazer Keam' AND email = 'frazer.keam@gmail.com' AND DATE(created_at) = DATE('2025-07-28 13:43:42')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'HDPP-RRWU',
    'Booking Reference: HDPP-RRWU',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'HDPP-RRWU'
WHERE name = 'Susan Pearson' AND email = 'skpatmhc@aol.com' AND DATE(created_at) = DATE('2025-07-30 15:57:00')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Susan',
    'Pearson',
    NULL,
    'skpatmhc@aol.com',
    '+447970297758',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Susan Pearson' AND email = 'skpatmhc@aol.com' AND DATE(created_at) = DATE('2025-07-30 15:57:00')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Susan',
    'Pearson',
    NULL,
    'skpatmhc@aol.com',
    '+447970297758',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Susan Pearson' AND email = 'skpatmhc@aol.com' AND DATE(created_at) = DATE('2025-07-30 15:57:00')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'ZRGV-CIFU',
    'Booking Reference: ZRGV-CIFU',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'ZRGV-CIFU'
WHERE name = 'Adam Sanderson' AND email = 'adam-sanderson@hotmail.com' AND DATE(created_at) = DATE('2025-08-05 12:22:26')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Adam',
    'Sanderson',
    NULL,
    'adam-sanderson@hotmail.com',
    '+447944947770',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Adam Sanderson' AND email = 'adam-sanderson@hotmail.com' AND DATE(created_at) = DATE('2025-08-05 12:22:26')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Adam',
    'Sanderson',
    NULL,
    'adam-sanderson@hotmail.com',
    '+447944947770',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Adam Sanderson' AND email = 'adam-sanderson@hotmail.com' AND DATE(created_at) = DATE('2025-08-05 12:22:26')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'MQCI-NVZR',
    'Booking Reference: MQCI-NVZR',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'MQCI-NVZR'
WHERE name = 'Richard Holland' AND email = 'owen.holland1983@gmail.com' AND DATE(created_at) = DATE('2025-08-06 18:25:31')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Richard',
    'Holland',
    NULL,
    'owen.holland1983@gmail.com',
    '+447359419800',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Richard Holland' AND email = 'owen.holland1983@gmail.com' AND DATE(created_at) = DATE('2025-08-06 18:25:31')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Richard',
    'Holland',
    NULL,
    'owen.holland1983@gmail.com',
    '+447359419800',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Richard Holland' AND email = 'owen.holland1983@gmail.com' AND DATE(created_at) = DATE('2025-08-06 18:25:31')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Richard',
    'Holland',
    NULL,
    'owen.holland1983@gmail.com',
    '+447359419800',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Richard Holland' AND email = 'owen.holland1983@gmail.com' AND DATE(created_at) = DATE('2025-08-06 18:25:31')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'DRSD-QNTF',
    'Booking Reference: DRSD-QNTF',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'DRSD-QNTF'
WHERE name = 'Neil Champion' AND email = 'nchampion703@gmail.com' AND DATE(created_at) = DATE('2025-08-08 09:34:57')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Neil',
    'Champion',
    NULL,
    'nchampion703@gmail.com',
    '+447891840961',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Neil Champion' AND email = 'nchampion703@gmail.com' AND DATE(created_at) = DATE('2025-08-08 09:34:57')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Neil',
    'Champion',
    NULL,
    'nchampion703@gmail.com',
    '+447891840961',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Neil Champion' AND email = 'nchampion703@gmail.com' AND DATE(created_at) = DATE('2025-08-08 09:34:57')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'YQSY-SFDD',
    'Booking Reference: YQSY-SFDD',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'YQSY-SFDD'
WHERE name = 'Darren Hudson' AND email = 'dazdazt5@gmail.com' AND DATE(created_at) = DATE('2025-08-08 11:16:08')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Darren',
    'Hudson',
    NULL,
    'dazdazt5@gmail.com',
    '+447799000135',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Darren Hudson' AND email = 'dazdazt5@gmail.com' AND DATE(created_at) = DATE('2025-08-08 11:16:08')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Darren',
    'Hudson',
    NULL,
    'dazdazt5@gmail.com',
    '+447799000135',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Darren Hudson' AND email = 'dazdazt5@gmail.com' AND DATE(created_at) = DATE('2025-08-08 11:16:08')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'QKIE-XTFE',
    'Booking Reference: QKIE-XTFE',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'QKIE-XTFE'
WHERE name = 'Juliette Roth' AND email = 'rothj223@gmail.com' AND DATE(created_at) = DATE('2025-08-10 00:54:55')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Juliette',
    'Roth',
    NULL,
    'rothj223@gmail.com',
    '+33760346171',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Juliette Roth' AND email = 'rothj223@gmail.com' AND DATE(created_at) = DATE('2025-08-10 00:54:55')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 1
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
    'MXII-VNIE',
    'Booking Reference: MXII-VNIE',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'MXII-VNIE'
WHERE name = 'Kirsty Cole' AND email = 'misskirstycole@gmail.com' AND DATE(created_at) = DATE('2025-08-11 06:52:22')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Kirsty',
    'Cole',
    NULL,
    'misskirstycole@gmail.com',
    '+447730181266',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Kirsty Cole' AND email = 'misskirstycole@gmail.com' AND DATE(created_at) = DATE('2025-08-11 06:52:22')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 1
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
    'GNPA-WRAQ',
    'Booking Reference: GNPA-WRAQ',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'GNPA-WRAQ'
WHERE name = 'Kirsty Cole' AND email = 'misskirstycole@gmail.com' AND DATE(created_at) = DATE('2025-08-11 07:11:36')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Kirsty',
    'Cole',
    NULL,
    'misskirstycole@gmail.com',
    '+447730181266',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Kirsty Cole' AND email = 'misskirstycole@gmail.com' AND DATE(created_at) = DATE('2025-08-11 07:11:36')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 1
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
    'YMQM-JMQB',
    'Booking Reference: YMQM-JMQB',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'YMQM-JMQB'
WHERE name = 'Eimear Flynn' AND email = 'eimear.flynn1@gmail.com' AND DATE(created_at) = DATE('2025-08-12 20:07:52')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Eimear',
    'Flynn',
    NULL,
    'eimear.flynn1@gmail.com',
    '+447928583507',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Eimear Flynn' AND email = 'eimear.flynn1@gmail.com' AND DATE(created_at) = DATE('2025-08-12 20:07:52')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Eimear',
    'Flynn',
    NULL,
    'eimear.flynn1@gmail.com',
    '+447928583507',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Eimear Flynn' AND email = 'eimear.flynn1@gmail.com' AND DATE(created_at) = DATE('2025-08-12 20:07:52')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'NIQT-QJKJ',
    'Booking Reference: NIQT-QJKJ',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'NIQT-QJKJ'
WHERE name = 'Stephen Harris-fennell' AND email = 'stephenharrisfennell@hotmail.com' AND DATE(created_at) = DATE('2025-08-13 20:49:42')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Stephen',
    'Harris-fennell',
    NULL,
    'stephenharrisfennell@hotmail.com',
    '+447875377184',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Stephen Harris-fennell' AND email = 'stephenharrisfennell@hotmail.com' AND DATE(created_at) = DATE('2025-08-13 20:49:42')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Stephen',
    'Harris-fennell',
    NULL,
    'stephenharrisfennell@hotmail.com',
    '+447875377184',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Stephen Harris-fennell' AND email = 'stephenharrisfennell@hotmail.com' AND DATE(created_at) = DATE('2025-08-13 20:49:42')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'QPET-MKSB',
    'Booking Reference: QPET-MKSB',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'QPET-MKSB'
WHERE name = 'Julie Melindo' AND email = 'juliemelindo@hotmail.com' AND DATE(created_at) = DATE('2025-08-17 08:00:07')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Julie',
    'Melindo',
    NULL,
    'juliemelindo@hotmail.com',
    '+447964754141',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Julie Melindo' AND email = 'juliemelindo@hotmail.com' AND DATE(created_at) = DATE('2025-08-17 08:00:07')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Julie',
    'Melindo',
    NULL,
    'juliemelindo@hotmail.com',
    '+447964754141',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Julie Melindo' AND email = 'juliemelindo@hotmail.com' AND DATE(created_at) = DATE('2025-08-17 08:00:07')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'KVVF-XKFG',
    'Booking Reference: KVVF-XKFG',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'KVVF-XKFG'
WHERE name = 'Kevin Devine' AND email = 'kevthered74@icloud.com' AND DATE(created_at) = DATE('2025-08-17 19:11:06')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Kevin',
    'Devine',
    NULL,
    'kevthered74@icloud.com',
    '+447368911404',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Kevin Devine' AND email = 'kevthered74@icloud.com' AND DATE(created_at) = DATE('2025-08-17 19:11:06')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Kevin',
    'Devine',
    NULL,
    'kevthered74@icloud.com',
    '+447368911404',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Kevin Devine' AND email = 'kevthered74@icloud.com' AND DATE(created_at) = DATE('2025-08-17 19:11:06')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'VIRY-KUCJ',
    'Booking Reference: VIRY-KUCJ',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'VIRY-KUCJ'
WHERE name = 'Matthew Steadman' AND email = 'matt@block9.com' AND DATE(created_at) = DATE('2025-08-19 08:33:05')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Matthew',
    'Steadman',
    NULL,
    'matt@block9.com',
    '+447940916540',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Matthew Steadman' AND email = 'matt@block9.com' AND DATE(created_at) = DATE('2025-08-19 08:33:05')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Matthew',
    'Steadman',
    NULL,
    'matt@block9.com',
    '+447940916540',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Matthew Steadman' AND email = 'matt@block9.com' AND DATE(created_at) = DATE('2025-08-19 08:33:05')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Matthew',
    'Steadman',
    NULL,
    'matt@block9.com',
    '+447940916540',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Matthew Steadman' AND email = 'matt@block9.com' AND DATE(created_at) = DATE('2025-08-19 08:33:05')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'SNZV-VUQU',
    'Booking Reference: SNZV-VUQU',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'SNZV-VUQU'
WHERE name = 'Edward Thompson' AND email = 'edwardwthompson@outlook.com' AND DATE(created_at) = DATE('2025-08-20 10:38:43')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Edward',
    'Thompson',
    NULL,
    'edwardwthompson@outlook.com',
    '+447725532874',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Edward Thompson' AND email = 'edwardwthompson@outlook.com' AND DATE(created_at) = DATE('2025-08-20 10:38:43')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 1
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
    'NGVA-PXRR',
    'Booking Reference: NGVA-PXRR',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'NGVA-PXRR'
WHERE name = 'Jasmine Elmes' AND email = 'jazz193a@hotmail.com' AND DATE(created_at) = DATE('2025-08-27 17:31:22')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Jasmine',
    'Elmes',
    NULL,
    'jazz193a@hotmail.com',
    '+447947710787',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Jasmine Elmes' AND email = 'jazz193a@hotmail.com' AND DATE(created_at) = DATE('2025-08-27 17:31:22')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Jasmine',
    'Elmes',
    NULL,
    'jazz193a@hotmail.com',
    '+447947710787',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Jasmine Elmes' AND email = 'jazz193a@hotmail.com' AND DATE(created_at) = DATE('2025-08-27 17:31:22')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'ZEKI-WIYA',
    'Booking Reference: ZEKI-WIYA',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'ZEKI-WIYA'
WHERE name = 'Alastair McCallien' AND email = 'Amccallien@yahoo.co.uk' AND DATE(created_at) = DATE('2025-08-28 09:45:07')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Alastair',
    'McCallien',
    NULL,
    'Amccallien@yahoo.co.uk',
    '+447901511674',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Alastair McCallien' AND email = 'Amccallien@yahoo.co.uk' AND DATE(created_at) = DATE('2025-08-28 09:45:07')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 1
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
    'EJAW-YIUI',
    'Booking Reference: EJAW-YIUI',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'EJAW-YIUI'
WHERE name = 'Michelle Foulger' AND email = 'michellefoulger3005@gmail.com' AND DATE(created_at) = DATE('2025-08-28 16:20:21')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Michelle',
    'Foulger',
    NULL,
    'michellefoulger3005@gmail.com',
    '+447514067168',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Michelle Foulger' AND email = 'michellefoulger3005@gmail.com' AND DATE(created_at) = DATE('2025-08-28 16:20:21')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 1
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
    'XTIC-DQJB',
    'Booking Reference: XTIC-DQJB',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'XTIC-DQJB'
WHERE name = 'Roxanne Drew' AND email = 'roxy.drew123@gmail.com' AND DATE(created_at) = DATE('2025-08-29 05:37:01')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Roxanne',
    'Drew',
    NULL,
    'roxy.drew123@gmail.com',
    '+447446234637',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Roxanne Drew' AND email = 'roxy.drew123@gmail.com' AND DATE(created_at) = DATE('2025-08-29 05:37:01')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Roxanne',
    'Drew',
    NULL,
    'roxy.drew123@gmail.com',
    '+447446234637',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Roxanne Drew' AND email = 'roxy.drew123@gmail.com' AND DATE(created_at) = DATE('2025-08-29 05:37:01')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'BMHQ-NBFX',
    'Booking Reference: BMHQ-NBFX',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'BMHQ-NBFX'
WHERE name = 'Zoe Bates' AND email = 'zoe_holden@hotmail.com' AND DATE(created_at) = DATE('2025-09-08 10:28:56')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Zoe',
    'Bates',
    NULL,
    'zoe_holden@hotmail.com',
    '+447816859812',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Zoe Bates' AND email = 'zoe_holden@hotmail.com' AND DATE(created_at) = DATE('2025-09-08 10:28:56')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Zoe',
    'Bates',
    NULL,
    'zoe_holden@hotmail.com',
    '+447816859812',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Zoe Bates' AND email = 'zoe_holden@hotmail.com' AND DATE(created_at) = DATE('2025-09-08 10:28:56')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'BPGH-MKFH',
    'Booking Reference: BPGH-MKFH',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'BPGH-MKFH'
WHERE name = 'Rowan Leach' AND email = 'rowanleach88@gmail.com' AND DATE(created_at) = DATE('2025-09-08 14:06:25')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Rowan',
    'Leach',
    NULL,
    'rowanleach88@gmail.com',
    '+447714253109',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Rowan Leach' AND email = 'rowanleach88@gmail.com' AND DATE(created_at) = DATE('2025-09-08 14:06:25')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Rowan',
    'Leach',
    NULL,
    'rowanleach88@gmail.com',
    '+447714253109',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Rowan Leach' AND email = 'rowanleach88@gmail.com' AND DATE(created_at) = DATE('2025-09-08 14:06:25')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'EYSB-VDCW',
    'Booking Reference: EYSB-VDCW',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'EYSB-VDCW'
WHERE name = 'Jasmine Elmes' AND email = 'jazz193a@hotmail.com' AND DATE(created_at) = DATE('2025-09-08 15:54:59')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Jasmine',
    'Elmes',
    NULL,
    'jazz193a@hotmail.com',
    '+447947710787',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Jasmine Elmes' AND email = 'jazz193a@hotmail.com' AND DATE(created_at) = DATE('2025-09-08 15:54:59')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 1
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
    'JUTC-ACJW',
    'Booking Reference: JUTC-ACJW',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'JUTC-ACJW'
WHERE name = 'Brian Jackson' AND email = 'brian.jackson@blueyonder.co.uk' AND DATE(created_at) = DATE('2025-09-09 06:30:35')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Brian',
    'Jackson',
    NULL,
    'brian.jackson@blueyonder.co.uk',
    '+447528444224',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Brian Jackson' AND email = 'brian.jackson@blueyonder.co.uk' AND DATE(created_at) = DATE('2025-09-09 06:30:35')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Brian',
    'Jackson',
    NULL,
    'brian.jackson@blueyonder.co.uk',
    '+447528444224',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Brian Jackson' AND email = 'brian.jackson@blueyonder.co.uk' AND DATE(created_at) = DATE('2025-09-09 06:30:35')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'KTUC-MJPV',
    'Booking Reference: KTUC-MJPV',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'KTUC-MJPV'
WHERE name = 'George Smith' AND email = 'george@gtjs.co.uk' AND DATE(created_at) = DATE('2025-09-24 19:39:49')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'George',
    'Smith',
    NULL,
    'george@gtjs.co.uk',
    '+447970090517',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'George Smith' AND email = 'george@gtjs.co.uk' AND DATE(created_at) = DATE('2025-09-24 19:39:49')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'George',
    'Smith',
    NULL,
    'george@gtjs.co.uk',
    '+447970090517',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'George Smith' AND email = 'george@gtjs.co.uk' AND DATE(created_at) = DATE('2025-09-24 19:39:49')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'HTVG-DVAM',
    'Booking Reference: HTVG-DVAM',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'HTVG-DVAM'
WHERE name = 'Tim Wallace' AND email = 'tdw345@hotmail.com' AND DATE(created_at) = DATE('2025-09-27 17:45:19')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Tim',
    'Wallace',
    NULL,
    'tdw345@hotmail.com',
    '+447778748677',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Tim Wallace' AND email = 'tdw345@hotmail.com' AND DATE(created_at) = DATE('2025-09-27 17:45:19')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Tim',
    'Wallace',
    NULL,
    'tdw345@hotmail.com',
    '+447778748677',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Tim Wallace' AND email = 'tdw345@hotmail.com' AND DATE(created_at) = DATE('2025-09-27 17:45:19')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'BCPF-JQBB',
    'Booking Reference: BCPF-JQBB',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'BCPF-JQBB'
WHERE name = 'Madhav Aery' AND email = 'aery.madhav@gmail.com' AND DATE(created_at) = DATE('2025-09-30 08:41:39')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Madhav',
    'Aery',
    NULL,
    'aery.madhav@gmail.com',
    '+447460720927',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Madhav Aery' AND email = 'aery.madhav@gmail.com' AND DATE(created_at) = DATE('2025-09-30 08:41:39')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Madhav',
    'Aery',
    NULL,
    'aery.madhav@gmail.com',
    '+447460720927',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Madhav Aery' AND email = 'aery.madhav@gmail.com' AND DATE(created_at) = DATE('2025-09-30 08:41:39')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'VRUX-ZXBM',
    'Booking Reference: VRUX-ZXBM',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'VRUX-ZXBM'
WHERE name = 'Emma Taylor-Smith' AND email = 'emmats@hotmail.co.uk' AND DATE(created_at) = DATE('2025-10-02 06:51:54')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Emma',
    'Taylor-Smith',
    NULL,
    'emmats@hotmail.co.uk',
    '+447824807623',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Emma Taylor-Smith' AND email = 'emmats@hotmail.co.uk' AND DATE(created_at) = DATE('2025-10-02 06:51:54')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 1
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
    'GFHU-ETGV',
    'Booking Reference: GFHU-ETGV',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'GFHU-ETGV'
WHERE name = 'Sakshi Grover' AND email = 'grover.sakshi03@gmail.com' AND DATE(created_at) = DATE('2025-10-11 12:41:02')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Sakshi',
    'Grover',
    NULL,
    'grover.sakshi03@gmail.com',
    '+919822675588',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Sakshi Grover' AND email = 'grover.sakshi03@gmail.com' AND DATE(created_at) = DATE('2025-10-11 12:41:02')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 1
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
    'AQRT-HCUJ',
    'Booking Reference: AQRT-HCUJ',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'AQRT-HCUJ'
WHERE name = 'Abdalla Attia' AND email = 'abdallah@alamal.com' AND DATE(created_at) = DATE('2025-10-12 15:19:40')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Abdalla',
    'Attia',
    NULL,
    'abdallah@alamal.com',
    '+447757206684',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Abdalla Attia' AND email = 'abdallah@alamal.com' AND DATE(created_at) = DATE('2025-10-12 15:19:40')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Abdalla',
    'Attia',
    NULL,
    'abdallah@alamal.com',
    '+447757206684',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Abdalla Attia' AND email = 'abdallah@alamal.com' AND DATE(created_at) = DATE('2025-10-12 15:19:40')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'VZHT-ZSUZ',
    'Booking Reference: VZHT-ZSUZ',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'VZHT-ZSUZ'
WHERE name = 'Zac Towner' AND email = 'zac.towner@gmail.com' AND DATE(created_at) = DATE('2025-10-14 07:29:31')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Zac',
    'Towner',
    NULL,
    'zac.towner@gmail.com',
    '+447484829707',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Zac Towner' AND email = 'zac.towner@gmail.com' AND DATE(created_at) = DATE('2025-10-14 07:29:31')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Zac',
    'Towner',
    NULL,
    'zac.towner@gmail.com',
    '+447484829707',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Zac Towner' AND email = 'zac.towner@gmail.com' AND DATE(created_at) = DATE('2025-10-14 07:29:31')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'ABVH-IKEA',
    'Booking Reference: ABVH-IKEA',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'ABVH-IKEA'
WHERE name = 'Karen Wright' AND email = 'karen@hrconsultants.co.uk' AND DATE(created_at) = DATE('2025-10-16 11:29:42')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Karen',
    'Wright',
    NULL,
    'karen@hrconsultants.co.uk',
    '+447785387580',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Karen Wright' AND email = 'karen@hrconsultants.co.uk' AND DATE(created_at) = DATE('2025-10-16 11:29:42')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Karen',
    'Wright',
    NULL,
    'karen@hrconsultants.co.uk',
    '+447785387580',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Karen Wright' AND email = 'karen@hrconsultants.co.uk' AND DATE(created_at) = DATE('2025-10-16 11:29:42')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'Karen',
    'Wright',
    NULL,
    'karen@hrconsultants.co.uk',
    '+447785387580',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Karen Wright' AND email = 'karen@hrconsultants.co.uk' AND DATE(created_at) = DATE('2025-10-16 11:29:42')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 3
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
    'PHHR-YUGT',
    'Booking Reference: PHHR-YUGT',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'PHHR-YUGT'
WHERE name = 'Carmelo Bellaccomo' AND email = 'csgb@btinternet.com' AND DATE(created_at) = DATE('2025-10-16 15:53:59')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Carmelo',
    'Bellaccomo',
    NULL,
    'csgb@btinternet.com',
    '+447971551374',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Carmelo Bellaccomo' AND email = 'csgb@btinternet.com' AND DATE(created_at) = DATE('2025-10-16 15:53:59')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Carmelo',
    'Bellaccomo',
    NULL,
    'csgb@btinternet.com',
    '+447971551374',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Carmelo Bellaccomo' AND email = 'csgb@btinternet.com' AND DATE(created_at) = DATE('2025-10-16 15:53:59')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'IYDF-VTGD',
    'Booking Reference: IYDF-VTGD',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'IYDF-VTGD'
WHERE name = 'Eland Frost' AND email = 'elandfrost@gmail.com' AND DATE(created_at) = DATE('2025-10-16 21:19:08')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Eland',
    'Frost',
    NULL,
    'elandfrost@gmail.com',
    '+447564330707',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Eland Frost' AND email = 'elandfrost@gmail.com' AND DATE(created_at) = DATE('2025-10-16 21:19:08')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 1
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
    'ZNGC-SHZR',
    'Booking Reference: ZNGC-SHZR',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'ZNGC-SHZR'
WHERE name = 'Prudence Smith' AND email = 'prudencesmith@jonesday.com' AND DATE(created_at) = DATE('2025-11-24 02:16:16')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Prudence',
    'Smith',
    NULL,
    'prudencesmith@jonesday.com',
    '+61400979575',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Prudence Smith' AND email = 'prudencesmith@jonesday.com' AND DATE(created_at) = DATE('2025-11-24 02:16:16')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 4
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
    'Prudence',
    'Smith',
    NULL,
    'prudencesmith@jonesday.com',
    '+61400979575',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Prudence Smith' AND email = 'prudencesmith@jonesday.com' AND DATE(created_at) = DATE('2025-11-24 02:16:16')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 4
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
    'Prudence',
    'Smith',
    NULL,
    'prudencesmith@jonesday.com',
    '+61400979575',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Prudence Smith' AND email = 'prudencesmith@jonesday.com' AND DATE(created_at) = DATE('2025-11-24 02:16:16')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 4
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
    'Prudence',
    'Smith',
    NULL,
    'prudencesmith@jonesday.com',
    '+61400979575',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Prudence Smith' AND email = 'prudencesmith@jonesday.com' AND DATE(created_at) = DATE('2025-11-24 02:16:16')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 4
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
    'AQFG-ZFMT',
    'Booking Reference: AQFG-ZFMT',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'AQFG-ZFMT'
WHERE name = 'Susan McCarthy Moore' AND email = 'susanmccarthymoore@gmail.com' AND DATE(created_at) = DATE('2025-11-25 11:15:59')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Susan',
    'McCarthy Moore',
    NULL,
    'susanmccarthymoore@gmail.com',
    '+447789773863',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Susan McCarthy Moore' AND email = 'susanmccarthymoore@gmail.com' AND DATE(created_at) = DATE('2025-11-25 11:15:59')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Susan',
    'McCarthy Moore',
    NULL,
    'susanmccarthymoore@gmail.com',
    '+447789773863',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Susan McCarthy Moore' AND email = 'susanmccarthymoore@gmail.com' AND DATE(created_at) = DATE('2025-11-25 11:15:59')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'IQDF-BGGP',
    'Booking Reference: IQDF-BGGP',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'IQDF-BGGP'
WHERE name = 'Laura Smith' AND email = 'marlau50@outlook.com' AND DATE(created_at) = DATE('2025-05-12 11:20:39')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Laura',
    'Smith',
    NULL,
    'marlau50@outlook.com',
    '+447488339705',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Laura Smith' AND email = 'marlau50@outlook.com' AND DATE(created_at) = DATE('2025-05-12 11:20:39')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Laura',
    'Smith',
    NULL,
    'marlau50@outlook.com',
    '+447488339705',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Laura Smith' AND email = 'marlau50@outlook.com' AND DATE(created_at) = DATE('2025-05-12 11:20:39')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'NBER-JRDN',
    'Booking Reference: NBER-JRDN',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'NBER-JRDN'
WHERE name = 'Sarah Holmes' AND email = 'p@player1.biz' AND DATE(created_at) = DATE('2025-06-03 11:50:14')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Sarah',
    'Holmes',
    NULL,
    'p@player1.biz',
    '+447515745110',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Sarah Holmes' AND email = 'p@player1.biz' AND DATE(created_at) = DATE('2025-06-03 11:50:14')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Sarah',
    'Holmes',
    NULL,
    'p@player1.biz',
    '+447515745110',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Sarah Holmes' AND email = 'p@player1.biz' AND DATE(created_at) = DATE('2025-06-03 11:50:14')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'UJPK-MAIV',
    'Booking Reference: UJPK-MAIV',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'UJPK-MAIV'
WHERE name = 'Andrew Spurgeon' AND email = 'zoe-andy@live.co.uk' AND DATE(created_at) = DATE('2025-02-24 13:59:34')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Andrew',
    'Spurgeon',
    NULL,
    'zoe-andy@live.co.uk',
    '+447752101748',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Andrew Spurgeon' AND email = 'zoe-andy@live.co.uk' AND DATE(created_at) = DATE('2025-02-24 13:59:34')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 1
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
    'WGPV-MJRX',
    'Booking Reference: WGPV-MJRX',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'WGPV-MJRX'
WHERE name = 'Alex Marley' AND email = 'amarley@tiffin.kingston.sch.uk' AND DATE(created_at) = DATE('2024-12-24 11:36:35')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Alex',
    'Marley',
    NULL,
    'amarley@tiffin.kingston.sch.uk',
    '+447876363990',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Alex Marley' AND email = 'amarley@tiffin.kingston.sch.uk' AND DATE(created_at) = DATE('2024-12-24 11:36:35')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Alex',
    'Marley',
    NULL,
    'amarley@tiffin.kingston.sch.uk',
    '+447876363990',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Alex Marley' AND email = 'amarley@tiffin.kingston.sch.uk' AND DATE(created_at) = DATE('2024-12-24 11:36:35')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'YZWD-WFXC',
    'Booking Reference: YZWD-WFXC',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'YZWD-WFXC'
WHERE name = 'Alan Morrison' AND email = 'armorrison1980@gmail.com' AND DATE(created_at) = DATE('2025-03-17 16:14:43')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Alan',
    'Morrison',
    NULL,
    'armorrison1980@gmail.com',
    '+447974962289',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Alan Morrison' AND email = 'armorrison1980@gmail.com' AND DATE(created_at) = DATE('2025-03-17 16:14:43')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Alan',
    'Morrison',
    NULL,
    'armorrison1980@gmail.com',
    '+447974962289',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Alan Morrison' AND email = 'armorrison1980@gmail.com' AND DATE(created_at) = DATE('2025-03-17 16:14:43')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'SWFE-WUQX',
    'Booking Reference: SWFE-WUQX',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'SWFE-WUQX'
WHERE name = 'Becky Newbury' AND email = 'balletbecks@hotmail.co.uk' AND DATE(created_at) = DATE('2025-07-29 18:30:43')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Becky',
    'Newbury',
    NULL,
    'balletbecks@hotmail.co.uk',
    '+447986262929',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Becky Newbury' AND email = 'balletbecks@hotmail.co.uk' AND DATE(created_at) = DATE('2025-07-29 18:30:43')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Becky',
    'Newbury',
    NULL,
    'balletbecks@hotmail.co.uk',
    '+447986262929',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Becky Newbury' AND email = 'balletbecks@hotmail.co.uk' AND DATE(created_at) = DATE('2025-07-29 18:30:43')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'GWCD-DAPB',
    'Booking Reference: GWCD-DAPB',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'GWCD-DAPB'
WHERE name = 'Christine milligan' AND email = 'Christinemilligan506@gmail.com' AND DATE(created_at) = DATE('2024-10-27 10:00:02')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Christine',
    'milligan',
    NULL,
    'Christinemilligan506@gmail.com',
    '+447535150104',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Christine milligan' AND email = 'Christinemilligan506@gmail.com' AND DATE(created_at) = DATE('2024-10-27 10:00:02')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Christine',
    'milligan',
    NULL,
    'Christinemilligan506@gmail.com',
    '+447535150104',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Christine milligan' AND email = 'Christinemilligan506@gmail.com' AND DATE(created_at) = DATE('2024-10-27 10:00:02')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'ZYWA-ZMSF',
    'Booking Reference: ZYWA-ZMSF',
    '2020-01-01',
    '2099-12-31',
    NULL,
    0,
    TRUE,
    'system'
);

UPDATE trip_booking.all_booking
SET voucher_code = 'ZYWA-ZMSF'
WHERE name = 'Gary Hawkins' AND email = 'aagaryh@gmail.com' AND DATE(created_at) = DATE('2023-11-29 15:19:15')
  AND (voucher_code IS NULL OR voucher_code = '')
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
    'Gary',
    'Hawkins',
    NULL,
    'aagaryh@gmail.com',
    '+447900276577',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Gary Hawkins' AND email = 'aagaryh@gmail.com' AND DATE(created_at) = DATE('2023-11-29 15:19:15')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
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
    'Gary',
    'Hawkins',
    NULL,
    'aagaryh@gmail.com',
    '+447900276577',
    NULL,
    0
FROM trip_booking.all_booking ab
WHERE name = 'Gary Hawkins' AND email = 'aagaryh@gmail.com' AND DATE(created_at) = DATE('2023-11-29 15:19:15')
  AND (
    SELECT COUNT(*) FROM trip_booking.passenger p 
    WHERE p.booking_id = ab.id
  ) < 2
LIMIT 1;

