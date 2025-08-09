const fs = require('fs');
const path = require('path');

console.log('Verificando configuração do Vercel...');

// Verificar se existe um arquivo vercel.json
const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
let vercelConfig = null;

if (fs.existsSync(vercelConfigPath)) {
    try {
        const configContent = fs.readFileSync(vercelConfigPath, 'utf8');
        vercelConfig = JSON.parse(configContent);
        console.log('✅ Arquivo vercel.json encontrado:');
        console.log(JSON.stringify(vercelConfig, null, 2));
    } catch (error) {
        console.error('❌ Erro ao ler o arquivo vercel.json:', error.message);
    }
} else {
    console.log('❌ Arquivo vercel.json não encontrado.');
    console.log('Criando um arquivo vercel.json recomendado...');
    
    // Criar um arquivo vercel.json recomendado
    const recommendedConfig = {
        "version": 2,
        "builds": [
            { "src": "server.js", "use": "@vercel/node" }
        ],
        "routes": [
            { "src": "/api/(.*)", "dest": "server.js" },
            { "src": "/(.*)", "dest": "public/$1" }
        ]
    };
    
    try {
        fs.writeFileSync(vercelConfigPath, JSON.stringify(recommendedConfig, null, 2));
        console.log('✅ Arquivo vercel.json criado com sucesso:');
        console.log(JSON.stringify(recommendedConfig, null, 2));
    } catch (error) {
        console.error('❌ Erro ao criar o arquivo vercel.json:', error.message);
    }
}

// Verificar o package.json para os scripts relacionados ao Vercel
const packageJsonPath = path.join(process.cwd(), 'package.json');

if (fs.existsSync(packageJsonPath)) {
    try {
        const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageContent);
        
        console.log('\nScripts no package.json:');
        console.log(JSON.stringify(packageJson.scripts, null, 2));
        
        // Verificar se há scripts para o Vercel
        if (packageJson.scripts && packageJson.scripts.dev && packageJson.scripts.dev.includes('vercel dev')) {
            console.log('\n✅ Script para Vercel Dev encontrado.');
            console.log('Recomendação: Use "npm start" em vez de "vercel dev" para evitar problemas de porta.');
        }
    } catch (error) {
        console.error('❌ Erro ao ler o arquivo package.json:', error.message);
    }
} else {
    console.error('❌ Arquivo package.json não encontrado.');
}

// Verificar se há um arquivo .vercelignore
const vercelIgnorePath = path.join(process.cwd(), '.vercelignore');

if (fs.existsSync(vercelIgnorePath)) {
    try {
        const ignoreContent = fs.readFileSync(vercelIgnorePath, 'utf8');
        console.log('\n✅ Arquivo .vercelignore encontrado:');
        console.log(ignoreContent);
    } catch (error) {
        console.error('❌ Erro ao ler o arquivo .vercelignore:', error.message);
    }
} else {
    console.log('\n❌ Arquivo .vercelignore não encontrado.');
    console.log('Recomendação: Crie um arquivo .vercelignore para excluir arquivos desnecessários do deploy.');
}

// Verificar se há processos rodando na porta 3000
console.log('\nVerificando processos na porta 3000...');
console.log('Execute o comando "netstat -ano | findstr :3000" para verificar se há processos rodando na porta 3000.');

console.log('\nRecomendações para resolver o erro "listen EADDRINUSE: address already in use :::3000":');
console.log('1. Encerre todos os processos que estão usando a porta 3000');
console.log('2. Use uma porta diferente modificando a variável PORT no arquivo .env');
console.log('3. Reinicie o computador se necessário');