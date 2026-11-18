# Tarefas — contas, papéis e convites (bloco c)

- [ ] 1. Modelo de membros e convites no estado
  - `normalizeState`: migrar `players` → `members`, criar convite do `invite_token` legado, default `invites: []`
  - `identify`/handshake aceitam token de membro ou convite válido; defaults em mesas antigas
  - Teste: mesa legada abre com um membro `gm`, os `players` viram `members`, link antigo ainda entra
  - _Req: R4.1, R-P2, R-P4_

- [ ] 2. Permissões por papel
  - `roleCan(role, action)` + `requireManager`/`requireOwner`; `publicState` trata `coGm`=gm e `spectator`=player
  - Trocar os `requireGM` por `requireManager` (ações de gestão) ou `requireOwner` (encerrar, papéis, convites)
  - Teste unitário da matriz; integração: coGm edita campanha, não troca papéis; spectator só lê
  - _Req: R1.1–R1.5, R-P3_

- [ ] 3. Convites
  - `createInvite`, validação (expiração, limite, revogação); `/join` e handshake consomem uso na fila
  - Ações `invite:create`, `invite:revoke` (requireOwner)
  - Teste: expiração, limite de usos, revogação imediata, papel de entrada
  - _Req: R2.1–R2.5_

- [ ] 4. Gestão de participantes
  - Ações `member:role`, `member:remove` (requireOwner); remover derruba sockets e libera vaga; ficha preservada
  - Teste: trocar papel vale na ação seguinte; remover desconecta e mantém a ficha
  - _Req: R3.1–R3.3_

- [ ] 5. UI da mesa
  - Painel do mestre: criar/revogar convite (validade, usos, papel), lista de participantes com trocar papel e remover
  - Esconder ações de escrita para `spectator`
  - _Req: R1.3, R2.1, R3.1, R3.2_

- [ ] 6. Conta e LGPD (modo Supabase)
  - Migração: `account_rooms.role` aceita os quatro papéis
  - `/api/account/export` e `/api/account/delete`; botões no perfil
  - Teste: export devolve perfil+mesas; delete remove vínculos e mantém as mesas
  - _Req: R4.1, R4.2, R5.1, R5.2_

- [ ] 7. Checkpoint
  - `npm run check` (lint, typecheck, testes, build) limpo; smoke local; conferência no Chrome
  - Atualizar `docs/DIAGNOSTICO.md`
  - _Req: R-P1, R-P5_
