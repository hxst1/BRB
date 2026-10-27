// Genera las plantillas de email de Supabase (supabase/templates/*.html) con
// la estética de la app. El nombre sale de packages/brand: no se escribe a mano.
// Son plantillas de Go: `.Data.locale` elige español, inglés o japonés (español si no hay).
import { readFileSync, writeFileSync } from "node:fs";

const brandSource = readFileSync("packages/brand/src/index.ts", "utf8");
const BRAND = brandSource.match(/name: "([^"]+)"/)?.[1];
if (!BRAND) throw new Error("No se encuentra el nombre en packages/brand");

/** Colores de la app en modo oscuro (packages/ui/src/theme.css). */
const C = {
  bg: "#111318",
  surface: "#1b1e25",
  ink: "#f1f2f5",
  body: "#c3c7d1",
  muted: "#959bab",
  line: "#2a2e38",
  tiles: ["#ffd8b0", "#ffb98a", "#ff9473", "#ff6b6b", "#ffd43b", "#fab005", "#8ce99a", "#3bc9db", "#845ef7"],
};
const FONT =
  "'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', Meiryo, sans-serif";

/** Texto en cada idioma (`$locale` se define al principio de la plantilla). */
const t = (es, en, ja) => `{{ if eq $locale "en" }}${en}{{ else if eq $locale "ja" }}${ja}{{ else }}${es}{{ end }}`;

/** Franja con los colores de las fichas del 2048, como un tablero en una fila. */
function tileStrip() {
  const cells = C.tiles
    .map((color) => `<td width="11%" style="padding:0 3px"><div style="height:14px;border-radius:5px;background:${color};font-size:0;line-height:0">&nbsp;</div></td>`)
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px"><tr>${cells}</tr></table>`;
}

/**
 * Enlace a nuestra web con el token, en vez de {{ .ConfirmationURL }}: ese
 * lleva a un código que solo se puede canjear en el mismo navegador donde se
 * pidió (PKCE), y fallaba al abrir el email en otro dispositivo o en el
 * navegador de la app de correo. /auth/confirm vale en cualquiera.
 */
const link = (type, next) => `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=${type}&next=${encodeURIComponent(next)}`;

function layout({ preheader, title, intro, button, note, url }) {
  return `{{ $locale := printf "%v" .Data.locale }}<!doctype html>
<html lang="${t("es", "en", "ja")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,800&display=swap" rel="stylesheet">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg}">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="background:${C.bg}">
<tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;font-family:${FONT}">

<tr><td style="padding:0 8px 20px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px"><img src="{{ .SiteURL }}/icons/icon-192.png" width="40" height="40" alt="" style="display:block;border-radius:12px"></td>
<td style="font-size:24px;font-weight:800;letter-spacing:-0.5px;color:${C.ink}">${BRAND}</td>
</tr></table>
</td></tr>

<tr><td bgcolor="${C.surface}" style="background:${C.surface};border-radius:28px;padding:32px 28px 30px">
${tileStrip()}
<h1 style="margin:0 0 14px;font-size:34px;line-height:1.05;font-weight:800;letter-spacing:-1px;color:${C.ink}">${title}</h1>
<p style="margin:0 0 28px;font-size:16px;line-height:1.55;color:${C.body}">${intro}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="${C.ink}" style="background:${C.ink};border-radius:999px">
<a href="${url}" style="display:inline-block;padding:15px 30px;font-size:16px;font-weight:800;color:${C.bg};text-decoration:none;border-radius:999px">${button}</a>
</td></tr></table>
<p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:${C.muted}">${t("¿El botón no funciona? Copia este enlace en el navegador:", "Button not working? Copy this link into your browser:", "ボタンが動かないときは、このリンクをブラウザに貼り付けてください：")}<br>
<a href="${url}" style="color:${C.muted};word-break:break-all">${url}</a></p>
<div style="height:1px;background:${C.line};margin:24px 0 18px;font-size:0;line-height:0">&nbsp;</div>
<p style="margin:0;font-size:13px;line-height:1.5;color:${C.muted}">${note}</p>
</td></tr>

<tr><td align="center" style="padding:22px 8px 0;font-size:12px;line-height:1.5;color:${C.muted}">
${BRAND} · ${t("Minijuegos para desconectar", "Mini-games to switch off", "息抜きのミニゲーム")}
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
`;
}

const TEMPLATES = {
  confirmation: layout({
    preheader: t("Un clic y empiezas a jugar.", "One click and you're in.", "ワンクリックで遊べます。"),
    title: t("¡Ya casi estás!", "You're almost in!", "あと少しです！"),
    intro: t(
      "Hola, <strong style=\"color:#f1f2f5\">{{ .Data.username }}</strong>. Confirma tu email y tu monster te estará esperando: rankings, reto diario y partidas contra tus amigos.",
      "Hi, <strong style=\"color:#f1f2f5\">{{ .Data.username }}</strong>. Confirm your email and your monster will be waiting: rankings, the daily challenge and games against your friends.",
      "こんにちは、<strong style=\"color:#f1f2f5\">{{ .Data.username }}</strong>さん。メールアドレスを確認すると、モンスターが待っています。ランキング、デイリーチャレンジ、フレンドとの対戦も。",
    ),
    button: t("Confirmar mi email", "Confirm my email", "メールアドレスを確認"),
    url: link("email", "/"),
    note: t(
      "Si no has creado ninguna cuenta, ignora este email: no pasará nada.",
      "If you didn't create an account, ignore this email: nothing will happen.",
      "アカウントを作った覚えがなければ、このメールは無視してください。何も起きません。",
    ),
  }),
  recovery: layout({
    preheader: t("El enlace caduca en 24 horas.", "The link expires in 24 hours.", "リンクの有効期限は24時間です。"),
    title: t("Nueva contraseña", "New password", "新しいパスワード"),
    intro: t(
      "Alguien (esperamos que tú) ha pedido cambiar la contraseña de <strong style=\"color:#f1f2f5\">{{ .Email }}</strong>. Pulsa el botón para elegir una nueva. El enlace caduca en 24 horas y solo sirve una vez.",
      "Someone (hopefully you) asked to change the password for <strong style=\"color:#f1f2f5\">{{ .Email }}</strong>. Tap the button to choose a new one. The link expires in 24 hours and only works once.",
      "<strong style=\"color:#f1f2f5\">{{ .Email }}</strong> のパスワード変更のリクエストがありました（あなたからだといいのですが）。ボタンをタップして新しいパスワードを設定してください。リンクの有効期限は24時間で、使えるのは1回だけです。",
    ),
    button: t("Elegir contraseña", "Choose a password", "パスワードを設定"),
    url: link("recovery", "/entrar/nueva-contrasena"),
    note: t(
      "Si no lo has pedido tú, ignora este email: tu contraseña sigue siendo la misma.",
      "If you didn't ask for this, ignore this email: your password stays the same.",
      "心当たりがなければ、このメールは無視してください。パスワードは変わりません。",
    ),
  }),
};

for (const [name, html] of Object.entries(TEMPLATES)) writeFileSync(`supabase/templates/${name}.html`, html);
console.log(`Plantillas generadas: ${Object.keys(TEMPLATES).join(", ")}`);
