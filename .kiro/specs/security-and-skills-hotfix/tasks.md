# Implementation Plan — segurança e perícias

Tarefas marcadas `[x]` foram implementadas e testadas nos commits indicados. As abertas vêm das pendências P1–P9 do `design.md`.

- [x] 1. Restaurar as ferramentas de validação (commit `466fae1`)
  - Fixar `typescript` em `^5.9.3` e atualizar o `package-lock.json`
  - `npm test` executa `tests/*.test.cjs` e `tests/*.test.mjs`
  - `tests/v150-model.test.cjs` carrega `require('typescript')`
  - `tests/v14-safe-merge.test.cjs` e `tests/v150-official.test.mjs` checam `.gitignore` e `git ls-files` em vez do disco
  - _Requirements: 1.18, 1.19, 1.20, 1.21, 2.19, 2.20, 2.21, 2.22, 3.15_

- [x] 2. Escrever os testes que reproduzem os defeitos (commit `af96ce7`)
  - [x] 2.1 Teste de integração com o servidor real em modo local e diretório temporário (`tests/v160-server-integration.test.mjs`)
    - Travessia em `private-file`, HTML disfarçado de PNG, upload de jogador fora das regras, bucket arbitrário, `dice:record` forjado, seis joins para três vagas
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.7, 1.9, 1.10, 1.11_
  - [x] 2.2 Testes de regras isoladas (`tests/v160-security-rules.test.mjs`)
    - `sniffFamily`, `safeStoragePath`, `uploadAllowed`, `resolveRoll`
    - _Requirements: 2.2, 2.5, 2.6, 2.8, 2.10.2_

- [x] 3. Corrigir o acesso e o tipo dos arquivos (commit `af96ce7`)
  - [x] 3.1 Criar `server/fileSecurity.js` com `sniffFamily`, `contentMatchesMime`, `extensionFor`, `safeStoragePath` e `uploadAllowed`
    - _Requirements: 2.1, 2.2, 2.3, 2.5_
  - [x] 3.2 `private-file` e `files/signed-url` validam caminho e bucket antes de ler
    - _Requirements: 2.1, 2.1.1, 2.7, 2.8, 3.1_
  - [x] 3.3 `storeFile` confere o conteúdo e nomeia pelo tipo; `uploads/start`, `uploads` e o bloco 0 aplicam `uploadAllowed` e o tipo real
    - _Requirements: 2.2, 2.3, 2.5, 2.6, 3.2, 3.3, 3.4_
  - [x] 3.4 Cabeçalhos `nosniff` e CSP nos arquivos servidos no modo local
    - _Requirements: 2.4_

- [x] 4. Sortear todas as rolagens no servidor (commits `af96ce7`, `23c47e7`)
  - [x] 4.1 Criar `src/domain/serverDice.mjs` (`resolveRoll`, `RECORDED_KINDS`) sobre as funções de domínio existentes
    - _Requirements: 2.10.1, 2.10.2, 2.10.3, 3.11_
  - [x] 4.2 Evento `dice:roll` com `crypto.randomInt`, limite de 20 rolagens por 10 s, `lastAlpha` e `recordRoll` na fila da mesa
    - _Requirements: 2.9, 2.10, 2.10.3, 3.5_
  - [x] 4.3 `rollDice` no cliente e uso em `SkillCheck`, `VampireAlpha2Roller`, `SheetArsenal` e `DiceTray`, sem sorteio local
    - _Requirements: 2.10.1, 2.10.4, 2.10.5, 3.6, 3.11.1_

- [x] 5. Processar `/join` na fila da mesa (commit `af96ce7`)
  - _Requirements: 2.11, 3.7, 3.8_

- [x] 6. Corrigir as perícias (commits `25779c6`, `23c47e7`)
  - [x] 6.1 Ordem Paranormal 2 grava as faces do dado de perícia em `skills`
    - _Requirements: 2.17, 3.10_
  - [x] 6.2 Centralizar listas e cálculos de perícias em `systemSheetBlueprints.js`
    - _Requirements: 2.13, 2.14, 2.15_
  - [x] 6.3 Seletores de perícia nas rolagens de D&D, Call of Cthulhu e Vampire V5, com entrada manual mantida
    - _Requirements: 2.13, 2.14, 2.15, 2.16, 3.12_
  - [x] 6.4 Testes de perícias (`tests/v160-skills.test.mjs`)
    - _Requirements: 2.13, 2.14, 2.15, 2.17_

- [x] 7. Manter a edição pendente da campanha no lobby (commit `6614baa`)
  - _Requirements: 2.12, 2.12.1, 3.9_

