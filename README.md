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
├── server/
│   └── repositories/
│       ├── roomRepository.js
│       └── communityLibraryRepository.js
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
│   ├── domain/
│   │   ├── characterSheets.ts
│   │   └── sheetCalculations.ts
│   └── astralisTheme.css
└── supabase/
    └── migrations/
        ├── 20261031_init.sql
        └── 20261101_v12_realtime_storage_security.sql
```
## Sistemas suportados

Ordem Paranormal 2, D&D 5.5E (2024), D&D 5E, Call of Cthulhu, Vampire: The Masquerade 5E / 6E, Daggerheart, Triangle Agency, Sacramento e Assimilação RPG.

## Segurança e dados

- Nunca versione o arquivo `.env` nem credenciais de serviço.
- Convites dão acesso à sala conforme a função de Mestre ou Jogador.
- A edição de entradas do diário respeita autoria e visibilidade.
- O OCR de fichas escaneadas é uma sugestão; confira os valores reconhecidos antes de salvar.
## Versão 1.2

- Modelos TypeScript discriminados por sistema e cálculos adaptativos de modificadores de D&D, dificuldades de Call of Cthulhu, limiares de Daggerheart e dados de Fome de Vampire.
- Uploads de até 150 MiB enviados em blocos sequenciais de 5 MiB, com SHA-256 por bloco, tentativas automáticas e retomada após reinício quando `DATA_DIR` estiver em volume persistente.
- Redimensionamento de imagens para até 2048 px, convertidas para WebP com qualidade 85% antes do envio.
- O player de música permanece montado ao trocar de módulo. A consulta do sistema confirma o salvamento antes de mostrar o estado concluído.
- Repositórios isolam a persistência de salas e da biblioteca. Mudanças em `rooms` no PostgreSQL são retransmitidas aos participantes conectados por Socket.IO.

### Atualizar o Supabase

Depois de executar `supabase/migrations/20261031_init.sql`, aplique `supabase/migrations/20261101_v12_realtime_storage_security.sql` no SQL Editor. A migração habilita a publicação da tabela `rooms` e ajusta os buckets para 150 MiB. Ela mantém as consultas diretas de `anon` e `authenticated` bloqueadas; a API Express valida os tokens de convite e acessa o Supabase com a chave secreta no servidor.

Este projeto ainda não usa Supabase Auth. Por isso, as políticas não usam `auth.uid()`; a identidade é o token de sala validado pelo backend, que também aplica as permissões do Mestre, do autor do diário e das anotações privadas. Não exponha `SUPABASE_SECRET_KEY` ao navegador.

Os blocos temporários e o manifesto do envio ficam em `data/upload-chunks/`, com validade de seis horas. O servidor verifica os hashes ao iniciar e retoma as partes ainda pendentes. Em ambiente local, reserve espaço em disco suficiente para o arquivo; no Supabase, aumente também o limite global de uploads do projeto para pelo menos 150 MiB. Em produção, monte um volume persistente em `DATA_DIR` para preservar os blocos temporários durante reinícios. O navegador envia blocos de 5 MiB ao Astralis; para arquivos acima de 6 MiB, o backend encaminha os dados ao Supabase pelo protocolo TUS em blocos de 6 MiB.