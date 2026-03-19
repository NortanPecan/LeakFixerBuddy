-- Leaks module foundation
-- Apply manually in Supabase SQL Editor

create table if not exists public.leaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  title text not null,
  description text,
  source text not null default 'manual',
  status text not null default 'new',
  severity text not null default 'warning',
  sphere text,
  context_snapshot jsonb,
  source_note_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists leaks_user_id_status_idx on public.leaks(user_id, status);
create index if not exists leaks_user_id_updated_at_idx on public.leaks(user_id, updated_at desc);

-- Backfill existing leak inbox notes into the new leaks table.
insert into public.leaks (
  user_id,
  title,
  description,
  source,
  status,
  severity,
  source_note_id,
  created_at,
  updated_at
)
select
  n.user_id,
  left(split_part(coalesce(n.text, ''), E'\n', 1), 120) as title,
  nullif(n.text, '') as description,
  'manual' as source,
  'new' as status,
  'warning' as severity,
  n.id as source_note_id,
  n.created_at,
  n.updated_at
from public.notes n
where n.zone = 'leaks'
  and not exists (
    select 1
    from public.leaks l
    where l.source_note_id = n.id
  );
