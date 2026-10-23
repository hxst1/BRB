import { ImageResponse } from "next/og";
import { brand } from "@repo/brand";
import { messagesFor } from "./i18n";
import { isLocale, type Locale } from "./i18n/locales";
import { gameGuide } from "./seo";

/** Imágenes al compartir un enlace (WhatsApp, X, Discord…): 1200 × 630. */
export const OG_SIZE = { width: 1200, height: 630 };

/** Fichas del 2048 de fondo, con los colores de la app. */
const TILES = ["#ffd8b0", "#ffb98a", "#ff9473", "#ff6b6b", "#ffd43b", "#fab005", "#8ce99a", "#3bc9db"];

/**
 * Bricolage Grotesque desde Google Fonts, solo con las letras necesarias. Sin
 * User-Agent, Google la sirve en TTF, que es lo que entiende ImageResponse. Si
 * falla, se usa la letra por defecto.
 */
async function loadFont(text: string, weight: 500 | 800): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@${weight === 800 ? 96 : 14},${weight}&text=${encodeURIComponent(text)}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function ogImage({ title, subtitle, accent = "#845ef7" }: { title: string; subtitle: string; accent?: string }) {
  const [bold, regular] = await Promise.all([loadFont(`${brand.name}${title}`, 800), loadFont(subtitle, 500)]);
  const tiles = [TILES[1], null, TILES[6], null, accent, null, TILES[4], null, TILES[0]];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#111318", color: "#f1f2f5", padding: 72, position: "relative" }}>
        <div style={{ position: "absolute", right: 64, top: 96, display: "flex", flexWrap: "wrap", width: 372, gap: 14 }}>
          {Array.from({ length: 9 }, (_, i) => (
            <div
              key={i}
              style={{ width: 112, height: 112, borderRadius: 26, background: tiles[i] ?? "#23262e" }}
            />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>{brand.name}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: title.length > 18 ? 76 : 104, fontWeight: 800, lineHeight: 0.95, letterSpacing: -3 }}>{title}</div>
            <div style={{ fontSize: 36, fontWeight: 500, color: "#959bab", lineHeight: 1.2 }}>{subtitle}</div>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        ...(bold ? [{ name: "Bricolage Grotesque", data: bold, weight: 800 as const, style: "normal" as const }] : []),
        ...(regular ? [{ name: "Bricolage Grotesque", data: regular, weight: 500 as const, style: "normal" as const }] : []),
      ],
    },
  );
}

/** Idioma de una imagen a partir de los parámetros de su ruta (app/[lang]/…/opengraph-image). */
export async function ogLocale(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params;
  return isLocale(lang) ? lang : "es";
}

export function gameOgImage(id: string, locale: Locale = "es") {
  const game = gameGuide(id, locale);
  return ogImage({ title: game.name, subtitle: messagesFor(locale).meta.ogGame(game.tagline), accent: game.accent });
}
