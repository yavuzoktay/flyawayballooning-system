USE flyawayballooning;
SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'all_booking'
    AND column_name = 'current_total_price'
);
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE all_booking ADD COLUMN current_total_price DECIMAL(10, 2) DEFAULT NULL COMMENT "Current total price based on current passenger count for Private Charter bookings"',
    'SELECT "Column current_total_price already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SELECT 'Migration completed successfully' as status;
DESCRIBE all_booking;

