const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
require('dotenv').config();

let db;
let bucket;

function initializeFirebase() {
    try {
        // Verificar se já existe uma app inicializada para evitar duplicidade
        if (getApps().length === 0) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

            initializeApp({
                credential: cert(serviceAccount),
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET
            });

            console.log('Firebase Admin SDK inicializado com sucesso.');
        } else {
            console.log('Firebase Admin SDK já estava inicializado.');
        }

        db = getFirestore();
        bucket = getStorage().bucket();

        return { db, bucket };
    } catch (error) {
        console.error('Falha crítica ao inicializar Firebase:', error);
        throw error;
    }
}

// Inicializar imediatamente ao carregar o módulo
const firebaseApp = initializeFirebase();

module.exports = firebaseApp;
