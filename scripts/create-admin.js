const bcrypt = require('bcryptjs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

// Inicializar Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const db = getFirestore();

async function createAdminUser() {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
        console.error('❌ Uso: node create-admin.js <email> <senha>');
        console.error('Exemplo: node create-admin.js admin@exemplo.com minhasenha123');
        process.exit(1);
    }

    try {
        // Verificar se o usuário já existe
        const usersRef = db.collection('users');
        const q = usersRef.where('email', '==', email);
        const querySnapshot = await q.get();

        if (!querySnapshot.empty) {
            console.error('❌ Usuário com este email já existe!');
            process.exit(1);
        }

        // Hash da senha
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Criar usuário admin
        const userData = {
            email: email,
            password: hashedPassword,
            role: 'admin',
            createdAt: new Date()
        };

        const docRef = await db.collection('users').add(userData);

        console.log('✅ Usuário administrador criado com sucesso!');
        console.log(`📧 Email: ${email}`);
        console.log(`🆔 ID: ${docRef.id}`);
        console.log(`👨‍💼 Role: admin`);
        console.log('\n🔗 Agora você pode fazer login no sistema!');

    } catch (error) {
        console.error('❌ Erro ao criar usuário administrador:', error);
        process.exit(1);
    }
}

createAdminUser(); 