# Google Ads API Integration - Design Documentation

## Tool Overview

**Tool Name:** Server-Side Conversion Tracking System  
**Company:** Fly Away Ballooning  
**Purpose:** Track Google Ads conversions server-side via API to ensure accurate conversion measurement even when frontend tracking is blocked by ad blockers or browser restrictions.

---

## 1. System Architecture

### 1.1 Overview

The system implements server-side Google Ads conversion tracking that works independently of frontend JavaScript. This ensures conversions are tracked reliably even when:
- Ad blockers are active
- JavaScript is disabled
- Browser privacy restrictions block tracking scripts
- Users have strict privacy settings

### 1.2 High-Level Flow

```
User clicks Google Ad (with gclid)
    ↓
User lands on website
    ↓
Frontend captures gclid/wbraid/gbraid → Stores in localStorage
    ↓
User completes booking/payment
    ↓
Stripe Checkout Session created (with gclid in metadata)
    ↓
Payment completed
    ↓
Stripe Webhook: checkout.session.completed
    ↓
Backend extracts conversion data
    ↓
Google Ads Conversion API Call
    ↓
Conversion tracked in Google Ads
```

### 1.3 Components

1. **Frontend (Website)**
   - Captures Google Click IDs (gclid, wbraid, gbraid) from URL parameters
   - Stores IDs in localStorage (30-day validity)
   - Passes IDs to backend during checkout session creation

2. **Backend (Node.js Server)**
   - Receives Stripe webhook events
   - Extracts conversion data (transaction ID, value, currency, gclid)
   - Sends conversion to Google Ads API using `google-ads-api` package
   - Handles errors and logging

3. **Google Ads API**
   - Receives conversion data via REST API
   - Associates conversion with original ad click using gclid
   - Updates conversion metrics in Google Ads account

---

## 2. Google Ads API Integration

### 2.1 API Method Used

**Service:** ConversionUploadService  
**Method:** `uploadClickConversions`  
**API Version:** v21 (via google-ads-api package)

### 2.2 Authentication

- **OAuth 2.0:** Uses refresh token to obtain access tokens
- **Developer Token:** Required for API access (Basic Access level)
- **Customer ID:** Manager Account ID (983-915-4698) without dashes (9839154698)

### 2.3 Request Format

```javascript
{
  customer_id: "9839154698",  // Manager Account ID (no dashes)
  conversions: [{
    conversion_action: "customers/9839154698/conversionActions/{CONVERSION_ACTION_ID}",
    conversion_date_time: "2024-01-15 14:30:00+00:00",
    conversion_value: 100.00,
    currency_code: "GBP",
    order_id: "pi_1234567890",  // Stripe Payment Intent ID (for deduplication)
    conversion_environment: "WEB",
    gclid: "EAIaIQobChMI..."  // Google Click ID (if available)
  }],
  partial_failure: false
}
```

### 2.4 Conversion Action

- **Conversion Action ID:** Retrieved from Google Ads conversion setup page (ctId parameter in URL)
- **Resource Name Format:** `customers/{customer_id}/conversionActions/{conversion_action_id}`
- **Type:** Website conversion (Purchase/Sale category)
- **Count:** Every conversion (not just one per user)
- **Window:** 30-day click-through conversion window

---

## 3. Technical Implementation

### 3.1 Technology Stack

- **Backend Framework:** Node.js with Express
- **Google Ads API Library:** `google-ads-api` (v21.0.1)
- **Payment Processor:** Stripe
- **Webhook Handler:** Stripe webhook endpoint

### 3.2 Key Functions

#### 3.2.1 Conversion Sending Function

```javascript
async function sendConversion({
  transactionId,      // Stripe Payment Intent ID or Session ID
  value,              // Transaction value (in currency units)
  currency,           // Currency code (e.g., 'GBP', 'USD')
  gclid,              // Google Click ID (optional)
  wbraid,             // Web-to-app conversion ID (optional)
  gbraid,             // Google Browser ID (optional)
  conversionDateTime, // ISO format date/time (defaults to now)
  allowTestPayments   // Allow test payments (for testing)
})
```

#### 3.2.2 Error Handling

- Validates all required environment variables
- Checks customer ID format (10 digits, no dashes)
- Validates conversion data before sending
- Logs errors with detailed information
- Returns structured error responses

#### 3.2.3 Deduplication

- Uses Stripe Payment Intent ID or Session ID as `order_id`
- Google Ads automatically deduplicates based on `order_id`
- Prevents duplicate conversions from webhook retries

### 3.3 Environment Variables

```env
GOOGLE_ADS_CUSTOMER_ID="983-915-4698"      # Manager Account ID
GOOGLE_ADS_CONVERSION_ID="7439667063"     # Conversion Action ID
GOOGLE_ADS_CONVERSION_LABEL="9hwyCPe..."  # Conversion Label (optional)
GOOGLE_ADS_DEVELOPER_TOKEN="i1hgVo3H..."  # Developer Token
GOOGLE_ADS_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_ADS_CLIENT_SECRET="GOCSPX-xxx"
GOOGLE_ADS_REFRESH_TOKEN="1//0g..."
```

