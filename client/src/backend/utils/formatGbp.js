/**
 * UK-style currency number for display: thousands separators, 2 decimals (e.g. 107329.87 → "107,329.87").
 */
export function formatGbp(amount) {
    if (amount === null || amount === undefined || amount === '') {
        return '0.00';
    }
    const n =
        typeof amount === 'number'
            ? amount
            : Number(String(amount).replace(/[£,\s]/g, ''));
    if (!Number.isFinite(n)) {
        return '0.00';
    }
    return n.toLocaleString('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
