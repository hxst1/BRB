/**
 * Textos de los logros. Las condiciones viven en la base de datos
 * (private.achievement_progress) y la ropa que da cada uno en packages/avatars
 * (`achievement`); achievements.test.ts comprueba que los tres coinciden.
 */
import type { Locale } from "@/lib/i18n/locales";

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  reward: { slot: "palette" | "top"; id: string; label: string };
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-run",
    name: "Primera partida",
    description: "Termina una partida en solitario.",
    icon: "🎮",
    reward: { slot: "top", id: "cap", label: "Gorra" },
  },
  {
    id: "friends-3",
    name: "En buena compañía",
    description: "Ten 3 amigos.",
    icon: "👋",
    reward: { slot: "top", id: "headphones", label: "Cascos" },
  },
  {
    id: "streak-7",
    name: "Constante",
    description: "Juega 7 días seguidos.",
    icon: "🔥",
    reward: { slot: "top", id: "flower", label: "Flor" },
  },
  {
    id: "streak-30",
    name: "Imparable",
    description: "Juega 30 días seguidos.",
    icon: "☄️",
    reward: { slot: "palette", id: "ember", label: "Color brasa" },
  },
  {
    id: "tile-2048",
    name: "2048",
    description: "Consigue la ficha 2048.",
    icon: "🟪",
    reward: { slot: "palette", id: "ultra", label: "Color 2048" },
  },
  {
    id: "snake-30",
    name: "Serpiente larga",
    description: "Cómete 30 manzanas en una partida de Snake.",
    icon: "🐍",
    reward: { slot: "palette", id: "jungle", label: "Color selva" },
  },
  {
    id: "lightsout-10",
    name: "Apagón",
    description: "Supera 10 niveles de Lights Out en una partida.",
    icon: "💡",
    reward: { slot: "top", id: "halo", label: "Aureola" },
  },
  {
    id: "minesweeper-hard",
    name: "Artificiero",
    description: "Gana un buscaminas difícil.",
    icon: "💣",
    reward: { slot: "palette", id: "ice", label: "Color hielo" },
  },
  {
    id: "sudoku-hard",
    name: "Cerebrito",
    description: "Resuelve un sudoku difícil.",
    icon: "🧠",
    reward: { slot: "top", id: "wizard", label: "Sombrero de mago" },
  },
  {
    id: "wordle-3",
    name: "A la tercera",
    description: "Acierta el Wordle en 3 intentos o menos.",
    icon: "🔤",
    reward: { slot: "top", id: "bow", label: "Lazo" },
  },
  {
    id: "winner-5",
    name: "Rival a batir",
    description: "Gana a 5 personas distintas en los juegos contra amigos.",
    icon: "🏆",
    reward: { slot: "top", id: "party", label: "Gorro de fiesta" },
  },
  {
    id: "contributor",
    name: "Colaborador",
    description: "Abre una issue o haz un pull request en GitHub con tu código de amigo.",
    icon: "💻",
    reward: { slot: "palette", id: "terminal", label: "Color terminal" },
  },
  {
    id: "referrals-5",
    name: "Embajador",
    description: "Invita a 5 amigos con tu enlace: que se registren y jueguen al menos una partida.",
    icon: "📣",
    reward: { slot: "palette", id: "neon", label: "Color neón" },
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
  contributor: { name: "Contributor", description: "Open an issue or make a pull request on GitHub with your friend code.", reward: "Terminal colour" },
  "referrals-5": { name: "Ambassador", description: "Invite 5 friends with your link: they have to sign up and play at least one game.", reward: "Neon colour" },
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
