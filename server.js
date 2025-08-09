const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Importar rotas da API
const authRoutes = require('./api/auth');
const documentRoutes = require('./api/documents');
const signatureRoutes = require('./api/signature');
const uploadDocumentRoutes = require('./api/upload-document');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://web-app-pdf-sign.vercel.app', 'https://*.vercel.app']
        : ['http://localhost:3000', 'http://192.168.1.243:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// Para Vercel, permitir todas as origens em produção
if (process.env.VERCEL) {
    app.use(cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
    }));
}
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Configuração do multer para upload de arquivos
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos PDF são permitidos'), false);
        }
    }
});

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('Auth middleware - Headers:', req.headers);
    console.log('Auth middleware - Token:', token ? 'Present' : 'Missing');

    if (!token) {
        console.log('Auth middleware - No token provided');
        return res.status(401).json({ error: 'Token de acesso necessário' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'sua_chave_secreta', (err, user) => {
        if (err) {
            console.log('Auth middleware - Token verification failed:', err.message);
            return res.status(403).json({ error: 'Token inválido' });
        }
        console.log('Auth middleware - Token verified for user:', user);
        req.user = user;
        next();
    });
};

// Middleware de autenticação opcional (permite token via query parameter)
const authenticateTokenOptional = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    
    // Se não há token no header, tentar query parameter
    if (!token && req.query.token) {
        token = req.query.token;
    }

    console.log('Optional auth middleware - Token:', token ? 'Present' : 'Missing');

    if (!token) {
        console.log('Optional auth middleware - No token provided, continuing without auth');
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET || 'sua_chave_secreta', (err, user) => {
        if (err) {
            console.log('Optional auth middleware - Token verification failed:', err.message);
            return next(); // Continue sem autenticação em caso de erro
        }
        console.log('Optional auth middleware - Token verified for user:', user);
        req.user = user;
        next();
    });
};

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    next();
};

// Rotas da API
app.use('/api/auth', authRoutes);

// Rota específica para visualização de documentos (deve vir ANTES da rota geral)
app.get('/api/documents/:id/view', authenticateTokenOptional, (req, res, next) => {
    // Redirecionar para o router de documentos
    documentRoutes(req, res, next);
});

// Outras rotas de documentos (requerem autenticação via header)
app.use('/api/documents', authenticateToken, documentRoutes);
app.use('/api/signature', authenticateToken, signatureRoutes);
app.use('/api/upload-document', authenticateToken, uploadDocumentRoutes);

// Proxy para PDFs do Firebase Storage (para contornar CORS no mobile)
app.get('/api/proxy-pdf', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: 'URL é obrigatória' });
        }
        
        console.log('Proxy PDF request for:', url);
        
        const https = require('https');
        const http = require('http');
        const client = url.startsWith('https') ? https : http;
        
        // Fazer requisição para o Firebase Storage
        const request = client.get(url, (response) => {
            // Definir headers apropriados
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            
            // Pipe da resposta do Firebase para o cliente
            response.pipe(res);
        });
        
        request.on('error', (error) => {
            console.error('Erro no proxy PDF:', error);
            res.status(500).json({ error: 'Erro ao carregar PDF' });
        });
        
    } catch (error) {
        console.error('Erro no proxy PDF:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Middleware para tratar erros do multer
app.use('/api/upload', (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        console.log('Multer error:', error);
        return res.status(400).json({ error: `Erro no upload: ${error.message}` });
    } else if (error) {
        console.log('Upload error:', error);
        return res.status(400).json({ error: `Erro no upload: ${error.message}` });
    }
    next();
});

// Rota para upload de documentos (apenas admin)
app.post('/api/upload', authenticateToken, requireAdmin, upload.single('pdf'), async (req, res) => {
    try {
        console.log('Upload request received:', {
            hasFile: !!req.file,
            body: req.body,
            fileDetails: req.file ? {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            } : null
        });

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const { originalname, buffer } = req.file;
        const { signaturePositions } = req.body; // Array de posições das assinaturas

        // Validar nome do arquivo (formato: nome_funcionario_cpf.pdf)
        const filenameRegex = /^(.+)_(\d{11})\.pdf$/;
        const match = originalname.match(filenameRegex);
        
        if (!match) {
            return res.status(400).json({ 
                error: 'Nome do arquivo deve seguir o formato: nome_funcionario_cpf.pdf' 
            });
        }

        const [, nomeFuncionario, cpf] = match;

        console.log('File processed successfully:', {
            nomeFuncionario,
            cpf,
            signaturePositions: signaturePositions
        });

        // Aqui você implementaria a lógica de upload para Firebase Storage
        // e salvamento no Firestore com as posições das assinaturas
        
        res.json({ 
            success: true, 
            message: 'Documento enviado com sucesso',
            data: {
                nomeFuncionario,
                cpf,
                signaturePositions: JSON.parse(signaturePositions || '[]')
            }
        });

    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rotas das páginas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-pdfjs.html'));
});

app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get('/user', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user.html'));
});

app.get('/sign', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sign-pdfjs.html'));
});

app.get('/admin-pdfjs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-pdfjs.html'));
});

app.get('/sign-pdfjs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sign-pdfjs.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Tratamento de erros
app.use((error, req, res, next) => {
    console.error(error.stack);
    res.status(500).json({ error: 'Algo deu errado!' });
});

// Para desenvolvimento local
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
        console.log(`Acesse: http://localhost:${PORT}`);
    });
}

// Para Vercel
module.exports = app;