# Google Ads Conversion Tracking Setup

This document outlines the steps to set up server-side Google Ads conversion tracking via Stripe webhooks.

## Overview

The system implements server-side Google Ads conversion tracking to ensure all successful payments are tracked as conversions, even if frontend tracking fails due to ad blockers or browser restrictions.

**Flow:**
1. User lands on site → gclid/wbraid/gbraid captured from URL
2. User completes payment → gclid stored in Stripe checkout metadata
3. Stripe webhook fires → Backend sends conversion to Google Ads API

## Prerequisites

1. **Google Ads Account:** You need an active Google Ads account
2. **Google Cloud Project:** Create or use an existing Google Cloud Project
3. **Google Ads API Access:** Enable the Google Ads API in your Google Cloud Project
4. **Conversion Action:** Create a conversion action in Google Ads (if not already created)

## Setup Steps

### 1. Enable Google Ads API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to "APIs & Services" > "Library"
4. Search for "Google Ads API" and enable it

### 2. Create OAuth 2.0 Credentials

1. In Google Cloud Console, go to "APIs & Services" > "Credentials"
2. Click "CREATE CREDENTIALS" > "OAuth client ID"
3. Choose "Web application" as the application type
4. Add authorized redirect URIs (if needed for OAuth flow)
5. Save the **Client ID** and **Client Secret**

### 3. Get Developer Token

**⚠️ Important:** API Center is only available to **Manager Accounts**. This is a Google requirement, not related to your admin permissions.

**Key Difference:**
- **Admin Access:** Allows you to manage campaigns, settings, and users within a Google Ads account
- **Manager Account:** A special account type that can manage multiple Google Ads accounts and has access to API Center

**Even if you have Admin access, you still need a Manager Account to access API Center.** This is Google's policy - API Center is exclusively available in Manager Accounts, regardless of your permission level in regular accounts.

#### Option A: Create a Manager Account (Recommended)

**Step 1: Create Manager Account**

1. Go directly to: https://ads.google.com/aw/manageraccounts
   - Or: In Google Ads, click on your account selector (top right, shows your account name/Customer ID)
   - Look for **"Create manager account"** option in the dropdown
2. Click **"Create a manager account"** button
3. Fill out the form:
   - **Account name:** e.g., "Fly Away Ballooning Manager Account"
   - **Country/Region:** Select your country (e.g., United Kingdom)
   - **Currency:** Select your currency (e.g., GBP)
   - **Time zone:** Select your time zone (e.g., (GMT+00:00) United Kingdom Time)
4. Click **"Submit"** or **"Create"**
5. Wait for the Manager Account to be created (usually instant)

**Step 2: Switch to Manager Account**

1. After creation, you'll be automatically switched to the Manager Account
2. You can also switch manually:
   - Click on the account selector (top right)
   - Select your Manager Account from the list

**Step 3: Link Your Existing Account**

1. In your Manager Account, you should see a different interface
2. Go to **"Accounts"** in the left menu (or look for "My accounts" / "Linked accounts")
3. Click **"Link existing account"** or **"+"** button
4. Enter your existing account's Customer ID: **486-924-1209**
5. Click **"Send request"** or **"Request access"**
6. **Important:** Switch back to your original account (486-924-1209) and approve the link request
7. Once linked, switch back to Manager Account to access API Center

#### Option B: Use Existing Manager Account

If you already have a Manager Account:
1. Switch to your Manager Account in Google Ads
2. Go to **"Tools & Settings"** > **"Setup"** > **"API Center"**

#### After Manager Account is Set Up:

**Step 1: Access API Center**

1. Make sure you're in your **Manager Account** (not the regular account)
   - Check the account selector at top right - it should show your Manager Account name
2. In Manager Account, click **"Tools & Settings"** icon (wrench/spanner icon) in top right
3. In the left sidebar, you should now see **"Setup"** section (this only appears in Manager Accounts)
4. Click on **"Setup"** to expand it
5. Click on **"API Center"**
   - Or go directly to: https://ads.google.com/aw/apicenter (only works if you're in Manager Account)

**Step 2: Request Developer Token**

1. In the API Center page, find the **"Developer Token"** section
2. Click **"Request Developer Token"** or **"Apply for Developer Token"** button
3. Fill out the application form:
   - **Company name:** Fly Away Ballooning
   - **Website URL:** Your website URL
   - **Use case description:** "Server-side conversion tracking for e-commerce bookings via Stripe webhooks"
   - **Contact information:** Your contact details
4. Click **"Submit"** or **"Send request"**
5. Wait for approval (can take 1-3 business days)
6. Once approved, the Developer Token will appear in the API Center
7. Copy the **Developer Token** (keep it secure)

**Note:** 
- While waiting for approval, you can still test the integration in test mode
- The developer token is required for production use
- Manager Accounts are free to create and use
- You can manage multiple Google Ads accounts from one Manager Account

### 4. Get Refresh Token

