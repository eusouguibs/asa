-- Asa — excluir a própria conta (exigência da App Store e da Play Store).
-- Como usar: no Supabase, abra "SQL Editor", cole todo este arquivo e clique em "Run".
-- Pode rodar mais de uma vez sem problema.

-- Apaga a conta de quem está logado, com todos os dados pessoais dela
-- (perfil, participação nos ministérios, escalas e avisos que escreveu).
-- Ministérios que a pessoa criou não somem: passam para outro administrador;
-- se não houver, o membro mais antigo vira administrador; se o ministério
-- ficar sem ninguém, ele é apagado.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  m record;
  heir uuid;
begin
  if me is null then raise exception 'Entre na sua conta primeiro.'; end if;

  for m in select id from ministries where owner_id = me loop
    select user_id into heir from members
      where ministry_id = m.id and user_id <> me
      order by (role = 'admin') desc, created_at asc
      limit 1;
    if heir is null then
      delete from ministries where id = m.id;
    else
      update members set role = 'admin' where ministry_id = m.id and user_id = heir;
      update ministries set owner_id = heir where id = m.id;
    end if;
  end loop;

  -- Os demais dados ligados à conta são apagados juntos (on delete cascade).
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
