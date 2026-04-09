import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const SLASH_AND_DASH_DATE_FORMATS = [
    'DD/MM/YYYY HH:mm:ss',
    'DD/MM/YYYY HH:mm',
    'DD/MM/YYYY',
    'D/M/YYYY HH:mm:ss',
    'D/M/YYYY HH:mm',
    'D/M/YYYY',
    'DD/MM/YY HH:mm:ss',
    'DD/MM/YY HH:mm',
    'DD/MM/YY',
    'D/M/YY HH:mm:ss',
    'D/M/YY HH:mm',
    'D/M/YY',
    'DD-MM-YYYY HH:mm:ss',
    'DD-MM-YYYY HH:mm',
    'DD-MM-YYYY',
    'D-M-YYYY HH:mm:ss',
    'D-M-YYYY HH:mm',
    'D-M-YYYY',
    'DD-MM-YY HH:mm:ss',
    'DD-MM-YY HH:mm',
    'DD-MM-YY',
    'D-M-YY HH:mm:ss',
    'D-M-YY HH:mm',
    'D-M-YY'
];

export const parseAdminDate = (value) => {
    if (!value) return null;

    if (dayjs.isDayjs(value)) {
        return value.isValid() ? value : null;
    }

    if (value instanceof Date) {
        const parsedDate = dayjs(value);
        return parsedDate.isValid() ? parsedDate : null;
    }

    const rawValue = String(value).trim();
    if (!rawValue) return null;

    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(rawValue)) {
        const slashOrDashParsed = dayjs(rawValue, SLASH_AND_DASH_DATE_FORMATS, true);
        if (slashOrDashParsed.isValid()) {
            return slashOrDashParsed;
        }
    }

    if (/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?/.test(rawValue)) {
        const normalizedIsoLike = rawValue.includes('T') ? rawValue : rawValue.replace(' ', 'T');
        const isoParsed = dayjs(normalizedIsoLike);
        if (isoParsed.isValid()) {
            return isoParsed;
        }
    }

    const fallbackParsed = dayjs(rawValue);
    return fallbackParsed.isValid() ? fallbackParsed : null;
};

export const formatAdminDate = (value, format = 'DD/MM/YYYY') => {
    const parsedDate = parseAdminDate(value);
    if (!parsedDate) return value ? String(value) : '';
    return parsedDate.format(format);
};

export const isAdminDateExpired = (value, referenceDate = dayjs()) => {
    const parsedDate = parseAdminDate(value);
    if (!parsedDate) return false;

    const reference = dayjs.isDayjs(referenceDate) ? referenceDate : dayjs(referenceDate);
    if (!reference.isValid()) return false;

    return parsedDate.endOf('day').isBefore(reference.startOf('day'));
};

