// Repository — Configuration, Paramètres, PIN & Licence
import { getConfigDoc, saveConfigDoc } from '../store-manager.js';

export async function getParametres() {
    return getConfigDoc('parametres') || {
        nom_ste: "Mon Magasin",
        desc_ste: "Point de vente",
        adr_ste: "Tunis",
        tel_ste: "71 000 000",
        remise: true,
        img_para: true,
        caisse_para: 1,
        touch_cols: 5,
        theme: "dark"
    };
}

export async function saveParametres(params) {
    saveConfigDoc('parametres', params);
    return params;
}

export async function getPin() {
    const doc = getConfigDoc('pin');
    return doc ? doc.pin_user : "1234";
}

export async function verifyPin(enteredPin) {
    const pin = await getPin();
    return String(pin).trim() === String(enteredPin).trim();
}

export async function savePin(newPin) {
    saveConfigDoc('pin', { pin_user: String(newPin).trim() });
    return true;
}

export async function getLicence() {
    return getConfigDoc('licence') || {
        num_serie: "1046-6284-8280-2629",
        validation: false,
        active: false,
        date_debut: "2023-01-01",
        date_fin: "2030-12-31"
    };
}

export async function saveLicence(licenceData) {
    saveConfigDoc('licence', licenceData);
    return licenceData;
}
