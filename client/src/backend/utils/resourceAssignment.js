const RESOURCE_CAPACITY = {
    BALLOON_210: {
        name: 'Balloon 210',
        capacity: 8,
        supports: 'Shared Flight & 8-passenger Private Charter'
    },
    BALLOON_105: {
        name: 'Balloon 105',
        capacity: 4,
        supports: 'Private Charter (up to 4 passengers)'
    }
};

const parseInteger = (value) => {
    if (value === null || value === undefined) return 0;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
};

const resolvePassengerCount = (bookingDetail) => {
    if (!bookingDetail) return 0;
    const booking = bookingDetail.booking || {};
    const fromBooking =
        parseInteger(booking.passenger_count) ||
        parseInteger(booking.pax) ||
        parseInteger(booking.number_of_passengers) ||
        parseInteger(booking.passengerCount);

    if (fromBooking) return fromBooking;

    if (Array.isArray(bookingDetail.passengers) && bookingDetail.passengers.length > 0) {
        return bookingDetail.passengers.length;
    }

    return 0;
};

export const getAssignedResourceInfo = (bookingDetail) => {
    if (!bookingDetail?.booking) return null;

    const booking = bookingDetail.booking;
    const flightTypeRaw = booking.experience || booking.flight_type || '';
    if (!flightTypeRaw) return null;
    const flightType = flightTypeRaw.toString().toLowerCase();
    const passengerCount = resolvePassengerCount(bookingDetail);

    if (flightType.includes('shared')) {
        const { name, capacity } = RESOURCE_CAPACITY.BALLOON_210;
        return {
            resourceName: name,
            capacity,
            passengerCount,
            remainingSeats: Math.max(0, capacity - passengerCount),
            assignmentType: 'Shared Flight',
            exclusiveUse: false,
            description: 'Automatically assigned to all shared flights.'
        };
    }

    if (flightType.includes('private')) {
        if (passengerCount >= 5) {
            const { name, capacity } = RESOURCE_CAPACITY.BALLOON_210;
            return {
                resourceName: name,
                capacity,
                passengerCount,
                remainingSeats: Math.max(0, capacity - passengerCount),
                assignmentType: 'Private Charter (8-passenger)',
                exclusiveUse: true,
                description: 'Reserved exclusively for up to 8 passengers.'
            };
        }

        const { name, capacity } = RESOURCE_CAPACITY.BALLOON_105;
        return {
            resourceName: name,
            capacity,
            passengerCount,
            remainingSeats: Math.max(0, capacity - passengerCount),
            assignmentType: 'Private Charter (up to 4 passengers)',
            exclusiveUse: true,
            description: 'Dedicated private flight capacity.'
        };
    }

    return null;
};

