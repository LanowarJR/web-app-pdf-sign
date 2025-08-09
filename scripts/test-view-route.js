const axios = require('axios');

// Teste da rota de visualização com token
async function testViewRoute() {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3ajdNdG1ISm9LWk9OTUNkNEhmQSIsImVtYWlsIjoibWF1cm8ucGF1bGlub0BnbWFpbC5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTQ3NjI0NjUsImV4cCI6MTc1NDg0ODg2NX0.vzX0yaa9j-vzNLBGwgijRkiZEmWgq1q7yNb7yNbTMg0';
    const docId = '6L5VXlfWr59bJE4ID2iT';
    
    console.log('Testando rota de visualização local...');
    
    try {
        // Teste local
        const localUrl = `http://localhost:3000/api/documents/${docId}/view?token=${token}`;
        console.log('URL local:', localUrl);
        
        const localResponse = await axios.get(localUrl, {
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status < 400; // Aceitar redirects
            }
        });
        
        console.log('Resposta local:', {
            status: localResponse.status,
            headers: localResponse.headers.location ? { location: localResponse.headers.location } : 'No redirect',
            data: typeof localResponse.data === 'string' ? localResponse.data.substring(0, 200) + '...' : localResponse.data
        });
        
    } catch (error) {
        if (error.response) {
            console.log('Erro local:', {
                status: error.response.status,
                data: error.response.data
            });
        } else {
            console.log('Erro de rede local:', error.message);
        }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    try {
        // Teste produção
        const prodUrl = `https://web-app-pdf-sign.vercel.app/api/documents/${docId}/view?token=${token}`;
        console.log('URL produção:', prodUrl);
        
        const prodResponse = await axios.get(prodUrl, {
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status < 400; // Aceitar redirects
            }
        });
        
        console.log('Resposta produção:', {
            status: prodResponse.status,
            headers: prodResponse.headers.location ? { location: prodResponse.headers.location } : 'No redirect',
            data: typeof prodResponse.data === 'string' ? prodResponse.data.substring(0, 200) + '...' : prodResponse.data
        });
        
    } catch (error) {
        if (error.response) {
            console.log('Erro produção:', {
                status: error.response.status,
                data: error.response.data
            });
        } else {
            console.log('Erro de rede produção:', error.message);
        }
    }
}

testViewRoute().catch(console.error);