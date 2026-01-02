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
const { GoogleAdsApi } = require('google-ads-api');
// Load environment variables - ensure dotenv is loaded
require('dotenv').config();

// Debug: Log environment variables on module load (for debugging)
if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_ENV === 'true') {
    console.log('🔍 [Google Ads] Environment Variables on module load:');
    console.log('  - GOOGLE_ADS_CUSTOMER_ID:', process.env.GOOGLE_ADS_CUSTOMER_ID ? `"${process.env.GOOGLE_ADS_CUSTOMER_ID}"` : 'NOT SET');
    console.log('  - GOOGLE_ADS_CONVERSION_ID:', process.env.GOOGLE_ADS_CONVERSION_ID ? `"${process.env.GOOGLE_ADS_CONVERSION_ID}"` : 'NOT SET');
}

// Google Ads API configuration
const GOOGLE_ADS_API_VERSION = 'v16';
const GOOGLE_ADS_API_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers`;

// Environment variables - Use let so they can be reloaded
let CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID;
let CONVERSION_ID = process.env.GOOGLE_ADS_CONVERSION_ID;
let CONVERSION_LABEL = process.env.GOOGLE_ADS_CONVERSION_LABEL;
let DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
let CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
let CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
let REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN;
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

/**
 * Reload environment variables from process.env
 * This ensures we get the latest values even if .env was updated
 */
function reloadEnvVariables() {
    // Force reload of dotenv
    delete require.cache[require.resolve('dotenv')];
    require('dotenv').config();
    
    // Reload variables directly from process.env
    CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID;
    CONVERSION_ID = process.env.GOOGLE_ADS_CONVERSION_ID;
    CONVERSION_LABEL = process.env.GOOGLE_ADS_CONVERSION_LABEL;
    DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
    CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
    REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN;
    
    console.log('🔄 [Google Ads] Environment variables reloaded');
    console.log('  - CUSTOMER_ID:', CUSTOMER_ID ? `"${CUSTOMER_ID}"` : 'NOT SET');
    console.log('  - CONVERSION_ID:', CONVERSION_ID ? `"${CONVERSION_ID}"` : 'NOT SET');
}

// Check if Google Ads is configured
const isConfigured = () => {
    // Reload env vars before checking
    reloadEnvVariables();
    
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
        
        // Debug: Log all environment variables (without sensitive data)
        console.log('📊 [Google Ads] Environment Variables Check:');
        console.log('  - CUSTOMER_ID:', CUSTOMER_ID ? `${CUSTOMER_ID.substring(0, 5)}...` : 'NOT SET');
        console.log('  - CONVERSION_ID:', CONVERSION_ID ? `${CONVERSION_ID.substring(0, 5)}...` : 'NOT SET');
        console.log('  - CONVERSION_LABEL:', CONVERSION_LABEL ? `${CONVERSION_LABEL.substring(0, 5)}...` : 'NOT SET');
        console.log('  - DEVELOPER_TOKEN:', DEVELOPER_TOKEN ? 'SET' : 'NOT SET');
        console.log('  - CLIENT_ID:', CLIENT_ID ? 'SET' : 'NOT SET');
        console.log('  - CLIENT_SECRET:', CLIENT_SECRET ? 'SET' : 'NOT SET');
        console.log('  - REFRESH_TOKEN:', REFRESH_TOKEN ? 'SET' : 'NOT SET');
        
        // Format customer ID (remove dashes if present)
        if (!CUSTOMER_ID) {
            const errorMsg = 'GOOGLE_ADS_CUSTOMER_ID environment variable is not set or empty';
            console.error('❌', errorMsg);
            console.error('❌ [Google Ads] Full CUSTOMER_ID value:', JSON.stringify(CUSTOMER_ID));
            if (saveErrorLogFunction) {
                saveErrorLogFunction('error', errorMsg, null, 'googleAds.sendConversion');
            }
            return { success: false, reason: 'missing_customer_id', error: errorMsg };
        }
        
        // Remove quotes if present (sometimes .env files have quotes)
        let customerIdValue = CUSTOMER_ID.trim();
        if ((customerIdValue.startsWith('"') && customerIdValue.endsWith('"')) || 
            (customerIdValue.startsWith("'") && customerIdValue.endsWith("'"))) {
            customerIdValue = customerIdValue.slice(1, -1);
        }
        
        if (!customerIdValue) {
            const errorMsg = 'GOOGLE_ADS_CUSTOMER_ID is empty after trimming quotes';
            console.error('❌', errorMsg);
            if (saveErrorLogFunction) {
                saveErrorLogFunction('error', errorMsg, null, 'googleAds.sendConversion');
            }
            return { success: false, reason: 'missing_customer_id', error: errorMsg };
        }
        
        const formattedCustomerId = customerIdValue.replace(/-/g, '');
        console.log('📊 [Google Ads] Customer ID from env (raw):', CUSTOMER_ID);
        console.log('📊 [Google Ads] Customer ID (trimmed):', customerIdValue);
        console.log('📊 [Google Ads] Formatted Customer ID (no dashes):', formattedCustomerId);

        // Initialize Google Ads API client
        const client = new GoogleAdsApi({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            developer_token: DEVELOPER_TOKEN,
        });

        // Get customer instance
        // google-ads-api expects customer_id as string without dashes
        // Also ensure it's not empty
        if (!formattedCustomerId || formattedCustomerId.trim() === '') {
            const errorMsg = `Formatted Customer ID is empty. Original: ${CUSTOMER_ID}, Formatted: ${formattedCustomerId}`;
            console.error('❌', errorMsg);
            if (saveErrorLogFunction) {
                saveErrorLogFunction('error', errorMsg, null, 'googleAds.sendConversion');
            }
            return { success: false, reason: 'empty_customer_id', error: errorMsg };
        }
        
        console.log('📊 [Google Ads] Creating Customer instance with ID:', formattedCustomerId);
        const customer = client.Customer({
            customer_id: formattedCustomerId,
            refresh_token: REFRESH_TOKEN,
        });
        console.log('📊 [Google Ads] Customer instance created successfully');

        // Prepare conversion date/time
        const conversionTime = conversionDateTime 
            ? new Date(conversionDateTime)
            : new Date();

        // Build conversion action resource name
        // Note: CONVERSION_ID can be either Conversion Action ID (ctId) or Conversion ID from Google Tag
        // Google Ads API uses Conversion Action ID (ctId) in the resource name
        // If CONVERSION_ID is the Google Tag Conversion ID (like 17848519089), we need to find the actual Conversion Action ID
        // For now, we'll try using it directly - if it fails, we'll need the actual ctId
        const conversionActionResourceName = `customers/${formattedCustomerId}/conversionActions/${CONVERSION_ID}`;
        console.log('📊 [Google Ads] Conversion Action Resource Name:', conversionActionResourceName);
        console.log('📊 [Google Ads] Using CONVERSION_ID:', CONVERSION_ID);
        console.log('📊 [Google Ads] Note: If this fails, we may need the actual Conversion Action ID (ctId) from the conversion action detail page URL');

        // Prepare conversion data using google-ads-api format
        const conversionData = {
            conversion_action: conversionActionResourceName,
            conversion_date_time: conversionTime.toISOString().replace(/\.\d{3}Z$/, '+00:00'),
            conversion_value: Number(value),
            currency_code: currency.toUpperCase(),
            order_id: transactionId, // Used for deduplication
            conversion_environment: 'WEB' // WEB for website conversions, APP for app conversions
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
            conversionDateTime: conversionData.conversion_date_time,
            conversionValue: conversionData.conversion_value,
            currencyCode: conversionData.currency_code,
            orderId: conversionData.order_id,
            hasGclid: !!conversionData.gclid,
            hasWbraid: !!conversionData.wbraid,
            hasGbraid: !!conversionData.gbraid
        });

        // Upload click conversions using google-ads-api
        console.log('📊 [Google Ads] Uploading click conversions via google-ads-api...');
        console.log('📊 [Google Ads] Conversion data to send:', JSON.stringify(conversionData, null, 2));
        
        try {
            const response = await customer.conversionUploads.uploadClickConversions({
                conversions: [conversionData],
                partial_failure: false,
            });

            const successMessage = `Google Ads conversion sent successfully. Transaction ID: ${transactionId}, Value: ${value} ${currency}, Has gclid: ${!!gclid}`;
            console.log('✅', successMessage);
            console.log('✅ [Google Ads] Response:', JSON.stringify(response, null, 2));
            
            if (saveErrorLogFunction) {
                saveErrorLogFunction('info', successMessage, JSON.stringify(response, null, 2), 'googleAds.sendConversion');
            }

            return {
                success: true,
                transactionId,
                response: response
            };
        } catch (apiError) {
            // google-ads-api paketi farklı hata formatı kullanıyor olabilir
            console.error('❌ [Google Ads] API Error Details:');
            console.error('  - Error Type:', apiError.constructor.name);
            console.error('  - Error Message:', apiError.message);
            console.error('  - Error Code:', apiError.code);
            console.error('  - Error Status:', apiError.status);
            console.error('  - Error Details:', apiError.details);
            console.error('  - Full Error:', JSON.stringify(apiError, Object.getOwnPropertyNames(apiError), 2));
            
            throw apiError; // Re-throw to be caught by outer catch
        }
    } catch (error) {
        // Log error but don't throw (we don't want to break the payment flow)
        console.error('❌ [Google Ads] Error caught in outer catch:');
        console.error('  - Error Type:', error?.constructor?.name || typeof error);
        console.error('  - Error Message:', error?.message || 'No message');
        console.error('  - Error Code:', error?.code);
        console.error('  - Error Status:', error?.status);
        console.error('  - Error Details:', error?.details);
        console.error('  - Error Stack:', error?.stack);
        console.error('  - Full Error Object:', error);
        
        // Try to extract error details from different possible formats
        let errorMessage = 'Unknown error';
        let errorDetailsStr = 'Unknown error';
        
        if (error?.message) {
            errorMessage = error.message;
            errorDetailsStr = error.message;
        } else if (error?.details) {
            errorMessage = JSON.stringify(error.details);
            errorDetailsStr = JSON.stringify(error.details);
        } else if (typeof error === 'string') {
            errorMessage = error;
            errorDetailsStr = error;
        } else {
            errorMessage = JSON.stringify(error);
            errorDetailsStr = JSON.stringify(error);
        }
        
        const errorDetails = {
            transactionId,
            value,
            currency,
            error: errorMessage,
            errorCode: error?.code,
            errorStatus: error?.status,
            errorType: error?.constructor?.name || typeof error
        };
        
        console.error('❌ Error sending Google Ads conversion:', errorDetails);
        
        if (saveErrorLogFunction) {
            const logMessage = `Google Ads: Failed to send conversion for transaction ${transactionId || 'unknown'}. Value: ${value} ${currency}`;
            const stackTrace = error?.stack || `${error?.name || 'Error'}: ${errorMessage}`;
            saveErrorLogFunction('error', `${logMessage}. Details: ${errorDetailsStr}`, stackTrace, 'googleAds.sendConversion');
        }

        return {
            success: false,
            reason: 'api_error',
            error: errorMessage
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
    setSaveErrorLog,
    reloadEnvVariables
};

