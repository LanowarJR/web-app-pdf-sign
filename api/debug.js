const express = require('express');
const router = express.Router();
const debugLoginRoutes = require('./debug-login');

// Rota de debug para verificar variáveis de ambiente no Vercel
router.get('/env-check', (req, res) => {
    try {
        const envCheck = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            variables: {
                JWT_SECRET: process.env.JWT_SECRET ? 'CONFIGURADO' : 'NÃO CONFIGURADO',
                FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? 'CONFIGURADO' : 'NÃO CONFIGURADO',
                FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET ? 'CONFIGURADO' : 'NÃO CONFIGURADO',
                ADMIN_EMAIL: process.env.ADMIN_EMAIL ? 'CONFIGURADO' : 'NÃO CONFIGURADO',
                ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? 'CONFIGURADO' : 'NÃO CONFIGURADO'
            },
            firebase_key_preview: process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? 
                process.env.FIREBASE_SERVICE_ACCOUNT_KEY.substring(0, 50) + '...' : 'NÃO DISPONÍVEL',
            jwt_secret_preview: process.env.JWT_SECRET ? 
                process.env.JWT_SECRET.substring(0, 20) + '...' : 'NÃO DISPONÍVEL'
        };
        
        res.json({
            success: true,
            message: 'Diagnóstico de variáveis de ambiente',
            data: envCheck
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao verificar variáveis de ambiente',
            details: error.message
        });
    }
});

// Rota de debug para testar Firebase
router.get('/firebase-check', async (req, res) => {
    try {
        const admin = require('firebase-admin');
        
        // Verificar se Firebase está inicializado
        if (!admin.apps.length) {
            try {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
                });
            } catch (initError) {
                return res.status(500).json({
                    success: false,
                    error: 'Erro ao inicializar Firebase',
                    details: initError.message
                });
            }
        }
        
        // Testar conexão com Firestore
        const db = admin.firestore();
        const testDoc = await db.collection('users').limit(1).get();
        
        res.json({
            success: true,
            message: 'Firebase funcionando',
            data: {
                firebase_initialized: true,
                firestore_accessible: true,
                users_collection_accessible: true,
                sample_docs_count: testDoc.size
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao testar Firebase',
            details: error.message
        });
    }
});

// Rota de debug para testar busca do admin
router.get('/admin-check', async (req, res) => {
    try {
        const admin = require('firebase-admin');
        
        if (!admin.apps.length) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET
            });
        }
        
        const db = admin.firestore();
        const usersRef = db.collection('users');
        
        // Buscar admin
        const adminQuery = await usersRef
            .where('email', '==', 'mauro.paulino@gmail.com')
            .where('role', '==', 'admin')
            .get();
        
        if (adminQuery.empty) {
            return res.json({
                success: false,
                message: 'Admin não encontrado',
                data: {
                    admin_found: false,
                    email_searched: 'mauro.paulino@gmail.com',
                    role_searched: 'admin'
                }
            });
        }
        
        const adminDoc = adminQuery.docs[0];
        const adminData = adminDoc.data();
        
        res.json({
            success: true,
            message: 'Admin encontrado',
            data: {
                admin_found: true,
                admin_id: adminDoc.id,
                admin_email: adminData.email,
                admin_role: adminData.role,
                has_password: !!adminData.password,
                created_at: adminData.createdAt,
                updated_at: adminData.updatedAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao verificar admin',
            details: error.message
        });
    }
});

// Incluir rotas de debug de login
router.use('/', debugLoginRoutes);

module.exports = router;