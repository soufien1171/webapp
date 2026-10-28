// Page — Factures & Historique des Ventes (Filtres, Bénéfices, Détails & Annulation)
import * as factureRepo from '../db/repositories/facture-repo.js';
import * as venteRepo from '../db/repositories/vente-repo.js';
import * as utilisateurRepo from '../db/repositories/utilisateur-repo.js';
import * as settingsRepo from '../db/repositories/settings-repo.js';
import { formatDinars } from '../helpers/money-helper.js';
import { createDataGrid } from '../components/data-grid.js';
import { promptPin } from '../components/input-box.js';
import { confirmDialog, alertDialog } from '../components/modal.js';
import { printReceipt } from '../components/ticket-printer.js';
import { toast } from '../components/toast.js';

export function renderFacturesPage() {
    const page = document.createElement('div');
    page.className = 'factures-page flex flex-col h-full gap-4';

    let allFactures = [];
    let allVentes = [];
    let allUsers = [];
    let currentFilter = 'ALL'; // ALL, TODAY, MONTH, YEAR

    page.innerHTML = `
        <div class="card p-4 flex flex-between items-center flex-wrap gap-3">
            <div>
                <h2 class="text-xl font-bold text-primary">Historique des Factures</h2>
                <p class="text-xs text-secondary">Consultez, réimprimez ou modifiez les tickets de caisse</p>
            </div>

            <!-- Filters -->
            <div class="flex gap-2">
                <button type="button" class="btn btn-primary btn-sm filter-btn active" data-filter="ALL">Toutes</button>
                <button type="button" class="btn btn-secondary btn-sm filter-btn" data-filter="TODAY">Aujourd'hui</button>
                <button type="button" class="btn btn-secondary btn-sm filter-btn" data-filter="MONTH">Ce Mois</button>
                <button type="button" class="btn btn-secondary btn-sm filter-btn" data-filter="YEAR">Cette Année</button>
            </div>
        </div>

        <!-- Financial Stats Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="stat-card">
                <span class="text-xs text-secondary">Chiffre d'Affaires Total</span>
                <div class="text-2xl font-bold text-accent" id="stat-ca">0.000 DT</div>
            </div>
            <div class="stat-card">
                <span class="text-xs text-secondary">Bénéfice Net Estimé</span>
                <div class="text-2xl font-bold text-success" id="stat-profit">0.000 DT</div>
            </div>
            <div class="stat-card">
                <span class="text-xs text-secondary">Nombre de Factures</span>
                <div class="text-2xl font-bold text-primary" id="stat-count">0</div>
            </div>
        </div>

        <!-- Invoices Grid Slot -->
        <div class="flex-1 overflow-hidden" id="invoices-grid-slot"></div>
    `;

    const statCA = page.querySelector('#stat-ca');
    const statProfit = page.querySelector('#stat-profit');
    const statCount = page.querySelector('#stat-count');
    const gridSlot = page.querySelector('#invoices-grid-slot');

    let gridInstance = null;

    async function loadData() {
        allFactures = await factureRepo.getAll();
        allVentes = await venteRepo.getAll();
        allUsers = await utilisateurRepo.getAll();
        applyFilter();
    }

    function applyFilter() {
        const todayStr = new Date().toISOString().split('T')[0];
        const thisMonthStr = todayStr.substring(0, 7);
        const thisYearStr = todayStr.substring(0, 4);

        let filtered = [...allFactures];
        if (currentFilter === 'TODAY') {
            filtered = filtered.filter(f => f.date_fac === todayStr);
        } else if (currentFilter === 'MONTH') {
            filtered = filtered.filter(f => f.date_fac && f.date_fac.startsWith(thisMonthStr));
        } else if (currentFilter === 'YEAR') {
            filtered = filtered.filter(f => f.date_fac && f.date_fac.startsWith(thisYearStr));
        }

        // Calculate CA
        const totalMillimes = filtered.reduce((acc, f) => acc + Number(f.prix_tt), 0);
        statCA.textContent = `${formatDinars(totalMillimes / 1000)} DT`;
        statCount.textContent = filtered.length;

        // Calculate Net Profit = Sales Total - Purchase Cost Total for these invoices
        const invoiceIds = new Set(filtered.map(f => String(f.id_fac)));
        const relevantVentes = allVentes.filter(v => invoiceIds.has(String(v.facture)));
        
        let profitMillimes = 0;
        relevantVentes.forEach(v => {
            const ventePx = Number(v.prix_vt);
            const achatPx = Number(v.prix_achat) * Number(v.quantite_vt);
            profitMillimes += (ventePx - achatPx);
        });
        statProfit.textContent = `${formatDinars(profitMillimes / 1000)} DT`;

        // Render Data Grid
        const displayFactures = filtered.map(facture => ({
            ...facture,
            username: allUsers.find(user => String(user.cin) === String(facture.cin_user))?.username || facture.cin_user
        }));

        const columns = [
            { key: 'id_fac', label: 'N° Facture' },
            { key: 'date_fac', label: 'Date', render: (val, row) => `${val} à ${row.temp_fac || ''}` },
            { key: 'username', label: 'Caissier (Nom d’utilisateur)' },
            { key: 'remise', label: 'Remise', render: (val) => val > 0 ? `<span class="text-warning">-${formatDinars(val / 1000)} DT</span>` : '-' },
            { key: 'prix_tt', label: 'Montant Total', render: (val) => `<b class="text-accent">${formatDinars(val / 1000)} DT</b>` },
            { 
                key: 'actions', 
                label: 'Actions', 
                render: (_, row) => `
                    <div class="flex gap-1">
                        <button type="button" class="btn btn-secondary btn-sm btn-print-fac" data-id="${row.id_fac}" title="Réimprimer ticket">🖨 Impr.</button>
                        <button type="button" class="btn btn-ghost btn-sm text-accent btn-edit-fac" data-id="${row.id_fac}" title="Modifier facture">✎ Modif.</button>
                        <button type="button" class="btn btn-ghost btn-sm text-danger btn-del-fac" data-id="${row.id_fac}" title="Annuler et restituer stock">🗑</button>
                    </div>
                ` 
            }
        ];

        if (!gridInstance) {
            gridInstance = createDataGrid({
                columns,
                data: displayFactures,
                keyField: 'id_fac',
                searchPlaceholder: "Rechercher par n° facture, caissier..."
            });
            gridSlot.appendChild(gridInstance.element);
        } else {
            gridInstance.setData(displayFactures);
        }

        attachGridActions();
    }

    function attachGridActions() {
        // Print
        page.querySelectorAll('.btn-print-fac').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const fac = allFactures.find(f => String(f.id_fac) === id);
                const items = await venteRepo.getByFacture(id);
                if (fac) {
                    await printReceipt(fac, items);
                    toast.success(`Impression de la facture #${id} lancée.`);
                }
            });
        });

        // Edit
        page.querySelectorAll('.btn-edit-fac').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                // Require PIN
                const pin = await promptPin("Code PIN Administrateur");
                if (!pin) return;
                const valid = await settingsRepo.verifyPin(pin);
                if (!valid) {
                    toast.error("Code PIN invalide!");
                    return;
                }
                window.location.hash = `#/modifier-facture?id=${id}`;
            });
        });

        // Cancel / Delete & Restitute
        page.querySelectorAll('.btn-del-fac').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                
                const pin = await promptPin("Code PIN Requis pour Annuler");
                if (!pin) return;
                const valid = await settingsRepo.verifyPin(pin);
                if (!valid) {
                    toast.error("Code PIN invalide!");
                    return;
                }

                const ok = await confirmDialog(`Voulez-vous annuler la facture #${id} ? Les articles seront automatiquement restitués au stock.`, "Annulation Facture");
                if (ok) {
                    try {
                        await factureRepo.remove(id);
                        toast.success(`Facture #${id} annulée et stock restitué.`);
                        loadData();
                    } catch (err) {
                        toast.error(err.message);
                    }
                }
            });
        });
    }

    // Filter Buttons
    page.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            page.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('btn-primary', 'active');
                b.classList.add('btn-secondary');
            });
            btn.classList.add('btn-primary', 'active');
            btn.classList.remove('btn-secondary');
            currentFilter = btn.dataset.filter;
            applyFilter();
        });
    });

    loadData();
    return page;
}