You need to obtain a refresh token using OAuth 2.0. This typically involves:

1. Using the OAuth 2.0 Playground or a script to authenticate
2. Granting access to your Google Ads account
3. Exchanging the authorization code for access and refresh tokens

**Quick method using OAuth 2.0 Playground:**
1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) and check "Use your own OAuth credentials"
3. Enter your Client ID and Client Secret
4. In "Step 1", select "Google Ads API" scope: `https://www.googleapis.com/auth/adwords`
5. Click "Authorize APIs" and complete the OAuth flow
6. In "Step 2", click "Exchange authorization code for tokens"
7. Copy the **Refresh Token**

### 5. Get Conversion Action ID

1. In Google Ads, go to "Tools & Settings" > "Conversions"
2. Find or create your conversion action
3. Click on the conversion action to view details
4. The **Conversion Action ID** is shown in the URL or details (e.g., `123456789`)
5. The **Conversion Label** is also shown (e.g., `abc123`)

### 6. Get Customer ID

1. In Google Ads, go to "Tools & Settings" > "Account Settings"
2. Your **Customer ID** is shown at the top (format: `123-456-7890`)

### 7. Configure Environment Variables

Add the following to your `.env` file in the `server` directory:

```dotenv
# Google Ads API Configuration
GOOGLE_ADS_CUSTOMER_ID="123-456-7890"
GOOGLE_ADS_CONVERSION_ID="123456789"
GOOGLE_ADS_CONVERSION_LABEL="abc123"
GOOGLE_ADS_DEVELOPER_TOKEN="your-developer-token"
GOOGLE_ADS_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_ADS_CLIENT_SECRET="your-client-secret"
GOOGLE_ADS_REFRESH_TOKEN="your-refresh-token"
```

**Note:** The conversion label is stored but not currently used in the API call (the conversion action ID is used instead). Keep it for reference.

## How It Works

### Frontend (gclid Capture)

1. When a user lands on the site with `?gclid=...` in the URL, the frontend captures it
2. The gclid is stored in localStorage (valid for 30 days)
3. When creating a Stripe checkout session, the gclid is included in `userSessionData`
4. The gclid is passed to the backend and stored in Stripe checkout metadata

### Backend (Conversion Tracking)

1. When Stripe sends a `checkout.session.completed` webhook:
   - The webhook verifies the payment was successful
   - Extracts gclid/wbraid/gbraid from session metadata
   - Extracts transaction value and currency
   - Sends conversion to Google Ads Conversion API
   - Uses payment intent ID or session ID as transaction ID (for deduplication)

### Duplicate Prevention

- Google Ads automatically deduplicates conversions based on `orderId` (transaction ID)
- The same transaction ID will not create duplicate conversions
- Webhook retries are safe - if a conversion was already sent, Google Ads will ignore duplicates

### Test vs Production

- Test payments (transaction IDs starting with `test_`) are automatically skipped in production
- In development, test payments can still send conversions (for testing purposes)

## Testing

### Test Conversion Tracking

1. Make a test payment using Stripe test mode
2. Check server logs for conversion tracking messages:
   - `✅ Google Ads conversion sent successfully` - Success
   - `⚠️ Google Ads conversion failed` - Check configuration
   - `⏭️ Skipping Google Ads conversion` - No gclid or test payment

### Verify in Google Ads

1. Go to "Tools & Settings" > "Conversions"
2. Click on your conversion action
3. View "Conversion history" to see tracked conversions
4. Conversions may take a few minutes to appear

## Troubleshooting

### Conversion Not Appearing

1. **Check Configuration:**
   - Verify all environment variables are set correctly
   - Ensure developer token is approved (not pending)
   - Check that OAuth credentials are valid

2. **Check Logs:**
   - Look for error messages in server logs
   - Check for "not_configured", "api_error", or other error reasons

3. **Verify gclid:**
   - Ensure gclid is being captured on the frontend
   - Check that gclid is in Stripe session metadata
   - Verify the gclid hasn't expired (30-day window)

4. **API Errors:**
   - Check Google Ads API status
   - Verify OAuth token is valid (refresh token may need to be regenerated)
   - Ensure conversion action ID is correct

### Common Errors

- **"not_configured"**: Missing environment variables
- **"api_error"**: Invalid credentials or API issue
- **"test_payment"**: Test payment in production (expected behavior)
- **"missing_transaction_id"**: Stripe session missing payment intent

## Security Notes

- Never commit `.env` file to version control
- Keep OAuth credentials and tokens secure
- Rotate refresh tokens periodically
- Use environment-specific credentials (dev/staging/prod)

## Additional Resources

- [Google Ads API Documentation](https://developers.google.com/google-ads/api/docs/start)
- [Conversion Tracking Guide](https://support.google.com/google-ads/answer/1722054)
- [Server-Side Conversion Tracking](https://developers.google.com/google-ads/api/docs/conversions/upload-conversions)


