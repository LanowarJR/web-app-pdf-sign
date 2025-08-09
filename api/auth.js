const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const router = express.Router();

// Inicializar Firebase Admin
if (!global.firebaseAdminInitialized) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({
            credential: cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
        global.firebaseAdminInitialized = true;
        console.log('Firebase Admin SDK inicializado em auth.js');
    } catch (e) {
        console.error('Erro ao inicializar Firebase Admin SDK:', e);
    }
}

const db = getFirestore();

// Login de administrador
router.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }

        // Buscar usuário admin no Firestore
        const usersRef = db.collection('users');
        const q = usersRef.where('email', '==', email).where('role', '==', 'admin');
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        // Verificar senha
        const isValidPassword = await bcrypt.compare(password, userData.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Gerar token JWT
        const token = jwt.sign(
            { 
                userId: userDoc.id, 
                email: userData.email, 
                role: 'admin' 
            },
            process.env.JWT_SECRET || 'sua_chave_secreta',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: userDoc.id,
                email: userData.email,
                role: 'admin'
            }
        });

    } catch (error) {
        console.error('Erro no login admin:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Login de usuário por CPF
router.post('/user/login', async (req, res) => {
    try {
        const { cpf } = req.body;

        if (!cpf) {
            return res.status(400).json({ error: 'CPF é obrigatório' });
        }

        // Limpar CPF (remover pontos e traços)
        const cleanCPF = cpf.replace(/\D/g, '');

        if (cleanCPF.length !== 11) {
            return res.status(400).json({ error: 'CPF inválido' });
        }

        // Verificar se existem documentos para este CPF
        const documentsRef = db.collection('documents');
        const q = documentsRef.where('cpfAssociado', '==', cleanCPF);
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            return res.status(404).json({ error: 'Nenhum documento encontrado para este CPF' });
        }

        // Gerar token JWT para usuário
        const token = jwt.sign(
            { 
                cpf: cleanCPF, 
                role: 'user' 
            },
            process.env.JWT_SECRET || 'sua_chave_secreta',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                cpf: cleanCPF,
                role: 'user',
                documentCount: querySnapshot.size
            }
        });

    } catch (error) {
        console.error('Erro no login usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Verificar token
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sua_chave_secreta');
        res.json({ success: true, user: decoded });

    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
});

module.exports = router;