import { renderMonsterSvg, resolveMonster } from "@repo/avatars";
import { brand } from "@repo/brand";

/**
 * Página "sin conexión" que el service worker guarda al instalarse. Es HTML
 * autónomo (estilos y monstruo incrustados): sin red no se puede cargar nada
 * más, así que no puede depender del CSS ni del JS de la app.
 */
export function GET() {
  const monster = renderMonsterSvg(resolveMonster(7, { body: "ghost", palette: "sky", eyes: "two", top: "antenna" }), "sad");

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="${brand.themeColor}" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="${brand.themeColorDark}" media="(prefers-color-scheme: dark)">
<title>Sin conexión · ${brand.name}</title>
<style>
  :root { --bg: #f3f4f7; --ink: #15171c; --muted: #6a7080; color-scheme: light dark; }
  @media (prefers-color-scheme: dark) { :root { --bg: #111318; --ink: #f1f2f5; --muted: #959bab; } }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 24px;
    background: var(--bg); color: var(--ink); font-family: system-ui, -apple-system, "Segoe UI", sans-serif; text-align: center; }
  main { max-width: 22rem; display: flex; flex-direction: column; align-items: center; gap: 16px; }
  .monster { width: 120px; height: 120px; }
  h1 { margin: 0; font-size: 2.25rem; letter-spacing: -0.03em; }
  p { margin: 0; color: var(--muted); line-height: 1.5; }
  button { border: 0; border-radius: 999px; padding: 12px 22px; font: inherit; font-weight: 600;
    background: var(--ink); color: var(--bg); cursor: pointer; }
</style>
</head>
<body>
<main>
  <div class="monster" aria-hidden="true">${monster}</div>
  <h1>Sin conexión</h1>
  <p>No llegamos al servidor. Cuando vuelva la red, reintenta y seguimos donde lo dejaste.</p>
  <button type="button" onclick="location.reload()">Reintentar</button>
</main>
</body>
</html>`;

  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
