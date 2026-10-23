begin;
select plan(3);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-92000000000a', 'm@gh.local', '{"username": "gh_maint"}');

select is(public.record_github_contribution('00000000-0000-0000-0000-92000000000a', 'maintainer', 'maint', 'https://github.com/x/y'),
  true, 'se puede registrar a quien mantiene el repo');
select ok(exists (select 1 from public.user_achievements where user_id = '00000000-0000-0000-0000-92000000000a' and achievement = 'contributor'),
  'y le da el logro Colaborador');
select throws_ok($$ select public.record_github_contribution('00000000-0000-0000-0000-92000000000a', 'commit', 'maint', 'https://github.com/x/y') $$,
  '23514', null, 'otros tipos siguen sin valer');

select * from finish();
rollback;
