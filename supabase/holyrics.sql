-- Asa — ligação com o Holyrics.
-- Como usar: no Supabase, abra "SQL Editor", cole todo este arquivo e clique em "Run".
-- Pode rodar mais de uma vez sem problema.

-- Chaves do Holyrics de cada ministério (API Key e token criados no programa Holyrics).
-- Só administradores do ministério veem e mudam.
create table if not exists public.holyrics (
  ministry_id uuid primary key references public.ministries (id) on delete cascade,
  api_key text not null,
  token text not null,
  updated_at timestamptz not null default now()
);
alter table public.holyrics enable row level security;
drop policy if exists "holyrics: admins veem" on public.holyrics;
create policy "holyrics: admins veem" on public.holyrics for select using (public.is_admin(ministry_id));
drop policy if exists "holyrics: admins criam" on public.holyrics;
create policy "holyrics: admins criam" on public.holyrics for insert with check (public.is_admin(ministry_id));
drop policy if exists "holyrics: admins editam" on public.holyrics;
create policy "holyrics: admins editam" on public.holyrics for update using (public.is_admin(ministry_id));
drop policy if exists "holyrics: admins apagam" on public.holyrics;
create policy "holyrics: admins apagam" on public.holyrics for delete using (public.is_admin(ministry_id));

-- Ministério conectado? (todos os membros podem saber, sem ver as chaves)
create or replace function public.holyrics_connected(p_ministry uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_member(p_ministry) and exists (select 1 from holyrics where ministry_id = p_ministry);
$$;
grant execute on function public.holyrics_connected(uuid) to authenticated;

-- Qual item do Holyrics corresponde a cada música, culto, pessoa e função do Asa.
alter table public.songs add column if not exists holyrics_id text not null default '';
alter table public.events add column if not exists holyrics_id text not null default '';
alter table public.events add column if not exists holyrics_sent_at timestamptz;
alter table public.members add column if not exists holyrics_id text not null default '';
alter table public.roles add column if not exists holyrics_id text not null default '';
