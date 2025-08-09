require('dotenv').config();
const bcrypt = require('bcryptjs');
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

async function testAdminLogin() {
    const email = 'admin@exemplo.com';
    const password = 'senha123';

    try {
        console.log(`🔍 Buscando usuário com email: ${email}`);
        
        // Buscar usuário no Firestore
        const usersRef = db.collection('users');
        const q = usersRef.where('email', '==', email).where('role', '==', 'admin');
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            console.error('❌ Usuário administrador não encontrado!');
            return;
        }

        console.log('✅ Usuário administrador encontrado!');
        
        // Verificar a senha
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
        console.log('📋 Dados do usuário:');
        console.log(`ID: ${userDoc.id}`);
        console.log(`Email: ${userData.email}`);
        console.log(`Role: ${userData.role}`);
        console.log(`Password Hash: ${userData.password}`);
        
        // Testar a senha
        const passwordMatch = await bcrypt.compare(password, userData.password);
        
        if (passwordMatch) {
            console.log('✅ Senha correta!');
        } else {
            console.log('❌ Senha incorreta!');
            
            // Gerar um novo hash para a senha correta para comparação
            const newHash = await bcrypt.hash(password, 10);
            console.log(`💡 Novo hash para 'senha123': ${newHash}`);
        }
        
    } catch (error) {
        console.error('❌ Erro ao testar login:', error);
    }
}

testAdminLogin();