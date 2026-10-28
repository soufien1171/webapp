// Payment Panel Component (Slide-in cash payment drawer with quick denominations)
import { formatDinars, parseDinars } from '../helpers/money-helper.js';
import { toast } from './toast.js';

export function openPaymentDrawer({
    totalAmountDinars, // float in Dinars e.g. 25.500
    onValidate,
    onCancel
}) {
    let receivedDinars = 0;

    const overlay = document.createElement('div');
    overlay.className = 'payment-panel-overlay';

    overlay.innerHTML = `
        <div class="payment-panel">
            <div class="payment-header flex flex-between items-center mb-4">
                <h2 class="text-xl font-bold">Règlement Espèces</h2>
                <button type="button" class="btn btn-ghost btn-close-payment">&times;</button>
            </div>

            <div class="payment-summary mb-4">
                <div class="stat-card mb-3">
                    <span class="text-xs text-secondary">Montant Total à Payer</span>
                    <div class="text-3xl font-bold text-accent payment-total-label">${formatDinars(totalAmountDinars)} DT</div>
                </div>

                <div class="grid grid-2 gap-3 mb-3">
                    <div class="stat-card">
                        <span class="text-xs text-secondary">Montant Reçu</span>
                        <div class="text-xl font-semibold payment-received-label">0.000 DT</div>
                    </div>
                    <div class="stat-card">
                        <span class="text-xs text-secondary">Monnaie à Rendre</span>
                        <div class="text-xl font-semibold payment-change-label">0.000 DT</div>
                    </div>
                </div>
            </div>

            <!-- Quick Denomination Banknotes & Coins Buttons -->
            <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Billets & Pièces Rapides</p>
            <div class="denomination-grid mb-4">
                <button type="button" class="btn btn-denomination" data-val="50">+50 DT</button>
                <button type="button" class="btn btn-denomination" data-val="20">+20 DT</button>
                <button type="button" class="btn btn-denomination" data-val="10">+10 DT</button>
                <button type="button" class="btn btn-denomination" data-val="5">+5 DT</button>

                <button type="button" class="btn btn-denomination" data-val="2">+2 DT</button>
                <button type="button" class="btn btn-denomination" data-val="1">+1 DT</button>
                <button type="button" class="btn btn-denomination" data-val="0.500">+500m</button>
                <button type="button" class="btn btn-denomination" data-val="0.200">+200m</button>

                <button type="button" class="btn btn-denomination" data-val="0.100">+100m</button>
                <button type="button" class="btn btn-denomination" data-val="0.050">+50m</button>
                <button type="button" class="btn btn-denomination btn-exact" style="grid-column: span 2;">Montant Exact</button>
            </div>

            <div class="flex gap-2">
                <button type="button" class="btn btn-secondary flex-1 btn-reset-payment">Réinitialiser (0)</button>
                <button type="button" class="btn btn-success flex-2 btn-confirm-payment font-bold text-lg">Valider Ticket ↵</button>
            </div>
        </div>
    `;

    const receivedLabel = overlay.querySelector('.payment-received-label');
    const changeLabel = overlay.querySelector('.payment-change-label');

    function updateCalculations() {
        receivedLabel.textContent = `${formatDinars(receivedDinars)} DT`;
        const diff = receivedDinars - totalAmountDinars;
        if (diff >= 0) {
            changeLabel.textContent = `${formatDinars(diff)} DT`;
            changeLabel.className = 'text-xl font-semibold payment-change-label text-success';
        } else {
            changeLabel.textContent = `Manque: ${formatDinars(Math.abs(diff))} DT`;
            changeLabel.className = 'text-xl font-semibold payment-change-label text-danger';
        }
    }

    overlay.querySelectorAll('.btn-denomination').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('btn-exact')) {
                receivedDinars = totalAmountDinars;
            } else {
                const addVal = parseFloat(btn.dataset.val);
                receivedDinars += addVal;
            }
            updateCalculations();
        });
    });

    overlay.querySelector('.btn-reset-payment').addEventListener('click', () => {
        receivedDinars = 0;
        updateCalculations();
    });

    const closeDrawer = () => {
        overlay.classList.add('closing');
        setTimeout(() => overlay.remove(), 250);
    };

    overlay.querySelector('.btn-close-payment').addEventListener('click', () => {
        closeDrawer();
        if (onCancel) onCancel();
    });

    overlay.querySelector('.btn-confirm-payment').addEventListener('click', () => {
        if (receivedDinars < totalAmountDinars) {
            toast.error("Le montant reçu est inférieur au montant à payer!");
            return;
        }
        const change = receivedDinars - totalAmountDinars;
        closeDrawer();
        if (onValidate) onValidate({ received: receivedDinars, change });
    });

    document.body.appendChild(overlay);
    updateCalculations();
}
