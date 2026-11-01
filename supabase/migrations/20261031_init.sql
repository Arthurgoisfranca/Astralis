create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id text primary key,
  gm_token text not null,
  invite_token text not null,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.rooms enable row level security;
revoke all on public.rooms from anon, authenticated;

create table if not exists public.community_library (
  id text primary key,
  title text not null,
  system text not null,
  uploader text not null,
  bucket text not null,
  file_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);
alter table public.community_library enable row level security;
revoke all on public.community_library from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('mesa-assets', 'mesa-assets', true, 26214400, array['image/png','image/jpeg','image/webp']),
  ('mesa-private', 'mesa-private', false, 26214400, array['image/png','image/jpeg','image/webp','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('mesa-community', 'mesa-community', true, 26214400, array['application/pdf'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Uploads and private reads go through Express, which checks the per-room access token.
-- Keep Storage's write policies closed to browser clients.
