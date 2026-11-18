# Bugfix Requirements Document — segurança e perícias (blocos a + b)

## Introduction

Esta correção cobre os problemas de gravidade alta levantados em `docs/DIAGNOSTICO.md` que podem ser corrigidos sem criar funcionalidades novas:

- Falhas de segurança exploráveis por qualquer jogador convidado (IDs A1 a A6).
- Perícias que não chegam às rolagens ou não são salvas (A7 a A9 e M1).
- Ferramentas que impedem build e testes de provar que nada quebrou (A10, M14 e M15).

Impacto para o usuário hoje:

- Um jogador consegue ler documentos do Mestre e de outras mesas.
- Um jogador consegue publicar HTML que roda no domínio da aplicação.
- Um jogador consegue forjar resultados de dados.
- Todas as rolagens da ficha são sorteadas no navegador, onde podem ser manipuladas.
- O Mestre perde edições da campanha ainda não salvas.
- A aba Rolagens ignora as perícias preenchidas na ficha.

Fora do escopo, porque entram nos blocos seguintes: contas obrigatórias, papéis por mesa, expiração de convite, rate limit, cabeçalhos CSP/HSTS, padrão de CORS, mensagens de erro internas, sistema "Outros", agendamento, chat, iniciativa e redesenho.

Convenção: "Mestre" é quem usa o `gm_token` da mesa. "Jogador" é quem entrou com o `invite_token`. "Modo local" é o servidor sem credenciais do Supabase, usando SQLite e disco.

## Bug Analysis

### Current Behavior (Defect)

**Acesso a arquivos privados (A1)**

1.1 QUANDO um jogador pede `GET /api/rooms/:roomId/private-file` no modo local com um `path` como `<sala>/<seuId>/../gm/arquivo.pdf` ou `<sala>/<seuId>/../../<outraSala>/...` ENTÃO o sistema valida o dono pelo segundo segmento do texto bruto, normaliza o `..` depois e entrega o arquivo de outro usuário ou de outra mesa.

**Tipo real dos arquivos enviados (A2)**

1.2 QUANDO um usuário envia um arquivo pelas rotas de upload ENTÃO o sistema aceita o tipo declarado pelo cliente (`Content-Type` ou campo `mime`) sem conferir o conteúdo.

1.3 QUANDO o arquivo enviado tem nome com extensão própria, como `pagina.html`, ENTÃO o sistema grava o arquivo com essa extensão, mesmo que o tipo declarado seja `image/png`.

1.4 QUANDO o modo local serve um arquivo de `/files/mesa-assets` ou `/files/mesa-community` ENTÃO o sistema escolhe o `Content-Type` pela extensão e não envia `X-Content-Type-Options: nosniff`. Um `.html` disfarçado roda como página no domínio da aplicação.

**Permissão de upload do jogador (A3)**

1.5 QUANDO um jogador envia `kind: "character"` ENTÃO o sistema permite gravar qualquer tipo aceito (PDF, DOCX, áudio, imagem) nos espaços `public` e `private` da mesa, porque o `kind` informado pelo cliente libera a permissão.

1.6 QUANDO um jogador escolhe o escopo `community` ENTÃO o sistema aceita qualquer tipo aceito, sem checar se é PDF.

**URL assinada (A4)**

1.7 QUANDO um participante chama `POST /api/rooms/:roomId/files/signed-url` com um `bucket` qualquer ENTÃO o sistema assina a URL desse bucket, mesmo fora dos três buckets da aplicação.

1.8 QUANDO o `path` contém segmentos `..` ou `.` ENTÃO o sistema faz a checagem de dono sobre o texto bruto.

**Rolagens registradas (A5)**

1.9 QUANDO um participante envia a ação `dice:record` ENTÃO o sistema grava os valores dos dados enviados pelo cliente e atualiza Caos (Triangle Agency) ou Medo (Daggerheart) a partir deles.

1.10 QUANDO um participante envia `dice:record` com um `actor` qualquer ENTÃO o sistema registra a rolagem com esse nome e permite se passar por outro participante.

1.10.1 QUANDO um participante rola na ficha (aba Rolagens de qualquer sistema, rolador do Vampire Alpha 2.0, rerrolagem com Vontade, Arsenal de armas ou Dados avulsos) ENTÃO o sistema sorteia os dados no navegador com `Math.random`, e o resultado não tem nenhuma garantia de que não foi alterado.

