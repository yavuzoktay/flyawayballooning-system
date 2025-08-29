# Experience Types Migration for Add to Booking Items

## Overview
This migration adds the `experience_types` JSON column to the `add_to_booking_items` table to enable filtering items based on flight experience types (Shared Flight, Private Charter).

## Files
- `add_experience_types_to_add_to_booking_items.sql` - Main migration script
- `database_migration.sql` - Complete database schema (includes experience_types)

## How to Run the Migration

### Option 1: Using MySQL Command Line
```bash
cd flyawayballooning-system/server
mysql -u [username] -p [database_name] < add_experience_types_to_add_to_booking_items.sql
```

### Option 2: Using MySQL Workbench or phpMyAdmin
Copy and paste the contents of `add_experience_types_to_add_to_booking_items.sql` into your MySQL client.

### Option 3: Manual SQL Commands
```sql
USE flyawayballooning;

-- Add experience_types column
ALTER TABLE add_to_booking_items ADD COLUMN experience_types JSON DEFAULT NULL COMMENT "JSON array of applicable experience types (e.g., [\"Shared Flight\", \"Private Charter\"])";

-- Set default values for existing items
UPDATE add_to_booking_items SET experience_types = '["Shared Flight", "Private Charter"]' WHERE experience_types IS NULL;
```

## What This Migration Does

1. **Adds `experience_types` column**: A JSON column that stores an array of applicable experience types
2. **Sets default values**: Existing items get `["Shared Flight", "Private Charter"]` as default
3. **Enables filtering**: Items can now be filtered based on:
   - Journey Type (Book Flight, Flight Voucher, etc.)
   - Location (Bath, Devon, Somerset, Bristol Fiesta)
   - Experience Type (Shared Flight, Private Charter)

## Expected Values

The `experience_types` column should contain JSON arrays with these possible values:
- `["Shared Flight"]` - Only for shared flight experiences
- `["Private Charter"]` - Only for private charter experiences  
- `["Shared Flight", "Private Charter"]` - For both types
- `null` - Applies to all experience types (fallback)

## Verification

After running the migration, verify it worked:
```sql
DESCRIBE add_to_booking_items;
SELECT id, title, experience_types FROM add_to_booking_items LIMIT 5;
```

## Frontend Integration

The frontend (`AddOnsSection.jsx`) now includes filtering logic that:
1. Checks if the current journey type matches the item's `journey_types`
2. Checks if the selected location matches the item's `locations`
3. Checks if the selected flight type matches the item's `experience_types`

## Troubleshooting

### Column Already Exists Error
If you get "Column experience_types already exists", the migration has already been run.

### JSON Parse Errors
Ensure your MySQL version supports JSON columns (MySQL 5.7+).

### Default Values Not Set
If existing items don't get default values, run:
```sql
UPDATE add_to_booking_items SET experience_types = '["Shared Flight", "Private Charter"]' WHERE experience_types IS NULL;
```

## Testing

Use the test file `flyawayballooning-book/test-filtering.html` to verify the filtering logic works correctly with different combinations of journey types, locations, and experience types. 