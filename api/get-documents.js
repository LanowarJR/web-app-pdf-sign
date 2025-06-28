// api/get-documents.js

// Importações necessárias para Firebase Admin SDK
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
// Como você usa Storage, também precisamos importar getStorage
import { getStorage } from 'firebase-admin/storage'; 

// Garante que o Firebase Admin SDK seja inicializado apenas uma vez para evitar erros.
// Isso é importante para ambientes como Vercel, que podem re-executar módulos.
if (!global.firebaseAdminInitialized) {
    try {
        // Tenta parsear a chave de serviço da variável de ambiente.
        // É CRUCIAL que FIREBASE_SERVICE_ACCOUNT_KEY esteja configurada corretamente no .env.local e no Vercel.
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        
        initializeApp({
            credential: cert(serviceAccount),
            // Usando o nome do bucket fornecido por você:
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET 
        });
        
        global.firebaseAdminInitialized = true;
        console.log('Firebase Admin SDK inicializado com sucesso em get-documents.js!');
    } catch (error) {
        console.error('ERRO FATAL: Falha ao inicializar Firebase Admin SDK em get-documents.js. Verifique FIREBASE_SERVICE_ACCOUNT_KEY e FIREBASE_STORAGE_BUCKET:', error);
        // Em um ambiente de produção, você pode querer sair do processo ou desabilitar a API.
    }
}

const db = getFirestore();
const storage = getStorage(); // Inicializa o Storage

export default async function handler(req, res) {
    console.log('API get-documents.js recebendo requisição.'); // Log para esta API
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
        
        // Consulta o Firestore para encontrar documentos onde 'uploaded_by_cpf' ou 'signed_by_cpf' seja igual ao CPF
        const [uploadedDocsSnap, signedDocsSnap] = await Promise.all([
            documentsRef.where('uploaded_by_cpf', '==', cpf).get(),
            documentsRef.where('signed_by_cpf', '==', cpf).get()
        ]);

        const documents = [];
        const uniqueDocIds = new Set(); // Para evitar duplicatas se um documento for upado E assinado pelo mesmo CPF

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