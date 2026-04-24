const { google } = require('googleapis');
require('dotenv').config();

// Function to save error logs (will be passed from index.js)
let saveErrorLogFunction = null;

const parsePositiveInt = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const GOOGLE_CALENDAR_MIN_REQUEST_INTERVAL_MS = parsePositiveInt(
    process.env.GOOGLE_CALENDAR_MIN_REQUEST_INTERVAL_MS,
    300
);
const GOOGLE_CALENDAR_MAX_RETRY_ATTEMPTS = parsePositiveInt(
    process.env.GOOGLE_CALENDAR_MAX_RETRY_ATTEMPTS,
    5
);
const GOOGLE_CALENDAR_BASE_RETRY_DELAY_MS = parsePositiveInt(
    process.env.GOOGLE_CALENDAR_BASE_RETRY_DELAY_MS,
    750
);
const GOOGLE_CALENDAR_MAX_RETRY_DELAY_MS = parsePositiveInt(
    process.env.GOOGLE_CALENDAR_MAX_RETRY_DELAY_MS,
    30000
);
const GOOGLE_CALENDAR_ACCESS_CACHE_TTL_MS = parsePositiveInt(
    process.env.GOOGLE_CALENDAR_ACCESS_CACHE_TTL_MS,
    10 * 60 * 1000
);

let googleCalendarRequestQueue = Promise.resolve();
let lastGoogleCalendarRequestAt = 0;
let googleCalendarPauseUntil = 0;
const calendarAccessVerifiedAt = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getCalendarErrorPayload = (error) => error?.response?.data?.error || error?.errors || null;

const getCalendarErrorCode = (error) => {
    const payload = getCalendarErrorPayload(error);
    return payload?.code || error?.response?.status || error?.status || error?.code;
};

const getCalendarErrorReason = (error) => {
    const payload = getCalendarErrorPayload(error);
    return payload?.errors?.[0]?.reason || payload?.reason || error?.reason || null;
};

const getCalendarErrorMessage = (error) => {
    const payload = getCalendarErrorPayload(error);
    return String(payload?.message || error?.message || 'Unknown error');
};

const isRateLimitedCalendarError = (error) => {
    const code = Number(getCalendarErrorCode(error));
    const reason = getCalendarErrorReason(error);
    return (
        code === 429 ||
        reason === 'rateLimitExceeded' ||
        reason === 'userRateLimitExceeded'
    );
};

const isRetryableCalendarError = (error) => {
    const code = Number(getCalendarErrorCode(error));
    return isRateLimitedCalendarError(error) || [500, 502, 503, 504].includes(code);
};

const isCalendarPermissionError = (error) => {
    if (isRateLimitedCalendarError(error)) return false;

    const code = Number(getCalendarErrorCode(error));
    const reason = getCalendarErrorReason(error);
    const message = getCalendarErrorMessage(error);

    return (
        code === 403 &&
        (
            reason === 'forbidden' ||
            reason === 'insufficientPermissions' ||
            message.includes('writer access') ||
            message.includes('requiredAccessLevel')
        )
    );
};

const getHeaderValue = (headers, name) => {
    if (!headers) return null;
    if (typeof headers.get === 'function') return headers.get(name);
    return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || null;
};

const getRetryAfterDelayMs = (error) => {
    const headers = error?.response?.headers || error?.headers;
    const retryAfter = getHeaderValue(headers, 'retry-after');
    if (!retryAfter) return null;

    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
        return seconds * 1000;
    }

    const retryDate = Date.parse(retryAfter);
    if (Number.isFinite(retryDate)) {
        return Math.max(0, retryDate - Date.now());
    }

    return null;
};

const calculateRetryDelayMs = (attempt, error) => {
    const retryAfterDelay = getRetryAfterDelayMs(error);
    if (retryAfterDelay !== null) {
        return Math.min(retryAfterDelay, GOOGLE_CALENDAR_MAX_RETRY_DELAY_MS);
    }

    const exponentialDelay = GOOGLE_CALENDAR_BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
    const jitterMultiplier = 0.75 + Math.random() * 0.5;
    return Math.min(
        Math.round(exponentialDelay * jitterMultiplier),
        GOOGLE_CALENDAR_MAX_RETRY_DELAY_MS
    );
};

