// api/index.js

// Esta é uma Serverless Function. Ela será executada no servidor
// quando alguém acessar o caminho /api.

// `request` contém informações sobre a requisição HTTP recebida (ex: dados enviados, parâmetros da URL).
// `response` é o objeto que usamos para enviar a resposta de volta ao cliente (navegador).
export default function handler(request, response) {
  // Definimos o status da resposta como 200 (OK)
  // E enviamos um objeto JSON com uma mensagem de sucesso.
  response.status(200).json({
    message: "Olá do Vercel Serverless Function!",
    dataHora: new Date().toLocaleString() // Adiciona data e hora para mostrar que está funcionando
  });
}