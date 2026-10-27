import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DAILY_GAMES, DAILY_POOLS, dailyRotation } from "./daily";

describe("retos diarios", () => {
  const dir = new URL("../../../../supabase/migrations/", import.meta.url);
  const sql = readFileSync(new URL(readdirSync(dir).find((name) => name.endsWith("_daily_challenges_and_streaks.sql"))!, dir), "utf8");

  it("las listas son las de la base de datos, en el mismo orden", () => {
    const inDb = Object.fromEntries(
      [...sql.matchAll(/when '(puzzle|arcade|duel)' then array\[([^\]]+)\]/g)].map(([, slot, list]) => [slot, list!.match(/'([a-z0-9-]+)'/g)!.map((id) => id.slice(1, -1))]),
    );
    expect(inDb).toEqual(DAILY_POOLS);
  });

  it("la rotación empieza el mismo día que en la base de datos", () => {
    expect(sql).toContain("date '2026-01-05'");
    expect(dailyRotation(DAILY_POOLS.arcade, "2026-01-05")).toBe("2048");
    expect(dailyRotation(DAILY_POOLS.arcade, "2026-01-06")).toBe("snake");
    expect(dailyRotation(DAILY_POOLS.arcade, "2026-01-04")).toBe("lightsout");
    // 27 de octubre: 295 días después.
    expect(dailyRotation(DAILY_POOLS.duel, "2026-10-27")).toBe("pong");
  });

  it("todos los juegos en solitario que pueden tocar tienen su ficha", () => {
    expect(Object.keys(DAILY_GAMES).sort()).toEqual([...DAILY_POOLS.puzzle, ...DAILY_POOLS.arcade].sort());
  });
});
