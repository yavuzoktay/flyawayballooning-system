/**
 * UK-style amount for display (no £): thousands separators + 2 decimals.
 * Uses explicit grouping so formatting is consistent even if toLocaleString is stripped or locale differs.
 * Examples: 107329.87 → "107,329.87", 800 → "800.00"
 */
export function formatGbp(amount) {
    if (amount === null || amount === undefined || amount === '') {
        return '0.00';
    }
    let n =
        typeof amount === 'number'
            ? amount
            : Number(String(amount).replace(/[£,\s]/g, ''));
    if (!Number.isFinite(n)) {
        return '0.00';
    }
    const negative = n < 0;
    n = Math.abs(n);
    const fixed = n.toFixed(2);
    const [intPart, decPart] = fixed.split('.');
    const intWithSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${negative ? '-' : ''}${intWithSep}.${decPart}`;
}