**Entrada concorrente na mesa (A6)**

1.11 QUANDO dois jogadores entram ao mesmo tempo, ou um jogador entra enquanto outra ação da mesa está sendo gravada, ENTÃO o sistema lê, altera e grava o estado fora da fila da mesa. Uma das gravações se perde, e a mesa pode aceitar mais jogadores do que vagas.

**Edição da campanha (A7)**

1.12 QUANDO o Mestre está editando os dados da campanha no lobby e chega qualquer atualização da mesa (música, ação de jogador, presença) ENTÃO o sistema substitui o formulário pelos dados do servidor e apaga a edição não salva.

**Perícias nas rolagens (A8)**

1.13 QUANDO um jogador de D&D 5E ou D&D 5.5E abre a aba Rolagens ENTÃO o sistema pede atributo e proficiência à mão (padrões 10 e 0) e não oferece as perícias da ficha. A proficiência ou especialização marcada não entra na rolagem.

1.14 QUANDO um jogador de Call of Cthulhu abre a aba Rolagens ENTÃO o sistema pede a porcentagem à mão (padrão 50) e ignora as porcentagens preenchidas na ficha.

1.15 QUANDO um jogador de Vampire V5 abre a aba Rolagens ENTÃO o sistema pede o tamanho da parada à mão (padrão 6) e ignora atributos e perícias da ficha.

**Perícias de Ordem Paranormal 2 (A9)**

1.16 QUANDO uma ficha de Ordem Paranormal 2 é salva com perícias no formato `Acrobacia=d6|d8` ENTÃO o sistema grava `skills` vazio (`{}`), porque a leitura só aceita valores numéricos.

**Valores-base de Call of Cthulhu (M1)**

1.17 QUANDO uma ficha de Call of Cthulhu é salva sem que o usuário tenha editado uma perícia ENTÃO o sistema não grava o valor-base que aparece na tela, como Escalar 20, Esquivar = DES/2 e Idioma Nativo = EDU.

**Ferramentas de validação (A10, M14, M15)**

1.18 QUANDO as dependências são instaladas ENTÃO o sistema instala o `typescript` 7 preview, que não tem API JavaScript, e `tests/v14-sanity.test.cjs` falha com `Cannot read properties of undefined (reading 'ReactJSX')`.

1.19 QUANDO `tests/v150-model.test.cjs` roda fora da máquina original ENTÃO o teste falha com `MODULE_NOT_FOUND`, porque carrega o TypeScript de um caminho fixo do Linux (`/opt/nvm/...`).

1.20 QUANDO os testes rodam num projeto com dependências instaladas ou build feito ENTÃO `tests/v14-safe-merge.test.cjs` e `tests/v150-official.test.mjs` falham, porque exigem que `node_modules` e `dist` não existam.

1.21 QUANDO o usuário roda `npm test` ENTÃO o sistema executa só os arquivos `.cjs` e ignora os quatro arquivos `.mjs`.

### Expected Behavior (Correct)

**Acesso a arquivos privados (A1)**

2.1 QUANDO um participante pede `GET /api/rooms/:roomId/private-file` com um `path` que tenha segmentos vazios, `.` ou `..`, ou que não comece com `<roomId>/` ENTÃO o sistema DEVE responder 403 sem ler o disco nem o Storage.

2.1.1 QUANDO o `path` é válido ENTÃO o sistema DEVE checar o dono sobre o caminho já normalizado e só permitir o Mestre ou o jogador cujo id é o segundo segmento.

**Tipo real dos arquivos enviados (A2)**

2.2 QUANDO um usuário envia um arquivo ENTÃO o sistema DEVE identificar o tipo pelos primeiros bytes (PNG, JPEG, WebP, PDF, DOCX/ZIP, MP3, WAV, OGG, WebM, MP4/M4A) e recusar com 415 o arquivo cujo conteúdo não bate com o tipo declarado.

2.2.1 QUANDO um envio em blocos é concluído, inclusive uma sessão retomada depois de reiniciar o servidor, ENTÃO o sistema DEVE conferir de novo a permissão do papel e o tipo real do primeiro bloco gravado em disco antes de gravar o arquivo no disco ou no Storage.

