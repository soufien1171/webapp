// Repository — Factures de vente
import { getCollection, saveCollection } from '../store-manager.js';
import * as venteRepo from './vente-repo.js';
import * as produitRepo from './produit-repo.js';

const COLLECTION = 'factures';

export async function getAll() {
    const list = getCollection(COLLECTION);
    return list.sort((a, b) => Number(b.id_fac) - Number(a.id_fac));
}

export async function getById(idFac) {
    const list = getCollection(COLLECTION);
    return list.find(f => String(f.id_fac) === String(idFac)) || null;
}

export async function getByCaisseId(idCaisse) {
    const list = getCollection(COLLECTION);
    return list.filter(f => String(f.id_caisse_fac) === String(idCaisse));
}

export async function create(factureData) {
    const list = getCollection(COLLECTION);
    const now = new Date();

    const newFacture = {
        id_fac: String(Date.now()),
        date_fac: now.toISOString().split('T')[0],
        temp_fac: now.toTimeString().substring(0, 8),
        cin_user: String(factureData.cin_user || ''),
        id_caisse_fac: String(factureData.id_caisse_fac || ''),
        prix_tt: Number(factureData.prix_tt || 0), // millimes
        remise: Number(factureData.remise || 0),     // millimes
        recue: Number(factureData.recue || 0)       // millimes
    };

    list.push(newFacture);
    saveCollection(COLLECTION, list);
    return newFacture;
}

export async function update(idFac, data) {
    const list = getCollection(COLLECTION);
    const index = list.findIndex(f => String(f.id_fac) === String(idFac));
    if (index === -1) throw new Error("Facture introuvable.");

    list[index] = { ...list[index], ...data };
    saveCollection(COLLECTION, list);
    return list[index];
}

export async function remove(idFac) {
    // Restitute stock for all sale items in this invoice
    const ventes = await venteRepo.getByFacture(idFac);
    for (const v of ventes) {
        let qteToReturn = Number(v.quantite_vt);
        if (Number(v.rayon) === 2) {
            // For weighed items, qte = total price / unit price
            const pu = Number(v.pr2 || v.prix_vt);
            if (pu > 0) qteToReturn = Number(v.prix_vt) / pu;
        }
        await produitRepo.updateStock(v.code_barre_vt, qteToReturn);
    }

    // Delete lines
    await venteRepo.deleteByFacture(idFac);

    // Delete invoice
    const list = getCollection(COLLECTION);
    const filtered = list.filter(f => String(f.id_fac) !== String(idFac));
    saveCollection(COLLECTION, filtered);
    return true;
}

export async function sumPrixByCaisseId(idCaisse) {
    const list = await getByCaisseId(idCaisse);
    return list.reduce((sum, f) => sum + Number(f.prix_tt), 0);
}
