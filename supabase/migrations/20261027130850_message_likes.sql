-- "Me gusta" en el chat: dos toques en un mensaje (de texto o sticker) le
-- ponen un corazón. Se guarda en el propio mensaje quién le ha dado me gusta,
-- así el cambio llega en directo por el mismo canal del chat (UPDATE de
-- messages, que RLS ya limita a los dos de la conversación).

alter table public.messages add column liked_by uuid[] not null default '{}';

-- Pone o quita el me gusta del usuario en un mensaje de su conversación.
-- Devuelve quién le ha dado me gusta después del cambio.
create function public.like_message(message_id uuid, liked boolean default true)
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  result uuid[];
begin
  if me is null then
    raise exception 'Hay que iniciar sesión' using errcode = '28000';
  end if;

  update public.messages m
  set liked_by = case
    when like_message.liked then (select array_agg(distinct x) from unnest(m.liked_by || me) x)
    else array_remove(m.liked_by, me)
  end
  where m.id = like_message.message_id
    and me in (m.sender_id, m.recipient_id)
    and m.kind in ('text', 'sticker')
  returning m.liked_by into result;

  if not found then
    raise exception 'Mensaje no encontrado' using errcode = 'P0002';
  end if;
  return result;
end;
$$;

revoke execute on function public.like_message(uuid, boolean) from public, anon, authenticated;
grant execute on function public.like_message(uuid, boolean) to authenticated;
