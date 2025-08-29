-- Migration to add additional_information_json column to all_booking table
-- This script handles MySQL version compatibility issues

-- Check if the column already exists
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'all_booking' 
    AND column_name = 'additional_information_json'
);

-- Add the column only if it doesn't exist
SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE all_booking ADD COLUMN additional_information_json JSON DEFAULT NULL COMMENT "JSON object containing additional information answers"',
    'SELECT "Column additional_information_json already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create the additional_information_answers table if it doesn't exist
CREATE TABLE IF NOT EXISTS additional_information_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL COMMENT 'Reference to the booking',
    question_id INT NOT NULL COMMENT 'Reference to the additional_information_questions table',
    answer TEXT COMMENT 'The answer provided by the user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_booking_id (booking_id),
    INDEX idx_question_id (question_id),
    INDEX idx_booking_question (booking_id, question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores answers to additional information questions for bookings';

-- Add foreign key constraints if they don't exist (check first)
SET @fk_booking_exists = (
    SELECT COUNT(*) 
    FROM information_schema.key_column_usage 
    WHERE table_schema = DATABASE() 
    AND table_name = 'additional_information_answers' 
    AND constraint_name = 'fk_booking_id'
);

SET @fk_question_exists = (
    SELECT COUNT(*) 
    FROM information_schema.key_column_usage 
    WHERE table_schema = DATABASE() 
    AND table_name = 'additional_information_answers' 
    AND constraint_name = 'fk_question_id'
);

-- Add foreign key for booking_id if it doesn't exist
SET @sql_booking_fk = IF(@fk_booking_exists = 0, 
    'ALTER TABLE additional_information_answers ADD CONSTRAINT fk_booking_id FOREIGN KEY (booking_id) REFERENCES all_booking(id) ON DELETE CASCADE',
    'SELECT "Foreign key fk_booking_id already exists" as message'
);

PREPARE stmt FROM @sql_booking_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key for question_id if it doesn't exist
SET @sql_question_fk = IF(@fk_question_exists = 0, 
    'ALTER TABLE additional_information_answers ADD CONSTRAINT fk_question_id FOREIGN KEY (question_id) REFERENCES additional_information_questions(id) ON DELETE CASCADE',
    'SELECT "Foreign key fk_question_id already exists" as message'
);

PREPARE stmt FROM @sql_question_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show the results
SELECT 'Migration completed successfully' as status; 