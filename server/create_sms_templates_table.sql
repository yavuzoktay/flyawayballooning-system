-- Create sms_templates table for storing SMS message templates
CREATE TABLE IF NOT EXISTS sms_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'User Defined Message',
    edited TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default SMS templates
INSERT INTO sms_templates (name, message, category, edited) VALUES
('Booking Confirmation SMS', 'Hi [First Name], you have booked your lighter than air experience! We look forward to sharing the skies with you on this once in a lifetime adventure. We have sent you an email with your booking confirmation and some important details. Thank you, [Company Name] 🎈', 'Confirmation', 0),
('Booking Rescheduled SMS', 'Hi [First Name], your flight has been rescheduled. Please check your email for the new date and time. Thank you, [Company Name] 🎈', 'Rebooked', 0),
('Follow up SMS', 'Hi [First Name], so how was your flight? We would love to hear your feedback! Thank you, [Company Name] 🎈', 'Event Followup', 0),
('Passenger Rescheduling Information SMS', 'Hi [First Name], you can reschedule your flight by visiting [Customer Portal Link]. Thank you, [Company Name] 🎈', 'Cancellation', 0),
('Refund was Processed SMS', 'Hi [First Name], your refund from [Company Name] has been processed. Thank you, [Company Name] 🎈', 'Refund', 0),
('Upcoming Flight Reminder SMS', 'Hi [First Name], this is a reminder that your flight is coming up soon! Please check your email for details. Thank you, [Company Name] 🎈', 'Event Reminder', 0)
ON DUPLICATE KEY UPDATE name = VALUES(name);









