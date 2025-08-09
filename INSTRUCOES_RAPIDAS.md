# 🚀 Guia Rápido - Sistema de Assinatura Digital

## ⚡ Configuração Rápida (5 minutos)

### 1. Configure o Firebase
1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Crie um novo projeto ou use um existente
3. Habilite o **Firestore Database**
4. Habilite o **Storage**
5. Configure as **Regras de CORS** no Storage
6. Vá em **Configurações do Projeto** > **Contas de serviço**
7. Clique em **Gerar nova chave privada**
8. Salve o arquivo JSON

### 2. Configure as Variáveis de Ambiente
1. Copie `env.example` para `.env`
2. Cole o conteúdo do JSON do Firebase em `FIREBASE_SERVICE_ACCOUNT_KEY`
3. Configure o `FIREBASE_STORAGE_BUCKET` (ex: `seu-projeto.appspot.com`)
4. Defina uma `JWT_SECRET` segura

### 3. Instale as Dependências
```bash
npm install
```

### 4. Crie o Primeiro Administrador
```bash
npm run create-admin admin@exemplo.com minhasenha123
```

### 5. Execute o Sistema
```bash
npm run dev
```

### 6. Acesse o Sistema
- **URL Local:** `http://localhost:3000`
- **Login Admin:** `/admin` → `admin@exemplo.com` / `minhasenha123`
- **Dashboard:** `/admin-dashboard` (após login)
- **Upload:** `/admin-pdfjs` (upload e configuração)
- **Usuário:** `/user` (login por CPF)
- **Assinatura:** `/sign-pdfjs` (interface de assinatura)

## 📋 Fluxo de Teste

### Como Administrador:
1. **Faça login** como administrador
2. **Faça upload** de um PDF com nome: `joao_silva_12345678901.pdf`
3. **Adicione campos** de assinatura arrastáveis
4. **Posicione** os campos onde deseja as assinaturas
5. **Envie** o documento

### Como Usuário:
1. **Faça login** digitando o CPF: `12345678901`
2. **Veja** o documento pendente
3. **Clique** em "Assinar Documento"
4. **Desenhe** sua assinatura no canvas
5. **Posicione** a assinatura nos campos
6. **Aplique** a assinatura

## 🎯 Características Principais

✅ **Elementos Arrastáveis** - Como Assinafy/iLovePDF  
✅ **Canvas de Assinatura** - Desenho livre com posicionamento preciso  
✅ **Validação de CPF** - Login seguro por CPF  
✅ **Upload Seguro** - Validação rigorosa de arquivos PDF  
✅ **Interface Moderna** - Design responsivo e profissional  
✅ **Sistema de Roles** - Admin/Usuário com permissões específicas  
✅ **Notificações Toast** - Alertas modernos e responsivos  
✅ **Indicadores de Carregamento** - Feedback visual durante uploads  
✅ **Redirecionamento Automático** - Fluxo otimizado pós-assinatura  
✅ **Upload em Lote** - Processamento múltiplo de documentos  
✅ **Pronto para Produção** - Configurado para deploy no Vercel  

## 🔧 Comandos Úteis

```bash
# Desenvolvimento local
npm run dev

# Produção local
npm start

# Criar administrador
npm run create-admin email@exemplo.com senha

# Instalar dependências
npm install

# Deploy no Vercel (via CLI)
npm install -g vercel
vercel login
vercel --prod

# Desenvolvimento com Vercel
vercel dev
```

## 📁 Estrutura de Arquivos

```
📁 api/                    # Rotas da API (auth, documents, upload, etc.)
📁 public/                 # Páginas HTML do frontend
  ├── login.html           # Página de login
  ├── admin-dashboard.html # Dashboard administrativo
  ├── admin-pdfjs.html     # Interface de upload e configuração
  ├── user.html           # Interface do usuário
  └── sign-pdfjs.html     # Interface de assinatura
📁 scripts/               # Scripts utilitários e testes
📄 server.js             # Servidor principal Express
📄 package.json          # Dependências e scripts
📄 vercel.json           # Configuração do Vercel
📄 .env                  # Variáveis de ambiente (criar)
📄 .vercelignore         # Arquivos ignorados no deploy
```

## 🚀 Deploy no Vercel

### Método 1: Via GitHub (Recomendado)
1. **Faça push** do projeto para o GitHub
2. **Conecte** sua conta GitHub no [vercel.com](https://vercel.com)
3. **Importe** o repositório
4. **Configure** as variáveis de ambiente:
   - `FIREBASE_SERVICE_ACCOUNT_KEY`
   - `FIREBASE_STORAGE_BUCKET`
   - `JWT_SECRET`
5. **Deploy automático** a cada push!

### Método 2: Via CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

### URLs de Produção
Após o deploy, suas URLs serão:
- **Admin:** `https://seu-projeto.vercel.app/admin`
- **Dashboard:** `https://seu-projeto.vercel.app/admin-dashboard`
- **Upload:** `https://seu-projeto.vercel.app/admin-pdfjs`
- **Usuário:** `https://seu-projeto.vercel.app/user`
- **Assinatura:** `https://seu-projeto.vercel.app/sign-pdfjs`

📖 **Guia Completo:** Veja `DEPLOY_VERCEL_GUIDE.md` para instruções detalhadas

## 🚨 Problemas Comuns

### Erro de Conexão Firebase:
- Verifique as credenciais no `.env`
- Confirme se Firestore e Storage estão ativos

### Erro de Upload:
- Nome do arquivo deve ser: `nome_funcionario_cpf.pdf`
- Arquivo deve ser PDF válido

### Erro de Login:
- Execute `npm run create-admin` para criar usuário
- Verifique se o CPF está correto

## 🎉 Sistema Completo e Pronto!

Seu sistema de assinatura digital está **100% funcional** com todas as melhorias modernas!

### ✨ **Melhorias Implementadas:**
- 🎨 **Notificações Toast** - Alertas modernos substituindo pop-ups
- ⏳ **Indicadores de Carregamento** - Feedback visual durante uploads
- 🔄 **Redirecionamento Automático** - Fluxo otimizado pós-assinatura
- 📱 **Design Responsivo** - Perfeito em mobile e desktop
- 🚀 **Pronto para Vercel** - Deploy em produção configurado

### 🎯 **Próximos Passos:**
1. ✅ **Teste Local** - Execute `npm run dev` e teste todas as funcionalidades
2. 🌐 **Deploy Produção** - Siga o guia `DEPLOY_VERCEL_GUIDE.md`
3. 👥 **Adicione Usuários** - Crie mais administradores conforme necessário
4. 🎨 **Personalize** - Ajuste cores e logos se desejar
5. 📊 **Monitore** - Acompanhe o uso em produção

### 🔥 **Funcionalidades Avançadas:**
- Upload em lote de múltiplos PDFs
- Campos de assinatura arrastáveis e redimensionáveis
- Canvas de assinatura com desenho livre
- Validação automática de CPF
- Sistema de autenticação JWT seguro
- Interface moderna com Bootstrap 5

---

**💡 Dicas Importantes:**
- Use `npm run dev` para desenvolvimento local
- Configure as variáveis de ambiente antes do deploy
- Teste sempre o fluxo completo antes da produção
- Mantenha backups das chaves do Firebase