const runQueuedGoogleCalendarRequest = async (operationName, requestFunction) => {
    const runRequest = async () => {
        const now = Date.now();
        const waitUntil = Math.max(
            lastGoogleCalendarRequestAt + GOOGLE_CALENDAR_MIN_REQUEST_INTERVAL_MS,
            googleCalendarPauseUntil
        );
        const waitMs = Math.max(0, waitUntil - now);

        if (waitMs > 0) {
            await sleep(waitMs);
        }

        lastGoogleCalendarRequestAt = Date.now();
        return requestFunction();
    };

    const queuedRequest = googleCalendarRequestQueue.then(runRequest, runRequest);
    googleCalendarRequestQueue = queuedRequest.catch(() => {});

    return queuedRequest;
};

const executeGoogleCalendarRequest = async (operationName, requestFunction) => {
    for (let attempt = 1; attempt <= GOOGLE_CALENDAR_MAX_RETRY_ATTEMPTS; attempt += 1) {
        try {
            return await runQueuedGoogleCalendarRequest(operationName, requestFunction);
        } catch (error) {
            if (!isRetryableCalendarError(error) || attempt >= GOOGLE_CALENDAR_MAX_RETRY_ATTEMPTS) {
                throw error;
            }

            const delayMs = calculateRetryDelayMs(attempt, error);
            googleCalendarPauseUntil = Math.max(googleCalendarPauseUntil, Date.now() + delayMs);

            console.warn(
                `⚠️ [googleCalendar] ${operationName} hit a retryable Calendar API error (${getCalendarErrorReason(error) || getCalendarErrorCode(error)}). ` +
                `Retrying in ${delayMs}ms (attempt ${attempt + 1}/${GOOGLE_CALENDAR_MAX_RETRY_ATTEMPTS}).`
            );

            await sleep(delayMs);
        }
    }
};

const verifyCalendarAccess = async (calendar, calendarId) => {
    const lastVerifiedAt = calendarAccessVerifiedAt.get(calendarId);
    if (lastVerifiedAt && Date.now() - lastVerifiedAt < GOOGLE_CALENDAR_ACCESS_CACHE_TTL_MS) {
        console.log('📅 [createCalendarEvent] Calendar access verified from cache');
        return;
    }

    await executeGoogleCalendarRequest(
        'calendars.get',
        () => calendar.calendars.get({ calendarId: calendarId })
    );
    calendarAccessVerifiedAt.set(calendarId, Date.now());
};

/**
 * Set the saveErrorLog function from the main server file
 * @param {Function} saveErrorLog - Function to save error logs
 */
const setSaveErrorLog = (saveErrorLog) => {
    saveErrorLogFunction = saveErrorLog;
};

// Initialize Google Calendar API
const getCalendarClient = () => {
    const auth = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        null,
        process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/calendar']
    );

    return google.calendar({ version: 'v3', auth });
};

/**
 * Create a Google Calendar event for a flight booking
 * @param {Object} flightData - Flight booking data
 * @param {string} flightData.location - Flight location (e.g., "Bath")
 * @param {string} flightData.flightType - "Private" or "Shared"
 * @param {number} flightData.passengerCount - Total number of passengers
 * @param {string} flightData.flightDate - Flight date in format "YYYY-MM-DD HH:mm:ss"
 * @param {string} flightData.crewMember - Assigned crew member name (optional)
 * @param {string} flightData.bookingId - Booking ID for reference
 * @returns {Promise<string>} - Google Calendar event ID
 */
