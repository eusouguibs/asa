-- Asa — chat do ministério.
-- Como usar: no Supabase, abra "SQL Editor", cole todo este arquivo e clique em "Run".
-- Pode rodar mais de uma vez sem problema.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.ministries (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  text text not null check (length(trim(text)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_ministry_time_idx on public.messages (ministry_id, created_at desc);

alter table public.messages enable row level security;
drop policy if exists "chat: membros leem" on public.messages;
create policy "chat: membros leem" on public.messages for select using (public.is_member(ministry_id));
drop policy if exists "chat: membros escrevem" on public.messages;
create policy "chat: membros escrevem" on public.messages for insert
  with check (author_id = auth.uid() and public.is_member(ministry_id));
drop policy if exists "chat: autor ou admin apaga" on public.messages;
create policy "chat: autor ou admin apaga" on public.messages for delete
  using (author_id = auth.uid() or public.is_admin(ministry_id));

-- Mensagens chegam na hora para quem está com o app aberto (Supabase Realtime).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
