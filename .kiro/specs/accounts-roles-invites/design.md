# Design — contas, papéis e convites (bloco c)

## Visão geral

Estende o modelo atual (token de sala + estado JSON) em vez de reescrever a autenticação. Funciona nos dois modos. Papéis, convites e participantes ficam no `state` da mesa, que já é lido e gravado pela fila por mesa (`enqueueRoom`), então herdam a serialização que resolve condições de corrida.

## Modelo de dados

No `state` da mesa (sem migração nova; `normalizeState` preenche defaults em mesas antigas):

```
state.members: [{ id, token, name, role, userId?, removed? }]   // substitui/expande state.players
state.invites: [{ token, role, expiresAt, maxUses, uses, createdAt, revoked }]
```

- `members` unifica o mestre e os participantes. O `gm_token` da linha continua válido e mapeia para o membro `role:"gm"` (compatibilidade).
- `normalizeState` converte `players` antigos em `members role:"player"` e cria um convite a partir do `invite_token` legado (R-P2).
- Nenhuma coluna nova obrigatória. `account_rooms.role` passa a aceitar os quatro papéis: migração só altera o `check` constraint.

## Permissões

`roleCan(role, action)` central no servidor:

| Ação | gm | coGm | player | spectator |
|---|---|---|---|---|
| Editar campanha, módulos, mapa, NPCs, handouts, lore, escudo, docs | ✓ | ✓ | — | — |
| Encerrar mesa, trocar papéis, revogar/gerar convite, remover membro | ✓ | — | — | — |
| Criar/editar própria ficha, mover próprio token, rolar, notas próprias | ✓ | ✓ | ✓ | — |
| Ler estado visível | ✓ | ✓ | ✓ | ✓ |

- `requireGM(socket)` passa a `requireManager(socket)` = `gm` ou `coGm`, menos as ações exclusivas do mestre, que usam `requireOwner`.
- `publicState` trata `spectator` como `player` para o que é escondido; `coGm` como `gm`.

## Convites

- `createInvite(room, { role, ttlMs, maxUses })` gera token (`crypto`), grava em `state.invites`.
- `/join` e o handshake do socket procuram o token em `invites` (ativo, não expirado, com uso disponível) ou no `gm_token`/token de membro. Uso é descontado dentro de `enqueueRoom`.
- Ações novas (socket, `requireOwner`): `invite:create`, `invite:revoke`, `member:role`, `member:remove`.
- `member:remove` marca `removed:true`, derruba os sockets daquele `userId`/token (`io.in(room).fetchSockets()` + `disconnect`), e libera vaga.

## Conta (só modo Supabase)

- `/api/account/export` (GET, `accountUser`): devolve perfil + `account_rooms` do usuário em JSON.
- `/api/account/delete` (POST, `accountUser`): apaga `user_profiles` e `account_rooms` do usuário; `supabase.auth.admin.deleteUser`. Mesas permanecem.
- `account_rooms.role` constraint estendido para os quatro papéis.

## Erros
- Convite expirado/esgotado/revogado: 403 com motivo específico.
- Ação sem permissão: `ack({ok:false, error})` / 403, sem detalhe interno.

## Testes
- Unidade: `roleCan` para a matriz inteira; `createInvite`/validação (expiração, limite, revogação).
- Integração (servidor real, modo local): convite expira e é recusado; limite de usos; revogar derruba o token; co-mestre edita campanha mas não troca papéis; espectador não rola nem envia; remover participante derruba o socket e libera vaga; migração de `players` legado para `members`.
- Preservação: os 59 testes atuais; link legado ainda entra.
