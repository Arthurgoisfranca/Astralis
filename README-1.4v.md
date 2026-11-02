# Mesa & Dados v1.4v — Instruções de implantação

Esta atualização foi preparada **a partir do ZIP do Astralis fornecido**, preservando o servidor Express/Socket.IO e as campanhas antigas. Ela NÃO elimina a necessidade do backend: **um site estático na Vercel, sozinho, não suporta as APIs e sockets existentes**.

## Como publicar com HTTPS sem pagar por domínio

### Opção recomendada: um Web Service no Render

1. Envie **todo o conteúdo desta pasta** para seu repositório GitHub, substituindo os arquivos da versão antiga (sem `node_modules`, `dist` e `.env`).
2. No Render, selecione **Web Services** e conecte o repositório atualizado. Node 22, `Root Directory` vazio, build **`npm ci --include=dev && npm run build`**, start **`npm start`**, plano Free quando disponível. O `render.yaml` inclui configuração equivalente.
3. Antes do deploy, configure no Supabase o projeto e rode as três migrations na ordem:
   - `supabase/migrations/20261031_init.sql`
   - `supabase/migrations/20261101_v12_realtime_storage_security.sql`
   - **`supabase/migrations/20261102_v14_accounts_audio_maps.sql`**
4. No Render, em **Environment**, defina `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Consulte `.env.example` para a diferença entre frontend e backend. **Nunca exponha a chave secreta no Vite**.
5. Em Supabase **Authentication → Providers → Email**, habilite o login por e-mail e senha. Em **Authentication → URL Configuration**, configure a URL pública Render como Site URL e também na lista Redirect URLs (para redefinir senha). Se ativar confirmação de e-mail, teste o envio dos links.
6. Faça **Clear build cache & deploy** no Render. No final, abra a URL `https://SEU-SERVICO.onrender.com` e teste `/api/health`.
7. Cadastre uma conta; crie uma mesa; teste com outro login e um convite. Ao criar/entrar, o sistema associa o token da mesa à conta autenticada.

Render gerencia automaticamente TLS/HTTPS e WSS. **Não coloque certificados PEM no código.** Em planos gratuitos pode ocorrer inicialização lenta após inatividade. Não use `DATA_DIR` temporário como banco em produção: as mesas devem estar no Supabase.

### Opção Vercel / Netlify (frontend) + Render (backend)

1. Mantenha o backend Express no Render com Supabase configurado. Na Vercel, faça o build do frontend Vite usando `npm ci --include=dev && npm run build` e diretório de saída `dist`. Há `vercel.json` e `netlify.toml` inclusos.
2. Configure as variáveis de build públicas na Vercel/Netlify: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL=https://SEU-BACKEND.onrender.com`, `VITE_SOCKET_URL=https://SEU-BACKEND.onrender.com`.
3. No Render, defina `CORS_ORIGIN=https://SEU-FRONTEND.vercel.app` (a URL exata do frontend). Atualize também a **Site URL** e os redirecionamentos no Supabase Authentication.
4. Teste login, WebSockets, recuperação de mesas, fila de músicas, upload, notas privadas e PDF. As plataformas oferecem HTTPS automático em seus subdomínios.

### Supabase Realtime

Além do Socket.IO original (canal de estado autorizado por token de sala), o backend publica comandos de áudio em `room_audio_<id>` pelo Supabase Realtime. O frontend com Supabase Auth inscreve-se em canais **privados**. A migration cria uma política de leitura por participação na campanha. **O Socket.IO continua sendo o fallback**; ambientes sem Realtime não devem perder o estado salvo. O servidor é a fonte de verdade para playlist e comandos.

### O que mudou

- Fichas: correção do `set(...)` não definido (causava travamento em praticamente todos os inputs), linhas editáveis e grid responsivo.
- Consultas: histórico por registro com publicação/ocultação, exclusão e edição; visualização simultânea através de lista e painel, incluindo texto legado.
- Diário: caderno privado do Mestre, diário público/privado com ordenação cronológica, tabela `campaign_journals` para backup relacional. A fonte principal da leitura ainda é o estado da mesa.
- Mapas: upload WebP e salvamento imediato, coluna `rooms.current_map_url`, tokens e medições em estado da mesa.
- Arquivos: limites de **30 MiB** por arquivo nesta versão, incluindo imagens (2048px/WebP 85%), áudio e PDFs. Uploads em partes e parser de PDF já existiam e foram mantidos; adicionado drag-and-drop na aba PDF.
- Áudio: único player HTML5 fora da montagem condicional das abas, progresso/seek, play/pause, próximo/anterior, loop, shuffle, volume master, fila lateral, reordenação, remoção, múltiplos uploads para Supabase Storage e sincronização por estado com servidor. **Links YouTube não têm controle HTML5 preciso** e o browser exige gesto do usuário para iniciar áudio.
- Conta: Supabase Auth e-mail/senha, perfil com avatar WebP e nome, redefinição de senha e vínculo de mesas à conta; nick da mesa separado. A segurança das ações existentes ainda usa o token de sala validado no backend.
- RPG: mantidos roladores já existentes, incluindo Triangle Agency, Daggerheart, Vampire V5, CoC, Ordem Paranormal, Sacramento, D&D; correção adicional de falha crítica em D&D e de falha bestial em V5.
- PWA: manifest, ícones PNG 192/512, service worker para assets e navegação offline. Multijogador e recursos privados **não funcionam offline**.
- UI: paleta escura quente e componentes responsivos.

### Notas de segurança/limitações

- Login Supabase protege o acesso pela interface e associa as mesas à conta. O backend mantém tokens de sala por compatibilidade com usuários antigos; trate links de convite e tokens de Mestre como segredos. A migração completa do fluxo de autorização de todas as rotas de token de sala para JWT verificado exige etapa adicional de hardening.
- `mesa-assets` é um bucket público: **não envie material secreto** como áudio, mapas ou retratos a ele. Notas do Mestre, fichas privadas e PDFs privados ficam protegidos pelas rotas de backend e Storage `mesa-private`.
- Supabase gratuito pode impor limites de armazenamento/transferência e tamanho de arquivo. O upload não garante reprodução de links externos que proíbem CORS, hotlink ou range requests.
- O esquema `current_map_url` precisa da migration 1.4 antes de iniciar a nova versão com Supabase.
- Alguns recursos foram preparados sem teste end-to-end contra um Supabase real nem build Vite neste ambiente. Execute `npm ci --include=dev`, `npm test`, `npm run typecheck` e `npm run build` antes da publicação. Inspecione os logs do Render e as políticas RLS.
