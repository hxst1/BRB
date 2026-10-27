# BRB

Quick mini-games for when you need a short break, solo or against your friends. Free, in the browser,
nothing to download.

**Play: https://afk-brb.vercel.app**

*Minijuegos rápidos para desconectar un rato, solo o contra tus amigos. Gratis y en el navegador.*

- **Solo**, with global and friends rankings: Solitaire, Sudoku, Queens, 2048, Minesweeper, Snake,
  Lights Out and a daily Wordle.
- **Against friends**: chess, Reversi, tic-tac-toe, Connect Four, dots and boxes, Battleship and
  rock-paper-scissors, turn by turn; and Pong, Tron and a typing race, live.
- **Daily challenges**: four every day (a puzzle, an arcade game, the word and a duel with friends), the
  same game for everyone and one try each.
- **Streaks** with a flame that grows as you keep playing, and streak freezes. Achievements, a monster
  you can customise, chat, notifications and a news page.
- The app is in Spanish and English, installs as an app (PWA) and has a **Chrome extension**.

## Structure

```
apps/web         Next.js (App Router) + PWA
apps/extension   Chrome extension (WXT): the website inside the toolbar popup
packages/brand   Brand name, copy and colours (single source of truth)
packages/games   Pure game logic in TS, shared by client and server
packages/db      Types generated from the Supabase schema
packages/avatars Procedural monsters (plain SVG, no React)
packages/ui      CSS theme and components shared by the web app and the extension
supabase/        Config, migrations, seed and database tests
```

## Development

```sh
pnpm install
pnpm dev         # web app at http://localhost:4321
pnpm test        # game tests
pnpm typecheck
pnpm lint
```

Monster gallery to review the generator (development only): http://localhost:4321/dev/monstruos

Node 24 (see `.node-version`, used by fnm).

## Local Supabase

Requires Docker. The CLI is a dependency of the monorepo.

```sh
pnpm db:start            # starts Postgres, Auth, Realtime, Studio…
pnpm db:status           # local URLs and keys
pnpm db:migration name   # new migration in supabase/migrations
pnpm db:reset            # recreates the database from migrations + seed
pnpm db:types            # regenerates packages/db/src/database.types.ts after a schema change
pnpm test:db             # database tests (pgTAP): permissions, RLS, friendships, games
pnpm db:stop
```

Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the keys from `pnpm db:status`.

