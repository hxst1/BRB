# BRB

Minijuegos rápidos para cuando necesitas desconectar un rato, solo o contra tus amigos. Gratis, en el
navegador y sin descargar nada.

**Juega: https://afk-brb.vercel.app**

*Quick mini-games for a short break, solo or with your friends. Free, right in your browser.*

- **En solitario**, con ranking global y de amigos: Solitario, Sudoku, Reinas, 2048, Buscaminas, Snake,
  Lights Out y un Wordle diario.
- **Contra amigos**: ajedrez, Reversi, 3 y 4 en raya, puntos y cajas, hundir la flota y piedra, papel o
  tijera por turnos, y Pong, Tron y una carrera de tecleo en directo.
- **Reto diario** (la misma partida para todos, un intento al día), logros, rachas, un monster que se
  personaliza, chat y notificaciones.
- Se instala como app (PWA) y tiene **extensión de Chrome**.

## Estructura

```
apps/web        Next.js (App Router) + PWA
apps/extension  Extensión de Chrome (WXT): la web dentro de la ventanita del icono
packages/brand  Nombre, textos y colores de la marca (única fuente de verdad)
packages/games  Lógica pura de los juegos en TS, compartida por cliente y servidor
packages/db     Tipos generados del esquema de Supabase
packages/avatars Monstruos procedurales (SVG puro, sin React)
packages/ui     Tema CSS y componentes compartidos por la web y la extensión
supabase/       Config, migraciones, seed y tests de BD
```

## Desarrollo

```sh
pnpm install
pnpm dev         # web en http://localhost:4321
pnpm test        # tests de los juegos
pnpm typecheck
pnpm lint
```

Galería de monstruos para revisar el generador (solo en desarrollo): http://localhost:4321/dev/monstruos

Node 24 (ver `.node-version`, lo usa fnm).

## Supabase en local

Requiere Docker. El CLI va como dependencia del monorepo.

```sh
pnpm db:start            # levanta Postgres, Auth, Realtime, Studio…
pnpm db:status           # URLs y claves locales
pnpm db:migration nombre # nueva migración en supabase/migrations
pnpm db:reset            # recrea la BD aplicando migraciones + seed
pnpm db:types            # regenera packages/db/src/database.types.ts tras cambiar el esquema
pnpm test:db             # tests de BD (pgTAP): permisos, RLS, amistades, partidas
pnpm db:stop
```

Copia `apps/web/.env.example` a `apps/web/.env.local` y rellena las claves de `pnpm db:status`.

Puertos (553xx para no chocar con otros proyectos Supabase locales):
API `55321` · Postgres `55322` · Studio http://127.0.0.1:55323 · Mailpit (emails de auth) http://127.0.0.1:55324

Los emails de Auth (p. ej. "¿Has olvidado tu contraseña?") llegan a Mailpit. En local Supabase solo
envía 2 emails por hora (`auth.rate_limit.email_sent` en `supabase/config.toml`).

Usuarios de prueba del seed (contraseña `password123`): `ana@test.local` (código `AAAAA`),
`bob@test.local` (`BBBBB`) y `carla@test.local` (`CCCCC`). Ana y Bob son amigos y Carla le ha
enviado una solicitud a Ana.

### Cómo se valida una partida

1. El cliente llama a `start_run('2048')` y recibe `{ id, seed }`.
2. Juega en local con `@repo/games` usando esa semilla.
3. Envía solo los movimientos a `POST /api/runs/:id/finish` (cookie de sesión o `Authorization: Bearer`).
4. El servidor repite la partida, comprueba el ritmo de movimientos y llama a `finish_run`/`reject_run`
   con la secret key. El cliente nunca envía la puntuación.

En los juegos por tiempo (buscaminas, sudoku, solitario y reinas) la puntuación es el tiempo que mide el
servidor, menos las pausas (`pause_run`/`resume_run`).

Para pasar a la nube: `supabase link --project-ref <ref>` y `supabase db push`.

## Cambiar el nombre de la app

El nombre aún no es definitivo. Para cambiarlo:

1. Edita `packages/brand/src/index.ts` (`name`, `expansion`, `tagline`, `description`).
2. Cuando haya dominio, define `NEXT_PUBLIC_SITE_URL` (ver `.env.example`).
3. Opcional: renombra este README y la carpeta del repo.

Los paquetes internos usan el scope neutro `@repo/*`, así que no hay que tocarlos.
Ningún otro fichero debe escribir el nombre a mano; si lo necesitas, importa `brand`.

## Extensión de Chrome

La ventanita del icono muestra la web entera (en un iframe), así que tiene siempre los mismos juegos que
la web sin publicar nada aparte. Vuelve a la última pantalla en la que se estuvo, y con el clic derecho
en el icono se abre en una ventana propia o en una pestaña. El número del icono son tus pendientes
(`/api/pending`, con la sesión de la web; se consulta cada 3 minutos).

