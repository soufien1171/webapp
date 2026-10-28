// Repository — Lignes de vente (Détails facture)
import { getCollection, saveCollection } from '../store-manager.js';

const COLLECTION = 'ventes';

export async function getAll() {
    return getCollection(COLLECTION);
}

export async function getByFacture(idFac) {
    const list = getCollection(COLLECTION);
    return list.filter(v => String(v.facture) === String(idFac));
}

export async function add(venteData) {
    const list = getCollection(COLLECTION);
    const now = new Date();

    const newVente = {
        id_vt: String(Date.now()) + Math.floor(Math.random() * 1000),
        code_barre_vt: String(venteData.code_barre_vt),
        nom_vt: String(venteData.nom_vt),
        prix_vt: Number(venteData.prix_vt),       // millimes (total line or item price)
        quantite_vt: Number(venteData.quantite_vt),
        prix_tt: Number(venteData.prix_tt || 0),
        date_vt: now.toISOString().split('T')[0],
        rayon: Number(venteData.rayon || 1),
        prix_achat: Number(venteData.prix_achat || 0),
        pr2: Number(venteData.pr2 || venteData.prix_vt), // unit price
        facture: String(venteData.facture),
        remise: Number(venteData.remise || 0),
        modifier: 0
    };

    list.push(newVente);
    saveCollection(COLLECTION, list);
    return newVente;
}

export async function update(idVt, data) {
    const list = getCollection(COLLECTION);
    const index = list.findIndex(v => String(v.id_vt) === String(idVt));
    if (index === -1) throw new Error("Ligne de vente introuvable.");

    list[index] = { ...list[index], ...data };
    saveCollection(COLLECTION, list);
    return list[index];
}

export async function remove(idVt) {
    const list = getCollection(COLLECTION);
    const filtered = list.filter(v => String(v.id_vt) !== String(idVt));
    saveCollection(COLLECTION, filtered);
    return true;
}

export async function deleteByFacture(idFac) {
    const list = getCollection(COLLECTION);
    const filtered = list.filter(v => String(v.facture) !== String(idFac));
    saveCollection(COLLECTION, filtered);
    return true;
}
