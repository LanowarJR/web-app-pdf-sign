const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://firestore.googleapis.com", "https://storage.googleapis.com"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP
    message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 tentativas de login por IP
    message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(limiter);

// CORS restritivo
const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? ['https://web-app-pdf-sign-git-main-trae-ais-projects.vercel.app']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
    origin: function (origin, callback) {
        // Permitir requests sem origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Não permitido pelo CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

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

    if (process.env.NODE_ENV !== 'production') {
        console.log('Auth middleware - Token:', token ? 'Present' : 'Missing');
    }

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso necessário' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error('JWT_SECRET não configurado');
        return res.status(500).json({ error: 'Erro de configuração do servidor' });
    }

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) {
            if (process.env.NODE_ENV !== 'production') {
                console.log('Auth middleware - Token verification failed:', err.message);
            }
            return res.status(403).json({ error: 'Token inválido' });
        }
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

    if (process.env.NODE_ENV !== 'production') {
        console.log('Optional auth middleware - Token:', token ? 'Present' : 'Missing');
    }

    if (!token) {
        return next();
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return next(); // Continue sem autenticação se JWT_SECRET não estiver configurado
    }

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) {
            if (process.env.NODE_ENV !== 'production') {
                console.log('Optional auth middleware - Token verification failed:', err.message);
            }
            return next(); // Continue sem autenticação em caso de erro
        }
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
app.use('/api/auth', authLimiter, authRoutes);

// Middleware condicional para rotas de documentos
app.use('/api/documents', (req, res, next) => {
    // Se for a rota de visualização, usar middleware opcional
    if (req.path.includes('/view')) {
        return authenticateTokenOptional(req, res, next);
    }
    // Para outras rotas, usar middleware obrigatório
    return authenticateToken(req, res, next);
}, documentRoutes);
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