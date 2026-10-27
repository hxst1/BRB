# Project

Mini-games app for taking a short break (web/PWA + Chrome extension). See README.md.

## Rules

- **The app's name is provisional.** Never hard-code it: import `brand` from `@repo/brand`.
  Internal packages use the neutral `@repo/*` scope.
- Always pnpm. Node 24 (`.node-version`).
- Next.js 16: read `apps/web/node_modules/next/dist/docs/` before using APIs you don't know
  (e.g. `proxy.ts` replaces `middleware.ts`).
- Web app on port 4321; local Supabase on 553xx.

## Games

- The logic lives in `packages/games`, pure and deterministic (all randomness through `rng.ts`).
  That way the server can replay and validate games. With vitest tests.
- The client never sends scores: only moves; the server recalculates them.

## Database

- Schema changes always go in a new migration (`pnpm db:migration <name>`), then
  `pnpm db:reset`, `pnpm db:types` and `pnpm test:db`.
- The client only reads (RLS). Sensitive writes go through `security definer` functions
  with `set search_path = ''` and fully qualified names.
- **Supabase grants EXECUTE to `anon`/`authenticated` on every new function in `public`.**
  In every migration: `revoke execute ... from public, anon, authenticated` and grant only what's needed.
- Internal things (not exposed through the API) go in the `private` schema. Clients have no access to it:
  any trigger or function that uses it and runs with the user's role must be `security definer`.
  Watch out: in pgTAP, cached plans can hide this error; use `discard plans` before testing it.
- Every new policy or function gets its pgTAP test in `supabase/tests/database/`.
