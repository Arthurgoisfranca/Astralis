# Mesa & Dados — v1.4 preservada, melhorias pontuais da v1.5

**Este pacote não altera seu GitHub/Render automaticamente.**

O projeto foi reconstruído a partir do ZIP original da **v1.4v**, sem substituir parâmetros por padrões novos. Apenas três arquivos existentes diferem da v1.4:

- `src/AudioCenter.jsx`: mini-player flutuante e fila independente da aba Música (sem alterar os eventos do servidor).
- `src/CampaignModules.jsx`: correção do erro na exportação de PDF (`document` sobrescrito), alinhamento do Caderno do Mestre, enquadramento proporcional do mapa com zoom e controles, sem mudar o payload de salvamento.
- `src/astralisTheme.css`: estilos pontuais para áudio, diário, biblioteca de PDF e mapa. A paleta original e variáveis CSS globais da v1.4 permanecem.

## O que ficou intocado

`server.js`, `src/AccountPanel.jsx`, `src/AstralisApp.jsx`, `src/AppShell.jsx`, `src/CharacterStudio.jsx`, o domínio das fichas, todas as migrações Supabase, `index.html`, `package.json`, `package-lock.json`, `render.yaml`, `vite.config.js`, `tsconfig.json`, `vercel.json`, `netlify.toml`, `.gitignore`, PWA e as configurações originais de ambiente. **Nenhum `.env` foi criado.** O `.env.example` já existente na v1.4 não foi modificado.

As funções da v1.5 que exigiriam alterar autenticação, banco, servidor, regras de dados, links de convite ou estrutura das fichas **não foram incorporadas** por segurança. Também não foi feita nenhuma migração SQL nem modificação no GitHub.

## Como aplicar com mínimo risco

1. Faça backup do repositório e, separadamente, dos dados do banco Supabase antes de modificar o ambiente.
2. **Se o seu projeto atual já está na v1.4:** use o pacote `PATCH-MINIMO` e substitua somente os três arquivos `src/...`, sem copiar nada da pasta `config`, do backend ou do banco.
3. **Se o repositório GitHub ainda está na v1.5 ou com arquivos corrompidos:** o patch isolado **não equivale a voltar toda a aplicação para a v1.4**. Use a versão completa deste pacote apenas em uma **branch de teste** e compare as configurações existentes; jamais substitua arquivos vitais do Render/Supabase sem revisão.
4. Localmente, execute `npm ci --include=dev`, `npm test`, `npm run typecheck` e `npm run build` antes de fazer merge para `main`.
5. Teste em dois navegadores: login, ficha, PDF exportado, diário, mapa, áudio e sincronização. Só então publique.

## Validação aqui

- 10 testes locais passaram.
- TypeScript: `tsc --noEmit -p tsconfig.json`: passou.
- Node: `node --check server.js`: passou.
- Build Vite e testes E2E no Render/Supabase: **não executados** porque as dependências npm não puderam ser instaladas neste ambiente.

`MANIFESTO-PRESERVACAO.json` registra hashes SHA-256 dos arquivos protegidos e permite conferir que não foram tocados.
