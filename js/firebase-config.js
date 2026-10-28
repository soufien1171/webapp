// Firebase Configuration — Caisse 2.0
// Replace placeholders with your Firebase project credentials

const firebaseConfig = {
    apiKey: "AIzaSyADWlSDjMSYWAjOfJUk6wf356Asa36zA-s",
    authDomain: "caisse-web-app.firebaseapp.com",
    databaseURL: "https://caisse-web-app-default-rtdb.firebaseio.com",
    projectId: "caisse-web-app",
    storageBucket: "caisse-web-app.firebasestorage.app",
    messagingSenderId: "724544492936",
    appId: "1:724544492936:web:c650218d21572ff7ebd63d"
};

let app, db, auth, rtdb, firestoreApi, realtimeApi;

export async function initFirebase() {
    const { initializeApp, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, setDoc, collection, getDocs, getAuth, getDatabase, ref, get } = window.__FIREBASE_MODULES__;

    app = initializeApp(firebaseConfig);
    // Cache hors ligne moderne Firestore (remplace enableIndexedDbPersistence).
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        })
    });
    firestoreApi = { doc, getDoc, setDoc, collection, getDocs };
    auth = getAuth(app);
    rtdb = getDatabase(app);
    realtimeApi = { ref, get };

    console.log('[Firebase] Offline persistence enabled with persistentLocalCache');

    return { app, db, auth, rtdb };
}

export function getDb() { return db; }
export function getFirestoreApi() { return firestoreApi; }
export function getAuthInstance() { return auth; }
export function getRtdb() { return rtdb; }
export function getRealtimeApi() { return realtimeApi; }
export function getApp() { return app; }
export { firebaseConfig };
