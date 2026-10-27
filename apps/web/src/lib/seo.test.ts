import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LOCALES } from "./i18n/locales";
import { alternatesFor, GAME_GUIDES, guidesFor, homeFaq, localizedPath, OG_LOCALE } from "./seo";

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

  it("cada juego tiene todos sus textos en cada idioma", () => {
    for (const locale of LOCALES) {
      for (const game of guidesFor(locale)) {
        expect([game.name, game.title, game.description, game.tagline, game.genre].every(Boolean), `${locale} ${game.id}`).toBe(true);
        expect(game.howTo.length, `${locale} ${game.id}`).toBeGreaterThan(0);
        expect(game.faq.length, `${locale} ${game.id}`).toBeGreaterThan(0);
      }
      expect(homeFaq(locale).length).toBeGreaterThan(0);
    }
  });
});

describe("idiomas en las direcciones", () => {
  it("el español va sin prefijo y los demás con el suyo", () => {
    expect(localizedPath("/sudoku", "es")).toBe("/sudoku");
    expect(localizedPath("/sudoku", "en")).toBe("/en/sudoku");
    expect(localizedPath("/", "ja")).toBe("/ja");
  });

  it("cada página enlaza a sus versiones en todos los idiomas", () => {
    const alternates = alternatesFor("/sudoku", "ja");
    expect(alternates.canonical).toBe("/ja/sudoku");
    expect(alternates.languages).toEqual({ es: "/sudoku", en: "/en/sudoku", ja: "/ja/sudoku", "x-default": "/sudoku" });
    for (const locale of LOCALES) expect(OG_LOCALE[locale]).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
  });
});
