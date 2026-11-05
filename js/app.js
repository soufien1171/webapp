// App Entry Point — Caisse 2.0 PWA
import { initStore } from './db/store-manager.js';
import { initFirebase } from './firebase-config.js';
import { initRouter } from './router.js';
import { initTheme } from './helpers/theme-helper.js';
import { setupAuthListener, setEmployeeSession } from './auth.js';
import * as utilisateurRepo from './db/repositories/utilisateur-repo.js';
import { verifyStoredLicence } from './helpers/firebase-licence.js';

async function loadFirebaseModules() {
    try {
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
        const { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, setDoc, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
        const { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
        const { getDatabase, ref, get } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js');

        window.__FIREBASE_MODULES__ = { initializeApp, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, setDoc, collection, getDocs, getAuth, getDatabase, ref, get };
        window.__AUTH_METHODS__ = { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged };
        console.log('[App] Firebase modules loaded from CDN.');
    } catch (err) {
        console.warn('[Firebase] CDN non accessible ou mode hors-ligne pur. La caisse fonctionne en stockage local sécurisé.');
    }
}

async function bootstrap() {
    console.log('[App] Initializing Caisse 2.0 PWA...');

    // 1. Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('[PWA] Service Worker registered:', reg.scope))
                .catch(err => console.log('[PWA] Service Worker registration failed (normal on file://):', err.message));
        });
    }

    // 2. Initialize Storage & Seed Data
    try {
        await initStore('default_store');
        console.log('[App] Local store initialized with seed data.');
    } catch (err) {
        console.error('[App] Store init failed:', err);
    }

    await initTheme();

    // 3. Load Firebase modules first, then attempt setup (guarantees ordering)
    await loadFirebaseModules();

    try {
        if (window.__FIREBASE_MODULES__) {
            await initFirebase();
            setupAuthListener(async user => {
                if (!user) return;
                try {
                    await initStore(user.uid, { owner: user });
                    const owner = await utilisateurRepo.ensureGoogleOwner(user);
                    setEmployeeSession(owner);
                    if (owner.mustSetPassword) {
                        window.location.hash = '#/set-password';
                        return;
                    }
                    const licenceStatus = await verifyStoredLicence();
                    // Le propriétaire/administrateur n'ouvre pas une session de caisse.
                    // Seuls le caissier et le gérant déclarent le fond de caisse de départ.
                    window.location.hash = licenceStatus.valid
                        ? (Number(owner.role || 1) <= 2 ? '#/caisse-open' : '#/caisse')
                        : '#/parametres';
                } catch (err) {
                    console.warn('[Auth] Impossible de restaurer la session Google:', err);
                }
            });
            console.log('[App] Firebase module connected.');
        }
    } catch (err) {
        console.warn('[App] Firebase online sync inactive, operating in autonomous local mode.');
    }

    // 4. Start SPA Router
    setTimeout(() => {
        initRouter();
    }, 400);
}

document.addEventListener('DOMContentLoaded', bootstrap);
