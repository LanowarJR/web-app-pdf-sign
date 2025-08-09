# 🚀 Guia Completo de Deploy no Vercel

## ✅ Preparação do Projeto (CONCLUÍDA)

Seu projeto já está preparado para deploy! As seguintes configurações foram ajustadas:

- ✅ `vercel.json` atualizado com rotas corretas
- ✅ `.vercelignore` configurado para excluir arquivos desnecessários
- ✅ `package.json` com scripts adequados
- ✅ Estrutura de arquivos organizada

## 📋 Pré-requisitos

### 1. Conta no Vercel
- Acesse [vercel.com](https://vercel.com) e crie uma conta gratuita
- Conecte sua conta GitHub (recomendado)

### 2. Instalar Vercel CLI (Opcional)
```bash
npm install -g vercel
```

## 🚀 Métodos de Deploy

### Método 1: Deploy via GitHub (RECOMENDADO)

#### Passo 1: Criar Repositório no GitHub
1. Acesse [github.com](https://github.com) e faça login
2. Clique em "New repository"
3. Nome: `web-app-pdf-sign`
4. Deixe como público ou privado (sua escolha)
5. NÃO inicialize com README (já temos)
6. Clique em "Create repository"

#### Passo 2: Conectar Projeto Local ao GitHub
```bash
# No terminal, dentro da pasta do projeto:
git init
git add .
git commit -m "Initial commit - Sistema de Assinatura PDF"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/web-app-pdf-sign.git
git push -u origin main
```

#### Passo 3: Deploy no Vercel
1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
2. Clique em "New Project"
3. Selecione "Import Git Repository"
4. Escolha seu repositório `web-app-pdf-sign`
5. Configure:
   - **Framework Preset:** Other
   - **Root Directory:** ./
   - **Build Command:** `npm run vercel-build`
   - **Output Directory:** public
6. Clique em "Deploy"

### Método 2: Deploy via CLI

```bash
# No terminal, dentro da pasta do projeto:
vercel login
vercel
# Siga as instruções na tela
```

## ⚙️ Configurar Variáveis de Ambiente

### No Dashboard do Vercel:
1. Acesse seu projeto no dashboard
2. Vá em **Settings** > **Environment Variables**
3. Adicione as seguintes variáveis:

```
FIREBASE_SERVICE_ACCOUNT_KEY
```
Valor: Cole todo o conteúdo do seu arquivo `serviceAccountKey.json` (JSON completo)

```
FIREBASE_STORAGE_BUCKET
```
Valor: `seu-projeto.appspot.com` (substitua pelo seu bucket)

```
JWT_SECRET
```
Valor: Uma chave secreta forte (ex: `minha_chave_super_secreta_2024`)

### ⚠️ IMPORTANTE:
- Copie as variáveis exatamente do seu arquivo `.env` local
- O `FIREBASE_SERVICE_ACCOUNT_KEY` deve ser o JSON completo em uma linha
- Não inclua aspas extras nas variáveis

## 🔄 Redeploy Automático

Após conectar ao GitHub:
- Qualquer push para a branch `main` fará deploy automático
- Você pode ver o progresso em tempo real no dashboard

## 🌐 URLs do Projeto

Após o deploy, você terá:
- **URL Principal:** `https://seu-projeto.vercel.app`
- **Login Admin:** `https://seu-projeto.vercel.app/admin`
- **Dashboard Admin:** `https://seu-projeto.vercel.app/admin-dashboard`
- **Upload Admin:** `https://seu-projeto.vercel.app/admin-pdfjs`
- **Usuário:** `https://seu-projeto.vercel.app/user`
- **Assinatura:** `https://seu-projeto.vercel.app/sign-pdfjs`

## 🛠️ Comandos Úteis

```bash
# Ver logs em tempo real
vercel logs

# Listar deployments
vercel ls

# Fazer redeploy
vercel --prod

# Desenvolvimento local com Vercel
vercel dev
```

## ✅ Checklist Final

- [ ] Conta no Vercel criada
- [ ] Repositório no GitHub criado (se usando método 1)
- [ ] Código enviado para GitHub
- [ ] Projeto importado no Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado com sucesso
- [ ] Teste das funcionalidades principais

## 🆘 Solução de Problemas

### Erro de Build
- Verifique se todas as dependências estão no `package.json`
- Confirme se o `vercel.json` está correto

### Erro 500
- Verifique as variáveis de ambiente
- Confirme se o `FIREBASE_SERVICE_ACCOUNT_KEY` está correto

### Erro de Rota
- Verifique se as rotas no `vercel.json` estão corretas
- Confirme se os arquivos HTML existem na pasta `public`

## 📞 Próximos Passos

1. **Teste Completo:** Teste todas as funcionalidades em produção
2. **Domínio Personalizado:** Configure um domínio próprio (opcional)
3. **Monitoramento:** Configure alertas de erro
4. **Backup:** Mantenha backups regulares do Firebase

---

**🎉 Parabéns! Seu sistema está pronto para produção!**