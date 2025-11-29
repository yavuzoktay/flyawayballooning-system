-- Migration script to add voucher_type_detail column to all_vouchers and all_booking tables
-- This column stores the specific voucher type (Weekday Morning, Flexible Weekday, Any Day Flight, etc.)

USE trip_booking;

-- Add voucher_type_detail column to all_vouchers table if it doesn't exist
ALTER TABLE all_vouchers 
ADD COLUMN voucher_type_detail VARCHAR(255) NULL COMMENT 'Specific voucher type: Weekday Morning, Flexible Weekday, Any Day Flight, etc.' 
AFTER voucher_type;

-- Add index for voucher_type_detail in all_vouchers for faster queries
ALTER TABLE all_vouchers 
ADD INDEX idx_voucher_type_detail (voucher_type_detail);

-- Add voucher_type_detail column to all_booking table if it doesn't exist
ALTER TABLE all_booking 
ADD COLUMN voucher_type_detail VARCHAR(255) NULL COMMENT 'Specific voucher type: Weekday Morning, Flexible Weekday, Any Day Flight, etc.' 
AFTER voucher_type;

-- Add index for voucher_type_detail in all_booking for faster queries
ALTER TABLE all_booking 
ADD INDEX idx_voucher_type_detail (voucher_type_detail);

