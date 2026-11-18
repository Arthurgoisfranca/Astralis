# Diagnóstico — Astralis (Fase 1)

Data: branch `refactor/fases-1-6`, a partir de `main@a7425a6`.
Método: leitura completa do código, execução de build, typecheck, testes, `npm audit`, varredura de segredos no git, boot local e teste de API contra a produção (`astralis-x0m2.onrender.com`).

## 1. Arquitetura atual

| Camada | Tecnologia | Arquivos |
|---|---|---|
| Front-end | React 19, Vite 7, sem roteador (aba em `useState`) | `src/main.jsx`, `AstralisApp.jsx`, `AppShell.jsx`, `CampaignModules.jsx`, `CharacterStudio.jsx`, `AudioCenter.jsx`, `SharedTools.jsx`, `SystemConsultations.jsx`, `AccountPanel.jsx` |
| Domínio de regras | TS/MJS puros | `src/domain/characterSheets.ts`, `sheetCalculations.ts`, `diceEngines.mjs`, `manualRules.mjs`, `vampireAlpha2.mjs`, `systemSheetBlueprints.js`, `RpgSystems.js` |
| Back-end | Node 22+, Express 5, Socket.IO 4, um único arquivo | `server.js` (569 linhas), `server/repositories/*` |
| Persistência | Supabase Postgres + Storage; SQLite local se não houver credenciais | `supabase/migrations/*.sql` |
| Deploy | Render (servidor + front compilado) | `render.yaml`; `vercel.json`/`netlify.toml` como alternativas |

**Modelo de dados.** Cada mesa é uma linha em `rooms` com `gm_token`, `invite_token` e um `state` JSON único que contém campanha, módulos, jogadores (com token), fichas, mapa, música, diário, NPCs, handouts, PDFs e agendamentos. Outras tabelas: `community_library`, `account_rooms`, `user_profiles`, `campaign_journals`.

**Identidade.** O acesso à mesa é por token portador (Mestre ou jogador), guardado em `sessionStorage`. A conta Supabase (e-mail/senha, Google, GitHub) é opcional e só serve para lembrar as mesas do usuário (`account_rooms`).

**Tempo real.** O cliente envia `room:action`. O servidor lê o estado inteiro, aplica a ação, grava o JSON inteiro e envia o estado inteiro (`room:state`) a cada socket.

**Rotas HTTP:** `GET /api/health`, `POST /api/account/link-room`, `GET /api/account/rooms`, `POST /api/rooms`, `POST /api/rooms/:id/join`, uploads em blocos (`start`, `GET`, `PUT chunks/:i`, `complete`), `POST uploads` (envio único), `POST files/signed-url`, `GET /api/library`, `POST /api/rooms/:id/library`, `GET /api/rooms/:id/private-file`, estáticos `/files/*` e `dist`.

## 2. Problemas encontrados

### Crítico

| ID | Local | Problema | Situação |
|---|---|---|---|
| C1 | `.env.example:10` (commits `6b70ecd`, `32a864a`) | A chave **service-role** do Supabase (`sb_secret_…`) estava versionada no repositório. Ela ignora todas as políticas RLS: quem tiver a chave lê e apaga qualquer dado do banco e do Storage. O repositório é público no GitHub. | Removida do arquivo no commit `de1c185`. **Continua no histórico do git e precisa ser revogada no painel do Supabase.** |

### Alto

