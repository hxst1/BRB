-- El logro «Desde Product Hunt» también da un color para el monster (la
-- paleta 'launch', naranja). El tema de la app 'launch' va en el navegador
-- (apps/web/src/lib/theme.ts), como los demás tintes.

create or replace function private.part_achievement(slot text, id text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when slot = 'palette' and id = 'ember' then 'streak-30'
    when slot = 'palette' and id = 'ultra' then 'tile-2048'
    when slot = 'palette' and id = 'ice' then 'minesweeper-hard'
    when slot = 'palette' and id = 'jungle' then 'snake-30'
    when slot = 'palette' and id = 'terminal' then 'contributor'
    when slot = 'palette' and id = 'neon' then 'referrals-5'
    when slot = 'palette' and id = 'launch' then 'product-hunt'
    when slot = 'top' and id = 'cap' then 'first-run'
    when slot = 'top' and id = 'headphones' then 'friends-3'
    when slot = 'top' and id = 'flower' then 'streak-7'
    when slot = 'top' and id = 'bow' then 'wordle-3'
    when slot = 'top' and id = 'halo' then 'lightsout-10'
    when slot = 'top' and id = 'wizard' then 'sudoku-hard'
    when slot = 'top' and id = 'party' then 'winner-5'
    when slot = 'top' and id = 'launch' then 'product-hunt'
  end;
$$;
