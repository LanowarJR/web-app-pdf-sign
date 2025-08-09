# 🚀 Sistema de Assinatura Digital de PDFs

Um sistema **completo e moderno** para assinatura digital de documentos PDF com elementos arrastáveis para posicionamento de assinaturas, similar aos serviços Assinafy, iLovePDF e Autentique.

✨ **Versão 2.0** - Agora com interface moderna, notificações toast, indicadores de carregamento e pronto para produção no Vercel!

## 🚀 Funcionalidades

### Para Administradores:
- **Login seguro** com email e senha + autenticação JWT
- **Dashboard moderno** com navegação intuitiva
- **Upload de documentos PDF** com validação rigorosa (nome_funcionario_cpf.pdf)
- **Upload em lote** - processamento múltiplo de documentos
- **Posicionamento de campos de assinatura** usando elementos arrastáveis
- **Indicadores de carregamento** durante uploads
- **Notificações toast modernas** para feedback visual
- **Visualização de todos os documentos** com status em tempo real
- **Download de documentos assinados**

### Para Usuários:
- **Login por CPF** - busca automática e segura de documentos
- **Interface responsiva** otimizada para mobile e desktop
- **Visualização de documentos pendentes** com design moderno
- **Canvas de assinatura avançado** com suporte touch
- **Posicionamento preciso** da assinatura nos campos pré-definidos
- **Redirecionamento automático** após assinatura bem-sucedida
- **Notificações toast** para confirmação de ações
- **Assinatura digital** com aplicação segura no PDF

## 🛠️ Tecnologias Utilizadas

- **Backend:** Node.js + Express.js
- **Deploy:** Vercel (Funções Serverless)
- **Autenticação:** JWT (JSON Web Tokens)
- **Banco de Dados:** Firebase Firestore
- **Storage:** Firebase Storage com CORS configurado
- **Manipulação de PDF:** pdf-lib
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **UI Framework:** Bootstrap 5 (responsivo)
- **Canvas:** Para desenho de assinaturas com suporte touch
- **Notificações:** Sistema de Toast moderno
- **Indicadores:** Spinners de carregamento
- **Validação:** CPF e formato de arquivos
- **Segurança:** Sanitização de dados e validação rigorosa

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- Conta no Firebase com Firestore e Storage habilitados
- Chave de serviço do Firebase

## 🔧 Instalação

1. **Clone o repositório:**
```bash
git clone <url-do-repositorio>
cd web-app-pdf-sign
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure as variáveis de ambiente:**
```bash
cp env.example .env
```

4. **Edite o arquivo `.env` com suas configurações:**
```env
# Configurações do Firebase
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"seu-projeto",...}
FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com

# Configurações JWT
JWT_SECRET=sua_chave_secreta_muito_segura

# Configurações do Servidor
PORT=3000
```

5. **Configure o Firebase:**
   - Acesse o [Console do Firebase](https://console.firebase.google.com/)
   - Crie um novo projeto ou use um existente
   - Habilite o Firestore Database
   - Habilite o Storage
   - Vá em Configurações do Projeto > Contas de serviço
   - Gere uma nova chave privada
   - Copie o conteúdo JSON para `FIREBASE_SERVICE_ACCOUNT_KEY`

6. **Crie um usuário administrador:**
```bash
# Use o script automatizado (recomendado)
npm run create-admin admin@exemplo.com minhasenha123

# Ou crie manualmente no Firestore:
# {
#   "email": "admin@exemplo.com",
#   "password": "$2a$10$...", // Senha hash com bcrypt
#   "role": "admin",
#   "createdAt": "2024-01-01T00:00:00.000Z"
# }
```

## 🚀 Executando o Projeto

### Opção 1: Desenvolvimento Local
```bash
# Modo desenvolvimento
npm run dev

# Modo produção local
npm start
```

### Opção 2: Vercel (Recomendado)
```bash
# Instalar Vercel CLI
npm i -g vercel

# Login no Vercel
vercel login

# Desenvolvimento com Vercel
vercel dev

# Deploy para produção
vercel --prod
```

3. **Acesse o sistema:**
   - **Local:** `http://localhost:3000`
   - **Vercel:** `https://seu-projeto.vercel.app`
   - Login Admin: Use as credenciais criadas no Firestore
   - Login Usuário: Digite o CPF do funcionário

> **💡 Recomendação:** Use o Vercel para melhor performance e deploy automático!

