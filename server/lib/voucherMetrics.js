const toPositiveInt = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const toNumber = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === 'string') {
        const normalized = value.replace(',', '.').replace(/[^0-9.\-]/g, '').trim();
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value === 'boolean') {
        return value ? 1 : 0;
    }
    return 0;
};

const sumPassengerPrices = (list) => {
    if (!Array.isArray(list)) return 0;
    return list.reduce((sum, passenger) => {
        if (!passenger || typeof passenger !== 'object') return sum;
        const priceCandidate =
            passenger.price ??
            passenger.totalPrice ??
            passenger.total_price ??
            passenger.amount ??
            passenger.totalAmount;
        const price = toNumber(priceCandidate);
        return price > 0 ? sum + price : sum;
    }, 0);
};

const parsePassengerList = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            console.warn('parsePassengerList: failed to parse string payload:', err?.message || err);
            return [];
        }
    }
    return [];
};

const derivePaidAmount = ({
    paidValue,
    passengerDetails,
    voucherPassengerDetails,
    passengerCount,
    pricePerPassenger,
    includePriceFallback = true
}) => {
    const paidFromRow = toNumber(paidValue);
    if (paidFromRow > 0) return paidFromRow;

    const fromPassengers = sumPassengerPrices(passengerDetails);
    if (fromPassengers > 0) return fromPassengers;

    const fromVoucherPassengers = sumPassengerPrices(voucherPassengerDetails);
    if (fromVoucherPassengers > 0) return fromVoucherPassengers;

    if (includePriceFallback) {
        const unitPrice = toNumber(pricePerPassenger);
        if (unitPrice > 0 && passengerCount && passengerCount > 0) {
            return unitPrice * passengerCount;
        }
    }

    return 0;
};

module.exports = {
    parsePassengerList,
    derivePaidAmount
};

