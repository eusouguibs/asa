-- Asa — tela do ministério: capa, equipes, funções com ícone, classificações,
-- funções de cada membro, fotos de perfil e novo convite.
-- Como usar: no Supabase, abra "SQL Editor", cole todo este arquivo e clique em "Run".
-- Pode rodar mais de uma vez sem problema.

-- Foto de capa do ministério.
alter table public.ministries add column if not exists cover text not null default '';

-- Ícone e ordem de cada função.
alter table public.roles add column if not exists icon text not null default '';
alter table public.roles add column if not exists position int not null default 0;

-- O que cada membro toca/faz (nomes das funções).
alter table public.members add column if not exists skills text[] not null default '{}';

-- Foto de perfil.
alter table public.profiles add column if not exists avatar text not null default '';

-- Equipes (ex.: Vocal, Banda de domingo) com seus membros.
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.ministries (id) on delete cascade,
  name text not null,
  member_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Classificações das músicas (Adoração, Louvor, ...).
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.ministries (id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);
alter table public.songs add column if not exists categories uuid[] not null default '{}';

alter table public.teams enable row level security;
alter table public.categories enable row level security;
do $$
declare t text;
begin
  foreach t in array array['teams', 'categories'] loop
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

-- Ícones das funções padrão que ainda estão sem ícone.
update public.roles set icon = case
  when name ilike 'ministr%' then '🎙️'
  when name ilike '%back%' then '🎤'
  when name ilike 'voca%' or name ilike 'voz%' then '🎤'
  when name ilike 'tecla%' or name ilike 'piano%' then '🎹'
  when name ilike 'viol%' then '🪕'
  when name ilike 'guitar%' then '🎸'
  when name ilike 'baix%' then '🎸'
  when name ilike 'bater%' then '🥁'
  when name ilike '%som%' or name ilike 'mesa%' then '🎛️'
  when name ilike 'proje%' or name ilike 'm_dia%' or name ilike 'data%' then '📽️'
  else '🎵' end
where icon = '';

-- A própria pessoa escolhe o que toca/faz no ministério.
create or replace function public.set_my_skills(p_ministry uuid, p_skills text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  update members set skills = coalesce(p_skills, '{}') where ministry_id = p_ministry and user_id = auth.uid();
  if not found then raise exception 'Você não participa deste ministério.'; end if;
end;
$$;
grant execute on function public.set_my_skills(uuid, text[]) to authenticated;

-- Gera um código de convite novo (o antigo deixa de funcionar).
create or replace function public.new_invite_code(p_ministry uuid) returns text
language plpgsql security definer set search_path = public as $$
declare new_code text;
begin
  if not public.is_admin(p_ministry) then raise exception 'Só administradores podem gerar convites.'; end if;
  loop
    new_code := upper(substr(translate(md5(random()::text || clock_timestamp()::text), '01', ''), 1, 6));
    exit when length(new_code) = 6 and not exists (select 1 from ministries where invite_code = new_code);
  end loop;
  update ministries set invite_code = new_code where id = p_ministry;
  return new_code;
end;
$$;
grant execute on function public.new_invite_code(uuid) to authenticated;

-- Classificações padrão para ministérios que ainda não têm nenhuma.
create or replace function public.seed_categories(p_ministry uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(p_ministry) then return; end if;
  if exists (select 1 from categories where ministry_id = p_ministry) then return; end if;
  insert into categories (ministry_id, name, description) values
    (p_ministry, 'Adoração', 'Músicas que exaltam quem Deus é.'),
    (p_ministry, 'Louvor', 'Gratidão pelo que Deus fez, faz e fará.'),
    (p_ministry, 'Celebração', 'Músicas alegres, para celebrar.'),
    (p_ministry, 'Consagração', 'Entrega e dedicação da vida a Deus.'),
    (p_ministry, 'Ceia', 'Para a santa ceia.'),
    (p_ministry, 'Especiais', 'Casamentos, batismos e datas especiais.');
end;
$$;
grant execute on function public.seed_categories(uuid) to authenticated;

-- Fotos de perfil: banners/avatars/<id da pessoa>/<arquivo>. Cada um cuida só da sua.
drop policy if exists "avatars: a pessoa envia" on storage.objects;
create policy "avatars: a pessoa envia" on storage.objects
  for insert to authenticated with check (bucket_id = 'banners' and name like 'avatars/' || auth.uid()::text || '/%');
drop policy if exists "avatars: a pessoa troca" on storage.objects;
create policy "avatars: a pessoa troca" on storage.objects
  for update to authenticated using (bucket_id = 'banners' and name like 'avatars/' || auth.uid()::text || '/%');
drop policy if exists "avatars: a pessoa apaga" on storage.objects;
create policy "avatars: a pessoa apaga" on storage.objects
  for delete to authenticated using (bucket_id = 'banners' and name like 'avatars/' || auth.uid()::text || '/%');

-- Ministérios novos já nascem com funções com ícone e classificações.
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
  insert into roles (ministry_id, name, icon, position)
    select new_id, r.name, r.icon, r.pos from unnest(
      array['Ministro(a)', 'Vocal', 'Backing vocal', 'Teclado', 'Violão', 'Guitarra', 'Baixo', 'Bateria', 'Som', 'Projeção'],
      array['🎙️', '🎤', '🎤', '🎹', '🪕', '🎸', '🎸', '🥁', '🎛️', '📽️']
    ) with ordinality as r(name, icon, pos);
  perform public.seed_categories(new_id);
  return new_id;
end;
$$;
