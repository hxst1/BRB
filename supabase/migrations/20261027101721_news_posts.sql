-- Novedades: los anuncios de la página /novedades (premios, eventos, cambios…).
--
-- Se escriben desde el panel de admin y se pueden programar: un anuncio con
-- published_at en el futuro no se ve hasta esa hora. Los juegos nuevos no van
-- aquí: la página los saca de la lista de juegos del código (lib/seo.ts, addedAt).
-- El cuerpo es el Markdown sencillo de los textos legales (lib/markdown.ts).
-- El inglés es opcional: sin él, se enseña el español.

create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  -- Para el enlace (/novedades#slug) y para marcarlo como visto (seen_announcements: 'post-<slug>').
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,34}$'),
  kind text not null default 'news' check (kind in ('news', 'reward', 'event', 'update')),
  title_es text not null check (char_length(title_es) between 3 and 120),
  body_es text not null check (char_length(body_es) between 1 and 8000),
  title_en text check (title_en is null or char_length(title_en) between 3 and 120),
  body_en text check (body_en is null or char_length(body_en) between 1 and 8000),
  -- Botón opcional: a una página de la app (/…) o a una web (https://…).
  cta_url text check (cta_url is null or cta_url ~ '^(https://|/)'),
  cta_label_es text check (cta_label_es is null or char_length(cta_label_es) between 1 and 40),
  cta_label_en text check (cta_label_en is null or char_length(cta_label_en) between 1 and 40),
  -- Fijado: sale el primero aunque haya otros más nuevos.
  pinned boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_posts_cta check ((cta_url is null) = (cta_label_es is null))
);

create index news_posts_published_idx on public.news_posts (published_at desc);

alter table public.news_posts enable row level security;
revoke all on public.news_posts from anon, authenticated;
grant select on public.news_posts to anon, authenticated;

create policy "Las novedades publicadas son públicas"
  on public.news_posts for select
  to anon, authenticated
  using (published_at <= now());

-- ---------------------------------------------------------------------------
-- Panel de admin (solo service_role, como las demás admin_*)
-- ---------------------------------------------------------------------------

-- Todas, también las programadas.
create function public.admin_list_news_posts()
returns setof public.news_posts
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.news_posts order by published_at desc;
$$;

-- Crea (sin post_id) o cambia un anuncio. Devuelve su id.
create function public.admin_save_news_post(
  admin_id uuid,
  post_id uuid,
  slug text,
  kind text,
  title_es text,
  body_es text,
  title_en text default null,
  body_en text default null,
  cta_url text default null,
  cta_label_es text default null,
  cta_label_en text default null,
  pinned boolean default false,
  published_at timestamptz default now(),
  reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved uuid;
begin
  if post_id is null then
    insert into public.news_posts (slug, kind, title_es, body_es, title_en, body_en, cta_url, cta_label_es, cta_label_en, pinned, published_at)
    values (admin_save_news_post.slug, admin_save_news_post.kind, trim(admin_save_news_post.title_es), admin_save_news_post.body_es,
            nullif(trim(admin_save_news_post.title_en), ''), nullif(admin_save_news_post.body_en, ''),
            nullif(trim(admin_save_news_post.cta_url), ''), nullif(trim(admin_save_news_post.cta_label_es), ''),
            nullif(trim(admin_save_news_post.cta_label_en), ''), admin_save_news_post.pinned, admin_save_news_post.published_at)
    returning id into saved;
  else
    update public.news_posts p
    set slug = admin_save_news_post.slug,
        kind = admin_save_news_post.kind,
        title_es = trim(admin_save_news_post.title_es),
        body_es = admin_save_news_post.body_es,
        title_en = nullif(trim(admin_save_news_post.title_en), ''),
        body_en = nullif(admin_save_news_post.body_en, ''),
        cta_url = nullif(trim(admin_save_news_post.cta_url), ''),
        cta_label_es = nullif(trim(admin_save_news_post.cta_label_es), ''),
        cta_label_en = nullif(trim(admin_save_news_post.cta_label_en), ''),
        pinned = admin_save_news_post.pinned,
        published_at = admin_save_news_post.published_at,
        updated_at = now()
    where p.id = post_id
    returning p.id into saved;
    if saved is null then
      raise exception 'No existe ese anuncio' using errcode = 'P0002';
    end if;
  end if;

  perform private.admin_log(admin_save_news_post.admin_id, case when post_id is null then 'create_news_post' else 'update_news_post' end,
    null, admin_save_news_post.slug, admin_save_news_post.reason, '{}'::jsonb);
  return saved;
end;
$$;

create function public.admin_delete_news_post(admin_id uuid, post_id uuid, reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed text;
begin
  delete from public.news_posts p where p.id = post_id returning p.slug into removed;
  if removed is null then
    raise exception 'No existe ese anuncio' using errcode = 'P0002';
  end if;
  perform private.admin_log(admin_delete_news_post.admin_id, 'delete_news_post', null, removed, admin_delete_news_post.reason, '{}'::jsonb);
end;
$$;

revoke execute on function
  public.admin_list_news_posts(),
  public.admin_save_news_post(uuid, uuid, text, text, text, text, text, text, text, text, text, boolean, timestamptz, text),
  public.admin_delete_news_post(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function
  public.admin_list_news_posts(),
  public.admin_save_news_post(uuid, uuid, text, text, text, text, text, text, text, text, text, boolean, timestamptz, text),
  public.admin_delete_news_post(uuid, uuid, text)
to service_role;

-- ---------------------------------------------------------------------------
-- El primer anuncio: el lanzamiento en Product Hunt (sale a la hora del lanzamiento).
-- No se premia votar (las normas de Product Hunt lo prohíben): se premia llegar
-- desde allí. El botón a Product Hunt se añade desde el panel cuando esté el enlace.
-- ---------------------------------------------------------------------------

insert into public.news_posts (slug, kind, title_es, body_es, title_en, body_en, pinned, published_at) values (
  'product-hunt',
  'reward',
  'Estamos en Product Hunt: llévate el gorro del lanzamiento',
  $es$Hoy salimos en **Product Hunt**, la web donde se presentan productos nuevos cada día.

Para celebrarlo, quien entre en la app **desde Product Hunt** esta semana, con su cuenta, se lleva tres cosas que no se podrán conseguir después:

- Un **gorro** naranja para su monster.
- El **color lanzamiento** para el monster.
- El **tema lanzamiento** para toda la app.

Se puede conseguir hasta el **4 de noviembre**. Si aún no tienes cuenta, créala al llegar y te lo llevas igual. Y si te apetece, cuéntanos allí qué te parece.$es$,
  'We''re on Product Hunt: get the launch beanie',
  $en$Today we launch on **Product Hunt**, the site where new products are shown every day.

To celebrate, everyone who comes into the app **from Product Hunt** this week, signed in, gets three things that won't be available afterwards:

- An orange **beanie** for their monster.
- The **launch colour** for the monster.
- The **launch theme** for the whole app.

It's available until **4 November**. If you don't have an account yet, create one when you arrive and you'll still get it. And if you like, tell us there what you think.$en$,
  true,
  timestamptz '2026-10-28 09:01 Europe/Madrid'
);