const createCalendarEvent = async (flightData) => {
    try {
        console.log('📅 [createCalendarEvent] Starting event creation with data:', {
            location: flightData.location,
            flightType: flightData.flightType,
            passengerCount: flightData.passengerCount,
            flightDate: flightData.flightDate,
            bookingId: flightData.bookingId
        });
        
        // Check environment variables
        const hasClientEmail = !!process.env.GOOGLE_CLIENT_EMAIL;
        const hasPrivateKey = !!process.env.GOOGLE_PRIVATE_KEY;
        const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
        
        console.log('📅 [createCalendarEvent] Environment check:', {
            hasClientEmail,
            hasPrivateKey,
            calendarId: calendarId || 'primary (default)',
            clientEmail: process.env.GOOGLE_CLIENT_EMAIL || 'NOT SET'
        });
        
        if (!hasClientEmail || !hasPrivateKey) {
            const errorMsg = 'Google Calendar environment variables not configured. GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY missing.';
            console.error('❌ [createCalendarEvent]', errorMsg);
            throw new Error(errorMsg);
        }
        
        // Validate calendar ID format
        if (!calendarId || calendarId.trim() === '') {
            const errorMsg = 'GOOGLE_CALENDAR_ID is not set. Please set it to the calendar email address (e.g., info@flyawayballooning.com)';
            console.error('❌ [createCalendarEvent]', errorMsg);
            throw new Error(errorMsg);
        }
        
        const calendar = getCalendarClient();
        console.log('📅 [createCalendarEvent] Calendar client initialized');
        
        // Test calendar access before creating event
        try {
            console.log('📅 [createCalendarEvent] Testing calendar access for:', calendarId);
            await verifyCalendarAccess(calendar, calendarId);
            console.log('✅ [createCalendarEvent] Calendar access verified');
        } catch (accessError) {
            const accessErrorMsg = getCalendarErrorMessage(accessError);
            if (isCalendarPermissionError(accessError)) {
                const detailedError = `Google Calendar permission error: Service account '${process.env.GOOGLE_CLIENT_EMAIL}' does not have writer access to calendar '${calendarId}'. Please: 1) Share the calendar with the service account email, 2) Grant 'Make changes to events' permission (not just 'See only free/busy').`;
                console.error('❌ [createCalendarEvent]', detailedError);
                throw new Error(detailedError);
            }
            if (isRetryableCalendarError(accessError)) {
                throw accessError;
            }
            // If it's a different error (like 404), log it but continue
            console.warn('⚠️ [createCalendarEvent] Calendar access check failed (non-critical):', accessErrorMsg);
        }

        // Parse flight date
        const flightDateTime = new Date(flightData.flightDate);
        const endDateTime = new Date(flightDateTime);
        endDateTime.setHours(endDateTime.getHours() + 2); // 2 hour flight duration
        
        console.log('📅 [createCalendarEvent] Flight times:', {
            start: flightDateTime.toISOString(),
            end: endDateTime.toISOString()
        });

        // Format title: [Location] – [Private/Shared] – x [Count]
        const flightTypeLabel = flightData.flightType === 'Private Charter' || flightData.flightType === 'Private' || flightData.flightType === 'Private Flight'
            ? 'Private' 
            : 'Shared';
        const title = `${flightData.location} – ${flightTypeLabel} – x ${flightData.passengerCount}`;

        // Build description - Format: Total Passengers, Crew, Pilot
        let description = `Total Passengers: ${flightData.passengerCount}\n`;
        if (flightData.crewMember) {
            description += `Crew: ${flightData.crewMember}\n`;
        }
        if (flightData.pilotMember) {
            description += `Pilot: ${flightData.pilotMember}`;
        }

        const event = {
            summary: title,
            description: description,
            start: {
                dateTime: flightDateTime.toISOString(),
                timeZone: 'Europe/London',
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: 'Europe/London',
            },
            source: {
                title: 'Fly Away Ballooning Booking System',
                url: process.env.BOOKING_SYSTEM_URL || 'https://flyawayballooning-system.com',
            },
        };

        console.log('📅 [createCalendarEvent] Sending event to Google Calendar API...');
        console.log('📅 [createCalendarEvent] Event data:', JSON.stringify(event, null, 2));
        console.log('📅 [createCalendarEvent] Target calendar ID:', calendarId);
        
        const response = await executeGoogleCalendarRequest(
            'events.insert',
            () => calendar.events.insert({
                calendarId: calendarId,
                resource: event,
            })
        );

        console.log('✅ [createCalendarEvent] Google Calendar event created successfully!');
        console.log('✅ [createCalendarEvent] Event ID:', response.data.id);
        console.log('✅ [createCalendarEvent] Event link:', response.data.htmlLink);
        return response.data.id;
    } catch (error) {
        console.error('❌ Error creating Google Calendar event:', error);
        
        // Check for specific permission errors
        const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
        const errorCode = error.response?.data?.error?.code || error.code;
        
        let detailedErrorMessage = `Google Calendar: Failed to create event for booking ${flightData.bookingId || 'unknown'}`;
        
        if (isCalendarPermissionError(error)) {
            detailedErrorMessage += `. PERMISSION ERROR: Service account '${process.env.GOOGLE_CLIENT_EMAIL || 'NOT SET'}' needs 'Make changes to events' permission on calendar '${process.env.GOOGLE_CALENDAR_ID || 'NOT SET'}'. `;
            detailedErrorMessage += `Please: 1) Go to Google Calendar settings, 2) Share the calendar with service account email, 3) Grant 'Make changes to events' permission (NOT 'See only free/busy').`;
        } else if (errorCode === 404) {
            detailedErrorMessage += `. CALENDAR NOT FOUND: Calendar '${process.env.GOOGLE_CALENDAR_ID || 'NOT SET'}' not found. Please check GOOGLE_CALENDAR_ID environment variable.`;
        } else {
            const errorDetails = error.response?.data 
                ? JSON.stringify(error.response.data) 
                : errorMessage;
            detailedErrorMessage += `. Details: ${errorDetails}`;
        }
        
        // Save error to logs database
        if (saveErrorLogFunction) {
            const stackTrace = error.stack || `${error.name}: ${error.message}`;
            saveErrorLogFunction('error', detailedErrorMessage, stackTrace, 'googleCalendar.createCalendarEvent');
        }
        
        throw error;
    }
};

