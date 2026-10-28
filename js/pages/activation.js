import { getEmployeeSession, isEmployeeAuthenticated } from '../auth.js';
import { getLicence, saveLicence } from '../db/repositories/settings-repo.js';
import { verifyLicenceKey } from '../helpers/firebase-licence.js';
import { navigateTo } from '../router.js';
import { toast } from '../components/toast.js';

export function renderActivationPage() {
    const page = document.createElement('div');
    page.className = 'auth-page-container flex flex-center w-full h-full p-4';
    page.innerHTML = `
        <div class="card auth-card p-6 w-full max-width-md">
            <div class="text-center mb-5">
                <h1 class="text-2xl font-bold text-primary">Activation de Caisse 2.0</h1>
                <p class="text-sm text-secondary mt-2">Saisissez le code d’activation fourni pour utiliser ce magasin.</p>
            </div>
            <form class="activation-form flex flex-col gap-3">
                <label class="form-label" for="activation-code">Code d’activation</label>
                <input id="activation-code" class="form-input text-center font-bold" autocomplete="off" required />
                <button class="btn btn-primary w-full font-bold" type="submit">Activer l’application</button>
            </form>
            <p class="activation-status text-sm text-center text-danger mt-3"></p>
        </div>
    `;

    const form = page.querySelector('.activation-form');
    const input = page.querySelector('#activation-code');
    const status = page.querySelector('.activation-status');

    getLicence().then(licence => {
        if (licence?.validation) {
            const employee = getEmployeeSession();
            navigateTo(isEmployeeAuthenticated()
                ? (Number(employee?.role || 1) <= 2 ? '#/caisse-open' : '#/caisse')
                : '#/login');
        }
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        const code = input.value.trim();
        status.textContent = 'Vérification en cours…';
        const ownerUid = getEmployeeSession()?.cin || '';
        const result = await verifyLicenceKey(code, ownerUid);
        if (!result.valid) {
            status.textContent = result.message;
            return;
        }

        await saveLicence({
            num_serie: code,
            validation: true,
            active: true,
            activatedAt: new Date().toISOString(),
            lastVerifiedAt: new Date().toISOString(),
            expiresAt: result.licence?.expiresAt || null,
            user_uid: result.licence?.user_uid || ownerUid
        });
        toast.success('Application activée avec succès.');
        const employee = getEmployeeSession();
        navigateTo(isEmployeeAuthenticated()
            ? (Number(employee?.role || 1) <= 2 ? '#/caisse-open' : '#/caisse')
            : '#/login');
    });

    return page;
}
