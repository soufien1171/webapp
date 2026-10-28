// Page — Caisse Scanner / Clavier (Mode Vente Principal)
import * as produitRepo from '../db/repositories/produit-repo.js';
import * as caisseRepo from '../db/repositories/caisse-repo.js';
import * as factureRepo from '../db/repositories/facture-repo.js';
import * as venteRepo from '../db/repositories/vente-repo.js';
import * as settingsRepo from '../db/repositories/settings-repo.js';
import { getEmployeeSession } from '../auth.js';
import { navigateTo } from '../router.js';
import { formatDinars, toMillimes } from '../helpers/money-helper.js';
import { startScanning, stopScanning, isScannerActive } from '../helpers/scanner.js';
import { promptAmount } from '../components/input-box.js';
import { openPaymentDrawer } from '../components/payment-panel.js';
import { printReceipt } from '../components/ticket-printer.js';
import { toast } from '../components/toast.js';
import { confirmDialog } from '../components/modal.js';

export function renderCaisseKeyboardPage() {
    const page = document.createElement('div');
    page.className = 'caisse-keyboard-view flex flex-col h-full gap-3';

    // In-memory cart items
    let cart = []; // [{ code_barre, nom, pu, qte, total, rayon, prix_achat }]
    let activeSession = null;
    let storeSettings = null;
    let appliedDiscountDinars = 0;

    page.innerHTML = `
        <!-- Top Action Bar -->
        <div class="caisse-topbar card p-3 flex flex-between items-center gap-3">
            <div class="flex items-center gap-2 flex-1">
                <div class="input-with-icon flex-1" style="max-width: 450px;">
                    <input type="text" id="barcode-input" class="form-input text-lg font-mono font-bold" 
                        placeholder="Scanner ou saisir code-barres [Entrée]..." autofocus />
                </div>
                <button type="button" class="btn btn-primary btn-camera-toggle flex items-center gap-2" title="Caméra scanner">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    <span class="hidden sm:inline">Caméra</span>
                </button>
            </div>

            <div class="flex items-center gap-2">
                <button type="button" class="btn btn-secondary btn-touch-switch" title="Basculer vers mode tactile">
                    ⊞ Mode Tactile
                </button>
                <button type="button" class="btn btn-ghost text-danger btn-clear-cart" title="Vider le panier">
                    🗑 Effacer
                </button>
            </div>
        </div>

        <!-- Camera Scanner Slot (Hidden by default) -->
        <div id="camera-scanner-wrapper" class="card p-3 hidden">
            <div class="flex flex-between items-center mb-2">
                <span class="text-sm font-semibold">Caméra active — Visez le code-barres</span>
                <button type="button" class="btn btn-ghost btn-sm btn-close-camera">&times;</button>
            </div>
            <div id="camera-scanner-view" style="width: 100%; max-width: 480px; margin: 0 auto;"></div>
        </div>

        <!-- Main Workspace (Cart table on left + Totals & Numpad on right) -->
        <div class="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3 overflow-hidden">
            <!-- Left: Cart Grid Table (2 columns wide on desktop) -->
            <div class="card p-0 flex flex-col lg:col-span-2 overflow-hidden">
                <div class="table-responsive flex-1 overflow-y-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Article</th>
                                <th class="text-center" style="width: 140px;">Quantité</th>
                                <th class="text-right" style="width: 110px;">Prix Unit.</th>
                                <th class="text-right" style="width: 120px;">Total</th>
                                <th class="text-center" style="width: 50px;"></th>
                            </tr>
                        </thead>
                        <tbody id="cart-tbody">
                            <tr>
                                <td colspan="5" class="text-center py-12 text-muted">
                                    Scannez un article ou saisissez un code-barres pour commencer la vente.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Last Scanned Banner -->
                <div class="p-3 bg-secondary border-t flex flex-between items-center text-sm">
                    <div class="truncate flex-1">
                        Dernier article: <b id="last-item-label" class="text-accent">—</b>
                    </div>
                    <div class="text-secondary">
                        Articles: <b id="total-qty-badge" class="text-primary">0</b>
                    </div>
                </div>
            </div>

            <!-- Right: Totals Panel & Validation -->
            <div class="flex flex-col gap-3">
                <!-- Large Total Display -->
                <div class="card p-4 text-center">
                    <span class="text-xs uppercase tracking-wider text-secondary">Total à Payer</span>
                    <div id="cart-total-display" class="text-4xl font-extrabold text-accent my-2">0.000 DT</div>
                    
                    <div id="discount-indicator" class="text-xs text-warning hidden">
                        Remise appliquée: <span id="discount-amount">0.000 DT</span>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="grid grid-2 gap-2">
                    <button type="button" class="btn btn-secondary btn-apply-discount" id="btn-discount">
                        🏷 Remise (DT)
                    </button>
                    <button type="button" class="btn btn-secondary btn-adjust-qty">
                        ✎ Modifier Qté
                    </button>
                </div>

                <!-- Big Validate & Cash Pay Button -->
                <button type="button" class="btn btn-success font-extrabold text-xl py-4 flex-1 flex flex-center items-center gap-2 btn-open-payment">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                    <span>Encaisser Espèces ➔</span>
                </button>
            </div>
        </div>
    `;

    // DOM Elements
    const barcodeInput = page.querySelector('#barcode-input');
    const cartTbody = page.querySelector('#cart-tbody');
    const totalDisplay = page.querySelector('#cart-total-display');
    const totalQtyBadge = page.querySelector('#total-qty-badge');
    const lastItemLabel = page.querySelector('#last-item-label');
    const cameraWrapper = page.querySelector('#camera-scanner-wrapper');
    const cameraToggleBtn = page.querySelector('.btn-camera-toggle');
    const closeCameraBtn = page.querySelector('.btn-close-camera');
    const discountIndicator = page.querySelector('#discount-indicator');
    const discountAmountLabel = page.querySelector('#discount-amount');

    // Init data
    (async () => {
        storeSettings = await settingsRepo.getParametres();
        const emp = getEmployeeSession();
        activeSession = await caisseRepo.getOpenSession(emp?.cin);
        if (!activeSession) {
            if (Number(emp?.role || 1) <= 2) {
                navigateTo('#/caisse-open');
                return;
            }
            activeSession = await caisseRepo.createSession(emp?.cin || '11111111', 50000, emp?.authenticatedAt);
        }
        if (!storeSettings.remise) {
            page.querySelector('#btn-discount').style.display = 'none';
        }
    })();

    function calculateCartTotal() {
        const rawTotal = cart.reduce((acc, item) => acc + (item.pu * item.qte), 0);
        const finalTotal = Math.max(0, rawTotal - appliedDiscountDinars);
        return { rawTotal, finalTotal };
    }

    function updateCartUI() {
        if (cart.length === 0) {
            cartTbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-12 text-muted">
                        Scannez un article ou saisissez un code-barres pour commencer la vente.
                    </td>
                </tr>
            `;
            totalDisplay.textContent = '0.000 DT';
            totalQtyBadge.textContent = '0';
            lastItemLabel.textContent = '—';
            appliedDiscountDinars = 0;
            discountIndicator.classList.add('hidden');
            return;
        }

        cartTbody.innerHTML = cart.map((item, index) => `
            <tr data-index="${index}">
                <td>
                    <div class="font-bold text-sm">${item.nom}</div>
                    <div class="text-xs text-muted font-mono">${item.code_barre} ${item.rayon === 2 ? '(Pesé)' : ''}</div>
                </td>
                <td class="text-center">
                    <div class="flex flex-center items-center gap-1">
                        <button type="button" class="btn btn-ghost btn-sm btn-minus-qty text-danger font-bold">-</button>
                        <span class="font-bold text-sm px-2">${item.rayon === 2 ? item.qte.toFixed(3) : item.qte}</span>
                        <button type="button" class="btn btn-ghost btn-sm btn-plus-qty text-success font-bold" ${item.rayon === 2 ? 'disabled' : ''}>+</button>
                    </div>
                </td>
                <td class="text-right font-mono text-sm">${formatDinars(item.pu)}</td>
                <td class="text-right font-mono font-bold text-sm text-accent">${formatDinars(item.pu * item.qte)}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-ghost btn-sm text-danger btn-remove-item">&times;</button>
                </td>
            </tr>
        `).join('');

        const { rawTotal, finalTotal } = calculateCartTotal();
        totalDisplay.textContent = `${formatDinars(finalTotal)} DT`;

        const totalQty = cart.reduce((acc, i) => acc + (i.rayon === 2 ? 1 : i.qte), 0);
        totalQtyBadge.textContent = totalQty;

        if (appliedDiscountDinars > 0) {
            discountIndicator.classList.remove('hidden');
            discountAmountLabel.textContent = `${formatDinars(appliedDiscountDinars)} DT`;
        } else {
            discountIndicator.classList.add('hidden');
        }

        // Attach row listeners
        cartTbody.querySelectorAll('.btn-minus-qty').forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                if (cart[idx].qte > 1 && cart[idx].rayon === 1) {
                    cart[idx].qte -= 1;
                } else {
                    cart.splice(idx, 1);
                }
                updateCartUI();
            });
        });

        cartTbody.querySelectorAll('.btn-plus-qty').forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                if (cart[idx].rayon === 1) {
                    cart[idx].qte += 1;
                    updateCartUI();
                }
            });
        });

        cartTbody.querySelectorAll('.btn-remove-item').forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                cart.splice(idx, 1);
                updateCartUI();
            });
        });
    }

    // Add item by barcode
    async function handleBarcode(code) {
        if (!code || !code.trim()) return;
        const cleaned = code.trim();
        barcodeInput.value = '';

        try {
            const product = await produitRepo.getByCodeBarre(cleaned);
            if (!product) {
                toast.error(`Code-barres [${cleaned}] non trouvé dans le stock!`);
                return;
            }

            const rayon = Number(product.rayon || 1);
            const puDinars = Number(product.prix_p) / 1000;
            const stockDispo = Number(product.quantite_p || 0);

            // Check stock
            if (stockDispo <= 0) {
                toast.error(`L'article "${product.nom_p}" est épuisé en stock!`);
                return;
            }

            let qteToAdd = 1;
            let finalPuDinars = puDinars;

            // Weighed product (rayon === 2)
            if (rayon === 2) {
                const amountEntered = await promptAmount(
                    "Produit au Poids",
                    `Saisissez le montant total pour: "${product.nom_p}" (Prix au kg: ${formatDinars(puDinars)} DT)`
                );
                if (!amountEntered || amountEntered <= 0) return;
                
                // qte = total price / unit price
                qteToAdd = amountEntered / puDinars;

                if (stockDispo - qteToAdd < 0) {
                    toast.error("Quantité demandée supérieure au stock disponible!");
                    return;
                }
            } else {
                // Unit product: check if already in cart
                const existingIndex = cart.findIndex(it => it.code_barre === product.code_barre);
                if (existingIndex !== -1) {
                    if (stockDispo - (cart[existingIndex].qte + 1) < 0) {
                        toast.error("Stock insuffisant pour ajouter une unité supplémentaire!");
                        return;
                    }
                    cart[existingIndex].qte += 1;
                    lastItemLabel.textContent = product.nom_p;
                    updateCartUI();
                    return;
                }
            }

            // Add new cart entry
            cart.push({
                code_barre: product.code_barre,
                nom: product.nom_p,
                pu: finalPuDinars,
                qte: qteToAdd,
                rayon: rayon,
                prix_achat: Number(product.prix_achat || 0) / 1000
            });

            lastItemLabel.textContent = product.nom_p;
            updateCartUI();

        } catch (err) {
            console.error(err);
            toast.error("Erreur lors de la recherche du produit.");
        }
    }

    barcodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleBarcode(barcodeInput.value);
        }
    });

    // Camera scanner toggle
    cameraToggleBtn.addEventListener('click', async () => {
        if (isScannerActive()) {
            await stopScanning();
            cameraWrapper.classList.add('hidden');
        } else {
            cameraWrapper.classList.remove('hidden');
            try {
                await startScanning('camera-scanner-view', (decodedCode) => {
                    handleBarcode(decodedCode);
                });
            } catch (err) {
                toast.error(err.message);
                cameraWrapper.classList.add('hidden');
            }
        }
    });

    closeCameraBtn.addEventListener('click', async () => {
        await stopScanning();
        cameraWrapper.classList.add('hidden');
    });

    // Clear cart
    page.querySelector('.btn-clear-cart').addEventListener('click', async () => {
        if (cart.length === 0) return;
        const ok = await confirmDialog("Voulez-vous annuler la facture en cours ?", "Vider Panier");
        if (ok) {
            cart = [];
            appliedDiscountDinars = 0;
            updateCartUI();
        }
    });

    // Switch to touch mode
    page.querySelector('.btn-touch-switch').addEventListener('click', () => {
        window.location.hash = '#/caisse-touch';
    });

    // Apply Discount button
    page.querySelector('.btn-apply-discount').addEventListener('click', async () => {
        const { rawTotal } = calculateCartTotal();
        if (rawTotal <= 0) {
            toast.warning("Panier vide, impossible d'appliquer une remise.");
            return;
        }

        // WinForms business rule: max discount = (total * 0.10) * 1.5, min 1 DT
        const maxDiscount = Math.max(1.0, (rawTotal * 0.10) * 1.5);

        const discountEntered = await promptAmount(
            "Remise Exceptionnelle",
            `Saisir montant de la remise (Max autorisé: ${formatDinars(maxDiscount)} DT)`
        );

        if (discountEntered !== null) {
            if (discountEntered > maxDiscount) {
                toast.error(`Montant de remise trop élevé! Plafond: ${formatDinars(maxDiscount)} DT`);
                return;
            }
            appliedDiscountDinars = discountEntered;
            updateCartUI();
            toast.success(`Remise de ${formatDinars(discountEntered)} DT appliquée.`);
        }
    });

    // Open Payment Drawer
    page.querySelector('.btn-open-payment').addEventListener('click', () => {
        const { finalTotal } = calculateCartTotal();
        if (finalTotal <= 0) {
            toast.warning("La facture est vide. Ajoutez au moins un article.");
            return;
        }

        openPaymentDrawer({
            totalAmountDinars: finalTotal,
            onValidate: async ({ received, change }) => {
                try {
                    const emp = getEmployeeSession();

                    // 1. Create Invoice in Firestore / LocalStorage
                    const newFacture = await factureRepo.create({
                        cin_user: emp?.cin || '11111111',
                        id_caisse_fac: activeSession?.id_caisse || '1',
                        prix_tt: toMillimes(finalTotal),
                        remise: toMillimes(appliedDiscountDinars),
                        recue: toMillimes(received)
                    });

                    // 2. Insert Sale Lines & Deduct Stock
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

                        // Deduct stock
                        await produitRepo.updateStock(item.code_barre, -item.qte);
                    }

                    // 3. Print receipt
                    toast.success("Vente enregistrée avec succès!");
                    await printReceipt(newFacture, savedVentes, {
                        received: toMillimes(received),
                        change: toMillimes(change)
                    });

                    // Reset cart
                    cart = [];
                    appliedDiscountDinars = 0;
                    updateCartUI();
                    barcodeInput.focus();

                } catch (err) {
                    console.error(err);
                    toast.error("Erreur lors de l'enregistrement de la facture.");
                }
            }
        });
    });

    // Cleanup scanner when navigating away
    page.addEventListener('DOMNodeRemovedFromDocument', () => {
        stopScanning();
    });

    return page;
}
