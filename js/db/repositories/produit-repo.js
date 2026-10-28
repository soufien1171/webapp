// Repository — Produits & Stock
import { getCollection, saveCollection } from '../store-manager.js';

const COLLECTION = 'produits';

export async function getAll() {
    return getCollection(COLLECTION);
}

export async function getByCodeBarre(code) {
    const list = getCollection(COLLECTION);
    const cleaned = String(code).trim();
    return list.find(p => String(p.code_barre).trim() === cleaned) || null;
}

export async function getByCategorie(catName) {
    const list = getCollection(COLLECTION);
    return list.filter(p => p.categorie === catName);
}

export async function getExpiringSoon(days = 15) {
    const list = getCollection(COLLECTION);
    const limit = new Date();
    limit.setDate(limit.getDate() + days);

    return list.filter(p => {
        if (!p.date_exp) return false;
        const expDate = new Date(p.date_exp);
        return expDate <= limit;
    });
}

export async function getLowStock() {
    const list = getCollection(COLLECTION);
    return list.filter(p => Number(p.quantite_p) <= Number(p.quantite_min));
}

export async function add(produitData) {
    const list = getCollection(COLLECTION);
    const code = String(produitData.code_barre).trim();

    if (list.some(p => String(p.code_barre).trim() === code)) {
        throw new Error(`Un produit avec le code-barres ${code} existe déjà.`);
    }

    const newProduct = {
        id: String(Date.now()),
        ...produitData,
        code_barre: code,
        prix_p: Number(produitData.prix_p),
        prix_achat: Number(produitData.prix_achat || 0),
        quantite_p: Number(produitData.quantite_p || 0),
        quantite_min: Number(produitData.quantite_min || 0),
        rayon: Number(produitData.rayon || 1)
    };

    list.push(newProduct);
    saveCollection(COLLECTION, list);
    return newProduct;
}

export async function update(codeBarre, updateData) {
    const list = getCollection(COLLECTION);
    const index = list.findIndex(p => String(p.code_barre).trim() === String(codeBarre).trim());
    if (index === -1) throw new Error("Produit introuvable.");

    list[index] = {
        ...list[index],
        ...updateData,
        prix_p: updateData.prix_p !== undefined ? Number(updateData.prix_p) : list[index].prix_p,
        prix_achat: updateData.prix_achat !== undefined ? Number(updateData.prix_achat) : list[index].prix_achat,
        quantite_p: updateData.quantite_p !== undefined ? Number(updateData.quantite_p) : list[index].quantite_p,
        quantite_min: updateData.quantite_min !== undefined ? Number(updateData.quantite_min) : list[index].quantite_min,
        rayon: updateData.rayon !== undefined ? Number(updateData.rayon) : list[index].rayon
    };

    saveCollection(COLLECTION, list);
    return list[index];
}

export async function updateStock(codeBarre, delta) {
    const list = getCollection(COLLECTION);
    const index = list.findIndex(p => String(p.code_barre).trim() === String(codeBarre).trim());
    if (index === -1) throw new Error("Produit introuvable pour mise à jour du stock.");

    list[index].quantite_p = Number(list[index].quantite_p) + Number(delta);
    if (list[index].quantite_p < 0) list[index].quantite_p = 0;

    saveCollection(COLLECTION, list);
    return list[index];
}

export async function remove(codeBarre) {
    const list = getCollection(COLLECTION);
    const filtered = list.filter(p => String(p.code_barre).trim() !== String(codeBarre).trim());
    saveCollection(COLLECTION, filtered);
    return true;
}
