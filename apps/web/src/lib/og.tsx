import { ImageResponse } from "next/og";
import { renderSVG } from "uqr";
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

/** Historia de Instagram (y de WhatsApp, etc.): 1080 × 1920. */
export const STORY_SIZE = { width: 1080, height: 1920 };

export type StoryData = {
  game: string;
  /** Dificultad o "Reto diario", debajo del nombre. */
  detail: string | null;
  score: string;
  /** "¡Mi récord!" y el puesto, si esta partida es su récord. */
  record: { label: string; rank: string | null } | null;
  username: string;
  /** SVG del monster. */
  monster: string;
  /** Icono del juego (SVG) y su color. */
  icon: string;
  accent: string;
  challenge: string;
  join: string;
  /** Enlace de invitación, entero (para el QR) y para leerlo. */
  url: string;
  urlLabel: string;
  appIcon: ArrayBuffer | null;
};

/** Texto que se lee sobre un color: oscuro sobre los claros, blanco sobre los oscuros. */
function inkOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 0.55 ? "#111318" : "#ffffff";
}

const svgData = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/**
 * Imagen para subir a una historia al terminar una partida: el juego, el
 * resultado, el monster y un QR a la invitación (Instagram no deja poner el
 * enlace desde fuera). Arriba y abajo queda margen para los controles de la
 * app que la muestre.
 */
export async function storyImage(data: StoryData) {
  const words = `${brand.name}${data.game}${data.score}${data.username}${data.challenge}${data.record?.label ?? ""}`;
  const small = `${data.detail ?? ""}${data.record?.rank ?? ""}${data.join}${data.urlLabel}`;
  const [bold, regular] = await Promise.all([loadFont(words, 800), loadFont(small, 500)]);
  const qr = renderSVG(data.url, { border: 0, whiteColor: "#ffffff", blackColor: "#111318" });
  const scoreSize = data.score.length <= 7 ? 240 : data.score.length <= 11 ? 170 : 128;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#111318",
          color: "#f1f2f5",
          padding: "200px 90px 230px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {data.appIcon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                width={92}
                height={92}
                src={`data:image/png;base64,${Buffer.from(data.appIcon).toString("base64")}`}
                style={{ borderRadius: 26 }}
              />
            )}
            <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1.5 }}>{brand.name}</div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {[...TILES, data.accent].map((color, i) => (
              <div key={i} style={{ flex: 1, height: 22, borderRadius: 8, background: color }} />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 200, height: 200, borderRadius: 52, background: "#1b1e25" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" width={150} height={150} src={svgData(data.icon)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: data.game.length > 12 ? 84 : 112, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>{data.game}</div>
              {data.detail && <div style={{ fontSize: 44, fontWeight: 500, color: "#959bab" }}>{data.detail}</div>}
            </div>
          </div>
          <div style={{ fontSize: scoreSize, fontWeight: 800, letterSpacing: -6, lineHeight: 1 }}>{data.score}</div>
          {data.record && (
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ fontSize: 46, fontWeight: 800, color: inkOn(data.accent), background: data.accent, borderRadius: 999, padding: "10px 30px" }}>
                {data.record.label}
              </div>
              {data.record.rank && <div style={{ fontSize: 46, fontWeight: 500, color: "#959bab" }}>{data.record.rank}</div>}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" width={150} height={150} src={svgData(data.monster)} />
            <div style={{ fontSize: 64, fontWeight: 800 }}>{data.username}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 48, background: "#1b1e25", borderRadius: 56, padding: 44 }}>
          <div style={{ display: "flex", background: "#ffffff", borderRadius: 28, padding: 22 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" width={236} height={236} src={svgData(qr)} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
            <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -2, lineHeight: 1, color: data.accent }}>{data.challenge}</div>
            <div style={{ fontSize: 40, fontWeight: 500, color: "#959bab" }}>{data.join}</div>
            <div style={{ fontSize: 40, fontWeight: 500 }}>{data.urlLabel}</div>
          </div>
        </div>
      </div>
    ),
    {
      ...STORY_SIZE,
      fonts: [
        ...(bold ? [{ name: "Bricolage Grotesque", data: bold, weight: 800 as const, style: "normal" as const }] : []),
        ...(regular ? [{ name: "Bricolage Grotesque", data: regular, weight: 500 as const, style: "normal" as const }] : []),
      ],
      headers: { "cache-control": "private, max-age=600" },
    },
  );
}
