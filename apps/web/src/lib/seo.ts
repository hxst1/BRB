import type { Metadata } from "next";
import { brand, siteUrl } from "@repo/brand";
import { GAMES_EN } from "./i18n/games-en";
import { GAMES_ES, type GameTexts } from "./i18n/games-es";
import type { Locale } from "./i18n/locales";

/**
 * Textos para buscadores y asistentes (Google, Bing, ChatGPT, Perplexity…):
 * título y descripción de cada juego, cómo se juega y preguntas frecuentes.
 * Salen en la propia página (sección "Cómo se juega"), en los datos
 * estructurados (JSON-LD), en el sitemap, en /llms.txt y en las imágenes para
 * compartir. Tienen que describir el juego tal y como es.
 */

/** Lo que no se traduce de cada juego (los textos están en lib/i18n/games-*.ts). */
type GameMeta = {
  id: keyof typeof GAMES_ES;
  path: string;
  mode: "solo" | "friends";
  /** Color de la imagen al compartir (de la paleta de la app). */
  accent: string;
  /**
   * Cuándo se publicó. Al añadir un juego, pon la fecha del día: a quien ya
   * tenía cuenta le saldrá el aviso de "juego nuevo" (components/news).
   */
  addedAt: string;
};

export type GameGuide = GameMeta & GameTexts;

const GAMES: GameMeta[] = [
  { id: "2048", path: "/2048", mode: "solo", accent: "#845ef7", addedAt: "2026-10-20T11:12:40+02:00" },
  { id: "snake", path: "/snake", mode: "solo", accent: "#40c057", addedAt: "2026-10-20T14:36:02+02:00" },
  { id: "lights-out", path: "/lights-out", mode: "solo", accent: "#fab005", addedAt: "2026-10-20T17:44:48+02:00" },
  { id: "minesweeper", path: "/buscaminas", mode: "solo", accent: "#22b8cf", addedAt: "2026-10-22T08:11:02+02:00" },
  { id: "sudoku", path: "/sudoku", mode: "solo", accent: "#4c6ef5", addedAt: "2026-10-22T08:23:27+02:00" },
  { id: "wordle", path: "/wordle", mode: "solo", accent: "#40c057", addedAt: "2026-10-20T18:34:41+02:00" },
  { id: "tictactoe", path: "/3-en-raya", mode: "friends", accent: "#ff6b6b", addedAt: "2026-10-20T11:27:56+02:00" },
  { id: "connect4", path: "/4-en-raya", mode: "friends", accent: "#ff6b6b", addedAt: "2026-10-21T09:56:59+02:00" },
  { id: "battleship", path: "/hundir-la-flota", mode: "friends", accent: "#22b8cf", addedAt: "2026-10-21T10:31:14+02:00" },
  { id: "rps", path: "/piedra-papel-tijera", mode: "friends", accent: "#fab005", addedAt: "2026-10-20T12:23:36+02:00" },
  { id: "pong", path: "/pong", mode: "friends", accent: "#22b8cf", addedAt: "2026-10-20T12:58:27+02:00" },
  { id: "tron", path: "/tron", mode: "friends", accent: "#ff6b6b", addedAt: "2026-10-21T23:43:17+02:00" },
  { id: "chess", path: "/ajedrez", mode: "friends", accent: "#845ef7", addedAt: "2026-10-23T12:00:00+02:00" },
];

const TEXTS: Record<Locale, Record<GameMeta["id"], GameTexts>> = { es: GAMES_ES, en: GAMES_EN };

/** Los juegos con sus textos en un idioma. */
export function guidesFor(locale: Locale): GameGuide[] {
  return GAMES.map((game) => ({ ...game, ...TEXTS[locale][game.id] }));
}

/** En español: lo que aún no depende del idioma (metadatos, sitemap, /llms.txt, imágenes al compartir). */
export const GAME_GUIDES: GameGuide[] = guidesFor("es");


