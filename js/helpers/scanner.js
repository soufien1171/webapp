// Scanner Helper — Scanbot Web SDK RTU UI wrapper

let scanbotSdkPromise = null;
let isScanning = false;
let scanRequest = 0;

const SCANBOT_ENGINE_PATH =
    'https://cdn.jsdelivr.net/npm/scanbot-web-sdk@10.0.0/bundle/bin/complete/';

async function getScanbotSdk() {
    if (scanbotSdkPromise) return scanbotSdkPromise;

    scanbotSdkPromise = (async () => {
        if (!window.ScanbotSDK?.initialize) {
            throw new Error('Le SDK Scanbot est indisponible. Vérifiez la connexion puis rechargez la page.');
        }

        const licenseKey = window.__CAISSE_CONFIG__?.scanbotLicenseKey || '';
        return window.ScanbotSDK.initialize({ licenseKey, enginePath: SCANBOT_ENGINE_PATH });
    })().catch(error => {
        scanbotSdkPromise = null;
        throw error;
    });

    return scanbotSdkPromise;
}

/**
 * Start barcode scanning via camera
 * @param {string} containerId - DOM element ID for camera preview
 * @param {Function} onDetected - callback(decodedText)
 * @param {Object} options
 */
export async function startScanning(_containerId, onDetected, _options = {}) {
    if (isScanning) return;
    isScanning = true;
    const requestId = ++scanRequest;
    try {
        await getScanbotSdk();
        const config = new window.ScanbotSDK.UI.Config.BarcodeScannerScreenConfiguration();
        const result = await window.ScanbotSDK.UI.createBarcodeScanner(config);
        if (requestId !== scanRequest || !result?.items?.length) return;
        const barcode = result.items[0]?.barcode;
        if (barcode?.text) onDetected(barcode.text);
    } catch (error) {
        console.error('[Scanner] Scanbot failed:', error);
        throw new Error('Impossible de démarrer le scanner. Vérifiez les permissions de la caméra.');
    } finally {
        if (requestId === scanRequest) isScanning = false;
    }
}

/**
 * Stop scanning
 */
export async function stopScanning() {
    scanRequest += 1;
    isScanning = false;
}

/**
 * Check if scanning is currently active
 */
export function isScannerActive() {
    return isScanning;
}

/**
 * Get available cameras
 */
export async function getCameras() {
    return [];
}
