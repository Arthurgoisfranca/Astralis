# Changelog

## 1.6.0 — refatoração e evolução (branch `refactor/fases-1-6`)

### Segurança
- Chave Supabase removida do repositório; `.env.example` deixou de ser versionado.
- Travessia de caminho bloqueada; upload valida tipo real (magic bytes) e papel; URL assinada restrita a buckets conhecidos.
- Todas as rolagens sorteadas no servidor (`crypto.randomInt`); ação legada `dice:record` desativada.
- `/join` processado na fila da mesa (sem corrida de vagas).

### Fichas e perícias
- Perícias ligadas às rolagens em D&D, Call of Cthulhu e Vampire V5.
- Ordem Paranormal 2: valor de perícia salvo corretamente.
- Call of Cthulhu: valores-base permanecem dinâmicos.

### Contas, papéis e convites
- Papéis por mesa: mestre, co-mestre, jogador, espectador.
- Convites com validade, limite de usos e revogação; remoção de participante.
- LGPD: exportar dados e excluir conta.

### Sistema "Outros"
- Construtor de ficha universal: campos tipados, seções reordenáveis, fórmulas seguras (sem `eval`), rolagens por campo, templates versionados, importar/exportar JSON.

### Agendamento
- Horário em UTC exibido no fuso de cada participante, duração, recorrência, link e confirmação de presença (RSVP).

### Durante a sessão
- Chat com histórico compartilhado de rolagens, rastreador de iniciativa e névoa de guerra no mapa.

### Design
- Identidade astral com paleta 60-30-10 em design tokens, fundo estelar, piso de legibilidade e foco acessível.

### Ferramentas e limpeza
- TypeScript 5.9; ESLint 10 (`npm run lint`, `npm run check`); testes `.cjs` e `.mjs`.
- Remoção de componentes mortos, CSS órfão e dependências sem uso; carregamento sob demanda dos módulos pesados.
- Documentos de preservação da v1.4 movidos para `docs/historico/`.
