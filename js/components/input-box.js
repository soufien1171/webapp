// Input Box Component (Equivalent of C# FrmInputBox for weighed product price & discount)
import { showModal } from './modal.js';
import { renderNumpad } from './numpad.js';
import { formatDinars } from '../helpers/money-helper.js';

/**
 * Show a numeric input box with integrated touch numpad
 * @param {string} title
 * @param {string} promptMessage
 * @param {number} initialValue
 * @returns {Promise<number|null>} amount entered or null if cancelled
 */
export function promptAmount(title, promptMessage, initialValue = 0) {
    return new Promise((resolve) => {
        let currentValue = initialValue > 0 ? String(initialValue) : '';

        const container = document.createElement('div');
        container.className = 'input-box-container';

        container.innerHTML = `
            <p class="text-sm text-secondary mb-3">${promptMessage}</p>
            <div class="input-display mb-4">
                <input type="text" class="form-input text-2xl font-bold text-center input-value" 
                    value="${currentValue || '0.000'}" readonly />
            </div>
            <div class="numpad-slot"></div>
        `;

        const display = container.querySelector('.input-value');

        function updateDisplay() {
            display.value = currentValue || '0';
        }

        const numpad = renderNumpad(
            (char) => {
                if (char === 'CLEAR') {
                    currentValue = '';
                } else if (char === '.') {
                    if (!currentValue.includes('.')) {
                        currentValue = currentValue === '' ? '0.' : currentValue + '.';
                    }
                } else {
                    currentValue += char;
                }
                updateDisplay();
            },
            () => {
                currentValue = currentValue.slice(0, -1);
                updateDisplay();
            },
            () => {
                // Submit via enter on numpad
                const btnConfirm = container.closest('.modal')?.querySelector('.btn-confirm');
                if (btnConfirm) btnConfirm.click();
            }
        );

        container.querySelector('.numpad-slot').appendChild(numpad);

        showModal({
            title,
            content: container,
            confirmText: 'Valider',
            cancelText: 'Annuler',
            onConfirm: () => {
                const parsed = parseFloat(currentValue.replace(',', '.'));
                if (isNaN(parsed) || parsed <= 0) {
                    resolve(null);
                } else {
                    resolve(parsed);
                }
            },
            onCancel: () => {
                resolve(null);
            }
        });
    });
}

/**
 * Show a PIN code prompt (4 digits)
 */
export function promptPin(title = "Code PIN Requis") {
    return new Promise((resolve) => {
        let pin = '';
        const container = document.createElement('div');
        container.className = 'pin-prompt-container';

        container.innerHTML = `
            <p class="text-sm text-secondary text-center mb-3">Veuillez saisir le code PIN à 4 chiffres</p>
            <div class="flex flex-center gap-2 mb-4 pin-dots">
                <div class="pin-dot"></div>
                <div class="pin-dot"></div>
                <div class="pin-dot"></div>
                <div class="pin-dot"></div>
            </div>
            <div class="numpad-slot"></div>
        `;

        const dots = container.querySelectorAll('.pin-dot');

        function updateDots() {
            dots.forEach((dot, index) => {
                if (index < pin.length) {
                    dot.classList.add('pin-dot-filled');
                } else {
                    dot.classList.remove('pin-dot-filled');
                }
            });
        }

        const numpad = renderNumpad(
            (char) => {
                if (char !== '.' && char !== 'CLEAR' && pin.length < 4) {
                    pin += char;
                    updateDots();
                    if (pin.length === 4) {
                        setTimeout(() => {
                            const btnConfirm = container.closest('.modal')?.querySelector('.btn-confirm');
                            if (btnConfirm) btnConfirm.click();
                        }, 100);
                    }
                } else if (char === 'CLEAR') {
                    pin = '';
                    updateDots();
                }
            },
            () => {
                pin = pin.slice(0, -1);
                updateDots();
            }
        );

        container.querySelector('.numpad-slot').appendChild(numpad);

        showModal({
            title,
            content: container,
            confirmText: 'Valider',
            cancelText: 'Annuler',
            onConfirm: () => {
                resolve(pin);
            },
            onCancel: () => {
                resolve(null);
            }
        });
    });
}
