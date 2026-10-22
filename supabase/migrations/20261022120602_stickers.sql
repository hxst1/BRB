-- Stickers en el chat: tu monstruo con una expresión (risa, llorar…).
--
-- Se guardan como mensajes de tipo 'sticker' cuyo texto es el emoji de esa
-- expresión: así la lista de chats y los avisos push lo enseñan sin más. Los
-- dibujos están en packages/avatars (renderStickerSvg) y la lista en
-- apps/web/src/lib/stickers.ts; un test comprueba que coinciden con esta.

alter table public.messages drop constraint messages_kind_check;
alter table public.messages add constraint messages_kind_check check (kind in ('text', 'match', 'challenge', 'sticker'));
alter table public.messages drop constraint messages_ref_matches_kind;
alter table public.messages add constraint messages_ref_matches_kind check ((kind in ('text', 'sticker')) = (ref_id is null));

-- Emoji de cada sticker (null si no existe).
create function private.sticker_emoji(sticker text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case sticker
    when 'laugh' then '😂'
    when 'cry' then '😭'
    when 'sad' then '😢'
    when 'angry' then '😠'
    when 'love' then '😍'
    when 'shock' then '😱'
  end;
$$;

-- Envía un sticker. Mismas reglas que send_message: solo a amigos y con límite.
create function public.send_sticker(recipient uuid, sticker text)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  emoji text := private.sticker_emoji(send_sticker.sticker);
  result public.messages;
begin
  if me is null then
    raise exception 'Hay que iniciar sesión' using errcode = '28000';
  end if;
  if not private.are_friends(me, recipient) then
    raise exception 'Solo puedes escribir a tus amigos' using errcode = 'P0001', hint = 'not_friends';
  end if;
  if emoji is null then
    raise exception 'Ese sticker no existe' using errcode = '22023', hint = 'unknown_sticker';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('send_message:' || me::text, 0));
  if (
    select count(*) from public.messages m
    where m.sender_id = me and m.created_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception 'Vas muy rápido, espera un momento' using errcode = 'P0001', hint = 'rate_limited';
  end if;

  insert into public.messages (sender_id, recipient_id, body, kind)
  values (me, recipient, emoji, 'sticker')
  returning * into result;
  return result;
end;
$$;

revoke execute on function public.send_sticker(uuid, text) from public, anon, authenticated;
grant execute on function public.send_sticker(uuid, text) to authenticated;
revoke execute on function private.sticker_emoji(text) from public;