| ID | Local | Problema |
|---|---|---|
| A1 | `server.js:518-526` | Travessia de caminho em `/private-file` (modo local): o dono é checado em `filePath.split("/")[1]` antes de `path.resolve` normalizar `..`. Um jogador lê documentos do Mestre ou de outra mesa. |
| A2 | `server.js:248, 352, 529` | Upload sem verificação de tipo real: extensão vem do nome enviado e MIME do cliente. No modo local, um `.html` enviado como imagem é servido na mesma origem (XSS armazenado). |
| A3 | `server.js:423-425, 482-483` | `kind:"character"` enviado pelo cliente libera upload de jogador nos buckets do Mestre; escopo `community` sem checagem. |
| A4 | `server.js:492-499` | `bucket` vem do cliente em `files/signed-url`; permite assinar URLs de outros buckets. |
| A5 | `server.js:180` | `dice:record` aceita os valores dos dados enviados pelo cliente e um `actor` livre: qualquer jogador forja rolagens e altera Caos/Medo. |
| A6 | `server.js:406-416` | `/join` grava fora da fila de ações: joins concorrentes perdem gravações e vendem vagas a mais. |
| A7 | `AppShell.jsx:91` | `useEffect(() => setForm(room.campaign), [room.campaign])` apaga a edição não salva do Mestre a cada atualização da sala. |
| A8 | `CharacterStudio.jsx:86-103` | **Perícias desligadas das rolagens.** A aba Rolagens de D&D, Call of Cthulhu e Vampire V5 usa campos manuais (atributo 10, proficiência 0, perícia 50%, parada 6). Marcar proficiência ou preencher a porcentagem na ficha não altera a rolagem. |
| A9 | `characterSheets.ts:287` | Ordem Paranormal 2: `skills: numericEntries(input,"pericias")` nunca casa o formato salvo (`Acrobacia=d6\|d8`), então `skills` é sempre `{}`. Confirmado por execução. |
| A10 | `package.json` (`typescript ^7.0.2`) | O TS 7 (preview nativo) não expõe a API JS. `tests/v14-sanity.test.cjs` quebra (`ts.JsxEmit` indefinido); a validação do próprio projeto não roda. |
| A11 | `astralisTheme.css` | 74 de 163 `font-size` têm 9px ou menos; no mobile chegam a 6px. Ilegível e fora do WCAG. |
| A12 | `package-lock.json` | `npm audit`: 4 vulnerabilidades altas (`picomatch` ReDoS via `vite`/`tinyglobby`/`fdir`). Somente dependências de build, não chegam ao navegador. |

### Médio

| ID | Local | Problema |
|---|---|---|
| M1 | `CharacterStudio.jsx:25` + `characterSheets.ts` (CoC) | Valores-base das perícias de CoC (ex.: Esquivar = DES/2, Idioma Nativo = EDU) aparecem na tela, mas só são salvos se o usuário editar a perícia. |
| M2 | `CharacterStudio.jsx:14` | `parseMap` separa por `;` e `=`/`:`; nomes de perícia com esses caracteres quebram a leitura. |
| M3 | `server.js:227` | `notes:save` zera a nota privada quando o payload só traz a nota compartilhada. |
| M4 | `server.js:196-200, 240` | `map:token:add` e `pdf:save` usam `id` do cliente: um jogador substitui token/PDF de outro. |
| M5 | `server.js:36` + `render.yaml` | Sem `CORS_ORIGIN`, qualquer origem é aceita com credenciais. |
| M6 | todo `server.js` | Sem rate limit, sem cabeçalhos de segurança (CSP, HSTS, nosniff, frame-ancestors). |
| M7 | `server.js:376…550` | `error.message` interno (inclusive do Supabase) é devolvido ao cliente. |
| M8 | `server.js:398, 411` | Convite sem expiração, sem rotação, reutilizável; não há ação para remover jogador. |
| M9 | `server.js:477, 37, 51` | `express.raw` aceita 151 MB e JSON/Socket aceitam 35 MB, acima do limite real de 30 MB. |
| M10 | `server.js:549, 559` | No modo Supabase cada ação gera dois broadcasts (direto e via `postgres_changes`). |
| M11 | `AstralisApp.jsx:70, 74, 157` | Sem tratamento de desconexão pelo servidor; o token de convite permanece na URL e no histórico. |
| M12 | `AudioCenter.jsx:72, 95` | Fila de música depende do `<audio>` do Mestre; botão "Ativar áudio" só aparece no player expandido. |
| M13 | `SharedTools.jsx:114`, `AccountPanel.jsx:20` | Modais sem `role="dialog"`, foco inicial ou focus trap. |
| M14 | `tests/v150-model.test.cjs:7`; `tests/v14-safe-merge.test.cjs:38`; `tests/v150-official.test.mjs:68` | Caminho Linux fixo para o TypeScript; testes que falham sempre que `node_modules` ou `dist` existem. |
| M15 | `package.json` script `test` | Glob `tests/*.test.cjs` ignora os 4 arquivos `.mjs`. |

### Baixo

