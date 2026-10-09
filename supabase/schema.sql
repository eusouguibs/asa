-- Asa — estrutura do banco de dados (Supabase / Postgres)
-- Como usar: no painel do Supabase, abra "SQL Editor", cole todo este arquivo e clique em "Run".
-- Pode rodar mais de uma vez sem problema: nada é duplicado e nenhum dado é apagado.

-- ---------- Tabelas ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  birthday date,
  created_at timestamptz not null default now()
);

create table if not exists public.ministries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  owner_id uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.ministries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  unique (ministry_id, user_id)
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.ministries (id) on delete cascade,
  name text not null
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.ministries (id) on delete cascade,
  title text not null,
  artist text not null default '',
  key text not null default '',
  link text not null default '',
  content text not null default '',
  created_at timestamptz not null default now()
);

-- Capa, duração e BPM das músicas (adicionados depois; seguro rodar de novo).
alter table public.songs add column if not exists artwork text not null default '';
alter table public.songs add column if not exists duration int not null default 0;
alter table public.songs add column if not exists bpm int not null default 0;
alter table public.songs add column if not exists links jsonb not null default '{}'::jsonb;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.ministries (id) on delete cascade,
  title text not null,
  date date not null,
  time text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.ministries (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role_name text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  created_at timestamptz not null default now()
);

create table if not exists public.event_songs (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.ministries (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  key text not null default '',
  position int not null default 1
);

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.ministries (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- ---------- Funções de apoio às regras de acesso ----------

create or replace function public.is_member(mid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where ministry_id = mid and user_id = auth.uid());
$$;

create or replace function public.is_admin(mid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where ministry_id = mid and user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.shares_ministry(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members a join members b on a.ministry_id = b.ministry_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- Criar um ministério: quem cria vira administrador e ganha as funções padrão.
create or replace function public.create_ministry(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
  new_code text;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta primeiro.'; end if;
  loop
    new_code := upper(substr(translate(md5(random()::text || clock_timestamp()::text), '01', ''), 1, 6));
    exit when length(new_code) = 6 and not exists (select 1 from ministries where invite_code = new_code);
  end loop;
  insert into ministries (name, invite_code, owner_id) values (trim(p_name), new_code, auth.uid()) returning id into new_id;
  insert into members (ministry_id, user_id, role) values (new_id, auth.uid(), 'admin');
  insert into roles (ministry_id, name)
    select new_id, unnest(array['Ministro(a)', 'Vocal', 'Teclado', 'Violão', 'Guitarra', 'Baixo', 'Bateria', 'Som', 'Projeção']);
  return new_id;
end;
$$;

-- Entrar num ministério com o código de convite.
create or replace function public.join_ministry(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  mid uuid;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta primeiro.'; end if;
  select id into mid from ministries where invite_code = upper(trim(p_code));
  if mid is null then raise exception 'Código de convite não encontrado.'; end if;
  insert into members (ministry_id, user_id, role) values (mid, auth.uid(), 'member')
    on conflict (ministry_id, user_id) do nothing;
  return mid;
end;
$$;

-- O membro escalado confirma ou recusa a própria presença.
create or replace function public.set_my_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('pending', 'confirmed', 'declined') then raise exception 'Status inválido.'; end if;
  update assignments set status = p_status where id = p_id and user_id = auth.uid();
  if not found then raise exception 'Esta escala não é sua.'; end if;
end;
$$;

-- ---------- Regras de acesso (cada pessoa só vê o próprio ministério) ----------

alter table public.profiles enable row level security;
alter table public.ministries enable row level security;
alter table public.members enable row level security;
alter table public.roles enable row level security;
alter table public.songs enable row level security;
alter table public.events enable row level security;
alter table public.assignments enable row level security;
alter table public.event_songs enable row level security;
alter table public.notices enable row level security;

drop policy if exists "perfil: ver o meu e o de quem serve comigo" on public.profiles;
create policy "perfil: ver o meu e o de quem serve comigo" on public.profiles
  for select using (id = auth.uid() or public.shares_ministry(id));
drop policy if exists "perfil: criar o meu" on public.profiles;
create policy "perfil: criar o meu" on public.profiles
  for insert with check (id = auth.uid());
drop policy if exists "perfil: editar o meu" on public.profiles;
create policy "perfil: editar o meu" on public.profiles
  for update using (id = auth.uid());

drop policy if exists "ministério: membros veem" on public.ministries;
create policy "ministério: membros veem" on public.ministries
  for select using (public.is_member(id));
drop policy if exists "ministério: admins editam" on public.ministries;
create policy "ministério: admins editam" on public.ministries
  for update using (public.is_admin(id));

drop policy if exists "membros: membros veem" on public.members;
create policy "membros: membros veem" on public.members
  for select using (public.is_member(ministry_id));
drop policy if exists "membros: admins editam" on public.members;
create policy "membros: admins editam" on public.members
  for update using (public.is_admin(ministry_id));
drop policy if exists "membros: admins removem ou a pessoa sai" on public.members;
create policy "membros: admins removem ou a pessoa sai" on public.members
  for delete using (public.is_admin(ministry_id) or user_id = auth.uid());

-- Funções, músicas, eventos, escalados, músicas do evento e avisos:
-- todos os membros veem; só administradores criam, editam e apagam.
do $$
declare t text;
begin
  foreach t in array array['roles', 'songs', 'events', 'assignments', 'event_songs', 'notices'] loop
    execute format('drop policy if exists "%1$s: membros veem" on public.%1$I', t);
    execute format('drop policy if exists "%1$s: admins criam" on public.%1$I', t);
    execute format('drop policy if exists "%1$s: admins editam" on public.%1$I', t);
    execute format('drop policy if exists "%1$s: admins apagam" on public.%1$I', t);
    execute format('create policy "%1$s: membros veem" on public.%1$I for select using (public.is_member(ministry_id))', t);
    execute format('create policy "%1$s: admins criam" on public.%1$I for insert with check (public.is_admin(ministry_id))', t);
    execute format('create policy "%1$s: admins editam" on public.%1$I for update using (public.is_admin(ministry_id))', t);
    execute format('create policy "%1$s: admins apagam" on public.%1$I for delete using (public.is_admin(ministry_id))', t);
  end loop;
end $$;

create index if not exists members_user_idx on public.members (user_id);
create index if not exists events_ministry_date_idx on public.events (ministry_id, date);
create index if not exists assignments_event_idx on public.assignments (event_id);
create index if not exists assignments_user_idx on public.assignments (user_id);
create index if not exists event_songs_event_idx on public.event_songs (event_id);