- [x] 8. Fechar as brechas restantes de upload (commit `ca1fbf5`)
  - [x] 8.1 Em `uploads/:id/complete`, conferir `uploadAllowed(session.role, session.scope, session.mime)` e o tipo real dos primeiros bytes de `0.part` antes de gravar no disco ou no Storage (inclusive o envio grande via TUS); se falhar, apagar a sessão e responder 403 ou 415 (P1)
    - _Requirements: 2.2.1, 2.5, 2.6_
  - [x] 8.2 `uploadedFileHeaders(res, filePath)`: `nosniff` sempre; CSP `default-src 'none'; sandbox` só fora de `.pdf`; aplicar em `/files/*` e em `private-file` (P2)
    - _Requirements: 2.4, 2.4.1, 3.1_
  - [x] 8.3 Limitar `express.raw` do envio único a `uploadMaxSize` e responder `entity.too.large` em JSON num middleware de erro (P3)
    - _Requirements: 3.2_
  - [x] 8.4 Testes: `complete` recusa sessão com `0.part` adulterado e papel sem permissão; PDF sem `sandbox` e PNG com `sandbox`, ambos com `nosniff`; envio único de 31 MB responde 413 em JSON
    - _Requirements: 2.2.1, 2.4, 2.4.1, 3.2_

- [x] 9. Fechar as brechas restantes das rolagens (commit `ca1fbf5`)
  - [x] 9.1 Remover o `case "dice:record"` de `applyAction` (P4)
    - _Requirements: 2.9.1_
  - [x] 9.2 `int()` em `serverDice.mjs` recusa valores não inteiros (P5)
    - _Requirements: 2.10.2.1_
  - [x] 9.3 Mensagem de tempo esgotado em `rollDice`: o resultado não chegou e pode ter sido registrado no Escudo (P6)
    - _Requirements: 2.10.4.1_
  - [x] 9.4 Testes: `dice:record` responde `ok:false` sem alterar o `tracker`; `resolveRoll` recusa `2.9`; limite de 20 rolagens por 10 s; rerrolagem Alpha 2.0 pelo socket (uma vez, só a última rolagem); Medo com teto 12 e histórico de 30 itens
    - _Requirements: 2.9.1, 2.10.2.1, 2.10.3, 3.5_

- [x] 10. Não perder a digitação durante o salvamento da campanha (commit `9ec1600`)
  - [x] 10.1 Guardar a cópia do formulário enviado e só limpar `dirty` se o formulário atual for igual a ela (P7)
    - _Requirements: 2.12.2, 3.9_

- [x] 11. Manter os valores-base de Call of Cthulhu dinâmicos (commit `9ec1600`)
  - [x] 11.1 No `save` de `CharacterStudio.jsx`, deixar `stats.skills` só com as perícias editadas e passar a `buildCharacterSheet` um `builderStats.skills` montado com `cocSkillValues` (P8)
    - _Requirements: 2.18, 2.18.1, 3.10_
  - [x] 11.2 Teste: salvar ficha CoC sem editar perícias mantém `stats.skills` sem as perícias-base e grava `sheet.skills.Esquivar = ⌊DES/2⌋` e `sheet.skills["Idioma · Nativo"] = EDU`
    - _Requirements: 2.18, 2.18.1_

- [x] 12. Ampliar os testes de tipo real (commit `ca1fbf5`)
  - Assinaturas de JPEG, WebP, WAV, WebM, MP4/M4A, MP3 por frame sync e DOCX em `sniffFamily`, cada uma aceita com o MIME certo e recusada com outro
  - _Requirements: 2.2_

- [x] 13. Arrumar os artefatos da revisão (commit `ef4c1a1`)
  - Adicionar `semantic-review/` ao `.gitignore` (P9)
  - _Requirements: 3.15_

- [ ] 14. Checkpoint — validar tudo
  - [x] Rodar `npm run typecheck`, `npm test` (60/60) e `npm run build`; todos passam
  - [x] Teste com o build real em modo local: `/api/health`, `index.html`, bundle, rota `/join/...` e JSON malformado respondendo 400 em JSON
  - [ ] Conferência manual no Chrome (abaixo), feita pelo usuário
  - Subir o servidor em modo local e conferir no Chrome: abrir PDF de Documentos do Mestre e da Biblioteca; enviar mapa, música e retrato; rolar em cada sistema; dois navegadores entrando ao mesmo tempo
  - Perguntar ao usuário se há dúvidas antes do merge na `main`
  - _Requirements: 3.1–3.15_
