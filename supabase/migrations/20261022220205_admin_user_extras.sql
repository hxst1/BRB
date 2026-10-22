-- Lecturas para la ficha de usuario del panel: sus colaboraciones en GitHub y
-- sus invitaciones (quién le invitó y a quién ha invitado). Solo service_role.

-- ¿Ha jugado al menos una partida? (el mismo criterio que el logro referrals-5)
create function private.has_played(player uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.game_runs g where g.user_id = player and g.status = 'finished')
      or exists (select 1 from public.matches m where m.status = 'finished' and player in (m.player_x, m.player_o));
$$;

create function public.admin_get_github_contributions(user_id uuid)
returns table (id bigint, kind text, github_login text, url text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.kind, c.github_login, c.url, c.created_at
  from private.github_contributions c
  where c.user_id = admin_get_github_contributions.user_id
  order by c.created_at desc, c.id desc;
$$;

create function public.admin_get_referrals(user_id uuid)
returns table (
  direction text, user_id uuid, username text, avatar_seed bigint, avatar_parts jsonb,
  friend_code text, has_played boolean, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select x.direction, p.id, p.username, p.avatar_seed, p.avatar_parts, c.code, private.has_played(p.id), x.created_at
  from (
    select 'invited_by' as direction, r.referrer_id as other, r.created_at, 0 as sort
    from private.referrals r where r.referred_id = admin_get_referrals.user_id
    union all
    select 'invited', r.referred_id, r.created_at, 1
    from private.referrals r where r.referrer_id = admin_get_referrals.user_id
  ) x
  join public.profiles p on p.id = x.other
  left join public.friend_codes c on c.user_id = p.id
  order by x.sort, x.created_at desc;
$$;

revoke execute on function
  public.admin_get_github_contributions(uuid),
  public.admin_get_referrals(uuid)
from public, anon, authenticated;
grant execute on function
  public.admin_get_github_contributions(uuid),
  public.admin_get_referrals(uuid)
to service_role;
revoke execute on function private.has_played(uuid) from public;
