# Astralis 1.5.0 — regras verificadas e atualização conservadora

**Base:** Mesa & Dados v1.42 (base v1.4 preservada). O código público **não é alterado automaticamente**. Aplique o patch numa branch, teste e só depois publique no Render.

## Arquivos preservados integralmente

- `server.js`, `src/AudioCenter.jsx` — backend, Socket.IO e áudio global.
- `package.json`, `package-lock.json`, `render.yaml`, `vite.config.js`, `tsconfig.json` — configurações de build e hospedagem.
- Migrações SQL e lógica de autenticação Supabase existentes. `src/AccountPanel.jsx` mudou apenas na interface/fluxo pós-login, sem alterar o provedor e as chamadas base de Supabase Auth.
- Nenhum `.env`, banco local, mídia das campanhas, PDF de regras ou `node_modules` está incluído.

## Manuais fornecidos que sustentam alterações mecânicas

| Sistema | Trechos utilizados | Automação validada |
|---|---|---|
| Cairn 2e | Guia do Jogador, pp. 8–9, 62–66; Ficha A4 | FOR/DES/VON; salvaguardas d20 (1 passa, 20 falha); 10 espaços, itens 1/2/0, fadiga, redução de dano por armadura, PG/FOR, nome da cicatriz conforme PG perdidos. Efeitos de cicatrizes narrativos não são aplicados automaticamente. |
| Ordem Paranormal II beta | Playtest, pp. 8–12 e 24; personagens Ballynyr | Dado de atributo + dado de perícia, DT padrão 7, críticos por resultados iguais >=6, falha com todos 1, Pavor opcional se o personagem tiver esse efeito. Matriz das 20 perícias do playtest. Não confundir com Ordem Paranormal RPG primeira edição. |
| Triangle Agency | Manual, pp. 33–39; fichas da Agência | 6d4, resultados 3, geração de Caos, três 3s naturais (Triscendência), estabilidade três 3s. Aplicação interativa de Garantias de Qualidade e Burnout além da rolagem padrão ainda exige revisão. |
| Daggerheart | Livro básico, pp. 90–100, e ficha anexada | 2d12 Esperança/Medo, iguais = crítico. Recursos especializados dependem de escolhas, habilidades e equipamento na ficha; não se presumem bônus. |
| D&D 2024 | Livro do Jogador, pp. 10–12; ficha editável 2024 | d20 + modificador de atributo + proficiência quando aplicável; vantagem/desvantagem; 1/20 automáticos **somente para jogadas de ataque**. D&D 2014 usa sua ficha separada. |
| Assimilação RPG | Livro de regras, pp. 29–40; ficha editável | Campos de 6 Instintos e Aptidões, saúde e determinação. **Dados com faces simbólicas A/B/C não podem ser simulados como d6/d10 numéricos**; a interpretação permanece manual até integração das faces oficiais. |
| Sacramento | Livro básico e ficha de duas páginas | Atributos Físico, Velocidade, Intelecto, Coragem; ficha de Vida/Dor e dados declarados. Penalidade cumulativa de dor no legado permanece opt-in como regra caseira, não regra oficial. |
| Vampire V5 | Manual básico e ficha V5 | Pool de d10, fome e distinções em dados vermelhos; a denominação legada “6E” não significa suporte verificado à sexta edição. |
| Call of Cthulhu 7e | Guia do Investigador e ficha editável | Limiar de d100 regular/difícil/extremo e dados informados. |

## O que não é legítimo afirmar como completo

- As 19 referências foram consultadas para os trechos aplicáveis, mas **não foi feita homologação página a página de cada magia, classe, arma, poder, vantagem e condição**. Armas somente rolam expressões explicitamente cadastradas (ex.: `1d8+3`); o VTT não inventa bônus ausentes.
- Os arquivos não receberam novos endpoints ou migrações porque preservar o servidor/áudio/auth foi requisito expresso. O avatar da conta aparece no próprio card de participação e na barra superior; a exibição dos avatares de **todos** os usuários exigirá associação autenticada `roomUserId` ↔ `supabaseUserId` no backend e só deve ser implementada com uma migração segura.
- Dados 3D são representações geométricas CSS estilizadas, não uma simulação física.
- Não foi possível instalar as dependências npm neste ambiente, portanto **o build Vite completo e testes de múltiplos navegadores/Supabase reais estão pendentes**. Foram realizados testes locais, validação TypeScript e checagem estrutural dos componentes.

## Rodar com segurança

1. Faça backup do repositório e crie uma branch a partir da **base v1.42 original**. Se a `main` contiver conflitos `<<<<<<<`, primeiro resolva o merge; não substitua cegamente os arquivos.
2. Aplique **apenas os arquivos do patch seletivo**. Mantenha `.env` e variáveis secretas exclusivamente nas configurações privadas do Render.
3. Execute `npm ci --include=dev`, `npm run typecheck`, `node --test tests/*.test.cjs tests/*.test.mjs` e `npm run build`.
4. Teste cadastro, login, criação/salvamento/recarga de fichas, áudio entre duas contas e telas mobile antes de publicar.
5. Publicação no Render: use os comandos já configurados, sem alterar as chaves Supabase nem o serviço.
