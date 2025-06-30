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
    } catch (e) {
        console.error('Falha ao inicializar Firebase Admin SDK em sign-document.js:', e);
    }
}

const db = getFirestore();
const bucket = getStorage().bucket();

export default async function handler(req, res) {
    console.log('API sign-document.js recebendo requisição.');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // signatureData agora é esperado como um ARRAY de objetos de assinatura
    // Renomeado signatureData para signaturesDataArray para clareza no backend
    const { documentId, signatureData: signaturesDataArray, signedByCpf } = req.body; 

    if (!documentId || !signaturesDataArray || !signedByCpf || !Array.isArray(signaturesDataArray)) {
        console.error('Dados incompletos ou inválidos para assinar documento:', { documentId, signaturesDataArray, signedByCpf });
        return res.status(400).json({ error: 'Missing or invalid documentId, signatureData (must be an array), or signedByCpf.' });
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
        const pages = pdfDoc.getPages(); // Obtém todas as páginas do PDF

        // 4. Iterar sobre cada assinatura no array e adicioná-la à página correta
        for (const signatureData of signaturesDataArray) {
            const pageIndex = signatureData.pageIndex;
            
            // Validação do pageIndex
            // O frontend envia 0 para a primeira página, então pageIndex pode ser 0
            if (pageIndex === undefined || pageIndex < 0 || pageIndex >= pages.length) {
                console.error(`Índice de página inválido (${pageIndex}) ou fora do intervalo para o PDF. Total de páginas: ${pages.length}. Pulando esta assinatura.`);
                // Continuar para a próxima assinatura se o pageIndex for inválido para não quebrar toda a operação
                continue; 
            }

            const page = pages[pageIndex]; // Acessa a página correta usando o índice (0-based)
            const { width: pageWidth, height: pageHeight } = page.getSize();

            // Lembre-se: pdf-lib usa coordenadas com origem no canto INFERIOR esquerdo
            // O frontend usa origem no canto SUPERIOR esquerdo.
            // A escala de renderização do frontend é 1.5.
            const frontendRenderScale = 1.5;

            const signatureX = signatureData.x;
            const signatureY = signatureData.y;
            const signatureWidth = signatureData.width;
            const signatureHeight = signatureData.height;
            const signatureContent = signatureData.content; // 'content' pode ser texto ou base64 da imagem

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

            console.log('Backend - Coordenadas originais do frontend (pixels na tela):', {
                x: signatureX,
                y: signatureY,
                width: signatureWidth,
                height: signatureHeight,
                pageIndex: pageIndex
            });
            console.log('Backend - Coordenadas ajustadas para PDF-lib (pontos):', {
                x: finalPdfX.toFixed(2),
                y: finalPdfY.toFixed(2),
                width: finalPdfWidth.toFixed(2),
                height: finalPdfHeight.toFixed(2),
            });


            if (signatureData.type === 'drawing') {
                // Adiciona imagem (desenho)
                // O `signatureContent` já é o base64
                // Converta de data:image/png;base64,... para bytes
                const base64Data = signatureContent.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
                const imageBytes = Buffer.from(base64Data, 'base64');
                const image = await pdfDoc.embedPng(imageBytes); // Supondo PNG transparente

                page.drawImage(image, {
                    x: finalPdfX,
                    y: finalPdfY,
                    width: finalPdfWidth,
                    height: finalPdfHeight,
                });
                console.log(`Assinatura de desenho adicionada à página ${pageIndex + 1}.`); // +1 para mostrar a página 1-based no log

            } else if (signatureData.type === 'text') {
                // Adiciona texto
                // Certifique-se de que fontFamily está sendo enviado do frontend
                const fontName = signatureData.fontFamily || StandardFonts.Helvetica;
                let font;
                try {
                    font = await pdfDoc.embedFont(StandardFonts[fontName]);
                } catch (e) {
                    console.warn(`Fonte "${fontName}" não encontrada no StandardFonts, usando Helvetica.`);
                    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                }
                
                // Ajusta o tamanho da fonte com base na altura da caixa.
                // O 0.7 é um fator empírico para que o texto caiba bem na altura.
                const fontSize = finalPdfHeight * 0.7; 

                page.drawText(signatureContent, { // Usa signatureContent para o texto
                    x: finalPdfX,
                    y: finalPdfY,
                    font,
                    size: fontSize,
                    color: rgb(0, 0, 0), // Cor preta padrão
                });
                console.log(`Assinatura de texto "${signatureContent.substring(0, Math.min(signatureContent.length, 20))}..." adicionada à página ${pageIndex + 1}.`);
            }
        }
        
        // 5. Salvar o PDF modificado
        const modifiedPdfBytes = await pdfDoc.save();

        // 6. Preparar o nome do arquivo para upload
        const fileNameWithoutExtension = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
        const timestamp = Date.now();
        const signedFileName = `${fileNameWithoutExtension}_ASSINADO_${signedByCpf}_${timestamp}.pdf`;
        const fileUpload = bucket.file(`documents/signed/${signedFileName}`);

        // 7. Fazer upload do PDF assinado para o Firebase Storage
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
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}