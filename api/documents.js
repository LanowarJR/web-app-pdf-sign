const express = require('express');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const multer = require('multer');

const router = express.Router();
const db = getFirestore();
const bucket = getStorage().bucket();

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

// Configuração para múltiplos arquivos
const uploadMultiple = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB por arquivo
        files: 20 // máximo 20 arquivos
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos PDF são permitidos'), false);
        }
    }
});

// Listar documentos do usuário (por CPF)
router.get('/user', async (req, res) => {
    try {
        const { cpf } = req.user;

        if (!cpf) {
            return res.status(400).json({ error: 'CPF não encontrado no token' });
        }

        const documentsRef = db.collection('documents');
        const q = documentsRef.where('cpfAssociado', '==', cpf);
        const querySnapshot = await q.get();

        const documents = [];
        querySnapshot.forEach(doc => {
            documents.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        res.json({
            success: true,
            documents
        });

    } catch (error) {
        console.error('Erro ao listar documentos do usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Listar todos os documentos (apenas admin)
router.get('/admin', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const documentsRef = db.collection('documents');
        const querySnapshot = await documentsRef.get();

        const documents = [];
        querySnapshot.forEach(doc => {
            documents.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.json({
            success: true,
            documents
        });

    } catch (error) {
        console.error('Erro ao listar documentos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Obter documento específico
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { role, cpf } = req.user;

        const docRef = db.collection('documents').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        const documentData = docSnap.data();

        // Verificar permissão
        if (role === 'user' && documentData.cpfAssociado !== cpf) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        res.json({
            success: true,
            document: {
                id: docSnap.id,
                ...documentData
            }
        });

    } catch (error) {
        console.error('Erro ao obter documento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Upload de documento (apenas admin)
router.post('/upload', upload.single('pdf'), async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const { originalname, buffer } = req.file;
        const { signaturePositions } = req.body;

        // Validar nome do arquivo
        const filenameRegex = /^(.+)_(\d{11})\.pdf$/;
        const match = originalname.match(filenameRegex);
        
        if (!match) {
            return res.status(400).json({ 
                error: 'Nome do arquivo deve seguir o formato: nome_funcionario_cpf.pdf' 
            });
        }

        const [, nomeFuncionario, cpf] = match;

        // Upload para Firebase Storage
        const fileUpload = bucket.file(`documents/${originalname}`);
        await fileUpload.save(buffer, {
            metadata: {
                contentType: 'application/pdf',
                metadata: {
                    nomeFuncionario,
                    cpf
                }
            }
        });

        // Gerar URL de download
        const [downloadUrl] = await fileUpload.getSignedUrl({
            action: 'read',
            expires: '03-09-2491'
        });

        // Salvar no Firestore
        const docRef = await db.collection('documents').add({
            nomeFuncionario,
            cpfAssociado: cpf,
            filename: originalname,
            originalUrl: downloadUrl,
            signaturePositions: JSON.parse(signaturePositions || '[]'),
            status: 'pending',
            createdAt: new Date(),
            uploadedBy: req.user.userId
        });

        res.json({
            success: true,
            message: 'Documento enviado com sucesso',
            documentId: docRef.id
        });

    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Upload em lote de documentos (apenas admin)
// Nova rota para upload em lote com multer
router.post('/upload-bulk', uploadMultiple.array('pdfs'), async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const { signaturePositions } = req.body;
        const files = req.files;
        const results = [];
        const errors = [];

        // Processar cada arquivo
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const { originalname: filename, buffer } = file;
            
            try {
                // Validar formato do nome do arquivo
                const filenameRegex = /^(.+)_(\d{11})\.pdf$/;
                const match = filename.match(filenameRegex);
                
                if (!match) {
                    errors.push({
                        filename: filename,
                        error: 'Nome do arquivo deve seguir o formato: nome_funcionario_cpf.pdf'
                    });
                    continue;
                }

                const [, nomeFuncionario, cpf] = match;

                // Upload para Firebase Storage
                const fileUpload = bucket.file(`documents/${filename}`);
                await fileUpload.save(buffer, {
                    metadata: {
                        contentType: 'application/pdf',
                        metadata: {
                            nomeFuncionario,
                            cpf
                        }
                    }
                });

                // Gerar URL de download
                const [downloadUrl] = await fileUpload.getSignedUrl({
                    action: 'read',
                    expires: '03-09-2491'
                });

                // Salvar no Firestore
                const docRef = await db.collection('documents').add({
                    nomeFuncionario,
                    cpfAssociado: cpf,
                    filename,
                    originalUrl: downloadUrl,
                    signaturePositions: JSON.parse(signaturePositions || '[]'),
                    status: 'pending',
                    createdAt: new Date(),
                    uploadedBy: req.user.userId
                });

                results.push({
                    filename: filename,
                    documentId: docRef.id,
                    nomeFuncionario: nomeFuncionario,
                    cpf: cpf,
                    success: true
                });

            } catch (error) {
                console.error(`Erro ao processar ${filename}:`, error);
                errors.push({
                    filename: filename,
                    error: error.message || 'Erro interno do servidor'
                });
            }
        }

        res.json({
            success: true,
            message: `${results.length} documento(s) enviado(s) com sucesso`,
            results: results,
            errors: errors,
            totalProcessed: files.length,
            successCount: results.length,
            errorCount: errors.length
        });

    } catch (error) {
        console.error('Erro no upload em lote:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Download de documento assinado (apenas admin)
router.get('/:id/download', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const { id } = req.params;
        const docRef = db.collection('documents').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        const documentData = docSnap.data();

        if (documentData.status !== 'signed') {
            return res.status(400).json({ error: 'Documento ainda não foi assinado' });
        }

        if (!documentData.signedUrl) {
            return res.status(400).json({ error: 'URL do documento assinado não encontrada' });
        }

        res.json({
            success: true,
            downloadUrl: documentData.signedUrl
        });

    } catch (error) {
        console.error('Erro ao obter URL de download:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Listar todos os documentos para o dashboard (apenas admin)
router.get('/', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const documentsRef = db.collection('documents');
        const querySnapshot = await documentsRef.orderBy('createdAt', 'desc').get();

        const documents = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            documents.push({
                id: doc.id,
                filename: data.filename,
                status: data.status,
                uploadDate: data.createdAt,
                signedDate: data.signedAt || null,
                signerEmail: data.signerEmail || null,
                cpfAssociado: data.cpfAssociado || data.cpf,
                nomeFuncionario: data.nomeFuncionario
            });
        });

        res.json(documents);

    } catch (error) {
        console.error('Erro ao listar documentos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Visualizar documento (apenas admin)
router.get('/:id/view', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const { id } = req.params;
        const docRef = db.collection('documents').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        const documentData = docSnap.data();
        const url = documentData.status === 'signed' ? documentData.signedUrl : documentData.originalUrl;

        if (!url) {
            return res.status(400).json({ error: 'URL do documento não encontrada' });
        }

        // Redirecionar para o arquivo
        res.redirect(url);

    } catch (error) {
        console.error('Erro ao visualizar documento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Download em lote (apenas admin)
router.post('/download-bulk', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const { documentIds } = req.body;

        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return res.status(400).json({ error: 'IDs de documentos inválidos' });
        }

        const archiver = require('archiver');
        const archive = archiver('zip', { zlib: { level: 9 } });

        res.attachment('documentos-assinados.zip');
        archive.pipe(res);

        let addedFiles = 0;

        for (const docId of documentIds) {
            try {
                const docRef = db.collection('documents').doc(docId);
                const docSnap = await docRef.get();

                if (docSnap.exists) {
                    const documentData = docSnap.data();
                    const url = documentData.status === 'signed' ? documentData.signedUrl : documentData.originalUrl;

                    if (url) {
                        // Fazer download do arquivo
                        const https = require('https');
                        const http = require('http');
                        const client = url.startsWith('https') ? https : http;

                        await new Promise((resolve, reject) => {
                            client.get(url, (response) => {
                                if (response.statusCode === 200) {
                                    archive.append(response, { name: documentData.filename });
                                    addedFiles++;
                                    resolve();
                                } else {
                                    console.error(`Erro ao baixar ${documentData.filename}: ${response.statusCode}`);
                                    resolve(); // Continue mesmo com erro
                                }
                            }).on('error', (err) => {
                                console.error(`Erro ao baixar ${documentData.filename}:`, err);
                                resolve(); // Continue mesmo com erro
                            });
                        });
                    }
                }
            } catch (error) {
                console.error(`Erro ao processar documento ${docId}:`, error);
                // Continue com os outros documentos
            }
        }

        if (addedFiles === 0) {
            return res.status(400).json({ error: 'Nenhum documento válido encontrado' });
        }

        archive.finalize();

    } catch (error) {
        console.error('Erro no download em lote:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Excluir em lote (apenas admin)
router.delete('/delete-bulk', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const { documentIds } = req.body;

        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return res.status(400).json({ error: 'IDs de documentos inválidos' });
        }

        const batch = db.batch();
        const deletedFiles = [];

        for (const docId of documentIds) {
            try {
                const docRef = db.collection('documents').doc(docId);
                const docSnap = await docRef.get();

                if (docSnap.exists) {
                    const documentData = docSnap.data();
                    
                    // Excluir do Firestore
                    batch.delete(docRef);
                    
                    // Marcar arquivos para exclusão do Storage
                    if (documentData.filename) {
                        deletedFiles.push(`documents/${documentData.filename}`);
                    }
                    if (documentData.signedFilename) {
                        deletedFiles.push(`signed/${documentData.signedFilename}`);
                    }
                }
            } catch (error) {
                console.error(`Erro ao processar documento ${docId}:`, error);
            }
        }

        // Executar exclusão em lote no Firestore
        await batch.commit();

        // Excluir arquivos do Storage
        for (const filePath of deletedFiles) {
            try {
                await bucket.file(filePath).delete();
            } catch (error) {
                console.error(`Erro ao excluir arquivo ${filePath}:`, error);
                // Continue mesmo com erro
            }
        }

        res.json({ 
            success: true, 
            message: `${documentIds.length} documento(s) excluído(s) com sucesso` 
        });

    } catch (error) {
        console.error('Erro na exclusão em lote:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Excluir documento individual (apenas admin)
router.delete('/:id', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const { id } = req.params;
        const docRef = db.collection('documents').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        const documentData = docSnap.data();

        // Excluir do Firestore
        await docRef.delete();

        // Excluir arquivos do Storage
        try {
            if (documentData.filename) {
                await bucket.file(`documents/${documentData.filename}`).delete();
            }
            if (documentData.signedFilename) {
                await bucket.file(`signed/${documentData.signedFilename}`).delete();
            }
        } catch (error) {
            console.error('Erro ao excluir arquivos do Storage:', error);
            // Continue mesmo com erro no Storage
        }

        res.json({ 
            success: true, 
            message: 'Documento excluído com sucesso' 
        });

    } catch (error) {
        console.error('Erro ao excluir documento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;