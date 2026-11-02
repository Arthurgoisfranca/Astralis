# Mesa & Dados v1.5 — Atualização do Astralis

Esta atualização foi produzida a partir do pacote **Mesa-e-Dados-v1.4v-Codigo-Atualizado.zip** recebido na conversa. Ela contém mudanças reais de código em React, CSS, Express e no domínio de rolagens, sem apagar as migrations da versão anterior. **Não foi implantada automaticamente em seu GitHub ou Render.**

## Instalação no Render (mesmo serviço HTTPS)

1. Faça backup do código, do banco Supabase e dos arquivos da campanha. Não apague suas tabelas para atualizar.
2. Substitua os arquivos do repositório GitHub Astralis pelos arquivos **desta pasta**. Não envie `.env`, `node_modules`, `dist`, dados privados ou tokens para o Git.
3. No Supabase SQL Editor, confira se você já executou as três migrations anteriores, nesta ordem:
   - `supabase/migrations/20261031_init.sql`
   - `supabase/migrations/20261101_v12_realtime_storage_security.sql`
   - `supabase/migrations/20261102_v14_accounts_audio_maps.sql`
   **Esta versão 1.5 não exige uma quarta migration.** Não rode novamente scripts destrutivos nem apague tabelas.
4. No Render, mantenha **Web Service** com Node.js 22, `Root Directory` vazio, **Build Command** `npm ci --include=dev && npm run build`, **Start Command** `npm start` e Health Check `/api/health`. `render.yaml` já aponta para essas opções.
5. Em **Environment**, defina `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `NODE_ENV=production`. As chaves secretas são apenas do servidor: **nunca coloque o valor secreto em uma variável `VITE_` ou no GitHub**.
6. No Supabase Authentication, configure Site URL e Redirect URLs com o endereço HTTPS público exato do Render; habilite E-mail/Senha. Para os botões Google e GitHub, habilite os respectivos provedores OAuth com Client ID e Client Secret no painel do Supabase. Esses provedores são opcionais.
7. Publique com **Manual Deploy → Clear build cache & deploy**. Depois, acesse `https://SEU-SERVICO.onrender.com/api/health` e o site. O HTTPS/TLS é automático no Render; não é necessário contratar domínio.
8. **Teste dois navegadores diferentes:** conta do Mestre + conta do jogador; convite `/join/<id>-<code>`, ficha/perícias, áudio, diário, visualização e movimentação de mapa, PDFs e PWA.

> Vercel/Netlify podem hospedar o **frontend**, mas o backend Express e os WebSockets ainda precisam permanecer online no Render (ou em outro servidor Node). Configure `VITE_API_URL`, `VITE_SOCKET_URL` e `CORS_ORIGIN` se separar frontend e backend. O deploy Vercel puramente estático não substitui Socket.IO.

## Correções e recursos v1.5

