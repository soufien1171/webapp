// Scanner Helper — html5-qrcode wrapper

let scanner = null;
let isScanning = false;
let debounceTimer = null;
const DEBOUNCE_MS = 1500;

/**
 * Start barcode scanning via camera
 * @param {string} containerId - DOM element ID for camera preview
 * @param {Function} onDetected - callback(decodedText)
 * @param {Object} options
 */
export async function startScanning(containerId, onDetected, options = {}) {
    if (isScanning) {
        await stopScanning();
    }

    const config = {
        fps: options.fps || 20,
        qrbox: options.qrbox || ((viewfinderWidth, viewfinderHeight) => ({
            width: Math.min(viewfinderWidth * 0.9, 520),
            height: Math.min(viewfinderHeight * 0.55, 220)
        })),
        aspectRatio: options.aspectRatio || 1.777,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        videoConstraints: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A
            ,Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.EAN_2,
            Html5QrcodeSupportedFormats.EAN_5,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODABAR
        ]
    };

    scanner = new Html5Qrcode(containerId);

    try {
        await scanner.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                // Debounce to avoid multiple rapid scans
                if (debounceTimer) return;
                debounceTimer = setTimeout(() => {
                    debounceTimer = null;
                }, DEBOUNCE_MS);
                onDetected(decodedText);
            },
            (errorMessage) => {
                // Scan error — ignore (continuous scanning)
            }
        );
        isScanning = true;
    } catch (err) {
        console.error('[Scanner] Failed to start:', err);
        throw new Error('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
    }
}

/**
 * Stop scanning
 */
export async function stopScanning() {
    if (scanner && isScanning) {
        try {
            await scanner.stop();
        } catch (e) {
            // ignore
        }
        scanner.clear();
        isScanning = false;
    }
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
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
        return await Html5Qrcode.getCameras();
    } catch {
        return [];
    }
}
