-- Idioma de cada usuario, para lo que le llega fuera de la app (avisos push y
-- emails). Lo pone el registro (metadato `locale`) y la app lo mantiene al día
-- cuando cambia de idioma.

alter table public.profiles
  add column locale text not null default 'es' check (locale in ('es', 'en'));

grant update (locale) on public.profiles to authenticated;

-- Al registrarse: el idioma con el que se creó la cuenta. Va después de
-- on_auth_user_created (los triggers se ejecutan por orden alfabético).
create function private.set_user_locale()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ->> 'locale' in ('es', 'en') then
    update public.profiles set locale = new.raw_user_meta_data ->> 'locale' where id = new.id;
  end if;
  return new;
end;
$$;

revoke execute on function private.set_user_locale() from public;

create trigger on_auth_user_locale
  after insert on auth.users
  for each row execute function private.set_user_locale();
