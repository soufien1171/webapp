// Auth Module — Google Sign-In + Employee Session
import { getAuthInstance } from './firebase-config.js';

let currentGoogleUser = null;
let currentEmployee = null;

export function setupAuthListener(callback) {
    if (!window.__AUTH_METHODS__) {
        console.warn('[Auth] Firebase Auth non disponible, listener ignoré.');
        return;
    }
    const { onAuthStateChanged } = window.__AUTH_METHODS__;
    const auth = getAuthInstance();
    onAuthStateChanged(auth, (user) => {
        currentGoogleUser = user;
        if (callback) callback(user);
    });
}

export async function signInWithGoogle() {
    if (!window.__AUTH_METHODS__) {
        throw new Error('Firebase non chargé. Vérifiez votre connexion internet et rechargez la page.');
    }
    const { signInWithPopup, GoogleAuthProvider } = window.__AUTH_METHODS__;
    const auth = getAuthInstance();
    if (!auth) {
        throw new Error('Firebase Auth non initialisé. Rechargez la page.');
    }
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        currentGoogleUser = result.user;
        return result.user;
    } catch (error) {
        console.error('[Auth] Google Sign-In error:', error);
        throw error;
    }
}

export async function signOutGoogle() {
    const { signOut: firebaseSignOut } = window.__AUTH_METHODS__;
    const auth = getAuthInstance();
    await firebaseSignOut(auth);
    currentGoogleUser = null;
    currentEmployee = null;
}

export function getCurrentGoogleUser() { return currentGoogleUser; }
export function getStoreId() { return currentGoogleUser?.uid || null; }

// Employee session (in-memory)
export function setEmployeeSession(employee) {
    currentEmployee = {
        ...employee,
        authenticatedAt: new Date().toISOString()
    };
}

export function getEmployeeSession() { return currentEmployee; }

export function clearEmployeeSession() {
    currentEmployee = null;
}

export function isGoogleAuthenticated() { return currentGoogleUser !== null; }

export function isEmployeeAuthenticated() { return currentEmployee !== null; }

export function getEmployeeRole() { return currentEmployee?.role || 0; }

export function hasMinRole(minRole) {
    const role = getEmployeeRole();
    return role >= minRole;
}
