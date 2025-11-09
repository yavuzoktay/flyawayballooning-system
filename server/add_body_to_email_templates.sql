-- Add body column to email_templates table
-- Note: If column already exists, this will error but it's safe to ignore
ALTER TABLE email_templates ADD COLUMN body TEXT AFTER subject;

-- Update existing templates with empty body
UPDATE email_templates SET body = '' WHERE body IS NULL;

