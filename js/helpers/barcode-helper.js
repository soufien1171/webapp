// Barcode Helper — EAN-13 generation & validation

/**
 * Generate a valid random EAN-13 barcode
 * @returns {string} 13-digit EAN-13 code
 */
export function generateEan13() {
    // Generate first 12 random digits (prefix 619 = Tunisia)
    let code = '619';
    for (let i = 0; i < 9; i++) {
        code += Math.floor(Math.random() * 10).toString();
    }
    code += calculateEan13CheckDigit(code);
    return code;
}

/**
 * Calculate EAN-13 check digit (13th digit)
 * @param {string} code12 - First 12 digits
 * @returns {string} Check digit (single char)
 */
export function calculateEan13CheckDigit(code12) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(code12[i], 10);
        sum += (i % 2 === 0) ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
}

/**
 * Validate a barcode (EAN-13 or general numeric)
 * @param {string} code - Barcode string
 * @returns {boolean}
 */
export function validateBarcode(code) {
    if (!code || code.trim() === '') return false;
    const cleaned = code.trim();
    // Must be numeric
    if (!/^\d+$/.test(cleaned)) return false;
    // EAN-13 validation
    if (cleaned.length === 13) {
        const check = calculateEan13CheckDigit(cleaned.substring(0, 12));
        return check === cleaned[12];
    }
    // Accept other lengths as generic barcodes
    return cleaned.length >= 4 && cleaned.length <= 20;
}
