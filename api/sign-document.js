// api/sign-document.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import axios from 'axios'; 
import path from 'path'; 

// Inicialize o Firebase Admin SDK APENAS UMA VEZ
if (!global.firebaseAdminInitialized) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    initializeApp({
        credential: cert(serviceAccount),
        storageBucket: 'assinarpdfdocs.firebasestorage.app'
    });
    global.firebaseAdminInitialized = true;
}

const db = getFirestore();
const bucket = getStorage().bucket();

export default async function handler(req, res) {
    console.log('API sign-document.js recebendo requisição.');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { documentId, signatureX, signatureY, signatureWidth, signatureHeight, signaturePage, userCPF, signatureImage } = req.body;

        console.log('Dados recebidos do frontend para assinatura:', {
            documentId,
            signatureX,
            signatureY,
            signatureWidth,
            signatureHeight,
            signaturePage,
            userCPF: userCPF ? userCPF.substring(0, 5) + '...' : 'N/A', 
            signatureImage: signatureImage ? signatureImage.substring(0, 50) + '...' : 'N/A' 
        });

        if (!documentId || !signatureX || !signatureY || !signatureWidth || !signatureHeight || !signaturePage || !userCPF || !signatureImage) {
            console.error('Missing required fields for signature.');
            return res.status(400).json({ error: 'Missing required fields for signature.' });
        }

        const docRef = db.collection('documents').doc(documentId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            console.error('Documento não encontrado no Firestore:', documentId);
            return res.status(404).json({ error: 'Documento não encontrado no Firestore.' });
        }

        const docData = docSnap.data();
        const originalPdfUrl = docData.url_original;

        if (!originalPdfUrl) {
            console.error('URL do PDF original não encontrada no documento do Firestore para ID:', documentId);
            return res.status(400).json({ error: 'URL do PDF original não encontrada no documento do Firestore.' });
        }
        console.log('URL original do PDF obtida:', originalPdfUrl);

        const response = await axios.get(originalPdfUrl, { responseType: 'arraybuffer' });
        const existingPdfBytes = response.data;
        console.log('PDF original baixado com sucesso.');

        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        console.log('PDF carregado com pdf-lib.');

        const signatureImageBase64 = signatureImage.split(',')[1];
        const signaturePng = await pdfDoc.embedPng(Buffer.from(signatureImageBase64, 'base64'));
        console.log('Assinatura PNG incorporada.');

        const pages = pdfDoc.getPages();
        if (signaturePage > pages.length || signaturePage < 1) {
            console.error('Página de assinatura inválida. Requisitada:', signaturePage, 'Total de páginas:', pages.length);
            return res.status(400).json({ error: 'Página de assinatura inválida.' });
        }
        const page = pages[signaturePage - 1]; // pdf-lib usa índice baseado em 0 para páginas

        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();
        console.log(`Backend - Dimensões da página no pdf-lib: Largura=${pageWidth.toFixed(2)}pt, Altura=${pageHeight.toFixed(2)}pt`);

        // NOVO CÁLCULO DE COORDENADAS:
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

        console.log('Backend - Coordenadas originais do frontend (em pixels do canvas, incluindo scroll do container):', { signatureX, signatureY, signatureWidth, signatureHeight });
        console.log('Backend - Escala de renderização do frontend:', frontendRenderScale);
        console.log('Backend - Coordenadas FINAIS para pdf-lib (em pontos, ajustadas para Y do fundo):', {
            x: finalPdfX.toFixed(2),
            y: finalPdfY.toFixed(2),
            width: finalPdfWidth.toFixed(2),
            height: (signatureHeight / frontendRenderScale).toFixed(2) // Altura também precisa ser escalada
        });

        // Aplica a assinatura na página usando as coordenadas e dimensões *ajustadas*
        page.drawImage(signaturePng, {
            x: finalPdfX,
            y: finalPdfY, 
            width: finalPdfWidth,
            height: signatureHeight / frontendRenderScale // Use a altura já escalada
        });
        console.log('Assinatura aplicada na página.');

        const signedPdfBytes = await pdfDoc.save();
        console.log('PDF modificado salvo.');

        const originalFileName = docData.nome_arquivo_original;
        const signedFileName = `signed_${Date.now()}_${userCPF.replace(/\D/g, '')}_${originalFileName}`;
        const file = bucket.file(`documents/signed/${signedFileName}`);

        await file.save(signedPdfBytes, {
            metadata: {
                contentType: 'application/pdf',
                metadata: {
                    signedByCPF: userCPF,
                    originalDocumentId: documentId,
                    originalFileName: originalFileName
                }
            }
        });
        console.log('PDF assinado carregado para o Storage.');

        await file.makePublic();
        const signedUrl = file.publicUrl();
        console.log('PDF assinado tornado público. URL:', signedUrl);

        await docRef.update({
            signed_url: signedUrl,
            signed_at: new Date(),
            signed_by_cpf: userCPF,
            status: 'signed'
        });
        console.log('Firestore atualizado com a URL do documento assinado.');

        res.status(200).json({ signedUrl: signedUrl });

    } catch (error) {
        console.error('Erro detalhado no sign-document API:', error);
        res.status(500).json({ 
            error: 'Internal Server Error', 
            details: error.message,
        });
    }
}