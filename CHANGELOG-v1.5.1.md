# v1.5.1 — Correção de publicação e integridade

- Restaurada a estrutura HTML do arquivo de entrada (`index.html`) e título de versão.
- Novo verificador de projeto executado antes/depois do build e antes do start.
- Falha explícita do servidor caso o bundle `dist/index.html` não seja HTML Vite válido.
- Fallback de SPA corrigido: HTML não-cacheável, rotas de assets ausentes respondem 404.
- Service Worker versão v1.5.1; nunca salva JSON inválido como página inicial no cache de navegação.
- `.gitignore` atualizado para não enviar build, dados ou credenciais ao Git.
- Testes de regressão de integridade adicionados; `npm test` executa arquivos CJS e MJS.
- README de recuperação com workflow seguro no Windows/GitHub/Render.

Verifique o build real e os testes de integração antes de considerar versão de produção pronta.
