# 🚀 Workflow de Desenvolvimento - Web App PDF Sign

## 📋 Estrutura de Branches

### 🌟 **main** (Produção)
- Branch principal conectada ao Vercel
- Contém apenas código estável e testado
- Deploy automático no Vercel a cada push
- **⚠️ NUNCA desenvolver diretamente nesta branch**

### 🔧 **development** (Desenvolvimento)
- Branch para desenvolvimento e testes locais
- Onde todas as novas features são implementadas
- Ambiente seguro para experimentação
- Testes locais antes de enviar para produção

## 🔄 Fluxo de Trabalho

### 1. 🛠️ Desenvolvendo Novas Features

```bash
# Certifique-se de estar na branch development
git checkout development

# Puxe as últimas mudanças (se houver)
git pull origin development

# Desenvolva suas mudanças...
# Teste localmente com: npm start

# Adicione e commit suas mudanças
git add .
git commit -m "feat: Descrição da nova feature"
```

### 2. 🧪 Testando Localmente

```bash
# Na branch development, inicie o servidor local
npm start

# Teste todas as funcionalidades
# Acesse: http://localhost:3000
# Verifique se tudo funciona corretamente
```

### 3. ✅ Enviando para Produção

```bash
# Quando tudo estiver funcionando perfeitamente:
# Volte para a branch main
git checkout main

# Faça merge das mudanças da development
git merge development

# Push para o repositório (isso fará deploy automático no Vercel)
git push origin main
```

### 4. 🔄 Voltando para Desenvolvimento

```bash
# Sempre volte para a branch development após o deploy
git checkout development
```

## 📝 Convenções de Commit

- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `style:` - Formatação, sem mudança de lógica
- `refactor:` - Refatoração de código
- `test:` - Adição de testes

## 🚨 Comandos Importantes

```bash
# Ver branch atual
git branch

# Trocar de branch
git checkout [nome-da-branch]

# Ver status dos arquivos
git status

# Ver histórico de commits
git log --oneline

# Desfazer mudanças não commitadas
git restore [arquivo]
```

## 🎯 Benefícios deste Workflow

✅ **Segurança**: Produção sempre estável  
✅ **Flexibilidade**: Teste mudanças sem medo  
✅ **Controle**: Deploy apenas quando aprovado  
✅ **Histórico**: Rastreamento completo de mudanças  
✅ **Rollback**: Fácil reversão se necessário  

## 🆘 Em Caso de Problemas

### Se algo der errado na produção:
```bash
# Volte para o último commit estável
git checkout main
git reset --hard HEAD~1  # Remove o último commit
git push --force origin main  # ⚠️ Use com cuidado!
```

### Se quiser descartar mudanças na development:
```bash
git checkout development
git reset --hard origin/main  # Reseta para o estado da main
```

---

**💡 Dica**: Sempre teste localmente na branch `development` antes de fazer merge para `main`!