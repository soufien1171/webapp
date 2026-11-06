// Scanner Helper — ZXing browser wrapper

let reader = null;
let controls = null;
let videoElement = null;
let isScanning = false;
let scanRequest = 0;

/**
 * Start barcode scanning through the camera.
 * @param {string} containerId - DOM element ID for the camera preview
 * @param {Function} onDetected - callback(decodedText)
 * @param {Object} options
 */
export async function startScanning(containerId, onDetected, options = {}) {
    if (isScanning) return;

    if (!window.ZXingBrowser?.BrowserMultiFormatReader) {
        throw new Error('Le scanner ZXing est indisponible. Vérifiez la connexion puis rechargez la page.');
    }

    const container = document.getElementById(containerId);
    if (!container) throw new Error('Conteneur de caméra introuvable.');

    await stopScanning();
    isScanning = true;
    const requestId = ++scanRequest;

    reader = new window.ZXingBrowser.BrowserMultiFormatReader();
    videoElement = document.createElement('video');
    videoElement.autoplay = true;
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.style.width = '100%';
    videoElement.style.height = '100%';
    videoElement.style.objectFit = 'cover';
    container.replaceChildren(videoElement);

    try {
        const createdControls = await reader.decodeFromConstraints(
            {
                video: {
                    facingMode: options.facingMode || 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            },
            videoElement,
            (result) => {
                if (requestId !== scanRequest || !result) return;
                const text = result.getText();
                if (!text) return;

                const detectedCallback = onDetected;
                void stopScanning();
                detectedCallback(text);
            }
        );
        if (requestId !== scanRequest) {
            createdControls.stop();
            return;
        }
        controls = createdControls;
    } catch (error) {
        await stopScanning();
        console.error('[Scanner] ZXing failed:', error);
        throw new Error('Impossible de démarrer le scanner. Vérifiez les permissions de la caméra.');
    }
}

/** Stop camera decoding and release the media stream. */
export async function stopScanning() {
    scanRequest += 1;

    if (controls) {
        controls.stop();
        controls = null;
    }

    if (videoElement?.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
    }

    videoElement?.remove();
    videoElement = null;
    reader = null;
    isScanning = false;
}

export function isScannerActive() {
    return isScanning;
}

export async function getCameras() {
    try {
        return await window.ZXingBrowser.BrowserCodeReader.listVideoInputDevices();
    } catch {
        return [];
    }
}
