-- Migration to add locations and experience_types columns to additional_information_questions table
-- This script handles MySQL version compatibility issues
USE flyawayballooning;

-- Add locations column
SET @locations_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'additional_information_questions' AND column_name = 'locations');
SET @sql_locations = IF(@locations_exists = 0, 'ALTER TABLE additional_information_questions ADD COLUMN locations JSON DEFAULT NULL COMMENT "JSON array of applicable locations (e.g., [\"Bath\", \"Devon\", \"Somerset\", \"Bristol Fiesta\"])"', 'SELECT "Column locations already exists" as message');
PREPARE stmt_locations FROM @sql_locations; EXECUTE stmt_locations; DEALLOCATE PREPARE stmt_locations;

-- Add experience_types column
SET @experience_types_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'additional_information_questions' AND column_name = 'experience_types');
SET @sql_experience_types = IF(@experience_types_exists = 0, 'ALTER TABLE additional_information_questions ADD COLUMN experience_types JSON DEFAULT NULL COMMENT "JSON array of applicable experience types (e.g., [\"Shared Flight\", \"Private Charter\"])"', 'SELECT "Column experience_types already exists" as message');
PREPARE stmt_experience_types FROM @sql_experience_types; EXECUTE stmt_experience_types; DEALLOCATE PREPARE stmt_experience_types;

-- Set default values for existing questions
UPDATE additional_information_questions SET locations = '["Bath", "Devon", "Somerset", "Bristol Fiesta"]' WHERE locations IS NULL;
UPDATE additional_information_questions SET experience_types = '["Shared Flight", "Private Charter"]' WHERE experience_types IS NULL;

SELECT 'Migration completed successfully' as status;
DESCRIBE additional_information_questions; 