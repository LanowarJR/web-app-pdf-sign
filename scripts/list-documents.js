require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Inicializar Firebase Admin usando as credenciais do .env
try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    console.log('✅ Firebase Admin SDK inicializado com sucesso!');
} catch (e) {
    console.error('❌ Erro ao inicializar Firebase Admin SDK:', e);
    process.exit(1);
}

const db = getFirestore();

async function listDocuments() {
    try {
        console.log('🔍 Listando todos os documentos no Firestore...');
        
        const documentsRef = db.collection('documents');
        const querySnapshot = await documentsRef.orderBy('createdAt', 'desc').get();

        if (querySnapshot.empty) {
            console.log('❌ Nenhum documento encontrado na coleção "documents".');
            return;
        }

        console.log(`✅ Encontrados ${querySnapshot.size} documento(s):\n`);
        
        querySnapshot.forEach((doc, index) => {
            const data = doc.data();
            console.log(`📄 Documento ${index + 1}:`);
            console.log(`   ID: ${doc.id}`);
            console.log(`   Filename: ${data.filename || 'N/A'}`);
            console.log(`   Nome Funcionário: ${data.nomeFuncionario || 'N/A'}`);
            console.log(`   CPF Associado: ${data.cpfAssociado || 'N/A'}`);
            console.log(`   Status: ${data.status || 'N/A'}`);
            console.log(`   Original URL: ${data.originalUrl ? 'Presente' : 'Ausente'}`);
            console.log(`   Signed URL: ${data.signedUrl ? 'Presente' : 'Ausente'}`);
            
            if (data.createdAt) {
                const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                console.log(`   Data de Criação: ${date.toLocaleString('pt-BR')}`);
            }
            
            if (data.signedAt) {
                const signedDate = data.signedAt.toDate ? data.signedAt.toDate() : new Date(data.signedAt);
                console.log(`   Data de Assinatura: ${signedDate.toLocaleString('pt-BR')}`);
            }
            
            console.log('   ---');
        });
        
        // Mostrar um documento de exemplo para teste
        const firstDoc = querySnapshot.docs[0];
        console.log(`\n💡 Para testar o download, use o ID: ${firstDoc.id}`);
        console.log(`   URL de teste: https://seu-dominio.vercel.app/public/test-vercel-api.html`);
        console.log(`   Ou localmente: http://localhost:3000/public/test-vercel-api.html`);
        
    } catch (error) {
        console.error('❌ Erro ao listar documentos:', error);
    }
}

listDocuments();