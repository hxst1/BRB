-- Traducciones de los textos legales (de momento, al inglés). El texto que
-- vale es el español (public.legal_documents, con su versión, que es lo que se
-- acepta al registrarse); estas son copias para entenderlo.

create table public.legal_translations (
  slug text not null references public.legal_documents (slug) on delete cascade,
  lang text not null check (lang in ('en')),
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) <= 60000),
  updated_at timestamptz not null default now(),
  primary key (slug, lang)
);

alter table public.legal_translations enable row level security;
revoke all on public.legal_translations from anon, authenticated;
grant select on public.legal_translations to anon, authenticated;

create policy "Las traducciones de los textos legales son públicas"
  on public.legal_translations for select
  to anon, authenticated
  using (true);

-- Cambia (o crea) una traducción desde el panel y lo apunta en la auditoría.
create function public.admin_update_legal_translation(admin_id uuid, slug text, lang text, title text, body text, reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.legal_translations as t (slug, lang, title, body)
  values (admin_update_legal_translation.slug, admin_update_legal_translation.lang,
          trim(admin_update_legal_translation.title), admin_update_legal_translation.body)
  on conflict on constraint legal_translations_pkey do update
  set title = excluded.title, body = excluded.body, updated_at = now();

  perform private.admin_log(admin_update_legal_translation.admin_id, 'update_legal_translation', null,
    admin_update_legal_translation.slug || ':' || admin_update_legal_translation.lang, admin_update_legal_translation.reason, '{}'::jsonb);
end;
$$;

revoke execute on function public.admin_update_legal_translation(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_update_legal_translation(uuid, text, text, text, text, text) to service_role;

insert into public.legal_translations (slug, lang, title, body) values
('terminos', 'en', 'Terms and conditions', $doc$
These terms govern the use of the mini-games app (the "app"). By creating an account you accept them. They're written to be understood: if anything isn't clear, write to us.

## Who's behind it

The app is run by **[Full name of the owner, or company name if it's a company or association]**, tax ID **[Owner's tax ID (NIF), or company tax ID (CIF)]**, with address at **[Full address: street, number, postcode, city and country]**. You can write to us at **[Contact email for users and authorities, e.g. hello@yourdomain.com]**, which is also the contact point for authorities and users.

## The app

- It's free and has no ads: solo mini-games, rankings, daily challenges, and games and chat with your friends.
- It may change, improve or stop offering games or features. We'll try to give advance notice of important changes.
- We don't guarantee it will always work without interruptions or errors, although we do our best.

## Your account

- You must be **14 or older** to create an account. If you're under 14, you can only use it with permission from your mother, father or guardian.
- You're responsible for your password and for what's done with your account.
- Other players can see your username. You can change it once every 7 days.
- You can delete your account whenever you want from Settings. All your data is deleted.

## Community rules

It's not allowed to:

- Use offensive names or messages, or ones that harass, discriminate, or have sexual or violent content.
- Cheat: modify the game, automate games or exploit bugs to climb the rankings.
- Impersonate another person or use the app to send spam or for illegal purposes.

If someone breaks these rules, we may invalidate their scores, change their name, suspend their account or delete it. If you see something that shouldn't be there, let us know from "Help us improve" in Settings or at **[Contact email for users and authorities, e.g. hello@yourdomain.com]**.

## Supporting the project

- Supporting is voluntary. It's done through external platforms (such as Ko-fi), with their own payment terms.
- In return you unlock **cosmetic-only** perks (avatar parts, app colour, badge), never advantages in games.
- The perks are activated immediately. By supporting, you agree that the digital content is delivered to you at that moment and, therefore, that you lose the right of withdrawal over it, under consumer law.
- If you have any problem with a payment, write to us and we'll sort it out.

## Intellectual property

The app's design, code, texts and characters belong to its owner. Classic games (such as sudoku or minesweeper) are in the public domain; our version of them is not.

## Liability

The app is offered as is, for entertainment. We are not liable for damages resulting from interruptions, errors or misuse of the app, except where the law prevents it.

## Changes and applicable law

If we change these terms in an important way, we'll announce it in the app. They are governed by Spanish law. If you're a consumer, you can bring a claim before the courts of your place of residence.
$doc$),
('privacidad', 'en', 'Privacy policy', $doc$
Here we explain what data of yours we use, what for, and what you can do about it. We collect the minimum needed for the app to work.

## Controller

**[Full name of the owner, or company name if it's a company or association]**, tax ID **[Owner's tax ID (NIF), or company tax ID (CIF)]**, **[Full address: street, number, postcode, city and country]**. Contact for any privacy matter: **[Contact email for users and authorities, e.g. hello@yourdomain.com]**.

## What data we use and why

- **Account:** your email and your password (encrypted) so you can sign in. Nobody else sees your email.
- **Profile:** username, your character, level, streaks and achievements. Other players see it.
- **Games and rankings:** your games, scores and challenges, to validate them and order the rankings.
- **Friends and chat:** your friends and the messages you send each other. Only the two of you see them.
- **Notifications:** if you turn them on, a subscription from your browser to send you notifications.
- **Activity:** which days you use the app and which screen you're on, for streaks and so we don't notify you about what you're already looking at.
- **Errors and messages:** if something fails, the error with the screen, browser and version; and the messages you send us from Settings.
- **Support:** if you support the project, the payment notice from the platform (amount, date and the email you used) to give you the perks.

## Legal basis

We use your data to provide the service you ask for when creating the account (performance of a contract), to keep the app safe and free of cheating (legitimate interest) and, for notifications, because you give your consent when turning them on.

## Who we share it with

We never sell your data or use it for advertising. It's only processed, on our behalf, by the providers that make the app work:

- **Supabase** (database and accounts).
- **Vercel** (website hosting).
- **Resend** (sending account emails).
- **Ko-fi** or other payment platforms, if you decide to support.

Some may process data outside the European Economic Area, always with the safeguards required by law (standard contractual clauses or the EU-US Data Privacy Framework).

## How long

For as long as you have the account. If you delete it, your data is deleted from the app immediately. Technical error logs are deleted after 30 days.

## Your rights

You can ask us to access your data, correct it, delete it, object to or restrict its use, and take it with you (portability), by writing to **[Contact email for users and authorities, e.g. hello@yourdomain.com]**. You can delete your account yourself from Settings. If you think we don't handle your data properly, you can complain to the Spanish Data Protection Agency (aepd.es).

## Minors

The app is for people aged 14 and over. If you're under 14, you need permission from your mother, father or guardian. If we learn that an account belongs to someone under 14 without that permission, we'll delete it.
$doc$),
('cookies', 'en', 'Cookie policy', $doc$
We use the minimum needed for the app to work. **We don't use advertising or tracking cookies**, so we don't ask you to accept anything.

## What we store in your browser

- **Session (technical cookies):** so you stay signed in. They're essential and are deleted when you sign out.
- **Preferences (local storage):** the light or dark theme, the app colour, whether you've already seen the install prompt and your progress in some games (such as sudoku). They stay in your browser and aren't sent to anyone.

## How to delete them

You can delete this website's cookies and data from your browser settings. If you do, you'll be signed out and lose your preferences.

## Changes

If we ever add cookies that aren't essential (for example, for statistics), we'll ask for your permission first and explain it here.
$doc$);
