# Deploy Instructions: Add-On Price Separation Fix

## Problem
- Add-on items (like FAB Cap £20) were being included in passenger pricing calculations
- When adding a guest to Private Charter bookings, the due amount was incorrectly calculated
- Example: £920 total (£900 base + £20 Add-on) was used instead of £900 base for calculations

## Solution
- Added `add_to_booking_items_total_price` column to `all_booking` table
- Updated `/api/addPassenger` and `/api/deletePassenger` to exclude Add-on price from passenger pricing
- Updated `/api/getAllBookingData` to return Add-on items with full details and total price

## Deployment Steps

### 1. SSH into EC2 Instance
```bash
ssh -i "your-key.pem" ubuntu@your-ec2-instance.com
```

### 2. Navigate to Project Directory
```bash
cd /path/to/flyawayballooning-system/server
```

### 3. Run Database Migration
```bash
mysql -u your_username -p trip_booking < add_add_to_booking_items_price_to_all_booking.sql
```

**Or run directly in MySQL:**
```sql
USE trip_booking;

-- Check if the column already exists
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'all_booking' 
    AND column_name = 'add_to_booking_items_total_price'
);

-- Add the column only if it doesn't exist
SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE all_booking ADD COLUMN add_to_booking_items_total_price DECIMAL(10, 2) DEFAULT 0.00 COMMENT "Total price of selected add-to-booking items (e.g., FAB Cap)"',
    'SELECT "Column add_to_booking_items_total_price already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify
DESCRIBE all_booking;
```

### 4. Pull Latest Code
```bash
git pull origin main
```

### 5. Install Dependencies (if needed)
```bash
npm install
```

### 6. Restart Backend Server
```bash
pm2 restart all
# or
pm2 restart flyawayballooning-system
```

### 7. Verify Deployment
```bash
pm2 logs
# Check for any errors

# Test the API
curl http://localhost:3002/api/getAllBookingData
```

## Verification

### 1. Check Database Column
```sql
SELECT 
    id, 
    name, 
    paid, 
    due, 
    pax, 
    choose_add_on,
    add_to_booking_items_total_price,
    experience
FROM all_booking 
WHERE choose_add_on IS NOT NULL 
LIMIT 5;
```

### 2. Test Add Guest
1. Go to Booking or Manifest page
2. Open a Private Charter booking with an Add-on (e.g., FAB Cap)
3. Click "Add Guest"
4. Verify:
   - Due amount is calculated correctly based on activity pricing
   - Add-on price is NOT included in passenger calculation
   - Total Paid remains the same (includes Add-on)

### 3. Test getAllBookingData API
- Check response includes:
  - `add_to_booking_items`: array with full item details
  - `add_to_booking_items_total_price`: total price of Add-ons

## Rollback (if needed)

### Remove the column:
```sql
ALTER TABLE all_booking DROP COLUMN add_to_booking_items_total_price;
```

### Revert code:
```bash
git reset --hard 526ff5a4  # Previous commit
pm2 restart all
```

## Expected Results

### Before Fix:
```
Booking: 2 pax Private Charter
Base Price: £900
Add-on (FAB Cap): £20
Total Paid: £920
Due: £0

Add 3rd passenger:
Activity Price (3 pax): £1050
New Due: £1050 - £920 = £130 ❌ (Incorrect)
```

### After Fix:
```
Booking: 2 pax Private Charter
Base Price: £900
Add-on (FAB Cap): £20
Total Paid: £920 (includes Add-on)
Base Paid: £900 (excludes Add-on)
Due: £0

Add 3rd passenger:
Activity Price (3 pax): £1050
New Due: £1050 - £900 = £150 ✅ (Correct)
```

## Notes
- The `add_to_booking_items_total_price` column defaults to 0.00 for existing bookings
- For bookings with Add-ons but no stored price, the price will be fetched from `add_to_booking_items` table dynamically
- This fix applies to both `/api/addPassenger` and `/api/deletePassenger` endpoints
- The `getAllBookingData` endpoint now returns full Add-on item details, not just the title

## Support
If you encounter any issues:
1. Check PM2 logs: `pm2 logs`
2. Check MySQL error logs
3. Verify the column was added: `DESCRIBE all_booking;`
4. Test API endpoints manually with Postman or curl

