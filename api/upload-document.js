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

/**
 * Função auxiliar para extrair o CPF de um nome de arquivo.
 * Espera o formato "nome_cpf.pdf" onde cpf são 11 dígitos numéricos.
 * Retorna o CPF ou null se não for encontrado ou for inválido.
 */
function extractCpfFromFileName(fileName) {
    // Expressão regular para encontrar 11 dígitos numéricos precedidos por '_' e seguidos por '.pdf'
    // A regex captura os 11 dígitos no grupo 1
    const match = fileName.match(/_(\d{11})\.pdf$/);
    if (match && match[1]) {
        return match[1]; // Retorna o CPF capturado
    }
    return null; // Retorna null se não encontrar um CPF válido no padrão
}


export default async function handler(req, res) {
    console.log('API upload-document.js recebendo requisição.');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const form = formidable({ 
        multiples: true, 
        keepExtensions: true, 
        maxFileSize: 10 * 1024 * 1024, // Limite de 10MB por arquivo
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

        const uploadedFiles = Array.isArray(files['documents[]']) ? files['documents[]'] : (files['documents[]'] ? [files['documents[]']] : []);
        
        if (!uploadedFiles.length) {
            console.error('Nenhum arquivo fornecido no upload.');
            return res.status(400).json({ error: 'At least one file is required.' });
        }

        const uploadedDocumentIds = []; 
        const errors = []; // Para coletar erros de arquivos individuais
        const bucket = storage.bucket(); 

        for (const file of uploadedFiles) {
            const originalFileName = file.originalFilename;
            const tempFilePath = file.filepath; 
            
            // --- NOVA LÓGICA: EXTRAIR CPF DO NOME DO ARQUIVO ---
            const cpf = extractCpfFromFileName(originalFileName);

            if (!cpf) {
                const errorMsg = `Erro: CPF não encontrado ou inválido no nome do arquivo "${originalFileName}". Formato esperado: nome_11digitosCPF.pdf`;
                console.error(errorMsg);
                errors.push({ fileName: originalFileName, error: errorMsg });
                // Não processa este arquivo e vai para o próximo
                if (file.filepath) { // Tenta limpar o arquivo temporário mesmo em caso de erro
                    fs.unlink(file.filepath, (err) => {
                        if (err) console.error(`Erro ao deletar arquivo temporário de erro ${file.filepath}:`, err);
                    });
                }
                continue; // Pula para o próximo arquivo no loop
            }
            // --- FIM DA NOVA LÓGICA ---

            const uniqueFileName = `${Date.now()}_${originalFileName}`; 
            const destinationPath = `documents/original/${uniqueFileName}`;

            console.log(`Iniciando upload do arquivo temporário: ${tempFilePath} para ${destinationPath}`);

            try {
                await bucket.upload(tempFilePath, {
                    destination: destinationPath, 
                    metadata: {
                        contentType: file.mimetype,
                        metadata: { 
                            uploadedByCpf: cpf,
                            originalFileName: originalFileName,
                        },
                    },
                });

                const [url] = await bucket.file(destinationPath).getSignedUrl({
                    action: 'read',
                    expires: '03-09-2491', 
                });

                console.log(`Upload do arquivo "${originalFileName}" concluído. URL: ${url.substring(0, 50)}...`);

                const docRef = await db.collection('documents').add({
                    nome_arquivo_original: originalFileName,
                    url_original: url, 
                    uploaded_by_cpf: cpf, // O CPF extraído do nome do arquivo
                    upload_date: new Date(),
                    status: 'pending_signature', 
                    signed_by_cpf: null, 
                    signed_url: null, 
                });
                uploadedDocumentIds.push(docRef.id); 
                console.log(`Documento "${originalFileName}" registrado no Firestore com ID: ${docRef.id}`);

            } catch (fileUploadError) {
                const errorMsg = `Falha ao processar arquivo "${originalFileName}": ${fileUploadError.message}`;
                console.error(errorMsg);
                errors.push({ fileName: originalFileName, error: errorMsg });
            } finally {
                // Limpa o arquivo temporário após o processamento (sucesso ou falha)
                if (file.filepath) {
                    fs.unlink(file.filepath, (err) => {
                        if (err) console.error(`Erro ao deletar arquivo temporário ${file.filepath}:`, err);
                    });
                }
            }
        }

        if (uploadedDocumentIds.length > 0 && errors.length === 0) {
            res.status(200).json({ 
                message: `Upload de ${uploadedDocumentIds.length} documento(s) concluído e registrado com sucesso!`, 
                documentIds: uploadedDocumentIds, 
            });
        } else if (uploadedDocumentIds.length > 0 && errors.length > 0) {
            res.status(200).json({ // Ainda retorna 200 se alguns foram bem-sucedidos
                message: `Upload de ${uploadedDocumentIds.length} documento(s) concluído com sucesso, mas ${errors.length} arquivo(s) tiveram erros.`,
                documentIds: uploadedDocumentIds,
                errors: errors,
            });
        } else {
            res.status(400).json({ // Se nenhum arquivo foi processado com sucesso
                message: 'Nenhum documento foi processado com sucesso.',
                errors: errors,
            });
        }

    } catch (parseError) {
        console.error('Erro geral no processo de upload:', parseError);
        res.status(500).json({ 
            error: 'Internal Server Error', 
            details: parseError.message,
        });
    }
}