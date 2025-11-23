-- Migration script to add Payment History functionality
-- This script creates the payment_history table and adds stripe_session_id column to all_booking table

USE trip_booking;

-- ============================================
-- 1. Create payment_history table
-- ============================================
CREATE TABLE IF NOT EXISTS payment_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL COMMENT 'Reference to the booking',
    stripe_session_id VARCHAR(255) COMMENT 'Stripe Checkout Session ID',
    stripe_charge_id VARCHAR(255) COMMENT 'Stripe Charge ID',
    stripe_payment_intent_id VARCHAR(255) COMMENT 'Stripe Payment Intent ID',
    amount DECIMAL(10,2) NOT NULL COMMENT 'Payment amount',
    currency VARCHAR(10) DEFAULT 'GBP' COMMENT 'Currency code',
    card_last4 VARCHAR(4) COMMENT 'Last 4 digits of card',
    card_brand VARCHAR(50) COMMENT 'Card brand (visa, mastercard, amex, etc.)',
    wallet_type VARCHAR(50) COMMENT 'Wallet type (Apple Pay, Google Pay, etc.)',
    transaction_id VARCHAR(255) COMMENT 'Stripe transaction ID',
    payout_id VARCHAR(255) COMMENT 'Stripe payout ID',
    payment_status VARCHAR(50) DEFAULT 'pending' COMMENT 'Payment status (succeeded, pending, failed, refunded)',
    fingerprint VARCHAR(255) COMMENT 'Payment method fingerprint',
    origin VARCHAR(10) COMMENT 'Country origin code',
    card_present TINYINT(1) DEFAULT 0 COMMENT 'Whether card was present',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Payment creation timestamp',
    arriving_on DATE COMMENT 'Payout arrival date',
    INDEX idx_booking_id (booking_id),
    INDEX idx_stripe_session_id (stripe_session_id),
    INDEX idx_stripe_charge_id (stripe_charge_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. Add stripe_session_id column to all_booking table
-- ============================================
-- Check if column exists first
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'all_booking' 
    AND column_name = 'stripe_session_id'
);

-- Add the column only if it doesn't exist
SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE all_booking ADD COLUMN stripe_session_id VARCHAR(255) DEFAULT NULL COMMENT ''Stripe Checkout Session ID for payment tracking''',
    'SELECT ''Column stripe_session_id already exists'' as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- Verification
-- ============================================
SELECT 'Migration completed successfully' as status;

-- Verify payment_history table structure
DESCRIBE payment_history;

-- Verify stripe_session_id column in all_booking
SHOW COLUMNS FROM all_booking LIKE 'stripe_session_id';

