// api/upload-document.js
import admin from "firebase-admin";
import formidable from "formidable";
import fs from "fs/promises";
import { constants as FS_CONSTANTS } from "fs";
import os from "os"; // Importa o módulo 'os' para obter o diretório temporário

// Inicializa o Firebase Admin SDK APENAS UMA VEZ
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),       
      // Use process.env.FIREBASE_STORAGE_BUCKET_URL se você o configurou
      // Caso contrário, use o nome exato do seu bucket aqui:
      storageBucket: "assinarpdfdocs.firebasestorage.app" // <<--- Use este nome EXATO!
    });
  } catch (error) {
    console.error("Erro ao inicializar o Firebase Admin SDK:", error);
  }
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

export default async function handler(req, res) {
  // Garante que a requisição é um POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método não permitido. Use POST." });
  }

  // --- ATENÇÃO: Autenticação/Autorização para upload (A SER IMPLEMENTADO) ---
  // Lembre-se: por enquanto, qualquer pessoa pode fazer upload.
  // Implemente a verificação de administrador aqui.
  // Ex: verificar um token secreto no header Authorization:
  // if (req.headers.authorization !== `Bearer ${process.env.ADMIN_UPLOAD_TOKEN}`) {
  //   return res.status(401).json({ message: 'Não autorizado.' });
  // }

  try {
    // Configura o formidable
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024,
      uploadDir: os.tmpdir(), // Usa o diretório temporário padrão do sistema operacional
    });

    // Parseia a requisição
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        // Formidable retorna fields e files como arrays de strings se houver múltiplos valores/arquivos.
        // Para nossos propósitos, vamos pegar o primeiro elemento.
        const parsedFields = {};
        for (const key in fields) {
          parsedFields[key] = Array.isArray(fields[key])
            ? fields[key][0]
            : fields[key];
        }

        const parsedFiles = {};
        for (const key in files) {
          parsedFiles[key] = Array.isArray(files[key])
            ? files[key][0]
            : files[key];
        }
        resolve([parsedFields, parsedFiles]);
      });
    });

    const cpf_associado = fields.cpf_associado;
    const pdfFile = files.pdfFile; // 'pdfFile' é o nome do input no formulário HTML

    if (!pdfFile || !pdfFile.filepath) {
      // Verifica se o arquivo foi realmente enviado
      return res.status(400).json({ message: "Nenhum arquivo PDF enviado." });
    }

    if (!pdfFile.originalFilename.toLowerCase().endsWith(".pdf")) {
      // Opcional: Remover o arquivo temporário se não for um PDF
      try {
        await fs.unlink(pdfFile.filepath);
      } catch (e) {
        console.warn("Falha ao apagar arquivo temporário inválido:", e.message);
      }
      return res
        .status(400)
        .json({ message: "Por favor, selecione um arquivo PDF válido." });
    }

    if (
      !cpf_associado ||
      typeof cpf_associado !== "string" ||
      cpf_associado.trim() === ""
    ) {
      // Opcional: Remover o arquivo temporário se não houver CPF
      try {
        await fs.unlink(pdfFile.filepath);
      } catch (e) {
        console.warn("Falha ao apagar arquivo temporário sem CPF:", e.message);
      }
      return res.status(400).json({ message: "CPF Associado é obrigatório." });
    }

    const now = Date.now();
    const filePath = `documents/original/${now}_${pdfFile.originalFilename}`; // Caminho no Storage

    // Lê o conteúdo do arquivo temporário assincronamente
    const fileContent = await fs.readFile(pdfFile.filepath);

    // Faz o upload para o Firebase Storage
    const fileRef = bucket.file(filePath); // Crie uma referência ao arquivo
    await fileRef.save(fileContent, {
      contentType: pdfFile.mimetype, // Define o tipo de conteúdo do arquivo
    });

    // --- MUDANÇA CRUCIAL AQUI ---
    // Torna o arquivo público (se suas regras já permitem leitura, isso reforça).
    // Isso é necessário para que a URL gerada por .publicUrl() seja acessível.
    await fileRef.makePublic(); 
    
    // Obtém a URL de download PÚBLICA DIRETA do arquivo
    const publicDownloadUrl = fileRef.publicUrl(); 
    // --- FIM DA MUDANÇA ---

    // Salva metadados do documento no Cloud Firestore
    await db.collection("documents").add({
      cpf_associado: cpf_associado,
      nome_arquivo_original: pdfFile.originalFilename,
      caminho_storage_original: filePath,
      url_original: publicDownloadUrl, // SALVE A URL PÚBLICA DIRETA AQUI
      status: "pendente",
      data_upload: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Opcional: Remover o arquivo temporário após o upload (boa prática)
    try {
      // Verifica se o arquivo existe antes de tentar apagar
      await fs.access(pdfFile.filepath, FS_CONSTANTS.F_OK); // Verifica se o arquivo existe
      await fs.unlink(pdfFile.filepath); // Apaga o arquivo
      console.log(`Arquivo temporário ${pdfFile.filepath} removido.`);
    } catch (unlinkError) {
      console.warn(
        `Não foi possível remover o arquivo temporário ${pdfFile.filepath}:`,
        unlinkError.message
      );
    }

    res.status(200).json({
      message: "Documento PDF enviado e metadados salvos com sucesso!",
      fileName: pdfFile.originalFilename,
      cpfAssociado: cpf_associado,
      storagePath: filePath,
      downloadUrl: publicDownloadUrl, // Retorne a URL pública também para o frontend de upload
    });
  } catch (error) {
    console.error("Erro no processamento da requisição ou Firebase:", error);
    // Verifica se o erro é de inicialização do Firebase Admin SDK
    // (admin.apps[0] pode não existir ou não ter credential se a inicialização falhou)
    if (!admin.apps.length || !admin.apps[0].options.credential) {
      res
        .status(500)
        .json({
          message:
            "Erro na inicialização do servidor. Verifique as credenciais do Firebase.",
        });
    } else {
      res
        .status(500)
        .json({
          message: "Erro interno ao processar o documento.",
          error: error.message,
        });
    }
  }
}

// Configuração para Vercel Serverless Functions:
// Desabilitamos o bodyParser padrão para que o formidable possa lidar com a requisição bruta.
export const config = {
  api: {
    bodyParser: false,
  },
};