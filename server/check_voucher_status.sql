-- Check voucher status across all tables
SELECT 'voucher_codes' as source, code, is_active, current_uses, max_uses, paid_amount
FROM voucher_codes 
WHERE UPPER(code) = 'BAT25USN'
UNION ALL
SELECT 'all_vouchers' as source, voucher_ref as code, 
       CASE WHEN redeemed = 'Yes' THEN 0 ELSE 1 END as is_active, 
       0 as current_uses, 0 as max_uses, 0 as paid_amount
FROM all_vouchers 
WHERE UPPER(voucher_ref) = 'BAT25USN'
UNION ALL
SELECT 'all_booking' as source, voucher_code as code, 
       CASE WHEN redeemed_voucher = 'Yes' THEN 0 ELSE 1 END as is_active,
       0 as current_uses, 0 as max_uses, paid as paid_amount
FROM all_booking 
WHERE UPPER(voucher_code) = 'BAT25USN';
