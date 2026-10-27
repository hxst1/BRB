-- Japonés como tercer idioma de la app. Se guarda como idioma de cada usuario
-- (avisos push y emails) y como idioma de las visitas. Las palabras del Wordle,
-- los textos de la carrera de tecleo, las novedades y las traducciones legales
-- siguen solo en español e inglés: la app en japonés usa las inglesas, así que
-- wordle_games, typing_races y legal_translations no cambian.

alter table public.profiles drop constraint profiles_locale_check;
alter table public.profiles add constraint profiles_locale_check check (locale in ('es', 'en', 'ja'));

alter table private.visits drop constraint visits_lang_check;
alter table private.visits add constraint visits_lang_check check (lang in ('', 'es', 'en', 'ja'));

-- Al registrarse: el idioma con el que se creó la cuenta, ahora también japonés.
create or replace function private.set_user_locale()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ->> 'locale' in ('es', 'en', 'ja') then
    update public.profiles set locale = new.raw_user_meta_data ->> 'locale' where id = new.id;
  end if;
  return new;
end;
$$;

revoke execute on function private.set_user_locale() from public, anon, authenticated;
