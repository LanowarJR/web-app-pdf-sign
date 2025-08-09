const express = require('express');
const admin = require('firebase-admin');
const multer = require('multer');
const router = express.Router();

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

// Inicializar Firebase se ainda não foi inicializado
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: "assinarpdfdocs.firebasestorage.app"
        });
    } catch (error) {
        console.error("Erro ao inicializar Firebase Admin SDK:", error);
    }
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Rota POST para upload de documentos
router.post('/', upload.single('pdf'), async (req, res) => {
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
        const { signaturePositions, cpf_associado } = req.body;

        // Validar formato do nome do arquivo
        const fileNamePattern = /^(.+)_([0-9]{11})\.pdf$/;
        const match = originalname.match(fileNamePattern);
        
        if (!match) {
            return res.status(400).json({ 
                error: 'Nome do arquivo deve seguir o padrão: nome_funcionario_cpf.pdf' 
            });
        }

        const [, nomeFuncionario, cpfFromFilename] = match;
        const cpfToUse = cpf_associado || cpfFromFilename;

        if (!cpfToUse) {
            return res.status(400).json({ 
                error: 'CPF do associado é obrigatório' 
            });
        }

        // Upload para Firebase Storage
        const fileName = `documents/${Date.now()}_${originalname}`;
        const file = bucket.file(fileName);
        
        await file.save(buffer, {
            metadata: {
                contentType: 'application/pdf'
            }
        });

        // Tornar o arquivo público
        await file.makePublic();
        
        // Obter URL pública
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        // Salvar metadados no Firestore
        const docData = {
            filename: originalname,
            nomeFuncionario: nomeFuncionario.replace(/_/g, ' '),
            cpfAssociado: cpfToUse,
            originalUrl: publicUrl,
            signaturePositions: signaturePositions ? JSON.parse(signaturePositions) : [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending'
        };

        const docRef = await db.collection('documents').add(docData);
        
        console.log('Document uploaded successfully:', {
            id: docRef.id,
            filename: originalname,
            url: publicUrl
        });

        res.json({ 
            success: true, 
            message: 'Documento enviado com sucesso!',
            documentId: docRef.id,
            url: publicUrl
        });

    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: error.message 
        });
    }
});

module.exports = router;