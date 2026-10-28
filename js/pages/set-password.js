// Première connexion du propriétaire : création du nom d'utilisateur et du mot de passe local.
import * as utilisateurRepo from '../db/repositories/utilisateur-repo.js';
import { getEmployeeSession, setEmployeeSession } from '../auth.js';
import { navigateTo } from '../router.js';
import { toast } from '../components/toast.js';

export function renderSetPasswordPage() {
    const employee = getEmployeeSession();
    window.alert('Première connexion administrateur : veuillez créer un mot de passe pour continuer.');
    const page = document.createElement('div');
    page.className = 'auth-page-container flex flex-center w-full h-full p-4';
    page.innerHTML = `
        <div class="card auth-card p-6 w-full">
            <div class="text-center mb-6">
                <div class="badge badge-accent mb-2">Première connexion</div>
                <h2 class="text-2xl font-bold text-primary">Créer vos identifiants</h2>
                <p class="text-xs text-secondary mt-1">L’administrateur doit définir un nom d’utilisateur et un mot de passe avant de continuer.</p>
            </div>
            <form class="first-password-form flex flex-col gap-4">
                <div class="form-group">
                    <label class="form-label" for="owner-username">Nom d’utilisateur</label>
                    <input type="text" id="owner-username" class="form-input" value="${employee?.username || employee?.email || ''}" required autocomplete="username" />
                </div>
                <div class="form-group">
                    <label class="form-label" for="owner-password">Nouveau mot de passe</label>
                    <input type="password" id="owner-password" class="form-input" required minlength="6" autocomplete="new-password" />
                </div>
                <div class="form-group">
                    <label class="form-label" for="owner-password-confirm">Confirmer le mot de passe</label>
                    <input type="password" id="owner-password-confirm" class="form-input" required minlength="6" autocomplete="new-password" />
                </div>
                <button type="submit" class="btn btn-primary btn-lg w-full font-bold">Enregistrer et continuer</button>
            </form>
        </div>
    `;

    page.querySelector('.first-password-form').addEventListener('submit', async event => {
        event.preventDefault();
        const username = page.querySelector('#owner-username').value.trim();
        const password = page.querySelector('#owner-password').value;
        const confirmation = page.querySelector('#owner-password-confirm').value;

        if (!username || password.length < 6) {
            toast.warning("Le nom d'utilisateur et un mot de passe d'au moins 6 caractères sont obligatoires.");
            return;
        }
        if (password !== confirmation) {
            toast.warning('Les deux mots de passe ne correspondent pas.');
            return;
        }
        if (!employee?.cin) {
            toast.error('Session administrateur introuvable.');
            navigateTo('#/login');
            return;
        }

        try {
            const updated = await utilisateurRepo.update(employee.cin, {
                username,
                motpass: password,
                passwordConfigured: true,
                mustSetPassword: false
            });
            setEmployeeSession(updated);
            toast.success('Identifiants administrateur enregistrés.');
            navigateTo('#/parametres');
        } catch (error) {
            console.error('[Auth] Création des identifiants impossible:', error);
            toast.error(error.message || 'Impossible d’enregistrer les identifiants.');
        }
    });

    return page;
}
