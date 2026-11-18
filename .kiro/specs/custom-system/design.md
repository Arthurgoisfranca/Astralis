# Design — sistema "Outros" (bloco d)

## Visão geral
Novo sistema `"Outros"`. A ficha é dirigida por um **template** guardado no estado da mesa (`state.customSheet`), versionado. Fichas de jogador guardam só os valores dos campos. Módulo isolado `src/domain/customSheet.mjs` (modelo + avaliador de fórmula seguro) e componente `src/CustomSheet.jsx`, para não tocar nos 11 sistemas.

## Modelo
```
state.customSheet = {
  version: n,
  name: "Minha ficha",
  sections: [{ id, title, fields: [field] }]
}
field = { id, key, label, type, options?, formula?, roll?, max? }
type ∈ texto|textoLongo|numero|booleano|selecao|lista|recurso|atributo|pericia|calculado
```
- `key` é o identificador usado em fórmulas e rolagens; único por template.
- A ficha do jogador guarda `stats` = mapa `key -> valor` (texto), reusando `character:save`. `recurso` guarda `"atual/maximo"`; `lista` guarda linhas separadas por `\n`.

## Avaliador de fórmula (sem eval)
`evalFormula(expr, values)` em `customSheet.mjs`:
- Tokeniza números, `+ - * / ( )` e referências `{key}`.
- Parser recursivo descendente (precedência: `()` > `* /` > `+ -`); sem acesso a globais, funções ou propriedades.
- Referência a campo inexistente ou não numérico = 0 com aviso; divisão por zero = aviso; sintaxe inválida = aviso. Nunca lança para a UI.

## Rolagens
Campo com `roll` (ex.: `1d20+{forca}`): ao clicar, o cliente resolve `{key}` pelos valores atuais, monta a expressão numérica e chama `roll("expression", { expression })` — mesmo canal do bloco (a), que valida e sorteia no servidor.

## Versionamento
- Salvar template incrementa `version`.
- `character:save` já guarda `sheet`. A ficha montada de "Outros" inclui `templateVersion`. Campos removidos do template permanecem em `stats` (não apagados), apenas não renderizados (R4.2).

## Permissões
- Editar template: ação de socket nova `customSheet:save` com `requireGM` (mestre e co-mestre). Import/export é client-side (JSON) e passa pela mesma ação ao aplicar.
- Jogador: só preenche e salva a própria ficha.

## Modelos prontos
`CUSTOM_TEMPLATES` em `customSheet.mjs`: "Em branco" e "d20 básico" (atributos For/Des/Con/Int/Sab/Car com modificador calculado, PV recurso, perícia de exemplo com rolagem).

## Testes
- Unidade: `evalFormula` (precedência, parênteses, refs, erros, divisão por zero); validação de template (import recusa JSON inválido); migração (valor de campo removido preservado).
- Integração: `customSheet:save` exige gestor; jogador salva ficha "Outros"; rolagem de campo via `expression`.
- Preservação: os 63 testes atuais; abrir ficha de um sistema fixo não muda.
