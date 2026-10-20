# BRB (nombre provisional)

Minijuegos rápidos para procrastinar: rankings globales, amigos por código, retos y partidas 1 vs 1.

## Estructura

```
apps/web        Next.js (App Router) + PWA
packages/brand  Nombre, textos y colores de la marca (única fuente de verdad)
packages/games  Lógica pura de los juegos en TS, compartida por cliente y servidor
packages/db     Tipos generados del esquema de Supabase
packages/avatars Monstruos procedurales (SVG puro, sin React)
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

## Si algo no cuadra en desarrollo

Si `pnpm dev` sirve estilos o componentes viejos (p. ej. un cambio en `globals.css` que no se
aplica), la caché de Turbopack se ha quedado colgada: para el servidor, borra `apps/web/.next/dev`
y vuelve a arrancarlo.

## Antes de producción

- [ ] Activar confirmación de email (`auth.email.enable_confirmations`) y captcha (Cloudflare Turnstile)
      en el registro: cada cuenta nueva tiene su propio cupo de intentos de código de amigo.
- [ ] Configurar SMTP propio (el de Supabase solo permite unos pocos emails por hora).
- [ ] Revisar los límites de Auth por IP en el dashboard.
- [ ] Tarea periódica para limpiar `private.friend_request_attempts` y partidas abandonadas antiguas.
