-- Retos dentro del chat: al retar a alguien (3 en raya o 2048) aparece en
-- vuestra conversación una tarjeta con el reto, que muestra su estado en vivo
-- y permite responder desde ahí.
--
-- El mensaje guarda el tipo y la referencia; el cuerpo es un texto de
-- respaldo para la lista de chats y para clientes que no pinten tarjetas.

alter table public.messages
  add column kind text not null default 'text' check (kind in ('text', 'match', 'challenge')),
  add column ref_id uuid,
  add constraint messages_ref_matches_kind check ((kind = 'text') = (ref_id is null));

-- security definer: se dispara al insertar como el usuario, que no tiene
-- acceso al esquema private ni puede insertar mensajes directamente.
create function private.post_match_embed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.messages (sender_id, recipient_id, body, kind, ref_id)
  values (
    new.created_by,
    case when new.created_by = new.player_x then new.player_o else new.player_x end,
    'Reto al 3 en raya',
    'match',
    new.id
  );
  return new;
end;
$$;

create trigger post_match_embed
  after insert on public.matches
  for each row execute function private.post_match_embed();

create function private.post_challenge_embed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.messages (sender_id, recipient_id, body, kind, ref_id)
  values (
    new.challenger_id,
    new.challenged_id,
    'Reto al 2048: supera ' || replace(to_char(new.target_score, 'FM999,999,999'), ',', '.'),
    'challenge',
    new.id
  );
  return new;
end;
$$;

create trigger post_challenge_embed
  after insert on public.challenges
  for each row execute function private.post_challenge_embed();
