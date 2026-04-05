-- ============================================================
--  Vortexly PinEditor — Supabase Schema
--  Project : mupsfucywtqaowxtmuut
-- ============================================================

-- ── 1. Reusable updated_at trigger ──────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── 2. Editor state (single-row per user, used by /api/editor/state) ──
create table if not exists public.editor_state (
  user_id    uuid        primary key references auth.users(id) on delete cascade,
  state      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists editor_state_set_updated_at on public.editor_state;
create trigger editor_state_set_updated_at
  before update on public.editor_state
  for each row execute function public.set_updated_at();

alter table public.editor_state enable row level security;

drop policy if exists "editor_state_owner" on public.editor_state;
create policy "editor_state_owner" on public.editor_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── 3. Projects ──────────────────────────────────────────────
create table if not exists public.projects (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  name         text        not null default 'Untitled Campaign',
  layout_mode  text        not null default 'two'
                           check (layout_mode in ('two','one','custom')),
  canvas_state jsonb       not null default '{}'::jsonb,
  is_deleted   boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists projects_updated_at_idx on public.projects(updated_at desc);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ── 3. Exports ───────────────────────────────────────────────
create table if not exists public.exports (
  id             uuid        primary key default gen_random_uuid(),
  project_id     uuid        not null references public.projects(id) on delete cascade,
  user_id        uuid        not null references auth.users(id) on delete cascade,
  file_path      text        not null,          -- Supabase Storage path
  thumbnail_path text,                          -- small preview in Storage
  export_mode    text        not null default '2x'
                             check (export_mode in ('1x','2x','jpg')),
  file_size_bytes bigint,
  drive_file_id  text,                          -- Google Drive file ID (nullable)
  drive_synced_at timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists exports_user_id_idx    on public.exports(user_id);
create index if not exists exports_project_id_idx on public.exports(project_id);
create index if not exists exports_created_at_idx on public.exports(created_at desc);

-- ── 4. Google Drive OAuth tokens (per user) ──────────────────
create table if not exists public.drive_tokens (
  user_id        uuid        primary key references auth.users(id) on delete cascade,
  access_token   text        not null,
  refresh_token  text,
  token_type     text        not null default 'Bearer',
  expires_at     timestamptz,
  scope          text,
  folder_id      text,                          -- Vortexly PinEditor folder in Drive
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists drive_tokens_set_updated_at on public.drive_tokens;
create trigger drive_tokens_set_updated_at
  before update on public.drive_tokens
  for each row execute function public.set_updated_at();

-- ── 5. Row Level Security ─────────────────────────────────────
alter table public.projects    enable row level security;
alter table public.exports     enable row level security;
alter table public.drive_tokens enable row level security;

-- projects
drop policy if exists "project_owner_read"  on public.projects;
drop policy if exists "project_owner_write" on public.projects;

create policy "project_owner_read" on public.projects
  for select using (auth.uid() = user_id);

create policy "project_owner_write" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- exports
drop policy if exists "export_owner_read"  on public.exports;
drop policy if exists "export_owner_write" on public.exports;

create policy "export_owner_read" on public.exports
  for select using (auth.uid() = user_id);

create policy "export_owner_write" on public.exports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- drive_tokens (only the owning user can read/write their tokens)
drop policy if exists "drive_token_owner" on public.drive_tokens;

create policy "drive_token_owner" on public.drive_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── 6. Storage buckets ───────────────────────────────────────
-- Run once; idempotent via the `if not exists` equivalent pattern in Supabase.
-- Create bucket via dashboard or Supabase CLI:
--   supabase storage create exports --public false
--
-- Then add these Storage policies in the dashboard under
-- Storage > exports > Policies:
--
--   SELECT  : (storage.foldername(name))[1] = auth.uid()::text
--   INSERT  : (storage.foldername(name))[1] = auth.uid()::text
--   DELETE  : (storage.foldername(name))[1] = auth.uid()::text
