// Page — Paramètres du Magasin, En-tête Ticket, Code PIN & Clôture de Caisse (Rapport Z)
import * as settingsRepo from '../db/repositories/settings-repo.js';
import * as caisseRepo from '../db/repositories/caisse-repo.js';
import * as factureRepo from '../db/repositories/facture-repo.js';
import { getEmployeeSession } from '../auth.js';
import { navigateTo } from '../router.js';
import { formatDinars } from '../helpers/money-helper.js';
import { promptPin } from '../components/input-box.js';
import { showModal, confirmDialog, alertDialog } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { toggleTheme, getCurrentTheme } from '../helpers/theme-helper.js';
import { verifyLicenceKey } from '../helpers/firebase-licence.js';

export function renderParametresPage() {
    const page = document.createElement('div');
    page.className = 'parametres-page flex flex-col h-full gap-4 overflow-y-auto pb-8';

    let currentParams = null;

    async function loadLicenceStatus() {
        const licence = await settingsRepo.getLicence();
        const status = page.querySelector('.licence-status');
        const message = page.querySelector('.licence-message');
        const expiresAt = licence?.expiresAt ? new Date(licence.expiresAt) : null;
        const active = Boolean(licence?.validation) && (!expiresAt || expiresAt > new Date());

        status.textContent = active ? 'Active' : (expiresAt && expiresAt <= new Date() ? 'Expirée' : 'Inactive');
        status.className = `badge ${active ? 'badge-success' : 'badge-danger'} licence-status`;
        message.textContent = active
            ? `Valide jusqu’au ${expiresAt ? expiresAt.toLocaleDateString('fr-FR') : 'sans date d’expiration'}.`
            : `Les fonctionnalités sont bloquées. Code de désactivation : ${licence?.deactivationCode || 'LICENSE_INACTIVE'}.`;
        if (licence?.num_serie && licence.validation) {
            page.querySelector('#licence-code').value = licence.num_serie;
        }
    }

    page.innerHTML = `
        <div class="card p-4 flex flex-between items-center">
            <div class="flex flex-col">
                <h2 class="text-xl font-bold text-primary">Paramètres & Administration</h2>
                <p class="text-xs text-secondary">Coordonnées du magasin, options ticket, sécurité PIN et clôture de caisse</p>
            </div>
        </div>

        <section class="card p-4 flex flex-between items-center">
            <div class="flex flex-col">
                <h3 class="text-lg font-bold text-primary">Apparence</h3>
                <p class="text-sm text-secondary">Activer ou désactiver le mode sombre</p>
            </div>
            <label class="toggle-switch" aria-label="Activer le mode sombre">
                <input type="checkbox" id="p-theme" aria-label="Activer le mode sombre" />
                <span class="toggle-slider" aria-hidden="true"></span>
            </label>
        </section>

        <section class="card p-5 border-l-4 border-warning">
            <div class="flex flex-between items-center gap-3 mb-2">
                <div>
                    <h3 class="text-lg font-bold text-primary">Activation de l’application</h3>
                    <p class="text-sm text-secondary">Saisissez ou renouvelez le code d’activation pour débloquer les fonctionnalités.</p>
                </div>
                <span class="badge badge-warning licence-status">Vérification...</span>
            </div>
            <form id="licence-form" class="flex items-center gap-3 flex-wrap">
                <input type="text" id="licence-code" class="form-input flex-1" placeholder="Code d’activation" autocomplete="off" required />
                <button type="submit" class="btn btn-primary font-bold">Activer</button>
            </form>
            <p class="licence-message text-sm text-danger mt-2"></p>
        </section>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Company / Ticket Header Card -->
            <div class="card p-5">
                <h3 class="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                    <span>🏢</span> En-tête du Ticket de Caisse
                </h3>

                <form id="store-params-form" class="flex flex-col gap-3">
                    <div class="form-group">
                        <label class="form-label">Nom de l'Entreprise</label>
                        <input type="text" id="p-nom-ste" class="form-input font-bold" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Activité / Description</label>
                        <input type="text" id="p-desc-ste" class="form-input" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Adresse Complète</label>
                        <input type="text" id="p-adr-ste" class="form-input" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Numéro de Téléphone</label>
                        <input type="text" id="p-tel-ste" class="form-input" />
                    </div>

                    <div class="flex items-center gap-2 my-2">
                        <input type="checkbox" id="p-remise" class="form-checkbox" />
                        <label for="p-remise" class="text-sm font-semibold cursor-pointer">Activer les remises en caisse</label>
                    </div>

                    <div class="flex items-center gap-2">
                        <input type="checkbox" id="p-img" class="form-checkbox" />
                        <label for="p-img" class="text-sm font-semibold cursor-pointer">Afficher les photos en mode tactile</label>
                    </div>

                    <div class="form-group my-2 p-3 bg-secondary radius-md">
                        <label class="form-label font-bold text-accent mb-2">Disposition Caisse Tactile :</label>
                        <div class="flex items-center gap-4">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="p-touch-cols" value="5" id="p-cols-5" class="form-radio" />
                                <span class="text-sm font-semibold">5 articles par ligne</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="p-touch-cols" value="6" id="p-cols-6" class="form-radio" />
                                <span class="text-sm font-semibold">6 articles par ligne</span>
                            </label>
                        </div>
                    </div>

                    <button type="submit" class="btn btn-primary font-bold mt-2">
                        Enregistrer Paramètres ✓
                    </button>
                </form>
            </div>

            <!-- Security & Operations Card -->
            <div class="flex flex-col gap-4">
                <!-- PIN Security -->
                <div class="card p-5">
                    <h3 class="text-lg font-bold text-primary mb-2 flex items-center gap-2">
                        <span>🔒</span> Sécurité Code PIN
                    </h3>
                    <p class="text-xs text-secondary mb-4">Protège l'annulation et la modification de factures validées.</p>

                    <button type="button" class="btn btn-secondary w-full btn-change-pin">
                        Changer le Code PIN Administrateur
                    </button>
                </div>

                <!-- Cash Register Closure / Z-Report -->
                <div class="card p-5 border-l-4 border-danger">
                    <h3 class="text-lg font-bold text-danger mb-2 flex items-center gap-2">
                        <span>🛑</span> Clôture de Caisse (Rapport Z)
                    </h3>
                    <p class="text-xs text-secondary mb-4">
                        Ferme la session de caisse courante, calcule le récapitulatif des recettes et génère le rapport journalier.
                    </p>

                    <button type="button" class="btn btn-danger w-full font-bold py-3 btn-close-caisse-z">
                        Effectuer la Clôture de Caisse ➔
                    </button>
                </div>
            </div>
        </div>
    `;

    async function loadData() {
        currentParams = await settingsRepo.getParametres();
        page.querySelector('#p-nom-ste').value = currentParams.nom_ste || '';
        page.querySelector('#p-desc-ste').value = currentParams.desc_ste || '';
        page.querySelector('#p-adr-ste').value = currentParams.adr_ste || '';
        page.querySelector('#p-tel-ste').value = currentParams.tel_ste || '';
        page.querySelector('#p-remise').checked = Boolean(currentParams.remise);
        page.querySelector('#p-img').checked = Boolean(currentParams.img_para);
        page.querySelector('#p-theme').checked = getCurrentTheme() === 'dark';

        const cols = Number(currentParams.touch_cols || 5);
        if (cols === 6) {
            page.querySelector('#p-cols-6').checked = true;
        } else {
            page.querySelector('#p-cols-5').checked = true;
        }
    }

    // Save Params
    page.querySelector('#store-params-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedCols = page.querySelector('#p-cols-6').checked ? 6 : 5;
        const themeMode = page.querySelector('#p-theme').checked ? 'dark' : 'light';
        const updated = {
            nom_ste: page.querySelector('#p-nom-ste').value.trim(),
            desc_ste: page.querySelector('#p-desc-ste').value.trim(),
            adr_ste: page.querySelector('#p-adr-ste').value.trim(),
            tel_ste: page.querySelector('#p-tel-ste').value.trim(),
            remise: page.querySelector('#p-remise').checked,
            img_para: page.querySelector('#p-img').checked,
            touch_cols: selectedCols,
            theme: themeMode
        };

        await settingsRepo.saveParametres(updated);
        toast.success("Paramètres enregistrés avec succès.");
    });

    page.querySelector('#licence-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = page.querySelector('#licence-code').value.trim();
        const message = page.querySelector('.licence-message');
        const ownerUid = getEmployeeSession()?.cin || '';
        message.textContent = 'Vérification en cours…';

        const result = await verifyLicenceKey(code, ownerUid);
        if (!result.valid) {
            message.textContent = result.message;
            return;
        }

        await settingsRepo.saveLicence({
            num_serie: code,
            validation: true,
            active: true,
            activatedAt: new Date().toISOString(),
            lastVerifiedAt: new Date().toISOString(),
            expiresAt: result.licence?.expiresAt || null,
            user_uid: result.licence?.user_uid || ownerUid
        });
        toast.success('Application activée avec succès.');
        await loadLicenceStatus();
        const employee = getEmployeeSession();
        navigateTo(Number(employee?.role || 1) <= 2 ? '#/caisse-open' : '#/caisse');
    });

    // Theme Toggle Instant Action
    page.querySelector('#p-theme').addEventListener('change', async () => {
        const newTheme = await toggleTheme();
        toast.info(`Mode ${newTheme === 'light' ? 'Clair' : 'Sombre'} activé`);
    });

    // Change PIN
    page.querySelector('.btn-change-pin').addEventListener('click', async () => {
        const oldPin = await promptPin("Code PIN Actuel");
        if (!oldPin) return;

        const valid = await settingsRepo.verifyPin(oldPin);
        if (!valid) {
            toast.error("Code PIN actuel incorrect!");
            return;
        }

        const newPin = await promptPin("Nouveau Code PIN (4 chiffres)");
        if (!newPin || newPin.length !== 4) {
            toast.error("Le code PIN doit comporter exactement 4 chiffres.");
            return;
        }

        await settingsRepo.savePin(newPin);
        toast.success("Code PIN modifié avec succès!");
    });

    // Z-Report / Cash Close
    page.querySelector('.btn-close-caisse-z').addEventListener('click', async () => {
        const emp = getEmployeeSession();
        const openSession = await caisseRepo.getOpenSession(emp?.cin);

        if (!openSession) {
            toast.info("Aucune session de caisse ouverte actuellement.");
            return;
        }

        const ok = await confirmDialog("Voulez-vous clôturer la session de caisse et imprimer le rapport Z ?", "Clôture de Caisse");
        if (!ok) return;

        // Sum sales for this session
        const totalSalesMillimes = await factureRepo.sumPrixByCaisseId(openSession.id_caisse);
        const montantDepartMillimes = Number(openSession.montant_depart || 0);
        const totalEnCaisseMillimes = montantDepartMillimes + totalSalesMillimes;

        // Close session in db
        await caisseRepo.closeSession(openSession.id_caisse, totalEnCaisseMillimes);

        const summaryHtml = `
            <div class="z-report-summary card p-4 flex flex-col gap-2 font-mono text-sm">
                <div class="text-center font-bold text-lg text-primary mb-2">RAPPORT Z — CLÔTURE</div>
                <div class="flex flex-between border-b py-1">
                    <span>Session:</span> <b>#\${openSession.id_caisse}</b>
                </div>
                <div class="flex flex-between border-b py-1">
                    <span>Caissier:</span> <b>\${emp?.prenom || ''} \${emp?.nom || ''} (\${openSession.caissier})</b>
                </div>
                <div class="flex flex-between border-b py-1">
                    <span>Ouverture:</span> <b>\${openSession.date_caisse} à \${openSession.heur_depart}</b>
                </div>
                <div class="flex flex-between border-b py-1">
                    <span>Fermeture:</span> <b>\${new Date().toLocaleTimeString('fr-FR')}</b>
                </div>
                <div class="flex flex-between border-b py-1">
                    <span>Fond de Caisse Départ:</span> <b>\${formatDinars(montantDepartMillimes / 1000)} DT</b>
                </div>
                <div class="flex flex-between border-b py-1 text-accent font-bold">
                    <span>Total des Ventes:</span> <b>\${formatDinars(totalSalesMillimes / 1000)} DT</b>
                </div>
                <div class="flex flex-between text-success font-bold text-base pt-2">
                    <span>Montant Total en Caisse:</span> <b>\${formatDinars(totalEnCaisseMillimes / 1000)} DT</b>
                </div>
            </div>
        `;

        showModal({
            title: "Rapport Z de Clôture",
            content: summaryHtml,
            confirmText: "Imprimer Rapport Z",
            cancelText: "Fermer",
            onConfirm: () => {
                window.print();
            }
        });
    });

    loadData();
    loadLicenceStatus();
    return page;
}
