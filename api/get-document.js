// api/get-document.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Garante que o Firebase Admin SDK seja inicializado apenas uma vez.
if (!global.firebaseAdminInitialized) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    initializeApp({
        credential: cert(serviceAccount),
        // storageBucket não é estritamente necessário aqui, mas manter se desejar consistência
    });
    global.firebaseAdminInitialized = true;
}

const db = getFirestore();

export default async function handler(req, res) {
    console.log('API get-document.js recebendo requisição.');
    console.log('req.query (para get-document):', req.query); // Log para inspecionar todos os parâmetros de query

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { id } = req.query; // Pega o ID do documento da query string (ex: ?id=abc)

    if (!id) {
        console.error('ID do documento não fornecido na requisição GET.');
        console.error('Tipo de id recebido:', typeof id, 'Valor:', id); 
        return res.status(400).json({ error: 'Document ID is required.' });
    }

    try {
        const docRef = db.collection('documents').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            console.warn(`Documento com ID ${id} não encontrado no Firestore.`);
            return res.status(404).json({ error: 'Document not found.' });
        }

        const docData = docSnap.data();
        console.log(`Documento ${id} encontrado. Nome: ${docData.nome_arquivo_original}, URL: ${docData.url_original ? docData.url_original.substring(0, 50) + '...' : 'N/A'}`);

        // Retorna apenas os dados necessários para o frontend carregar o PDF
        res.status(200).json({
            id: docSnap.id,
            nome_arquivo_original: docData.nome_arquivo_original,
            url_original: docData.url_original,
            status: docData.status, 
            created_at: docData.created_at
        });

    } catch (error) {
        console.error('Erro ao buscar documento no Firestore:', error);
        res.status(500).json({ 
            error: 'Internal Server Error', 
            details: error.message,
        });
    }
}