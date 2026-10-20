-- Datos de desarrollo local (solo se aplica en `supabase db reset`, nunca en la nube).
-- Usuarios: ana@test.local, bob@test.local, carla@test.local — contraseña: password123

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', jsonb_build_object('username', u.username), now(), now(),
  '', '', '', ''
from (values
  ('00000000-0000-0000-0000-00000000000a'::uuid, 'ana@test.local', 'ana'),
  ('00000000-0000-0000-0000-00000000000b'::uuid, 'bob@test.local', 'bob'),
  ('00000000-0000-0000-0000-00000000000c'::uuid, 'carla@test.local', 'carla')
) as u (id, email, username);

insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), id::text, id, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
from auth.users
where email like '%@test.local';

-- Códigos de amigo fijos para poder probar a mano (ana AAAAA, bob BBBBB, carla CCCCC).
update public.friend_codes set code = 'AAAAA' where user_id = '00000000-0000-0000-0000-00000000000a';
update public.friend_codes set code = 'BBBBB' where user_id = '00000000-0000-0000-0000-00000000000b';
update public.friend_codes set code = 'CCCCC' where user_id = '00000000-0000-0000-0000-00000000000c';

-- Ana y Bob son amigos; Carla le ha enviado una solicitud a Ana.
insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'accepted', now()),
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a', 'pending', null);

-- Puntuaciones de ejemplo para el ranking (sin movimientos reales: solo para ver la UI).
insert into public.game_runs (user_id, game, seed, status, score, max_tile, started_at, finished_at) values
  ('00000000-0000-0000-0000-00000000000a', '2048', 1, 'finished', 12840, 1024, now() - interval '2 days', now() - interval '2 days'),
  ('00000000-0000-0000-0000-00000000000a', '2048', 2, 'finished', 5320, 512, now() - interval '1 hour', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-00000000000b', '2048', 3, 'finished', 20716, 2048, now() - interval '10 days', now() - interval '10 days'),
  ('00000000-0000-0000-0000-00000000000b', '2048', 4, 'finished', 7004, 512, now() - interval '3 hours', now() - interval '3 hours'),
  ('00000000-0000-0000-0000-00000000000c', '2048', 5, 'finished', 3110, 256, now() - interval '20 minutes', now() - interval '20 minutes');
