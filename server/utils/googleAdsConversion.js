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
// When using Manager account: ADVERTISER_CUSTOMER_ID = account with conversion actions, CUSTOMER_ID = Manager (login)
let ADVERTISER_CUSTOMER_ID = process.env.GOOGLE_ADS_ADVERTISER_CUSTOMER_ID;
let CONVERSION_ID = process.env.GOOGLE_ADS_CONVERSION_ID;
let CONVERSION_LABEL = process.env.GOOGLE_ADS_CONVERSION_LABEL;
// Primary conversion action IDs for full-funnel tracking (optional - fallback to CONVERSION_ID)
let CONVERSION_ID_FLIGHT_SHARED = process.env.GOOGLE_ADS_CONVERSION_ID_FLIGHT_SHARED;
let CONVERSION_ID_FLIGHT_PRIVATE = process.env.GOOGLE_ADS_CONVERSION_ID_FLIGHT_PRIVATE;
let CONVERSION_ID_VOUCHER_SHARED = process.env.GOOGLE_ADS_CONVERSION_ID_VOUCHER_SHARED;
let CONVERSION_ID_VOUCHER_PRIVATE = process.env.GOOGLE_ADS_CONVERSION_ID_VOUCHER_PRIVATE;
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
    // Force reload of dotenv - clear cache and reload
    const dotenvPath = require.resolve('dotenv');
    delete require.cache[dotenvPath];
    
    // Also clear fs cache if possible
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '..', '.env');
    try {
        // Force reload by reading file directly
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envVars = {};
        envContent.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const equalIndex = trimmedLine.indexOf('=');
                if (equalIndex > 0) {
                    const key = trimmedLine.substring(0, equalIndex).trim();
                    let value = trimmedLine.substring(equalIndex + 1).trim();
                    // Remove quotes if present
                    if ((value.startsWith('"') && value.endsWith('"')) || 
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    envVars[key] = value;
                }
            }
        });
        
        // Update process.env
        Object.keys(envVars).forEach(key => {
            process.env[key] = envVars[key];
        });
    } catch (error) {
        console.warn('⚠️ [Google Ads] Could not manually reload .env file:', error.message);
        // Fallback to dotenv
        require('dotenv').config({ override: true });
    }
    
    // Reload variables directly from process.env
    CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID;
    ADVERTISER_CUSTOMER_ID = process.env.GOOGLE_ADS_ADVERTISER_CUSTOMER_ID;
    CONVERSION_ID = process.env.GOOGLE_ADS_CONVERSION_ID;
    CONVERSION_LABEL = process.env.GOOGLE_ADS_CONVERSION_LABEL;
    CONVERSION_ID_FLIGHT_SHARED = process.env.GOOGLE_ADS_CONVERSION_ID_FLIGHT_SHARED;
    CONVERSION_ID_FLIGHT_PRIVATE = process.env.GOOGLE_ADS_CONVERSION_ID_FLIGHT_PRIVATE;
    CONVERSION_ID_VOUCHER_SHARED = process.env.GOOGLE_ADS_CONVERSION_ID_VOUCHER_SHARED;
    CONVERSION_ID_VOUCHER_PRIVATE = process.env.GOOGLE_ADS_CONVERSION_ID_VOUCHER_PRIVATE;
    DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
    CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
    REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN;
    
    console.log('🔄 [Google Ads] Environment variables reloaded');
    console.log('  - CUSTOMER_ID:', CUSTOMER_ID ? `"${CUSTOMER_ID}"` : 'NOT SET');
    console.log('  - CUSTOMER_ID (raw from process.env):', process.env.GOOGLE_ADS_CUSTOMER_ID ? `"${process.env.GOOGLE_ADS_CUSTOMER_ID}"` : 'NOT SET');
    console.log('  - CONVERSION_ID:', CONVERSION_ID ? `"${CONVERSION_ID}"` : 'NOT SET');
}

