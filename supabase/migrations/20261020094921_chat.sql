-- Chat 1 a 1 entre amigos.
--
-- Una conversación es simplemente la pareja (no hay tabla de conversaciones).
-- Los mensajes se envían con `send_message` (valida amistad, longitud y
-- ritmo) y llegan al otro por Realtime; RLS hace que cada uno solo reciba los
-- suyos.

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint messages_not_self check (sender_id <> recipient_id)
);

create index messages_pair_idx
  on public.messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);
create index messages_unread_idx on public.messages (recipient_id) where read_at is null;

alter table public.messages enable row level security;

create policy "Cada usuario ve sus mensajes"
  on public.messages for select
  to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));

revoke all on public.messages from anon, authenticated;
grant select on public.messages to authenticated;

-- También amistades y retos: la cabecera y el panel se refrescan al cambiar
-- (RLS hace que cada usuario solo reciba los suyos).
alter publication supabase_realtime add table public.messages, public.friendships, public.challenges;

-- Ritmo de envío: se cuentan los mensajes del último minuto.
create function public.send_message(recipient uuid, body text)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  clean text := btrim(body);
  result public.messages;
begin
  if me is null then
    raise exception 'Hay que iniciar sesión' using errcode = '28000';
  end if;
  if not private.are_friends(me, recipient) then
    raise exception 'Solo puedes escribir a tus amigos' using errcode = 'P0001', hint = 'not_friends';
  end if;
  if char_length(clean) = 0 then
    raise exception 'El mensaje está vacío' using errcode = '22023', hint = 'empty';
  end if;
  if char_length(clean) > 1000 then
    raise exception 'El mensaje es demasiado largo' using errcode = '22023', hint = 'too_long';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('send_message:' || me::text, 0));
  if (
    select count(*) from public.messages m
    where m.sender_id = me and m.created_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception 'Vas muy rápido, espera un momento' using errcode = 'P0001', hint = 'rate_limited';
  end if;

  insert into public.messages (sender_id, recipient_id, body)
  values (me, recipient, clean)
  returning * into result;
  return result;
end;
$$;

-- Marca como leídos los mensajes que un amigo te ha enviado.
create function public.mark_conversation_read(friend uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.messages
  set read_at = now()
  where recipient_id = auth.uid() and sender_id = friend and read_at is null;
$$;

-- Lista de conversaciones: todos tus amigos, con el último mensaje y los no
-- leídos; primero las que tienen actividad más reciente.
create function public.get_conversations()
returns table (
  friend_id uuid,
  username text,
  avatar_seed bigint,
  avatar_parts jsonb,
  last_body text,
  last_from_me boolean,
  last_at timestamptz,
  unread integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with friends as (
    select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as id
    from public.friendships f
    where f.status = 'accepted' and auth.uid() in (f.requester_id, f.addressee_id)
  )
  select
    p.id,
    p.username,
    p.avatar_seed,
    p.avatar_parts,
    last.body,
    last.sender_id = auth.uid(),
    last.created_at,
    (select count(*)::integer from public.messages u
     where u.recipient_id = auth.uid() and u.sender_id = p.id and u.read_at is null)
  from friends
  join public.profiles p on p.id = friends.id
  left join lateral (
    select m.body, m.sender_id, m.created_at
    from public.messages m
    where least(m.sender_id, m.recipient_id) = least(auth.uid(), p.id)
      and greatest(m.sender_id, m.recipient_id) = greatest(auth.uid(), p.id)
    order by m.created_at desc
    limit 1
  ) last on true
  order by last.created_at desc nulls last, p.username;
$$;

create function public.get_unread_messages()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.messages where recipient_id = auth.uid() and read_at is null;
$$;

revoke execute on function
  public.send_message(uuid, text),
  public.mark_conversation_read(uuid),
  public.get_conversations(),
  public.get_unread_messages()
from public, anon, authenticated;

grant execute on function
  public.send_message(uuid, text),
  public.mark_conversation_read(uuid),
  public.get_conversations(),
  public.get_unread_messages()
to authenticated;
