// Scanner Helper — Scanbot Web SDK Custom UI wrapper

let scanbotSdkPromise = null;
let scanner = null;
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
 * Start barcode scanning via Scanbot Custom UI.
 * @param {string} containerId - DOM element ID for camera preview
 * @param {Function} onDetected - callback(decodedText)
 * @param {Object} options
 */
export async function startScanning(containerId, onDetected, options = {}) {
    if (isScanning) return;
    isScanning = true;
    const requestId = ++scanRequest;
    try {
        const sdk = await getScanbotSdk();
        const configuration = {
            containerId,
            showFinder: true,
            captureDelay: options.captureDelay || 1000,
            videoConstraints: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                facingMode: 'environment'
            },
            onBarcodesDetected: (result) => {
                if (requestId !== scanRequest) return;
                const barcode = result?.barcodes?.[0];
                if (!barcode?.text) return;

                scanner?.dispose();
                scanner = null;
                isScanning = false;
                onDetected(barcode.text);
            },
            onError: (error) => {
                console.error('[Scanner] Scanbot camera error:', error);
            }
        };

        const createdScanner = await sdk.createBarcodeScanner(configuration);
        if (requestId !== scanRequest) {
            createdScanner.dispose();
            return;
        }
        scanner = createdScanner;
    } catch (error) {
        console.error('[Scanner] Scanbot failed:', error);
        scanner = null;
        isScanning = false;
        throw new Error('Impossible de démarrer le scanner. Vérifiez les permissions de la caméra.');
    }
}

/**
 * Stop scanning
 */
export async function stopScanning() {
    scanRequest += 1;
    if (scanner) {
        scanner.dispose();
        scanner = null;
    }
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
    try {
        return scanner ? await scanner.fetchAvailableCameras() : [];
    } catch {
        return [];
    }
}
