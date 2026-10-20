# BRB (nombre provisional)

Minijuegos rápidos para procrastinar: rankings globales, amigos por código, retos y partidas 1 vs 1.

## Estructura

```
apps/web        Next.js (App Router) + PWA
apps/extension  Extensión de Chrome (WXT + React)
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

Para pasar a la nube: `supabase link --project-ref <ref>` y `supabase db push`.

## Cambiar el nombre de la app

El nombre aún no es definitivo. Para cambiarlo:

1. Edita `packages/brand/src/index.ts` (`name`, `expansion`, `tagline`, `description`).
2. Cuando haya dominio, define `NEXT_PUBLIC_SITE_URL` (ver `.env.example`).
3. Opcional: renombra este README y la carpeta del repo.

Los paquetes internos usan el scope neutro `@repo/*`, así que no hay que tocarlos.
Ningún otro fichero debe escribir el nombre a mano; si lo necesitas, importa `brand`.

## Extensión de Chrome

Popup con tus pendientes, accesos a los juegos y un 2048 que cuenta para el ranking; el icono muestra
cuántas cosas tienes pendientes (se consulta cada 3 minutos).

```sh
cp apps/extension/.env.example apps/extension/.env   # mismos valores que la web
pnpm --filter extension dev    # abre Chrome con la extensión cargada y recarga al guardar
pnpm --filter extension build  # genera apps/extension/.output/chrome-mv3
pnpm --filter extension zip    # zip listo para la Chrome Web Store
```

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

## Antes de producción

- [ ] Activar confirmación de email (`auth.email.enable_confirmations`) y captcha (Cloudflare Turnstile)
      en el registro: cada cuenta nueva tiene su propio cupo de intentos de código de amigo.
- [ ] Configurar SMTP propio (el de Supabase solo permite unos pocos emails por hora).
- [ ] Revisar los límites de Auth por IP en el dashboard.
- [ ] Claves VAPID propias (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) y
      secretos de Vault `push_webhook_url` (URL pública de `/api/push/dispatch`) y `push_webhook_secret`
      (igual que `PUSH_WEBHOOK_SECRET`).
- [ ] Tarea periódica para limpiar `private.friend_request_attempts` y partidas abandonadas antiguas.