Ports (553xx, so they don't clash with other local Supabase projects):
API `55321` · Postgres `55322` · Studio http://127.0.0.1:55323 · Mailpit (auth emails) http://127.0.0.1:55324

Auth emails (e.g. "Forgot your password?") end up in Mailpit. Locally, Supabase only sends 2 emails an
hour (`auth.rate_limit.email_sent` in `supabase/config.toml`).

Seed test users (password `password123`): `ana@test.local` (friend code `AAAAA`),
`bob@test.local` (`BBBBB`) and `carla@test.local` (`CCCCC`). Ana and Bob are friends, and Carla has sent
Ana a friend request.

### How a game is validated

1. The client calls `start_run('2048')` and gets `{ id, seed }`.
2. It plays locally with `@repo/games` using that seed.
3. It sends only the moves to `POST /api/runs/:id/finish` (session cookie or `Authorization: Bearer`).
4. The server replays the game, checks the pace of the moves and calls `finish_run`/`reject_run` with the
   secret key. The client never sends the score.

In timed games (Minesweeper, Sudoku, Solitaire and Queens) the score is the time measured by the server,
minus pauses (`pause_run`/`resume_run`).

Games against friends work the same way: the server validates every move with `@repo/games` before
saving it with `apply_match_move`.

To go to the cloud: `supabase link --project-ref <ref>` and `supabase db push`.

## Changing the app's name

The name isn't final yet. To change it:

1. Edit `packages/brand/src/index.ts` (`name`, `expansion`, `tagline`, `description`).
2. Once there's a domain, set `NEXT_PUBLIC_SITE_URL` (see `.env.example`).
3. Optional: rename this README and the repo folder.

Internal packages use the neutral `@repo/*` scope, so they don't need touching.
No other file should hard-code the name; if you need it, import `brand`.

## Chrome extension

The toolbar popup shows the whole website (in an iframe), so it always has the same games as the website
without publishing anything separately. It goes back to the last screen you were on, and right-clicking
the icon opens it in its own window or a tab. The number on the icon is your pending items
(`/api/pending`, using the website's session; checked every 3 minutes).

```sh
cp apps/extension/.env.example apps/extension/.env   # WXT_SITE_URL: the website it shows
pnpm --filter extension dev    # opens Chrome with the extension loaded and reloads on save
pnpm --filter extension build  # builds apps/extension/.output/chrome-mv3
pnpm --filter extension zip    # zip ready for the Chrome Web Store
```

For production, `apps/extension/.env.production` with `WXT_SITE_URL` set to the published website.

To load it by hand: `chrome://extensions` → developer mode → *Load unpacked* →
`apps/extension/.output/chrome-mv3`. The name comes from `@repo/brand`, as on the website.

## PWA and notifications

- `app/manifest.ts` + icons generated from the mascot (`/icons/*`, `app/icon.tsx`, `app/apple-icon.tsx`).
- `public/sw.js`: offline page (`/offline`, self-contained HTML) and push notifications.
- Notifications: database triggers (messages, games, friend requests) call
  `POST /api/push/dispatch` through `pg_net`, which decides who to notify and sends with `web-push`. The
  URL and the shared secret live in Vault (`push_webhook_url`, `push_webhook_secret`); locally the seed
  creates them and the secret matches `PUSH_WEBHOOK_SECRET` in `.env.local`.
- Each user turns notifications on in **You → The app**. On iPhone they only work with the app added to
  the home screen.

## If something looks off in development

If `pnpm dev` serves old styles or components (e.g. a change in `globals.css` that doesn't apply),
Turbopack's cache is stuck: stop the server, delete `apps/web/.next/dev` and start it again.

## Contributing

Found a bug or have an idea? Open an issue. Want to fix it yourself? Send a pull request.

If you write your **friend code** (you'll find it in the app, under Friends) in the title or description,
you earn the "Contributor" achievement and an exclusive colour for your monster when you open the issue
or when your pull request is merged.

This is handled by the `/api/webhooks/github` webhook ("Issues" and "Pull requests" events, signed with
`GITHUB_WEBHOOK_SECRET`).

Code comments and commit messages are written in Spanish.

## SEO and AI assistants

Everything comes from `apps/web/src/lib/seo.ts` (the game texts are in `lib/i18n/games-*.ts`): title,
description, "How to play" and FAQ for each game. From there we generate the visible section of each page,
the structured data (JSON-LD: `VideoGame`, `FAQPage`, `BreadcrumbList`), `sitemap.xml`, `/llms.txt` and the
share images (each game's `opengraph-image.tsx`, with `lib/og.tsx`). When you add a game, add its guide too.

- `robots.txt` lets every crawler in (including GPTBot, ClaudeBot, PerplexityBot…) except `/api/` and
  `/dev/`.
- Private pages (profile, friends, chat, sign-in, individual games) are marked `noindex` with
  `PRIVATE_PAGE`. They aren't blocked in `robots.txt`: otherwise search engines couldn't read the
  `noindex`.
- Every absolute URL comes from `NEXT_PUBLIC_SITE_URL`.

Once there's a domain:

- [ ] `NEXT_PUBLIC_SITE_URL` set to the domain on Vercel, and a 301 redirect from `*.vercel.app` to the
      domain (Vercel → Settings → Domains).
- [ ] Sign up for Google Search Console and Bing Webmaster Tools; put their codes in
      `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` and `NEXT_PUBLIC_BING_SITE_VERIFICATION`, and submit the sitemap.
- [ ] Check the structured data with Google's Rich Results Test.
- [ ] Update `site_url` and the redirect URLs in Supabase (Auth → URL).

## To do

- [ ] Ask for email confirmation again, with our own domain and an email service (#2).
- [ ] Translate the app into Japanese (#1).
- [ ] Captcha (Cloudflare Turnstile) on sign-up: every new account gets its own quota of friend-code
      attempts.
- [ ] Review the per-IP Auth limits in the dashboard.
- [ ] Support: in Ko-fi (Settings → API), a webhook to `https://<domain>/api/webhooks/kofi` and its
      verification token in `KOFI_VERIFICATION_TOKEN`. GitHub Sponsors: once GitHub approves the account,
      put its link in `SUPPORT_LINKS.githubSponsors` (`apps/web/src/lib/support.ts`).
- [ ] A periodic job to clean up `private.friend_request_attempts` and old abandoned games.
