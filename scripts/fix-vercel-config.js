const fs = require('fs');
const path = require('path');

console.log('Corrigindo configuração do Vercel...');

// Verificar se existe um arquivo vercel.json
const vercelConfigPath = path.join(process.cwd(), 'vercel.json');

// Criar um arquivo vercel.json corrigido
const correctedConfig = {
    "version": 2,
    "builds": [
        { "src": "server.js", "use": "@vercel/node" }
    ],
    "routes": [
        { "src": "/api/(.*)", "dest": "server.js" },
        { "src": "/admin", "dest": "/public/admin.html" },
        { "src": "/user", "dest": "/public/user.html" },
        { "src": "/sign", "dest": "/public/sign.html" },
        { "src": "/(.*)", "dest": "/public/$1" }
    ]
};

try {
    fs.writeFileSync(vercelConfigPath, JSON.stringify(correctedConfig, null, 2));
    console.log('✅ Arquivo vercel.json atualizado com sucesso:');
    console.log(JSON.stringify(correctedConfig, null, 2));
} catch (error) {
    console.error('❌ Erro ao atualizar o arquivo vercel.json:', error.message);
}

// Criar um arquivo .vercelignore
const vercelIgnorePath = path.join(process.cwd(), '.vercelignore');
const vercelIgnoreContent = `node_modules
.env
.git
.gitignore
README.md
`;

try {
    fs.writeFileSync(vercelIgnorePath, vercelIgnoreContent);
    console.log('\n✅ Arquivo .vercelignore criado com sucesso:');
    console.log(vercelIgnoreContent);
} catch (error) {
    console.error('❌ Erro ao criar o arquivo .vercelignore:', error.message);
}

// Criar um arquivo api/index.js para o Vercel
const apiDirPath = path.join(process.cwd(), 'api');
if (!fs.existsSync(apiDirPath)) {
    try {
        fs.mkdirSync(apiDirPath, { recursive: true });
        console.log('\n✅ Diretório api/ criado com sucesso.');
    } catch (error) {
        console.error('❌ Erro ao criar o diretório api/:', error.message);
    }
}

const apiIndexPath = path.join(apiDirPath, 'index.js');
const apiIndexContent = `// Este arquivo é necessário para o Vercel
const app = require('../server');

module.exports = app;
`;

try {
    fs.writeFileSync(apiIndexPath, apiIndexContent);
    console.log('\n✅ Arquivo api/index.js criado com sucesso:');
    console.log(apiIndexContent);
} catch (error) {
    console.error('❌ Erro ao criar o arquivo api/index.js:', error.message);
}

console.log('\nConfigurações corrigidas com sucesso!');
console.log('Recomendações:');
console.log('1. Reinicie o servidor com "npm start"');
console.log('2. Se estiver usando "vercel dev", tente usar "npm start" em vez disso');
console.log('3. Se o erro de porta persistir, modifique a variável PORT no arquivo .env para uma porta diferente, como 3001');