## 📖 Como Usar

### 🔐 Fluxo do Administrador:

1. **Login como Admin:**
   - Acesse `http://localhost:3000/admin`
   - Digite email e senha
   - Receba notificação toast de sucesso
   - Redirecionamento automático para dashboard

2. **Dashboard Administrativo:**
   - Acesse `http://localhost:3000/admin-dashboard`
   - Navegue entre "Documentos" e "Upload"
   - Visualize estatísticas em tempo real

3. **Upload de Documento:**
   - Acesse `http://localhost:3000/admin-pdfjs`
   - **Upload Individual:** Arraste ou selecione um PDF
   - **Upload em Lote:** Selecione múltiplos arquivos
   - Nome obrigatório: `nome_funcionario_cpf.pdf`
   - Veja indicador de carregamento durante upload
   - Adicione campos de assinatura arrastáveis
   - Posicione e redimensione os campos
   - Receba confirmação via toast

4. **Gerenciar Documentos:**
   - Visualize todos os documentos com status
   - Filtre por pendente/assinado
   - Baixe documentos assinados
   - Receba notificações de novas assinaturas

### 👤 Fluxo do Usuário:

1. **Login por CPF:**
   - Acesse `http://localhost:3000/user`
   - Digite o CPF (apenas números)
   - Validação automática de CPF
   - Busca automática de documentos

2. **Visualizar Documentos:**
   - Interface responsiva e moderna
   - Veja documentos pendentes de assinatura
   - Clique em "Assinar Documento"
   - Redirecionamento para interface de assinatura

3. **Assinar Documento:**
   - Acesse `http://localhost:3000/sign-pdfjs`
   - **Canvas Avançado:** Desenhe com mouse ou touch
   - **Prévia em Tempo Real:** Veja a assinatura antes de aplicar
   - **Posicionamento Preciso:** Arraste para os campos corretos
   - **Confirmação:** Receba toast de sucesso
   - **Redirecionamento Automático:** Volta para dashboard em 2s

## 📁 Estrutura do Projeto

```
web-app-pdf-sign/
├── 📁 api/                        # Rotas da API (Serverless)
│   ├── index.js                   # Função principal para Vercel
│   ├── auth.js                    # Autenticação e login
│   ├── documents.js               # Gerenciamento de documentos
│   ├── get-documents.js           # Busca de documentos
│   ├── sign-document.js           # Processamento de assinaturas
│   ├── signature.js               # Manipulação de assinaturas
│   ├── upload-document.js         # Upload de arquivos
│   └── serviceAccountKey.json     # Chaves Firebase (local)
├── 📁 public/                     # Frontend (HTML/CSS/JS)
│   ├── login.html                 # Página de login unificada
│   ├── admin-dashboard.html       # Dashboard administrativo
│   ├── admin-pdfjs.html          # Interface de upload e configuração
│   ├── user.html                 # Dashboard do usuário
│   └── sign-pdfjs.html           # Interface de assinatura avançada
├── 📁 scripts/                    # Scripts utilitários
│   ├── create-admin.js           # Criar administrador
│   ├── test-api.js               # Testes da API
│   ├── test-firebase-connection.js # Teste Firebase
│   └── check-vercel-config.js    # Verificar configuração
├── 📄 server.js                   # Servidor Express (desenvolvimento)
├── 📄 vercel.json                 # Configuração do Vercel
├── 📄 .vercelignore              # Arquivos ignorados no deploy
├── 📄 package.json               # Dependências e scripts
├── 📄 .env                       # Variáveis de ambiente (criar)
├── 📄 env.example                # Exemplo de configuração
├── 📄 DEPLOY_VERCEL_GUIDE.md     # Guia completo de deploy
├── 📄 INSTRUCOES_RAPIDAS.md      # Guia rápido de uso
├── 📄 VERCEL_GUIDE.md            # Guia específico do Vercel
└── 📄 README.md                  # Este arquivo
```

## 🚀 Deploy no Vercel

Este projeto está **100% otimizado** para deploy no Vercel com configuração completa!

### 📖 Guias Disponíveis:
- 📋 **[DEPLOY_VERCEL_GUIDE.md](./DEPLOY_VERCEL_GUIDE.md)** - Guia completo passo a passo
- ⚡ **[INSTRUCOES_RAPIDAS.md](./INSTRUCOES_RAPIDAS.md)** - Configuração rápida
- 🔧 **[VERCEL_GUIDE.md](./VERCEL_GUIDE.md)** - Detalhes técnicos