2.3 QUANDO o sistema grava um arquivo enviado ENTÃO o sistema DEVE escolher a extensão pelo tipo verificado e ignorar a extensão do nome original. O nome original continua sendo devolvido como `name` para exibição.

2.4 QUANDO o modo local serve arquivos de `/files/*` ou de `private-file` ENTÃO o sistema DEVE enviar `X-Content-Type-Options: nosniff` em todos eles e `Content-Security-Policy: default-src 'none'; sandbox` em todos que não forem PDF.

2.4.1 QUANDO o arquivo servido é PDF ENTÃO o sistema NÃO DEVE enviar o CSP `sandbox`, porque o visualizador de PDF do Chrome não abre documentos com esse cabeçalho. A proteção do PDF vem do tipo verificado, da extensão `.pdf` escolhida pelo servidor e do `nosniff`.

**Permissão de upload do jogador (A3)**

2.5 QUANDO um jogador envia um arquivo ENTÃO o sistema DEVE decidir a permissão pelo papel e pelo tipo verificado, não pelo `kind` do cliente:
- escopo `public`: só imagem (PNG, JPEG, WebP), que é o retrato da ficha;
- escopo `private`: só PDF, que é a ficha em PDF;
- escopo `community`: só PDF, que é a biblioteca.

2.6 QUANDO um jogador tenta enviar outro tipo para qualquer escopo ENTÃO o sistema DEVE responder 403.

**URL assinada (A4)**

2.7 QUANDO um participante chama `POST /api/rooms/:roomId/files/signed-url` com um `bucket` fora dos três buckets da aplicação ENTÃO o sistema DEVE responder 400.

2.8 QUANDO o `path` tem segmentos vazios, `.` ou `..` ENTÃO o sistema DEVE responder 400. A checagem de dono do bucket privado DEVE usar o caminho validado.

**Rolagens registradas (A5)**

2.9 QUANDO uma rolagem de Triangle Agency ou Daggerheart é feita ENTÃO o sistema DEVE sortear os dados no servidor com `crypto.randomInt`, pelo canal de rolagem do item 2.10.1, e devolver os dados sorteados na confirmação (`ack`). Caos e Medo DEVEM ser atualizados a partir desses dados.

2.9.1 QUANDO um participante envia a ação antiga `dice:record` ENTÃO o sistema DEVE recusá-la com erro, sem sortear e sem alterar Caos, Medo ou o histórico. Nenhum cliente atual usa essa ação.

2.10 QUANDO o sistema registra uma rolagem ENTÃO o sistema DEVE usar como autor o nome do participante autenticado na conexão (`socket.data.name`).

2.10.1 QUANDO um participante rola em qualquer ponto da ficha ENTÃO o sistema DEVE enviar ao servidor só o tipo de rolagem e os parâmetros (sistema, atributo, perícia, dificuldade, modificador, vantagem, tamanho da parada, expressão de dano etc.), sortear no servidor com `crypto.randomInt` e mostrar o resultado devolvido. Isso vale para:
- a aba Rolagens de todos os sistemas (D&D, Call of Cthulhu, Vampire V5, Ordem Paranormal 2 com e sem Pavor, Cairn 2e, Sacramento, Triangle Agency, Daggerheart);
- o rolador do Vampire Alpha 2.0, inclusive a rerrolagem com Vontade;
- o Arsenal (ataque e dano);
- os Dados avulsos.

2.10.2 QUANDO o servidor recebe parâmetros de rolagem ENTÃO o sistema DEVE validá-los (tipos de dado permitidos, quantidade máxima de dados, faixas numéricas, expressão de dano explícita) e responder com erro sem sortear se forem inválidos.

2.10.3 QUANDO o jogador pede a rerrolagem com Vontade no Vampire Alpha 2.0 ENTÃO o servidor DEVE rerrolar só dados de uma rolagem que ele mesmo sorteou para esse participante, no máximo uma vez e no máximo três dados comuns, sem aceitar dados enviados pelo cliente.

2.10.4 QUANDO o servidor não responde ou a conexão caiu ENTÃO o sistema DEVE mostrar um aviso de que a rolagem não foi feita e NÃO DEVE sortear no navegador.

