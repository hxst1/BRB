-- Mensajes de los jugadores: problemas, ideas y valoraciones (1 a 5 estrellas).
--
-- Se envían con submit_feedback (con límite por hora) y cada uno ve los suyos,
-- con su estado y la respuesta si la hay. El panel de admin (repo aparte) los
-- lee y cambia `status` y `admin_reply` con la clave secreta (service_role).

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('bug', 'idea', 'rating')),
  body text check (char_length(body) <= 2000),
  rating smallint check (rating between 1 and 5),
  -- Contexto para reproducir un problema: pantalla, navegador y versión (commit).
  path text check (char_length(path) <= 200),
  user_agent text check (char_length(user_agent) <= 400),
  app_version text check (char_length(app_version) <= 40),
  status text not null default 'new' check (status in ('new', 'seen', 'planned', 'done', 'dismissed')),
  admin_reply text check (char_length(admin_reply) <= 2000),
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- La valoración lleva estrellas; un problema o una idea, texto.
  constraint feedback_content check (
    case kind
      when 'rating' then rating is not null
      else rating is null and coalesce(char_length(trim(body)), 0) >= 3
    end
  )
);

create index feedback_user_idx on public.feedback (user_id, created_at desc);
-- Para la bandeja del panel de admin.
create index feedback_inbox_idx on public.feedback (status, created_at desc);

alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;
grant select on public.feedback to authenticated;

create policy "Cada usuario ve sus mensajes"
  on public.feedback for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Envía un mensaje. Como mucho 5 por hora y persona. Devuelve su id.
create function public.submit_feedback(
  kind text,
  body text default null,
  rating smallint default null,
  path text default null,
  user_agent text default null,
  app_version text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  new_id uuid;
begin
  if me is null then
    raise exception 'Hace falta iniciar sesión' using errcode = '42501';
  end if;
  if (select count(*) from public.feedback f where f.user_id = me and f.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Demasiados mensajes seguidos' using errcode = 'P0001', hint = 'rate_limited';
  end if;

  insert into public.feedback (user_id, kind, body, rating, path, user_agent, app_version)
  values (
    me,
    submit_feedback.kind,
    nullif(trim(submit_feedback.body), ''),
    submit_feedback.rating,
    left(submit_feedback.path, 200),
    left(submit_feedback.user_agent, 400),
    left(submit_feedback.app_version, 40)
  )
  returning id into new_id;
  return new_id;
end;
$$;

-- updated_at y replied_at se mantienen solos (el panel solo cambia status y admin_reply).
create function private.touch_feedback()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.admin_reply is distinct from old.admin_reply then
    new.replied_at := case when new.admin_reply is null then null else now() end;
  end if;
  return new;
end;
$$;

create trigger touch_feedback
  before update on public.feedback
  for each row execute function private.touch_feedback();

revoke execute on function public.submit_feedback(text, text, smallint, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_feedback(text, text, smallint, text, text, text) to authenticated;
revoke execute on function private.touch_feedback() from public;
