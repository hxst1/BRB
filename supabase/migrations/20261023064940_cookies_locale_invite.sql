-- Política de cookies: añade las dos cookies técnicas nuevas (el idioma
-- elegido y el enlace de invitación). Se añaden tras la de sesión, así que no
-- pisan lo que se haya editado desde el panel. El español sube de versión.

update public.legal_documents
set body = replace(
      body,
      'Son imprescindibles y se borran al cerrar sesión.',
      'Son imprescindibles y se borran al cerrar sesión.' || E'\n' ||
      '- **Idioma (cookie técnica):** recuerda si usas la app en español o en inglés. Dura un año.' || E'\n' ||
      '- **Invitación (cookie técnica):** si llegas por el enlace de invitación de un amigo, recuerda quién te invitó para que, al crear tu cuenta, seáis amigos. Dura 30 días y se borra al registrarte.'
    ),
    version = version + 1,
    updated_at = now()
where slug = 'cookies'
  and body like '%Son imprescindibles y se borran al cerrar sesión.%'
  and body not like '%Idioma (cookie técnica)%';

update public.legal_translations
set body = replace(
      body,
      'They''re essential and are deleted when you sign out.',
      'They''re essential and are deleted when you sign out.' || E'\n' ||
      '- **Language (technical cookie):** remembers whether you use the app in Spanish or English. It lasts a year.' || E'\n' ||
      '- **Invitation (technical cookie):** if you arrive through a friend''s invite link, it remembers who invited you so that you become friends when you create your account. It lasts 30 days and is deleted when you sign up.'
    ),
    updated_at = now()
where slug = 'cookies' and lang = 'en'
  and body not like '%Language (technical cookie)%';
