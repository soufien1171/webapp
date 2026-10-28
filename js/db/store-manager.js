// Store Manager — Unified data storage & offline-first persistence
import { hashPassword } from '../helpers/password-helper.js';
import { getDb, getFirestoreApi } from '../firebase-config.js';

const STORAGE_PREFIX = 'caisse_2_0_';
let currentStoreId = 'default_store';

// Default initial database content modeled after application.sql
export async function getSeedData(options = {}) {
    const adminPassHash = await hashPassword('9778');
    const caissierPassHash = await hashPassword('1111');

    return {
        config: {
            parametres: {
                nom_ste: "Mon Supermarché",
                desc_ste: "Alimentation Générale & Multimédia",
                adr_ste: "Avenue Habib Bourguiba, Tunis",
                tel_ste: "71 000 000",
                remise: true,
                img_para: true,
                caisse_para: 1, // 1: Clavier/Code-barre, 2: Tactile
                touch_cols: 5,
                theme: "dark"
            },
            pin: {
                pin_user: "1234"
            },
            licence: {
                num_serie: "1046-6284-8280-2629",
                validation: false,
                date_debut: "2023-01-01",
                date_fin: "2030-12-31"
            }
        },
        utilisateurs: options.owner ? [
            {
                cin: String(options.owner.uid),
                username: options.owner.email || String(options.owner.uid),
                nom: options.owner.displayName || options.owner.email || 'Propriétaire',
                prenom: '',
                email: options.owner.email || '',
                motpass: '',
                date_ness: '',
                adresse: '',
                num_tel: '',
                role: 3,
                is_owner: true,
                provider: 'google',
                mustSetPassword: true,
                passwordConfigured: false
            }
        ] : [
            {
                cin: "97789778",
                username: "admin",
                nom: "Sou",
                prenom: "Fien",
                motpass: adminPassHash,
                date_ness: "1990-01-01",
                adresse: "Tunis",
                num_tel: "54545578",
                role: 3, // Admin
                is_owner: true
            },
            {
                cin: "11111111",
                username: "caissier",
                nom: "Ben Ali",
                prenom: "Ahmed",
                motpass: caissierPassHash,
                date_ness: "1995-05-15",
                adresse: "Ariana",
                num_tel: "65465465",
                role: 1, // Caissier
                is_owner: false
            }
        ],
        categories: [
            { id: "1", nom_cat: "Informatique" },
            { id: "2", nom_cat: "Téléphone & Accessoires" },
            { id: "3", nom_cat: "TV & Son" },
            { id: "4", nom_cat: "Alimentation" },
            { id: "5", nom_cat: "Boissons" }
        ],
        produits: [
            {
                id: "1",
                code_barre: "4000647100442",
                nom_p: "TICKET CLAVIER PRO",
                prix_p: 2000, // 2.000 DT
                prix_achat: 1000,
                quantite_p: 45,
                quantite_min: 4,
                rayon: 1, // 1: Unité, 2: Poids
                date_exp: "2030-01-01",
                fournisseur: "MPShop",
                categorie: "Informatique",
                lien_img: ""
            },
            {
                id: "2",
                code_barre: "3126170057921",
                nom_p: "DVD-R VERBATIM 4.7GB",
                prix_p: 1200, // 1.200 DT
                prix_achat: 600,
                quantite_p: 43,
                quantite_min: 15,
                rayon: 1,
                date_exp: "2030-01-01",
                fournisseur: "MPShop",
                categorie: "Informatique",
                lien_img: ""
            },
            {
                id: "3",
                code_barre: "6191000000018",
                nom_p: "COCA COLA 1.5L",
                prix_p: 3200, // 3.200 DT
                prix_achat: 2500,
                quantite_p: 80,
                quantite_min: 10,
                rayon: 1,
                date_exp: "2027-06-30",
                fournisseur: "Société Boissons",
                categorie: "Boissons",
                lien_img: ""
            },
            {
                id: "4",
                code_barre: "2000000000015",
                nom_p: "POMMES GOLDEN (VRAC)",
                prix_p: 4500, // 4.500 DT / kg
                prix_achat: 3200,
                quantite_p: 50,
                quantite_min: 5,
                rayon: 2, // Par Poids (pesé)
                date_exp: "2026-12-31",
                fournisseur: "Marché Central",
                categorie: "Alimentation",
                lien_img: ""
            }
        ],
        fournisseurs: [
            {
                id: "1",
                nom_prenom: "MPShop",
                produit: "Informatique & Bureautique",
                adresse: "43 rue de Marseille, Tunis",
                num_tel: "23.746.196",
                date_tour: "Vendredi"
            },
            {
                id: "2",
                nom_prenom: "Wael Distribution",
                produit: "Accessoires GSM",
                adresse: "Nabeul",
                num_tel: "22.222.264",
                date_tour: "Lundi"
            }
        ],
        caisses: [],
        factures: [],
        ventes: []
    };
}

