/**
 * Textos de los logros. Las condiciones viven en la base de datos
 * (private.achievement_progress) y la ropa que da cada uno en packages/avatars
 * (`achievement`); achievements.test.ts comprueba que los tres coinciden.
 */
import type { Locale } from "./i18n/locales";
import type { Picto } from "./pictos";

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: Picto;
  /** Ropa del monster (`palette`, `top`) o un color para toda la app (`tint`, ver lib/theme.ts). */
  reward: { slot: "palette" | "top" | "tint"; id: string; label: string };
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-run",
    name: "Primera partida",
    description: "Termina una partida en solitario.",
    icon: "gamepad",
    reward: { slot: "top", id: "cap", label: "Gorra" },
  },
  {
    id: "friends-3",
    name: "En buena compañía",
    description: "Ten 3 amigos.",
    icon: "wave",
    reward: { slot: "top", id: "headphones", label: "Cascos" },
  },
  {
    id: "streak-7",
    name: "Constante",
    description: "Juega 7 días seguidos.",
    icon: "fire",
    reward: { slot: "top", id: "flower", label: "Flor" },
  },
  {
    id: "streak-30",
    name: "Imparable",
    description: "Juega 30 días seguidos.",
    icon: "comet",
    reward: { slot: "palette", id: "ember", label: "Color brasa" },
  },
  {
    id: "tile-2048",
    name: "2048",
    description: "Consigue la ficha 2048.",
    icon: "tile-violet",
    reward: { slot: "palette", id: "ultra", label: "Color 2048" },
  },
  {
    id: "snake-30",
    name: "Serpiente larga",
    description: "Cómete 30 manzanas en una partida de Snake.",
    icon: "snake",
    reward: { slot: "palette", id: "jungle", label: "Color selva" },
  },
  {
    id: "lightsout-10",
    name: "Apagón",
    description: "Supera 10 niveles de Lights Out en una partida.",
    icon: "idea",
    reward: { slot: "top", id: "halo", label: "Aureola" },
  },
  {
    id: "minesweeper-hard",
    name: "Artificiero",
    description: "Gana un buscaminas difícil.",
    icon: "bomb",
    reward: { slot: "palette", id: "ice", label: "Color hielo" },
  },
  {
    id: "sudoku-hard",
    name: "Cerebrito",
    description: "Resuelve un sudoku difícil.",
    icon: "think",
    reward: { slot: "top", id: "wizard", label: "Sombrero de mago" },
  },
  {
    id: "wordle-3",
    name: "A la tercera",
    description: "Acierta el Wordle en 3 intentos o menos.",
    icon: "abc",
    reward: { slot: "top", id: "bow", label: "Lazo" },
  },
  {
    id: "winner-5",
    name: "Rival a batir",
    description: "Gana a 5 personas distintas en los juegos contra amigos.",
    icon: "trophy",
    reward: { slot: "top", id: "party", label: "Gorro de fiesta" },
  },
  {
    id: "contributor",
    name: "Colaborador",
    description: "Abre una issue o haz un pull request en GitHub con tu código de amigo.",
    icon: "laptop",
    reward: { slot: "palette", id: "terminal", label: "Color sintaxis" },
  },
  {
    id: "referrals-5",
    name: "Embajador",
    description: "Invita a 5 amigos con tu enlace: que se registren y jueguen al menos una partida.",
    icon: "megaphone",
    reward: { slot: "palette", id: "neon", label: "Color neón" },
  },
  {
    id: "first-steps",
    name: "Primeros pasos",
    description: "Personaliza tu monster, añade un amigo y juega el reto diario.",
    icon: "flag",
    reward: { slot: "tint", id: "mint", label: "Tema menta" },
  },
  {
    id: "explorer",
    name: "Explorador",
    description: "Juega a los 6 juegos en solitario (el Wordle cuenta al terminarlo).",
    icon: "globe",
    reward: { slot: "tint", id: "tangerine", label: "Tema mandarina" },
  },
  {
    id: "matches-10",
    name: "Pique sano",
    description: "Termina 10 partidas contra amigos (sin rendirse).",
    icon: "handshake",
    reward: { slot: "tint", id: "sky", label: "Tema cielo" },
  },
];

/** En inglés: nombre, descripción y nombre del premio de cada logro. */
const EN: Record<string, { name: string; description: string; reward: string }> = {
  "first-run": { name: "First game", description: "Finish a solo game.", reward: "Cap" },
  "friends-3": { name: "In good company", description: "Have 3 friends.", reward: "Headphones" },
  "streak-7": { name: "Steady", description: "Play 7 days in a row.", reward: "Flower" },
  "streak-30": { name: "Unstoppable", description: "Play 30 days in a row.", reward: "Ember colour" },
  "tile-2048": { name: "2048", description: "Get the 2048 tile.", reward: "2048 colour" },
  "snake-30": { name: "Long snake", description: "Eat 30 apples in one game of Snake.", reward: "Jungle colour" },
  "lightsout-10": { name: "Blackout", description: "Clear 10 levels of Lights Out in one game.", reward: "Halo" },
  "minesweeper-hard": { name: "Bomb squad", description: "Win a hard minesweeper.", reward: "Ice colour" },
  "sudoku-hard": { name: "Brainiac", description: "Solve a hard sudoku.", reward: "Wizard hat" },
  "wordle-3": { name: "Third time lucky", description: "Guess the Wordle in 3 tries or fewer.", reward: "Bow" },
  "winner-5": { name: "One to beat", description: "Beat 5 different people in games against friends.", reward: "Party hat" },
  contributor: { name: "Contributor", description: "Open an issue or make a pull request on GitHub with your friend code.", reward: "Syntax colour" },
  "referrals-5": { name: "Ambassador", description: "Invite 5 friends with your link: they have to sign up and play at least one game.", reward: "Neon colour" },
  "first-steps": { name: "First steps", description: "Customise your monster, add a friend and play the daily challenge.", reward: "Mint theme" },
  explorer: { name: "Explorer", description: "Play all 6 solo games (Wordle counts once you finish it).", reward: "Tangerine theme" },
  "matches-10": { name: "Friendly rivalry", description: "Finish 10 games against friends (without resigning).", reward: "Sky theme" },
};

/** Los logros con sus textos en un idioma. */
export function achievementsFor(locale: Locale): Achievement[] {
  if (locale === "es") return ACHIEVEMENTS;
  return ACHIEVEMENTS.map((achievement) => {
    const texts = EN[achievement.id];
    return { ...achievement, name: texts.name, description: texts.description, reward: { ...achievement.reward, label: texts.reward } };
  });
}

export function achievementById(id: string, locale: Locale = "es"): Achievement | undefined {
  return achievementsFor(locale).find((achievement) => achievement.id === id);
}

/** El monstruo con la ropa del premio puesta (si el premio es un color, tal cual). */
export function wearing<T extends object>(parts: T, reward: { slot: string; id: string }): T {
  return reward.slot === "tint" ? parts : { ...parts, [reward.slot]: reward.id };
}
