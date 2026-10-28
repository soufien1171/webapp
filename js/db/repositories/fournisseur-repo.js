// Repository — Fournisseurs
import { getCollection, saveCollection } from '../store-manager.js';

const COLLECTION = 'fournisseurs';

export async function getAll() {
    return getCollection(COLLECTION);
}

export async function getById(id) {
    const list = getCollection(COLLECTION);
    return list.find(f => String(f.id) === String(id)) || null;
}

export async function getByDeliveryDay(dayName) {
    const list = getCollection(COLLECTION);
    return list.filter(f => f.date_tour && f.date_tour.toLowerCase() === dayName.toLowerCase());
}

export async function add(fournisseurData) {
    const list = getCollection(COLLECTION);
    const newFournisseur = {
        id: String(Date.now()),
        nom_prenom: fournisseurData.nom_prenom.trim(),
        produit: fournisseurData.produit || '',
        adresse: fournisseurData.adresse || '',
        num_tel: fournisseurData.num_tel || '',
        date_tour: fournisseurData.date_tour || 'Lundi'
    };

    list.push(newFournisseur);
    saveCollection(COLLECTION, list);
    return newFournisseur;
}

export async function update(id, data) {
    const list = getCollection(COLLECTION);
    const index = list.findIndex(f => String(f.id) === String(id));
    if (index === -1) throw new Error("Fournisseur introuvable.");

    list[index] = { ...list[index], ...data };
    saveCollection(COLLECTION, list);
    return list[index];
}

export async function remove(id) {
    const list = getCollection(COLLECTION);
    const filtered = list.filter(f => String(f.id) !== String(id));
    saveCollection(COLLECTION, filtered);
    return true;
}
