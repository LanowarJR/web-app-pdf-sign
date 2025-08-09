const bcrypt = require('bcryptjs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

// Inicializar Firebase Admin
try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    console.log('Firebase Admin SDK inicializado');
} catch (e) {
    console.error('Erro ao inicializar Firebase Admin SDK:', e);
    process.exit(1);
}

const db = getFirestore();

async function debugAdminLogin() {
    try {
        const email = 'mauro.paulino@gmail.com';
        const testPassword = 'Melljr@lice85517';
        
        console.log('🔍 Debugando login do admin...');
        console.log('Email:', email);
        console.log('Senha testada:', testPassword);
        
        // Buscar usuário admin no Firestore
        const usersRef = db.collection('users');
        const q = usersRef.where('email', '==', email).where('role', '==', 'admin');
        const querySnapshot = await q.get();
        
        if (querySnapshot.empty) {
            console.log('❌ Usuário admin não encontrado!');
            return;
        }
        
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
        console.log('✅ Usuário admin encontrado:', userDoc.id);
        console.log('📧 Email no banco:', userData.email);
        console.log('🔑 Hash da senha no banco:', userData.password);
        console.log('📅 Última atualização:', userData.updatedAt);
        
        // Testar comparação de senha
        const isValidPassword = await bcrypt.compare(testPassword, userData.password);
        console.log('🔐 Senha válida:', isValidPassword);
        
        if (!isValidPassword) {
            console.log('\n🔧 Gerando novo hash para comparação...');
            const newHash = await bcrypt.hash(testPassword, 12);
            console.log('Novo hash gerado:', newHash);
            
            const testWithNewHash = await bcrypt.compare(testPassword, newHash);
            console.log('Teste com novo hash:', testWithNewHash);
        }
        
    } catch (error) {
        console.error('❌ Erro no debug:', error);
    }
}

debugAdminLogin();