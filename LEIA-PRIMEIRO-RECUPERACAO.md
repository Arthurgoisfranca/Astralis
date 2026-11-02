# Mesa & Dados v1.5.1 — Recuperação de publicação (Render)

## O que aconteceu

A branch `main` do repositório Astralis publicou o conteúdo de `package.json` **dentro de `index.html`**. Por isso a página em HTTPS exibe JSON puro e não a interface React. Houve também um `tsconfig.json` vazio e arquivos de build (`dist`, `node_modules`) incluídos no GitHub.

Este ZIP contém **todos os arquivos-fonte do Mesa & Dados v1.5 recuperados e um conjunto de proteções adicionais para deploy**, incluindo:
- `index.html` HTML verdadeiro com `#root` e `/src/main.jsx`;
- `tsconfig.json` e `package-lock.json` consistentes;
- `scripts/verify-project.cjs`, executado em `prebuild`, `postbuild` e `prestart`;
- servidor Express que valida `dist/index.html` na inicialização em produção, usa `Cache-Control: no-store` para HTML e não devolve HTML para caminhos de assets ausentes;
- Service Worker com nome de cache atualizado e que não armazena respostas inválidas como página inicial;
- testes de regressão que verificam a estrutura HTML e a proteção do deploy.

**Não foi feita uma publicação automática na sua conta.** O pacote ainda exige upload ao GitHub, build real no Render e testes com Supabase.

## Forma recomendada de substituir os arquivos no GitHub (Windows)

1. Faça backup dos dados atuais e confirme que as credenciais do Supabase estão guardadas **no painel do Render**, não apenas no `.env` do repositório.
2. Extraia este ZIP em uma pasta do computador, por exemplo `C:\Users\SEU_USUARIO\Downloads\Mesa-e-Dados-v1.5.1`. Os arquivos `index.html`, `package.json`, `server.js`, `tsconfig.json` devem estar **diretamente na pasta extraída**, e não em uma subpasta adicional.
3. Abra o PowerShell em uma pasta de trabalho e execute:

   ```powershell
   git clone https://github.com/Arthurgoisfranca/Astralis.git
   cd Astralis
   ```

4. Copie **o conteúdo** da pasta extraída para a pasta `Astralis` clonada, substituindo os arquivos com os mesmos nomes. A forma gráfica do Explorer (Ctrl+A > Ctrl+C > colar na pasta Astralis) funciona. **Não copie uma pasta Mesa-e-Dados para dentro da pasta Astralis**.
5. Ainda no PowerShell dentro de `Astralis`, confira:

   ```powershell
   Get-Content .\index.html -TotalCount 3
   node scripts\verify-project.cjs
   ```

   A primeira linha deve ser `<!doctype html>`; a segunda instrução deve mostrar `Estrutura ... validada`.
6. Remova do *controle de versão*, sem apagar os arquivos locais, os dados/segredos que já tenham sido adicionados ao Git:

   ```powershell
   git rm -r --cached --ignore-unmatch node_modules dist data .env
   git add -A
   git status
   git commit -m "fix: restaura entrada HTML e deploy v1.5.1"
   git push origin main
   ```

   Se `git rm` disser que não encontrou algum caminho, pode continuar. Se `git` não estiver instalado, instale o Git para Windows em https://git-scm.com/downloads/win e reinicie o terminal.

## Configuração do Render

Em **Settings > Build & Deploy**:

- **Root Directory:** vazio (raiz do repositório)
- **Build Command:** `npm ci --include=dev && npm run build`
- **Start Command:** `npm start`
- **Node:** 22.x
- **Health Check:** `/api/health`

Em **Environment**, mantenha as configurações do projeto (sem expor segredos):

- `NODE_ENV=production`
- `SUPABASE_URL` e `SUPABASE_SECRET_KEY` (somente servidor)
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (valores públicos destinados ao cliente)

Depois vá em **Deploys > Manual Deploy > Clear build cache & deploy**.

## Confirmar se funcionou

1. Nos logs, procure `Estrutura do Mesa & Dados validada (fonte)` e depois `(fonte + build)` e `Build successful`.
2. Abra `https://SEU-SERVICO.onrender.com/api/health` — deve retornar JSON com `ok: true` (apenas nesta rota, o JSON é correto).
3. Abra `https://SEU-SERVICO.onrender.com/` — deve exibir HTML da aplicação, não o conteúdo de `package.json`.
4. Se o navegador ainda apresentar a versão antiga, faça `Ctrl+Shift+R` e, em DevTools > Application > Service Workers, desregistre o SW antigo e limpe os dados de cache **apenas deste site**.
5. Teste login, abrir/criar sala, diário, PDF, perícias, mapa e player em dois navegadores.

## Problemas conhecidos e limites da validação

- Os 17 testes locais e o TypeScript passaram. A instalação dos pacotes npm não foi possível neste ambiente por DNS/rede, portanto **não executamos um build Vite real nem testes ponta a ponta com Render e Supabase**.
- O site precisa das tabelas e políticas de Supabase das migrações presentes em `supabase/migrations/` — não rode scripts SQL destrutivos nem apague a base existente.
- Uma instância Render gratuita é efêmera para arquivos locais: configure corretamente Supabase Storage/Postgres. HTTPS não elimina a necessidade de autenticação e RLS.
- Um `.env` já exposto em um repositório público deve ter suas **credenciais privadas revogadas/rotacionadas**; `git rm --cached .env` retira o arquivo dos commits futuros, mas não elimina seu histórico.
- A aplicação VTT tem funcionalidades que dependem de testes em produção, principalmente autenticação de rotas, áudio multiplayer, uploads e permissões do Supabase. Não confunda testes de estrutura com garantia de produção.
