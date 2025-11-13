USE flyawayballooning;
SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'all_booking'
    AND column_name = 'weather_refund_total_price'
);
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE all_booking ADD COLUMN weather_refund_total_price DECIMAL(10, 2) DEFAULT 0.00 COMMENT "Total price of weather refundable options for all passengers (e.g., £47.50 per passenger)"',
    'SELECT "Column weather_refund_total_price already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SELECT 'Migration completed successfully' as status;
DESCRIBE all_booking;

