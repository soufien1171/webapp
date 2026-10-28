// Licence Helper — activation des magasins via Firebase Realtime Database
import { getRtdb, getRealtimeApi } from '../firebase-config.js';
import { getCurrentGoogleUser } from '../auth.js';
import { getLicence, saveLicence } from '../db/repositories/settings-repo.js';

const LICENCE_CHECK_INTERVAL = 24 * 60 * 60 * 1000;

function dateIsValid(value) {
    return Boolean(value) && !Number.isNaN(new Date(value).getTime());
}

function result(valid, code, message, licence = null) {
    return { valid, code, message, licence };
}

export async function verifyLicenceKey(serialNumber, userUid = '') {
    const key = String(serialNumber || '').trim();
    if (!key) return result(false, 'LICENSE_CODE_MISSING', 'Veuillez saisir un code d’activation.');

    const rtdb = getRtdb();
    const api = getRealtimeApi();
    if (!rtdb || !api) {
        return result(false, 'LICENSE_SERVER_UNAVAILABLE', 'Le serveur Firebase est nécessaire pour vérifier cette licence.');
    }

    try {
        const snapshot = await api.get(api.ref(rtdb, `licences/${encodeURIComponent(key)}`));
        if (!snapshot.exists()) {
            return result(false, 'LICENSE_CODE_INVALID', 'Code d’activation invalide.');
        }

        const licence = snapshot.val() || {};
        if (licence.active !== true) {
            return result(false, 'LICENSE_INACTIVE', 'Cette licence est inactive.', licence);
        }
        if (!dateIsValid(licence.expiresAt)) {
            return result(false, 'LICENSE_DATE_INVALID', 'La date d’expiration de la licence est invalide.', licence);
        }
        if (new Date(licence.expiresAt).getTime() <= Date.now()) {
            return result(false, 'LICENSE_EXPIRED', 'Cette licence est expirée.', licence);
        }
        if (!licence.user_uid) {
            return result(false, 'LICENSE_USER_MISSING', 'Cette licence n’est associée à aucun utilisateur.', licence);
        }
        if (userUid && licence.user_uid !== userUid) {
            return result(false, 'LICENSE_USER_MISMATCH', 'Cette licence est associée à un autre compte Google.', licence);
        }

        return result(true, 'LICENSE_VALID', 'Licence vérifiée.', licence);
    } catch (err) {
        console.error('[Licence] Vérification impossible:', err);
        return result(false, 'LICENSE_SERVER_UNAVAILABLE', 'Impossible de vérifier la licence.', null);
    }
}

/**
 * Vérifie la licence locale et la revalide sur Firebase au moins toutes les 24 h.
 * L’expiration est toujours contrôlée localement, même entre deux vérifications serveur.
 */
export async function verifyStoredLicence() {
    const stored = await getLicence();
    const now = Date.now();
    const expiresAt = dateIsValid(stored?.expiresAt) ? new Date(stored.expiresAt).getTime() : 0;

    if (!stored?.num_serie) {
        return result(false, 'LICENSE_CODE_MISSING', 'Aucun code de licence enregistré.', stored);
    }
    if (stored.active === false || stored.validation !== true) {
        return result(false, stored?.deactivationCode || 'LICENSE_INACTIVE', 'La licence est désactivée.', stored);
    }
    if (!expiresAt) {
        return result(false, 'LICENSE_DATE_INVALID', 'La date d’expiration de la licence est invalide.', stored);
    }
    if (expiresAt <= now) {
        return result(false, 'LICENSE_EXPIRED', 'La licence est expirée.', stored);
    }
    if (!stored.user_uid) {
        return result(false, 'LICENSE_USER_MISSING', 'La licence n’est associée à aucun utilisateur.', stored);
    }

    const lastVerifiedAt = dateIsValid(stored.lastVerifiedAt)
        ? new Date(stored.lastVerifiedAt).getTime()
        : 0;
    if (lastVerifiedAt && now - lastVerifiedAt < LICENCE_CHECK_INTERVAL) {
        return result(true, 'LICENSE_VALID_CACHED', 'Licence valide (vérification serveur récente).', stored);
    }

    const googleUser = getCurrentGoogleUser();
    const expectedUid = googleUser?.uid || stored.user_uid;
    const checked = await verifyLicenceKey(stored.num_serie, expectedUid);
    if (!checked.valid) {
        const disabledLicence = {
            ...stored,
            active: false,
            validation: false,
            deactivationCode: checked.code,
            deactivationMessage: checked.message,
            lastVerifiedAt: new Date(now).toISOString()
        };
        await saveLicence(disabledLicence);
        return result(false, checked.code, checked.message, disabledLicence);
    }

    const verifiedLicence = {
        ...stored,
        ...checked.licence,
        num_serie: stored.num_serie,
        active: true,
        validation: true,
        lastVerifiedAt: new Date(now).toISOString(),
        deactivationCode: null,
        deactivationMessage: null
    };
    await saveLicence(verifiedLicence);
    return result(true, 'LICENSE_VALID', 'Licence vérifiée.', verifiedLicence);
}

export { LICENCE_CHECK_INTERVAL };