2.10.4.1 QUANDO o servidor demora mais que o tempo de espera do navegador ENTÃO o aviso DEVE dizer que o resultado não chegou, e não que a rolagem não foi feita, porque o servidor ainda pode registrá-la no Escudo do Mestre.

2.10.2.1 QUANDO um parâmetro numérico de rolagem não é inteiro (ex.: `2.9`) ENTÃO o servidor DEVE recusá-lo, em vez de arredondar.

2.10.5 QUANDO a opção "Usar metade" do Vampire Alpha 2.0 é escolhida ENTÃO o sistema PODE continuar calculando no navegador, porque não há sorteio.

**Entrada concorrente na mesa (A6)**

2.11 QUANDO jogadores entram na mesa ao mesmo tempo, ou durante outra ação, ENTÃO o sistema DEVE processar a entrada na mesma fila por mesa usada pelas ações. Todas as gravações DEVEM ser mantidas e o número de jogadores aceitos NÃO DEVE passar das vagas.

**Edição da campanha (A7)**

2.12 QUANDO o Mestre tem alterações não salvas no formulário da campanha e chega uma atualização da mesa ENTÃO o sistema DEVE manter a edição em andamento.

2.12.1 QUANDO não há alteração pendente, ou depois que o Mestre salva ou descarta, ENTÃO o sistema DEVE voltar a refletir os dados do servidor.

2.12.2 QUANDO o Mestre continua digitando enquanto o salvamento está em andamento ENTÃO o sistema DEVE manter o formulário como pendente e não descartar o que foi digitado depois do envio.

**Perícias nas rolagens (A8)**

2.13 QUANDO um jogador de D&D abre a aba Rolagens ENTÃO o sistema DEVE oferecer a escolha de uma perícia da ficha. Ao escolher, o atributo da perícia e o bônus DEVEM vir da ficha: d20 + ⌊(valor − 10) / 2⌋ + proficiência, ou 2 × proficiência com especialização, ou 0 sem treino.

2.14 QUANDO um jogador de Call of Cthulhu abre a aba Rolagens ENTÃO o sistema DEVE oferecer a escolha de uma perícia da ficha e usar a porcentagem preenchida ou, sem ela, o valor-base exibido na ficha.

2.15 QUANDO um jogador de Vampire V5 abre a aba Rolagens ENTÃO o sistema DEVE oferecer a escolha de um atributo e de uma perícia da ficha e montar a parada com a soma dos pontos dos dois.

2.16 QUANDO o jogador não escolhe uma perícia ENTÃO o sistema DEVE manter a entrada manual que existe hoje para D&D, Call of Cthulhu e Vampire V5.

**Perícias de Ordem Paranormal 2 (A9)**

2.17 QUANDO uma ficha de Ordem Paranormal 2 é salva com perícias no formato `Nome=dX|dY` ENTÃO o sistema DEVE gravar em `skills` o número de faces do dado de perícia (ex.: `Acrobacia=d6|d8` gera `skills.Acrobacia = 6`). `diceSkills` continua com os dois dados.

**Valores-base de Call of Cthulhu (M1)**

2.18 QUANDO uma ficha de Call of Cthulhu é salva ENTÃO o sistema DEVE gravar em `sheet.skills` (a ficha montada) todas as perícias da matriz com o valor exibido: o valor editado pelo usuário ou, sem edição, o valor-base (Esquivar = ⌊DES/2⌋, Idioma Nativo = EDU, demais pela tabela).

2.18.1 QUANDO uma ficha de Call of Cthulhu é salva ENTÃO o texto `stats.skills` DEVE guardar só as perícias que o usuário editou. Assim, Esquivar e Idioma Nativo continuam acompanhando DES e EDU enquanto não forem editados.

**Ferramentas de validação (A10, M14, M15)**

2.19 QUANDO as dependências são instaladas ENTÃO o sistema DEVE usar o TypeScript estável 5.9 (`^5.9.3`). `npm run typecheck` e todos os testes que usam `typescript` DEVEM rodar.

2.20 QUANDO `tests/v150-model.test.cjs` roda em qualquer máquina ENTÃO o teste DEVE carregar o TypeScript com `require('typescript')`.

