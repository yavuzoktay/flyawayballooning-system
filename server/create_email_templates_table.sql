-- Create email_templates table for storing email message templates
CREATE TABLE IF NOT EXISTS email_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    category VARCHAR(100) DEFAULT 'User Defined Message',
    sms_enabled TINYINT(1) DEFAULT 0,
    edited TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default templates
INSERT INTO email_templates (name, subject, category, sms_enabled, edited) VALUES
('To Be Updated', 'Flight update', 'User Defined Message', 0, 0),
('Booking Confirmation', 'Your flight', 'Confirmation', 1, 0),
('Booking Rescheduled', 'Your flight is rescheduled', 'Rebooked', 1, 0),
('Follow up', 'Thank you', 'Event Followup', 1, 0),
('Gift Card Confirmation', 'Your Gift Card', 'Confirmation', 0, 0),
('Passenger Rescheduling Information', 'Reschedule your flight', 'Cancellation', 1, 0),
('Refund was Processed', 'Your refund from Company Name', 'Refund', 1, 0),
('Request for Payment/Deposit', 'Payment required - Experience Name', 'Payment Request', 1, 0),
('Review Survey', 'Share Your Thoughts!', 'User Defined Message', 0, 0),
('Upcoming Flight Reminder', 'Your upcoming flight', 'Event Reminder', 1, 0),
('A/C Be Part of an Adventure that So Many Love', 'Be Part of an Adventure that So Many Love', 'Abandon Cart', 0, 0),
('A/Cart - Still Thinking it Over?', 'Your Hot Air Balloon Flight is Almost Ready to Take Off!', 'Abandon Cart', 0, 0)
ON DUPLICATE KEY UPDATE name = VALUES(name);

