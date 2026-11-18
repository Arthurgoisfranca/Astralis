# Requisitos — agendamento (bloco e)

## Introdução
Hoje `appointments` guarda data/hora como texto, sem fuso, recorrência nem confirmação de presença. Este bloco estende o agendamento mantendo o que existe.

## Requisitos
### R1 — Sessão agendada
- 1.1 QUANDO o mestre cria uma sessão ENTÃO DEVE informar título, data, hora, duração, local/link e resumo; o horário é guardado em UTC (ISO) e exibido no fuso do navegador de cada um.
- 1.2 QUANDO a sessão tem recorrência ENTÃO DEVE aceitar: nenhuma, semanal, quinzenal ou mensal.
- 1.3 QUANDO sessões antigas (texto `date`/`time`) existem ENTÃO DEVEM continuar aparecendo sem quebrar.

### R2 — Presença (RSVP)
- 2.1 QUANDO um participante vê uma sessão ENTÃO DEVE poder marcar "Vou", "Talvez" ou "Não vou".
- 2.2 QUANDO marca presença ENTÃO a escolha DEVE ser por participante e visível ao grupo (contagem por opção).
- 2.3 QUANDO o espectador vê a sessão ENTÃO PODE marcar presença, mas não criar nem apagar sessões.

### R3 — Gestão
- 3.1 QUANDO o mestre/co-mestre apaga uma sessão ENTÃO ela some para todos.
- 3.2 QUANDO existem sessões futuras ENTÃO a próxima DEVE aparecer em destaque no lobby.

## Preservado
- P1 `appointment:add`/`appointment:delete` continuam funcionando; sessões antigas aparecem.
- P2 `npm run check` limpo.