// Check if Google Ads is configured
const isConfigured = () => {
    // Don't reload here - reloadEnvVariables is called in sendConversion
    // This prevents infinite loops and excessive reloading
    // Check that all required variables are set and not empty strings
    const isCustomerIdSet = CUSTOMER_ID && typeof CUSTOMER_ID === 'string' && CUSTOMER_ID.trim() !== '';
    const isConversionIdSet = CONVERSION_ID && typeof CONVERSION_ID === 'string' && CONVERSION_ID.trim() !== '';
    const isConversionLabelSet = CONVERSION_LABEL && typeof CONVERSION_LABEL === 'string' && CONVERSION_LABEL.trim() !== '';
    const isDeveloperTokenSet = DEVELOPER_TOKEN && typeof DEVELOPER_TOKEN === 'string' && DEVELOPER_TOKEN.trim() !== '';
    const isClientIdSet = CLIENT_ID && typeof CLIENT_ID === 'string' && CLIENT_ID.trim() !== '';
    const isClientSecretSet = CLIENT_SECRET && typeof CLIENT_SECRET === 'string' && CLIENT_SECRET.trim() !== '';
    const isRefreshTokenSet = REFRESH_TOKEN && typeof REFRESH_TOKEN === 'string' && REFRESH_TOKEN.trim() !== '';
    
    if (!isCustomerIdSet) {
        console.warn('⚠️ [Google Ads] CUSTOMER_ID is not properly configured:', CUSTOMER_ID);
    }
    
    return !!(
        isCustomerIdSet &&
        isConversionIdSet &&
        isConversionLabelSet &&
        isDeveloperTokenSet &&
        isClientIdSet &&
        isClientSecretSet &&
        isRefreshTokenSet
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
 * @param {string} [params.funnelType] - booking | gift | voucher (for conversion action selection)
 * @param {string} [params.experienceType] - shared | private (for conversion action selection)
 * @param {string} [params.productType] - Product type for GA_Purchase_Completed
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
    allowTestPayments = false, // Allow test payments (for testing endpoints)
    funnelType = 'booking',
    experienceType = 'shared',
    productType = ''
}) {
    // Reload environment variables to ensure we have the latest values
    // This is important if .env was updated without server restart
    reloadEnvVariables();
    
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
        // When GOOGLE_ADS_ADVERTISER_CUSTOMER_ID is set: use it as customer_id (conversion actions live there)
        // and use GOOGLE_ADS_CUSTOMER_ID as login_customer_id (Manager account for auth)
        let customerIdToUse = ADVERTISER_CUSTOMER_ID || process.env.GOOGLE_ADS_ADVERTISER_CUSTOMER_ID || CUSTOMER_ID || process.env.GOOGLE_ADS_CUSTOMER_ID;
        const loginCustomerIdRaw = ADVERTISER_CUSTOMER_ID ? (CUSTOMER_ID || process.env.GOOGLE_ADS_CUSTOMER_ID) : null;
        
        if (!customerIdToUse) {
            const errorMsg = 'GOOGLE_ADS_CUSTOMER_ID environment variable is not set or empty';
            console.error('❌', errorMsg);
            console.error('❌ [Google Ads] CUSTOMER_ID variable:', JSON.stringify(CUSTOMER_ID));
            console.error('❌ [Google Ads] process.env.GOOGLE_ADS_CUSTOMER_ID:', JSON.stringify(process.env.GOOGLE_ADS_CUSTOMER_ID));
            console.error('❌ [Google Ads] All GOOGLE_ADS env vars:', {
                CUSTOMER_ID: process.env.GOOGLE_ADS_CUSTOMER_ID,
                CONVERSION_ID: process.env.GOOGLE_ADS_CONVERSION_ID,
                CONVERSION_LABEL: process.env.GOOGLE_ADS_CONVERSION_LABEL,
                DEVELOPER_TOKEN: process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? 'SET' : 'NOT SET',
                CLIENT_ID: process.env.GOOGLE_ADS_CLIENT_ID ? 'SET' : 'NOT SET',
                CLIENT_SECRET: process.env.GOOGLE_ADS_CLIENT_SECRET ? 'SET' : 'NOT SET',
                REFRESH_TOKEN: process.env.GOOGLE_ADS_REFRESH_TOKEN ? 'SET' : 'NOT SET'
            });
            if (saveErrorLogFunction) {
                saveErrorLogFunction('error', errorMsg, null, 'googleAds.sendConversion');
            }
            return { success: false, reason: 'missing_customer_id', error: errorMsg };
        }
        
        // Update CUSTOMER_ID if we got it from process.env
        if (!CUSTOMER_ID && customerIdToUse) {
            CUSTOMER_ID = customerIdToUse;
        }
        
        // Remove quotes if present (sometimes .env files have quotes)
        let customerIdValue = customerIdToUse.trim();
        
        // Remove double quotes
        if (customerIdValue.startsWith('"') && customerIdValue.endsWith('"')) {
            customerIdValue = customerIdValue.slice(1, -1).trim();
        }
        
        // Remove single quotes
        if (customerIdValue.startsWith("'") && customerIdValue.endsWith("'")) {
            customerIdValue = customerIdValue.slice(1, -1).trim();
        }
        
        // Final trim after quote removal
        customerIdValue = customerIdValue.trim();
        
        if (!customerIdValue) {
            const errorMsg = 'GOOGLE_ADS_CUSTOMER_ID is empty after trimming quotes';
            console.error('❌', errorMsg);
            console.error('❌ [Google Ads] Original CUSTOMER_ID:', JSON.stringify(CUSTOMER_ID));
            if (saveErrorLogFunction) {
                saveErrorLogFunction('error', errorMsg, null, 'googleAds.sendConversion');
            }
            return { success: false, reason: 'missing_customer_id', error: errorMsg };
        }
        
        const formattedCustomerId = customerIdValue.replace(/-/g, '');
        let formattedLoginCustomerId = null;
        if (loginCustomerIdRaw) {
            const loginVal = String(loginCustomerIdRaw).trim().replace(/["']/g, '').replace(/-/g, '');
            if (loginVal && /^\d{10}$/.test(loginVal)) formattedLoginCustomerId = loginVal;
        }
        console.log('📊 [Google Ads] Customer ID from env (raw):', JSON.stringify(CUSTOMER_ID));
        console.log('📊 [Google Ads] Advertiser ID (for conversions):', ADVERTISER_CUSTOMER_ID ? 'SET' : 'NOT SET');
        console.log('📊 [Google Ads] Login Customer ID (Manager):', formattedLoginCustomerId ? 'SET' : 'NOT SET');
        console.log('📊 [Google Ads] Customer ID (after quote removal):', JSON.stringify(customerIdValue));
        console.log('📊 [Google Ads] Formatted Customer ID (no dashes):', formattedCustomerId);

        // Initialize Google Ads API client
        // When ADVERTISER_CUSTOMER_ID is set: login_customer_id = Manager, customer_id = Advertiser
        const clientConfig = {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            developer_token: DEVELOPER_TOKEN,
        };
        if (formattedLoginCustomerId) {
            clientConfig.login_customer_id = formattedLoginCustomerId;
            console.log('📊 [Google Ads] Using Manager account (login_customer_id) to access Advertiser account');
        }
        
        console.log('📊 [Google Ads] GoogleAdsApi client initialized');
        console.log('📊 [Google Ads] Developer Token:', DEVELOPER_TOKEN ? `${DEVELOPER_TOKEN.substring(0, 5)}...` : 'NOT SET');
        console.log('📊 [Google Ads] Client ID:', CLIENT_ID ? `${CLIENT_ID.substring(0, 20)}...` : 'NOT SET');
        
        const client = new GoogleAdsApi(clientConfig);

        // Get customer instance
        // google-ads-api expects customer_id as string - try both formats
        // Some versions expect with dashes, some without
        if (!formattedCustomerId || formattedCustomerId.trim() === '') {
            const errorMsg = `Formatted Customer ID is empty. Original: ${CUSTOMER_ID}, Formatted: ${formattedCustomerId}`;
            console.error('❌', errorMsg);
            if (saveErrorLogFunction) {
                saveErrorLogFunction('error', errorMsg, null, 'googleAds.sendConversion');
            }
            return { success: false, reason: 'empty_customer_id', error: errorMsg };
        }
        
        // According to Google Ads API docs, customer_id should be WITHOUT dashes
        // Format: "1234567890" not "123-456-7890"
        // But google-ads-api package might expect it as a string, not a number
        const customerIdForApi = String(formattedCustomerId).trim();
        
        // Final validation - ensure customer ID is not empty and is valid
        if (!customerIdForApi || customerIdForApi === '' || customerIdForApi === 'undefined' || customerIdForApi === 'null') {
            const errorMsg = `Invalid customer ID: "${customerIdForApi}". Original: "${CUSTOMER_ID}", Formatted: "${formattedCustomerId}"`;
            console.error('❌', errorMsg);
            console.error('❌ [Google Ads] Debug info:', {
                CUSTOMER_ID,
                customerIdToUse,
                customerIdValue,
                formattedCustomerId,
                customerIdForApi,
                processEnvValue: process.env.GOOGLE_ADS_CUSTOMER_ID
            });
            if (saveErrorLogFunction) {
                saveErrorLogFunction('error', errorMsg, null, 'googleAds.sendConversion');
            }
            return { success: false, reason: 'invalid_customer_id', error: errorMsg };
        }
        
        // Validate customer ID format (should be 10 digits without dashes)
        if (!/^\d{10}$/.test(customerIdForApi)) {
            const errorMsg = `Customer ID format is invalid. Expected 10 digits, got: "${customerIdForApi}" (length: ${customerIdForApi.length})`;
            console.error('❌', errorMsg);
            if (saveErrorLogFunction) {
                saveErrorLogFunction('error', errorMsg, null, 'googleAds.sendConversion');
            }
            return { success: false, reason: 'invalid_customer_id_format', error: errorMsg };
        }
        
        console.log('📊 [Google Ads] Creating Customer instance with ID (no dashes, as string):', customerIdForApi);
        console.log('📊 [Google Ads] Original format (with dashes):', customerIdValue);
        console.log('📊 [Google Ads] Customer ID type:', typeof customerIdForApi);
        
        // Create customer instance with dash-less format (required by Google Ads API)
        // Ensure it's a string, not a number
        // google-ads-api package expects customer_id as string without dashes
        // For Manager Accounts, we might need to set login_customer_id to the Manager Account ID
        // But since we're using the Manager Account ID as customer_id, we might not need it
        const customerConfig = {
            customer_id: customerIdForApi, // Must be without dashes and as string
            refresh_token: REFRESH_TOKEN,
        };
        
        // If the customer_id is a Manager Account and we're accessing a sub-account,
        // we would set login_customer_id to the Manager Account ID
        // But since we're using Manager Account ID directly, we don't need it
        // Uncomment if accessing a sub-account:
        // customerConfig.login_customer_id = customerIdForApi; // Manager Account ID
        
        console.log('📊 [Google Ads] Customer config:', {
            customer_id: customerIdForApi,
            customer_id_type: typeof customerIdForApi,
            customer_id_length: customerIdForApi.length,
            is_10_digits: /^\d{10}$/.test(customerIdForApi),
            has_refresh_token: !!REFRESH_TOKEN,
            has_login_customer_id: !!customerConfig.login_customer_id
        });
        
        // Validate customer config before creating instance
        if (!customerConfig.customer_id || customerConfig.customer_id.trim() === '') {
            const errorMsg = 'Customer ID is empty in customerConfig before creating Customer instance';
            console.error('❌', errorMsg);
            console.error('❌ [Google Ads] customerConfig:', JSON.stringify(customerConfig, null, 2));
            if (saveErrorLogFunction) {
                saveErrorLogFunction('error', errorMsg, null, 'googleAds.sendConversion');
            }
            return { success: false, reason: 'empty_customer_id_in_config', error: errorMsg };
        }
        
        const customer = client.Customer(customerConfig);
        console.log('📊 [Google Ads] Customer instance created successfully');
        console.log('📊 [Google Ads] Customer instance type:', typeof customer);
        console.log('📊 [Google Ads] Customer instance constructor:', customer.constructor.name);
        
        // Verify customer instance was created with customer_id
        if (customer && typeof customer.customer_id !== 'undefined') {
            console.log('📊 [Google Ads] Customer instance customer_id:', customer.customer_id);
            if (customer.customer_id && customer.customer_id.trim() === '') {
                console.warn('⚠️ [Google Ads] Customer instance customer_id is empty string!');
            }
        } else {
            console.warn('⚠️ [Google Ads] Customer instance does not have customer_id property');
        }

        // Prepare conversion date/time
        const conversionTime = conversionDateTime 
            ? new Date(conversionDateTime)
            : new Date();

        // Select conversion action ID based on funnel_type + experience_type (GA_Flight_Purchase_*, GA_Voucher_Purchase_*)
        // Fallback to single CONVERSION_ID if specific IDs not configured
        let conversionActionId = CONVERSION_ID;
        const isFlight = funnelType === 'booking';
        const isVoucher = funnelType === 'voucher' || funnelType === 'gift';
        const isShared = experienceType === 'shared';
        const isPrivate = experienceType === 'private';
        if (isFlight && isShared && CONVERSION_ID_FLIGHT_SHARED) conversionActionId = CONVERSION_ID_FLIGHT_SHARED;
        else if (isFlight && isPrivate && CONVERSION_ID_FLIGHT_PRIVATE) conversionActionId = CONVERSION_ID_FLIGHT_PRIVATE;
        else if (isVoucher && isShared && CONVERSION_ID_VOUCHER_SHARED) conversionActionId = CONVERSION_ID_VOUCHER_SHARED;
        else if (isVoucher && isPrivate && CONVERSION_ID_VOUCHER_PRIVATE) conversionActionId = CONVERSION_ID_VOUCHER_PRIVATE;

        // Build conversion action resource name
        // google-ads-api package automatically adds customer_id from Customer instance
        // So we need to use the full resource name format: customers/{customer_id}/conversionActions/{conversion_action_id}
        // Customer ID must be WITHOUT dashes (format: customers/XXXXXXXXXX/conversionActions/ID)
        const conversionActionResourceName = `customers/${customerIdForApi}/conversionActions/${conversionActionId}`;
        console.log('📊 [Google Ads] Conversion Action Resource Name:', conversionActionResourceName);
        console.log('📊 [Google Ads] Customer ID in resource name (no dashes):', customerIdForApi);
        console.log('📊 [Google Ads] Using CONVERSION_ID:', CONVERSION_ID);
        console.log('📊 [Google Ads] Note: CONVERSION_ID should be the Conversion Action ID (ctId) from the conversion action detail page URL');

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
        console.log('📊 [Google Ads] Customer instance customer_id before upload:', customer.customer_id || 'NOT SET');
        console.log('📊 [Google Ads] Customer instance customer_id type:', typeof customer.customer_id);
        
        try {
            // Log the customer instance details before API call
            console.log('📊 [Google Ads] About to call uploadClickConversions');
            console.log('📊 [Google Ads] Customer instance:', {
                type: typeof customer,
                constructor: customer.constructor.name,
                hasConversionUploads: !!customer.conversionUploads,
                conversionUploadsType: typeof customer.conversionUploads
            });
            console.log('📊 [Google Ads] Conversion data:', {
                conversion_action: conversionData.conversion_action,
                order_id: conversionData.order_id,
                conversion_value: conversionData.conversion_value,
                currency_code: conversionData.currency_code
            });
            
            // Call uploadClickConversions
            // The customer instance should automatically use the customer_id we passed
            // Log customer_id one more time before API call to ensure it's set
            console.log('📊 [Google Ads] Final verification before API call:');
            console.log('  - customerIdForApi:', customerIdForApi);
            console.log('  - customer.customer_id:', customer.customer_id || 'NOT SET');
            console.log('  - conversion_action resource:', conversionData.conversion_action);
            
            // Ensure customer_id is in the conversion_action resource name
            if (!conversionData.conversion_action.includes(customerIdForApi)) {
                const errorMsg = `Customer ID ${customerIdForApi} not found in conversion_action resource name: ${conversionData.conversion_action}`;
                console.error('❌', errorMsg);
                if (saveErrorLogFunction) {
                    saveErrorLogFunction('error', errorMsg, null, 'googleAds.sendConversion');
                }
                return { success: false, reason: 'customer_id_mismatch', error: errorMsg };
            }
            
            // IMPORTANT: customer_id must be explicitly included in the request
            // The google-ads-api package requires customer_id to be passed in the request object
            const uploadRequest = {
                customer_id: customerIdForApi, // Explicitly pass customer_id (without dashes, as string)
                conversions: [conversionData],
                partial_failure: false,
            };
            
            console.log('📊 [Google Ads] Upload request prepared:', {
                customer_id: uploadRequest.customer_id,
                customer_id_length: uploadRequest.customer_id.length,
                conversions_count: uploadRequest.conversions.length,
                partial_failure: uploadRequest.partial_failure
            });
            
            const response = await customer.conversionUploads.uploadClickConversions(uploadRequest);

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

