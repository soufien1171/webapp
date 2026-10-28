// Image Helper — Image resizing, compression and base64 conversion

/**
 * Resize and compress an image File object to a base64 Data URL
 * @param {File} file
 * @param {number} maxWidth
 * @param {number} quality (0 to 1)
 * @returns {Promise<string>} base64 data URL
 */
export function processImageFile(file, maxWidth = 400, quality = 0.8) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            reject(new Error("Le fichier sélectionné n'est pas une image valide."));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = () => reject(new Error("Erreur de chargement de l'image."));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error("Erreur de lecture du fichier."));
        reader.readAsDataURL(file);
    });
}

/**
 * Fallback placeholder SVG as Data URL
 */
export function getProductPlaceholder() {
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2364748b" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="3"/><path d="m21 15-5-5L5 21"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>';
}
