const PHONE_FIELD_KEYS = [
    'phone',
    'mobile',
    'number',
    'customer_phone',
    'passenger_phone',
    'booking_phone',
    'purchaser_phone',
    'purchaser_mobile',
    'recipient_phone',
    'recipient_mobile'
];

const PHONE_ARRAY_KEYS = [
    'passengers',
    'passenger_details',
    'voucher_passenger_details',
    'additional_passengers'
];

export const compactPhoneNumber = (value = '') => {
    if (value === null || value === undefined) return '';
    return String(value)
        .trim()
        .replace(/[^\d+]/g, '')
        .replace(/(?!^)\+/g, '');
};

export const normalizeUkPhoneForSms = (value = '') => {
    let phone = compactPhoneNumber(value);
    if (!phone) return '';

    if (phone.startsWith('00')) {
        phone = `+${phone.slice(2)}`;
    }

    if (phone.startsWith('44') && !phone.startsWith('+')) {
        phone = `+${phone}`;
    }

    if (phone.startsWith('+44')) {
        const afterCountryCode = phone.slice(3);
        if (/^0\d{9,10}$/.test(afterCountryCode)) {
            return `+44${afterCountryCode.replace(/^0/, '')}`;
        }
        return phone;
    }

    if (phone.startsWith('0')) {
        return `+44${phone.slice(1)}`;
    }

    if (/^7\d{8,9}$/.test(phone)) {
        return `+44${phone}`;
    }

    return phone;
};

export const isUkPhoneNumber = (value = '') => {
    const normalized = normalizeUkPhoneForSms(value);
    return /^\+44\d{9,10}$/.test(normalized);
};

export const isNonUkPhoneNumber = (value = '') => {
    const compact = compactPhoneNumber(value);
    if (!compact) return false;

    const normalized = normalizeUkPhoneForSms(compact);
    if (isUkPhoneNumber(normalized)) return false;
    if (compact.startsWith('+44') || compact.startsWith('0044')) return false;

    const internationalNumber = compact.startsWith('+') || compact.startsWith('00');
    if (internationalNumber) return true;

    const digits = compact.replace(/\D/g, '');
    if (digits.startsWith('44') && digits.length >= 11) return false;
    if (digits.startsWith('0') || /^7\d{8,9}$/.test(digits)) return false;

    return digits.length >= 8;
};

const addPhoneCandidate = (candidates, value) => {
    if (value === null || value === undefined) return;
    const raw = String(value).trim();
    if (!raw) return;
    candidates.push(raw);
};

const collectPhoneCandidates = (source, candidates, seen) => {
    if (!source || typeof source !== 'object' || seen.has(source)) return;
    seen.add(source);

    PHONE_FIELD_KEYS.forEach((key) => addPhoneCandidate(candidates, source[key]));

    PHONE_ARRAY_KEYS.forEach((key) => {
        if (!Array.isArray(source[key])) return;
        source[key].forEach((entry) => collectPhoneCandidates(entry, candidates, seen));
    });

    if (source._original && source._original !== source) {
        collectPhoneCandidates(source._original, candidates, seen);
    }
};

export const getPhoneCandidatesFromRecord = (record = {}) => {
    const candidates = [];
    collectPhoneCandidates(record, candidates, new WeakSet());
    return [...new Set(candidates)];
};

export const recordHasNonUkPhoneNumber = (record = {}) => {
    if (record?.is_foreign_customer === true || record?.is_foreign_customer === 1 || record?.is_foreign_customer === '1') {
        return true;
    }

    return getPhoneCandidatesFromRecord(record).some(isNonUkPhoneNumber);
};
