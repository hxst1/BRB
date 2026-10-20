# Proyecto

App de minijuegos para procrastinar (web/PWA + extensión de Chrome más adelante). Ver README.md.

## Reglas

- **El nombre de la app es provisional.** Nunca lo escribas a mano: importa `brand` de `@repo/brand`.
  Los paquetes internos usan el scope neutro `@repo/*`.
- pnpm siempre. Node 24 (`.node-version`).
- Next.js 16: lee `apps/web/node_modules/next/dist/docs/` antes de usar APIs que no conozcas
  (p. ej. `proxy.ts` sustituye a `middleware.ts`).
- Web en el puerto 4321; Supabase local en 553xx.

## Juegos

- La lógica va en `packages/games`, pura y determinista (toda la aleatoriedad por `rng.ts`).
  Así el servidor puede repetir y validar partidas. Con tests en vitest.
- El cliente nunca envía puntuaciones: solo movimientos; el servidor las recalcula.

## Base de datos

- Cambios de esquema siempre con migración nueva (`pnpm db:migration <nombre>`), luego
  `pnpm db:reset`, `pnpm db:types` y `pnpm test:db`.
- El cliente solo lee (RLS). Las escrituras sensibles van por funciones `security definer`
  con `set search_path = ''` y nombres totalmente cualificados.
- **Supabase concede EXECUTE a `anon`/`authenticated` en cada función nueva de `public`.**
  En cada migración: `revoke execute ... from public, anon, authenticated` y conceder solo lo necesario.
- Lo interno (no expuesto por la API) va en el esquema `private`. Los clientes no tienen acceso a él:
  cualquier trigger o función que lo use y se ejecute con el rol del usuario debe ser `security definer`.
  Ojo: en pgTAP los planes en caché pueden ocultar este error; usa `discard plans` antes de probarlo.
- Toda política o función nueva lleva su test pgTAP en `supabase/tests/database/`.
