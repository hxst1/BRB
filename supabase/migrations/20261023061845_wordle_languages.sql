-- Wordle en español y en inglés: cada día hay una palabra por idioma, y cada
-- jugador tiene una partida por idioma. Lo que ya había es de español.

alter table private.wordle_words
  add column lang text not null default 'es' check (lang in ('es', 'en'));
alter table private.wordle_words drop constraint wordle_words_pkey;
alter table private.wordle_words add primary key (day, lang);

alter table public.wordle_games
  add column lang text not null default 'es' check (lang in ('es', 'en'));
alter table public.wordle_games drop constraint wordle_games_pkey;
alter table public.wordle_games add primary key (user_id, day, lang);

drop function public.wordle_today(text[]);
drop function public.wordle_add_guess(uuid, date, text, text);
drop function public.get_wordle_friends();

-- Palabra de hoy en ese idioma (se elige la primera vez que se pide en el día,
-- entre las que aún no han salido en ese idioma).
create function public.wordle_today(candidates text[], lang text default 'es')
returns table (day date, word text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := private.game_day();
  pick text;
begin
  if lang not in ('es', 'en') then
    raise exception 'Idioma no válido' using errcode = '22023';
  end if;
  if not exists (select 1 from private.wordle_words w where w.day = today and w.lang = wordle_today.lang) then
    select c into pick from unnest(candidates) c
    order by (c in (select w.word from private.wordle_words w where w.lang = wordle_today.lang)), random()
    limit 1;
    insert into private.wordle_words (day, word, lang) values (today, pick, wordle_today.lang) on conflict do nothing;
  end if;
  return query select w.day, w.word from private.wordle_words w where w.day = today and w.lang = wordle_today.lang;
end;
$$;

create function public.wordle_add_guess(player uuid, game_day date, guess text, pattern text, lang text default 'es')
returns public.wordle_games
language plpgsql
security definer
set search_path = ''
as $$
declare
  game public.wordle_games;
  attempts integer;
begin
  if game_day <> private.game_day() then
    raise exception 'La palabra de ese día ya no se puede jugar' using errcode = 'P0001', hint = 'day_changed';
  end if;
  if guess !~ '^[a-zñ]{5}$' or pattern !~ '^[gyb]{5}$' or lang not in ('es', 'en') then
    raise exception 'Intento no válido' using errcode = '22023';
  end if;

  insert into public.wordle_games (user_id, day, lang) values (player, game_day, wordle_add_guess.lang) on conflict do nothing;
  select * into game from public.wordle_games g
  where g.user_id = player and g.day = game_day and g.lang = wordle_add_guess.lang
  for update;

  if game.finished_at is not null then
    raise exception 'Ya has terminado la palabra de hoy' using errcode = 'P0001', hint = 'finished';
  end if;

  attempts := cardinality(game.guesses) + 1;
  update public.wordle_games g
  set guesses = g.guesses || guess,
      patterns = g.patterns || pattern,
      solved = pattern = 'ggggg',
      finished_at = case when pattern = 'ggggg' or attempts = 6 then now() end
  where g.user_id = player and g.day = game_day and g.lang = wordle_add_guess.lang
  returning * into game;

  if game.finished_at is not null then
    perform private.touch_streak(player);
    update public.profiles p
    set xp = p.xp + case when game.solved then 11 - attempts else 2 end
    where p.id = player;
  end if;
  return game;
end;
$$;

-- Resultados de hoy de tus amigos en ese idioma.
create function public.get_wordle_friends(lang text default 'es')
returns table (
  user_id uuid,
  username text,
  avatar_seed bigint,
  avatar_parts jsonb,
  attempts integer,
  solved boolean,
  patterns text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.avatar_seed, p.avatar_parts, cardinality(g.guesses), g.solved, g.patterns
  from public.wordle_games g
  join public.profiles p on p.id = g.user_id
  where g.day = private.game_day()
    and g.lang = get_wordle_friends.lang
    and g.finished_at is not null
    and (g.user_id = auth.uid() or private.are_friends(auth.uid(), g.user_id))
  order by g.solved desc, cardinality(g.guesses), g.finished_at;
$$;

revoke execute on function
  public.wordle_today(text[], text),
  public.wordle_add_guess(uuid, date, text, text, text),
  public.get_wordle_friends(text)
from public, anon, authenticated;

grant execute on function
  public.wordle_today(text[], text),
  public.wordle_add_guess(uuid, date, text, text, text)
to service_role;
grant execute on function public.get_wordle_friends(text) to authenticated;
