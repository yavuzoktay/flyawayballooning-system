const { google } = require('googleapis');
require('dotenv').config();

// Function to save error logs (will be passed from index.js)
let saveErrorLogFunction = null;

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
            await calendar.calendars.get({ calendarId: calendarId });
            console.log('✅ [createCalendarEvent] Calendar access verified');
        } catch (accessError) {
            const accessErrorMsg = accessError.response?.data?.error?.message || accessError.message;
            if (accessError.code === 403 || accessErrorMsg?.includes('writer access') || accessErrorMsg?.includes('requiredAccessLevel')) {
                const detailedError = `Google Calendar permission error: Service account '${process.env.GOOGLE_CLIENT_EMAIL}' does not have writer access to calendar '${calendarId}'. Please: 1) Share the calendar with the service account email, 2) Grant 'Make changes to events' permission (not just 'See only free/busy').`;
                console.error('❌ [createCalendarEvent]', detailedError);
                throw new Error(detailedError);
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
        const flightTypeLabel = flightData.flightType === 'Private Charter' || flightData.flightType === 'Private' 
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
        
        const response = await calendar.events.insert({
            calendarId: calendarId,
            resource: event,
        });

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
        
        if (errorCode === 403 || errorMessage.includes('writer access') || errorMessage.includes('requiredAccessLevel')) {
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

        // Get existing event first
        const existingEvent = await calendar.events.get({
            calendarId: calendarId,
            eventId: eventId,
        });

        console.log('📅 [updateCalendarEvent] Existing event description:', existingEvent.data.description);
        console.log('📅 [updateCalendarEvent] Received flightData:', JSON.stringify(flightData, null, 2));

        // Parse flight date
        const flightDateTime = new Date(flightData.flightDate);
        const endDateTime = new Date(flightDateTime);
        endDateTime.setHours(endDateTime.getHours() + 2); // 2 hour flight duration

        // Format title: [Location] – [Private/Shared] – x [Count]
        const flightTypeLabel = flightData.flightType === 'Private Charter' || flightData.flightType === 'Private' 
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
            ...existingEvent.data,
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
        
        const updateResponse = await calendar.events.update({
            calendarId: calendarId,
            eventId: eventId,
            resource: updatedEvent,
        });

        console.log('✅ [updateCalendarEvent] Google Calendar event updated successfully:', eventId);
        console.log('✅ [updateCalendarEvent] Updated event description in response:', updateResponse.data.description);
    } catch (error) {
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

        await calendar.events.delete({
            calendarId: calendarId,
            eventId: eventId,
        });

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
        const flightTypeLabel = flightData.flightType === 'Private Charter' || flightData.flightType === 'Private' 
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

        const response = await calendar.events.list({
            calendarId: calendarId,
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            maxResults: 100,
            singleEvents: true,
            orderBy: 'startTime',
        });

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

