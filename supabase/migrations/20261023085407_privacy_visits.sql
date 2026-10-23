-- Política de privacidad: explica las estadísticas de visitas (private.visits).
-- Se añade tras el punto de "Actividad", así que no pisa lo editado desde el
-- panel. El español sube de versión.

update public.legal_documents
set body = replace(
      body,
      'para las rachas y para no avisarte de lo que ya estás viendo.',
      'para las rachas y para no avisarte de lo que ya estás viendo.' || E'\n' ||
      '- **Estadísticas de visitas:** qué páginas se ven, desde qué país (aproximado, según tu conexión), con qué tipo de dispositivo y durante cuánto tiempo, para saber cómo se usa la app (interés legítimo). Sin cookies y sin guardar tu IP: se usa una huella que cambia cada día, que no te identifica ni permite seguirte de un día a otro. Se borran a los 13 meses.'
    ),
    version = version + 1,
    updated_at = now()
where slug = 'privacidad'
  and body like '%para las rachas y para no avisarte de lo que ya estás viendo.%'
  and body not like '%Estadísticas de visitas%';

update public.legal_translations
set body = replace(
      body,
      'for streaks and so we don''t notify you about what you''re already looking at.',
      'for streaks and so we don''t notify you about what you''re already looking at.' || E'\n' ||
      '- **Visit statistics:** which pages are viewed, from which country (approximate, based on your connection), on what kind of device and for how long, to understand how the app is used (legitimate interest). No cookies and your IP isn''t stored: we use a fingerprint that changes every day, which doesn''t identify you or let anyone follow you from one day to the next. They''re deleted after 13 months.'
    ),
    updated_at = now()
where slug = 'privacidad' and lang = 'en'
  and body not like '%Visit statistics%';
