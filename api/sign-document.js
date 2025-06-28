// api/sign-document.js

// Importações necessárias para Firebase Admin SDK e pdf-lib
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage'; 
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fetch from 'node-fetch'; // Para buscar o PDF original da URL
import { Readable } from 'stream'; // Para lidar com streams de buffer
import { promisify } from 'util'; // Para promisificar stream.pipeline
import { pipeline } from 'stream';

const pipelineAsync = promisify(pipeline);

// Configuração para desativar o body-parser padrão do Next.js (ou Vercel) para lidar com JSON bruto
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb', // Aumenta o limite para lidar com PDFs maiores
        },
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
        console.log('Firebase Admin SDK inicializado com sucesso em sign-document.js!');
    } catch (error) {
        console.error('ERRO FATAL: Falha ao inicializar Firebase Admin SDK em sign-document.js. Verifique FIREBASE_SERVICE_ACCOUNT_KEY e FIREBASE_STORAGE_BUCKET:', error);
    }
}

const db = getFirestore();
const storage = getStorage(); // Inicializa o Storage

export default async function handler(req, res) {
    console.log('API sign-document.js recebendo requisição.');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { documentId, signatureData, signedByCpf } = req.body;

    if (!documentId || !signatureData || !signedByCpf) {
        console.error('Dados incompletos para assinar documento:', { documentId, signatureData, signedByCpf });
        return res.status(400).json({ error: 'Missing documentId, signatureData, or signedByCpf.' });
    }

    try {
        // 1. Obter URL do documento original do Firestore
        const docRef = db.collection('documents').doc(documentId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            console.warn(`Documento com ID ${documentId} não encontrado no Firestore.`);
            return res.status(404).json({ error: 'Document not found.' });
        }

        const docData = docSnap.data();
        const originalPdfUrl = docData.url_original;
        const originalFileName = docData.nome_arquivo_original;

        if (!originalPdfUrl) {
            console.error(`URL original do PDF não encontrada para o documento ID: ${documentId}`);
            return res.status(400).json({ error: 'Original PDF URL not found for this document.' });
        }

        console.log(`Buscando PDF original de: ${originalPdfUrl.substring(0, 50)}...`);

        // 2. Baixar o PDF original
        const response = await fetch(originalPdfUrl);
        if (!response.ok) {
            throw new Error(`Falha ao baixar PDF original: ${response.statusText}`);
        }
        const pdfBytes = await response.arrayBuffer();
        console.log('PDF original baixado com sucesso.');

        // 3. Carregar o PDF com pdf-lib
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[signatureData.pageIndex];

        if (!firstPage) {
            console.error(`Página ${signatureData.pageIndex} não encontrada no PDF.`);
            return res.status(400).json({ error: 'Page not found in PDF.' });
        }

        const { width: pageWidth, height: pageHeight } = firstPage.getSize();

        // 4. Calcular as coordenadas finais para o pdf-lib
        // Lembre-se: pdf-lib usa coordenadas com origem no canto INFERIOR esquerdo
        // O frontend usa origem no canto SUPERIOR esquerdo.
        // A escala de renderização do frontend é 1.5.
        const frontendRenderScale = 1.5; 

        const signatureX = signatureData.x;
        const signatureY = signatureData.y;
        const signatureWidth = signatureData.width;
        const signatureHeight = signatureData.height;
        const signatureText = signatureData.text; // O texto da assinatura

        // Ajusta as coordenadas do frontend (pixels na tela) para pontos do PDF
        // e inverte o eixo Y para a convenção do pdf-lib.
        const finalPdfX = signatureX / frontendRenderScale;
        const finalPdfWidth = signatureWidth / frontendRenderScale;
        // Calcula a posição Y no PDF (origem inferior esquerda)
        // signatureY é a distância do topo da página no frontend.
        // signatureHeight é a altura da caixa de assinatura no frontend.
        // pageHeight é a altura da página do PDF em pontos.
        const finalPdfY = pageHeight - (signatureY / frontendRenderScale + signatureHeight / frontendRenderScale);
        const finalPdfHeight = signatureHeight / frontendRenderScale;


        console.log('Backend - Coordenadas originais do frontend (pixels na tela):', { x: signatureX, y: signatureY, width: signatureWidth, height: signatureHeight, pageIndex: signatureData.pageIndex });
        console.log('Backend - Coordenadas FINAIS para pdf-lib (pontos do PDF):', { x: finalPdfX, y: finalPdfY, width: finalPdfWidth, height: finalPdfHeight, pageIndex: signatureData.pageIndex });


        // 5. Adicionar a assinatura ao PDF
        // Usar uma fonte padrão que suporte caracteres variados
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica); // Ou Helvetica-Bold, Times-Roman, etc.

        firstPage.drawText(signatureText, {
            x: finalPdfX + 2, // Pequeno ajuste para não ficar colado na borda da caixa
            y: finalPdfY + 2, // Pequeno ajuste
            font,
            size: finalPdfHeight * 0.7, // Ajusta o tamanho da fonte para caber na caixa
            color: rgb(0, 0, 0), // Cor preta
        });

        // Opcional: Desenhar um retângulo para visualizar a área da assinatura (para depuração)
        // firstPage.drawRectangle({
        //     x: finalPdfX,
        //     y: finalPdfY,
        //     width: finalPdfWidth,
        //     height: finalPdfHeight,
        //     borderColor: rgb(1, 0, 0), // Vermelho
        //     borderWidth: 1,
        // });

        // 6. Salvar o PDF modificado
        const modifiedPdfBytes = await pdfDoc.save();
        console.log('PDF modificado com a assinatura.');

        // 7. Fazer upload do PDF assinado para o Firebase Storage
        const bucket = storage.bucket();
        const signedFileName = `signed_${Date.now()}_${originalFileName}`;
        const fileUpload = bucket.file(signedFileName);

        // Cria um stream a partir do buffer para o upload
        const bufferStream = new Readable();
        bufferStream.push(Buffer.from(modifiedPdfBytes));
        bufferStream.push(null); // Indica o fim do stream

        await pipelineAsync(bufferStream, fileUpload.createWriteStream({
            metadata: {
                contentType: 'application/pdf',
                metadata: {
                    originalDocumentId: documentId,
                    signedByCpf: signedByCpf,
                },
            },
        }));

        const [signedUrl] = await fileUpload.getSignedUrl({
            action: 'read',
            expires: '03-09-2491', // Data de expiração bem distante
        });

        console.log(`PDF assinado uploaded. URL: ${signedUrl.substring(0, 50)}...`);

        // 8. Atualizar o documento no Firestore
        await docRef.update({
            status: 'signed',
            signed_by_cpf: signedByCpf,
            signed_url: signedUrl,
            signed_date: new Date(),
        });

        console.log(`Documento ${documentId} atualizado no Firestore com status 'signed'.`);

        res.status(200).json({ 
            message: 'Document signed successfully!', 
            signedUrl: signedUrl,
        });

    } catch (error) {
        console.error('Erro ao assinar documento:', error);
        res.status(500).json({ 
            error: 'Internal Server Error', 
            details: error.message,
        });
    }
}