2.21 QUANDO os testes rodam num projeto com dependências instaladas e build feito ENTÃO os testes DEVEM checar que `.env`, `node_modules` e `dist` estão no `.gitignore` e não estão versionados (`git ls-files`), em vez de exigir que não existam no disco.

2.22 QUANDO o usuário roda `npm test` ENTÃO o sistema DEVE executar todos os arquivos `tests/*.test.cjs` e `tests/*.test.mjs`.

### Unchanged Behavior (Regression Prevention)

3.1 QUANDO o Mestre ou o dono legítimo pede um arquivo privado válido ENTÃO o sistema DEVE CONTINUAR A entregar o arquivo, por redirecionamento para URL assinada no Supabase ou pelo disco no modo local.

3.2 QUANDO o Mestre envia mapas, capas, NPCs, handouts, documentos (PDF/DOCX) e músicas (MP3, OGG, WAV, M4A) ENTÃO o sistema DEVE CONTINUAR A aceitar esses arquivos nos mesmos escopos, com o mesmo limite de 30 MB, o mesmo fluxo de envio em blocos com retomada e erros de tamanho respondidos em JSON.

3.3 QUANDO um jogador envia o retrato da ficha (imagem, escopo `public`), a ficha em PDF (escopo `private`) ou um PDF da biblioteca (escopo `community`) ENTÃO o sistema DEVE CONTINUAR A aceitar o envio.

3.4 QUANDO arquivos antigos já gravados com a extensão do nome original são acessados ENTÃO o sistema DEVE CONTINUAR A servi-los nas URLs atuais.

3.5 QUANDO uma rolagem de Triangle Agency ou Daggerheart é registrada ENTÃO o sistema DEVE CONTINUAR A guardar o histórico no Escudo do Mestre, com no máximo 30 itens, gerar Caos com o mesmo cálculo de hoje (6d4, contagem de 3s) e somar Medo com o mesmo limite de 12.

3.6 QUANDO uma rolagem de Daggerheart é feita ENTÃO o sistema DEVE CONTINUAR A mostrar na ficha os dados de Esperança e Medo e o resultado, agora com os valores devolvidos pelo servidor.

3.7 QUANDO um jogador entra com convite válido e há vaga ENTÃO o sistema DEVE CONTINUAR A devolver token, papel e id do jogador no mesmo formato, descontar uma vaga e avisar os participantes conectados.

3.8 QUANDO o convite é inválido, a mesa não existe, não há vagas ou falta o nome ENTÃO o sistema DEVE CONTINUAR A responder 403, 404, 403 e 400, com as mesmas mensagens.

3.9 QUANDO o Mestre salva a campanha ENTÃO o sistema DEVE CONTINUAR A enviar o mesmo payload de `campaign:update`.

3.10 QUANDO uma ficha de qualquer sistema é salva ENTÃO o sistema DEVE CONTINUAR A gravar `stats` no formato de texto atual (`Nome=valor` por linha). Fichas já salvas DEVEM abrir sem conversão.

3.11 QUANDO o jogador usa as rolagens de qualquer sistema ENTÃO o sistema DEVE CONTINUAR A aplicar as mesmas regras, títulos e textos de resultado de hoje (as funções de `src/domain/diceEngines.mjs`, `manualRules.mjs` e `vampireAlpha2.mjs`), mudando só o lugar do sorteio.

3.11.1 QUANDO uma rolagem que hoje não entra no histórico da mesa é feita ENTÃO o sistema DEVE CONTINUAR A mostrar o resultado só para quem rolou. O histórico compartilhado de todas as rolagens fica para o bloco (f).

3.12 QUANDO uma ficha de D&D é salva ENTÃO o sistema DEVE CONTINUAR A gravar `skillProficiencies` e `skillExpertise` como hoje.

3.13 QUANDO qualquer outra ação de socket é recebida ENTÃO o sistema DEVE CONTINUAR A aplicar as mesmas checagens: `requireGM` nas ações do Mestre, dono nas ações de jogador.

3.14 QUANDO o player de áudio sincroniza a música entre participantes ENTÃO o sistema DEVE CONTINUAR A funcionar como hoje.

3.15 QUANDO o build roda ENTÃO o sistema DEVE CONTINUAR A gerar o front-end com `vite build`. Os 28 testes que passam hoje DEVEM continuar passando.
