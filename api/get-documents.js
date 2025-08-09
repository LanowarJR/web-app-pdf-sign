// api/get-documents.js
const { initializeApp, cert, getApps } = require('firebase-admin/app'); // Adicione getApps aqui
const { getFirestore } = require('firebase-admin/firestore');

// Certifique-se de que a sua chave de serviço está configurada corretamente
const serviceAccount = require('./serviceAccountKey.json'); // Caminho correto agora

// Inicializa o Firebase Admin SDK APENAS UMA VEZ
// Verifica se já existe um app Firebase inicializado
if (!getApps().length) { // <-- MUDANÇA AQUI: Use getApps().length
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

module.exports = async (req, res) => {
  const userCPF = req.query.cpf;
  console.log('API recebendo requisição. userCPF:', userCPF); // NOVO LOG 6

  if (!userCPF) {
    console.warn('API: CPF do usuário ausente na requisição.'); // NOVO LOG 7
    return res.status(400).json({ error: 'CPF do usuário é obrigatório.' });
  }

  try {
    const documentsRef = db.collection('documents');
    let query = documentsRef;

    // Filtra os documentos pelo CPF_associado
    query = query.where('cpf_associado', '==', userCPF);

    const snapshot = await query.get();
    const documents = [];
    snapshot.forEach(doc => {
      documents.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.status(200).json(documents);
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    res.status(500).json({ error: 'Erro ao buscar documentos', details: error.message });
  }
};