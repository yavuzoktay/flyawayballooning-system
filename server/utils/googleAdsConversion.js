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

// Function to save error logs to database (injected from index.js)
let saveErrorLogFunction = null;

/**
 * Set the saveErrorLog function from index.js
 * @param {Function} saveErrorLog - Function to save error logs to database
 */
function setSaveErrorLog(saveErrorLog) {
    saveErrorLogFunction = saveErrorLog;
}

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
        console.log('📊 [Google Ads] Requesting OAuth2 access token...');
        const response = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            refresh_token: REFRESH_TOKEN,
            grant_type: 'refresh_token'
        });

        console.log('📊 [Google Ads] Access token obtained successfully');
        return response.data.access_token;
    } catch (error) {
        const errorMessage = `Error getting Google Ads access token: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`;
        console.error('❌', errorMessage);
        
        if (saveErrorLogFunction) {
            const errorDetails = error.response?.data 
                ? JSON.stringify(error.response.data) 
                : error.message || 'Unknown error';
            const stackTrace = error.stack || `${error.name}: ${error.message}`;
            saveErrorLogFunction('error', `Google Ads: ${errorMessage}`, stackTrace, 'googleAds.getAccessToken');
        }
        
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
    conversionDateTime = null,
    allowTestPayments = false // Allow test payments (for testing endpoints)
}) {
    // Validate configuration
    if (!isConfigured()) {
        const warningMessage = 'Google Ads Conversion API not configured. Skipping conversion tracking.';
        console.warn('⚠️', warningMessage);
        
        if (saveErrorLogFunction) {
            saveErrorLogFunction('warning', warningMessage, null, 'googleAds.sendConversion');
        }
        
        return { success: false, reason: 'not_configured' };
    }

    // Validate required parameters
    if (!transactionId) {
        const errorMessage = 'Transaction ID is required for Google Ads conversion';
        console.error('❌', errorMessage);
        
        if (saveErrorLogFunction) {
            saveErrorLogFunction('error', errorMessage, null, 'googleAds.sendConversion');
        }
        
        return { success: false, reason: 'missing_transaction_id' };
    }

    if (value === undefined || value === null || isNaN(Number(value))) {
        const errorMessage = `Valid value is required for Google Ads conversion. Received: ${value}`;
        console.error('❌', errorMessage);
        
        if (saveErrorLogFunction) {
            saveErrorLogFunction('error', errorMessage, null, 'googleAds.sendConversion');
        }
        
        return { success: false, reason: 'invalid_value' };
    }

    // Skip test payments in production (unless explicitly allowed for testing)
    // Note: allowTestPayments=true bypasses this check (for test endpoints)
    if (IS_PRODUCTION && transactionId.startsWith('test_') && !allowTestPayments) {
        const infoMessage = `Skipping Google Ads conversion for test payment: ${transactionId} (IS_PRODUCTION=${IS_PRODUCTION}, allowTestPayments=${allowTestPayments})`;
        console.log('⏭️', infoMessage);
        
        if (saveErrorLogFunction) {
            saveErrorLogFunction('info', infoMessage, null, 'googleAds.sendConversion');
        }
        
        return { success: false, reason: 'test_payment' };
    }
    
    // Log if we're allowing test payments
    if (transactionId.startsWith('test_') && allowTestPayments) {
        console.log('🧪 [TEST] Allowing test payment conversion:', transactionId);
    }

    try {
        console.log('📊 [Google Ads] Starting conversion send:', {
            transactionId,
            value,
            currency,
            hasGclid: !!gclid,
            hasWbraid: !!wbraid,
            hasGbraid: !!gbraid
        });
        
        // Get OAuth2 access token
        console.log('📊 [Google Ads] Getting access token...');
        const accessToken = await getAccessToken();
        console.log('📊 [Google Ads] Access token obtained');

        // Format customer ID (remove dashes if present)
        const formattedCustomerId = CUSTOMER_ID.replace(/-/g, '');
        console.log('📊 [Google Ads] Formatted Customer ID:', formattedCustomerId);

        // Prepare conversion date/time
        const conversionTime = conversionDateTime 
            ? new Date(conversionDateTime).toISOString().replace(/\.\d{3}Z$/, '+00:00')
            : new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');

        // Build conversion action resource name
        const conversionActionResourceName = `customers/${formattedCustomerId}/conversionActions/${CONVERSION_ID}`;
        console.log('📊 [Google Ads] Conversion Action Resource Name:', conversionActionResourceName);

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

        console.log('📊 [Google Ads] Conversion data prepared:', {
            conversionAction: conversionActionResourceName,
            conversionDateTime: conversionTime,
            conversionValue: conversionData.conversionValue,
            currencyCode: conversionData.currencyCode,
            orderId: conversionData.orderId,
            hasGclid: !!conversionData.gclid,
            hasWbraid: !!conversionData.wbraid,
            hasGbraid: !!conversionData.gbraid
        });

        // Prepare the request payload
        // Note: customerId is in the URL path, not in the payload
        const requestPayload = {
            conversions: [conversionData],
            partialFailure: false, // Fail all if one fails
        };

        // Make API request
        // Format: POST /customers/{customerId}/conversionUploads:uploadClickConversions
        // Note: Google Ads API v16 uses conversionUploads:uploadClickConversions endpoint
        const url = `${GOOGLE_ADS_API_BASE_URL}/${formattedCustomerId}/conversionUploads:uploadClickConversions`;
        console.log('📊 [Google Ads] Sending request to:', url);
        console.log('📊 [Google Ads] Request payload:', JSON.stringify(requestPayload, null, 2));
        
        const response = await axios.post(url, requestPayload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Developer-Token': DEVELOPER_TOKEN,
                'Content-Type': 'application/json',
            },
        });

        const successMessage = `Google Ads conversion sent successfully. Transaction ID: ${transactionId}, Value: ${value} ${currency}, Has gclid: ${!!gclid}`;
        console.log('✅', successMessage);
        console.log('✅ [Google Ads] Response:', JSON.stringify(response.data, null, 2));
        
        if (saveErrorLogFunction) {
            saveErrorLogFunction('info', successMessage, JSON.stringify(response.data, null, 2), 'googleAds.sendConversion');
        }

        return {
            success: true,
            transactionId,
            response: response.data
        };
    } catch (error) {
        // Log error but don't throw (we don't want to break the payment flow)
        const errorDetails = {
            transactionId,
            value,
            currency,
            error: error.response?.data || error.message,
            status: error.response?.status,
            statusText: error.response?.statusText
        };
        
        console.error('❌ Error sending Google Ads conversion:', errorDetails);
        
        if (saveErrorLogFunction) {
            const errorMessage = `Google Ads: Failed to send conversion for transaction ${transactionId || 'unknown'}. Value: ${value} ${currency}`;
            const errorDetailsStr = error.response?.data 
                ? JSON.stringify(error.response.data) 
                : error.message || 'Unknown error';
            const stackTrace = error.stack || `${error.name}: ${error.message}`;
            saveErrorLogFunction('error', `${errorMessage}. Details: ${errorDetailsStr}`, stackTrace, 'googleAds.sendConversion');
        }

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
    isConfigured,
    setSaveErrorLog
};

