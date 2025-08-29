-- Migration to add experience_types column to add_to_booking_items table
-- This script handles MySQL version compatibility issues
USE flyawayballooning;

-- Add experience_types column
SET @experience_types_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'add_to_booking_items' AND column_name = 'experience_types');
SET @sql_experience_types = IF(@experience_types_exists = 0, 'ALTER TABLE add_to_booking_items ADD COLUMN experience_types JSON DEFAULT NULL COMMENT "JSON array of applicable experience types (e.g., [\"Shared Flight\", \"Private Charter\"])"', 'SELECT "Column experience_types already exists" as message');
PREPARE stmt_experience_types FROM @sql_experience_types; 
EXECUTE stmt_experience_types; 
DEALLOCATE PREPARE stmt_experience_types;

-- Set default values for existing items
UPDATE add_to_booking_items SET experience_types = '["Shared Flight", "Private Charter"]' WHERE experience_types IS NULL;

SELECT 'Migration completed successfully' as status;
DESCRIBE add_to_booking_items; 