-- Mesa & Dados 1.4v: run AFTER 20261031_init.sql and 20261101_v12_realtime_storage_security.sql.
-- Existing rooms/journal data are preserved. No destructive migrations.
alter table public.rooms add column if not exists current_map_url text;
update public.rooms set current_map_url = nullif(state #>> '{map,image}', '') where current_map_url is null;

create table if not exists public.account_rooms (
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id text not null references public.rooms(id) on delete cascade,
  room_token text not null,
  role text not null check (role in ('gm','player')),
  display_name text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id,room_id)
);
create index if not exists account_rooms_room_id_idx on public.account_rooms(room_id);
alter table public.account_rooms enable row level security;
revoke all on public.account_rooms from anon;
grant select on public.account_rooms to authenticated;
drop policy if exists "read own room membership" on public.account_rooms;
create policy "read own room membership" on public.account_rooms for select to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  updated_at timestamptz not null default now()
);
alter table public.user_profiles enable row level security;
grant select,insert,update on public.user_profiles to authenticated;
drop policy if exists "read own profile" on public.user_profiles;
drop policy if exists "create own profile" on public.user_profiles;
drop policy if exists "update own profile" on public.user_profiles;
create policy "read own profile" on public.user_profiles for select to authenticated using ((select auth.uid())=id);
create policy "create own profile" on public.user_profiles for insert to authenticated with check ((select auth.uid())=id);
create policy "update own profile" on public.user_profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);

create table if not exists public.campaign_journals (
  id text primary key,
  campaign_id text not null references public.rooms(id) on delete cascade,
  author_id text not null,
  author_name text not null,
  title text not null,
  body text not null,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaign_journals_campaign_date_idx on public.campaign_journals(campaign_id,created_at desc);
alter table public.campaign_journals enable row level security;
revoke all on public.campaign_journals from anon, authenticated;
-- Only Express/service_role can read private entries: publicState filters per room identity.
insert into public.campaign_journals (id,campaign_id,author_id,author_name,title,body,is_private,created_at,updated_at)
select journal->>'id', rooms.id, coalesce(journal->>'authorId',journal->>'author_id',''),coalesce(journal->>'authorName',''),coalesce(journal->>'title',''),coalesce(journal->>'body',''),coalesce((journal->>'is_private')::boolean,false),
  to_timestamp(coalesce(nullif(journal->>'createdAt','')::numeric,extract(epoch from now())*1000)/1000),
  to_timestamp(coalesce(nullif(journal->>'updatedAt','')::numeric,extract(epoch from now())*1000)/1000)
from public.rooms rooms, lateral jsonb_array_elements(case when jsonb_typeof(rooms.state->'journal')='array' then rooms.state->'journal' else '[]'::jsonb end) journal
where journal->>'id' is not null
on conflict (id) do nothing;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('mesa-avatars','mesa-avatars',true,31457280,array['image/webp','image/png','image/jpeg'])
on conflict (id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
update storage.buckets set file_size_limit=31457280,
  allowed_mime_types=case when id='mesa-assets' then array['image/png','image/jpeg','image/webp','audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/x-wav','audio/webm','audio/mp4','audio/x-m4a']::text[]
   when id='mesa-private' then array['image/png','image/jpeg','image/webp','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
   else array['application/pdf']::text[] end
where id in ('mesa-assets','mesa-private','mesa-community');

drop policy if exists "users upload own avatars" on storage.objects;
create policy "users upload own avatars" on storage.objects for insert to authenticated
with check (bucket_id='mesa-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "users read avatars" on storage.objects;
create policy "users read avatars" on storage.objects for select to public using (bucket_id='mesa-avatars');

-- Private Supabase Realtime broadcast: account ownership required, unlike public broadcast.
-- The server publishes authoritative music events, Socket.IO remains fallback.
drop policy if exists "room audio subscribed members" on realtime.messages;
create policy "room audio subscribed members" on realtime.messages for select to authenticated
using (realtime.topic() like 'room_audio_%' and exists (
  select 1 from public.account_rooms ar where ar.user_id = (select auth.uid())
  and realtime.topic() = 'room_audio_' || ar.room_id
));
-- Do not allow clients to publish arbitrary shared playback commands.
