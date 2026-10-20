-- Wordle: la palabra del día, igual para todos, con 6 intentos.
--
-- La palabra nunca llega al cliente. El servidor de Next pasa su lista de
-- soluciones y la primera vez que alguien juega ese día se elige una al azar
-- que no haya salido antes (wordle_today). Next puntúa cada intento y lo
-- registra con la service role (wordle_add_guess). Aquí solo se guardan la
-- palabra de cada día, los intentos y sus colores.
--
-- Terminar (acertando o no) cuenta para la racha y da XP: más cuantos menos
-- intentos se usen.

create table private.wordle_words (
  day date primary key,
  word text not null check (word ~ '^[a-zñ]{5}$'),
  created_at timestamptz not null default now()
);

create table public.wordle_games (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  guesses text[] not null default '{}',
  -- Colores de cada intento: g (en su sitio), y (en otro sitio), b (no está).
  patterns text[] not null default '{}',
  solved boolean not null default false,
  finished_at timestamptz,
  primary key (user_id, day),
  constraint wordle_games_same_length check (cardinality(guesses) = cardinality(patterns)),
  constraint wordle_games_max_guesses check (cardinality(guesses) <= 6)
);

create index wordle_games_day_idx on public.wordle_games (day);

alter table public.wordle_games enable row level security;

create policy "Cada usuario ve sus partidas de Wordle"
  on public.wordle_games for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.wordle_games from anon, authenticated;
grant select on public.wordle_games to authenticated;

-- Palabra de hoy. La primera llamada del día elige al azar una de las
-- candidatas que no haya salido antes (si ya han salido todas, cualquiera);
-- las siguientes devuelven la ya fijada.
create function public.wordle_today(candidates text[])
returns table (day date, word text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := private.game_day();
  pick text;
begin
  if not exists (select 1 from private.wordle_words w where w.day = today) then
    select c into pick from unnest(candidates) c
    order by (c in (select w.word from private.wordle_words w)), random()
    limit 1;
    insert into private.wordle_words (day, word) values (today, pick) on conflict do nothing;
  end if;
  return query select w.day, w.word from private.wordle_words w where w.day = today;
end;
$$;

-- Registra un intento ya puntuado por el servidor. Devuelve la partida.
create function public.wordle_add_guess(player uuid, game_day date, guess text, pattern text)
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
  if guess !~ '^[a-zñ]{5}$' or pattern !~ '^[gyb]{5}$' then
    raise exception 'Intento no válido' using errcode = '22023';
  end if;

  insert into public.wordle_games (user_id, day) values (player, game_day) on conflict do nothing;
  select * into game from public.wordle_games g where g.user_id = player and g.day = game_day for update;

  if game.finished_at is not null then
    raise exception 'Ya has terminado la palabra de hoy' using errcode = 'P0001', hint = 'finished';
  end if;

  attempts := cardinality(game.guesses) + 1;
  update public.wordle_games g
  set guesses = g.guesses || guess,
      patterns = g.patterns || pattern,
      solved = pattern = 'ggggg',
      finished_at = case when pattern = 'ggggg' or attempts = 6 then now() end
  where g.user_id = player and g.day = game_day
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

-- Resultados de hoy tuyos y de tus amigos: solo colores, nunca letras.
create function public.get_wordle_friends()
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
    and g.finished_at is not null
    and (g.user_id = auth.uid() or private.are_friends(auth.uid(), g.user_id))
  order by g.solved desc, cardinality(g.guesses), g.finished_at;
$$;

revoke execute on function
  public.wordle_today(text[]),
  public.wordle_add_guess(uuid, date, text, text),
  public.get_wordle_friends()
from public, anon, authenticated;

grant execute on function
  public.wordle_today(text[]),
  public.wordle_add_guess(uuid, date, text, text)
to service_role;
grant execute on function public.get_wordle_friends() to authenticated;
