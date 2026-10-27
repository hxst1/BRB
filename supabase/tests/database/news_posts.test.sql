begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-5e000000000a', 'a@news.local', '{"username": "news_ana"}');

discard plans;

set local role service_role;
-- Uno ya publicado y otro programado para dentro de un día.
select isnt(public.admin_save_news_post('00000000-0000-0000-0000-5e000000000a', null, 'hola-mundo', 'news', 'Hola, mundo', 'Primer **anuncio**.'), null,
  'el panel crea un anuncio');
select lives_ok($$ select public.admin_save_news_post('00000000-0000-0000-0000-5e000000000a', null, 'programado', 'event', 'Mañana', 'Sale mañana.',
  published_at => now() + interval '1 day') $$, 'y uno programado');
select is((select count(*)::integer from public.admin_list_news_posts() where slug in ('hola-mundo', 'programado')), 2, 'el panel los ve todos');
select throws_ok($$ select public.admin_save_news_post('00000000-0000-0000-0000-5e000000000a', null, 'con-boton', 'news', 'Con botón', 'Texto',
  cta_url => 'javascript:alert(1)', cta_label_es => 'Abrir') $$, '23514', null, 'los botones solo llevan a la app o a https');
reset role;

set local role anon;
select is((select count(*)::integer from public.news_posts where slug in ('hola-mundo', 'programado')), 1, 'sin cuenta se ven solo los publicados');
select throws_ok($$ select public.admin_save_news_post('00000000-0000-0000-0000-5e000000000a', null, 'colado', 'news', 'Colado', 'No') $$,
  '42501', null, 'y nadie más que el panel los escribe');
select throws_ok($$ insert into public.news_posts (slug, kind, title_es, body_es) values ('colado', 'news', 'Colado', 'No') $$,
  '42501', null, 'ni directamente en la tabla');
reset role;

set local role service_role;
select lives_ok($$ select public.admin_delete_news_post('00000000-0000-0000-0000-5e000000000a', (select id from public.news_posts where slug = 'hola-mundo')) $$,
  'el panel los borra');
reset role;
select is((select count(*)::integer from private.admin_audit where admin_id = '00000000-0000-0000-0000-5e000000000a'), 3, 'y todo queda en la auditoría');

select * from finish();
rollback;