/**
 * Update a Google Calendar event
 * @param {string} eventId - Google Calendar event ID
 * @param {Object} flightData - Updated flight booking data
 * @returns {Promise<void>}
 */
const updateCalendarEvent = async (eventId, flightData) => {
    try {
        const calendar = getCalendarClient();
        const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
        console.log('📅 [updateCalendarEvent] Received flightData:', JSON.stringify(flightData, null, 2));

        // Parse flight date
        const flightDateTime = new Date(flightData.flightDate);
        const endDateTime = new Date(flightDateTime);
        endDateTime.setHours(endDateTime.getHours() + 2); // 2 hour flight duration

        // Format title: [Location] – [Private/Shared] – x [Count]
        const flightTypeLabel = flightData.flightType === 'Private Charter' || flightData.flightType === 'Private' || flightData.flightType === 'Private Flight'
            ? 'Private' 
            : 'Shared';
        const title = `${flightData.location} – ${flightTypeLabel} – x ${flightData.passengerCount}`;

        // Build description - Format: Total Passengers, Crew, Pilot
        let description = `Total Passengers: ${flightData.passengerCount}\n`;
        if (flightData.crewMember) {
            description += `Crew: ${flightData.crewMember}\n`;
        }
        if (flightData.pilotMember) {
            description += `Pilot: ${flightData.pilotMember}`;
        }

        console.log('📅 [updateCalendarEvent] Building description with data:', {
            passengerCount: flightData.passengerCount,
            bookingId: flightData.bookingId,
            crewMember: flightData.crewMember,
            pilotMember: flightData.pilotMember
        });
        console.log('📅 [updateCalendarEvent] Final description:', description);

        const updatedEvent = {
            summary: title,
            description: description,
            start: {
                dateTime: flightDateTime.toISOString(),
                timeZone: 'Europe/London',
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: 'Europe/London',
            },
        };

        console.log('📅 [updateCalendarEvent] Sending update to Google Calendar API...');
        console.log('📅 [updateCalendarEvent] Updated event description:', updatedEvent.description);
        
        const updateResponse = await executeGoogleCalendarRequest(
            'events.patch',
            () => calendar.events.patch({
                calendarId: calendarId,
                eventId: eventId,
                resource: updatedEvent,
            })
        );

        console.log('✅ [updateCalendarEvent] Google Calendar event updated successfully:', eventId);
        console.log('✅ [updateCalendarEvent] Updated event description in response:', updateResponse.data.description);
        return { success: true };
    } catch (error) {
        const errorCode =
            error?.response?.data?.error?.code ||
            error?.response?.status ||
            error?.status ||
            error?.code;

        if (errorCode === 404) {
            error.googleCalendarEventMissing = true;
            console.warn('⚠️ [updateCalendarEvent] Google Calendar event not found, treating as stale event ID:', eventId);
            throw error;
        }

        console.error('❌ Error updating Google Calendar event:', error);
        
        // Save error to logs database
        if (saveErrorLogFunction) {
            const errorMessage = `Google Calendar: Failed to update event ${eventId || 'unknown'} for booking ${flightData.bookingId || 'unknown'}`;
            const errorDetails = error.response?.data 
                ? JSON.stringify(error.response.data) 
                : error.message || 'Unknown error';
            const stackTrace = error.stack || `${error.name}: ${error.message}`;
            saveErrorLogFunction('error', `${errorMessage}. Details: ${errorDetails}`, stackTrace, 'googleCalendar.updateCalendarEvent');
        }
        
        throw error;
    }
};

