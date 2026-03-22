-- Season Saver feature: Add columns to all_booking, all_vouchers, and activity tables

-- Add season_saver flag to all_booking table
ALTER TABLE all_booking ADD COLUMN IF NOT EXISTS season_saver TINYINT(1) DEFAULT 0;

-- Add season_saver flag to all_vouchers table
ALTER TABLE all_vouchers ADD COLUMN IF NOT EXISTS season_saver TINYINT(1) DEFAULT 0;

-- Add season_saver_price and season_saver_enabled to activity table
ALTER TABLE activity ADD COLUMN IF NOT EXISTS season_saver_price DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE activity ADD COLUMN IF NOT EXISTS season_saver_enabled TINYINT(1) DEFAULT 0;
