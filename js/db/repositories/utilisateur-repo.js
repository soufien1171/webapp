// Repository — Utilisateurs (Employés)
import { getCollection, saveCollection } from '../store-manager.js';
import { verifyPassword, hashPassword } from '../../helpers/password-helper.js';

const COLLECTION = 'utilisateurs';

export async function getAll() {
    return getCollection(COLLECTION).map(normalizeUser);
}

function normalizeUser(user) {
    const legacyUsername = user.cin === '97789778'
        ? 'admin'
        : user.cin === '11111111'
            ? 'caissier'
            : user.cin || '';
    return {
        ...user,
        username: user.username || user.nom_utilisateur || legacyUsername
    };
}

export async function getByCin(cin) {
    const list = getCollection(COLLECTION);
    const user = list.find(u => u.cin === String(cin).trim()) || null;
    return user ? normalizeUser(user) : null;
}

export async function getByUsername(username) {
    const value = String(username || '').trim().toLowerCase();
    const list = getCollection(COLLECTION);
    const user = list.map(normalizeUser).find(u => String(u.username || '').trim().toLowerCase() === value
        || String(u.cin || '').trim().toLowerCase() === value) || null;
    return user ? normalizeUser(user) : null;
}

export async function ensureGoogleOwner(googleUser) {
    const cin = String(googleUser.uid);
    const existing = await getByCin(cin);
    if (existing) {
        if (existing.role !== 3 || !existing.is_owner || !existing.username || existing.mustSetPassword === undefined) {
            return update(cin, {
                role: 3,
                is_owner: true,
                username: existing.username || googleUser.email || cin,
                email: googleUser.email || existing.email || '',
                provider: 'google',
                mustSetPassword: existing.passwordConfigured !== true,
                passwordConfigured: existing.passwordConfigured === true
            });
        }
        return existing;
    }

    return add({
        cin,
        username: googleUser.email || cin,
        nom: googleUser.displayName || googleUser.email || 'Propriétaire',
        prenom: '',
        email: googleUser.email || '',
        motpass: '',
        date_ness: '',
        adresse: '',
        num_tel: '',
        role: 3,
        is_owner: true,
        provider: 'google',
        mustSetPassword: true,
        passwordConfigured: false
    });
}

export async function authenticate(username, plainPassword) {
    const user = await getByUsername(username);
    if (!user) return null;

    // Verify hashed password
    const ok = await verifyPassword(plainPassword, user.motpass);
    if (!ok) {
        // Fallback for simple legacy test passwords if any
        if (user.motpass === plainPassword) return user;
        return null;
    }
    return user;
}

export async function add(userData) {
    const list = getCollection(COLLECTION);
    const username = String(userData.username || userData.nom_utilisateur || userData.cin || '').trim();
    if (!username) throw new Error("Le nom d'utilisateur est obligatoire.");
    if (list.some(u => u.cin === userData.cin || normalizeUser(u).username.toLowerCase() === username.toLowerCase())) {
        throw new Error(`Le nom d'utilisateur ${username} existe déjà.`);
    }

    // Hash password if plain text
    let hashedPassword = userData.motpass;
    if (hashedPassword && !hashedPassword.includes(':')) {
        hashedPassword = await hashPassword(userData.motpass);
    }

    const newUser = {
        ...userData,
        username,
        motpass: hashedPassword,
        is_owner: userData.is_owner || false,
        createdAt: new Date().toISOString()
    };

    list.push(newUser);
    saveCollection(COLLECTION, list);
    return newUser;
}

export async function update(cin, updateData) {
    const list = getCollection(COLLECTION);
    const index = list.findIndex(u => u.cin === String(cin));
    if (index === -1) throw new Error("Utilisateur introuvable.");

    let data = { ...updateData };
    if (data.username) data.username = String(data.username).trim();
    if (data.motpass && !data.motpass.includes(':')) {
        data.motpass = await hashPassword(data.motpass);
        data.passwordConfigured = true;
        data.mustSetPassword = false;
    }

    list[index] = { ...list[index], ...data };
    saveCollection(COLLECTION, list);
    return list[index];
}

export async function remove(cin) {
    const list = getCollection(COLLECTION);
    const user = list.find(u => u.cin === String(cin));
    if (user && user.is_owner) {
        throw new Error("Impossible de supprimer le compte propriétaire du magasin.");
    }

    const filtered = list.filter(u => u.cin !== String(cin));
    saveCollection(COLLECTION, filtered);
    return true;
}

export async function count() {
    const list = getCollection(COLLECTION);
    return list.length;
}
