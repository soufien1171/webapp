// Page — Gestion des Produits & Stock (CRUD, Alertes, Valorisation & EAN-13)
import * as produitRepo from '../db/repositories/produit-repo.js';
import * as categorieRepo from '../db/repositories/categorie-repo.js';
import * as fournisseurRepo from '../db/repositories/fournisseur-repo.js';
import { formatDinars, toMillimes } from '../helpers/money-helper.js';
import { generateEan13 } from '../helpers/barcode-helper.js';
import { processImageFile } from '../helpers/image-helper.js';
import { createDataGrid } from '../components/data-grid.js';
import { showModal, confirmDialog } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { startScanning, stopScanning } from '../helpers/scanner.js';

export function renderProduitsPage() {
    const page = document.createElement('div');
    page.className = 'produits-page flex flex-col h-full gap-4';

    let allProducts = [];
    let allCategories = [];
    let allFournisseurs = [];

    page.innerHTML = `
        <div class="card p-4 flex flex-between items-center flex-wrap gap-3">
            <div>
                <h2 class="text-xl font-bold text-primary">Articles & Stock</h2>
                <p class="text-xs text-secondary">Catalogue des produits, valorisation et contrôle des stocks</p>
            </div>
            <div class="flex gap-2">
                <button type="button" class="btn btn-secondary btn-sm btn-manage-cats">📁 Catégories</button>
                <button type="button" class="btn btn-primary btn-sm btn-add-prod">+ Nouvel Article</button>
            </div>
        </div>

        <div id="catalogues-prerequis" class="card p-3 text-warning hidden" role="alert" aria-live="polite">
            Il est nécessaire d'ajouter les fournisseurs et les catégories d'articles avant d'ajouter les articles.
        </div>

        <!-- Inventory Valuation & Alert Badges -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="stat-card">
                <span class="text-xs text-secondary">Valeur Stock (Vente)</span>
                <div class="text-xl font-bold text-accent" id="val-vente">0.000 DT</div>
            </div>
            <div class="stat-card">
                <span class="text-xs text-secondary">Coût Stock (Achat)</span>
                <div class="text-xl font-bold text-secondary" id="val-achat">0.000 DT</div>
            </div>
            <div class="stat-card">
                <span class="text-xs text-secondary">Marge Prévisionnelle</span>
                <div class="text-xl font-bold text-success" id="val-marge">0.000 DT</div>
            </div>
            <div class="stat-card">
                <span class="text-xs text-secondary">Alertes Stock / Exp.</span>
                <div class="flex gap-2 mt-1">
                    <span class="badge badge-danger" id="badge-low-stock">0 Stock Bas</span>
                    <span class="badge badge-warning" id="badge-exp">0 Expirant</span>
                </div>
            </div>
        </div>

        <!-- Products Grid Slot -->
        <div class="flex-1 overflow-hidden" id="prods-grid-slot"></div>
    `;

    const valVente = page.querySelector('#val-vente');
    const valAchat = page.querySelector('#val-achat');
    const valMarge = page.querySelector('#val-marge');
    const badgeLowStock = page.querySelector('#badge-low-stock');
    const badgeExp = page.querySelector('#badge-exp');
    const gridSlot = page.querySelector('#prods-grid-slot');
    const prerequisiteNotice = page.querySelector('#catalogues-prerequis');

    let gridInstance = null;

    async function loadData() {
        allProducts = await produitRepo.getAll();
        allCategories = await categorieRepo.getAll();
        allFournisseurs = await fournisseurRepo.getAll();
        prerequisiteNotice.classList.toggle('hidden', allCategories.length > 0 && allFournisseurs.length > 0);
        updateStats();
        renderGrid();
    }

    function updateStats() {
        let totalVenteMillimes = 0;
        let totalAchatMillimes = 0;
        let lowStockCount = 0;
        let expCount = 0;

        const now = new Date();
        const limitExp = new Date();
        limitExp.setDate(limitExp.getDate() + 15);

        allProducts.forEach(p => {
            const qte = Number(p.quantite_p || 0);
            totalVenteMillimes += Number(p.prix_p) * qte;
            totalAchatMillimes += Number(p.prix_achat || 0) * qte;

            if (qte <= Number(p.quantite_min || 0)) lowStockCount++;
            if (p.date_exp && new Date(p.date_exp) <= limitExp) expCount++;
        });

        valVente.textContent = `${formatDinars(totalVenteMillimes / 1000)} DT`;
        valAchat.textContent = `${formatDinars(totalAchatMillimes / 1000)} DT`;
        valMarge.textContent = `${formatDinars((totalVenteMillimes - totalAchatMillimes) / 1000)} DT`;

        badgeLowStock.textContent = `${lowStockCount} Stock Bas`;
        badgeExp.textContent = `${expCount} Expirant`;
    }

    function renderGrid() {
        const columns = [
            { 
                key: 'nom_p', 
                label: 'Désignation', 
                render: (val, row) => `
                    <div class="flex items-center gap-2">
                        ${row.lien_img ? `<img src="${row.lien_img}" style="width:28px;height:28px;border-radius:4px;object-fit:cover;" />` : ''}
                        <div>
                            <div class="font-bold text-sm">${val}</div>
                            <div class="text-xs text-muted font-mono">${row.code_barre}</div>
                        </div>
                    </div>
                ` 
            },
            { key: 'categorie', label: 'Catégorie' },
            { 
                key: 'prix_p', 
                label: 'Prix Vente', 
                render: (val) => `<b class="text-accent">${formatDinars(val / 1000)} DT</b>` 
            },
            { 
                key: 'quantite_p', 
                label: 'Stock Dispo', 
                render: (val, row) => {
                    const isLow = Number(val) <= Number(row.quantite_min);
                    return `
                        <span class="badge ${isLow ? 'badge-danger' : 'badge-success'}">
                            ${row.rayon === 2 ? Number(val).toFixed(3) : val}
                        </span>
                    `;
                }
            },
            { key: 'date_exp', label: 'Expiration', render: (val) => val || '—' },
            {
                key: 'actions',
                label: 'Actions',
                render: (_, row) => `
                    <div class="flex gap-1">
                        <button type="button" class="btn btn-ghost btn-sm text-accent btn-edit-p" data-code="${row.code_barre}">✎</button>
                        <button type="button" class="btn btn-ghost btn-sm text-danger btn-del-p" data-code="${row.code_barre}">🗑</button>
                    </div>
                `
            }
        ];

        if (!gridInstance) {
            gridInstance = createDataGrid({
                columns,
                data: allProducts,
                keyField: 'code_barre',
                searchPlaceholder: "Rechercher par nom, code-barres, catégorie..."
            });
            gridSlot.appendChild(gridInstance.element);
        } else {
            gridInstance.setData(allProducts);
        }

        // Attach action listeners
        page.querySelectorAll('.btn-edit-p').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = btn.dataset.code;
                const prod = allProducts.find(p => p.code_barre === code);
                if (prod) openProductModal(prod);
            });
        });

        page.querySelectorAll('.btn-del-p').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const code = btn.dataset.code;
                const prod = allProducts.find(p => p.code_barre === code);
                const ok = await confirmDialog(`Supprimer définitivement l'article "${prod?.nom_p}" ?`, "Suppression");
                if (ok) {
                    await produitRepo.remove(code);
                    toast.success("Article supprimé.");
                    loadData();
                }
            });
        });
    }

    // Modal: Add or Edit Product
    function openProductModal(existingProd = null) {
        const isEdit = existingProd !== null;
        const container = document.createElement('div');
        container.className = 'product-form-container';

        container.innerHTML = `
            <form class="product-modal-form flex flex-col gap-3">
                <div class="grid grid-2 gap-2">
                    <div class="form-group">
                        <label class="form-label">Code-barres</label>
                        <div class="flex gap-1">
                            <input type="text" id="p-code" class="form-input flex-1 font-mono text-sm" 
                                value="${existingProd?.code_barre || ''}" required ${isEdit ? 'readonly' : ''} />
                            ${!isEdit ? `<button type="button" class="btn btn-secondary btn-sm btn-gen-ean" title="Générer code EAN-13">🎲 EAN</button><button type="button" class="btn btn-secondary btn-sm btn-scan-product" title="Scanner avec la caméra">📷 Scanner</button>` : ''}
                        </div>
                        <div id="product-camera-wrapper" class="hidden mt-2">
                            <div id="product-camera-view" style="width:100%;max-width:480px;margin:0 auto"></div>
                            <button type="button" class="btn btn-ghost btn-sm btn-stop-product-camera">Fermer la caméra</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Rayon / Type</label>
                        <select id="p-rayon" class="form-select">
                            <option value="1" ${existingProd?.rayon === 1 ? 'selected' : ''}>Par Unité (Pièce)</option>
                            <option value="2" ${existingProd?.rayon === 2 ? 'selected' : ''}>Par Poids (Pesé au kg)</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Désignation du Produit</label>
                    <input type="text" id="p-nom" class="form-input font-bold" 
                        value="${existingProd?.nom_p || ''}" placeholder="Ex: Eau Minérale 1.5L" required />
                </div>

                <div class="grid grid-2 gap-2">
                    <div class="form-group">
                        <label class="form-label">Prix de Vente (DT)</label>
                        <input type="number" step="0.001" id="p-prix-vente" class="form-input font-bold text-accent" 
                            value="${existingProd ? (existingProd.prix_p / 1000).toFixed(3) : '0.000'}" required />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Prix d'Achat (DT)</label>
                        <input type="number" step="0.001" id="p-prix-achat" class="form-input" 
                            value="${existingProd ? (existingProd.prix_achat / 1000).toFixed(3) : '0.000'}" />
                    </div>
                </div>

                <div class="grid grid-2 gap-2">
                    <div class="form-group">
                        <label class="form-label">Quantité en Stock</label>
                        <input type="number" step="any" id="p-qte" class="form-input" 
                            value="${existingProd ? existingProd.quantite_p : '50'}" required />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Seuil d'Alerte Minimum</label>
                        <input type="number" step="any" id="p-qte-min" class="form-input" 
                            value="${existingProd ? existingProd.quantite_min : '10'}" />
                    </div>
                </div>

                <div class="grid grid-2 gap-2">
                    <div class="form-group">
                        <label class="form-label">Catégorie</label>
                        <select id="p-cat" class="form-select">
                            ${allCategories.map(c => `
                                <option value="${c.nom_cat}" ${existingProd?.categorie === c.nom_cat ? 'selected' : ''}>${c.nom_cat}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Fournisseur</label>
                        <select id="p-four" class="form-select">
                            <option value="">-- Aucun --</option>
                            ${allFournisseurs.map(f => `
                                <option value="${f.nom_prenom}" ${existingProd?.fournisseur === f.nom_prenom ? 'selected' : ''}>${f.nom_prenom}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Date d'Expiration</label>
                    <input type="date" id="p-exp" class="form-input" 
                        value="${existingProd?.date_exp || ''}" />
                </div>

                <div class="form-group">
                    <label class="form-label">Photo du Produit</label>
                    <input type="file" id="p-img-file" class="form-input text-xs" accept="image/*" />
                    <input type="hidden" id="p-img-base64" value="${existingProd?.lien_img || ''}" />
                </div>
            </form>
        `;

        // EAN Gen
        const genBtn = container.querySelector('.btn-gen-ean');
        if (genBtn) {
            genBtn.addEventListener('click', () => {
                container.querySelector('#p-code').value = generateEan13();
            });
        }

        const cameraWrapper = container.querySelector('#product-camera-wrapper');
        const productCodeInput = container.querySelector('#p-code');
        // Les lecteurs USB/Bluetooth se comportent comme un clavier et terminent
        // généralement la saisie par Entrée.
        productCodeInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                productCodeInput.value = productCodeInput.value.trim();
            }
        });
        const stopProductCamera = async () => {
            await stopScanning();
            cameraWrapper.classList.add('hidden');
        };
        container.querySelector('.btn-scan-product')?.addEventListener('click', async () => {
            cameraWrapper.classList.remove('hidden');
            try {
                await startScanning('product-camera-view', (code) => {
                    container.querySelector('#p-code').value = code.trim();
                    toast.success('Code-barres détecté.');
                    stopProductCamera();
                }, { fps: 24 });
            } catch (err) {
                cameraWrapper.classList.add('hidden');
                toast.error(err.message);
            }
        });
        container.querySelector('.btn-stop-product-camera')?.addEventListener('click', stopProductCamera);

        // Image upload
        container.querySelector('#p-img-file').addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (file) {
                try {
                    const base64 = await processImageFile(file, 250);
                    container.querySelector('#p-img-base64').value = base64;
                    toast.success("Image traitée avec succès.");
                } catch (err) {
                    toast.error(err.message);
                }
            }
        });

        showModal({
            title: isEdit ? "Modifier l'Article" : "Nouvel Article",
            content: container,
            onCancel: stopProductCamera,
            confirmText: isEdit ? "Enregistrer" : "Créer",
            onConfirm: async () => {
                await stopProductCamera();
                const code = container.querySelector('#p-code').value.trim();
                const nom = container.querySelector('#p-nom').value.trim();
                const pxVente = parseFloat(container.querySelector('#p-prix-vente').value) || 0;
                const pxAchat = parseFloat(container.querySelector('#p-prix-achat').value) || 0;
                const qte = parseFloat(container.querySelector('#p-qte').value) || 0;
                const qteMin = parseFloat(container.querySelector('#p-qte-min').value) || 0;
                const rayon = parseInt(container.querySelector('#p-rayon').value, 10);
                const cat = container.querySelector('#p-cat').value;
                const four = container.querySelector('#p-four').value;
                const exp = container.querySelector('#p-exp').value;
                const img = container.querySelector('#p-img-base64').value;

                if (!code || !nom) {
                    toast.warning("Veuillez renseigner le code-barres et le nom du produit.");
                    return false;
                }

                const data = {
                    code_barre: code,
                    nom_p: nom,
                    prix_p: toMillimes(pxVente),
                    prix_achat: toMillimes(pxAchat),
                    quantite_p: qte,
                    quantite_min: qteMin,
                    rayon,
                    categorie: cat,
                    fournisseur: four,
                    date_exp: exp,
                    lien_img: img
                };

                try {
                    if (isEdit) {
                        await produitRepo.update(code, data);
                        toast.success("Article mis à jour.");
                    } else {
                        await produitRepo.add(data);
                        toast.success("Article ajouté avec succès.");
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

    page.querySelector('.btn-add-prod').addEventListener('click', () => {
        if (allCategories.length === 0 || allFournisseurs.length === 0) {
            prerequisiteNotice.classList.remove('hidden');
            prerequisiteNotice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }
        openProductModal();
    });

    // Categories Manager Modal
    page.querySelector('.btn-manage-cats').addEventListener('click', () => {
        openCategoriesModal();
    });

    function openCategoriesModal() {
        const modalContainer = document.createElement('div');
        modalContainer.className = 'cats-manager-container flex flex-col gap-3';

        function renderCatList() {
            modalContainer.innerHTML = `
                <div class="flex gap-2">
                    <input type="text" id="new-cat-input" class="form-input flex-1" placeholder="Nouvelle catégorie..." />
                    <button type="button" class="btn btn-primary btn-add-cat-btn">+ Ajouter</button>
                </div>
                <div class="cats-list card p-2 max-height-60 overflow-y-auto">
                    ${allCategories.map(c => `
                        <div class="flex flex-between items-center p-2 border-b">
                            <span class="font-medium text-sm">${c.nom_cat}</span>
                            <button type="button" class="btn btn-ghost btn-sm text-danger btn-del-cat" data-id="${c.id}">&times;</button>
                        </div>
                    `).join('')}
                </div>
            `;

            modalContainer.querySelector('.btn-add-cat-btn').addEventListener('click', async () => {
                const val = modalContainer.querySelector('#new-cat-input').value.trim();
                if (val) {
                    try {
                        await categorieRepo.add(val);
                        allCategories = await categorieRepo.getAll();
                        renderCatList();
                        toast.success("Catégorie ajoutée.");
                    } catch (err) {
                        toast.error(err.message);
                    }
                }
            });

            modalContainer.querySelectorAll('.btn-del-cat').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id;
                    await categorieRepo.remove(id);
                    allCategories = await categorieRepo.getAll();
                    renderCatList();
                });
            });
        }

        renderCatList();

        showModal({
            title: "Gestion des Catégories",
            content: modalContainer,
            confirmText: "Fermer",
            showCancel: false,
            onConfirm: () => {
                loadData();
            }
        });
    }

    loadData();
    return page;
}
