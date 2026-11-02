# Mesa & Dados 1.5v — Changelog

- Corrigido: erro de `document.createElement` na exportação de PDF causado por variável `document` sombreada por `PDFDocument`.
- Corrigido: Caderno do Mestre com labels e textarea desalinhados, layout responsivo.
- Melhorado: PDF.js limitado às primeiras seis páginas para análise inicial e iframe com lazy loading.
- Melhorado: biblioteca de PDF com paginação visual de 12 itens.
- Melhorado: mapas centralizados em resolução 100% considerando proporção da imagem; zoom e reset explícitos.
- Adicionado: mini-player flutuante com fila reabrível e controle básico, mantendo player único entre abas.
- Adicionado: URLs curtas de convite com hash e aceitação server-side; links antigos continuam funcionando.
- Adicionado: corte interativo para avatar/token com pan, zoom e exportação.
- Adicionado: OAuth opcional Google/GitHub via Supabase Auth; configuração necessária no dashboard.
- Adicionado: roladores separados em `src/domain/diceEngines.mjs` para sete sistemas, com testes automatizados.
- Corrigido: Triangle Agency sem gerar Caos em sucessos estáveis de 3 ou 6 dados mostrando 3.
- Melhorado: Portal para modais, escape apenas no modal superior, CSS de perícias, painel de recuperação de erro.
- Melhorado: PWA com versão de cache atualizada.
- Validação: 14 testes locais passaram; build Vite e E2E ainda pendentes no ambiente externo.
