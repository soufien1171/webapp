// Virtual numeric keypad and full keyboard for touch devices.
export function renderNumpad(onDigit, onBackspace, onEnter, options = {}) {
    const container = document.createElement('div');
    container.className = options.full ? 'virtual-keyboard-container' : 'numpad-container';

    if (options.full) {
        const keys = [
            '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
            // Disposition française AZERTY
            'A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
            'Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M',
            'W', 'X', 'C', 'V', 'B', 'N',
            '@', '.', '_', '-', '+', '!', '?', '#', '$', '%',
            '&', '*', '(', ')', '/', ':', ';', ',', ' '
        ];
        container.innerHTML = `
            <div class="virtual-keyboard-grid">
                ${keys.map(key => {
                    const isLetter = /^[A-Z]$/.test(key);
                    const buttonClass = key === ' ' ? 'virtual-space-key' : (isLetter ? 'virtual-letter-key' : '');
                    const dataKey = key === ' ' ? 'space' : (isLetter ? key.toLowerCase() : key);
                    return `<button type="button" class="numpad-btn virtual-key-btn ${buttonClass}" data-key="${dataKey}">${key === ' ' ? 'Espace' : key.toLowerCase()}</button>`;
                }).join('')}
                <button type="button" class="numpad-btn numpad-action virtual-shift-key" data-key="shift">Maj</button>
                <button type="button" class="numpad-btn numpad-action virtual-key-action" data-key="backspace">⌫</button>
                <button type="button" class="numpad-btn numpad-action virtual-key-action" data-key="clear">Effacer</button>
                <button type="button" class="numpad-btn numpad-enter virtual-key-enter" data-key="enter">Entrée</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="numpad-grid">
                <button type="button" class="numpad-btn" data-key="7">7</button>
                <button type="button" class="numpad-btn" data-key="8">8</button>
                <button type="button" class="numpad-btn" data-key="9">9</button>
                <button type="button" class="numpad-btn numpad-action" data-key="backspace">⌫</button>
                <button type="button" class="numpad-btn" data-key="4">4</button>
                <button type="button" class="numpad-btn" data-key="5">5</button>
                <button type="button" class="numpad-btn" data-key="6">6</button>
                <button type="button" class="numpad-btn numpad-action" data-key="clear">C</button>
                <button type="button" class="numpad-btn" data-key="1">1</button>
                <button type="button" class="numpad-btn" data-key="2">2</button>
                <button type="button" class="numpad-btn" data-key="3">3</button>
                <button type="button" class="numpad-btn numpad-enter" data-key="enter">↵</button>
                <button type="button" class="numpad-btn" data-key="0" style="grid-column: span 2;">0</button>
                <button type="button" class="numpad-btn" data-key=".">.</button>
            </div>
        `;
    }

    let shiftActive = false;
    container.querySelectorAll('.numpad-btn').forEach(button => {
        button.addEventListener('click', event => {
            event.preventDefault();
            const key = button.dataset.key;
            if (key === 'shift') {
                shiftActive = !shiftActive;
                container.querySelectorAll('.virtual-letter-key').forEach(letterButton => {
                    const letter = letterButton.textContent;
                    letterButton.textContent = shiftActive ? letter.toUpperCase() : letter.toLowerCase();
                    letterButton.dataset.key = shiftActive ? letter.toUpperCase() : letter.toLowerCase();
                });
                button.classList.toggle('active', shiftActive);
                return;
            }
            if (key === 'backspace') onBackspace?.();
            else if (key === 'clear') onDigit?.('CLEAR');
            else if (key === 'enter') onEnter?.();
            else onDigit?.(key === 'space' ? ' ' : (shiftActive && /^[a-z]$/.test(key) ? key.toUpperCase() : key));
        });
    });

    return container;
}
