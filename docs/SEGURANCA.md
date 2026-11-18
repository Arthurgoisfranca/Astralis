# Segurança — Astralis

Itens testados e corrigidos. Testes automatizados em `tests/v160-*`, `v170-*`, `v180-*`.

## Resultado por item

| Item | Resultado | Evidência / correção |
|---|---|---|
| Segredo no repositório | Corrigido | `.env.example` removido do git (`ef4c1a1`); README documenta só nomes. **Revogar a chave antiga no Supabase continua a cargo do dono.** Teste varre arquivos versionados por chaves. |
| Travessia de caminho (upload/arquivo) | Aprovado | `safeStoragePath` rejeita `..`, `.`, vazio, `\`, NUL; checado antes de ler. `tests/v160-server-integration` A1. |
| Tipo real de arquivo | Aprovado | `sniffFamily` por magic bytes; extensão derivada do tipo; `nosniff` nos estáticos. A2. |
| Upload por papel | Aprovado | `uploadAllowed` ignora `kind` do cliente; rechecagem no `complete`. A3. |
| URL assinada | Aprovado | bucket restrito à lista e caminho validado. A4. |
| Rolagem forjada | Aprovado | sorteio no servidor com `crypto.randomInt`; `dice:record` desativada; autor = `socket.data.name`. A5. |
| Corrida na entrada | Aprovado | `/join` na fila da mesa; vagas consistentes. A6. |
| Autorização por papel | Aprovado | `roleCan`/`requireOwner`/`requireManager`/`denySpectator`; checado no servidor por ação. `tests/v170`. |
| IDOR entre mesas | Aprovado | ações validam dono; `publicState` filtra por papel e sala. |
| Fórmula de ficha (sem eval) | Aprovado | `evalFormula` com parser próprio; sem `eval`/`Function`. `tests/v180`. |
| XSS | Aprovado | sem `dangerouslySetInnerHTML`/`innerHTML`; conteúdo renderizado como texto; `nosniff`. |
| Convites | Aprovado | validade, limite de usos, revogação imediata. `tests/v170`. |
| LGPD | Aprovado | exportar e excluir conta (`/api/account/export`, `/api/account/delete`). |
| `.gitignore` | Aprovado | `.env`, `dist/`, `node_modules/`, `data/`, `semantic-review/` ignorados; teste confere. |

## Pendências (fora do escopo dos blocos a–g, recomendadas)

- Cabeçalhos CSP/HSTS globais (`helmet`) e CORS negado por padrão sem `CORS_ORIGIN`.
- Rate limit por IP nas rotas HTTP (há limite por socket nas rolagens).
- `npm audit`: 4 altas em `picomatch ≤4.0.7` via Vite (build apenas, não chega ao runtime); sem correção publicada.
- Rodar a migração `supabase/migrations/20261118_v16_roles.sql` ao publicar.
