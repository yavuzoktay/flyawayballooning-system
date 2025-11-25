const BALLOON_210_CAPACITY = 8;
const BALLOON_105_CAPACITY = 4;

const parseIntSafe = (value, fallback = 0) => {
    if (value === null || value === undefined) return fallback;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

const getExperienceLabel = (booking = {}) => {
    const experience = booking.experience || booking.flight_type || booking.flight_type_source || '';
    return typeof experience === 'string' ? experience.trim().toLowerCase() : '';
};

const resolvePassengerCount = (booking = {}) => {
    if (Array.isArray(booking.passengers) && booking.passengers.length) {
        return booking.passengers.length;
    }
    return parseIntSafe(
        booking.pax ||
        booking.passenger_count ||
        booking.passengerCount ||
        booking.number_of_passengers,
        0
    );
};

const getAssignedResourceInfo = (booking = {}) => {
    const experienceLabel = getExperienceLabel(booking);
    const passengerCount = resolvePassengerCount(booking);
    const isPrivate = experienceLabel.includes('private');

    if (isPrivate && passengerCount > 0 && passengerCount <= BALLOON_105_CAPACITY) {
        return {
            key: 'BALLOON_105',
            resourceName: 'Balloon 105',
            capacity: BALLOON_105_CAPACITY,
            passengerCount,
            exclusiveUse: true,
            remainingSeats: Math.max(0, BALLOON_105_CAPACITY - passengerCount)
        };
    }

    return {
        key: 'BALLOON_210',
        resourceName: 'Balloon 210',
        capacity: BALLOON_210_CAPACITY,
        passengerCount,
        exclusiveUse: isPrivate && passengerCount >= BALLOON_210_CAPACITY,
        remainingSeats: Math.max(0, BALLOON_210_CAPACITY - passengerCount)
    };
};

module.exports = {
    BALLOON_210_CAPACITY,
    BALLOON_105_CAPACITY,
    getAssignedResourceInfo
};