Comparação de tokens com `===` (`server.js:114`), recursão sem limite em TUS (`server.js:310`), `decodeURIComponent` sem try/catch (`server.js:484`), listener de teclado do `Modal` recriado a cada render, toasts que nunca somem, `alert()`/`confirm()`, `theme-color` divergente entre `index.html` e `manifest.json`, service worker com cache sem poda, fontes do Google carregadas por `@import` (expõe IP, bloqueia renderização).

## 3. Código morto e duplicação

| Item | Evidência | Ação proposta |
|---|---|---|
| `SystemGuide`, `Music` em `CampaignModules.jsx:83, 224` | Importados em `AstralisApp.jsx:8`, nunca renderizados; as abas usam `SystemConsultations` e `AudioCenter` | Remover |
| CSS do `Music` morto (`.player-surface`, `.track-now`, `.playlist-row`, `.track-index`, `.youtube-frame`) | Só referenciado dentro de `Music` | Remover junto |
| 15 classes CSS sem referência (`campaign-title`, `character-form`, `diary-grid`, …) | grep em `src/` | Remover |
| `export` de `accountClient` e `ThemeContext` | Nunca importados fora do arquivo | Retirar `export` |
| `scripts/startDevServer.js` | Não usado pelos scripts do `package.json` | Remover |
| `fileIdentity` (`server.js:247`) | Alias de `identify` | Substituir |
| `current_map_url` | Gravado e nunca lido | Avaliar na Fase 4 |
| Listas de perícias e mapas atributo→perícia | Repetidos em `systemSheetBlueprints.js` e `CharacterStudio.jsx` | Centralizar no domínio |
| `:root` definido duas vezes no CSS (linhas 2 e 124) | A primeira é sempre sobrescrita | Consolidar |

## 4. Performance

| Gargalo | Impacto |
|---|---|
| Cada ação (inclusive mover um token) relê, grava e retransmite o estado inteiro da mesa | Latência e banda crescem com o tamanho da mesa |
| Imagens em base64 dentro do estado (mapa até 8 MB, cada NPC/handout até 1,7 MB) | O estado pode chegar a dezenas de MB por broadcast |
| `CampaignModules` e `CharacterStudio` importados de forma estática | Bundle inicial de 475 KB + 438 KB de JS |
| `room:state` re-renderiza o app inteiro; callbacks recriados a cada render | Interface pesada durante a sessão |
| N+1 em `/api/account/rooms` | Uma consulta por mesa |

**Métricas de base:** 52 arquivos versionados (32 de código), `dist` com 2,72 MB, build em 39,8 s, 4 vulnerabilidades altas (dev), 3 de 31 testes falhando.

## 5. Lacunas em relação ao fluxo de negócio (Fase 2)

| Etapa | Existe hoje | Falta |
|---|---|---|
| 2.1 Cadastro e acesso | Login Supabase (e-mail/senha, Google, GitHub, recuperação) | Conta não controla o acesso à mesa; papéis por mesa |
| 2.2 Criação da mesa | Nome, sistema, capa, vagas, agenda, gatilhos, resumo | Visibilidade (privada/convite/pública); névoa de guerra; iniciativa |
| 2.3 Sistemas | 11 sistemas com ficha própria | Tormenta20; **sistema "Outros" com construtor de ficha** (inexistente) |
| 2.4 Convites | Link com token, limite por vagas | Expiração, uso limitado, aprovação, remoção, co-mestre, espectador |
| 2.5 Agendamento | Data/hora em texto | Fuso horário, recorrência, RSVP, lembretes, calendário pessoal |
| 2.6 Áudio | Playlist sincronizada, controle do Mestre | Canais/efeitos sonoros, cenas |
| 2.7 Sessão | Mapa com tokens e medição, handouts, diário, notas, escudo | Chat, rolagem no servidor com histórico compartilhado, rastreador de iniciativa |

## 6. Prioridade de correção

1. **C1** — revogar a chave (ação do dono do projeto) e limpar o histórico.
2. **A1–A6** — falhas de segurança exploráveis por qualquer jogador convidado.
3. **A7–A10, M14, M15** — bugs de perícias e ferramentas de validação.
4. Médios e baixos, junto com as fases 3 e 4.
5. Lacunas de negócio (Fase 2) e redesenho (Fase 5).

## 7. Andamento

### Bloco (a) — segurança e perícias (spec `.kiro/specs/security-and-skills-hotfix/`)

Resolvidos: C1 (arquivo saiu do git; **a chave ainda precisa ser revogada no Supabase**), A1–A10, M1, M14, M15. Validado no Chrome pelo dono do projeto.

