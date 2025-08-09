const express = require('express');
const { PDFDocument, rgb } = require('pdf-lib');
const axios = require('axios');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

const router = express.Router();
const db = getFirestore();
const bucket = getStorage().bucket();

// Obter documento para assinatura
router.get('/document/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { role, cpf } = req.user;
        
        console.log('DEBUG SIGNATURE: Requisição para documento ID:', id);
        console.log('DEBUG SIGNATURE: Usuário:', { role, cpf });

        const docRef = db.collection('documents').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            console.log('DEBUG SIGNATURE: Documento não encontrado:', id);
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        const documentData = docSnap.data();
        console.log('DEBUG SIGNATURE: Dados do documento:', documentData);
        console.log('DEBUG SIGNATURE: originalUrl presente:', !!documentData.originalUrl);

        // Verificar permissão
        if (role === 'user' && documentData.cpfAssociado !== cpf) {
            console.log('DEBUG SIGNATURE: Acesso negado - CPF não confere');
            console.log('DEBUG SIGNATURE: CPF do documento:', documentData.cpfAssociado);
            console.log('DEBUG SIGNATURE: CPF do usuário:', cpf);
            return res.status(403).json({ error: 'Acesso negado' });
        }

        // Verificar se o documento está pendente ou assinado (para visualização)
        if (documentData.status !== 'pending' && documentData.status !== 'signed') {
            console.log('DEBUG SIGNATURE: Documento não está disponível:', documentData.status);
            return res.status(400).json({ error: 'Documento não está disponível' });
        }

        const responseData = {
            success: true,
            document: {
                id: docSnap.id,
                ...documentData
            }
        };
        
        console.log('DEBUG SIGNATURE: Retornando documento:', responseData);
        res.json(responseData);

    } catch (error) {
        console.error('Erro ao obter documento para assinatura:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Assinar documento
router.post('/sign', async (req, res) => {
    try {
        const {
            documentId,
            signatureImage,
            signaturePositions // Array com posições das assinaturas aplicadas
        } = req.body;

        const { role, cpf } = req.user;

        if (!documentId || !signatureImage || !signaturePositions) {
            return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
        }

        // Verificar documento
        const docRef = db.collection('documents').doc(documentId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        const documentData = docSnap.data();

        // Verificar permissão
        if (role === 'user' && documentData.cpfAssociado !== cpf) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        // Verificar se o documento está pendente
        if (documentData.status !== 'pending') {
            return res.status(400).json({ error: 'Documento já foi assinado' });
        }

        // Baixar PDF original
        const response = await axios.get(documentData.originalUrl, { 
            responseType: 'arraybuffer' 
        });
        const existingPdfBytes = response.data;

        // Carregar PDF
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();

        // Incorporar imagem da assinatura
        const signatureImageBase64 = signatureImage.split(',')[1];
        const signaturePng = await pdfDoc.embedPng(Buffer.from(signatureImageBase64, 'base64'));

        // Aplicar assinaturas nas posições especificadas
        signaturePositions.forEach(position => {
            const { page, x, y, width, height, canvasWidth, canvasHeight, scale: frontendScale } = position;
            
            if (page >= 0 && page < pages.length) {
                const pdfPage = pages[page];
                const pageWidth = pdfPage.getWidth();
                const pageHeight = pdfPage.getHeight();
                
                // Calcular escala baseada nas dimensões reais
                const scaleX = pageWidth / canvasWidth;
                const scaleY = pageHeight / canvasHeight;
                
                // Converter coordenadas do frontend para PDF usando escala real
                const pdfX = x * scaleX;
                const pdfY = pageHeight - (y * scaleY + height * scaleY);
                const pdfWidth = width * scaleX;
                const pdfHeight = height * scaleY;

                console.log(`Aplicando assinatura - Página: ${page}, Canvas: ${canvasWidth}x${canvasHeight}, PDF: ${pageWidth}x${pageHeight}, Escala: ${scaleX}x${scaleY}`);
                console.log(`Posição original: (${x}, ${y}, ${width}, ${height}) -> PDF: (${pdfX}, ${pdfY}, ${pdfWidth}, ${pdfHeight})`);

                pdfPage.drawImage(signaturePng, {
                    x: pdfX,
                    y: pdfY,
                    width: pdfWidth,
                    height: pdfHeight
                });
            }
        });

        // Salvar PDF assinado
        const signedPdfBytes = await pdfDoc.save();

        // Upload do PDF assinado
        const timestamp = Date.now();
        const signedFileName = `${documentData.filename.replace('.pdf', '')}_ASSINADO_${timestamp}.pdf`;
        const fileUpload = bucket.file(`documents/signed/${signedFileName}`);

        await fileUpload.save(Buffer.from(signedPdfBytes), {
            metadata: {
                contentType: 'application/pdf',
                metadata: {
                    originalDocumentId: documentId,
                    signedByCpf: cpf,
                    originalFileName: documentData.filename
                }
            }
        });

        // Gerar URL de download
        const [signedUrl] = await fileUpload.getSignedUrl({
            action: 'read',
            expires: '03-09-2491'
        });

        // Atualizar documento no Firestore
        await docRef.update({
            status: 'signed',
            signedByCpf: cpf,
            signedUrl: signedUrl,
            signedAt: new Date(),
            signaturePositions: signaturePositions
        });

        res.json({
            success: true,
            message: 'Documento assinado com sucesso',
            signedUrl: signedUrl
        });

    } catch (error) {
        console.error('Erro ao assinar documento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;