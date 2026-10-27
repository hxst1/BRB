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
 * Una fuente de Google Fonts, solo con las letras necesarias. Sin User-Agent,
 * Google la sirve en TTF, que es lo que entiende ImageResponse. Si falla, se
 * usa la letra por defecto.
 */
async function loadFont(family: string, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Letras japonesas (kana, kanji y signos de ancho completo), que Bricolage no tiene. */
const JAPANESE = /[\u3000-\u30ff\u3400-\u9fff\uff00-\uffef]/;

/**
 * Bricolage Grotesque para los titulares (`bold`) y el resto (`regular`). Si
 * hay japonés, también Noto Sans JP: ImageResponse busca en ella las letras
 * que no tiene Bricolage.
 */
async function loadFonts(bold: string, regular: string) {
  const japanese = JAPANESE.test(bold + regular);
  const fonts = await Promise.all([
    loadFont("Bricolage+Grotesque:opsz,wght@96,800", bold),
    loadFont("Bricolage+Grotesque:opsz,wght@14,500", regular),
    japanese ? loadFont("Noto+Sans+JP:wght@800", bold) : null,
    japanese ? loadFont("Noto+Sans+JP:wght@500", regular) : null,
  ]);
  return (["Bricolage Grotesque", "Bricolage Grotesque", "Noto Sans JP", "Noto Sans JP"] as const).flatMap((name, i) => {
    const data = fonts[i];
    return data ? [{ name, data, weight: i % 2 === 0 ? (800 as const) : (500 as const), style: "normal" as const }] : [];
  });
}

/**
 * Tamaño de un titular que tiene que caber en `width` px. En japonés no se
 * parte por espacios: se encoge para que quepa en una línea (hasta `min`). En
 * letras latinas, el tamaño grande y, si es largo, el pequeño.
 */
function headlineSize(text: string, { big, small, longer, width, min }: { big: number; small: number; longer: number; width: number; min: number }) {
  if (!JAPANESE.test(text)) return text.length > longer ? small : big;
  const ems = [...text].reduce((total, char) => total + (JAPANESE.test(char) ? 1 : 0.6), 0);
  return Math.max(min, Math.min(big, Math.floor(width / ems)));
}

/** El japonés con las letras apretadas se pisa: sin espacio negativo entre letras. */
const tracking = (text: string, value: number) => (JAPANESE.test(text) ? 0 : value);

export async function ogImage({ title, subtitle, accent = "#845ef7" }: { title: string; subtitle: string; accent?: string }) {
  const fonts = await loadFonts(`${brand.name}${title}`, subtitle);
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
            <div
              style={{
                fontSize: headlineSize(title, { big: 104, small: 76, longer: 18, width: 640, min: 64 }),
                fontWeight: 800,
                lineHeight: JAPANESE.test(title) ? 1.15 : 0.95,
                letterSpacing: tracking(title, -3),
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: 36, fontWeight: 500, color: "#959bab", lineHeight: 1.2 }}>{subtitle}</div>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts,
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
  const fonts = await loadFonts(words, small);
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
              <div
                style={{
                  fontSize: headlineSize(data.game, { big: 112, small: 84, longer: 12, width: 640, min: 64 }),
                  fontWeight: 800,
                  letterSpacing: tracking(data.game, -3),
                  lineHeight: JAPANESE.test(data.game) ? 1.15 : 1,
                }}
              >
                {data.game}
              </div>
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
            <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: tracking(data.challenge, -2), lineHeight: JAPANESE.test(data.challenge) ? 1.15 : 1, color: data.accent }}>{data.challenge}</div>
            <div style={{ fontSize: 40, fontWeight: 500, color: "#959bab" }}>{data.join}</div>
            <div style={{ fontSize: 40, fontWeight: 500 }}>{data.urlLabel}</div>
          </div>
        </div>
      </div>
    ),
    {
      ...STORY_SIZE,
      fonts,
      headers: { "cache-control": "private, max-age=600" },
    },
  );
}
