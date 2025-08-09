const axios = require('axios');

async function testAuthRoute() {
    try {
        console.log('Testando rota de autenticação diretamente...');
        
        const response = await axios({
            method: 'post',
            url: 'http://localhost:3000/api/auth/admin/login',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:3000'
            },
            data: {
                email: 'admin@exemplo.com',
                password: 'senha123'
            }
        });
        
        console.log('✅ Requisição bem-sucedida!');
        console.log('Status:', response.status);
        console.log('Dados:', response.data);
        
    } catch (error) {
        console.error('❌ Erro na requisição:');
        if (error.response) {
            // O servidor respondeu com um status de erro
            console.error(`Status: ${error.response.status}`);
            console.error('Headers:', error.response.headers);
            console.error('Dados:', error.response.data);
        } else if (error.request) {
            // A requisição foi feita mas não houve resposta
            console.error('Sem resposta do servidor');
            console.error(error.request);
        } else {
            // Erro na configuração da requisição
            console.error('Erro:', error.message);
        }
    }
}

testAuthRoute();