import { brand } from "@repo/brand";

/** Tema elegido en Ajustes. "system": el del sistema (lo de siempre). */
export type ThemeChoice = "system" | "light" | "dark";

export const THEME_KEY = "theme";
export const TINT_KEY = "tint";

export type TintId = "grape" | "sea" | "forest" | "sunset" | "mint" | "tangerine" | "sky";

/**
 * Tintes de la app (theme.css: data-tint). Los que llevan `achievement` se
 * consiguen con ese logro (lo comprueba achievements.test.ts); el resto son
 * para quien apoya el proyecto.
 */
export const TINTS: readonly { value: TintId; label: string; color: string; achievement?: string }[] = [
  { value: "mint", label: "Menta", color: "#20c997", achievement: "first-steps" },
  { value: "tangerine", label: "Mandarina", color: "#ff922b", achievement: "explorer" },
  { value: "sky", label: "Cielo", color: "#4c6ef5", achievement: "matches-10" },
  { value: "grape", label: "Uva", color: "#845ef7" },
  { value: "sea", label: "Mar", color: "#22b8cf" },
  { value: "forest", label: "Bosque", color: "#40c057" },
  { value: "sunset", label: "Atardecer", color: "#ff6b6b" },
];

/**
 * Fondo para enseñar un premio de color: la casilla teñida, como quedaría la app.
 * Sin color (premios de ropa), la casilla normal.
 */
export function rewardBackground(reward: { slot: string; id: string }): string {
  const color = reward.slot === "tint" ? TINTS.find((tint) => tint.value === reward.id)?.color : undefined;
  return color ? `color-mix(in oklab, var(--cell) 45%, ${color})` : "var(--cell)";
}

/** Aplica un tinte (o lo quita con null). Como applyTheme, sin dependencias: va en el script del <head>. */
export function applyTint(tint: string | null) {
  const root = document.documentElement;
  if (tint && ["grape", "sea", "forest", "sunset", "mint", "tangerine", "sky"].includes(tint)) root.dataset.tint = tint;
  else delete root.dataset.tint;
}

/**
 * Aplica un tema: atributo data-theme en <html> (theme.css) y color de la
 * barra del navegador. Se usa también, como texto, en el script del <head>,
 * así que no puede depender de nada de fuera.
 */
export function applyTheme(choice: string | null, light: string, dark: string) {
  const root = document.documentElement;
  if (choice === "light" || choice === "dark") root.dataset.theme = choice;
  else delete root.dataset.theme;
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((meta) => {
    const media = meta.dataset.media ?? meta.getAttribute("media") ?? "";
    meta.dataset.media = media;
    if (choice === "light" || choice === "dark") {
      meta.removeAttribute("media");
      meta.content = choice === "dark" ? dark : light;
    } else {
      meta.setAttribute("media", media);
      meta.content = media.includes("dark") ? dark : light;
    }
  });
}

/** Script del <head>: aplica el tema guardado antes de pintar (sin parpadeo). */
export const THEME_SCRIPT = `(function(){try{(${applyTheme.toString()})(localStorage.getItem(${JSON.stringify(THEME_KEY)}),${JSON.stringify(
  brand.themeColor,
)},${JSON.stringify(brand.themeColorDark)});(${applyTint.toString()})(localStorage.getItem(${JSON.stringify(TINT_KEY)}))}catch(e){}})()`;
