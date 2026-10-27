/**
 * Tramos de la racha: la llama crece y cambia con los días seguidos jugando.
 * Los nombres están en m.streak.tiers.
 */
export const STREAK_TIERS = [
  { id: "out", from: 0 },
  { id: "spark", from: 1 },
  { id: "flame", from: 10 },
  { id: "bonfire", from: 30 },
  { id: "blue", from: 100 },
  { id: "gold", from: 365 },
] as const;

export type StreakTier = (typeof STREAK_TIERS)[number]["id"];

/** El tramo de una racha y el siguiente (null en el último), con cuántos días faltan. */
export function streakTier(days: number): { tier: StreakTier; next: { tier: StreakTier; in: number } | null } {
  const index = STREAK_TIERS.findLastIndex((tier) => days >= tier.from);
  const next = STREAK_TIERS[index + 1];
  return { tier: STREAK_TIERS[index]!.id, next: next ? { tier: next.id, in: next.from - days } : null };
}

/** Un día de las dos últimas semanas: jugado, salvado por un protector, o nada. */
export type StreakDay = { day: string; kind: "played" | "frozen" | null };

export function recentDays(recent: unknown): StreakDay[] {
  if (!Array.isArray(recent)) return [];
  return recent.flatMap((item) =>
    item && typeof item === "object" && typeof (item as StreakDay).day === "string"
      ? [{ day: (item as StreakDay).day, kind: (item as StreakDay).kind === "played" || (item as StreakDay).kind === "frozen" ? (item as StreakDay).kind : null }]
      : [],
  );
}
