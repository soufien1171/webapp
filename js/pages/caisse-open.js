// Page — Caisse Open (Ouverture de session de caisse avec fond de caisse)
import * as caisseRepo from '../db/repositories/caisse-repo.js';
import { getEmployeeSession } from '../auth.js';
import { renderNumpad } from '../components/numpad.js';
import { navigateTo } from '../router.js';
import { toast } from '../components/toast.js';
import { formatDinars } from '../helpers/money-helper.js';

export function renderCaisseOpenPage() {
    const page = document.createElement('div');
    page.className = 'caisse-open-page flex flex-center w-full h-full p-4';

    const employee = getEmployeeSession() || { nom: "Caissier", prenom: "", cin: "11111111" };

    page.innerHTML = `
        <div class="card p-6 w-full max-width-md">
            <div class="text-center mb-5">
                <div class="badge badge-accent mb-2">Nouvelle Session</div>
                <h2 class="text-2xl font-bold text-primary">Ouverture de Caisse</h2>
                <p class="text-xs text-secondary mt-1">Caissier: <b>${employee.prenom} ${employee.nom}</b> (Nom d’utilisateur : ${employee.username || employee.cin})</p>
            </div>

            <div class="stat-card mb-4 text-center">
                <span class="text-xs text-secondary">Montant Fond de Caisse (Départ)</span>
                <input type="text" id="montant-depart" class="form-input text-3xl font-bold text-center text-accent mt-2" 
                    value="50.000" readonly />
                <span class="text-xs text-muted mt-1 block">Dinars Tunisiens (DT)</span>
            </div>

            <!-- Quick Amount Presets -->
            <div class="grid grid-3 gap-2 mb-4">
                <button type="button" class="btn btn-secondary btn-sm preset-btn" data-val="0.000">0 DT</button>
                <button type="button" class="btn btn-secondary btn-sm preset-btn" data-val="50.000">50 DT</button>
                <button type="button" class="btn btn-secondary btn-sm preset-btn" data-val="100.000">100 DT</button>
            </div>

            <div class="numpad-slot mb-4"></div>

            <div class="flex gap-2">
                <button type="button" class="btn btn-secondary flex-1 btn-cancel-open">Annuler</button>
                <button type="button" class="btn btn-primary flex-2 font-bold text-lg btn-confirm-open">Démarrer Caisse ➔</button>
            </div>
        </div>
    `;

    const input = page.querySelector('#montant-depart');

    page.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            input.value = btn.dataset.val;
        });
    });

    const numpad = renderNumpad(
        (char) => {
            if (char === 'CLEAR') {
                input.value = '0.000';
            } else if (char === '.') {
                if (!input.value.includes('.')) input.value += '.';
            } else {
                if (input.value === '0.000' || input.value === '0') {
                    input.value = char;
                } else {
                    input.value += char;
                }
            }
        },
        () => {
            input.value = input.value.slice(0, -1) || '0';
        },
        () => {
            page.querySelector('.btn-confirm-open').click();
        }
    );

    page.querySelector('.numpad-slot').appendChild(numpad);

    page.querySelector('.btn-cancel-open').addEventListener('click', () => {
        navigateTo('#/login');
    });

    page.querySelector('.btn-confirm-open').addEventListener('click', async () => {
        const valDinars = parseFloat(input.value.replace(',', '.')) || 0;
        const valMillimes = Math.round(valDinars * 1000);

        try {
            await caisseRepo.createSession(employee.cin, valMillimes, employee.authenticatedAt);
            toast.success("Session de caisse ouverte avec succès!");
            navigateTo('#/caisse');
        } catch (err) {
            console.error(err);
            toast.error("Erreur lors de l'ouverture de la session.");
        }
    });

    return page;
}