export function setStoreId(storeId) {
    if (storeId) currentStoreId = storeId;
}

export function getStoreId() {
    return currentStoreId;
}

function getKey(collection) {
    return `${STORAGE_PREFIX}${currentStoreId}_${collection}`;
}

const CLOUD_COLLECTIONS = ['config', 'utilisateurs', 'categories', 'produits', 'fournisseurs', 'caisses', 'factures', 'ventes'];

function cloudDocument(collectionName) {
    const api = getFirestoreApi();
    const db = getDb();
    return api && db ? api.doc(db, 'stores', currentStoreId, 'collections', collectionName) : null;
}

async function loadCloudStore() {
    const api = getFirestoreApi();
    if (!api || !getDb()) return false;

    let loaded = false;
    for (const collectionName of CLOUD_COLLECTIONS) {
        const snapshot = await api.getDoc(cloudDocument(collectionName));
        if (!snapshot.exists()) continue;
        localStorage.setItem(getKey(collectionName), JSON.stringify(snapshot.data().value ?? snapshot.data()));
        loaded = true;
    }
    return loaded;
}

async function saveCloudDocument(collectionName, value) {
    const api = getFirestoreApi();
    const ref = cloudDocument(collectionName);
    if (!api || !ref) return;
    try {
        await api.setDoc(ref, { value, updatedAt: new Date().toISOString() });
    } catch (err) {
        console.warn(`[Firebase] Synchronisation impossible pour ${collectionName}:`, err);
    }
}

export async function initStore(storeId = 'default_store', options = {}) {
    setStoreId(storeId);
    if (storeId !== 'default_store') {
        try {
            await loadCloudStore();
        } catch (err) {
            console.warn('[Firebase] Lecture du magasin cloud impossible, mode local utilisé.', err);
        }
    }
    const existingConfig = localStorage.getItem(getKey('config'));
    if (!existingConfig) {
        console.log(`[Store] Initializing new store: ${storeId}`);
        const seed = await getSeedData(options);
        if (options.owner) {
            // A new Google customer starts with an empty business database.
            seed.categories = [];
            seed.produits = [];
            seed.fournisseurs = [];
            seed.caisses = [];
            seed.factures = [];
            seed.ventes = [];
        }
        localStorage.setItem(getKey('config'), JSON.stringify(seed.config));
        localStorage.setItem(getKey('utilisateurs'), JSON.stringify(seed.utilisateurs));
        localStorage.setItem(getKey('categories'), JSON.stringify(seed.categories));
        localStorage.setItem(getKey('produits'), JSON.stringify(seed.produits));
        localStorage.setItem(getKey('fournisseurs'), JSON.stringify(seed.fournisseurs));
        localStorage.setItem(getKey('caisses'), JSON.stringify(seed.caisses));
        localStorage.setItem(getKey('factures'), JSON.stringify(seed.factures));
        localStorage.setItem(getKey('ventes'), JSON.stringify(seed.ventes));
        if (storeId !== 'default_store' && getFirestoreApi()) {
            await Promise.all(CLOUD_COLLECTIONS.map(collectionName =>
                saveCloudDocument(collectionName, collectionName === 'config'
                    ? seed.config
                    : seed[collectionName])
            ));
        }
    }
}

// Low-level collection operations
export function getCollection(collection) {
    const raw = localStorage.getItem(getKey(collection));
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

export function saveCollection(collection, data) {
    localStorage.setItem(getKey(collection), JSON.stringify(data));
    if (currentStoreId !== 'default_store') void saveCloudDocument(collection, data);
}

export function getConfigDoc(docName) {
    const raw = localStorage.getItem(getKey('config'));
    if (!raw) return null;
    try {
        const config = JSON.parse(raw);
        return config[docName] || null;
    } catch {
        return null;
    }
}

export function saveConfigDoc(docName, docData) {
    const raw = localStorage.getItem(getKey('config'));
    let config = {};
    if (raw) {
        try { config = JSON.parse(raw); } catch {}
    }
    config[docName] = { ...(config[docName] || {}), ...docData };
    localStorage.setItem(getKey('config'), JSON.stringify(config));
    if (currentStoreId !== 'default_store') void saveCloudDocument('config', config);
}
