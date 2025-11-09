# Email Templates Installation Guide

## Database Setup

If you're getting a 500 error when creating email templates, you need to add the `body` column to the `email_templates` table.

### Option 1: Run SQL Migration File

```bash
mysql -u your_username -p your_database_name < server/add_body_to_email_templates.sql
```

### Option 2: Run SQL Directly

Connect to your MySQL database and run:

```sql
-- Add body column to email_templates table if it doesn't exist
ALTER TABLE email_templates ADD COLUMN body TEXT AFTER subject;

-- Update existing templates with empty body
UPDATE email_templates SET body = '' WHERE body IS NULL;
```

### Option 3: If table doesn't exist, create it

```sql
-- Create email_templates table (complete version with body field)
CREATE TABLE IF NOT EXISTS email_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT,
    category VARCHAR(100) DEFAULT 'User Defined Message',
    sms_enabled TINYINT(1) DEFAULT 0,
    edited TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Verification

After running the migration, verify the column exists:

```sql
DESCRIBE email_templates;
```

You should see:
- id
- name
- subject
- **body** ← This should be present
- category
- sms_enabled
- edited
- created_at
- updated_at

## Usage

Once the database is updated, restart your server and you'll be able to:
1. Create new email templates with full body content
2. Edit templates in real-time preview
3. Templates will be saved and listed in Settings > Email Templates

