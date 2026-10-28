// Repository — Catégories de produits
import { getCollection, saveCollection } from '../store-manager.js';

const COLLECTION = 'categories';

export async function getAll() {
    return getCollection(COLLECTION);
}

export async function add(nomCat) {
    const list = getCollection(COLLECTION);
    const trimmed = nomCat.trim();
    if (list.some(c => c.nom_cat.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error("Cette catégorie existe déjà.");
    }

    const newCat = {
        id: String(Date.now()),
        nom_cat: trimmed
    };

    list.push(newCat);
    saveCollection(COLLECTION, list);
    return newCat;
}

export async function update(id, nomCat) {
    const list = getCollection(COLLECTION);
    const index = list.findIndex(c => String(c.id) === String(id));
    if (index === -1) throw new Error("Catégorie introuvable.");

    list[index].nom_cat = nomCat.trim();
    saveCollection(COLLECTION, list);
    return list[index];
}

export async function remove(id) {
    const list = getCollection(COLLECTION);
    const filtered = list.filter(c => String(c.id) !== String(id));
    saveCollection(COLLECTION, filtered);
    return true;
}
