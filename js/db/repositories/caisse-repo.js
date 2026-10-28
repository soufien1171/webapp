// Repository — Sessions de caisse
import { getCollection, saveCollection } from '../store-manager.js';

const COLLECTION = 'caisses';

export async function getAll() {
    return getCollection(COLLECTION);
}

export async function getOpenSession(caissierCin = null) {
    const list = getCollection(COLLECTION);
    return list.find(c => {
        const isOpen = !c.heur_fermeture;
        if (caissierCin) return isOpen && c.caissier === caissierCin;
        return isOpen;
    }) || null;
}

export async function getLastSession() {
    const list = getCollection(COLLECTION);
    if (list.length === 0) return null;
    return list[list.length - 1];
}

export async function createSession(caissierCin, montantDepartMillimes, authenticatedAt = null) {
    const list = getCollection(COLLECTION);
    const existingOpen = await getOpenSession(caissierCin);
    if (existingOpen) return existingOpen;

    const now = new Date();
    const newSession = {
        id_caisse: String(Date.now()),
        caissier: String(caissierCin),
        date_caisse: now.toISOString().split('T')[0],
        heur_depart: now.toTimeString().substring(0, 8),
        heur_fermeture: null, // Open session
        montant_depart: Number(montantDepartMillimes || 0),
        montant_total: 0,
        authentification_at: authenticatedAt || now.toISOString(),
        deconnexion_at: null
    };

    list.push(newSession);
    saveCollection(COLLECTION, list);
    return newSession;
}

export async function recordDisconnection(caissierCin, disconnectedAt = new Date().toISOString()) {
    const list = getCollection(COLLECTION);
    const sessions = list
        .map((session, index) => ({ session, index }))
        .filter(({ session }) => String(session.caissier) === String(caissierCin))
        .sort((a, b) => String(b.session.authentification_at || '').localeCompare(String(a.session.authentification_at || '')));

    if (sessions.length === 0) return null;

    const { session, index } = sessions[0];
    list[index] = { ...session, deconnexion_at: disconnectedAt };
    saveCollection(COLLECTION, list);
    return list[index];
}

export async function closeSession(idCaisse, montantTotalMillimes) {
    const list = getCollection(COLLECTION);
    const index = list.findIndex(c => String(c.id_caisse) === String(idCaisse));
    if (index === -1) throw new Error("Session de caisse introuvable.");

    const now = new Date();
    list[index].heur_fermeture = now.toTimeString().substring(0, 8);
    list[index].montant_total = Number(montantTotalMillimes || 0);

    saveCollection(COLLECTION, list);
    return list[index];
}

export async function getSessionsByCaissier(cin) {
    const list = getCollection(COLLECTION);
    return list.filter(c => c.caissier === String(cin));
}
