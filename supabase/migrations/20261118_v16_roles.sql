-- Astralis 1.6: papéis por mesa (gm, coGm, player, spectator). Rode após as migrações anteriores.
-- Não destrutivo: só amplia o check constraint de account_rooms.role.
alter table public.account_rooms drop constraint if exists account_rooms_role_check;
alter table public.account_rooms add constraint account_rooms_role_check
  check (role in ('gm','coGm','player','spectator'));
