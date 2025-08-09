# 🚨 CONFIGURAÇÃO URGENTE - Variáveis de Ambiente no Vercel

## Problema Atual
Sua aplicação está retornando **erro 500** em produção porque as variáveis de ambiente não estão configuradas no Vercel.

## ⚡ Solução Imediata

### 1. Acesse o Painel do Vercel
1. Vá para [vercel.com](https://vercel.com)
2. Faça login na sua conta
3. Clique no projeto **web-app-pdf-sign**

### 2. Configure as Variáveis de Ambiente
1. No painel do projeto, clique em **"Settings"** (Configurações)
2. No menu lateral, clique em **"Environment Variables"**
3. Adicione as seguintes variáveis:

#### Variável 1: JWT_SECRET
- **Name**: `JWT_SECRET`
- **Value**: `sua_chave_jwt_super_secreta_de_pelo_menos_32_caracteres`
- **Environment**: Production, Preview, Development (marque todas)

#### Variável 2: FIREBASE_SERVICE_ACCOUNT_KEY
- **Name**: `FIREBASE_SERVICE_ACCOUNT_KEY`
- **Value**: (Cole aqui o JSON completo do Firebase - veja seção abaixo)
- **Environment**: Production, Preview, Development (marque todas)

#### Variável 3: FIREBASE_STORAGE_BUCKET
- **Name**: `FIREBASE_STORAGE_BUCKET`
- **Value**: `seu-projeto-firebase.appspot.com`
- **Environment**: Production, Preview, Development (marque todas)

### 3. Como Obter o FIREBASE_SERVICE_ACCOUNT_KEY

1. **Acesse o Console do Firebase**:
   - Vá para [console.firebase.google.com](https://console.firebase.google.com)
   - Selecione seu projeto

2. **Gere a Chave de Serviço**:
   - Clique no ícone de engrenagem ⚙️ > "Project Settings"
   - Vá na aba "Service accounts"
   - Clique em "Generate new private key"
   - Baixe o arquivo JSON

3. **Configure no Vercel**:
   - Abra o arquivo JSON baixado
   - Copie TODO o conteúdo (deve começar com `{"type":"service_account"...`)
   - Cole como valor da variável `FIREBASE_SERVICE_ACCOUNT_KEY`

### 4. Exemplo do JSON do Firebase
```json
{
  "type": "service_account",
  "project_id": "seu-projeto-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...",
  "client_email": "firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs/firebase-adminsdk-xxxxx%40seu-projeto.iam.gserviceaccount.com"
}
```

### 5. Redeploy da Aplicação
Após configurar as variáveis:
1. No painel do Vercel, vá em **"Deployments"**
2. Clique nos 3 pontinhos do último deploy
3. Clique em **"Redeploy"**
4. Aguarde 2-3 minutos

## ✅ Verificação
Após o redeploy, teste:
- Login de admin em: https://web-app-pdf-sign.vercel.app/
- Se ainda der erro, verifique se todas as variáveis foram salvas corretamente

## 🆘 Se Ainda Não Funcionar
1. Verifique se o JSON do Firebase está correto (sem quebras de linha extras)
2. Certifique-se de que marcou todas as environments (Production, Preview, Development)
3. Faça um novo redeploy
4. Verifique os logs do Vercel em "Functions" > "View Function Logs"

---
**IMPORTANTE**: Sem essas variáveis configuradas, a aplicação não funcionará em produção!