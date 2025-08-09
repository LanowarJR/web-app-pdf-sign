require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Inicializar Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const db = getFirestore();

// Criar um servidor Express para teste
const app = express();
app.use(cors());
app.use(express.json());

// Rota de teste para login de administrador
app.post('/admin/login', async (req, res) => {
    try {
        console.log('Recebida requisição de login admin:', req.body);
        const { email, password } = req.body;

        if (!email || !password) {
            console.log('Email ou senha não fornecidos');
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }

        // Buscar usuário no Firestore
        console.log(`Buscando usuário com email: ${email}`);
        const usersRef = db.collection('users');
        const q = usersRef.where('email', '==', email).where('role', '==', 'admin');
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            console.log('Usuário administrador não encontrado');
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        console.log('Usuário administrador encontrado');
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        // Verificar a senha
        const passwordMatch = await bcrypt.compare(password, userData.password);

        if (!passwordMatch) {
            console.log('Senha incorreta');
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        console.log('Senha correta, gerando token');
        // Gerar token JWT
        const token = jwt.sign(
            {
                userId: userDoc.id,
                email: userData.email,
                role: userData.role
            },
            process.env.JWT_SECRET || 'sua_chave_secreta',
            { expiresIn: '24h' }
        );

        console.log('Login bem-sucedido');
        res.json({
            success: true,
            token,
            user: {
                id: userDoc.id,
                email: userData.email,
                role: userData.role
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// Iniciar o servidor de teste
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Servidor de teste rodando na porta ${PORT}`);
    console.log(`Teste a rota: http://localhost:${PORT}/admin/login`);
    console.log('Use o seguinte comando para testar:');
    console.log(`curl -X POST http://localhost:${PORT}/admin/login -H "Content-Type: application/json" -d "{\"email\":\"admin@exemplo.com\",\"password\":\"senha123\"}"`);
});