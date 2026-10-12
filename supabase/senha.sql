-- Asa — entrar com e-mail e senha (sem depender de e-mail chegando).
-- Como usar: no Supabase, abra "SQL Editor", cole todo este arquivo e clique em "Run".
-- Pode rodar mais de uma vez sem problema.

create extension if not exists pgcrypto with schema extensions;

-- Quem já tinha conta (entrava por código) cria a primeira senha.
-- Só funciona enquanto a conta ainda não tem senha nenhuma.
create or replace function public.set_initial_password(p_email text, p_password text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid;
begin
  if length(coalesce(p_password, '')) < 6 then raise exception 'A senha precisa ter pelo menos 6 caracteres.'; end if;
  select id into uid from auth.users
    where lower(email) = lower(trim(p_email)) and coalesce(encrypted_password, '') = '';
  if uid is null then return false; end if;
  update auth.users
    set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    where id = uid;
  return true;
end;
$$;
revoke all on function public.set_initial_password(text, text) from public;
grant execute on function public.set_initial_password(text, text) to anon, authenticated;

-- "Esqueci a senha": um administrador cria uma senha provisória para alguém do seu ministério.
create or replace function public.admin_set_password(p_user uuid, p_password text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if length(coalesce(p_password, '')) < 6 then raise exception 'A senha precisa ter pelo menos 6 caracteres.'; end if;
  if not exists (
    select 1 from members a join members b on a.ministry_id = b.ministry_id
    where a.user_id = auth.uid() and a.role = 'admin' and b.user_id = p_user
  ) then raise exception 'Só um administrador do mesmo ministério pode fazer isso.'; end if;
  update auth.users
    set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    where id = p_user;
end;
$$;
revoke all on function public.admin_set_password(uuid, text) from public;
grant execute on function public.admin_set_password(uuid, text) to authenticated;
