# Google Calendar Integration Setup

This document explains how to set up Google Calendar integration for the booking system.

## Prerequisites

1. A Google Cloud Project with the Google Calendar API enabled
2. A service account with Calendar API access
3. A Google Calendar to sync events to

## Setup Steps

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Create a Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details
4. Click "Create and Continue"
5. Skip role assignment (or assign minimal roles)
6. Click "Done"

### 3. Create and Download Service Account Key

1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" format
5. Download the JSON file

### 4. Share Calendar with Service Account

1. Open Google Calendar
2. Find the calendar you want to sync to (or create a new one)
3. Click on the calendar settings (three dots next to calendar name)
4. Go to "Share with specific people"
5. Add the service account email (found in the JSON file as `client_email`)
6. Give it "Make changes to events" permission
7. Click "Send"

### 5. Configure Environment Variables

Add the following environment variables to your `.env` file:

```env
# Google Calendar API Credentials
GOOGLE_CLIENT_EMAIL=your-service-account-email@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com

# Optional: Booking System URL (for event source)
BOOKING_SYSTEM_URL=https://flyawayballooning-system.com
```

**Important Notes:**
- `GOOGLE_PRIVATE_KEY` should include the full private key with `\n` characters preserved
- `GOOGLE_CALENDAR_ID` can be:
  - The calendar ID (found in calendar settings under "Integrate calendar")
  - Or use `primary` to use the primary calendar of the service account

### 6. Run Database Migration

Run the SQL migration to add the `google_calendar_event_id` column:

```sql
-- Run this SQL in your database
ALTER TABLE all_booking 
ADD COLUMN google_calendar_event_id VARCHAR(255) DEFAULT NULL 
COMMENT 'Google Calendar event ID for this booking';

CREATE INDEX idx_google_calendar_event_id ON all_booking(google_calendar_event_id);
```

Or run the migration file:
```bash
mysql -u your_user -p your_database < add_google_calendar_event_id_to_bookings.sql
```

### 7. Install Dependencies

Make sure `googleapis` package is installed:

```bash
cd server
npm install googleapis
```

## How It Works

### Event Creation
- Events are automatically created when a flight is scheduled:
  - Private flights: Event created immediately when booking is made
  - Shared flights: Event created when the first booking is made for a flight slot

### Event Title Format
`[Location] – [Private/Shared] – x [Count]`

Example: `Bath – Shared – x 4`

### Event Description
- Total number of passengers
- Assigned crew member (if assigned)
- Booking ID for reference

### Event Updates
Events are automatically updated when:
- Passenger count changes (new booking added/cancelled)
- Crew member is assigned/changed
- Flight is cancelled (event is deleted)

### One-Way Sync
- Changes in the booking system → Google Calendar ✅
- Changes in Google Calendar → Booking system ❌ (ignored)

## Troubleshooting

### Events Not Being Created
1. Check that environment variables are set correctly
2. Verify service account has access to the calendar
3. Check server logs for Google Calendar API errors
4. Ensure the calendar ID is correct

### Permission Errors
- Make sure the service account email has "Make changes to events" permission on the calendar
- Verify the service account key is valid and not expired

### Event Not Found Errors
- This is normal if an event was manually deleted from Google Calendar
- The system will continue to work, but won't update that specific event

## Testing

To test the integration:

1. Create a new booking with a scheduled flight date
2. Check Google Calendar for the new event
3. Assign a crew member and verify the event description updates
4. Cancel the booking and verify the event is deleted (for private flights) or updated (for shared flights)