/**
 * Delete a Google Calendar event
 * @param {string} eventId - Google Calendar event ID
 * @returns {Promise<{success: boolean, alreadyDeleted?: boolean}>}
 */
const deleteCalendarEvent = async (eventId) => {
    try {
        const calendar = getCalendarClient();
        const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

        await executeGoogleCalendarRequest(
            'events.delete',
            () => calendar.events.delete({
                calendarId: calendarId,
                eventId: eventId,
            })
        );

        console.log('✅ Google Calendar event deleted:', eventId);
        return { success: true };
    } catch (error) {
        // If event not found (404) or already deleted (410), that's okay
        if (error.code === 404 || error.code === 410 || error.status === 404 || error.status === 410) {
            console.log('⚠️ Google Calendar event not found or already deleted (code: ' + (error.code || error.status) + '):', eventId);
            // Return a special indicator that event was already deleted
            return { success: true, alreadyDeleted: true };
        }
        console.error('❌ Error deleting Google Calendar event:', error);
        
        // Save error to logs database
        if (saveErrorLogFunction) {
            const errorMessage = `Google Calendar: Failed to delete event ${eventId || 'unknown'}`;
            const errorDetails = error.response?.data 
                ? JSON.stringify(error.response.data) 
                : error.message || 'Unknown error';
            const stackTrace = error.stack || `${error.name}: ${error.message}`;
            saveErrorLogFunction('error', `${errorMessage}. Details: ${errorDetails}`, stackTrace, 'googleCalendar.deleteCalendarEvent');
        }
        
        throw error;
    }
};

/**
 * Find and delete a Google Calendar event by flight details (when event ID is not available)
 * @param {Object} flightData - Flight booking data
 * @param {string} flightData.location - Flight location (e.g., "Bath")
 * @param {string} flightData.flightType - "Private" or "Shared"
 * @param {number} flightData.passengerCount - Total number of passengers
 * @param {string} flightData.flightDate - Flight date in format "YYYY-MM-DD HH:mm:ss"
 * @returns {Promise<string|null>} - Google Calendar event ID if found and deleted, null otherwise
 */
