// Page — Gestion des Fournisseurs & Alertes de Livraison
import * as fournisseurRepo from '../db/repositories/fournisseur-repo.js';
import { getTomorrowDayName } from '../helpers/date-helper.js';
import { createDataGrid } from '../components/data-grid.js';
import { showModal, confirmDialog } from '../components/modal.js';
import { toast } from '../components/toast.js';

export function renderFournisseursPage() {
    const page = document.createElement('div');
    page.className = 'fournisseurs-page flex flex-col h-full gap-4';

    let allFournisseurs = [];

    page.innerHTML = `
        <div class="card p-4 flex flex-between items-center flex-wrap gap-3">
            <div>
                <h2 class="text-xl font-bold text-primary">Gestion des Fournisseurs</h2>
                <p class="text-xs text-secondary">Répertoire des fournisseurs et planning des jours de passage</p>
            </div>
            <button type="button" class="btn btn-primary btn-sm btn-add-fournisseur">+ Nouveau Fournisseur</button>
        </div>

        <!-- Tomorrow's Delivery Widget -->
        <div class="card p-3 border-l-4 border-accent flex items-center gap-3">
            <span class="text-2xl">🚚</span>
            <div>
                <span class="text-xs text-secondary uppercase font-semibold">Livraisons prévues pour demain (${getTomorrowDayName()})</span>
                <div class="text-sm font-bold text-accent" id="tomorrow-delivery-list">Chargement...</div>
            </div>
        </div>

        <div class="flex-1 overflow-hidden" id="fournisseurs-grid-slot"></div>
    `;

    const tomorrowListEl = page.querySelector('#tomorrow-delivery-list');
    const gridSlot = page.querySelector('#fournisseurs-grid-slot');

    let gridInstance = null;

    async function loadData() {
        allFournisseurs = await fournisseurRepo.getAll();
        updateTomorrowWidget();
        renderGrid();
    }

    function updateTomorrowWidget() {
        const tomorrow = getTomorrowDayName();
        const tomorrowFours = allFournisseurs.filter(f => f.date_tour && f.date_tour.toLowerCase() === tomorrow.toLowerCase());

        if (tomorrowFours.length === 0) {
            tomorrowListEl.textContent = "Aucune livraison prévue pour demain.";
            tomorrowListEl.className = "text-sm text-muted";
        } else {
            tomorrowListEl.textContent = tomorrowFours.map(f => `${f.nom_prenom} (${f.produit || 'Marchandise'})`).join(' • ');
            tomorrowListEl.className = "text-sm font-bold text-accent";
        }
    }

    function renderGrid() {
        const columns = [
            { key: 'nom_prenom', label: 'Nom & Prénom', render: (val) => `<b class="text-primary">${val}</b>` },
            { key: 'produit', label: 'Type de Produit' },
            { key: 'num_tel', label: 'Téléphone' },
            { key: 'adresse', label: 'Adresse' },
            { 
                key: 'date_tour', 
                label: 'Jour de Passage', 
                render: (val) => `<span class="badge badge-accent">${val || 'Non défini'}</span>` 
            },
            {
                key: 'actions',
                label: 'Actions',
                render: (_, row) => `
                    <div class="flex gap-1">
                        <button type="button" class="btn btn-ghost btn-sm text-accent btn-edit-four" data-id="${row.id}">✎</button>
                        <button type="button" class="btn btn-ghost btn-sm text-danger btn-del-four" data-id="${row.id}">🗑</button>
                    </div>
                `
            }
        ];

        if (!gridInstance) {
            gridInstance = createDataGrid({
                columns,
                data: allFournisseurs,
                keyField: 'id',
                searchPlaceholder: "Rechercher un fournisseur..."
            });
            gridSlot.appendChild(gridInstance.element);
        } else {
            gridInstance.setData(allFournisseurs);
        }

        page.querySelectorAll('.btn-edit-four').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const f = allFournisseurs.find(x => String(x.id) === id);
                if (f) openFournisseurModal(f);
            });
        });

        page.querySelectorAll('.btn-del-four').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const f = allFournisseurs.find(x => String(x.id) === id);
                const ok = await confirmDialog(`Supprimer le fournisseur "${f?.nom_prenom}" ?`, "Confirmation");
                if (ok) {
                    await fournisseurRepo.remove(id);
                    toast.success("Fournisseur supprimé.");
                    loadData();
                }
            });
        });
    }

    function openFournisseurModal(existing = null) {
        const isEdit = existing !== null;
        const container = document.createElement('div');
        container.className = 'flex flex-col gap-3';

        const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

        container.innerHTML = `
            <div class="form-group">
                <label class="form-label">Nom / Raison Sociale</label>
                <input type="text" id="f-nom" class="form-input font-bold" value="${existing?.nom_prenom || ''}" required />
            </div>
            <div class="form-group">
                <label class="form-label">Type de Produit Livré</label>
                <input type="text" id="f-prod" class="form-input" value="${existing?.produit || ''}" />
            </div>
            <div class="grid grid-2 gap-2">
                <div class="form-group">
                    <label class="form-label">Numéro de Téléphone</label>
                    <input type="text" id="f-tel" class="form-input" value="${existing?.num_tel || ''}" />
                </div>
                <div class="form-group">
                    <label class="form-label">Jour de Passage (Tour)</label>
                    <select id="f-tour" class="form-select">
                        ${days.map(d => `<option value="${d}" ${existing?.date_tour === d ? 'selected' : ''}>${d}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Adresse</label>
                <input type="text" id="f-adr" class="form-input" value="${existing?.adresse || ''}" />
            </div>
        `;

        showModal({
            title: isEdit ? "Modifier Fournisseur" : "Nouveau Fournisseur",
            content: container,
            confirmText: isEdit ? "Enregistrer" : "Créer",
            onConfirm: async () => {
                const nom = container.querySelector('#f-nom').value.trim();
                const prod = container.querySelector('#f-prod').value.trim();
                const tel = container.querySelector('#f-tel').value.trim();
                const tour = container.querySelector('#f-tour').value;
                const adr = container.querySelector('#f-adr').value.trim();

                if (!nom) {
                    toast.warning("Nom du fournisseur requis.");
                    return false;
                }

                const data = { nom_prenom: nom, produit: prod, num_tel: tel, date_tour: tour, adresse: adr };

                try {
                    if (isEdit) {
                        await fournisseurRepo.update(existing.id, data);
                        toast.success("Fournisseur mis à jour.");
                    } else {
                        await fournisseurRepo.add(data);
                        toast.success("Fournisseur ajouté avec succès.");
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

    page.querySelector('.btn-add-fournisseur').addEventListener('click', () => {
        openFournisseurModal();
    });

    loadData();
    return page;
}
