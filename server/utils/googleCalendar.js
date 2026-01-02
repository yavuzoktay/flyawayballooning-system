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

        // Format title: [Location] – [Private/Shared] – [Guest Count]
        const flightTypeLabel = flightData.flightType === 'Private Charter' || flightData.flightType === 'Private' 
            ? 'Private' 
            : 'Shared';
        const title = `${flightData.location} – ${flightTypeLabel} – ${flightData.passengerCount} Guest${flightData.passengerCount !== 1 ? 's' : ''}`;

        // Build description - Format: Total Passengers, Booking ID, Crew, Pilot
        let description = `Total Passengers: ${flightData.passengerCount}\n`;
        if (flightData.bookingId) {
            description += `Booking ID: ${flightData.bookingId}\n`;
        }
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

        // Parse flight date
        const flightDateTime = new Date(flightData.flightDate);
        const endDateTime = new Date(flightDateTime);
        endDateTime.setHours(endDateTime.getHours() + 2); // 2 hour flight duration

        // Format title: [Location] – [Private/Shared] – [Guest Count]
        const flightTypeLabel = flightData.flightType === 'Private Charter' || flightData.flightType === 'Private' 
            ? 'Private' 
            : 'Shared';
        const title = `${flightData.location} – ${flightTypeLabel} – ${flightData.passengerCount} Guest${flightData.passengerCount !== 1 ? 's' : ''}`;

        // Build description - Format: Total Passengers, Booking ID, Crew, Pilot
        let description = `Total Passengers: ${flightData.passengerCount}\n`;
        if (flightData.bookingId) {
            description += `Booking ID: ${flightData.bookingId}\n`;
        }
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

        await calendar.events.update({
            calendarId: calendarId,
            eventId: eventId,
            resource: updatedEvent,
        });

        console.log('✅ Google Calendar event updated:', eventId);
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
 * @returns {Promise<void>}
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
    } catch (error) {
        // If event not found, that's okay (might have been deleted manually)
        if (error.code === 404) {
            console.log('⚠️ Google Calendar event not found (may have been deleted):', eventId);
            return;
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

module.exports = {
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    setSaveErrorLog,
};

