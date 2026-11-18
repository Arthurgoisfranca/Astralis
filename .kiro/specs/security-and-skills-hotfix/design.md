# Design da correção — segurança e perícias

## Overview

A correção fecha as falhas de segurança A1–A6, liga as perícias da ficha às rolagens (A7–A9, M1) e devolve ao projeto a capacidade de se validar (A10, M14, M15). Os requisitos estão em `bugfix.md`.

A maior parte já está implementada na branch `refactor/fases-1-6`, nos commits `466fae1`, `af96ce7`, `25779c6`, `23c47e7`, `6614baa` e `bf7e61e`. Hoje typecheck, build e os 52 testes passam. A revisão independente (`semantic-review/2026-11-18-023434-pr-local.md`) achou oito pendências. Este design descreve a solução completa e marca o que ainda falta, sob o título **Pendente**.

Princípios:
- O servidor decide tudo o que é sensível: tipo real do arquivo, permissão, caminho e sorteio. O cliente só informa intenção e parâmetros.
- Os formatos salvos não mudam: `stats` continua em texto `Nome=valor`, as URLs de arquivos antigos continuam válidas.
- As regras de cada sistema ficam nas funções de domínio que já existem. O servidor só troca o sorteador.

## Glossary

| Termo | Significado |
|---|---|
| Família | Formato real do arquivo identificado pelos primeiros bytes (`png`, `jpeg`, `webp`, `pdf`, `zip`, `mp3`, `wav`, `ogg`, `webm`, `mp4`) |
| Caminho de Storage | `<sala>/<dono>/<arquivo>`, usado no disco local e nos buckets do Supabase |
| Fila da mesa | `enqueueRoom(roomId, tarefa)`: executa em série as gravações de uma mesa no processo |
| Rolagem registrada | Rolagem que altera o Escudo do Mestre: Triangle Agency (Caos) e Daggerheart (Medo) |
| `lastAlpha` | Última rolagem Alpha 2.0 sorteada pelo servidor para aquela conexão, guardada em `socket.data` |

## Bug Details

### Bug Condition

O defeito acontece quando a entrada X tem pelo menos uma destas propriedades:

