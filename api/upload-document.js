// api/upload-document.js

// Importações necessárias para Firebase Admin SDK
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage'; 

// Importa o formidable para lidar com uploads de arquivos
import formidable from 'formidable';
// Importa o fs para lidar com o sistema de arquivos (leitura do arquivo temporário)
import fs from 'fs';
// Importa o path para lidar com caminhos de arquivos
import path from 'path';

// Configuração para desativar o body-parser padrão do Next.js (ou Vercel) para uploads de arquivos
export const config = {
    api: {
        bodyParser: false, // Desabilita o body-parser padrão para que o formidable possa processar o upload
    },
};

// Garante que o Firebase Admin SDK seja inicializado apenas uma vez para evitar erros.
if (!global.firebaseAdminInitialized) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        
        initializeApp({
            credential: cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET 
        });
        
        global.firebaseAdminInitialized = true;
        console.log('Firebase Admin SDK inicializado com sucesso em upload-document.js!');
    } catch (error) {
        console.error('ERRO FATAL: Falha ao inicializar Firebase Admin SDK em upload-document.js. Verifique FIREBASE_SERVICE_ACCOUNT_KEY e FIREBASE_STORAGE_BUCKET:', error);
    }
}

const db = getFirestore();
const storage = getStorage(); // Inicializa o Storage

export default async function handler(req, res) {
    console.log('API upload-document.js recebendo requisição.');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const form = formidable({ 
        multiples: false, // Espera apenas um arquivo por vez
        keepExtensions: true, // Mantém a extensão original do arquivo
        maxFileSize: 10 * 1024 * 1024, // Limite de 10MB para o arquivo
    });

    try {
        const { fields, files } = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) {
                    console.error('Erro ao parsear formulário:', err);
                    return reject(err);
                }
                resolve({ fields, files });
            });
        });

        const file = files.document; // 'document' é o nome do campo de arquivo no frontend
        const cpf = Array.isArray(fields.cpf) ? fields.cpf[0] : fields.cpf; // Lida com o formidable retornando arrays para campos simples

        if (!file || !cpf) {
            console.error('Arquivo ou CPF não fornecido no upload.');
            return res.status(400).json({ error: 'File and CPF are required.' });
        }

        const originalFileName = file.originalFilename;
        const tempFilePath = file.filepath; // Caminho temporário do arquivo no sistema de arquivos do Vercel

        // Gera um nome único para o arquivo no Storage para evitar colisões
        const uniqueFileName = `${Date.now()}-${originalFileName}`;
        const bucket = storage.bucket(); // Pega o bucket padrão configurado na inicialização
        const fileUpload = bucket.file(uniqueFileName);

        console.log(`Iniciando upload do arquivo temporário: ${tempFilePath} para ${uniqueFileName}`);

        // Faz o upload do arquivo para o Firebase Storage
        await bucket.upload(tempFilePath, {
            destination: uniqueFileName,
            metadata: {
                contentType: file.mimetype,
                // Adicione metadados personalizados se desejar
                metadata: {
                    uploadedByCpf: cpf,
                    originalFileName: originalFileName,
                },
            },
        });

        // Obtém a URL pública do arquivo (pode ser necessário configurar regras de segurança no Firebase Storage)
        const [url] = await fileUpload.getSignedUrl({
            action: 'read',
            expires: '03-09-2491', // Data de expiração bem distante (quase nunca expira)
        });

        console.log(`Upload concluído. URL: ${url.substring(0, 50)}...`);

        // Salva os metadados do documento no Firestore
        const docRef = await db.collection('documents').add({
            nome_arquivo_original: originalFileName,
            url_original: url,
            uploaded_by_cpf: cpf,
            upload_date: new Date(),
            status: 'pending_signature', // Ou outro status inicial
            signed_by_cpf: null, // Inicialmente nulo
            signed_url: null, // Inicialmente nulo
        });

        console.log(`Documento registrado no Firestore com ID: ${docRef.id}`);

        res.status(200).json({ 
            message: 'Document uploaded and registered successfully!', 
            documentId: docRef.id,
            documentUrl: url,
        });

    } catch (error) {
        console.error('Erro no processo de upload do documento:', error);
        res.status(500).json({ 
            error: 'Internal Server Error', 
            details: error.message,
        });
    } finally {
        // Limpa o arquivo temporário após o upload
        if (formidable.file && formidable.file.filepath) {
            fs.unlink(formidable.file.filepath, (err) => {
                if (err) console.error('Erro ao deletar arquivo temporário:', err);
            });
        } else if (files && files.document && files.document.filepath) {
             fs.unlink(files.document.filepath, (err) => {
                if (err) console.error('Erro ao deletar arquivo temporário:', err);
            });
        }
    }
}