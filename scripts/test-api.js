const axios = require('axios');

async function testAdminLogin() {
    try {
        console.log('🔍 Testando login de administrador...');
        
        const response = await axios.post('http://localhost:3000/api/auth/admin/login', {
            email: 'admin@exemplo.com',
            password: 'senha123'
        });
        
        console.log('✅ Login bem-sucedido!');
        console.log('📋 Resposta:');
        console.log(JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.error('❌ Erro no login:');
        if (error.response) {
            // O servidor respondeu com um status de erro
            console.error(`Status: ${error.response.status}`);
            console.error('Dados:');
            console.error(JSON.stringify(error.response.data, null, 2));
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

testAdminLogin();