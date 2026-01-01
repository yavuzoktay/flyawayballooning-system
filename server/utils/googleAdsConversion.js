/**
 * Google Ads Conversion API Integration
 * 
 * This module handles server-side Google Ads conversion tracking via the Conversion API.
 * This is more reliable than frontend tracking because:
 * - It bypasses ad blockers
 * - It works even if JavaScript is disabled
 * - It's not affected by browser privacy restrictions
 * 
 * Requirements:
 * - GOOGLE_ADS_CUSTOMER_ID: Your Google Ads customer ID (e.g., "123-456-7890")
 * - GOOGLE_ADS_CONVERSION_ID: Your conversion action ID
 * - GOOGLE_ADS_CONVERSION_LABEL: Your conversion label
 * - GOOGLE_ADS_DEVELOPER_TOKEN: Your Google Ads API developer token
 * - GOOGLE_ADS_CLIENT_ID: OAuth2 client ID
 * - GOOGLE_ADS_CLIENT_SECRET: OAuth2 client secret
 * - GOOGLE_ADS_REFRESH_TOKEN: OAuth2 refresh token
 */

const axios = require('axios');
require('dotenv').config();

// Google Ads API configuration
const GOOGLE_ADS_API_VERSION = 'v16';
const GOOGLE_ADS_API_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers`;

// Environment variables
const CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID;
const CONVERSION_ID = process.env.GOOGLE_ADS_CONVERSION_ID;
const CONVERSION_LABEL = process.env.GOOGLE_ADS_CONVERSION_LABEL;
const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Check if Google Ads is configured
const isConfigured = () => {
    return !!(
        CUSTOMER_ID &&
        CONVERSION_ID &&
        CONVERSION_LABEL &&
        DEVELOPER_TOKEN &&
        CLIENT_ID &&
        CLIENT_SECRET &&
        REFRESH_TOKEN
    );
};

/**
 * Get OAuth2 access token using refresh token
 * @returns {Promise<string>} Access token
 */
async function getAccessToken() {
    try {
        const response = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            refresh_token: REFRESH_TOKEN,
            grant_type: 'refresh_token'
        });

        return response.data.access_token;
    } catch (error) {
        console.error('❌ Error getting Google Ads access token:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Send conversion to Google Ads Conversion API
 * 
 * @param {Object} params - Conversion parameters
 * @param {string} params.transactionId - Unique transaction ID (Stripe payment intent ID or session ID)
 * @param {number} params.value - Transaction value (in currency units, not cents)
 * @param {string} params.currency - Currency code (e.g., 'GBP', 'USD')
 * @param {string} [params.gclid] - Google Click ID (from URL parameter)
 * @param {string} [params.wbraid] - Web-to-app conversion ID
 * @param {string} [params.gbraid] - Google Browser ID
 * @param {string} [params.conversionDateTime] - Conversion date/time in ISO format (defaults to now)
 * @returns {Promise<Object>} API response
 */
async function sendConversion({
    transactionId,
    value,
    currency = 'GBP',
    gclid = null,
    wbraid = null,
    gbraid = null,
    conversionDateTime = null
}) {
    // Validate configuration
    if (!isConfigured()) {
        console.warn('⚠️ Google Ads Conversion API not configured. Skipping conversion tracking.');
        return { success: false, reason: 'not_configured' };
    }

    // Validate required parameters
    if (!transactionId) {
        console.error('❌ Transaction ID is required for Google Ads conversion');
        return { success: false, reason: 'missing_transaction_id' };
    }

    if (value === undefined || value === null || isNaN(Number(value))) {
        console.error('❌ Valid value is required for Google Ads conversion');
        return { success: false, reason: 'invalid_value' };
    }

    // Skip test payments in production
    if (IS_PRODUCTION && transactionId.startsWith('test_')) {
        console.log('⏭️ Skipping Google Ads conversion for test payment:', transactionId);
        return { success: false, reason: 'test_payment' };
    }

    try {
        // Get OAuth2 access token
        const accessToken = await getAccessToken();

        // Format customer ID (remove dashes if present)
        const formattedCustomerId = CUSTOMER_ID.replace(/-/g, '');

        // Prepare conversion date/time
        const conversionTime = conversionDateTime 
            ? new Date(conversionDateTime).toISOString().replace(/\.\d{3}Z$/, '+00:00')
            : new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');

        // Build conversion action resource name
        const conversionActionResourceName = `customers/${formattedCustomerId}/conversionActions/${CONVERSION_ID}`;

        // Prepare conversion data
        const conversionData = {
            conversionAction: conversionActionResourceName,
            conversionDateTime: conversionTime,
            conversionValue: Number(value),
            currencyCode: currency.toUpperCase(),
            orderId: transactionId, // Used for deduplication
        };

        // Add click identifiers if available
        if (gclid) {
            conversionData.gclid = gclid;
        }
        if (wbraid) {
            conversionData.wbraid = wbraid;
        }
        if (gbraid) {
            conversionData.gbraid = gbraid;
        }

        // Prepare the request payload
        // Note: customerId is in the URL path, not in the payload
        const requestPayload = {
            conversions: [conversionData],
            partialFailure: false, // Fail all if one fails
        };

        // Make API request
        // Format: POST /customers/{customerId}:uploadConversions
        const url = `${GOOGLE_ADS_API_BASE_URL}/${formattedCustomerId}:uploadConversions`;
        const response = await axios.post(url, requestPayload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Developer-Token': DEVELOPER_TOKEN,
                'Content-Type': 'application/json',
            },
        });

        console.log('✅ Google Ads conversion sent successfully:', {
            transactionId,
            value,
            currency,
            hasGclid: !!gclid,
            response: response.data
        });

        return {
            success: true,
            transactionId,
            response: response.data
        };
    } catch (error) {
        // Log error but don't throw (we don't want to break the payment flow)
        console.error('❌ Error sending Google Ads conversion:', {
            transactionId,
            error: error.response?.data || error.message,
            status: error.response?.status,
        });

        return {
            success: false,
            reason: 'api_error',
            error: error.response?.data || error.message
        };
    }
}

/**
 * Check if a conversion was already sent (for duplicate prevention)
 * This is handled by Google Ads using orderId (transactionId), but we can log it
 * 
 * @param {string} transactionId - Transaction ID to check
 * @returns {boolean} Whether conversion was likely already sent
 */
function isDuplicateConversion(transactionId) {
    // Google Ads automatically deduplicates based on orderId (transactionId)
    // We can add additional client-side tracking here if needed
    // For now, we rely on Google Ads' built-in deduplication
    return false;
}

module.exports = {
    sendConversion,
    isDuplicateConversion,
    isConfigured
};

