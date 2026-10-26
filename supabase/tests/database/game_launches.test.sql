begin;
select plan(4);

select is(private.check_game_launches('2026-11-02 03:05:00+01'), false, 'de madrugada no se mira');
select is(private.check_game_launches('2026-11-02 12:05:00+01'), true, 'a mediodía sí');

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-9c000000000a', 'a@launch.local', '{"username": "gl_ana"}');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-9c000000000a", "role": "authenticated"}', true);
select throws_ok($$ select * from public.game_launches $$, '42501', null, 'los clientes no la ven');
reset role;

select ok(exists (select 1 from cron.job where jobname = 'game-launches'), 'se mira cada hora');

select * from finish();
rollback;