### Bloco (b) — ferramentas e limpeza

| Item | Ação | Evidência |
|---|---|---|
| Lint | ESLint 10 + `eslint-plugin-react-hooks`; scripts `npm run lint` e `npm run check` | 0 erros |
| `SystemGuide`, `Music`, `youtubeId` | Removidos de `CampaignModules.jsx` (61 linhas) | Nenhum uso em JSX; abas usam `SystemConsultations` e `AudioCenter` |
| CSS órfão | 100 seletores e 64 regras removidos (24 classes) | Classes sem referência em `src/` e `index.html` |
| `dndAbilityModifier(s)`, `dndSkillBonus`, `vampireDicePool`, `updateResource` | Removidos de `sheetCalculations.ts` | Nenhuma importação |
| Imports sem uso | `React` padrão (runtime automático do JSX), `Modal`, `TokenMaker`, `readImage`, `vampireDicePool`; estados `threat`/`exposure`; variável `own` | ESLint `no-unused-vars` |
| `scripts/startDevServer.js` | Removido | Nenhum script usa; `npm run dev` usa `scripts/dev.js` |
| `concurrently` | Dependência removida | Nenhum uso |
| `fileIdentity` | Substituído por `identify` | Era só um alias |
| Teste "Critical files remain original v1.4 bytes" | Removido | Impunha a preservação revogada |
| Carregamento | `CampaignModules` e o editor de fichas carregados sob demanda | Ver métricas |

**Métricas (build de produção):**

| Medida | Antes | Depois |
|---|---|---|
| JS da tela inicial | 475,3 KB (149,5 KB gzip) | 342,2 KB (109,6 KB gzip) |
| CSS da tela inicial | 75,0 KB (16,2 KB gzip) | 53,2 KB (12,2 KB gzip) |
| CSS total | 75,0 KB | 70,3 KB |
| Tempo de build | 39,8 s | ~30 s |
| Testes | 28/31 passando | 59/59 passando |
| Problemas de lint | sem lint | 0 erros, 18 avisos |

**Pendências registradas:**
- 18 avisos de `react-hooks` (estado copiado de props dentro de efeitos e dependências faltando). Correção junto com a refatoração dos componentes nas fases seguintes, com teste de interface.
- `npm audit`: 4 altas em `picomatch` ≤ 4.0.7 (GHSA-fc5q-39xc-vjpf), puxado por `vite`. Não há versão corrigida publicada. Só roda no build, com padrões de arquivo do próprio projeto; não chega ao navegador nem ao servidor. Reavaliar quando sair `picomatch` 4.0.8.
- `:root` definido duas vezes no CSS e cores fixas espalhadas: resolvido no redesenho (bloco g), com tokens únicos.
- Documentos antigos (`LEIA-PRIMEIRO-V14-PRESERVADA.md`, `REGRAS-E-ATUALIZACAO-v1.5.0.md`, `MANIFESTO-PRESERVACAO.json`, `README-1.4v.md`, `CHANGELOG-1.4v.md`): aguardando decisão do dono.

## 8. Blocos c–g concluídos (v1.6.0)

- **(c) Contas, papéis e convites:** papéis por mesa (mestre, co-mestre, jogador, espectador), convites com validade/limite/revogação, remoção de participante, LGPD (exportar/excluir). Migração `20261118_v16_roles.sql`.
- **(d) Sistema "Outros":** construtor de ficha universal, fórmulas seguras sem `eval`, rolagens por campo, templates versionados, importar/exportar.
- **(e) Agendamento:** UTC + fuso do usuário, duração, recorrência, link, RSVP.
- **(f) Sessão:** chat com histórico de rolagens, iniciativa, névoa de guerra.
- **(g) Design:** paleta astral 60-30-10 em tokens, fundo estelar, piso de legibilidade (corrige A11), foco e `aria-current`.

**Validação final:** lint 0 erros (18 avisos de hooks pré-existentes), typecheck OK, 70 testes OK, build OK, smoke local OK.

**Pendências para o dono:** revogar a chave antiga no Supabase; rodar a migração v16; avaliar `helmet`/CSP, rate limit HTTP e `picomatch` quando houver correção. Avisos de `react-hooks` a tratar numa refatoração de componentes com teste de interface.
