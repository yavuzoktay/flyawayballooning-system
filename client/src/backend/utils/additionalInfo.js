export const parseAdditionalInfoJson = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch (error) {
            return null;
        }
    }
    return typeof value === 'object' ? value : null;
};

const hasMeaningfulValue = (value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'boolean') return true;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return false;
};

const getFirstMeaningfulValue = (...candidates) => {
    for (const candidate of candidates) {
        if (!hasMeaningfulValue(candidate)) continue;
        if (typeof candidate === 'string') {
            return candidate.trim();
        }
        return candidate;
    }
    return null;
};

const buildQuestionAnswerPayload = (answers = []) => {
    const payload = {};

    if (!Array.isArray(answers)) {
        return payload;
    }

    answers.forEach((answer) => {
        const questionId = Number.parseInt(answer?.question_id, 10);
        if (!questionId) return;

        const answerValue = answer?.answer;
        if (!hasMeaningfulValue(answerValue)) return;

        payload[`question_${questionId}`] =
            typeof answerValue === 'string' ? answerValue.trim() : answerValue;
    });

    return payload;
};

const normalizePreferValue = (...candidates) => {
    for (const candidate of candidates) {
        if (!hasMeaningfulValue(candidate)) continue;

        if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
            return { ...candidate };
        }

        if (typeof candidate === 'string') {
            return candidate.trim();
        }

        return candidate;
    }

    return null;
};

export const buildPreservedAdditionalInfoPayload = ({
    additionalInformation,
    additionalInformationJson,
    answers,
    legacy,
    booking,
    voucher
} = {}) => {
    const voucherJson = parseAdditionalInfoJson(voucher?.additional_information_json);
    const additionalJson = parseAdditionalInfoJson(additionalInformation?.additional_information_json);
    const bookingJson = parseAdditionalInfoJson(booking?.additional_information_json);
    const explicitJson = parseAdditionalInfoJson(additionalInformationJson);
    const answerPayload = buildQuestionAnswerPayload([
        ...(Array.isArray(additionalInformation?.answers) ? additionalInformation.answers : []),
        ...(Array.isArray(answers) ? answers : [])
    ]);
    const mergedLegacy = {
        ...(voucher?.additional_information?.legacy || {}),
        ...(additionalInformation?.legacy || {}),
        ...(legacy || {})
    };

    const payload = {
        ...(voucherJson && typeof voucherJson === 'object' ? voucherJson : {}),
        ...(additionalJson && typeof additionalJson === 'object' ? additionalJson : {}),
        ...(bookingJson && typeof bookingJson === 'object' ? bookingJson : {}),
        ...(explicitJson && typeof explicitJson === 'object' ? explicitJson : {}),
        ...answerPayload
    };

    const notes = getFirstMeaningfulValue(
        explicitJson?.notes,
        bookingJson?.notes,
        additionalJson?.notes,
        voucherJson?.notes,
        mergedLegacy?.additional_notes,
        booking?.additional_notes,
        voucher?.additional_notes
    );
    if (notes !== null) {
        payload.notes = notes;
    }

    const hearAboutUs = getFirstMeaningfulValue(
        explicitJson?.hearAboutUs,
        explicitJson?.hear_about_us,
        bookingJson?.hearAboutUs,
        bookingJson?.hear_about_us,
        additionalJson?.hearAboutUs,
        additionalJson?.hear_about_us,
        voucherJson?.hearAboutUs,
        voucherJson?.hear_about_us,
        booking?.hear_about_us,
        mergedLegacy?.hear_about_us,
        voucher?.hear_about_us
    );
    if (hearAboutUs !== null) {
        payload.hearAboutUs = hearAboutUs;
    }

    const reason = getFirstMeaningfulValue(
        explicitJson?.reason,
        explicitJson?.ballooning_reason,
        bookingJson?.reason,
        bookingJson?.ballooning_reason,
        additionalJson?.reason,
        additionalJson?.ballooning_reason,
        voucherJson?.reason,
        voucherJson?.ballooning_reason,
        booking?.ballooning_reason,
        mergedLegacy?.ballooning_reason,
        voucher?.ballooning_reason
    );
    if (reason !== null) {
        payload.reason = reason;
    }

    const prefer = normalizePreferValue(
        explicitJson?.prefer,
        bookingJson?.prefer,
        additionalJson?.prefer,
        voucherJson?.prefer,
        booking?.prefer,
        mergedLegacy?.prefer,
        voucher?.prefer
    );
    if (prefer !== null) {
        payload.prefer = prefer;
    }

    return payload;
};
