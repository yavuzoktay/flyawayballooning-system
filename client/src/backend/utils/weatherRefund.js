const isTruthyWeatherRefund = (value) =>
    value === true ||
    value === 1 ||
    value === '1' ||
    (typeof value === 'string' && value.trim().toLowerCase() === 'yes');

const parseWeatherRefundTotal = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
};

export const bookingHasWeatherRefund = (bookingDetail) => {
    if (!bookingDetail) return false;

    if (typeof bookingDetail?.booking?.has_weather_refund === 'boolean') {
        return bookingDetail.booking.has_weather_refund;
    }

    if (typeof bookingDetail?.has_weather_refund === 'boolean') {
        return bookingDetail.has_weather_refund;
    }

    const passengers = Array.isArray(bookingDetail?.passengers)
        ? bookingDetail.passengers
        : [];

    if (passengers.some((passenger) =>
        isTruthyWeatherRefund(passenger?.weather_refund) ||
        isTruthyWeatherRefund(passenger?.weatherRefund) ||
        isTruthyWeatherRefund(passenger?.weather_insurance)
    )) {
        return true;
    }

    const weatherRefundTotal = Math.max(
        parseWeatherRefundTotal(bookingDetail?.booking?.weather_refund_total_price),
        parseWeatherRefundTotal(bookingDetail?.weather_refund_total_price)
    );

    return weatherRefundTotal > 0;
};
