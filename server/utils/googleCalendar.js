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
        const calendar = getCalendarClient();
        const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

        // Parse flight date
        const flightDateTime = new Date(flightData.flightDate);
        const endDateTime = new Date(flightDateTime);
        endDateTime.setHours(endDateTime.getHours() + 2); // 2 hour flight duration

        // Format title: [Location] – [Private/Shared] – [Guest Count]
        const flightTypeLabel = flightData.flightType === 'Private Charter' || flightData.flightType === 'Private' 
            ? 'Private' 
            : 'Shared';
        const title = `${flightData.location} – ${flightTypeLabel} – ${flightData.passengerCount} Guest${flightData.passengerCount !== 1 ? 's' : ''}`;

        // Build description
        let description = `Total Passengers: ${flightData.passengerCount}\n`;
        if (flightData.crewMember) {
            description += `Crew Member: ${flightData.crewMember}\n`;
        }
        if (flightData.bookingId) {
            description += `Booking ID: ${flightData.bookingId}`;
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

        const response = await calendar.events.insert({
            calendarId: calendarId,
            resource: event,
        });

        console.log('✅ Google Calendar event created:', response.data.id);
        return response.data.id;
    } catch (error) {
        console.error('❌ Error creating Google Calendar event:', error);
        
        // Save error to logs database
        if (saveErrorLogFunction) {
            const errorMessage = `Google Calendar: Failed to create event for booking ${flightData.bookingId || 'unknown'}`;
            const errorDetails = error.response?.data 
                ? JSON.stringify(error.response.data) 
                : error.message || 'Unknown error';
            const stackTrace = error.stack || `${error.name}: ${error.message}`;
            saveErrorLogFunction('error', `${errorMessage}. Details: ${errorDetails}`, stackTrace, 'googleCalendar.createCalendarEvent');
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

        // Build description
        let description = `Total Passengers: ${flightData.passengerCount}\n`;
        if (flightData.crewMember) {
            description += `Crew Member: ${flightData.crewMember}\n`;
        }
        if (flightData.bookingId) {
            description += `Booking ID: ${flightData.bookingId}`;
        }

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