---

## 4. Data Flow Details

### 4.1 Frontend Capture

1. User lands on site with `?gclid=...` in URL
2. JavaScript captures gclid, wbraid, gbraid from URL parameters
3. IDs stored in localStorage with 30-day expiration
4. IDs included in Stripe checkout session creation request

### 4.2 Backend Processing

1. Stripe webhook received: `checkout.session.completed`
2. Extract payment data:
   - Payment Intent ID (transaction ID)
   - Amount and currency
   - Google Click IDs from session metadata
3. Validate conversion data
4. Format conversion for Google Ads API
5. Send conversion via `uploadClickConversions`
6. Log result (success or error)

### 4.3 Google Ads Processing

1. Google Ads API receives conversion
2. Matches conversion to original ad click using gclid
3. Updates conversion metrics in account
4. Conversion appears in Google Ads interface

---

## 5. Security & Best Practices

### 5.1 Security Measures

- **Environment Variables:** All credentials stored in `.env` file (never committed to version control)
- **OAuth 2.0:** Secure token-based authentication
- **HTTPS:** All API calls use HTTPS
- **Token Management:** Refresh tokens stored securely, access tokens obtained on-demand

### 5.2 Error Handling

- Comprehensive error logging
- Graceful failure (doesn't break payment flow)
- Detailed error messages for debugging
- Error tracking in database (optional)

### 5.3 Testing

- Test endpoint available: `/api/test-google-ads-conversion`
- Test payments automatically skipped in production
- Validation of all inputs before API calls
- Comprehensive logging for debugging

### 5.4 Compliance

- Respects user privacy (server-side only, no cookies)
- No personal data sent to Google Ads API
- Only conversion data (value, currency, transaction ID)
- Complies with GDPR and privacy regulations

---

## 6. Use Cases

### 6.1 Primary Use Case

**Track completed bookings/purchases as Google Ads conversions**

- User clicks Google Ad
- User completes booking on website
- Payment processed via Stripe
- Conversion automatically sent to Google Ads
- Conversion attributed to original ad click

### 6.2 Benefits

1. **Accuracy:** Conversions tracked even with ad blockers
2. **Reliability:** Server-side tracking is more reliable than frontend
3. **Attribution:** Proper attribution to Google Ads campaigns
4. **Optimization:** Better data for campaign optimization
5. **ROI Measurement:** Accurate ROI calculation for ad spend

---

## 7. Integration Points

### 7.1 Stripe Integration

- Webhook endpoint: `/api/stripe-webhook`
- Event: `checkout.session.completed`
- Data extracted: Payment Intent ID, amount, currency, metadata (gclid)

### 7.2 Google Ads API Integration

- Service: ConversionUploadService
- Method: uploadClickConversions
- Authentication: OAuth 2.0 with refresh token
- Customer: Manager Account (983-915-4698)

### 7.3 Frontend Integration

- JavaScript captures gclid from URL
- IDs stored in localStorage
- IDs passed to backend during checkout

---

## 8. Monitoring & Logging

### 8.1 Logging

- Conversion send attempts (success/failure)
- Error details with stack traces
- API response logging
- Environment variable validation logs

### 8.2 Monitoring

- Check Google Ads conversion history
- Monitor error rates
- Track conversion volume
- Verify attribution accuracy

---

## 9. Future Enhancements

- Support for offline conversions
- Enhanced error reporting
- Conversion value optimization
- Multi-currency support improvements

---

## 10. Contact Information

**Company:** Fly Away Ballooning  
**Email:** info@flyawayballooning.com  
**Website:** https://flyawayballooning.com

---

## Appendix: API Request Example

### Complete Request Structure

```json
{
  "customer_id": "9839154698",
  "conversions": [
    {
      "conversion_action": "customers/9839154698/conversionActions/7439667063",
      "conversion_date_time": "2024-01-15 14:30:00+00:00",
      "conversion_value": 150.00,
      "currency_code": "GBP",
      "order_id": "pi_3OaBcDeFgHiJkLmN",
      "conversion_environment": "WEB",
      "gclid": "EAIaIQobChMI..."
    }
  ],
  "partial_failure": false
}
```

### Response Structure

```json
{
  "results": [
    {
      "gclid": "EAIaIQobChMI...",
      "conversion_action": "customers/9839154698/conversionActions/7439667063",
      "conversion_date_time": "2024-01-15 14:30:00+00:00",
      "order_id": "pi_3OaBcDeFgHiJkLmN"
    }
  ],
  "partial_failure_error": null
}
```

---

**Document Version:** 1.0  
**Last Updated:** January 2024  
**Author:** Fly Away Ballooning Development Team


