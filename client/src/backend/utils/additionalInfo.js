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

const normalizePartnerValue = (value) => (value || '').toString().trim().toLowerCase();

const THE_NEWT_ACCOMMODATION_NAME = 'the newt';
const THE_NEWT_CONTACT_EMAIL = 'reservations@thenewtinsomerset.com';
const KALEIDOSCOPE_PROFILE_PATH = '/kaleidoscope';
const KALEIDOSCOPE_PROFILE_LABEL = 'kaleidoscope balloon booking';

const getManualBookingProfileCandidateSources = (source) => {
    if (!source || typeof source !== 'object') {
        return [source];
    }

    return [
        source,
        source.manual_booking_profile,
        source.additional_information_json,
        source.booking_additional_information_json,
        source.additional_information,
        source.additional_information?.additional_information_json,
        source.additional_information?.manual_booking_profile,
        source._original,
        source._original?.manual_booking_profile,
        source._original?.additional_information_json,
        source._original?.booking_additional_information_json,
        source._original?.additional_information,
        source._original?.additional_information?.additional_information_json,
        source._original?.additional_information?.manual_booking_profile
    ];
};

export const getManualBookingProfileFromSources = (...sources) => {
    for (const source of sources) {
        const parsedSource = parseAdditionalInfoJson(source);
        if (!parsedSource || typeof parsedSource !== 'object') continue;

        const parsedProfile = parseAdditionalInfoJson(parsedSource.manual_booking_profile);
        if (parsedProfile && typeof parsedProfile === 'object') {
            return parsedProfile;
        }
    }

    return null;
};

export const getManualBookingFieldRows = (profile) => {
    if (!profile || typeof profile !== 'object') {
        return [];
    }

    return [
        {
            label: 'Hotel / Accommodation Name',
            value: getFirstMeaningfulValue(
                profile.accommodation_name,
                profile.accommodationName,
                profile.hotel_name,
                profile.hotelName
            )
        },
        {
            label: 'Email Address',
            value: getFirstMeaningfulValue(
                profile.contact_email,
                profile.contactEmail,
                profile.email
            )
        },
        {
            label: 'Hotel Booking ID',
            value: getFirstMeaningfulValue(
                profile.hotel_booking_id,
                profile.hotelBookingId
            )
        },
        {
            label: 'Booking Name',
            value: getFirstMeaningfulValue(
                profile.booking_name,
                profile.bookingName
            )
        },
        {
            label: 'Staff Name',
            value: getFirstMeaningfulValue(
                profile.staff_name,
                profile.staffName
            )
        }
    ].filter((field) => hasMeaningfulValue(field.value));
};

export const isTheNewtManualBookingProfile = (profile) => {
    if (!profile || typeof profile !== 'object') {
        return false;
    }

    const accommodationName = normalizePartnerValue(
        getFirstMeaningfulValue(
            profile.accommodation_name,
            profile.accommodationName,
            profile.hotel_name,
            profile.hotelName
        )
    );
    const contactEmail = normalizePartnerValue(
        getFirstMeaningfulValue(
            profile.contact_email,
            profile.contactEmail,
            profile.email
        )
    );

    return (
        accommodationName === THE_NEWT_ACCOMMODATION_NAME ||
        contactEmail === THE_NEWT_CONTACT_EMAIL
    );
};

export const isTheNewtBooking = (...sources) => {
    const profile = getManualBookingProfileFromSources(
        ...sources.flatMap(getManualBookingProfileCandidateSources)
    );

    return isTheNewtManualBookingProfile(profile);
};

export const isKaleidoscopeManualBookingProfile = (profile) => {
    if (!profile || typeof profile !== 'object') {
        return false;
    }

    const profilePath = normalizePartnerValue(
        getFirstMeaningfulValue(profile.profile_path, profile.profilePath, profile.path)
    );
    const profileLabel = normalizePartnerValue(
        getFirstMeaningfulValue(profile.profile_label, profile.profileLabel, profile.label)
    );

    return (
        profilePath === KALEIDOSCOPE_PROFILE_PATH ||
        profileLabel === KALEIDOSCOPE_PROFILE_LABEL ||
        profileLabel.includes('kaleidoscope')
    );
};

export const isKaleidoscopeBooking = (...sources) => {
    const profile = getManualBookingProfileFromSources(
        ...sources.flatMap(getManualBookingProfileCandidateSources)
    );

    return isKaleidoscopeManualBookingProfile(profile);
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

    const shortNoticeOptOut = getFirstMeaningfulValue(
        explicitJson?.shortNoticeAvailabilityOptOut,
        explicitJson?.short_notice_opt_out,
        bookingJson?.shortNoticeAvailabilityOptOut,
        bookingJson?.short_notice_opt_out,
        additionalJson?.shortNoticeAvailabilityOptOut,
        additionalJson?.short_notice_opt_out,
        voucherJson?.shortNoticeAvailabilityOptOut,
        voucherJson?.short_notice_opt_out,
        additionalInformation?.shortNoticeAvailabilityOptOut,
        additionalInformation?.short_notice_opt_out,
        booking?.shortNoticeAvailabilityOptOut,
        booking?.short_notice_opt_out,
        voucher?.shortNoticeAvailabilityOptOut,
        voucher?.short_notice_opt_out
    );
    if (typeof shortNoticeOptOut === 'boolean') {
        payload.shortNoticeAvailabilityOptOut = shortNoticeOptOut;
    }

    const manualBookingProfile = normalizePreferValue(
        explicitJson?.manual_booking_profile,
        bookingJson?.manual_booking_profile,
        additionalJson?.manual_booking_profile,
        voucherJson?.manual_booking_profile,
        additionalInformation?.manual_booking_profile,
        booking?.manual_booking_profile,
        voucher?.manual_booking_profile
    );
    if (manualBookingProfile !== null) {
        payload.manual_booking_profile = manualBookingProfile;
    }

    return payload;
};