```sh
cp apps/extension/.env.example apps/extension/.env   # WXT_SITE_URL: la web que muestra
pnpm --filter extension dev    # abre Chrome con la extensión cargada y recarga al guardar
pnpm --filter extension build  # genera apps/extension/.output/chrome-mv3
pnpm --filter extension zip    # zip listo para la Chrome Web Store
```

Para la de producción, `apps/extension/.env.production` con `WXT_SITE_URL` de la web publicada.

Para cargarla a mano: `chrome://extensions` → modo desarrollador → *Cargar descomprimida* →
`apps/extension/.output/chrome-mv3`. El nombre sale de `@repo/brand` como en la web.

## PWA y notificaciones

- `app/manifest.ts` + iconos generados con la mascota (`/icons/*`, `app/icon.tsx`, `app/apple-icon.tsx`).
- `public/sw.js`: página sin conexión (`/offline`, HTML autónomo) y notificaciones push.
- Notificaciones: los triggers de la BD (mensajes, partidas, solicitudes) llaman con `pg_net` a
  `POST /api/push/dispatch`, que decide a quién avisar y envía con `web-push`. La URL y el secreto
  compartido están en Vault (`push_webhook_url`, `push_webhook_secret`); en local los crea el seed y el
  secreto coincide con `PUSH_WEBHOOK_SECRET` de `.env.local`.
- Cada usuario activa las notificaciones en **Tú → La app**. En iPhone solo funcionan con la app
  añadida a la pantalla de inicio.

## Si algo no cuadra en desarrollo

Si `pnpm dev` sirve estilos o componentes viejos (p. ej. un cambio en `globals.css` que no se
aplica), la caché de Turbopack se ha quedado colgada: para el servidor, borra `apps/web/.next/dev`
y vuelve a arrancarlo.

## Colaborar

¿Has encontrado un fallo o tienes una idea? Abre una issue. ¿Quieres arreglarlo tú? Haz un pull request.

Si escribes tu **código de amigo** (lo tienes en la app, en Amigos) en el título o la descripción, al abrir
la issue o al aceptarse tu pull request ganas el logro «Colaborador» y un color exclusivo para tu monster.

Lo gestiona el webhook `/api/webhooks/github` (eventos "Issues" y "Pull requests", firmado con
`GITHUB_WEBHOOK_SECRET`).

## SEO y asistentes de IA

Todo sale de `apps/web/src/lib/seo.ts`: título, descripción, "Cómo se juega" y preguntas frecuentes
de cada juego. De ahí se generan la sección visible de cada página, los datos estructurados (JSON-LD:
`VideoGame`, `FAQPage`, `BreadcrumbList`), `sitemap.xml`, `/llms.txt` y las imágenes al compartir
(`opengraph-image.tsx` de cada juego, con `lib/og.tsx`). Al añadir un juego, añade también su guía.

- `robots.txt` deja pasar a todos (también a GPTBot, ClaudeBot, PerplexityBot…) salvo `/api/` y `/dev/`.
- Las páginas privadas (perfil, amigos, chat, entrar, partidas concretas) llevan `noindex` con
  `PRIVATE_PAGE`. No se bloquean en `robots.txt`: si no, el buscador no llegaría a leer el `noindex`.
- Todas las URL absolutas salen de `NEXT_PUBLIC_SITE_URL`.

Cuando haya dominio:

- [ ] `NEXT_PUBLIC_SITE_URL` con el dominio en Vercel, y redirección 301 de `*.vercel.app` al dominio
      (Vercel → Settings → Domains).
- [ ] Alta en Google Search Console y Bing Webmaster Tools; sus códigos en
      `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` y `NEXT_PUBLIC_BING_SITE_VERIFICATION`, y enviar el sitemap.
- [ ] Revisar los datos estructurados con la prueba de resultados enriquecidos de Google.
- [ ] Actualizar en Supabase (Auth → URL) el `site_url` y las URL de redirección.

## Pendiente

- [ ] Volver a pedir la confirmación del email, con dominio propio y un servicio de emails (#2).
- [ ] Traducir la app al japonés (#1).
- [ ] Captcha (Cloudflare Turnstile) en el registro: cada cuenta nueva tiene su propio cupo de intentos de
      código de amigo.
- [ ] Revisar los límites de Auth por IP en el dashboard.
- [ ] Apoyos: en Ko-fi (Ajustes → API), webhook a `https://<dominio>/api/webhooks/kofi` y su token de
      verificación en `KOFI_VERIFICATION_TOKEN`. GitHub Sponsors: cuando GitHub apruebe la cuenta, poner su
      enlace en `SUPPORT_LINKS.githubSponsors` (`apps/web/src/lib/support.ts`).
- [ ] Tarea periódica para limpiar `private.friend_request_attempts` y partidas abandonadas antiguas.
