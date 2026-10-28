// Page — Gestion des Employés & Audit Trail 3 Niveaux
import * as utilisateurRepo from '../db/repositories/utilisateur-repo.js';
import * as caisseRepo from '../db/repositories/caisse-repo.js';
import * as factureRepo from '../db/repositories/facture-repo.js';
import * as venteRepo from '../db/repositories/vente-repo.js';
import { formatDinars } from '../helpers/money-helper.js';
import { createDataGrid } from '../components/data-grid.js';
import { showModal, confirmDialog } from '../components/modal.js';
import { toast } from '../components/toast.js';

export function renderEmployesPage() {
    const page = document.createElement('div');
    page.className = 'employes-page flex flex-col h-full gap-4';

    let allUsers = [];

    page.innerHTML = `
        <div class="card p-4 flex flex-between items-center flex-wrap gap-3">
            <div>
                <h2 class="text-xl font-bold text-primary">Gestion du Personnel</h2>
                <p class="text-xs text-secondary">Comptes employés, rôles et traçabilité des opérations de caisse</p>
            </div>
            <button type="button" class="btn btn-primary btn-sm btn-add-user">+ Nouvel Employé</button>
        </div>

        <div class="flex-1 overflow-hidden" id="users-grid-slot"></div>
    `;

    const gridSlot = page.querySelector('#users-grid-slot');
    let gridInstance = null;

    async function loadData() {
        allUsers = await utilisateurRepo.getAll();
        renderGrid();
    }

    function renderGrid() {
        const columns = [
            { key: 'username', label: 'Nom d’utilisateur', render: (val) => `<b class="font-mono text-accent">${val}</b>` },
            { key: 'nom', label: 'Nom & Prénom', render: (val, row) => `${row.prenom || ''} ${val}` },
            { 
                key: 'role', 
                label: 'Rôle', 
                render: (val, row) => {
                    const r = Number(val);
                    const label = r === 3 ? "Administrateur" : r === 2 ? "Gérant" : "Caissier";
                    const badgeClass = r === 3 ? "badge-accent" : r === 2 ? "badge-warning" : "badge-secondary";
                    return `<span class="badge ${badgeClass}">${label} ${row.is_owner ? '(Propriétaire)' : ''}</span>`;
                } 
            },
            { key: 'num_tel', label: 'Téléphone' },
            { key: 'adresse', label: 'Adresse' },
            {
                key: 'actions',
                label: 'Actions & Audit',
                render: (_, row) => `
                    <div class="flex gap-1">
                        <button type="button" class="btn btn-secondary btn-sm btn-audit-user" data-cin="${row.cin}" title="Historique et audit des sessions">🔍 Audit</button>
                        <button type="button" class="btn btn-ghost btn-sm text-accent btn-edit-user" data-cin="${row.cin}" title="Modifier">✎</button>
                        ${!row.is_owner ? `<button type="button" class="btn btn-ghost btn-sm text-danger btn-del-user" data-cin="${row.cin}" title="Supprimer">🗑</button>` : ''}
                    </div>
                `
            }
        ];

        if (!gridInstance) {
            gridInstance = createDataGrid({
                columns,
                data: allUsers,
                keyField: 'cin',
                searchPlaceholder: "Rechercher un employé par nom ou nom d’utilisateur..."
            });
            gridSlot.appendChild(gridInstance.element);
        } else {
            gridInstance.setData(allUsers);
        }

        // Attach action handlers
        page.querySelectorAll('.btn-audit-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openAuditModal(btn.dataset.cin);
            });
        });

        page.querySelectorAll('.btn-edit-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const user = allUsers.find(u => u.cin === btn.dataset.cin);
                if (user) openUserModal(user);
            });
        });

        page.querySelectorAll('.btn-del-user').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const cin = btn.dataset.cin;
                const user = allUsers.find(u => u.cin === cin);
                const ok = await confirmDialog(`Supprimer le compte de l'employé ${user?.username || cin} ?`, "Suppression");
                if (ok) {
                    try {
                        await utilisateurRepo.remove(cin);
                        toast.success("Employé supprimé.");
                        loadData();
                    } catch (err) {
                        toast.error(err.message);
                    }
                }
            });
        });
    }

    // Modal: User Add / Edit
    function openUserModal(existing = null) {
        const isEdit = existing !== null;
        const container = document.createElement('div');
        container.className = 'flex flex-col gap-3';

        container.innerHTML = `
            <div class="grid grid-2 gap-2">
                <div class="form-group">
                    <label class="form-label">Nom d’utilisateur</label>
                    <input type="text" id="u-username" class="form-input font-mono font-bold" 
                        value="${existing?.username || existing?.cin || ''}" ${isEdit ? 'readonly' : ''} required />
                </div>
                <div class="form-group">
                    <label class="form-label">Rôle / Accès</label>
                    <select id="u-role" class="form-select" ${existing?.is_owner ? 'disabled' : ''}>
                        <option value="1" ${existing?.role === 1 ? 'selected' : ''}>1 — Caissier (Caisse uniquement)</option>
                        <option value="2" ${existing?.role === 2 ? 'selected' : ''}>2 — Gérant (Caisse + Factures + Stock)</option>
                        <option value="3" ${existing?.role === 3 ? 'selected' : ''}>3 — Administrateur (Accès Total)</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-2 gap-2">
                <div class="form-group">
                    <label class="form-label">Nom</label>
                    <input type="text" id="u-nom" class="form-input" value="${existing?.nom || ''}" required />
                </div>
                <div class="form-group">
                    <label class="form-label">Prénom</label>
                    <input type="text" id="u-prenom" class="form-input" value="${existing?.prenom || ''}" required />
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">Mot de passe ${isEdit ? '(Laisser vide pour ne pas modifier)' : ''}</label>
                <input type="password" id="u-pw" class="form-input font-mono" placeholder="••••" ${!isEdit ? 'required' : ''} />
            </div>

            <div class="grid grid-2 gap-2">
                <div class="form-group">
                    <label class="form-label">Téléphone</label>
                    <input type="text" id="u-tel" class="form-input" value="${existing?.num_tel || ''}" />
                </div>
                <div class="form-group">
                    <label class="form-label">Adresse</label>
                    <input type="text" id="u-adr" class="form-input" value="${existing?.adresse || ''}" />
                </div>
            </div>
        `;

        showModal({
            title: isEdit ? "Modifier Employé" : "Nouvel Employé",
            content: container,
            confirmText: isEdit ? "Enregistrer" : "Créer",
            onConfirm: async () => {
                const username = container.querySelector('#u-username').value.trim();
                const cin = isEdit ? existing.cin : username;
                const nom = container.querySelector('#u-nom').value.trim();
                const prenom = container.querySelector('#u-prenom').value.trim();
                const role = parseInt(container.querySelector('#u-role').value, 10);
                const pw = container.querySelector('#u-pw').value.trim();
                const tel = container.querySelector('#u-tel').value.trim();
                const adr = container.querySelector('#u-adr').value.trim();

                if (!username || !nom || !prenom || (!isEdit && !pw)) {
                    toast.warning("Veuillez remplir tous les champs obligatoires.");
                    return false;
                }

                const data = { cin, username, nom, prenom, role, num_tel: tel, adresse: adr };
                if (pw) data.motpass = pw;

                try {
                    if (isEdit) {
                        await utilisateurRepo.update(cin, data);
                        toast.success("Employé mis à jour.");
                    } else {
                        await utilisateurRepo.add(data);
                        toast.success("Employé créé avec succès.");
                    }
                    loadData();
                    return true;
                } catch (err) {
                    toast.error(err.message);
                    return false;
                }
            }
        });
    }

    // Modal: 3-Tier Audit Trail
    async function openAuditModal(cin) {
        const user = allUsers.find(u => u.cin === cin);
        const sessions = await caisseRepo.getSessionsByCaissier(cin);
        const auditSessions = await Promise.all(sessions.map(async session => ({
            ...session,
            total_vendu: await factureRepo.sumPrixByCaisseId(session.id_caisse)
        })));
        const isAdmin = Number(user?.role) === 3;
        const formatAuditDate = (value) => value
            ? new Date(value).toLocaleString('fr-FR')
            : '';
        auditSessions.forEach(session => {
            const authDate = session.authentification_at
                ? formatAuditDate(session.authentification_at)
                : `${session.date_caisse || ''} ${session.heur_depart || ''}`;
            const endDate = session.deconnexion_at
                ? formatAuditDate(session.deconnexion_at)
                : 'Session en cours';
            const totalVendu = Number(session.total_vendu || 0);
            session.auditDateHeure = `${authDate} → ${endDate}`;
            session.auditFondDepart = isAdmin ? '-' : `${formatDinars(Number(session.montant_depart || 0) / 1000)} DT`;
            session.auditTotal = formatDinars((isAdmin ? totalVendu : Number(session.montant_depart || 0) + totalVendu) / 1000);
        });
        sessions.splice(0, sessions.length, ...auditSessions);

        const container = document.createElement('div');
        container.className = 'audit-modal flex flex-col gap-3';

        container.innerHTML = `
            <div class="p-3 bg-secondary radius-md flex flex-between items-center">
                <span>Sessions trouvées pour <b>${user?.prenom} ${user?.nom}</b> (Nom d’utilisateur : ${user?.username || cin})</span>
                <span class="badge badge-accent">${sessions.length} Session(s)</span>
            </div>

            <div class="audit-sessions-list card p-0 max-height-60 overflow-y-auto">
                <table class="data-table text-xs">
                    <thead>
                        <tr>
                            <th>Date & Heure</th>
                            <th>Fond Départ</th>
                            <th>Total</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sessions.length === 0 ? `<tr><td colspan="4" class="text-center py-6 text-muted">Aucune session enregistrée.</td></tr>` : 
                          sessions.map(s => `
                            <tr>
                                <td>${s.auditDateHeure}</td>
                                <td>${s.auditFondDepart}</td>
                                <td class="font-bold text-accent">${s.auditTotal} DT</td>
                                <td>
                                    <button type="button" class="btn btn-ghost btn-sm text-accent btn-drilldown-fac" data-caisse="${s.id_caisse}">
                                        Détails ➔
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div id="audit-drilldown-slot" class="mt-2 hidden"></div>
        `;

        const drilldownSlot = container.querySelector('#audit-drilldown-slot');

        container.querySelectorAll('.btn-drilldown-fac').forEach(btn => {
            btn.addEventListener('click', async () => {
                const caisseId = btn.dataset.caisse;
                const factures = await factureRepo.getByCaisseId(caisseId);

                drilldownSlot.classList.remove('hidden');
                drilldownSlot.innerHTML = `
                    <div class="p-2 border-t mt-2">
                        <div class="font-bold text-xs text-primary mb-1">Factures de la session (${factures.length})</div>
                        <div class="card p-2 text-xs">
                            ${factures.length === 0 ? '<div class="text-muted">Aucune facture enregistrée pour cette session.</div>' : 
                              factures.map(f => `
                                <div class="flex flex-between py-1 border-b">
                                    <span>Facture #${f.id_fac} (${f.temp_fac})</span>
                                    <b class="text-accent">${formatDinars(f.prix_tt / 1000)} DT</b>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            });
        });

        showModal({
            title: `Audit Traçabilité — ${user?.prenom} ${user?.nom}`,
            content: container,
            confirmText: "Fermer",
            showCancel: false
        });
    }

    page.querySelector('.btn-add-user').addEventListener('click', () => {
        openUserModal();
    });

    loadData();
    return page;
}