const findAndDeleteCalendarEventByDetails = async (flightData) => {
    try {
        const calendar = getCalendarClient();
        const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

        // Parse flight date
        const flightDateTime = new Date(flightData.flightDate);
        const endDateTime = new Date(flightDateTime);
        endDateTime.setHours(endDateTime.getHours() + 2); // 2 hour flight duration

        // Format expected title: [Location] – [Private/Shared] – x [Count]
        const flightTypeLabel = flightData.flightType === 'Private Charter' || flightData.flightType === 'Private' || flightData.flightType === 'Private Flight'
            ? 'Private' 
            : 'Shared';
        const expectedTitle = `${flightData.location} – ${flightTypeLabel} – x ${flightData.passengerCount}`;

        console.log('🔍 [findAndDeleteCalendarEventByDetails] Searching for event:', {
            location: flightData.location,
            flightType: flightData.flightType,
            passengerCount: flightData.passengerCount,
            flightDate: flightData.flightDate,
            expectedTitle
        });

        // Search for events on the flight date
        const timeMin = new Date(flightDateTime);
        timeMin.setHours(0, 0, 0, 0);
        const timeMax = new Date(flightDateTime);
        timeMax.setHours(23, 59, 59, 999);

        const response = await executeGoogleCalendarRequest(
            'events.list',
            () => calendar.events.list({
                calendarId: calendarId,
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                maxResults: 100,
                singleEvents: true,
                orderBy: 'startTime',
            })
        );

        if (!response.data.items || response.data.items.length === 0) {
            console.log('⚠️ [findAndDeleteCalendarEventByDetails] No events found for date:', flightData.flightDate);
            return null;
        }

        console.log(`📋 [findAndDeleteCalendarEventByDetails] Found ${response.data.items.length} events for date, searching for matching event...`);
        

        // Find event matching the expected title
        const matchingEvent = response.data.items.find(event => {
            const eventTitle = event.summary || '';
            const matchesTitle = eventTitle === expectedTitle;
            
            
            // Also check if the event time matches (within 1 hour tolerance)
            if (matchesTitle && event.start && event.start.dateTime) {
                const eventStart = new Date(event.start.dateTime);
                const timeDiff = Math.abs(eventStart.getTime() - flightDateTime.getTime());
                const matchesTime = timeDiff < 60 * 60 * 1000; // 1 hour tolerance
                
                
                return matchesTime;
            }
            
            return matchesTitle;
        });

        if (!matchingEvent) {
            console.log('⚠️ [findAndDeleteCalendarEventByDetails] No matching event found. Expected title:', expectedTitle);
            console.log('📋 [findAndDeleteCalendarEventByDetails] Available events:', response.data.items.map(e => ({
                title: e.summary,
                start: e.start?.dateTime,
                id: e.id
            })));
            
            
            return null;
        }

        console.log('✅ [findAndDeleteCalendarEventByDetails] Found matching event:', {
            id: matchingEvent.id,
            title: matchingEvent.summary,
            start: matchingEvent.start?.dateTime
        });

        // Delete the found event
        await deleteCalendarEvent(matchingEvent.id);
        
        return matchingEvent.id;
    } catch (error) {
        console.error('❌ Error finding and deleting Google Calendar event by details:', error);
        
        // Save error to logs database
        if (saveErrorLogFunction) {
            const errorMessage = `Google Calendar: Failed to find and delete event by details for booking ${flightData.bookingId || 'unknown'}`;
            const errorDetails = error.response?.data 
                ? JSON.stringify(error.response.data) 
                : error.message || 'Unknown error';
            const stackTrace = error.stack || `${error.name}: ${error.message}`;
            saveErrorLogFunction('error', `${errorMessage}. Details: ${errorDetails}`, stackTrace, 'googleCalendar.findAndDeleteCalendarEventByDetails');
        }
        
        throw error;
    }
};

module.exports = {
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    findAndDeleteCalendarEventByDetails,
    setSaveErrorLog,
};
