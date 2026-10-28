// Modal Dialog Component
export function showModal({
    title = '',
    content = '',
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    showCancel = true,
    confirmColor = 'primary', // primary, danger, success
    onConfirm = () => {},
    onCancel = () => {}
}) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const confirmBtnClass = confirmColor === 'danger' ? 'btn-danger' : 
                               confirmColor === 'success' ? 'btn-success' : 'btn-primary';

        overlay.innerHTML = `
            <div class="modal" role="dialog" aria-modal="true">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close" aria-label="Fermer">&times;</button>
                </div>
                <div class="modal-body">
                    ${typeof content === 'string' ? content : ''}
                </div>
                <div class="modal-footer">
                    ${showCancel ? `<button class="btn btn-secondary btn-cancel">${cancelText}</button>` : ''}
                    <button class="btn ${confirmBtnClass} btn-confirm">${confirmText}</button>
                </div>
            </div>
        `;

        if (content instanceof HTMLElement) {
            overlay.querySelector('.modal-body').appendChild(content);
        }

        const cleanup = () => {
            overlay.remove();
        };

        overlay.querySelector('.btn-confirm').addEventListener('click', async () => {
            const res = await onConfirm();
            if (res !== false) {
                cleanup();
                resolve(true);
            }
        });

        if (showCancel) {
            overlay.querySelector('.btn-cancel').addEventListener('click', () => {
                onCancel();
                cleanup();
                resolve(false);
            });
        }

        overlay.querySelector('.modal-close').addEventListener('click', () => {
            onCancel();
            cleanup();
            resolve(false);
        });

        document.body.appendChild(overlay);
    });
}

export function confirmDialog(message, title = 'Confirmation') {
    return showModal({
        title,
        content: `<p class="text-secondary">${message}</p>`,
        confirmText: 'Oui',
        cancelText: 'Non'
    });
}

export function alertDialog(message, title = 'Notification') {
    return showModal({
        title,
        content: `<p class="text-secondary">${message}</p>`,
        confirmText: 'OK',
        showCancel: false
    });
}
