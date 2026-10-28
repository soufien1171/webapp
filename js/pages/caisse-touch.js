// Page — Caisse Tactile (Mode Tactile avec Grille Catégories & Produits)
import * as produitRepo from '../db/repositories/produit-repo.js';
import * as categorieRepo from '../db/repositories/categorie-repo.js';
import * as caisseRepo from '../db/repositories/caisse-repo.js';
import * as factureRepo from '../db/repositories/facture-repo.js';
import * as venteRepo from '../db/repositories/vente-repo.js';
import * as settingsRepo from '../db/repositories/settings-repo.js';
import { getEmployeeSession } from '../auth.js';
import { navigateTo } from '../router.js';
import { formatDinars, toMillimes } from '../helpers/money-helper.js';
import { getProductPlaceholder } from '../helpers/image-helper.js';
import { promptAmount } from '../components/input-box.js';
import { openPaymentDrawer } from '../components/payment-panel.js';
import { printReceipt } from '../components/ticket-printer.js';
import { toast } from '../components/toast.js';
import { confirmDialog } from '../components/modal.js';

export function renderCaisseTouchPage() {
    const page = document.createElement('div');
    page.className = 'caisse-touch-view flex flex-col h-full gap-3';

    let cart = [];
    let allProducts = [];
    let allCategories = [];
    let selectedCategory = 'ALL';
    let activeSession = null;
    let appliedDiscountDinars = 0;
    let storeSettings = null;

    page.innerHTML = `
        <div class="caisse-touch-header card p-3 flex flex-between items-center">
            <div class="flex items-center gap-2">
                <span class="font-bold text-lg text-primary">Caisse Tactile</span>
                <span class="badge badge-accent">Mode Touch</span>
                <span class="badge badge-secondary text-xs" id="touch-layout-indicator">5 col.</span>
            </div>
            <div class="flex items-center gap-2">
                <button type="button" class="btn btn-secondary btn-switch-scanner">
                    ⌨ Mode Scanner
                </button>
                <button type="button" class="btn btn-ghost text-danger btn-clear-touch-cart">
                    🗑 Vider
                </button>
            </div>
        </div>

        <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
            <!-- Left: Categories + Products Grid (7 cols) -->
            <div class="lg:col-span-7 flex flex-col gap-3 overflow-hidden">
                <!-- Categories Horizontal Scroll Bar -->
                <div class="category-tabs-bar flex gap-2 overflow-x-auto pb-1" id="cat-tabs-slot">
                    <button type="button" class="btn btn-primary btn-sm cat-tab active" data-cat="ALL">Toutes</button>
                </div>

                <!-- Products Grid -->
                <div class="card p-3 flex-1 overflow-y-auto">
                    <div id="products-grid-slot" class="gap-2">
                        <div class="text-center py-10 text-muted col-span-full">Chargement des produits...</div>
                    </div>
                </div>
            </div>

            <!-- Right: Cart & Fast Checkout (5 cols) -->
            <div class="lg:col-span-5 card p-0 flex flex-col overflow-hidden">
                <div class="p-3 border-b bg-card flex flex-between items-center">
                    <span class="font-semibold text-sm">Ticket en cours</span>
                    <span class="text-xs text-secondary"><span id="touch-qty-count">0</span> article(s)</span>
                </div>

                <div class="table-responsive flex-1 overflow-y-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Article</th>
                                <th class="text-center">Qté</th>
                                <th class="text-right">Total</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="touch-cart-tbody">
                            <tr>
                                <td colspan="4" class="text-center py-10 text-muted">
                                    Appuyez sur un produit à gauche pour l'ajouter au panier.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Bottom Checkout Section -->
                <div class="p-4 border-t bg-secondary flex flex-col gap-3">
                    <div class="flex flex-between items-center">
                        <span class="text-sm font-semibold text-secondary">Total à Régler</span>
                        <span id="touch-total-label" class="text-3xl font-extrabold text-accent">0.000 DT</span>
                    </div>

                    <div class="flex gap-2">
                        <button type="button" class="btn btn-secondary flex-1 btn-touch-discount">🏷 Remise</button>
                        <button type="button" class="btn btn-success flex-2 font-bold text-lg btn-touch-pay">
                            Encaisser ➔
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const catTabsSlot = page.querySelector('#cat-tabs-slot');
    const productsGridSlot = page.querySelector('#products-grid-slot');
    const cartTbody = page.querySelector('#touch-cart-tbody');
    const totalLabel = page.querySelector('#touch-total-label');
    const qtyCount = page.querySelector('#touch-qty-count');

    // Init data
    (async () => {
        storeSettings = await settingsRepo.getParametres();
        allCategories = await categorieRepo.getAll();
        allProducts = await produitRepo.getAll();
        const emp = getEmployeeSession();
        activeSession = await caisseRepo.getOpenSession(emp?.cin);
        if (!activeSession) {
            if (Number(emp?.role || 1) <= 2) {
                navigateTo('#/caisse-open');
                return;
            }
            activeSession = await caisseRepo.createSession(emp?.cin || '11111111', 50000, emp?.authenticatedAt);
        }

        applyGridColumns();
        renderCategoryTabs();
        renderProductsGrid();
    })();

    function applyGridColumns() {
        const cols = Number(storeSettings?.touch_cols) === 6 ? 6 : 5;
        const indicator = page.querySelector('#touch-layout-indicator');
        if (indicator) indicator.textContent = `${cols} art./ligne`;

        productsGridSlot.style.display = 'grid';
        if (window.innerWidth >= 768) {
            productsGridSlot.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
        } else {
            productsGridSlot.style.gridTemplateColumns = 'repeat(auto-fill, minmax(110px, 1fr))';
        }
    }

    window.addEventListener('resize', applyGridColumns);

    function renderCategoryTabs() {
        catTabsSlot.innerHTML = `
            <button type="button" class="btn ${selectedCategory === 'ALL' ? 'btn-primary' : 'btn-secondary'} btn-sm cat-tab" data-cat="ALL">Toutes</button>
            ${allCategories.map(cat => `
                <button type="button" class="btn ${selectedCategory === cat.nom_cat ? 'btn-primary' : 'btn-secondary'} btn-sm cat-tab" data-cat="${cat.nom_cat}">
                    ${cat.nom_cat}
                </button>
            `).join('')}
        `;

        catTabsSlot.querySelectorAll('.cat-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedCategory = btn.dataset.cat;
                renderCategoryTabs();
                renderProductsGrid();
            });
        });
    }

    function renderProductsGrid() {
        const filtered = selectedCategory === 'ALL' ? allProducts : 
                         allProducts.filter(p => p.categorie === selectedCategory);

        if (filtered.length === 0) {
            productsGridSlot.innerHTML = `<div class="text-center py-10 text-muted col-span-full">Aucun produit dans cette catégorie.</div>`;
            return;
        }

        const showImages = storeSettings ? Boolean(storeSettings.img_para) : true;
        const cols = Number(storeSettings?.touch_cols) === 6 ? 6 : 5;
        const imgHeight = cols === 6 ? '52px' : '65px';

        productsGridSlot.innerHTML = filtered.map(p => {
            const pu = Number(p.prix_p) / 1000;
            const isStockEmpty = Number(p.quantite_p) <= 0;
            return `
                <div class="product-touch-card card p-2 cursor-pointer flex flex-col justify-between select-none ${isStockEmpty ? 'opacity-50' : 'hover:border-accent'}" data-code="${p.code_barre}">
                    ${showImages ? `
                        <div class="product-card-img-wrapper mb-1 bg-slate-900 radius-md overflow-hidden flex flex-center" style="height: ${imgHeight};">
                            ${p.lien_img ? `<img src="${p.lien_img}" alt="${p.nom_p}" style="max-height: 100%; object-fit: contain;" />` : `<span class="text-muted text-xs">📦</span>`}
                        </div>
                    ` : ''}
                    <div class="font-bold text-xs truncate mb-1" title="${p.nom_p}">${p.nom_p}</div>
                    <div class="flex flex-between items-center">
                        <span class="text-accent font-mono font-bold text-xs">${formatDinars(pu)} DT</span>
                        <span class="badge ${isStockEmpty ? 'badge-danger' : 'badge-secondary'} text-xs">${p.rayon === 2 ? 'Pesé' : p.quantite_p}</span>
                    </div>
                </div>
            `;
        }).join('');

        productsGridSlot.querySelectorAll('.product-touch-card').forEach(card => {
            card.addEventListener('click', () => {
                const code = card.dataset.code;
                const prod = allProducts.find(p => p.code_barre === code);
                if (prod) addProductToCart(prod);
            });
        });
    }

    async function addProductToCart(product) {
        const rayon = Number(product.rayon || 1);
        const puDinars = Number(product.prix_p) / 1000;
        const stockDispo = Number(product.quantite_p || 0);

        if (stockDispo <= 0) {
            toast.error("Article épuisé en stock!");
            return;
        }

        if (rayon === 2) {
            const amountEntered = await promptAmount(
                "Produit au Poids",
                `Saisir montant pour "${product.nom_p}" (${formatDinars(puDinars)} DT/kg)`
            );
            if (!amountEntered || amountEntered <= 0) return;
            const qteToAdd = amountEntered / puDinars;

            cart.push({
                code_barre: product.code_barre,
                nom: product.nom_p,
                pu: puDinars,
                qte: qteToAdd,
                rayon: 2,
                prix_achat: Number(product.prix_achat || 0) / 1000
            });
        } else {
            const existing = cart.find(it => it.code_barre === product.code_barre);
            if (existing) {
                if (stockDispo - (existing.qte + 1) < 0) {
                    toast.error("Stock insuffisant!");
                    return;
                }
                existing.qte += 1;
            } else {
                cart.push({
                    code_barre: product.code_barre,
                    nom: product.nom_p,
                    pu: puDinars,
                    qte: 1,
                    rayon: 1,
                    prix_achat: Number(product.prix_achat || 0) / 1000
                });
            }
        }

        updateTouchCartUI();
    }

    function updateTouchCartUI() {
        if (cart.length === 0) {
            cartTbody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-muted">Panier vide.</td></tr>`;
            totalLabel.textContent = '0.000 DT';
            qtyCount.textContent = '0';
            appliedDiscountDinars = 0;
            return;
        }

        cartTbody.innerHTML = cart.map((item, idx) => `
            <tr>
                <td>
                    <div class="font-bold text-xs">${item.nom}</div>
                    <div class="text-xs text-muted font-mono">${formatDinars(item.pu)} DT</div>
                </td>
                <td class="text-center">
                    <span class="font-bold text-xs">${item.rayon === 2 ? item.qte.toFixed(3) : item.qte}</span>
                </td>
                <td class="text-right font-mono font-bold text-xs text-accent">
                    ${formatDinars(item.pu * item.qte)}
                </td>
                <td class="text-center">
                    <button type="button" class="btn btn-ghost btn-sm text-danger btn-del-row" data-idx="${idx}">&times;</button>
                </td>
            </tr>
        `).join('');

        const rawTotal = cart.reduce((acc, it) => acc + (it.pu * it.qte), 0);
        const finalTotal = Math.max(0, rawTotal - appliedDiscountDinars);

        totalLabel.textContent = `${formatDinars(finalTotal)} DT`;
        qtyCount.textContent = cart.reduce((acc, it) => acc + (it.rayon === 2 ? 1 : it.qte), 0);

        cartTbody.querySelectorAll('.btn-del-row').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.dataset.idx, 10);
                cart.splice(i, 1);
                updateTouchCartUI();
            });
        });
    }

    page.querySelector('.btn-switch-scanner').addEventListener('click', () => {
        window.location.hash = '#/caisse';
    });

    page.querySelector('.btn-clear-touch-cart').addEventListener('click', async () => {
        if (cart.length === 0) return;
        const ok = await confirmDialog("Voulez-vous vider le panier ?", "Vider Panier");
        if (ok) {
            cart = [];
            appliedDiscountDinars = 0;
            updateTouchCartUI();
        }
    });

    page.querySelector('.btn-touch-discount').addEventListener('click', async () => {
        const rawTotal = cart.reduce((acc, it) => acc + (it.pu * it.qte), 0);
        if (rawTotal <= 0) return;
        const max = Math.max(1.0, (rawTotal * 0.10) * 1.5);
        const discountEntered = await promptAmount("Remise", `Montant max: ${formatDinars(max)} DT`);
        if (discountEntered !== null) {
            if (discountEntered > max) {
                toast.error(`Plafond dépassé (${formatDinars(max)} DT max)`);
                return;
            }
            appliedDiscountDinars = discountEntered;
            updateTouchCartUI();
        }
    });

    page.querySelector('.btn-touch-pay').addEventListener('click', () => {
        const rawTotal = cart.reduce((acc, it) => acc + (it.pu * it.qte), 0);
        const finalTotal = Math.max(0, rawTotal - appliedDiscountDinars);
        if (finalTotal <= 0) {
            toast.warning("Panier vide!");
            return;
        }

        openPaymentDrawer({
            totalAmountDinars: finalTotal,
            onValidate: async ({ received, change }) => {
                try {
                    const emp = getEmployeeSession();
                    const newFacture = await factureRepo.create({
                        cin_user: emp?.cin || '11111111',
                        id_caisse_fac: activeSession?.id_caisse || '1',
                        prix_tt: toMillimes(finalTotal),
                        remise: toMillimes(appliedDiscountDinars),
                        recue: toMillimes(received)
                    });

                    const savedVentes = [];
                    for (const item of cart) {
                        const v = await venteRepo.add({
                            code_barre_vt: item.code_barre,
                            nom_vt: item.nom,
                            prix_vt: toMillimes(item.pu * item.qte),
                            quantite_vt: item.rayon === 2 ? 1 : item.qte,
                            prix_tt: toMillimes(finalTotal),
                            rayon: item.rayon,
                            prix_achat: toMillimes(item.prix_achat),
                            pr2: toMillimes(item.pu),
                            facture: newFacture.id_fac,
                            remise: toMillimes(appliedDiscountDinars)
                        });
                        savedVentes.push(v);
                        await produitRepo.updateStock(item.code_barre, -item.qte);
                    }

                    toast.success("Vente enregistrée avec succès!");
                    await printReceipt(newFacture, savedVentes, {
                        received: toMillimes(received),
                        change: toMillimes(change)
                    });

                    cart = [];
                    appliedDiscountDinars = 0;
                    updateTouchCartUI();

                } catch (err) {
                    console.error(err);
                    toast.error("Erreur d'encaissement.");
                }
            }
        });
    });

    return page;
}
