import admin from "firebase-admin";

// Inicializa o Firebase Admin SDK APENAS UMA VEZ
// (Este bloco é importante em cada arquivo API que usa o Admin SDK)
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET_URL
    });
  } catch (error) {
    console.error("Erro ao inicializar o Firebase Admin SDK:", error);
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Método não permitido. Use GET." });
  }

  try {
    const documentsRef = db.collection('documents');
    const snapshot = await documentsRef.orderBy('data_upload', 'desc').get(); // Ordena pelo mais recente

    const documents = [];
    snapshot.forEach(doc => {
      documents.push({
        id: doc.id, // Adiciona o ID do documento do Firestore
        ...doc.data()
      });
    });

    res.status(200).json(documents);

  } catch (error) {
    console.error('Erro ao buscar documentos do Firestore:', error);
    res.status(500).json({
      message: 'Erro interno ao buscar documentos.',
      error: error.message || error.toString()
    });
  }
}