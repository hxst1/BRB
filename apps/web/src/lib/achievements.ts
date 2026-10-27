/**
 * Textos de los logros. Las condiciones viven en la base de datos
 * (private.achievement_progress) y la ropa que da cada uno en packages/avatars
 * (`achievement`); achievements.test.ts comprueba que los tres coinciden.
 */
import type { Locale } from "./i18n/locales";
import type { Picto } from "./pictos";

type Reward = { slot: "palette" | "top" | "tint"; id: string; label: string };

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: Picto;
  /** Ropa del monster (`palette`, `top`) o un color para toda la app (`tint`, ver lib/theme.ts). */
  reward: Reward;
  /** Más premios del mismo logro (los enseña la lista de logros; "Estrenar" pone solo `reward`). */
  extras?: Reward[];
  /**
   * Los de tiempo limitado: hasta cuándo se pueden conseguir (lo mismo que dice
   * la base de datos). Pasada la fecha, solo los ve quien los tiene.
   */
  until?: string;
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
    description: "Juega a 6 juegos distintos en solitario (el Wordle cuenta al terminarlo).",
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
  {
    id: "product-hunt",
    name: "Desde Product Hunt",
    description: "Llega desde Product Hunt durante su lanzamiento, con tu cuenta (solo hasta el 4 de noviembre).",
    icon: "rocket",
    reward: { slot: "top", id: "launch", label: "Gorro de Product Hunt" },
    extras: [
      { slot: "palette", id: "launch", label: "color lanzamiento" },
      { slot: "tint", id: "launch", label: "tema lanzamiento" },
    ],
    // Igual que private.launch_reward_open.
    until: "2026-11-05T00:00:00+01:00",
  },
];

/** Todo lo que da un logro, en una frase: "Gorro de Product Hunt, color lanzamiento y tema lanzamiento". */
export function rewardSummary(achievement: Pick<Achievement, "reward" | "extras">, locale: Locale): string {
  const labels = [achievement.reward, ...(achievement.extras ?? [])].map((reward) => reward.label);
  return new Intl.ListFormat(locale, { type: "conjunction" }).format(labels);
}

/** ¿Se puede ver este logro? Los de tiempo limitado, pasada su fecha, solo si ya lo tienes. */
export function achievementVisible(achievement: Pick<Achievement, "until">, unlocked: boolean, now = Date.now()): boolean {
  return unlocked || !achievement.until || now < new Date(achievement.until).getTime();
}

/** Nombre, descripción y nombre del premio de un logro (y de los de más, en orden) en otro idioma. */
type AchievementTexts = { name: string; description: string; reward: string; extras?: string[] };

/** En inglés. */
const EN: Record<string, AchievementTexts> = {
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
  explorer: { name: "Explorer", description: "Play 6 different solo games (Wordle counts once you finish it).", reward: "Tangerine theme" },
  "matches-10": { name: "Friendly rivalry", description: "Finish 10 games against friends (without resigning).", reward: "Sky theme" },
  "product-hunt": {
    name: "From Product Hunt",
    description: "Come over from Product Hunt during its launch, signed in (only until 4 November).",
    reward: "Product Hunt beanie",
    extras: ["launch colour", "launch theme"],
  },
};

/** En japonés, igual que en inglés. */
const JA: Record<string, AchievementTexts> = {
  "first-run": { name: "初プレイ", description: "ひとりで遊ぶゲームを1回最後まで遊ぶ。", reward: "キャップ" },
  "friends-3": { name: "にぎやかな仲間", description: "フレンドを3人つくる。", reward: "ヘッドホン" },
  "streak-7": { name: "コツコツ派", description: "7日連続で遊ぶ。", reward: "お花" },
  "streak-30": { name: "止まらない", description: "30日連続で遊ぶ。", reward: "おき火カラー" },
  "tile-2048": { name: "2048", description: "2048のタイルを作る。", reward: "2048カラー" },
  "snake-30": { name: "ロングスネーク", description: "スネークの1ゲームでリンゴを30個食べる。", reward: "ジャングルカラー" },
  "lightsout-10": { name: "大停電", description: "ライツアウトの1ゲームで10レベルクリアする。", reward: "天使の輪" },
  "minesweeper-hard": { name: "爆弾処理班", description: "上級のマインスイーパーをクリアする。", reward: "アイスカラー" },
  "sudoku-hard": { name: "天才肌", description: "上級の数独を解く。", reward: "魔法使いの帽子" },
  "wordle-3": { name: "三度目の正直", description: "Wordleを3回以内で当てる。", reward: "リボン" },
  "winner-5": { name: "倒すべき相手", description: "フレンドとの対戦で、ちがう5人に勝つ。", reward: "パーティー帽" },
  contributor: { name: "コントリビューター", description: "フレンドコードを書いて、GitHubでissueを作るかプルリクエストを送る。", reward: "シンタックスカラー" },
  "referrals-5": { name: "アンバサダー", description: "自分のリンクでフレンドを5人招待する。登録して、1回以上遊んでもらう必要があります。", reward: "ネオンカラー" },
  "first-steps": { name: "はじめの一歩", description: "モンスターをカスタマイズして、フレンドを追加して、デイリーチャレンジを遊ぶ。", reward: "ミントのテーマ" },
  explorer: { name: "探検家", description: "ひとりで遊ぶゲームを6種類遊ぶ（Wordleはクリアしたら1つに数えます）。", reward: "タンジェリンのテーマ" },
  "matches-10": { name: "いいライバル", description: "フレンドとの対戦を10回最後まで遊ぶ（投了はなし）。", reward: "スカイのテーマ" },
  "product-hunt": {
    name: "Product Huntから来た",
    description: "Product Huntのローンチ期間中に、ログインした状態でProduct Huntから来る（11月4日まで）。",
    reward: "Product Huntのニット帽",
    extras: ["ローンチカラー", "ローンチのテーマ"],
  },
};

/** Textos de los logros en cada idioma que no es el español (el original). */
const TRANSLATIONS: Record<Exclude<Locale, "es">, Record<string, AchievementTexts>> = { en: EN, ja: JA };

/** Los logros con sus textos en un idioma. */
export function achievementsFor(locale: Locale): Achievement[] {
  if (locale === "es") return ACHIEVEMENTS;
  return ACHIEVEMENTS.map((achievement) => {
    const texts = TRANSLATIONS[locale][achievement.id];
    return {
      ...achievement,
      name: texts.name,
      description: texts.description,
      reward: { ...achievement.reward, label: texts.reward },
      extras: achievement.extras?.map((extra, i) => ({ ...extra, label: texts.extras?.[i] ?? extra.label })),
    };
  });
}

export function achievementById(id: string, locale: Locale = "es"): Achievement | undefined {
  return achievementsFor(locale).find((achievement) => achievement.id === id);
}

/** El monstruo con la ropa del premio puesta (si el premio es un color, tal cual). */
export function wearing<T extends object>(parts: T, reward: { slot: string; id: string }): T {
  return reward.slot === "tint" ? parts : { ...parts, [reward.slot]: reward.id };
}