### 🎯 Deploy Rápido:
```bash
# Método 1: Via GitHub (Recomendado)
# 1. Push para GitHub
# 2. Conecte no vercel.com
# 3. Configure variáveis de ambiente
# 4. Deploy automático!

# Método 2: Via CLI
npm install -g vercel
vercel login
vercel --prod
```

### ✨ Vantagens do Vercel:
- ✅ **Deploy automático** via GitHub
- ✅ **Performance otimizada** com CDN global
- ✅ **SSL gratuito** e domínio customizado
- ✅ **Funções serverless** escaláveis
- ✅ **Preview deployments** para cada branch
- ✅ **Configuração zero** - projeto já preparado
- ✅ **Monitoramento** e analytics integrados

## 🔒 Segurança

- **Autenticação JWT** para todas as rotas protegidas
- **Validação de permissões** por role (admin/user)
- **Validação de CPF** para acesso de usuários
- **Sanitização de dados** de entrada
- **Upload seguro** com validação de tipo de arquivo

## 🎯 Características Especiais

### 🎨 Interface Moderna
- **Notificações Toast** - Alertas elegantes substituindo pop-ups
- **Indicadores de Carregamento** - Spinners durante uploads
- **Design Responsivo** - Bootstrap 5 otimizado para mobile
- **Redirecionamento Automático** - Fluxo otimizado pós-ações

### 🖱️ Elementos Arrastáveis
- Sistema similar ao Assinafy/iLovePDF
- Posicionamento visual de campos de assinatura
- **Redimensionamento** - Ajuste de tamanho dos campos
- Evita cálculos complexos de coordenadas
- Interface intuitiva para administradores

### 🎨 Canvas de Assinatura Avançado
- **Desenho livre** com mouse e touch
- **Suporte completo** a dispositivos móveis
- **Prévia em tempo real** da assinatura
- **Limpeza e redesenho** com um clique
- **Posicionamento preciso** nos campos

### 📦 Upload Inteligente
- **Upload em lote** - múltiplos arquivos simultaneamente
- **Validação rigorosa** de formato e nome
- **Indicadores visuais** de progresso
- **Notificações** de sucesso/erro

### 🔍 Validação Avançada
- **Formato obrigatório:** `nome_funcionario_cpf.pdf`
- **Extração automática** de dados do nome
- **Validação de CPF** matemática
- **Sanitização** de dados de entrada

## 🐛 Solução de Problemas

### Erro de Conexão com Firebase:
- Verifique as credenciais no `.env`
- Confirme se o projeto Firebase está ativo
- Verifique se Firestore e Storage estão habilitados

### Erro de Upload:
- Verifique o formato do nome do arquivo
- Confirme se é um PDF válido
- Verifique as permissões do Firebase Storage

### Erro de Assinatura:
- Verifique se a assinatura foi desenhada
- Confirme se os campos foram posicionados
- Verifique a conexão com a API

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para dúvidas ou problemas:
- Abra uma issue no GitHub
- Entre em contato através do email: seu-email@exemplo.com

---

## 🎉 Versão 2.0 - Completa e Moderna!

### ✨ **Novidades desta versão:**
- 🎨 Interface completamente renovada
- 📱 Design 100% responsivo
- 🔔 Sistema de notificações toast
- ⏳ Indicadores de carregamento
- 📦 Upload em lote
- 🔄 Redirecionamento automático
- 🚀 Pronto para produção no Vercel

### 🏆 **Status do Projeto:**
- ✅ **Funcional** - Todas as funcionalidades implementadas
- ✅ **Testado** - Fluxo completo validado
- ✅ **Responsivo** - Mobile e desktop
- ✅ **Seguro** - Validações e autenticação
- ✅ **Pronto para Deploy** - Configuração completa

### 📚 **Documentação Completa:**
- 📋 [DEPLOY_VERCEL_GUIDE.md](./DEPLOY_VERCEL_GUIDE.md) - Deploy passo a passo
- ⚡ [INSTRUCOES_RAPIDAS.md](./INSTRUCOES_RAPIDAS.md) - Guia rápido
- 🔧 [VERCEL_GUIDE.md](./VERCEL_GUIDE.md) - Configurações técnicas

**Desenvolvido com ❤️ para facilitar a assinatura digital de documentos**

*Sistema profissional, moderno e pronto para produção!* 🚀
