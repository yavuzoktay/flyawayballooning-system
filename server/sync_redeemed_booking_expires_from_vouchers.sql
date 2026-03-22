-- Sync all_booking.expires for redeemed voucher bookings from all_vouchers (purchase expiry).
-- Prefer v.expires when set; otherwise DATE_ADD(v.created_at, ...) by experience / voucher type.
--
-- Run against your DB (adjust schema name if needed), e.g.:
--   mysql -u USER -p DATABASE < sync_redeemed_booking_expires_from_vouchers.sql
--
-- Preview first:
--   (same JOIN/WHERE as below) SELECT b.id, b.voucher_code, b.expires, v.expires AS v_expires, ...

UPDATE all_booking b
INNER JOIN all_vouchers v
    ON b.voucher_code IS NOT NULL AND TRIM(b.voucher_code) <> ''
    AND NOT (b.voucher_code REGEXP '^[0-9]+$' AND CAST(b.voucher_code AS UNSIGNED) = b.id)
    AND (
        UPPER(TRIM(b.voucher_code)) = UPPER(TRIM(COALESCE(v.voucher_ref, '')))
        OR UPPER(TRIM(b.voucher_code)) = UPPER(TRIM(COALESCE(v.voucher_code, '')))
    )
SET b.expires = (
    CASE
        WHEN v.expires IS NOT NULL
            AND CAST(v.expires AS CHAR(19)) NOT IN ('0000-00-00 00:00:00', '0000-00-00')
            AND v.expires > '1970-01-02'
        THEN v.expires
        WHEN v.experience_type = 'Private Charter' THEN DATE_ADD(v.created_at, INTERVAL 18 MONTH)
        WHEN v.experience_type = 'Shared Flight'
            AND COALESCE(NULLIF(TRIM(v.voucher_type), ''), NULLIF(TRIM(v.voucher_type_detail), '')) = 'Any Day Flight'
            THEN DATE_ADD(v.created_at, INTERVAL 24 MONTH)
        WHEN v.experience_type = 'Shared Flight' THEN DATE_ADD(v.created_at, INTERVAL 18 MONTH)
        ELSE DATE_ADD(v.created_at, INTERVAL 24 MONTH)
    END
)
WHERE
    (b.redeemed_voucher = 'Yes' OR b.redeemed_voucher = 1 OR b.flight_type_source = 'Redeem Voucher')
    AND v.created_at IS NOT NULL;
