// Password Helper — PBKDF2-SHA256 via Web Crypto API (no library needed)

const ITERATIONS = 10000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Hash a password with PBKDF2-SHA256
 * @param {string} password - Plain text password
 * @returns {Promise<string>} "salt:hash" in base64
 */
export async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
        keyMaterial,
        KEY_LENGTH * 8
    );
    const saltB64 = btoa(String.fromCharCode(...salt));
    const hashB64 = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
    return `${saltB64}:${hashB64}`;
}

/**
 * Verify a password against a stored "salt:hash" string
 * @param {string} password - Plain text password
 * @param {string} storedHash - "salt:hash" from hashPassword()
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedHash) {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [saltB64, hashB64] = storedHash.split(':');
    const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
        keyMaterial,
        KEY_LENGTH * 8
    );
    const newHashB64 = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
    return newHashB64 === hashB64;
}
