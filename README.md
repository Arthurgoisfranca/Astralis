# Astralis

Astralis é uma aplicação web para organizar campanhas de RPG, agendar sessões e reunir as ferramentas da mesa em um lobby compartilhado.

## Recursos

- Cadastro de campanhas com sistema, mestre, jogadores, vagas, agenda, local, classificação indicativa, gatilhos, requisitos e resumo.
- Calendário de sessões com horário, local e observações.
- Lobby com convites para jogadores e sincronização em tempo real.
- Fichas adaptadas ao sistema, diário, anotações e contador de sessões.
- Mapas táticos com tokens, zoom, pan e ferramentas de medição.
- Música compartilhada, NPCs, handouts, documentos do Mestre e biblioteca de PDFs.
- Upload de imagens e arquivos, com armazenamento local ou Supabase Storage.

## Tecnologias

- React 19 e Vite 7 no front-end.
- Node.js 22+, Express 5 e Socket.IO no servidor.
- Supabase PostgreSQL e Storage para persistência na nuvem.
- SQLite como modo local quando as credenciais Supabase não estão configuradas.

O servidor Node entrega o front-end compilado e também atende a API e as conexões Socket.IO. Para esta versão, use uma instância do servidor: presença e eventos em tempo real são mantidos na memória do processo.

## Estrutura

```text
.
├── index.html
├── package.json
├── package-lock.json
├── server.js
├── vite.config.js
├── render.yaml
├── scripts/
│   ├── startDevServer.js
│   └── migrateSupabaseData.js
├── src/
│   ├── main.jsx
│   ├── AstralisApp.jsx
│   ├── AppShell.jsx
│   ├── CampaignModules.jsx
│   ├── SharedTools.jsx
│   ├── RpgSystems.js
│   └── astralisTheme.css
└── supabase/
    └── migrations/
        └── 20261031_init.sql
```

## Executar localmente

Requer Node.js 22 ou superior.

```bash
npm ci
npm run dev
```

Abra o endereço `Local` mostrado pelo Vite, normalmente `http://localhost:5173/`. O servidor da API usa a porta 3001. Mantenha uma única execução de `npm run dev` por vez; se uma porta estiver ocupada, encerre a execução anterior antes de iniciar outra.

Sem credenciais Supabase, o servidor cria o banco local em `data/mesa.sqlite`. A pasta `data/` não deve ser usada como armazenamento persistente em hospedagens efêmeras.

## Configurar Supabase

1. Crie um projeto Supabase.
2. No SQL Editor, execute `supabase/migrations/20261031_init.sql`. A migração cria as tabelas e os buckets usados pelo app.
3. Crie um arquivo `.env` na raiz do projeto com as credenciais do projeto:

   ```env
   SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
   SUPABASE_SECRET_KEY=sb_secret_sua_chave
   ```

4. Reinicie `npm run dev`. A API usa Supabase quando `SUPABASE_URL` e `SUPABASE_SECRET_KEY` estão preenchidos.

A chave secreta é usada somente pelo servidor. Não a coloque em variáveis `VITE_*` nem a envie ao navegador. Os nomes padrão dos buckets são `mesa-assets`, `mesa-private` e `mesa-community`; podem ser substituídos pelas variáveis `SUPABASE_PUBLIC_BUCKET`, `SUPABASE_PRIVATE_BUCKET` e `SUPABASE_COMMUNITY_BUCKET`.

### Migrar dados locais existentes

Se já houver campanhas no SQLite, configure o Supabase e execute a migração uma vez:

```bash
npm run migrate:cloud
```

O comando copia campanhas, arquivos locais e itens da biblioteca para o Supabase; os dados locais são mantidos como cópia. Faça backup da pasta `data/` antes da migração.

## Build e produção

```bash
npm run build
npm start
```

Configure `SUPABASE_URL` e `SUPABASE_SECRET_KEY` no ambiente do serviço. O servidor escuta a porta fornecida pela hospedagem por meio de `PORT`. O arquivo `render.yaml` contém a configuração de serviço para Render.

Para hospedar o front-end separado, defina `VITE_API_URL` e `VITE_SOCKET_URL` com a URL pública do serviço Node e configure `CORS_ORIGIN` no servidor com a origem do front-end. O backend usa Socket.IO e precisa de uma hospedagem que aceite conexões WebSocket persistentes.

## Sistemas suportados

Ordem Paranormal 2, D&D 5.5E (2024), D&D 5E, Call of Cthulhu, Vampire: The Masquerade 5E / 6E, Daggerheart, Assimilação RPG e Sacramento.

## Segurança e dados

- Nunca versione o arquivo `.env` nem credenciais de serviço.
- Convites dão acesso à sala conforme a função de Mestre ou Jogador.
- A edição de entradas do diário respeita autoria e visibilidade.
- O OCR de fichas escaneadas é uma sugestão; confira os valores reconhecidos antes de salvar.