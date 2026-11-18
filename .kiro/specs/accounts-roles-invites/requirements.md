# Requisitos — contas, papéis e convites (bloco c)

## Introdução

O Astralis já tem Supabase Auth (e-mail/senha, Google, GitHub, recuperação, verificação de e-mail e perfil com avatar) e a tabela `account_rooms` que liga conta a mesa com papel. O acesso à mesa, porém, é por token de convite que não expira, não tem limite de uso e não pode ser revogado; os papéis são só `gm` e `player`; e não há como remover um jogador. Este bloco fecha essas lacunas.

O que já existe não é refeito. O trabalho é incremental sobre o modelo de token de sala e o estado JSON da mesa, funcionando nos dois modos (Supabase e SQLite local).

Fora de escopo (blocos seguintes): sistema "Outros", agendamento, chat/iniciativa, redesenho.

## Requisitos

### R1 — Papéis por mesa
**História:** Como mestre, quero dar papéis diferentes aos participantes, para controlar o que cada um faz.
- 1.1 QUANDO o mestre define o papel de um participante ENTÃO o sistema DEVE aceitar `gm`, `coGm`, `player` ou `spectator`.
- 1.2 QUANDO um `coGm` age na mesa ENTÃO o sistema DEVE conceder as mesmas permissões do mestre, exceto encerrar a mesa, trocar papéis e revogar convites.
- 1.3 QUANDO um `spectator` age na mesa ENTÃO o sistema DEVE permitir só leitura: sem criar ficha, enviar arquivo, mover token ou rolar na mesa.
- 1.4 QUANDO o estado da mesa é lido por um participante ENTÃO o sistema DEVE continuar escondendo dele o que já esconde hoje de um `player`, para `spectator` e `player`.
- 1.5 QUANDO uma ação exige papel ENTÃO a checagem DEVE ocorrer no servidor, por mesa e por participante.

### R2 — Convite seguro
**História:** Como mestre, quero convites com validade e limite, para controlar quem entra.
- 2.1 QUANDO o mestre gera um convite ENTÃO o sistema DEVE criar um token aleatório com validade e limite de usos definidos por ele (ou padrão: 7 dias, usos ilimitados).
- 2.2 QUANDO um convite expira ou atinge o limite de usos ENTÃO o sistema DEVE recusar a entrada com mensagem clara.
- 2.3 QUANDO o mestre revoga ou regenera o convite ENTÃO o token antigo DEVE parar de funcionar imediatamente.
- 2.4 QUANDO alguém entra por convite ENTÃO o sistema DEVE registrar o uso e descontar do limite, dentro da fila da mesa (sem condição de corrida).
- 2.5 QUANDO o convite define o papel de entrada ENTÃO novos participantes DEVEM receber esse papel (padrão `player`).

### R3 — Gestão de participantes
**História:** Como mestre, quero administrar quem está na mesa.
- 3.1 QUANDO o mestre remove um participante ENTÃO o sistema DEVE invalidar o token dele, desconectá-lo e liberar a vaga.
- 3.2 QUANDO o mestre muda o papel de um participante ENTÃO a mudança DEVE valer na próxima ação dele, sem precisar reentrar.
- 3.3 QUANDO um participante é removido ENTÃO a ficha e as anotações dele DEVEM permanecer na mesa (não são apagadas).

### R4 — Conta e mesa
**História:** Como usuário, quero minhas mesas ligadas à minha conta.
- 4.1 QUANDO um usuário logado cria ou entra numa mesa ENTÃO o sistema DEVE continuar vinculando a mesa à conta (`account_rooms`), agora com os quatro papéis.
- 4.2 QUANDO o mesmo usuário é mestre numa mesa e jogador em outra ENTÃO o sistema DEVE manter papéis independentes por mesa.
- 4.3 QUANDO o Supabase não está configurado (modo local) ENTÃO tudo isto DEVE funcionar só com o token de sala, sem exigir conta.

### R5 — LGPD mínima
**História:** Como usuário, quero controlar meus dados.
- 5.1 QUANDO o usuário logado pede a exportação ENTÃO o sistema DEVE devolver em JSON o perfil e a lista de mesas vinculadas.
- 5.2 QUANDO o usuário logado exclui a conta ENTÃO o sistema DEVE remover o perfil e os vínculos de mesa; as mesas em si permanecem para os outros participantes.

## Comportamento preservado (não quebrar)
- P1 Login, cadastro, recuperação, OAuth e perfil continuam como hoje.
- P2 Links de convite atuais continuam funcionando até expirarem ou serem revogados; mesas já criadas continuam acessíveis.
- P3 Todas as permissões `requireGM` de hoje continuam valendo para `gm` e passam a valer também para `coGm` onde fizer sentido (R1.2).
- P4 Modo local (SQLite) continua funcionando sem conta.
- P5 Os 59 testes atuais continuam passando; build, lint e typecheck continuam limpos.
