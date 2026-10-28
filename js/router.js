// Router — SPA Hash-based Router with Navigation Guards & Role Protection
import { isEmployeeAuthenticated, getEmployeeRole, getEmployeeSession } from './auth.js';
import { renderLayout } from './components/sidebar.js';

// Page Imports
import { renderGoogleSignInPage } from './pages/google-signin.js';
import { renderLoginPage } from './pages/login.js';
import { renderCaisseOpenPage } from './pages/caisse-open.js';
import { renderCaisseKeyboardPage } from './pages/caisse-keyboard.js';
import { renderCaisseTouchPage } from './pages/caisse-touch.js';
import { renderFacturesPage } from './pages/factures.js';
import { renderModifierFacturePage } from './pages/modifier-facture.js';
import { renderProduitsPage } from './pages/produit.js';
import { renderFournisseursPage } from './pages/fournisseurs.js';
import { renderEmployesPage } from './pages/employes.js';
import { renderParametresPage } from './pages/parametres.js';
import { renderSetPasswordPage } from './pages/set-password.js';
import { verifyStoredLicence } from './helpers/firebase-licence.js';

const routes = {
    '#/inscription': { render: renderGoogleSignInPage, requiresAuth: false, isBare: true },
    '#/set-password': { render: renderSetPasswordPage, requiresAuth: true, minRole: 3, isBare: true },
    '#/login': { render: renderLoginPage, requiresAuth: false, isBare: true },
    '#/caisse-open': { render: renderCaisseOpenPage, requiresAuth: true, minRole: 1, isBare: true },
    '#/caisse': { render: renderCaisseKeyboardPage, requiresAuth: true, minRole: 1, isBare: false },
    '#/caisse-touch': { render: renderCaisseTouchPage, requiresAuth: true, minRole: 1, isBare: false },
    '#/factures': { render: renderFacturesPage, requiresAuth: true, minRole: 1, isBare: false },
    '#/modifier-facture': { render: renderModifierFacturePage, requiresAuth: true, minRole: 1, isBare: false },
    '#/produits': { render: renderProduitsPage, requiresAuth: true, minRole: 2, isBare: false },
    '#/fournisseurs': { render: renderFournisseursPage, requiresAuth: true, minRole: 2, isBare: false },
    '#/employes': { render: renderEmployesPage, requiresAuth: true, minRole: 3, isBare: false },
    '#/parametres': { render: renderParametresPage, requiresAuth: true, minRole: 3, isBare: false }
};

export function navigateTo(hash) {
    window.location.hash = hash;
}

function showLicenceDisabledAlert(status) {
    const alertKey = `caisse_license_alert_${status.code}`;
    if (sessionStorage.getItem(alertKey) === '1') return;
    sessionStorage.setItem(alertKey, '1');
    window.alert(`Fonctionnalités désactivées.\nCode de désactivation : ${status.code}\n${status.message}`);
}

export async function handleRoute() {
    const rawHash = window.location.hash || '#/login';
    const cleanHash = rawHash.split('?')[0];

    const route = routes[cleanHash] || routes['#/login'];

    // Le fond de caisse est déclaré uniquement par le caissier et le gérant.
    if (cleanHash === '#/caisse-open' && getEmployeeRole() >= 3) {
        window.location.hash = '#/caisse';
        return;
    }

    const employee = getEmployeeSession();
    if (employee?.mustSetPassword && !['#/set-password', '#/inscription', '#/login'].includes(cleanHash)) {
        window.location.hash = '#/set-password';
        return;
    }

    const licenceStatus = await verifyStoredLicence();
    const licenceActive = licenceStatus.valid;

    if (!licenceActive && !['#/parametres', '#/set-password', '#/inscription', '#/login'].includes(cleanHash)) {
        showLicenceDisabledAlert(licenceStatus);
        if (isEmployeeAuthenticated() && getEmployeeRole() >= 3) {
            window.location.hash = '#/parametres';
        } else if (route.requiresAuth) {
            window.location.hash = '#/login';
        }
        return;
    }

    // Check Employee Session Guard
    if (route.requiresAuth && !isEmployeeAuthenticated()) {
        window.location.hash = '#/login';
        return;
    }

    // Check Role Guard
    if (route.minRole && getEmployeeRole() < route.minRole) {
        window.location.hash = '#/caisse';
        return;
    }

    const appEl = document.getElementById('app');

    // Remove splash if still present
    const splash = document.getElementById('splash');
    if (splash) splash.remove();

    const pageElement = route.render();

    if (route.isBare) {
        appEl.innerHTML = '';
        appEl.appendChild(pageElement);
    } else {
        renderLayout(pageElement);
    }
}

export function initRouter() {
    window.addEventListener('hashchange', () => { void handleRoute(); });
    void handleRoute();
}
