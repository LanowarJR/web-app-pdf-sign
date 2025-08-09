require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');

// Configurar Firebase Admin usando variáveis de ambiente
if (!global.firebaseAdminInitialized) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({
            credential: cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
        global.firebaseAdminInitialized = true;
        console.log('✅ Firebase Admin SDK inicializado com sucesso!');
    } catch (e) {
        console.error('❌ Erro ao inicializar Firebase Admin SDK:', e);
        process.exit(1);
    }
}

const bucket = getStorage().bucket();

// URLs de teste fornecidas pelo usuário
const testUrls = [
    'https://storage.googleapis.com/assinarpdfdocs.firebasestorage.app/documents/signed/VALERIA%20VANESSA%20NERES%20PIRES_44529676803_ASSINADO_1754756319853.pdf?GoogleAccessId=firebase-adminsdk-fbsvc%40assinarpdfdocs.iam.gserviceaccount.com&Expires=16447017600&Signature=oNxpuvcZ%2BUmDKI3SOjURDWeWmqNolQ2h5OfVtBA6oPsGnA7JjJUMBQaycSSuy0Wv5Mm%2BJtpo6oHI7fwijKwaQAdGr2hTItKTrL6pe0Y07neE7CjUjytyjcHMqYvjwZ6t%2BzNBQnEq%2FYM5kY2opxS4OjIxMDkI7nB2lkSe8u7LbTLuhkKTwnds%2FtBbG0iDfBXv1C0F6SgxzHfhllcqImh9XQOYk2zDf%2FWE8FHRLxvOTZne4dGSFHYD%2BiMktf%2BJcu6%2FR9%2FsCeKLpEOqUV6YS04qxJtkPT1vqZElzemFkt4FWS%2BBKKEbA4WF6rVlLy7VAV9TH0X%2F1UvL9Kwoi3CgCqrDhg%3D%3D',
    'https://storage.googleapis.com/assinarpdfdocs.firebasestorage.app/documents/1754756254372_VALERIA VANESSA NERES PIRES_44529676803.pdf'
];

async function testUrlExtraction() {
    console.log('=== Teste de Extração de Caminho das URLs ===\n');
    
    for (let i = 0; i < testUrls.length; i++) {
        const fileUrl = testUrls[i];
        console.log(`Teste ${i + 1}:`);
        console.log(`URL original: ${fileUrl}`);
        
        try {
            // Aplicar a mesma lógica de extração do documents.js
            // Extrair tudo após o nome do bucket até o primeiro '?' ou fim da string
            const bucketName = 'assinarpdfdocs.firebasestorage.app';
            const bucketIndex = fileUrl.indexOf(bucketName);
            
            if (bucketIndex === -1) {
                console.log('❌ Erro: Bucket não encontrado na URL');
                console.log(`   Bucket esperado: ${bucketName}`);
                continue;
            }
            
            // Extrair o caminho após o bucket
            const afterBucket = fileUrl.substring(bucketIndex + bucketName.length + 1); // +1 para pular a '/'
            const pathEndIndex = afterBucket.indexOf('?');
            const rawPath = pathEndIndex !== -1 ? afterBucket.substring(0, pathEndIndex) : afterBucket;
            const filePath = decodeURIComponent(rawPath);
            
            console.log(`   Bucket encontrado em: ${bucketIndex}`);
            console.log(`   Caminho bruto: ${rawPath}`);
            console.log(`Caminho extraído: ${filePath}`);
            
            // Verificar se o arquivo existe no bucket
            const file = bucket.file(filePath);
            const [exists] = await file.exists();
            
            if (exists) {
                console.log('✅ Arquivo encontrado no Firebase Storage!');
                
                // Tentar obter metadados
                const [metadata] = await file.getMetadata();
                console.log(`   - Tamanho: ${metadata.size} bytes`);
                console.log(`   - Tipo: ${metadata.contentType}`);
                console.log(`   - Criado em: ${metadata.timeCreated}`);
            } else {
                console.log('❌ Arquivo NÃO encontrado no Firebase Storage');
                
                // Listar arquivos similares para debug
                console.log('\n🔍 Procurando arquivos similares...');
                const [files] = await bucket.getFiles({
                    prefix: filePath.split('/')[0] // Usar o primeiro diretório como prefixo
                });
                
                console.log(`Encontrados ${files.length} arquivos com prefixo similar:`);
                files.slice(0, 5).forEach(f => {
                    console.log(`   - ${f.name}`);
                });
                if (files.length > 5) {
                    console.log(`   ... e mais ${files.length - 5} arquivos`);
                }
            }
            
        } catch (error) {
            console.log(`❌ Erro ao processar URL: ${error.message}`);
        }
        
        console.log('\n' + '='.repeat(80) + '\n');
    }
}

testUrlExtraction()
    .then(() => {
        console.log('Teste concluído!');
        process.exit(0);
    })
    .catch(error => {
        console.error('Erro no teste:', error);
        process.exit(1);
    });