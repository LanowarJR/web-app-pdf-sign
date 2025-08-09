# 🚀 Guia Vercel - Sistema de Assinatura Digital

## ⚡ Configuração para Vercel

### 1. Instalar Vercel CLI
```bash
npm i -g vercel
```

### 2. Login no Vercel
```bash
vercel login
```

### 3. Configurar Variáveis de Ambiente no Vercel

Após fazer deploy, configure as variáveis de ambiente no dashboard do Vercel:

1. Acesse o projeto no [dashboard do Vercel](https://vercel.com/dashboard)
2. Vá em **Settings** > **Environment Variables**
3. Adicione as seguintes variáveis:

```
FIREBASE_SERVICE_ACCOUNT_KEY = {"type":"service_account",...}
FIREBASE_STORAGE_BUCKET = seu-projeto.appspot.com
JWT_SECRET = sua_chave_secreta_muito_segura
```

### 4. Desenvolvimento Local com Vercel Dev
```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev
# ou
vercel dev
```

### 5. Deploy para Produção
```bash
# Deploy automático (push para GitHub)
git push origin main

# Ou deploy manual
vercel --prod
```

## 📁 Estrutura para Vercel

```
web-app-pdf-sign/
├── api/
│   ├── index.js          # Função serverless principal
│   ├── auth.js           # Rotas de autenticação
│   ├── documents.js      # Rotas de documentos
│   └── signature.js      # Rotas de assinatura
├── public/
│   ├── login.html        # Página de login
│   ├── admin.html        # Dashboard admin
│   ├── user.html         # Dashboard usuário
│   └── sign.html         # Página de assinatura
├── server.js             # Servidor local
├── vercel.json           # Configuração Vercel
├── package.json          # Dependências
└── .env                  # Variáveis locais
```

## 🔧 Comandos Vercel

```bash
# Desenvolvimento local
vercel dev

# Deploy para preview
vercel

# Deploy para produção
vercel --prod

# Listar projetos
vercel ls

# Remover projeto
vercel remove
```

## 🌐 URLs do Projeto

- **Desenvolvimento:** `http://localhost:3000`
- **Preview:** `https://seu-projeto.vercel.app`
- **Produção:** `https://seu-projeto.vercel.app`

## ⚠️ Limitações do Vercel

### Funções Serverless:
- **Timeout:** 30 segundos (configurado no vercel.json)
- **Payload:** 4.5MB para uploads
- **Memória:** 1024MB

### Para Uploads Grandes:
Se precisar de uploads maiores que 4.5MB, considere:
1. Usar Firebase Storage diretamente do frontend
2. Implementar upload em chunks
3. Usar um serviço de upload externo

## 🚀 Otimizações para Vercel

### 1. Cache de Assets
O Vercel automaticamente faz cache de arquivos estáticos em `/public`.

### 2. Edge Functions (Opcional)
Para melhor performance, você pode converter algumas rotas para Edge Functions:

```javascript
// api/auth-edge.js
export default function handler(req, res) {
  // Lógica de autenticação
}
```

### 3. Variáveis de Ambiente
- **Development:** `.env` local
- **Production:** Dashboard do Vercel

## 🔍 Debugging

### Logs Locais
```bash
vercel dev --debug
```

### Logs de Produção
1. Dashboard do Vercel > Functions
2. Clique na função para ver logs

### Variáveis de Ambiente
```bash
# Ver variáveis locais
vercel env ls

# Adicionar variável local
vercel env add FIREBASE_SERVICE_ACCOUNT_KEY
```

## 📱 Deploy Automático

### GitHub Integration
1. Conecte seu repositório no Vercel
2. Configure branch de produção (ex: `main`)
3. Cada push fará deploy automático

### Branch Deployments
- `main` → Produção
- `develop` → Preview
- `feature/*` → Preview

## 🎯 Fluxo Completo com Vercel

### 1. Desenvolvimento
```bash
git clone <repo>
npm install
vercel dev
```

### 2. Teste Local
- Acesse `http://localhost:3000`
- Teste todas as funcionalidades
- Configure Firebase

### 3. Deploy
```bash
vercel --prod
```

### 4. Configurar Produção
- Adicionar variáveis de ambiente no Vercel
- Configurar domínio customizado (opcional)
- Testar em produção

## 🚨 Problemas Comuns

### Erro de Timeout
- Aumente `maxDuration` no vercel.json
- Otimize queries do Firestore
- Use paginação para listas grandes

### Erro de Upload
- Verifique limite de 4.5MB
- Implemente upload direto para Firebase Storage
- Use compressão de imagens

### Erro de Variáveis de Ambiente
- Verifique se estão configuradas no Vercel
- Use `vercel env ls` para listar
- Reinicie o deploy após adicionar variáveis

## 🎉 Pronto!

Seu sistema está otimizado para Vercel e pronto para produção!

**Próximos passos:**
1. Configure Firebase
2. Adicione variáveis de ambiente
3. Faça deploy
4. Teste em produção
5. Configure domínio customizado

---

**💡 Dica:** Use `vercel dev` para desenvolvimento local com todas as funcionalidades do Vercel! 