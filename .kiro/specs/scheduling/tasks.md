# Tarefas — agendamento (bloco e)

- [x] 1. Servidor: estender `appointment:add` (startsAt ISO UTC, durationMin, recurrence, link), ação `appointment:rsvp` (qualquer participante não-espectador-bloqueado), manter campos legados; `appointment:delete` segue gestor
- [x] 2. UI Agenda: formulário com data/hora local → UTC, duração, recorrência, link; lista com próxima sessão, horário no fuso local e botões Vou/Talvez/Não vou com contagem
- [x] 3. Lobby: próxima sessão em destaque no fuso local
- [x] 4. Testes: criação com UTC, RSVP por participante, recorrência registrada, sessão antiga ainda aparece
- [x] 5. Checkpoint: `npm run check`, smoke
