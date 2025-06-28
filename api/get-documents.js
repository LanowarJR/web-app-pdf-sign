// api/get-documents.js

// Importações necessárias para Firebase Admin SDK
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage'; 

// Garante que o Firebase Admin SDK seja inicializado apenas uma vez para evitar erros.
if (!global.firebaseAdminInitialized) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        
        initializeApp({
            credential: cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET 
        });
        
        global.firebaseAdminInitialized = true;
        console.log('Firebase Admin SDK inicializado com sucesso em get-documents.js!');
    } catch (error) {
        console.error('ERRO FATAL: Falha ao inicializar Firebase Admin SDK em get-documents.js. Verifique FIREBASE_SERVICE_ACCOUNT_KEY e FIREBASE_STORAGE_BUCKET:', error);
    }
}

const db = getFirestore();
const storage = getStorage(); // Inicializa o Storage (mesmo que não seja usado diretamente nesta API, a inicialização é global)

export default async function handler(req, res) {
    console.log('API get-documents.js recebendo requisição.');
    console.log('req.query (para get-documents):', req.query); // Log para ver todos os parâmetros

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { cpf } = req.query; // Pega o CPF da query string

    if (!cpf) {
        console.error('CPF não fornecido na requisição GET para listar documentos.');
        return res.status(400).json({ error: 'CPF is required to list documents.' });
    }

    try {
        console.log(`Buscando documentos para o CPF: ${cpf}`);
        const documentsRef = db.collection('documents');
        
        // --- CONSULTAS AO FIRESTORE ---
        const [uploadedDocsSnap, signedDocsSnap, associatedDocsSnap] = await Promise.all([
            // Busca por documentos onde o CPF do usuário é o uploader
            documentsRef.where('uploaded_by_cpf', '==', cpf).get(),
            // Busca por documentos onde o CPF do usuário é o signatário
            documentsRef.where('signed_by_cpf', '==', cpf).get(),
            // Busca por documentos onde o CPF do usuário está no campo 'cpf_associado'
            documentsRef.where('cpf_associado', '==', cpf).get() 
        ]);

        // --- LOGS PARA INSPEÇÃO DOS DADOS BRUTOS RETORNADOS PELO FIRESTORE ---
        console.log('API get-documents.js - Dados brutos de uploadedDocsSnap:', uploadedDocsSnap.docs.map(doc => doc.data()));
        console.log('API get-documents.js - Dados brutos de signedDocsSnap:', signedDocsSnap.docs.map(doc => doc.data()));
        console.log('API get-documents.js - Dados brutos de associatedDocsSnap:', associatedDocsSnap.docs.map(doc => doc.data()));
        // --- FIM DOS LOGS ---

        const documents = [];
        const uniqueDocIds = new Set(); // Para garantir que cada documento seja listado apenas uma vez

        // Adiciona documentos encontrados pelas diferentes queries, evitando duplicatas
        uploadedDocsSnap.forEach(doc => {
            if (!uniqueDocIds.has(doc.id)) {
                documents.push({ id: doc.id, ...doc.data() });
                uniqueDocIds.add(doc.id);
            }
        });

        signedDocsSnap.forEach(doc => {
            if (!uniqueDocIds.has(doc.id)) {
                documents.push({ id: doc.id, ...doc.data() });
                uniqueDocIds.add(doc.id);
            }
        });

        associatedDocsSnap.forEach(doc => { // Processa os documentos encontrados pelo 'cpf_associado'
            if (!uniqueDocIds.has(doc.id)) {
                documents.push({ id: doc.id, ...doc.data() });
                uniqueDocIds.add(doc.id);
            }
        });

        console.log(`Encontrados ${documents.length} documentos para o CPF ${cpf}.`);
        res.status(200).json(documents);

    } catch (error) {
        console.error('Erro ao listar documentos no Firestore:', error);
        res.status(500).json({ 
            error: 'Internal Server Error', 
            details: error.message,
        });
    }
}