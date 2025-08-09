require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

console.log('Testando conexão com o Firebase...');

// Verificar se as variáveis de ambiente estão definidas
console.log('Verificando variáveis de ambiente:');
console.log(`FIREBASE_SERVICE_ACCOUNT_KEY definido: ${!!process.env.FIREBASE_SERVICE_ACCOUNT_KEY}`);
console.log(`FIREBASE_STORAGE_BUCKET definido: ${!!process.env.FIREBASE_STORAGE_BUCKET}`);
console.log(`JWT_SECRET definido: ${!!process.env.JWT_SECRET}`);

// Inicializar Firebase Admin usando as credenciais do .env
try {
    console.log('Tentando inicializar Firebase Admin SDK...');
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    
    // Verificar se as propriedades necessárias estão presentes
    console.log('Verificando propriedades do serviceAccount:');
    console.log(`project_id: ${serviceAccount.project_id}`);
    console.log(`private_key_id: ${serviceAccount.private_key_id ? 'definido' : 'não definido'}`);
    console.log(`private_key: ${serviceAccount.private_key ? 'definido' : 'não definido'}`);
    console.log(`client_email: ${serviceAccount.client_email}`);
    
    initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    console.log('✅ Firebase Admin SDK inicializado com sucesso!');
    
    // Testar conexão com o Firestore
    const db = getFirestore();
    console.log('Tentando acessar o Firestore...');
    
    // Função assíncrona para testar a conexão
    async function testFirestoreConnection() {
        try {
            // Tentar obter uma coleção
            const usersRef = db.collection('users');
            const snapshot = await usersRef.limit(1).get();
            
            console.log(`✅ Conexão com Firestore bem-sucedida! ${snapshot.empty ? 'Nenhum documento encontrado.' : 'Documentos encontrados.'}`);
            
            // Listar todos os usuários
            console.log('\nListando usuários:');
            const usersSnapshot = await usersRef.get();
            
            if (usersSnapshot.empty) {
                console.log('Nenhum usuário encontrado.');
            } else {
                usersSnapshot.forEach(doc => {
                    const userData = doc.data();
                    console.log(`ID: ${doc.id}`);
                    console.log(`Email: ${userData.email}`);
                    console.log(`Role: ${userData.role}`);
                    console.log('---');
                });
            }
            
        } catch (error) {
            console.error('❌ Erro ao acessar o Firestore:', error);
        }
    }
    
    testFirestoreConnection();
    
} catch (e) {
    console.error('❌ Erro ao inicializar Firebase Admin SDK:', e);
}