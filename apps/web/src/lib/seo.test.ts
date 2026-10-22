import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GAME_GUIDES } from "./seo";

describe("catálogo de juegos", () => {
  it("los juegos que ya existían al crear las novedades se dieron por vistos", () => {
    const dir = new URL("../../../../supabase/migrations/", import.meta.url);
    const sql = readFileSync(new URL(readdirSync(dir).find((name) => name.endsWith("_announcements.sql"))!, dir), "utf8");
    const seeded = [...sql.slice(sql.indexOf("unnest(array[")).matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
    // Los publicados después de esa migración son los que se anuncian.
    const before = GAME_GUIDES.filter((game) => Date.parse(game.addedAt) < Date.parse("2026-10-22T13:00:00+02:00")).map((game) => game.id);
    expect(seeded.sort()).toEqual(before.sort());
  });

  it("cada juego tiene una fecha de alta válida", () => {
    for (const game of GAME_GUIDES) expect(Number.isNaN(Date.parse(game.addedAt))).toBe(false);
  });
});
