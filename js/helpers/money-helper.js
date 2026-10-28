// Helpers — Money formatting for Tunisian Dinar (DT)
// Prices stored in millimes (÷1000), displayed with 3 decimals

/**
 * Format millimes to display string "X.XXX DT"
 * @param {number} millimes - Amount in millimes
 * @returns {string} Formatted string like "3.500"
 */
export function formatAmount(millimes) {
    if (millimes === null || millimes === undefined || isNaN(millimes)) return '0.000';
    const dinars = millimes / 1000;
    return dinars.toFixed(3);
}

/**
 * Format with currency suffix
 * @param {number} millimes
 * @returns {string} "3.500 DT"
 */
export function formatAmountDT(millimes) {
    return formatAmount(millimes) + ' DT';
}

/**
 * Parse display string to millimes
 * @param {string} str - "3.500" or "3,500"
 * @returns {number} millimes integer
 */
export function parseAmount(str) {
    if (!str || str.trim() === '') return 0;
    const normalized = str.replace(',', '.').replace(/\s*DT\s*$/i, '').trim();
    const dinars = parseFloat(normalized);
    if (isNaN(dinars)) return 0;
    return Math.round(dinars * 1000);
}

/**
 * Convert dinars to millimes
 */
export function toMillimes(dinars) {
    return Math.round(dinars * 1000);
}

/**
 * Convert millimes to dinars
 */
export function toDinars(millimes) {
    return millimes / 1000;
}

/**
 * Format dinars (already divided) with 3 decimals
 */
export function formatDinars(dinars) {
    if (isNaN(dinars)) return '0.000';
    return parseFloat(dinars).toFixed(3);
}

/**
 * Parse a display value (in dinars with 3 decimals) to dinars float
 */
export function parseDinars(str) {
    if (!str || str.trim() === '') return 0;
    const normalized = str.replace(',', '.').trim();
    return parseFloat(normalized) || 0;
}
