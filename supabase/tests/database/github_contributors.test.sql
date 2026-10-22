begin;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-91000000000a', 'a@gh.local', '{"username": "gh_ana"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

select pg_temp.login('00000000-0000-0000-0000-91000000000a');
select throws_ok($$ select public.record_github_contribution(auth.uid(), 'issue', 'ana', 'https://github.com/x/y/issues/1') $$,
  '42501', null, 'nadie se da el logro desde la app');
select throws_ok($$ update public.profiles set avatar_parts = '{"palette": "terminal"}' where id = auth.uid() $$, 'P0001', null,
  'sin el logro, el color terminal está bloqueado');
reset role;
select set_config('request.jwt.claims', '', true);

select is(public.record_github_contribution('00000000-0000-0000-0000-91000000000a', 'issue', 'ana', 'https://github.com/x/y/issues/1'),
  true, 'el webhook registra la issue');
select is(public.record_github_contribution('00000000-0000-0000-0000-91000000000a', 'issue', 'ana', 'https://github.com/x/y/issues/1'),
  false, 'repetida no cuenta dos veces');
select ok(exists (select 1 from public.user_achievements where user_id = '00000000-0000-0000-0000-91000000000a' and achievement = 'contributor'),
  'y da el logro Colaborador');

select * from finish();
rollback;
