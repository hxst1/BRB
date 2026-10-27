import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { partAchievement, PART_OPTIONS } from "@repo/avatars";
import { ACHIEVEMENTS, achievementsFor } from "./achievements";
import { TINTS } from "./theme";

const dir = new URL("../../../../supabase/migrations/", import.meta.url);
/** Texto de la última migración que define esa función (las posteriores la reemplazan). */
function latest(fn: string): string {
  const files = readdirSync(dir).sort().map((name) => readFileSync(new URL(name, dir), "utf8"));
  const sql = files.filter((text) => text.includes(`function ${fn}(`)).at(-1)!;
  const start = sql.indexOf(`function ${fn}(`);
  return sql.slice(start, sql.indexOf("$$;", start));
}

describe("logros", () => {
  it("todos tienen sus textos en inglés", () => {
    for (const achievement of achievementsFor("en")) expect(achievement.name && achievement.description && achievement.reward.label).toBeTruthy();
  });

  it("son los mismos que comprueba la base de datos", () => {
    const body = latest("private.achievement_progress");
    const inDb = [...body.matchAll(/select '([a-z0-9-]+)',/g)].map((m) => m[1]);
    expect(inDb.sort()).toEqual(ACHIEVEMENTS.map((a) => a.id).sort());
  });

  it("cada uno da la parte del avatar que lo pide, igual que en la base de datos", () => {
    const inDb = [...latest("private.part_achievement").matchAll(/when slot = '(\w+)' and id = '(\w+)' then '([a-z0-9-]+)'/g)].map(([, slot, id, achievement]) => ({
      slot,
      id,
      achievement,
    }));
    const inAvatars = (["palette", "top"] as const).flatMap((slot) =>
      PART_OPTIONS[slot].flatMap((id) => {
        const achievement = partAchievement(slot, id);
        return achievement ? [{ slot, id, achievement }] : [];
      }),
    );
    const inCatalog = ACHIEVEMENTS.flatMap((a) => [a.reward, ...(a.extras ?? [])].filter((r) => r.slot !== "tint").map((r) => ({ slot: r.slot, id: r.id, achievement: a.id })));
    const sort = (list: { slot: string; id: string }[]) => [...list].sort((a, b) => `${a.slot}${a.id}`.localeCompare(`${b.slot}${b.id}`));
    expect(sort(inAvatars)).toEqual(sort(inDb));
    expect(sort(inCatalog)).toEqual(sort(inDb));
  });

  it("los que dan un color de la app son los mismos que dice el catálogo de tintes", () => {
    const fromAchievements = ACHIEVEMENTS.flatMap((a) => [a.reward, ...(a.extras ?? [])].filter((r) => r.slot === "tint").map((r) => `${r.id}:${a.id}`));
    const fromTints = TINTS.filter((tint) => tint.achievement).map((tint) => `${tint.value}:${tint.achievement}`);
    expect(fromAchievements.sort()).toEqual(fromTints.sort());
  });
});
