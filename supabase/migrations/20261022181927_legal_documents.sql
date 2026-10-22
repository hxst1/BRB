-- Textos legales: términos, privacidad y cookies.
--
-- Viven en la base de datos (no en el código) para editarlos desde el panel
-- de admin y para que los datos del titular no acaben en el repositorio: se
-- crean con huecos entre corchetes ([Nombre y apellidos del titular, o razón social si es una empresa o asociación]…) que se rellenan
-- desde el panel. El cuerpo es Markdown sencillo (títulos, listas, negrita y
-- enlaces), que la web pinta con apps/web/src/lib/markdown.ts.

create table public.legal_documents (
  slug text primary key check (slug in ('terminos', 'privacidad', 'cookies')),
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) <= 60000),
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.legal_documents enable row level security;
revoke all on public.legal_documents from anon, authenticated;
grant select on public.legal_documents to anon, authenticated;

create policy "Los textos legales son públicos"
  on public.legal_documents for select
  to anon, authenticated
  using (true);

-- Cambia un texto legal desde el panel (sube la versión y queda en la auditoría).
create function public.admin_update_legal_document(admin_id uuid, slug text, title text, body text, reason text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_version integer;
begin
  update public.legal_documents d
  set title = trim(admin_update_legal_document.title),
      body = admin_update_legal_document.body,
      version = d.version + 1,
      updated_at = now()
  where d.slug = admin_update_legal_document.slug
  returning d.version into next_version;
  if not found then
    raise exception 'No existe ese texto legal' using errcode = 'P0002';
  end if;

  perform private.admin_log(admin_update_legal_document.admin_id, 'update_legal_document', null,
    admin_update_legal_document.slug, admin_update_legal_document.reason, jsonb_build_object('version', next_version));
  return next_version;
end;
$$;

revoke execute on function public.admin_update_legal_document(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_update_legal_document(uuid, text, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Textos iniciales (borrador: revisar y completar los [huecos] desde el panel)
-- ---------------------------------------------------------------------------

insert into public.legal_documents (slug, title, body) values
('terminos', 'Términos y condiciones', $doc$
Estos términos regulan el uso de la app de minijuegos (la «app»). Al crear una cuenta los aceptas. Están escritos para que se entiendan: si algo no queda claro, escríbenos.

## Quién está detrás

La app la gestiona **[Nombre y apellidos del titular, o razón social si es una empresa o asociación]**, con NIF **[NIF del titular, o CIF si es una empresa o asociación]** y domicilio en **[Domicilio completo: calle, número, código postal, ciudad y país]**. Puedes escribirnos a **[Email de contacto para usuarios y autoridades, por ejemplo hola@tudominio.com]**, que es también el punto de contacto para autoridades y usuarios.

## La app

- Es gratuita y sin anuncios: minijuegos en solitario, rankings, retos diarios y partidas y chat con tus amigos.
- Puede cambiar, mejorar o dejar de ofrecer juegos o funciones. Intentaremos avisar con antelación de los cambios importantes.
- No garantizamos que funcione siempre sin cortes ni errores, aunque hacemos lo posible.

## Tu cuenta

- Necesitas **14 años o más** para crear una cuenta. Si eres menor de 14, solo puedes usarla con el permiso de tu madre, padre o tutor.
- Eres responsable de tu contraseña y de lo que se haga con tu cuenta.
- Tu nombre de usuario lo ven otros jugadores. Puedes cambiarlo una vez cada 7 días.
- Puedes borrar tu cuenta cuando quieras desde Ajustes. Se borran todos tus datos.

## Normas de convivencia

No está permitido:

- Usar nombres o mensajes ofensivos, que acosen, discriminen o sean de contenido sexual o violento.
- Hacer trampas: modificar el juego, automatizar partidas o aprovechar fallos para subir en los rankings.
- Suplantar a otra persona o usar la app para enviar spam o fines ilegales.

Si alguien incumple estas normas, podemos invalidar sus puntuaciones, cambiar su nombre, suspender su cuenta o borrarla. Si ves algo que no debería estar, avísanos desde «Ayúdanos a mejorar» en Ajustes o en **[Email de contacto para usuarios y autoridades, por ejemplo hola@tudominio.com]**.

## Apoyar el proyecto

- Apoyar es voluntario. Se hace a través de plataformas externas (como Ko-fi), con sus propias condiciones de pago.
- A cambio desbloqueas ventajas **solo cosméticas** (partes del avatar, color de la app, insignia), nunca ventajas en las partidas.
- Las ventajas se activan al momento. Al apoyar aceptas que el contenido digital se te entregue en ese momento y, por tanto, que pierdes el derecho de desistimiento sobre él, según la ley de consumidores.
- Si tienes cualquier problema con un pago, escríbenos y lo resolvemos.

## Propiedad intelectual

El diseño, el código, los textos y los personajes de la app son de su titular. Los juegos clásicos (como el sudoku o el buscaminas) son de dominio público; nuestra versión de ellos, no.

## Responsabilidad

La app se ofrece tal cual, para entretenerse. No respondemos de daños derivados de interrupciones, errores o del mal uso de la app, salvo en los casos en que la ley lo impida.

## Cambios y ley aplicable

Si cambiamos estos términos de forma importante, lo avisaremos en la app. Se rigen por la ley española. Si eres consumidor, puedes reclamar ante los tribunales de tu domicilio.
$doc$),
('privacidad', 'Política de privacidad', $doc$
Aquí explicamos qué datos tuyos usamos, para qué y qué puedes hacer con ellos. Recogemos lo mínimo para que la app funcione.

## Responsable

**[Nombre y apellidos del titular, o razón social si es una empresa o asociación]**, NIF **[NIF del titular, o CIF si es una empresa o asociación]**, **[Domicilio completo: calle, número, código postal, ciudad y país]**. Contacto para cualquier cuestión de privacidad: **[Email de contacto para usuarios y autoridades, por ejemplo hola@tudominio.com]**.

## Qué datos usamos y para qué

- **Cuenta:** tu email y tu contraseña (cifrada) para que puedas entrar. Tu email no lo ve nadie más.
- **Perfil:** nombre de usuario, tu personaje, nivel, rachas y logros. Lo ven otros jugadores.
- **Partidas y rankings:** tus partidas, puntuaciones y retos, para validarlas y ordenar los rankings.
- **Amigos y chat:** tus amigos y los mensajes que os enviáis. Solo los veis vosotros dos.
- **Avisos:** si los activas, una suscripción de tu navegador para enviarte notificaciones.
- **Actividad:** qué días usas la app y en qué pantalla estás, para las rachas y para no avisarte de lo que ya estás viendo.
- **Errores y mensajes:** si algo falla, el error con la pantalla, el navegador y la versión; y los mensajes que nos envíes desde Ajustes.
- **Apoyos:** si apoyas el proyecto, el aviso de pago de la plataforma (importe, fecha y el email que usaste) para darte las ventajas.

## Base legal

Usamos tus datos para darte el servicio que pides al crear la cuenta (ejecución del contrato), para mantener la app segura y sin trampas (interés legítimo) y, en el caso de las notificaciones, porque das tu consentimiento al activarlas.

## Con quién los compartimos

Nunca vendemos tus datos ni los usamos para publicidad. Solo los tratan, por encargo nuestro, los proveedores que hacen funcionar la app:

- **Supabase** (base de datos y cuentas).
- **Vercel** (alojamiento de la web).
- **Resend** (envío de emails de la cuenta).
- **Ko-fi** u otras plataformas de pago, si decides apoyar.

Algunos pueden tratar datos fuera del Espacio Económico Europeo, siempre con las garantías que exige la ley (cláusulas contractuales tipo o el Marco de Privacidad de Datos UE-EE. UU.).

## Cuánto tiempo

Mientras tengas la cuenta. Si la borras, se borran tus datos de la app al momento. Los registros técnicos de errores se borran a los 30 días.

## Tus derechos

Puedes pedirnos acceder a tus datos, corregirlos, borrarlos, oponerte o limitar su uso, y llevártelos (portabilidad), escribiendo a **[Email de contacto para usuarios y autoridades, por ejemplo hola@tudominio.com]**. Puedes borrar tu cuenta tú mismo desde Ajustes. Si crees que no tratamos bien tus datos, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).

## Menores

La app es para mayores de 14 años. Si eres menor de 14, necesitas el permiso de tu madre, padre o tutor. Si sabemos que una cuenta es de un menor de 14 sin ese permiso, la borraremos.
$doc$),
('cookies', 'Política de cookies', $doc$
Usamos lo mínimo para que la app funcione. **No usamos cookies de publicidad ni de seguimiento**, así que no te pedimos aceptar nada.

## Qué guardamos en tu navegador

- **Sesión (cookies técnicas):** para que sigas con la sesión iniciada. Son imprescindibles y se borran al cerrar sesión.
- **Preferencias (almacenamiento local):** el tema claro u oscuro, el color de la app, si ya has visto el aviso de instalar la app y tu progreso en algunas partidas (como el sudoku). Se quedan en tu navegador y no se envían a nadie.

## Cómo borrarlas

Puedes borrar las cookies y los datos de esta web desde los ajustes de tu navegador. Si lo haces, se cerrará tu sesión y se perderán tus preferencias.

## Cambios

Si algún día añadimos cookies que no sean imprescindibles (por ejemplo, de estadísticas), te pediremos permiso antes y lo explicaremos aquí.
$doc$);