| Condição C(X) | Requisitos |
|---|---|
| `path` de arquivo com `..`, `.`, segmento vazio, `\`, NUL ou fora de `<roomId>/` | 1.1, 1.8 |
| Conteúdo do upload diferente do MIME declarado, ou nome com extensão própria | 1.2, 1.3, 1.4 |
| Jogador enviando tipo fora de imagem (public) / PDF (private, community) | 1.5, 1.6 |
| `bucket` fora dos três buckets da aplicação | 1.7 |
| Valores de dados ou `actor` vindos do cliente; qualquer sorteio feito no navegador | 1.9, 1.10, 1.10.1 |
| Entrada na mesa concorrente com outra gravação | 1.11 |
| Atualização da mesa chegando com o formulário da campanha alterado | 1.12 |
| Rolagem de D&D, CoC ou V5 que deveria usar uma perícia da ficha | 1.13–1.15 |
| Ficha de Ordem Paranormal 2 ou CoC salva | 1.16, 1.17 |
| Instalação de dependências e execução dos testes | 1.18–1.21 |

### Examples

- Jogador `p1` pede `private-file?path=sala/p1/../gm/doc.pdf`: hoje recebe o PDF do Mestre; correto é 403.
- Jogador envia `pagina.html` com `Content-Type: image/png`: hoje vira `/files/mesa-assets/.../x.html` e roda no domínio; correto é 415.
- Jogador marca Furtividade com especialização (DES 14, proficiência +2) e rola: hoje rola d20 + 0; correto é d20 + 2 + 4 = d20 + 6.
- Ficha de Ordem com `Acrobacia=d6|d8`: hoje `skills = {}`; correto é `skills.Acrobacia = 6`.

## Expected Behavior

### Preservation Requirements

Os itens 3.1–3.15 de `bugfix.md`. Os mais sensíveis para o design:
- 3.2–3.4: os fluxos legítimos de upload do Mestre e do jogador continuam, e arquivos antigos continuam nas URLs de hoje.
- 3.5, 3.6, 3.11: mesmas regras, títulos e textos de rolagem; Caos e Medo com o mesmo cálculo e limites.
- 3.7, 3.8: `/join` com as mesmas respostas e códigos.
- 3.10, 3.12: formato de `stats` e de `skillProficiencies`/`skillExpertise` inalterado.

## Hypothesized Root Cause

| Defeito | Causa no código original |
|---|---|
| A1 | Dono lido de `filePath.split("/")[1]` antes de `path.resolve` normalizar `..` (`server.js:518-526` original) |
| A2 | `fileExt` usava `path.extname(fileName)`; `allowedMime` só olhava o MIME declarado; estáticos sem `nosniff` |
| A3 | `kind !== "character"` vindo do cliente liberava o jogador |
| A4 | `bucket` do corpo da requisição passado direto a `createSignedUrl` |
| A5 | `dice:record` lia `payload.dice`/`payload.hopeDie`; demais rolagens usavam `Math.random` no navegador |
| A6 | `/join` fazia `readRoom` → `push` → `saveRoom` fora de `actionQueues` |
| A7 | `useEffect(() => setForm(room.campaign), [room.campaign])` sem noção de edição pendente |
| A8 | `SkillCheck` só tinha campos manuais; nada lia `skillProficiencies`, `skills` ou os pontos de V5 |
| A9 | `numericEntries` exige número; o formato de Ordem é `dX\|dY` |
| M1 | Valor-base só existia na renderização de `SkillMatrix` |
| A10, M14, M15 | `typescript ^7.0.2` (preview sem API JS), `require` com caminho Linux fixo, asserções sobre o disco, glob só `.cjs` |

## Fix Implementation

### 1. Segurança de arquivos — `server/fileSecurity.js` (feito em `af96ce7`)

Módulo CommonJS sem dependências:
- `sniffFamily(buffer)`: identifica a família pelos bytes iniciais (assinaturas PNG, JPEG `FFD8FF`, `RIFF…WEBP`, `RIFF…WAVE`, `%PDF-`, ZIP `PK\x03\x04`, `OggS`, EBML `1A45DFA3`, `ftyp` no offset 4, `ID3` ou frame sync MP3).
- `contentMatchesMime(buffer, mime)`: o MIME declarado está na lista e a família bate.
- `extensionFor(mime)`: extensão pelo tipo verificado (`.png`, `.jpg`, `.webp`, `.pdf`, `.docx`, `.mp3`, `.wav`, `.ogg`, `.webm`, `.m4a`).
- `safeStoragePath(roomId, path)`: aceita só `<roomId>/<dono>/<arquivo>[/...]` com segmentos `[A-Za-z0-9_.-]+`, sem `.`/`..`, `\` ou NUL; devolve os segmentos ou `null`.
- `uploadAllowed(role, scope, mime)`: `community` só PDF; Mestre qualquer tipo aceito; jogador `public` só imagem, `private` só PDF.

Uso em `server.js`:
- `storeFile` recusa com 415 se `contentMatchesMime` falhar e nomeia o arquivo com `id(12) + extensionFor(mime)`.
- `uploads/start` e `uploads` (envio único) chamam `uploadAllowed`; o PUT do bloco 0 confere o conteúdo.
- `files/signed-url` exige bucket da lista e `safeStoragePath`; o dono vem dos segmentos validados.
- `private-file` usa `safeStoragePath` antes de qualquer leitura e mantém a checagem `startsWith(root + sep)`.
- Estáticos `/files/*` e `private-file` recebem os cabeçalhos de `uploadedFileHeaders`.

**Pendente:**
- **P1 — `complete` sem nova checagem (2.2.1).** Sessões criadas antes do deploy e restauradas do disco podem ter pulado `uploadAllowed` e a checagem do bloco 0, inclusive no envio grande via TUS. Em `uploads/:id/complete`, antes de gravar: `uploadAllowed(session.role, session.scope, session.mime)` e `contentMatchesMime(<primeiros 64 bytes de 0.part>, session.mime)`. Se falhar, apagar a sessão e responder 403/415.
- **P2 — CSP `sandbox` em PDF (2.4, 2.4.1).** `uploadedFileHeaders` passa a receber o caminho: sempre `nosniff`; `default-src 'none'; sandbox` só quando a extensão não for `.pdf`. Em `express.static`, `setHeaders(res, filePath)` já recebe o caminho.
- **P3 — 413 em HTML no envio único (3.2).** Reduzir `express.raw` de `151mb` para `uploadMaxSize` e responder erros `entity.too.large` em JSON num middleware de erro.

### 2. Rolagens no servidor — `src/domain/serverDice.mjs` + evento `dice:roll` (feito em `af96ce7`, `23c47e7`)

`server.js` carrega o módulo ESM com `import()` e só abre a porta depois (`diceReady`). Sorteador: `secureRandom = () => crypto.randomInt(0, 2**32) / 2**32`, em [0, 1).

`resolveRoll({kind, params}, rng, {lastAlpha})` valida os parâmetros e chama a função de domínio existente:

| `kind` | Função | Parâmetros validados |
|---|---|---|
| `triangle` | `triangleAgency` | — |
| `daggerheart` | `daggerheart` | atributo −10..20, modificador −50..50, dificuldade 1..100 |
| `vampireV5` | `vampireV5` | parada 1..30, Fome 0..5, sucessos 1..30 |
| `cthulhu` | `cthulhu7` | perícia 0..100 |
| `dnd` | `dnd5` | vantagem, atributo 1..30, proficiência, modificador, CD, tipo |
| `sacramento` | `sacramento` | atributos 0..20, dor 0..6, regra opcional |
| `ordem` | `ordemBasic` / `ordemWithPavor` | dados d4–d20, DT |
| `cairn` | `cairnSave` | atributo 0..20 |
| `alpha2` | `vampireAlpha2` | parada 1..100, Fome 0..5, dificuldade |
| `alpha2Reroll` | `alphaReroll` | `rollId` igual ao `lastAlpha` da conexão, uma vez, até 3 dados comuns |
| `expression` | `rollExpression` | expressão explícita até 20 caracteres |
| `free` | `die` | d4–d100, 1..20 dados |

Evento `dice:roll` no socket:
- Limite de 20 rolagens por 10 s por conexão.
- Guarda `lastAlpha` para a rerrolagem.
- Para `triangle`/`daggerheart`, se o sistema da mesa bate, entra na fila da mesa e chama `recordRoll(state, system, socket.data.name, result)`, que mantém o cálculo de Caos (6 − número de 3s, zero na Triscendência, teto 999), o de Medo (+1 com Medo, teto 12) e o histórico de 30 itens.
- `ack({ok, result, rollId?, recorded?, warning?})`.

Cliente: `rollDice(kind, params)` em `AstralisApp.jsx` rejeita sem conexão e após 8 s. `CharacterStudio.jsx` usa `rollDice` em `SkillCheck`, `VampireAlpha2Roller` (rolagem e rerrolagem), `SheetArsenal` e `DiceTray`. "Usar metade" segue local.

**Pendente:**
- **P4 — `dice:record` ainda ativo (2.9.1).** Hoje a ação sorteia no servidor, mas não devolve os dados e escapa do limite de rolagens: qualquer participante sobe Caos ou Medo em série. Remover o `case "dice:record"` de `applyAction`; a ação passa a cair em "Ação desconhecida".
- **P5 — inteiros (2.10.2.1).** `int()` aceita `2.9` e arredonda. Trocar por `Number.isInteger(n)`.
- **P6 — aviso de tempo esgotado (2.10.4.1).** A mensagem dos 8 s passa a ser "O servidor não respondeu a tempo. O resultado não chegou; confira o Escudo do Mestre antes de rolar de novo."

### 3. Entrada na mesa — `/join` na fila (feito em `af96ce7`)

`/join` valida nome e convite, depois executa leitura, checagem de vagas, inclusão e gravação dentro de `enqueueRoom`. Mesmas respostas e códigos. O aviso aos participantes (`broadcastRoom`) acontece depois da resposta, como antes.

### 4. Lobby — edição pendente (feito em `6614baa`)

`Lobby` ganhou `dirty`: `update` marca pendente; o `useEffect` só copia `room.campaign` quando não há pendência; salvar com `ok` ou "Descartar alterações" limpa a pendência. O payload de `campaign:update` não mudou.

**Pendente:**
- **P7 — digitação durante o salvamento (2.12.2).** Guardar uma cópia do formulário enviado; ao receber `ok`, limpar `dirty` só se o formulário atual for igual à cópia.

### 5. Perícias — domínio e ficha (feito em `25779c6`, `23c47e7`)

`systemSheetBlueprints.js` passou a exportar as listas e funções únicas de perícias: `DND_SKILLS`, `DND_SKILL_ABILITY`, `COC_SKILLS`, `V5_*`, `parseSkillMap`, `cocBaseValue`, `cocSkillValues`, `dndSkillBonus`, `v5SkillDots`. `CharacterStudio.jsx` usa essas exportações em vez das cópias locais.

- D&D: seletor de perícia; `dndSkillBonus` dá atributo, ⌊(valor − 10)/2⌋ e proficiência (×2 com especialização); opção manual mantida.
- CoC: seletor de perícia com o valor de `cocSkillValues` (salvo ou base); opção manual mantida.
- V5: seletor de atributo + perícia; parada = soma dos pontos; opção manual mantida.
- Ordem: `characterSheets.ts` grava em `skills` as faces do dado de perícia; `diceSkills` intacto.

**Pendente:**
- **P8 — valores-base de CoC congelados (2.18, 2.18.1).** Hoje o `save` reescreve `stats.skills` com todas as perícias, e Esquivar/Idioma Nativo param de acompanhar DES/EDU. Corrigir: `stats.skills` fica só com as perícias editadas; o valor completo vai para `sheet.skills`, passando para `buildCharacterSheet` um `builderStats.skills` montado com `cocSkillValues`.

### 6. Ferramentas (feito em `466fae1`)

`typescript ^5.9.3`; `npm test` = `node --test tests/*.test.cjs tests/*.test.mjs`; `v150-model.test.cjs` usa `require('typescript')`; os testes de "não versionado" checam `.gitignore` e `git ls-files`.

**Pendente:**
- **P9 — artefato de revisão.** A pasta `semantic-review/` gerada pela revisão fica fora do git (`.gitignore`) ou é movida para `docs/`. Decisão: entrada no `.gitignore`.

## Correctness Properties

| # | Propriedade | Requisitos |
|---|---|---|
| CP1 | Para todo `path` com C(X) de caminho, `private-file` e `signed-url` respondem 4xx sem ler disco ou Storage | 2.1, 2.7, 2.8 |
| CP2 | Para todo arquivo gravado, a família dos bytes é a do MIME, e a extensão no disco vem de `extensionFor(mime)` | 2.2, 2.2.1, 2.3 |
| CP3 | Para todo jogador, `uploadAllowed` decide; o `kind` do cliente não altera o resultado | 2.5, 2.6 |
| CP4 | Nenhum valor de dado vindo do cliente aparece num resultado; todo dado sai de `secureRandom` | 2.9, 2.9.1, 2.10.1 |
| CP5 | Para todo `rng` em [0, 1), `rollDie(s)` ∈ [1, s] | 2.10.1 |
| CP6 | Com N joins simultâneos e V vagas, aceitos = min(N, V) e nenhum jogador some | 2.11 |
| CP7 | Para toda ficha D&D, o bônus da perícia = ⌊(valor − 10)/2⌋ + {0, p, 2p} | 2.13 |
| CP8 | Para toda ficha CoC, `sheet.skills[n]` = valor editado ou base; `stats.skills` só contém editados | 2.18, 2.18.1 |
| CP9 | Para todo `Nome=dX\|dY` de Ordem, `skills[Nome] = X` e `diceSkills[Nome] = {X, Y}` | 2.17 |
| CP10 | Os resultados das funções de domínio com o mesmo `rng` são iguais antes e depois | 3.11 |

## Error Handling

| Situação | Resposta |
|---|---|
| Caminho inválido | `private-file`: 403; `signed-url`: 400 |
| Conteúdo não bate com o MIME | 415 `O conteúdo do arquivo não corresponde ao formato informado.`; sessão de envio apagada |
| Papel sem permissão para o tipo | 403 com mensagem por escopo (`uploadDeniedMessage`) |
| Corpo acima de 30 MB | 413 em JSON |
| Parâmetro de rolagem inválido | `ack({ok:false, error:"<campo>: …"})`, sem sorteio |
| Excesso de rolagens | `ack({ok:false, error:"Muitas rolagens seguidas…"})` |
| Rerrolagem fora da regra | `ack({ok:false})` com o motivo |
| Rolagem feita, registro no Escudo falhou | `ack({ok:true, result, recorded:false, warning})` |
| Sem conexão / tempo esgotado no cliente | Aviso na ficha; nenhum sorteio local |

## Testing Strategy

### Exploratory Bug Condition Checking

Rodar contra o código antigo (`main`) para confirmar cada C(X): os testes de integração de `tests/v160-server-integration.test.mjs` sobem o servidor real em modo local, com diretório temporário, e reproduzem A1–A6 (travessia, HTML disfarçado, upload de jogador, bucket arbitrário, `dice:record` forjado, seis joins para três vagas).

### Fix Checking

- `tests/v160-security-rules.test.mjs`: `sniffFamily` para cada família, `safeStoragePath`, `uploadAllowed` em toda a matriz papel × escopo × família, `resolveRoll` (faixas, rerrolagem, sorteador).
- `tests/v160-server-integration.test.mjs`: cada correção pela API e pelo socket.
- `tests/v160-skills.test.mjs`: `dndSkillBonus`, `cocSkillValues`, `v5SkillDots`, `buildCharacterSheet` de Ordem e CoC.

Testes a acrescentar para as pendências:
- P1: sessão de envio com `0.part` adulterado ou papel sem permissão é recusada no `complete`.
- P2: `/files/.../x.pdf` sem `sandbox`, `/files/.../x.png` com `sandbox`, ambos com `nosniff`.
- P3: envio único de 31 MB responde 413 em JSON.
- P4: `room:action` com `dice:record` responde `ok:false` e não altera `tracker`.
- P5: `resolveRoll` recusa `pool: 2.9`.
- P8: salvar CoC sem editar mantém `stats.skills` vazio e `sheet.skills.Esquivar = ⌊DES/2⌋`.
- Cobertura que faltou na revisão: JPEG, WebP, WAV, WebM, MP4, MP3 por frame sync, DOCX; limite de rolagens; rerrolagem Alpha pelo socket; Medo com teto 12 e histórico de 30.

### Preservation Checking

- Os testes antigos (`v14-*`, `v142-*`, `v150-*`, `vampire-alpha2`) continuam passando sem alteração de asserções de regra.
- CP10: para cada função de domínio, o mesmo `rng` fixo produz o mesmo resultado antes e depois.
- Verificação manual no navegador, modo local e produção de teste: abrir PDF de Documentos do Mestre e da Biblioteca no Chrome; enviar mapa, música e retrato; rolar em cada sistema; dois navegadores entrando ao mesmo tempo.
