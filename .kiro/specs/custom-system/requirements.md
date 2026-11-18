# Requisitos — sistema "Outros" com ficha universal (bloco d)

## Introdução
O Astralis tem 11 sistemas com ficha fixa. Falta a opção "Outros", onde o mestre monta uma ficha universal própria. Este bloco adiciona um construtor de ficha e um renderizador dirigido por template, sem mexer nos 11 sistemas existentes.

## Requisitos

### R1 — Seleção
- 1.1 QUANDO o mestre escolhe o sistema da mesa ENTÃO "Outros" DEVE aparecer na lista.
- 1.2 QUANDO a mesa é "Outros" ENTÃO a aba Fichas DEVE usar a ficha montada pelo template da mesa, não um dos 11 fixos.

### R2 — Construtor (só mestre/co-mestre)
- 2.1 QUANDO o mestre edita o template ENTÃO DEVE poder criar seções (abas) e, dentro delas, campos.
- 2.2 QUANDO cria um campo ENTÃO DEVE escolher o tipo: texto, texto longo, número, caixa de seleção (booleano), seleção (lista de opções), lista de linhas, barra de recurso (atual/máximo), atributo e perícia.
- 2.3 QUANDO organiza seções e campos ENTÃO DEVE poder reordenar por arrastar e soltar e remover itens.
- 2.4 QUANDO define um campo calculado ENTÃO a fórmula DEVE ser avaliada de forma segura, sem `eval`, com as quatro operações, parênteses, números e referências a outros campos por chave.
- 2.5 QUANDO uma fórmula referencia um campo inexistente, divide por zero ou tem sintaxe inválida ENTÃO o resultado DEVE ser um aviso no campo, nunca um erro que quebre a ficha.

### R3 — Rolagens ligadas a campos
- 3.1 QUANDO um campo tem rolagem vinculada (ex.: `1d20 + {forca}`) ENTÃO clicar nele DEVE rolar no servidor (canal `dice:roll`, tipo `expression`), somando o valor atual do campo.
- 3.2 QUANDO a expressão é inválida ENTÃO o sistema DEVE recusar sem sortear.

### R4 — Templates
- 4.1 QUANDO o mestre salva o template ENTÃO ele DEVE virar o template ativo da mesa, com número de versão.
- 4.2 QUANDO o mestre altera o template de uma mesa com fichas já criadas ENTÃO as fichas existentes NÃO DEVEM ser corrompidas: valores de campos removidos são preservados mas ocultos; campos novos aparecem vazios.
- 4.3 QUANDO o mestre exporta o template ENTÃO o sistema DEVE gerar um JSON; ao importar, DEVE validar o JSON e recusar o inválido.
- 4.4 QUANDO o mestre duplica um template ENTÃO DEVE poder partir de um modelo pronto (ex.: d20 básico).

### R5 — Jogador
- 5.1 QUANDO o jogador abre a ficha "Outros" ENTÃO DEVE preencher os campos do template e salvar como qualquer outra ficha (ação `character:save`).
- 5.2 QUANDO o jogador não é mestre ENTÃO NÃO DEVE editar o template.

## Preservado
- P1 Os 11 sistemas continuam idênticos.
- P2 `character:save` e o formato de `stats`/`sheet` continuam válidos; fichas existentes abrem.
- P3 Rolagens continuam no servidor; nenhuma fórmula roda com `eval`.
- P4 `npm run check` limpo; modo local e Supabase funcionam.