- **PDF**: resolvido o erro `B.createElement is not a function`: `document` era o objeto `PDFDocument` e estava ocultando o `document` do navegador durante exportação. Leitura de texto inicial agora limitada a seis páginas com `pdfjs-dist` em worker e limpeza de páginas; OCR continua manual, limitado às quatro primeiras páginas por execução, para evitar carga inesperada. A biblioteca lista 12 itens por página; os PDFs são abertos sob demanda (não ficam todos carregados no navegador).
- **Diário / Caderno do Mestre**: correção de rótulo/textarea que ficava horizontalmente desalinhado; largura e espaçamento responsivos, contraste e ordenação cronológica mesmo com timestamps ISO.
- **Perícias / fichas**: layout restrito ao modal com scrolling próprio; matrizes de perícia alinhadas; cálculo de modificadores sem efeitos de atualização em cascata; Error Boundary para recuperação de renderização sem overlay preso. O erro original `set(...)` já havia sido corrigido na v1.4; foi preservado.
- **Visual**: paleta escura carvão/ardósia e cobre, superficies elegantes, hovers, estados de foco por teclado, responsividade de PDF, diário e mapas, preferência por redução de movimento.
- **Música**: player HTML5 sempre montado mesmo ao trocar de aba; novo mini-player flutuante com play/pause, música atual, botão de fila, expandir/fechar. A fila é global dentro da sala, editável pelo Mestre e já sincronizada pelo Socket.IO/Supabase Realtime na versão anterior. O navegador pode exigir um clique em **Ativar áudio** antes de tocar automaticamente.
- **Links de convite**: o Mestre compartilha URL como `/join/0123456789-abcdefghijkl` com código derivado de hash do convite da sala. O backend verifica esse código sem aceitar token arbitrário. Convites antigos com parâmetros `?room=...&invite=...` continuam funcionando. O código é mais curto do que o token antigo, mas **continua sendo uma credencial de ingresso**: não o publique inadvertidamente.
- **Token e avatar**: editor de corte com zoom, arraste com mouse/touch/pointer, saída PNG e upload WebP para avatar. O recorte precisa de imagem local ou URL que permita leitura por CORS.
- **Mapas**: enquadramento proporcional pela largura/altura real do arquivo e dimensões disponíveis no palco, pan/zoom sobre uma camada da imagem sem recortar as bordas em zoom 100%; controles `−`, `+` e **Enquadrar**. Tokens/medições continuam presos às coordenadas percentuais da imagem.
- **Roladores**: domínios puros em `src/domain/diceEngines.mjs`, com testes determinísticos. Triangle Agency 6d4 e Caos estável (3 ou 6 resultados 3), Daggerheart dualidade 2d12, V5 dados comuns e Fome, CoC percentual/regular/difícil/extremo/desastre, D&D 5E/5.5 com vantagem/desvantagem e proficiência, Sacramento 1d6 + Antecedente e recursos derivados, Ordem Paranormal 2/Ballynyr com Pavor, dado de perícia/atributo e exposição.

## Atenção às regras de RPG

- Em **Sacramento**, os benefícios de Físico/Velocidade/Intelecto/Coragem seguem os atributos do jogo. A penalidade cumulativa por Círculos de Dor foi oferecida como **regra opcional de mesa**, não como regra oficial de penalidade automática. Os efeitos específicos de cada Círculo de Dor devem ser aplicados conforme o livro.
- Em **Ordem Paranormal 2 (Ballynyr)**, as regras de Pavor/Exposição seguem a versão de ficha/playtest usada no Astralis; **não se deve confundir com as regras oficiais de outras edições de Ordem Paranormal**. O Mestre pode ajustar a DT e a margem.
- A detecção de 20/1 natural em D&D **não significa sucesso/falha automática para todo teste de habilidade**; a automação marca a rolagem e deixa a interpretação ao Mestre.

## Segurança e limitações conhecidas

- Em produção a interface exige configuração Supabase Auth; sem `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` aparece um erro de configuração, e não acesso como visitante.
- A associação conta/mesa e o login são oferecidos, mas o backend original ainda aceita tokens próprios de salas por compatibilidade. Para uma aplicação pública maior, falta endurecer todas as rotas com JWT verificado e revisar CORS, RLS e as permissões.
- Os links de áudio precisam permitir streaming por HTTPS/CORS; o YouTube não é fonte direta de `<audio>`. O Realtime requer políticas e a migration já entregue na v1.4.
- O plano gratuito do Render pode suspender o serviço após inatividade. `DATA_DIR=/tmp/mesa` é **efêmero**. Em produção configure Supabase para banco e Storage.
- Arquivos maiores que o plano gratuito do Supabase comporta não serão enviados, mesmo que o limite do cliente seja de 30 MiB.
- **Não foi possível executar o build Vite completo ou testes ponta a ponta com um Supabase/Render conectados neste ambiente**, devido ao bloqueio de instalação de dependências npm. Não se deve declarar produção validada antes de confirmar o build no Render e testar usuários reais.

## Verificações locais e comandos

```bash
npm ci --include=dev
npm test
npm run typecheck
npm run build
npm start
```

Localmente foram aprovados **14 testes** (`node --test tests/*.test.*`), análise de sintaxe JSX/TS com TypeScript, `tsc --noEmit`, sintaxe `server.js` e `sw.js`, além de análise das folhas CSS sem erros de parsing. A verificação de sintaxe não substitui o build nem os testes funcionais no navegador.
