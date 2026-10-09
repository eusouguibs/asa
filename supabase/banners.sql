-- Asa — banners e artes dos eventos.
-- Como usar: no Supabase, abra "SQL Editor", cole todo este arquivo e clique em "Run".
-- Pode rodar mais de uma vez sem problema.

-- Endereço do banner de cada evento (vazio = sem banner).
alter table public.events add column if not exists banner text not null default '';

-- Ajustes da arte automática de cada escala (título, cores, formato, frase, foto de fundo).
alter table public.events add column if not exists art jsonb;

-- Pasta pública de imagens "banners": qualquer pessoa com o link vê a imagem;
-- só aceita JPG, PNG ou WebP de até 2 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('banners', 'banners', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Cada imagem fica na pasta do ministério: banners/<id do ministério>/<arquivo>.
-- Só administradores do ministério enviam, trocam e apagam.
create or replace function public.banner_ministry(path text) returns uuid
language plpgsql immutable as $$
begin
  return split_part(path, '/', 1)::uuid;
exception when others then
  return null;
end;
$$;

drop policy if exists "banners: membros veem" on storage.objects;
create policy "banners: membros veem" on storage.objects
  for select to authenticated using (bucket_id = 'banners' and public.is_member(public.banner_ministry(name)));

drop policy if exists "banners: admins enviam" on storage.objects;
create policy "banners: admins enviam" on storage.objects
  for insert to authenticated with check (bucket_id = 'banners' and public.is_admin(public.banner_ministry(name)));

drop policy if exists "banners: admins trocam" on storage.objects;
create policy "banners: admins trocam" on storage.objects
  for update to authenticated using (bucket_id = 'banners' and public.is_admin(public.banner_ministry(name)));

drop policy if exists "banners: admins apagam" on storage.objects;
create policy "banners: admins apagam" on storage.objects
  for delete to authenticated using (bucket_id = 'banners' and public.is_admin(public.banner_ministry(name)));
