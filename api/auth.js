const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const validator = require('validator');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

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

// Validação para login de administrador
const adminLoginValidation = [
    body('email')
        .isEmail()
        .withMessage('Email inválido'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Senha deve ter pelo menos 6 caracteres')
        .trim()
];

// Função para validar CPF
function isValidCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;
    
    return true;
}

// Login de administrador
router.post('/admin/login', adminLoginValidation, async (req, res) => {
    try {
        // Verificar erros de validação
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Dados inválidos', 
                details: errors.array() 
            });
        }

        const { email, password } = req.body;

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

        // Verificar se JWT_SECRET está configurado
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET não configurado');
            return res.status(500).json({ error: 'Erro de configuração do servidor' });
        }

        // Gerar token JWT
        const token = jwt.sign(
            { 
                userId: userDoc.id, 
                email: userData.email, 
                role: 'admin' 
            },
            jwtSecret,
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

// Validação para login de usuário
const userLoginValidation = [
    body('cpf')
        .custom((value) => {
            if (!value) {
                throw new Error('CPF é obrigatório');
            }
            const cleanCPF = value.replace(/\D/g, '');
            if (!isValidCPF(cleanCPF)) {
                throw new Error('CPF inválido');
            }
            return true;
        })
        .trim()
];

// Login de usuário por CPF
router.post('/user/login', userLoginValidation, async (req, res) => {
    try {
        // Verificar erros de validação
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Dados inválidos', 
                details: errors.array() 
            });
        }

        const { cpf } = req.body;

        // Limpar CPF (remover pontos e traços)
        const cleanCPF = cpf.replace(/\D/g, '');

        // Verificar se existem documentos para este CPF
        const documentsRef = db.collection('documents');
        const q = documentsRef.where('cpfAssociado', '==', cleanCPF);
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            return res.status(404).json({ error: 'Nenhum documento encontrado para este CPF' });
        }

        // Verificar se JWT_SECRET está configurado
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET não configurado');
            return res.status(500).json({ error: 'Erro de configuração do servidor' });
        }

        // Gerar token JWT para usuário
        const token = jwt.sign(
            { 
                cpf: cleanCPF, 
                role: 'user' 
            },
            jwtSecret,
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

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return res.status(500).json({ error: 'Erro de configuração do servidor' });
        }

        const decoded = jwt.verify(token, jwtSecret);
        res.json({ success: true, user: decoded });

    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
});

module.exports = router;