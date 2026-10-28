// Page — Google Sign-In / Mode Choix Magasin
import { signInWithGoogle, setEmployeeSession } from '../auth.js';
import { initStore } from '../db/store-manager.js';
import * as utilisateurRepo from '../db/repositories/utilisateur-repo.js';
import { verifyStoredLicence } from '../helpers/firebase-licence.js';
import { navigateTo } from '../router.js';
import { toast } from '../components/toast.js';

export function renderGoogleSignInPage() {
    const page = document.createElement('div');
    page.className = 'auth-page-container flex flex-center w-full h-full p-4';

    page.innerHTML = `
        <div class="card auth-card p-6 w-full max-width-md text-center">
            <div class="auth-logo mb-4">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="url(#logo-grad)" stroke-width="1.8" class="mx-auto">
                    <defs>
                        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#3b82f6"/>
                            <stop offset="100%" style="stop-color:#8b5cf6"/>
                        </linearGradient>
                    </defs>
                    <rect x="2" y="2" width="20" height="20" rx="3"/>
                    <line x1="2" y1="10" x2="22" y2="10"/>
                    <line x1="12" y1="2" x2="12" y2="10"/>
                    <path d="M7 15h0.01M12 15h0.01M17 15h0.01M7 19h0.01M12 19h0.01M17 19h0.01"/>
                </svg>
            </div>

            <h1 class="text-2xl font-bold mb-1 text-primary">Caisse 2.0 PWA</h1>
            <p class="text-sm text-secondary mb-6">Système de caisse moderne avec synchronisation cloud</p>

            <div class="auth-buttons flex flex-col gap-3">
                <button type="button" class="btn btn-primary btn-lg w-full flex flex-center gap-2 btn-google">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    <span>Continuer avec Google</span>
                </button>

                <div class="flex items-center my-2">
                    <div class="flex-1 border-b"></div>
                    <span class="text-xs text-muted uppercase px-3">ou</span>
                    <div class="flex-1 border-b"></div>
                </div>

                <button type="button" class="btn btn-secondary btn-lg w-full btn-demo-mode">
                    Démarrage Immédiat (Magasin Local)
                </button>
            </div>

            <div class="mt-6 pt-4 border-t text-xs text-muted">
                Données sécurisées • Mode hors-ligne automatique
            </div>
        </div>
    `;

    // Google Sign-In
    page.querySelector('.btn-google').addEventListener('click', async () => {
        let user;
        try {
            user = await signInWithGoogle();
        } catch (err) {
            console.error('[Google Auth] Connexion impossible:', err);
            const code = err?.code ? ` (${err.code})` : '';
            toast.error(`Connexion Google impossible${code}. Vérifiez Google Authentication et le domaine autorisé Firebase.`);
            return;
        }

        try {
            await initStore(user.uid, { owner: user });
            const owner = await utilisateurRepo.ensureGoogleOwner(user);
            setEmployeeSession(owner);
            toast.success(`Connecté : ${user.displayName || user.email}`);
            if (owner.mustSetPassword) {
                navigateTo('#/set-password');
                return;
            }
            const licenceStatus = await verifyStoredLicence();
            // Le propriétaire/administrateur ne déclare pas le montant de départ.
            navigateTo(licenceStatus.valid
                ? (Number(owner.role || 1) <= 2 ? '#/caisse-open' : '#/caisse')
                : '#/parametres');
        } catch (err) {
            console.error('[Google Store] Initialisation du magasin impossible:', err);
            toast.error('Compte Google connecté, mais impossible d’initialiser les données Firebase. Vérifiez Firestore et ses règles.');
        }
    });

    // Local / Demo Store
    page.querySelector('.btn-demo-mode').addEventListener('click', async () => {
        await initStore('default_store');
        navigateTo('#/login');
    });

    return page;
}