export function gameGuide(id: string, locale: Locale = "es"): GameGuide {
  const guide = guidesFor(locale).find((game) => game.id === id);
  if (!guide) throw new Error(`Juego sin guía: ${id}`);
  return guide;
}

/** Metadatos de la página de un juego: título, descripción, URL canónica y tarjetas al compartir. */
/** Dirección pública de una página en un idioma: la española sin prefijo, la inglesa con /en. */
export function localizedPath(path: string, locale: Locale): string {
  return locale === "es" ? path : `/${locale}${path === "/" ? "" : path}`;
}

/** Canónica en el idioma de la página y la misma página en el otro (hreflang). */
export function alternatesFor(path: string, locale: Locale): NonNullable<Metadata["alternates"]> {
  return {
    canonical: localizedPath(path, locale),
    languages: { es: path, en: localizedPath(path, "en"), "x-default": path },
  };
}

/** Código de idioma y región para Open Graph. */
export const OG_LOCALE: Record<Locale, string> = { es: "es_ES", en: "en_US" };

export function gameMetadata(id: string, locale: Locale = "es"): Metadata {
  const game = gameGuide(id, locale);
  const url = localizedPath(game.path, locale);
  return {
    title: game.title,
    description: game.description,
    alternates: alternatesFor(game.path, locale),
    openGraph: { title: `${game.title} · ${brand.name}`, description: game.description, url, type: "website", locale: OG_LOCALE[locale] },
  };
}

/** Para páginas que no deben salir en buscadores (perfil, chat, partidas concretas…). */
export const PRIVATE_PAGE: Metadata["robots"] = { index: false, follow: false };

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
}

/** Preguntas frecuentes de la portada (también para los datos estructurados). */
export function homeFaq(locale: Locale): { q: string; a: string }[] {
  const names = new Intl.ListFormat(locale, { type: "conjunction" }).format(guidesFor(locale).map((g) => g.name));
  if (locale === "en") {
    return [
      { q: `What is ${brand.name}?`, a: `${brand.name} is a collection of free online mini-games for your spare moments: ${names}. There are rankings, daily challenges and games against your friends.` },
      { q: "Is it free?", a: "Yes, every game is free and has no ads. Anyone who wants to can support the project and gets exclusive clothes for their avatar in return, never an advantage in games." },
      { q: "Do I need to download anything?", a: GAMES_EN.snake.faq[1].a },
      { q: "Do I need an account?", a: "You can try the solo games without an account. To save your scores, show up in the ranking and play against friends you need a free account." },
      { q: "Can I play with my friends?", a: "Yes. Add your friends with their code and challenge them to Tic-tac-toe, Connect 4, Battleship, Rock paper scissors, Pong or Tron. We let you know when it's your turn." },
    ];
  }
  return [
    { q: `¿Qué es ${brand.name}?`, a: `${brand.name} es una colección de minijuegos online gratis para jugar en ratos libres: ${names}. Hay rankings, retos diarios y partidas contra tus amigos.` },
    { q: "¿Es gratis?", a: "Sí, todos los juegos son gratis y sin anuncios. Quien quiera puede apoyar el proyecto y recibe a cambio ropa exclusiva para su avatar, nunca ventajas en las partidas." },
    { q: "¿Hay que descargar algo?", a: GAMES_ES.snake.faq[1].a },
    { q: "¿Necesito una cuenta?", a: "Los juegos en solitario se pueden probar sin cuenta. Para guardar tus puntuaciones, salir en el ranking y jugar contra amigos hace falta una cuenta gratuita." },
    { q: "¿Puedo jugar con mis amigos?", a: "Sí. Añade a tus amigos con su código y retadlos a 3 en raya, 4 en raya, Hundir la flota, Piedra, papel o tijera, Pong o Tron. Te avisamos cuando te toca." },
  ];
}

export const HOME_FAQ = homeFaq("es");
