# Alterações realizadas no código-fonte — v1.4v

Arquivos originais preservados: servidores, fichas, mapas e módulos de RPG. A atualização não apaga as campanhas nem recria o repositório a partir do zero.

## Implementações no código

- `src/CharacterStudio.jsx`: correção de oito chamadas a setter inexistente, estado de formulários e linhas editáveis; ajustes d20 e V5.
- `src/AudioCenter.jsx`: nova central de áudio global com fila, uploads, seek, loop, shuffle, volume e sincronização via servidor.
- `src/SystemConsultations.jsx`: histórico e painel de consultas, visibilidade por item e compatibilidade com regras antigas.
- `src/AccountPanel.jsx`: login/cadastro, recuperação de senha, perfil e upload de avatar.
- `src/AstralisApp.jsx`: montagem global do player, autenticação, rooms vinculadas à conta, nickname, Realtime.
- `src/CampaignModules.jsx`: notas privadas GM, diário cronológico, mapa persistente, drop-zone PDF.
- `server.js`: endpoints de conta, ações de usuário, consultas, Realtime broadcast, backup do diário.
- `server/repositories/roomRepository.js`: persistência da coluna `current_map_url`.
- `supabase/migrations/20261102_v14_accounts_audio_maps.sql`: esquema incremental com RLS e buckets.
- `src/astralisTheme.css`: identidade dark/warm com adaptação responsiva, ajuste de grids.
- `public/manifest.json`, `public/sw.js`, `public/icons/`: arquivos PWA.
- `render.yaml`, `vercel.json`, `netlify.toml`, `.env.example`: build e hospedagem HTTPS.
- `tests/v14-sanity.test.cjs`: regressão e verificações estáticas.

## Validação executada

- `node --test tests/v14-sanity.test.cjs`: 5 testes passaram (TypeScript global fornecido pelo ambiente)
- `tsc --noEmit -p tsconfig.json`: passou
- `node --check server.js` e `node --check public/sw.js`: passaram
- Build Vite `npm run build`: **não executado**, pois `npm ci` ficou indisponível pelo acesso ao registro npm.
- Integração com Supabase em nuvem e E2E no navegador: **não testadas**.

## Limitações conhecidas que precisam de testes após deploy

- Supabase Auth exibe login quando configurado no Vite, mas os tokens de sala existentes ainda são validados no backend por compatibilidade; não é uma migração total de autorização para JWT.
- O player sincroniza o estado e posição, mas a precisão real depende da rede, da reprodução HTML5 e das permissões de autoplay. YouTube embed não possui seek/controle HTML5 preciso.
- Serviço gratuito pode adormecer; o multiplayer exige backend Express público, mesmo se o frontend estiver na Vercel.
- Cache offline não inclui contas privadas, PDFs ou estado da campanha.
- Verifique e aplique a terceira migration antes de publicar a nova versão.
