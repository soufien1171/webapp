// Page — Modifier Facture (Ajustement des quantités & suppression de lignes)
import * as factureRepo from '../db/repositories/facture-repo.js';
import * as venteRepo from '../db/repositories/vente-repo.js';
import * as produitRepo from '../db/repositories/produit-repo.js';
import { formatDinars } from '../helpers/money-helper.js';
import { toast } from '../components/toast.js';
import { confirmDialog } from '../components/modal.js';
import { navigateTo } from '../router.js';

export function renderModifierFacturePage() {
    const page = document.createElement('div');
    page.className = 'modifier-facture-page flex flex-col h-full gap-4';

    // Get id from URL e.g. #/modifier-facture?id=123
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.split('?')[1] || '');
    const factureId = urlParams.get('id');

    let facture = null;
    let lines = [];

    page.innerHTML = `
        <div class="card p-4 flex flex-between items-center">
            <div>
                <h2 class="text-xl font-bold text-primary">Modification Facture #${factureId || '—'}</h2>
                <p class="text-xs text-secondary">Ajustez les quantités vendues. Le stock sera automatiquement recalculé.</p>
            </div>
            <button type="button" class="btn btn-secondary btn-sm btn-back-factures">❮ Retour aux Factures</button>
        </div>

        <div class="card p-0 flex-1 overflow-hidden flex flex-col">
            <div class="table-responsive flex-1 overflow-y-auto">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Article</th>
                            <th class="text-center" style="width: 150px;">Quantité</th>
                            <th class="text-right">Prix Unitaire</th>
                            <th class="text-right">Total Ligne</th>
                            <th class="text-center" style="width: 60px;"></th>
                        </tr>
                    </thead>
                    <tbody id="lines-tbody">
                        <tr><td colspan="5" class="text-center py-10 text-muted">Chargement...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Footer Recalculated Total -->
            <div class="p-4 border-t bg-secondary flex flex-between items-center">
                <div>
                    <span class="text-xs text-secondary">Nouveau Total Facture:</span>
                    <div id="new-total-label" class="text-2xl font-extrabold text-accent">0.000 DT</div>
                </div>
                <button type="button" class="btn btn-success font-bold btn-save-changes">
                    Enregistrer Modifications ✓
                </button>
            </div>
        </div>
    `;

    const linesTbody = page.querySelector('#lines-tbody');
    const newTotalLabel = page.querySelector('#new-total-label');

    async function loadLines() {
        if (!factureId) {
            toast.error("Aucun identifiant de facture spécifié.");
            navigateTo('#/factures');
            return;
        }

        facture = await factureRepo.getById(factureId);
        if (!facture) {
            toast.error("Facture introuvable.");
            navigateTo('#/factures');
            return;
        }

        lines = await venteRepo.getByFacture(factureId);
        renderTable();
    }

    function calculateTotal() {
        const total = lines.reduce((acc, l) => acc + Number(l.prix_vt), 0);
        newTotalLabel.textContent = `${formatDinars(total / 1000)} DT`;
        return total;
    }

    function renderTable() {
        if (lines.length === 0) {
            linesTbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-muted">Aucune ligne dans cette facture.</td></tr>`;
            newTotalLabel.textContent = '0.000 DT';
            return;
        }

        linesTbody.innerHTML = lines.map((line, idx) => {
            const pu = Number(line.pr2 || line.prix_vt) / 1000;
            const total = Number(line.prix_vt) / 1000;

            return `
                <tr data-idx="${idx}">
                    <td>
                        <div class="font-bold text-sm">${line.nom_vt}</div>
                        <div class="text-xs text-muted font-mono">${line.code_barre_vt}</div>
                    </td>
                    <td class="text-center">
                        <div class="flex flex-center items-center gap-1">
                            <button type="button" class="btn btn-ghost btn-sm btn-sub-qty font-bold">-</button>
                            <input type="number" step="any" min="0" class="form-input text-center text-xs font-bold line-qty-input" 
                                style="width: 70px;" value="${line.quantite_vt}" />
                            <button type="button" class="btn btn-ghost btn-sm btn-add-qty font-bold">+</button>
                        </div>
                    </td>
                    <td class="text-right font-mono text-sm">${formatDinars(pu)} DT</td>
                    <td class="text-right font-mono font-bold text-accent text-sm">${formatDinars(total)} DT</td>
                    <td class="text-center">
                        <button type="button" class="btn btn-ghost btn-sm text-danger btn-del-line">&times;</button>
                    </td>
                </tr>
            `;
        }).join('');

        calculateTotal();

        // Listeners for quantity adjust
        linesTbody.querySelectorAll('.btn-sub-qty').forEach((btn, i) => {
            btn.addEventListener('click', () => {
                if (lines[i].quantite_vt > 1) {
                    lines[i].quantite_vt -= 1;
                    const pu = Number(lines[i].pr2 || lines[i].prix_vt);
                    lines[i].prix_vt = pu * lines[i].quantite_vt;
                    renderTable();
                }
            });
        });

        linesTbody.querySelectorAll('.btn-add-qty').forEach((btn, i) => {
            btn.addEventListener('click', () => {
                lines[i].quantite_vt += 1;
                const pu = Number(lines[i].pr2 || lines[i].prix_vt);
                lines[i].prix_vt = pu * lines[i].quantite_vt;
                renderTable();
            });
        });

        linesTbody.querySelectorAll('.btn-del-line').forEach((btn, i) => {
            btn.addEventListener('click', () => {
                lines.splice(i, 1);
                renderTable();
            });
        });
    }

    page.querySelector('.btn-back-factures').addEventListener('click', () => {
        navigateTo('#/factures');
    });

    page.querySelector('.btn-save-changes').addEventListener('click', async () => {
        const ok = await confirmDialog("Confirmez-vous la modification de la facture ?", "Sauvegarder");
        if (!ok) return;

        try {
            const originalVentes = await venteRepo.getByFacture(factureId);

            // Reconcile stock: return previous amounts, deduct new amounts
            for (const orig of originalVentes) {
                await produitRepo.updateStock(orig.code_barre_vt, Number(orig.quantite_vt));
            }

            // Remove old lines
            await venteRepo.deleteByFacture(factureId);

            // Insert updated lines & deduct new stock
            for (const line of lines) {
                await venteRepo.add(line);
                await produitRepo.updateStock(line.code_barre_vt, -Number(line.quantite_vt));
            }

            // Update facture total
            const newTotalMillimes = calculateTotal();
            await factureRepo.update(factureId, { prix_tt: newTotalMillimes });

            toast.success("Facture mise à jour avec succès!");
            navigateTo('#/factures');

        } catch (err) {
            console.error(err);
            toast.error("Erreur lors de la mise à jour de la facture.");
        }
    });

    loadLines();
    return page;
}
