// api/sign-document.js

// Importações necessárias para Firebase Admin SDK e pdf-lib
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import axios from 'axios'; // Usando axios para baixar o PDF
import { Readable } from 'stream'; // Para lidar com streams de buffer
import { promisify } from 'util'; // Para promisificar stream.pipeline
import { pipeline } from 'stream';

const pipelineAsync = promisify(pipeline);

// Configuração para desativar o body-parser padrão do Next.js (ou Vercel) para lidar com JSON bruto
// Isso é importante para payloads maiores, como imagens base64.
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb', // Aumenta o limite para lidar com PDFs e imagens maiores
        },
    },
};

// Inicialize o Firebase Admin SDK APENAS UMA VEZ
if (!global.firebaseAdminInitialized) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({
            credential: cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET // Use a variável de ambiente para o bucket
        });
        global.firebaseAdminInitialized = true;
        console.log('Firebase Admin SDK inicializado com sucesso em sign-document.js!');
    } catch (e) {
        console.error('Falha ao inicializar Firebase Admin SDK em sign-document.js:', e);
        // Em um ambiente de produção, você pode querer lançar o erro ou lidar com ele de forma mais robusta.
    }
}

const db = getFirestore();
const bucket = getStorage().bucket();

export default async function handler(req, res) {
    console.log('API sign-document.js recebendo requisição.');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // --- NOVO LOG CRUCIAL: Verifique o payload completo recebido ---
    console.log('DEBUG Backend: Conteúdo completo do req.body recebido:', JSON.stringify(req.body, null, 2));
    // --- FIM DO NOVO LOG ---

    try {
        // Desestruturando os dados do corpo da requisição
        const {
            documentId,
            signatureX,
            signatureY,
            signatureWidth,
            signatureHeight,
            signaturePage, // Este é o número da página (1-based)
            userCPF,
            signatureImage // Dados da imagem Base64
        } = req.body;

        console.log('Dados recebidos do frontend para assinatura (valores principais):', {
            documentId,
            signatureX,
            signatureY,
            signatureWidth,
            signatureHeight,
            signaturePage,
            userCPF: userCPF ? userCPF.substring(0, 5) + '...' : 'N/A', // Log parcial do CPF
            signatureImage: signatureImage ? signatureImage.substring(0, 50) + '...' : 'N/A' // Log parcial da imagem
        });

        // Validação básica dos campos obrigatórios
        if (!documentId || signatureX === undefined || signatureY === undefined ||
            signatureWidth === undefined || signatureHeight === undefined ||
            signaturePage === undefined || !userCPF || !signatureImage) {
            console.error('Campos obrigatórios ausentes ou indefinidos para a assinatura.');
            return res.status(400).json({ error: 'Missing required fields for signature.' });
        }

        // 1. Obter URL do documento original do Firestore
        const docRef = db.collection('documents').doc(documentId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            console.error('Documento não encontrado no Firestore para ID:', documentId);
            return res.status(404).json({ error: 'Documento não encontrado no Firestore.' });
        }

        const docData = docSnap.data();
        const originalPdfUrl = docData.url_original;
        const originalFileName = docData.nome_arquivo_original;

        if (!originalPdfUrl) {
            console.error('URL do PDF original não encontrada no documento do Firestore para ID:', documentId);
            return res.status(400).json({ error: 'URL do PDF original não encontrada no documento do Firestore.' });
        }
        console.log('URL original do PDF obtida:', originalPdfUrl.substring(0, 50) + '...');

        // 2. Baixar o PDF original usando axios
        const response = await axios.get(originalPdfUrl, { responseType: 'arraybuffer' });
        const existingPdfBytes = response.data;
        console.log('PDF original baixado com sucesso.');

        // 3. Carregar o PDF com pdf-lib
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        console.log('PDF carregado com pdf-lib.');

        // 4. Incorporar a imagem da assinatura
        const signatureImageBase64 = signatureImage.split(',')[1]; // Remove o prefixo "data:image/png;base64,"
        const signaturePng = await pdfDoc.embedPng(Buffer.from(signatureImageBase64, 'base64'));
        console.log('Assinatura PNG incorporada ao PDF.');

        // 5. Obter a página correta do PDF
        const pages = pdfDoc.getPages();
        // pdf-lib usa índice baseado em 0, então subtraímos 1 do número da página (que é 1-based do frontend)
        const pageIndex = signaturePage - 1; 

        if (pageIndex < 0 || pageIndex >= pages.length) {
            console.error(`Índice de página inválido. Requisitado (0-based): ${pageIndex}. Total de páginas: ${pages.length}.`);
            return res.status(400).json({ error: 'Página de assinatura inválida ou fora do intervalo do PDF.' });
        }
        const page = pages[pageIndex];
        console.log(`Página ${signaturePage} (índice ${pageIndex}) selecionada para assinatura.`);

        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();
        console.log(`Backend - Dimensões da página no pdf-lib: Largura=${pageWidth.toFixed(2)}pt, Altura=${pageHeight.toFixed(2)}pt`);

        // 6. Calcular as coordenadas e dimensões finais para o pdf-lib
        // A escala de renderização que você usa no frontend (sign.html) é 1.5.
        // Isso significa que 1 pixel no seu canvas do frontend corresponde a 1/1.5 pontos no PDF original.
        const frontendRenderScale = 1.5; 

        // Converte as coordenadas X e Y e as dimensões (Largura e Altura)
        // dos pixels do canvas ampliado (frontend) para os pontos do PDF original (backend).
        const finalPdfX = signatureX / frontendRenderScale;
        const finalPdfWidth = signatureWidth / frontendRenderScale;
        
        // Ajusta a coordenada Y:
        // O frontend (pdf.js) mede Y a partir do topo da página.
        // O pdf-lib mede Y a partir da base (fundo) da página.
        // Então, para converter, pegamos a altura total da página do PDF,
        // subtraímos a coordenada Y do topo (já convertida para pontos)
        // e também subtraímos a altura da assinatura (também convertida para pontos).
        // Isso nos dá a coordenada Y correta a partir da base.
        const finalPdfY = pageHeight - (signatureY / frontendRenderScale + signatureHeight / frontendRenderScale);
        const finalPdfHeight = signatureHeight / frontendRenderScale; // Altura também precisa ser escalada

        console.log('Backend - Coordenadas originais do frontend (em pixels do canvas, incluindo scroll do container):', { signatureX, signatureY, signatureWidth, signatureHeight });
        console.log('Backend - Escala de renderização do frontend:', frontendRenderScale);
        console.log('Backend - Coordenadas FINAIS para pdf-lib (em pontos, ajustadas para Y do fundo):', {
            x: finalPdfX.toFixed(2),
            y: finalPdfY.toFixed(2),
            width: finalPdfWidth.toFixed(2),
            height: finalPdfHeight.toFixed(2)
        });

        // 7. Aplica a assinatura na página usando as coordenadas e dimensões *ajustadas*
        page.drawImage(signaturePng, {
            x: finalPdfX,
            y: finalPdfY, 
            width: finalPdfWidth,
            height: finalPdfHeight
        });
        console.log('Assinatura de imagem aplicada na página.');

        // 8. Salvar o PDF modificado
        const signedPdfBytes = await pdfDoc.save();
        console.log('PDF modificado salvo.');

        // 9. Preparar o nome do arquivo para upload
        const fileNameWithoutExtension = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
        const timestamp = Date.now();
        // Garante que o CPF seja limpo (apenas números) para o nome do arquivo
        const cleanUserCPF = userCPF.replace(/\D/g, ''); 
        const signedFileName = `${fileNameWithoutExtension}_ASSINADO_${cleanUserCPF}_${timestamp}.pdf`;
        const fileUpload = bucket.file(`documents/signed/${signedFileName}`);

        // 10. Fazer upload do PDF assinado para o Firebase Storage
        // Cria um stream a partir do buffer para o upload
        const bufferStream = new Readable();
        bufferStream.push(Buffer.from(signedPdfBytes));
        bufferStream.push(null); // Indica o fim do stream

        await pipelineAsync(bufferStream, fileUpload.createWriteStream({
            metadata: {
                contentType: 'application/pdf',
                metadata: {
                    originalDocumentId: documentId,
                    signedByCpf: userCPF, // Salva o CPF original
                    originalFileName: originalFileName
                },
            },
        }));

        const [signedUrl] = await fileUpload.getSignedUrl({
            action: 'read',
            expires: '03-09-2491', // Data de expiração bem distante
        });

        console.log(`PDF assinado uploaded. URL: ${signedUrl.substring(0, 50)}...`);

        // 11. Atualizar o documento no Firestore
        await docRef.update({
            status: 'signed',
            signed_by_cpf: userCPF,
            signed_url: signedUrl,
            signed_date: new Date(),
        });
        console.log(`Documento ${documentId} atualizado no Firestore com status 'signed'.`);

        res.status(200).json({ signedUrl: signedUrl });

    } catch (error) {
        console.error('Erro detalhado no sign-document API:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            details: error.message,
        });
    }
}
