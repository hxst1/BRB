import { describe, expect, it } from "vitest";
import {
  isSupporterPart,
  monsterFromSeed,
  partAchievement,
  PART_OPTIONS,
  renderMonsterSvg,
  renderStickerSvg,
  resolveMonster,
  STICKERS,
  sanitizeParts,
  type MonsterParts,
} from ".";

describe("monsterFromSeed", () => {
  it("es determinista", () => {
    expect(monsterFromSeed(123456)).toEqual(monsterFromSeed(123456));
  });

  it("varía con la semilla y usa todo el catálogo gratuito", () => {
    const bodies = new Set<string>();
    const eyes = new Set<string>();
    for (let seed = 0; seed < 500; seed++) {
      const monster = monsterFromSeed(seed * 2654435761);
      bodies.add(monster.body);
      eyes.add(monster.eyes);
    }
    expect(bodies.size).toBe(PART_OPTIONS.body.length);
    expect(eyes.size).toBe(PART_OPTIONS.eyes.length);
  });

  it("nunca regala partes de supporter ni de logro", () => {
    for (let seed = 0; seed < 2000; seed++) {
      const monster = monsterFromSeed(seed * 2654435761);
      expect(isSupporterPart("palette", monster.palette)).toBe(false);
      expect(isSupporterPart("top", monster.top)).toBe(false);
      expect(partAchievement("palette", monster.palette)).toBeNull();
      expect(partAchievement("top", monster.top)).toBeNull();
    }
  });
});

describe("sanitizeParts", () => {
  it("se queda solo con ids válidos", () => {
    expect(
      sanitizeParts({ body: "ghost", eyes: "<script>", mouth: 3, extra: "x", cheeks: true, top: "crown" }),
    ).toEqual({ body: "ghost", cheeks: true, top: "crown" });
  });

  it("ignora valores que no son objetos", () => {
    expect(sanitizeParts(null)).toEqual({});
    expect(sanitizeParts("ghost")).toEqual({});
  });

  it("resolveMonster aplica los cambios sobre la semilla", () => {
    expect(resolveMonster(42, { body: "bean" })).toEqual({ ...monsterFromSeed(42), body: "bean" });
  });
});

describe("renderMonsterSvg", () => {
  it("genera SVG completo para todas las combinaciones y estados de ánimo", () => {
    for (const body of PART_OPTIONS.body)
      for (const eyes of PART_OPTIONS.eyes)
        for (const mouth of PART_OPTIONS.mouth)
          for (const top of PART_OPTIONS.top)
            for (const mood of ["neutral", "happy", "sad"] as const) {
              const parts: MonsterParts = { body, eyes, mouth, top, palette: "coral", cheeks: true };
              const svg = renderMonsterSvg(parts, mood);
              expect(svg).toMatch(/^<svg [^>]*viewBox="0 0 100 100">.*<\/svg>$/);
              expect(svg).not.toMatch(/undefined|NaN|null/);
            }
  });
});

describe("partes de supporter", () => {
  it("coinciden con las que bloquea la base de datos", async () => {
    const { readFileSync, readdirSync } = await import("node:fs");
    const dir = new URL("../../../supabase/migrations/", import.meta.url);
    // La definición vigente es la de la última migración que la crea o la reemplaza.
    const file = readdirSync(dir)
      .sort()
      .filter((name) => readFileSync(new URL(name, dir), "utf8").includes("function private.is_supporter_avatar"))
      .at(-1)!;
    const sql = readFileSync(new URL(file, dir), "utf8");
    const listed = (slot: string) =>
      [...sql.matchAll(new RegExp(`'${slot}' in \\(([^)]*)\\)`, "g"))].flatMap((m) =>
        m[1]!.split(",").map((id) => id.trim().replace(/'/g, "")),
      );

    expect(listed("palette").sort()).toEqual(PART_OPTIONS.palette.filter((id) => isSupporterPart("palette", id)).sort());
    expect(listed("top").sort()).toEqual(PART_OPTIONS.top.filter((id) => isSupporterPart("top", id)).sort());
  });
});

describe("stickers", () => {
  it("se dibujan con cualquier monstruo", () => {
    for (const body of PART_OPTIONS.body)
      for (const eyes of PART_OPTIONS.eyes)
        for (const sticker of STICKERS) {
          const svg = renderStickerSvg({ body, eyes, mouth: "smile", top: "horns", palette: "coral", cheeks: false }, sticker);
          expect(svg).toMatch(/^<svg [^>]*viewBox="0 0 100 100">.*<\/svg>$/);
          expect(svg).not.toMatch(/undefined|NaN|null/);
        }
  });
});

describe("degradados del cuerpo", () => {
  it("con prefijo, cada SVG usa sus propios ids (si no, uno oculto en la página deja sin color a los demás)", () => {
    for (const palette of ["rainbow", "galaxy", "terminal", "neon"] as const) {
      const svg = renderMonsterSvg(resolveMonster(1, { palette }), "neutral", "m42");
      expect(svg).not.toContain("brb-");
      const refs = [...svg.matchAll(/url\(#([^)]+)\)/g)].map((match) => match[1]);
      expect(refs.length).toBeGreaterThan(0);
      for (const ref of refs) expect(svg).toContain(`id="${ref}"`);
    }
  });
});

