// Date Helper — Formatting and clock tamper detection

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/**
 * Format date to "yyyy/MM/dd"
 */
export function formatDateISO(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
}

/**
 * Format date to "dd/MM/yyyy"
 */
export function formatDateFR(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${d}/${m}/${y}`;
}

/**
 * Format date to "Lundi, 26 Octobre 2026"
 */
export function formatDateLong(date = new Date()) {
    const day = DAYS_FR[date.getDay()];
    const d = date.getDate();
    const month = MONTHS_FR[date.getMonth()];
    const y = date.getFullYear();
    return `${day}, ${d} ${month} ${y}`;
}

/**
 * Format time to "HH:mm:ss"
 */
export function formatTime(date = new Date()) {
    return date.toTimeString().substring(0, 8);
}

/**
 * Get day name in French
 */
export function getDayName(date = new Date()) {
    return DAYS_FR[date.getDay()];
}

/**
 * Get tomorrow's day name
 */
export function getTomorrowDayName() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return DAYS_FR[d.getDay()];
}

/**
 * Check if clock has been tampered with (set backward)
 * @param {Date|string} lastCloseDate - Last cash register close date
 * @returns {boolean} true if clock seems tampered
 */
export function isClockTampered(lastCloseDate) {
    if (!lastCloseDate) return false;
    const last = (lastCloseDate instanceof Date) ? lastCloseDate : new Date(lastCloseDate);
    const now = new Date();
    return now < last;
}

/**
 * Parse Firestore Timestamp or ISO string to Date
 */
export function toDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value.toDate) return value.toDate(); // Firestore Timestamp
    return new Date(value);
}

/**
 * Check if a date is within N days from now
 */
export function isWithinDays(date, days) {
    const target = toDate(date);
    if (!target) return false;
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return target <= future;
}

/**
 * Get Firestore-compatible timestamp
 */
export function nowTimestamp() {
    return new Date();
}
