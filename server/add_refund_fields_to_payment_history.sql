-- Migration script to add refund-related fields to payment_history table
-- This script adds fields to track refund comments and original payment references

USE trip_booking;

-- ============================================
-- Add refund-related columns to payment_history table
-- ============================================

-- Add column to store refund comment/notes
ALTER TABLE payment_history 
ADD COLUMN refund_comment TEXT COMMENT 'Comment/notes explaining why the refund was issued' AFTER origin;

-- Add column to store reference to the original payment that was refunded
ALTER TABLE payment_history 
ADD COLUMN refunded_payment_id INT COMMENT 'Reference to the original payment_history.id that was refunded' AFTER refund_comment;

-- Add index for refunded_payment_id for faster lookups
ALTER TABLE payment_history 
ADD INDEX idx_refunded_payment_id (refunded_payment_id);

-- Add index for payment_status to improve refund queries
ALTER TABLE payment_history 
ADD INDEX idx_payment_status_origin (payment_status, origin);

