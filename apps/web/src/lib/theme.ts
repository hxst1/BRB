import { brand } from "@repo/brand";

/** Tema elegido en Ajustes. "system": el del sistema (lo de siempre). */
export type ThemeChoice = "system" | "light" | "dark";

export const THEME_KEY = "theme";

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
)},${JSON.stringify(brand.themeColorDark)})}catch(e){}})()`;
