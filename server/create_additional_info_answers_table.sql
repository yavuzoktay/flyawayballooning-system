-- Migration to create additional_information_answers table
-- This table stores the answers to additional information questions for each booking

CREATE TABLE IF NOT EXISTS additional_information_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL COMMENT 'Reference to the booking',
    question_id INT NOT NULL COMMENT 'Reference to the additional_information_questions table',
    answer TEXT COMMENT 'The answer provided by the user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_booking_id (booking_id),
    INDEX idx_question_id (question_id),
    INDEX idx_booking_question (booking_id, question_id),
    
    FOREIGN KEY (booking_id) REFERENCES all_booking(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES additional_information_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores answers to additional information questions for bookings';

-- Add a column to all_booking table to store additional information as JSON for backward compatibility
ALTER TABLE all_booking ADD COLUMN IF NOT EXISTS additional_information_json JSON DEFAULT NULL COMMENT 'JSON object containing additional information answers'; 