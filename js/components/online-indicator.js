// Online / Offline Indicator Component
export function initOnlineIndicator(container) {
    const indicator = document.createElement('div');
    indicator.className = 'online-status-badge';

    function updateStatus() {
        const isOnline = navigator.onLine;
        if (isOnline) {
            indicator.innerHTML = `
                <span class="online-indicator" title="Synchronisation active"></span>
                <span class="text-xs text-secondary">En ligne</span>
            `;
        } else {
            indicator.innerHTML = `
                <span class="offline-indicator" title="Mode local / hors-ligne actif"></span>
                <span class="text-xs text-warning">Hors-ligne</span>
            `;
        }
    }

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();

    if (container) {
        container.appendChild(indicator);
    }
    return indicator;
}
