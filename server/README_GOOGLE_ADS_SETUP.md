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
4. **Add Authorized redirect URIs:**
   - Click **"+ Add URI"** under "Authorized redirect URIs"
   - Add: `https://developers.google.com/oauthplayground`
   - This is required for using OAuth 2.0 Playground to get refresh token
5. Click **"Create"**
6. Save the **Client ID** and **Client Secret** (you'll see them in a popup)

**⚠️ Important:** If you already created the OAuth client ID without the redirect URI, you need to edit it:
1. Go to "APIs & Services" > "Credentials"
2. Find your OAuth 2.0 Client ID (the one you created)
3. Click the **pencil icon (✏️)** to edit
4. Under "Authorized redirect URIs", click **"+ Add URI"**
5. Add: `https://developers.google.com/oauthplayground`
6. Click **"Save"**

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

   **Company type:**
   - Select **"Advertiser"** (You are using the API for your own business to track conversions)
   - ❌ Do NOT select "Independent Google Ads Developer" (this is for third-party software developers)
   - ❌ Do NOT select "Agency/SEM" (unless you manage campaigns for other clients)
   - ❌ Do NOT select "Affiliate" (unless you're an affiliate marketer)

   **Intended use:**
   - Enter a clear description, for example:
     ```
     Server-side conversion tracking for our e-commerce booking system. 
     We use the Google Ads API to send conversion data from our backend 
     (via Stripe webhooks) to ensure accurate conversion tracking even 
     when frontend tracking is blocked by ad blockers or browser restrictions.
     ```
   - Or shorter version:
     ```
     Server-side conversion tracking for booking system to track 
     completed payments via Stripe webhooks for accurate conversion measurement.
     ```

   **Other fields:**
   - **Company name:** Fly Away Ballooning
   - **Website URL:** Your website URL (e.g., https://flyawayballooning.com)
   - **Contact information:** Your contact details (email, phone)

4. Click **"Submit"** or **"Send request"**
5. Wait for approval (can take 1-3 business days)
6. Once approved, the Developer Token will appear in the API Center
7. Copy the **Developer Token** (keep it secure - you won't be able to view it again)

**Note:** 
- While waiting for approval, you can still test the integration in test mode
- The developer token is required for production use
- Manager Accounts are free to create and use
- You can manage multiple Google Ads accounts from one Manager Account

### 4. Get Refresh Token

You need to obtain a refresh token using OAuth 2.0 Playground. This allows your backend to authenticate with Google Ads API.

**⚠️ Before starting:** Make sure you've added `https://developers.google.com/oauthplayground` to your OAuth Client ID's "Authorized redirect URIs" in Google Cloud Console (see Step 2). If you get "Error 400: redirect_uri_mismatch", you need to add this redirect URI first.

**Step-by-step using OAuth 2.0 Playground:**

1. **Go to OAuth 2.0 Playground:**
   - Visit: https://developers.google.com/oauthplayground/

2. **Configure OAuth Credentials:**
   - Click the **gear icon (⚙️)** in the top right corner
   - Check the box **"Use your own OAuth credentials"**
   - Enter your **Client ID:** (from Step 2, format: `xxxxx.apps.googleusercontent.com`)
   - Enter your **Client Secret:** (from Step 2, format: `GOCSPX-xxxxx`)
   - Click **"Close"**

3. **Select Google Ads API Scope:**
   - In the left panel, scroll down to find **"AdWords API"** in the list
   - Or, in the **"Input your own scopes"** field at the bottom, enter:
     ```
     https://www.googleapis.com/auth/adwords
     ```
   - Click **"Authorize APIs"** button

4. **Authorize Access:**
   - You'll be redirected to Google's authorization page
   - Select the Google account that has access to your Google Ads account
   - Review the permissions and click **"Allow"** or **"Continue"**
   - You'll be redirected back to OAuth Playground

5. **Exchange Authorization Code for Tokens:**
   - After Step 1 completes, you'll see **"Step 2: Exchange authorization code for tokens"** section
   - The authorization code should already be filled in the input field (it looks like: `4/0ATX87...`)
   - Click the blue **"Exchange authorization code for tokens"** button
   - Wait a moment - you'll see a response appear in the right panel

6. **Copy the Refresh Token:**
   - After clicking the button, look at the **"Request / Response"** panel on the right
   - You'll see a JSON response with tokens
   - Find the **"refresh_token"** field in the response
   - Copy the entire refresh token value (it's a long string starting with `1//0g...` or similar)
   - **Important:** Save this token securely - you'll need it for your `.env` file
   - The refresh token will also appear in the **"Refresh token:"** input field on the left - you can copy it from there too

**Example response format:**
```json
{
  "access_token": "ya29.a0AfH6...",
  "expires_in": 3599,
  "refresh_token": "1//0g...",  ← Copy this value
  "scope": "https://www.googleapis.com/auth/adwords",
  "token_type": "Bearer"
}
```

**⚠️ Important Notes:**
- The refresh token is long-lived and doesn't expire (unless revoked)
- Keep it secure - never commit it to version control
- If you lose it, you'll need to repeat this process
- The refresh token allows your backend to get new access tokens automatically

### 5. Get Conversion Action ID

**Option A: Use Existing Conversion Action**

**Note:** GA4-sourced conversion actions (like "flyawayballooning.com - GA4 (web) checkout") may not show a Conversion Label because they're managed by Google Analytics. For server-side tracking, it's **recommended to create a new conversion action** (see Option B below).

If you want to use an existing conversion action:

1. In Google Ads, go to **"Goals"** > **"Conversions"** > **"Summary"**
2. In the conversion table, find a conversion action you want to use
3. **Click on the conversion action name** (it's a clickable link)
4. You'll be taken to the conversion action details page
5. **Find the Conversion Action ID:**
   - Look at the **URL** in your browser - it will contain `ctId=` parameter:
     ```
     https://ads.google.com/aw/conversions/detail?ctId=6603616530&...
     ```
     The number after `ctId=` is your **Conversion Action ID** (e.g., `6603616530`)
6. **Find the Conversion Label:**
   - **For GA4 conversions:** Conversion Label may not be visible because GA4 manages these automatically
   - **For website conversions:** Look for **"Conversion label"** or **"Label"** field in the details page
   - **If label is not visible:** You can still use the Conversion Action ID - the label is optional for server-side tracking
   - The label format is usually something like `abc123` or `xyz789`

**Option B: Create New Conversion Action (Recommended for Server-Side Tracking)**

**This is the recommended approach** for server-side conversion tracking, especially if you're using a new domain (`https://flyawayballooning-book.com/`).

1. In Google Ads, go to **"Goals"** > **"Conversions"** > **"Summary"**
2. Click the **blue "+" button** (or "New conversion action" button)
3. **Select data source:** Choose **"Website"**
   - ✅ **Website** - This is the correct choice for server-side conversion tracking
   - ❌ Do NOT select "Phone" (for call tracking)
   - ❌ Do NOT select other options (they're for different tracking methods)
   - **Why Website?** Server-side conversion tracking sends conversion data from your website's backend (via Stripe webhooks), so it's considered a website conversion

4. **If you see a list of existing websites (e.g., `www.flyawayballooning.com`):**

   **Option A: Use Existing Website (Recommended for Server-Side Tracking)**
   
   - ✅ **You can select the existing website** (`www.flyawayballooning.com`) even if payments are on `flyawayballooning-book.com`
   - **Why this works:** For server-side conversion tracking, the website URL in Google Ads is just for organization. The actual tracking happens via API using the Conversion Action ID, which works regardless of which website is selected.
   - The important part is getting the **Conversion Action ID**, not which website is linked
   - Select the existing website and continue

   **Option B: Add New Website (If you want separate tracking)**
   
   If you really need to add `https://flyawayballooning-book.com/` as a separate website:
   
   - Look for a **"+" button**, **"Add website"**, or **"Add new"** option in the website list
   - Or try clicking outside the modal and look for website management settings
   - **Alternative:** You may need to add the website in Google Tag Manager or Google Analytics first:
     1. Go to [Google Tag Manager](https://tagmanager.google.com/)
     2. Create a new container for `flyawayballooning-book.com`
     3. Or add it as a domain in your existing container
     4. Then it should appear in Google Ads conversion setup
   
   **Note:** Option A is simpler and works perfectly for server-side tracking. The website selection is just for organization - the actual conversion data is sent via API from your backend.

5. After selecting a website, you'll see **"Create a conversion"** options:

   **Select: "Manually with code"**
   - ✅ **"Manually with code"** - This is the correct choice for server-side conversion tracking
   - ❌ Do NOT select "Automatically without code" (this is for Google Tag's automatic detection)
   - **Why "Manually with code"?** 
     - Server-side tracking uses the Google Ads API, not frontend code
     - You'll get the Conversion Action ID which is what you need
     - You won't actually add code to your website - the backend sends conversions via API
     - This option gives you the Conversion Action ID and Label you need

6. After selecting "Manually with code", you'll see a form to fill out:
   - **Conversion action name:** "Booking Purchase" or "Server-Side Booking"
   - **Category:** "Purchase/Sale"
   - **Value:** Select **"Use different values for each conversion"** (important for tracking actual booking values)
   - **Count:** **"Every"** (to count all conversions, not just one per user)
   - **Click-through conversion window:** 30 days
   - **Attribution model:** "Data-driven" (recommended) or your preferred model
7. Click **"Create and continue"** or **"Done"**
8. After creation, you'll see a setup page with conversion tracking code

9. **Important: Get Conversion Action ID from URL**
   - Look at the **URL in your browser** - it should contain `ctId=` parameter
   - Example URL: `https://ads.google.com/aw/conversions/setup?ctId=1234567890&...`
   - The number after `ctId=` is your **Conversion Action ID** (e.g., `1234567890`)
   - **Note:** Conversion ID (shown on the page, e.g., `468929127`) is different from Conversion Action ID
   - You need the **Conversion Action ID** from the URL, not the Conversion ID shown on the page

10. **Copy the Conversion Label:**
    - On the setup page, you'll see a table with conversion labels
    - Look for **"Conversion label"** column in the table
    - Copy the label value (e.g., `4G8SCOaoqtsbEOeUzd8B`)
    - **Note:** The JavaScript code snippet shown is for frontend tracking - you don't need to add it since you're using server-side tracking

**What you need for `.env` file:**
- **Conversion Action ID:** From URL `ctId=` parameter (this is the most important)
- **Conversion Label:** From the table on the setup page (e.g., `4G8SCOaoqtsbEOeUzd8B`)
- **Conversion ID:** The number shown on the page (e.g., `468929127`) - this is your Google Ads account identifier, not the Conversion Action ID

**Note:** For server-side conversion tracking, you typically want a conversion action that:
- Counts "Every" conversion (not just "One")
- Uses "Purchase/Sale" category
- Has a 30-day conversion window

### 6. Get Customer ID

1. In Google Ads, go to "Tools & Settings" > "Account Settings"
2. Your **Customer ID** is shown at the top (format: `123-456-7890`)

### 7. Configure Environment Variables

Add the following to your `.env` file in the `server` directory:

```dotenv
# Google Ads API Configuration
GOOGLE_ADS_CUSTOMER_ID="983-915-4698"  # Manager Account Customer ID (NOT the regular account ID)
GOOGLE_ADS_CONVERSION_ID="17848519089"  # Conversion Action ID from Manager Account (Conversion ID from Google Tag)
GOOGLE_ADS_CONVERSION_LABEL="9hwyCPeewdsbELGT675C"  # Conversion Label from Manager Account
GOOGLE_ADS_DEVELOPER_TOKEN="your-developer-token"  # From API Center
GOOGLE_ADS_CLIENT_ID="your-client-id.apps.googleusercontent.com"  # From Google Cloud Console
GOOGLE_ADS_CLIENT_SECRET="your-client-secret"  # From Google Cloud Console
GOOGLE_ADS_REFRESH_TOKEN="your-refresh-token"  # From OAuth 2.0 Playground

**⚠️ Important:** 
- Use the Manager Account Customer ID (983-915-4698), not the regular account ID (486-924-1209)
- Conversion ID (17848519089) is from the Manager Account's Google Tag (AW-17848519089)
- This is different from Conversion Action ID (ctId) - we use the Conversion ID from the tag
```

**Where each value comes from:**
- `GOOGLE_ADS_CUSTOMER_ID`: Your Google Ads account Customer ID (from Account Settings)
- `GOOGLE_ADS_CONVERSION_ID`: Conversion Action ID from URL `ctId=` parameter (e.g., `7439291494`)
- `GOOGLE_ADS_CONVERSION_LABEL`: Conversion Label from the setup page table (e.g., `4G8SCOaoqtsbEOeUzd8B`)
- `GOOGLE_ADS_DEVELOPER_TOKEN`: From API Center in Manager Account (e.g., `i1hgVo3HBTzc3T-eyUvTUg`)
- `GOOGLE_ADS_CLIENT_ID`: From Google Cloud Console OAuth credentials
- `GOOGLE_ADS_CLIENT_SECRET`: From Google Cloud Console OAuth credentials
- `GOOGLE_ADS_REFRESH_TOKEN`: From OAuth 2.0 Playground Step 2

**Note:** The conversion label is stored but not currently used in the API call (the conversion action ID is used instead). Keep it for reference.

**⚠️ Important: "Inactive" Status is Normal**

If you see the conversion action showing as **"Inactive"** in Google Ads:
- ✅ **This is normal and expected** for server-side conversion tracking
- ❌ **You do NOT need to add Google Tag Manager code** to your website
- ❌ **You do NOT need to add JavaScript tracking code** to your website
- The "Inactive" status will change to "Active" automatically once the first conversion is sent via API
- Google Tag Manager setup is only needed for **frontend tracking**, not server-side tracking
- Your backend will send conversions directly via Google Ads API, bypassing the need for frontend code

**Why it shows "Inactive":**
- Google Ads shows "Inactive" until it receives the first conversion
- Since you're using server-side tracking, no frontend code is needed
- Once your backend sends the first conversion via API, the status will update to "Active"

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


