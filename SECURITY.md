# Política de Segurança

## Medidas de Segurança Implementadas

### 1. Headers de Segurança
- **Helmet.js**: Configurado com política de segurança de conteúdo (CSP) restritiva
- **Content Security Policy**: Permite apenas recursos do mesmo domínio
- **X-Frame-Options**: Previne clickjacking
- **X-Content-Type-Options**: Previne MIME sniffing

### 2. Rate Limiting
- **Limite Geral**: 100 requisições por 15 minutos por IP
- **Limite de Autenticação**: 5 tentativas de login por 15 minutos por IP
- **Proteção contra ataques de força bruta**

### 3. CORS (Cross-Origin Resource Sharing)
- **Produção**: Apenas domínio de produção autorizado
- **Desenvolvimento**: Apenas localhost autorizado
- **Credenciais**: Permitidas apenas para origens autorizadas

### 4. Validação e Sanitização
- **Express-validator**: Validação rigorosa de entrada
- **Sanitização**: Escape de caracteres especiais
- **Validação de CPF**: Algoritmo completo de validação
- **Validação de Email**: Normalização e validação de formato

### 5. Autenticação e Autorização
- **JWT**: Tokens com expiração de 24 horas
- **Bcrypt**: Hash seguro de senhas
- **Middleware de autenticação**: Verificação obrigatória de tokens
- **Controle de acesso**: Separação entre usuários e administradores

### 6. Configuração Segura
- **Variáveis de ambiente**: Todas as credenciais em .env
- **JWT Secret**: Obrigatório em produção
- **Firebase**: Configuração via service account
- **Logs**: Removidos logs sensíveis em produção

## Arquivos Removidos por Segurança

Os seguintes arquivos foram removidos por conterem credenciais expostas:
- `public/test-vercel-api.html`
- `scripts/test-view-route.js`
- `scripts/test-admin-login.js`
- `scripts/test-api.js`
- `scripts/test-auth-route.js`
- `scripts/test-server-routes.js`

## Configurações de Segurança Obrigatórias

### Variáveis de Ambiente
```
JWT_SECRET=sua_chave_jwt_super_secreta_aqui
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
```

### Domínios Autorizados
- Produção: Configurar domínio real no CORS
- Desenvolvimento: localhost:3000, localhost:5000

## Recomendações Adicionais

1. **Monitoramento**: Implementar logs de segurança
2. **Backup**: Backup regular do Firestore
3. **Atualizações**: Manter dependências atualizadas
4. **Auditoria**: Revisão periódica de segurança
5. **HTTPS**: Sempre usar HTTPS em produção
6. **Firewall**: Configurar firewall no servidor

## Contato de Segurança

Para reportar vulnerabilidades de segurança, entre em contato através dos canais oficiais do projeto.

---
*Última atualização: $(date)*