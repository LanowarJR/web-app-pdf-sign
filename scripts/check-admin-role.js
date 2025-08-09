// Carregar variáveis de ambiente
require('dotenv').config();

const admin = require('firebase-admin');

console.log('🔍 Verificando role do usuário admin...');

// Inicializar Firebase Admin
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
        console.log('Firebase Admin SDK inicializado');
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error.message);
        process.exit(1);
    }
}

async function checkAdminRole() {
    try {
        const db = admin.firestore();
        const usersRef = db.collection('users');
        
        // Buscar usuário por email
        console.log('\n1️⃣ Buscando usuário por email...');
        const emailQuery = await usersRef.where('email', '==', 'mauro.paulino@gmail.com').get();
        
        if (emailQuery.empty) {
            console.log('❌ Usuário não encontrado por email');
            return;
        }
        
        const userDoc = emailQuery.docs[0];
        const userData = userDoc.data();
        
        console.log('✅ Usuário encontrado:');
        console.log('- ID:', userDoc.id);
        console.log('- Email:', userData.email);
        console.log('- Role:', userData.role || 'NÃO DEFINIDO');
        console.log('- Dados completos:', JSON.stringify(userData, null, 2));
        
        // Buscar especificamente com role admin
        console.log('\n2️⃣ Buscando usuário com role admin...');
        const adminQuery = await usersRef
            .where('email', '==', 'mauro.paulino@gmail.com')
            .where('role', '==', 'admin')
            .get();
        
        if (adminQuery.empty) {
            console.log('❌ Usuário NÃO encontrado com role admin');
            console.log('\n🔧 PROBLEMA IDENTIFICADO: O usuário não tem role "admin"');
            
            // Corrigir o role
            console.log('\n3️⃣ Corrigindo role do usuário...');
            await userDoc.ref.update({ role: 'admin' });
            console.log('✅ Role atualizado para "admin"');
            
            // Verificar novamente
            const verifyQuery = await usersRef
                .where('email', '==', 'mauro.paulino@gmail.com')
                .where('role', '==', 'admin')
                .get();
            
            if (!verifyQuery.empty) {
                console.log('✅ Verificação: Usuário agora tem role admin');
                console.log('🎉 Problema resolvido! Tente fazer login novamente.');
            } else {
                console.log('❌ Erro: Ainda não conseguiu definir role admin');
            }
        } else {
            console.log('✅ Usuário encontrado com role admin');
            console.log('🤔 O problema pode estar em outro lugar...');
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar role:', error.message);
    }
}

checkAdminRole().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error('❌ Erro:', error.message);
    process.exit(1);
});