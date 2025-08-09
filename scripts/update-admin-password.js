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

async function updateAdminPassword() {
    try {
        const email = process.env.ADMIN_EMAIL || 'mauro.paulino@gmail.com';
        const newPassword = process.env.ADMIN_PASSWORD;
        
        if (!newPassword) {
            console.error('❌ ADMIN_PASSWORD não definida nas variáveis de ambiente');
            console.log('Defina ADMIN_PASSWORD no arquivo .env ou como variável de ambiente');
            return;
        }
        
        console.log('Buscando usuário admin...');
        
        // Buscar usuário admin no Firestore
        const usersRef = db.collection('users');
        const q = usersRef.where('email', '==', email).where('role', '==', 'admin');
        const querySnapshot = await q.get();
        
        if (querySnapshot.empty) {
            console.log('Usuário admin não encontrado!');
            return;
        }
        
        const userDoc = querySnapshot.docs[0];
        console.log('Usuário admin encontrado:', userDoc.id);
        
        // Hash da nova senha
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        // Atualizar senha no Firestore
        await userDoc.ref.update({
            password: hashedPassword,
            updatedAt: new Date().toISOString()
        });
        
        console.log('✅ Senha do admin atualizada com sucesso!');
        console.log('Email:', email);
        console.log('Senha atualizada (não exibida por segurança)');
        
    } catch (error) {
        console.error('❌ Erro ao atualizar senha do admin:', error);
    }
}

updateAdminPassword();