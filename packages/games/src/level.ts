/**
 * Niveles: el nivel n empieza en 10·(n−1)² XP, así que cada nivel cuesta un
 * poco más que el anterior (10, 30, 50, 70… XP).
 */
export function levelStart(level: number): number {
  return 10 * (level - 1) ** 2;
}

export function levelFromXp(xp: number) {
  const level = 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 10));
  const start = levelStart(level);
  const next = levelStart(level + 1);
  return { level, xpIntoLevel: xp - start, xpForNext: next - start, progress: (xp - start) / (next - start) };
}
