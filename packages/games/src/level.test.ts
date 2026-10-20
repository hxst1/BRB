import { describe, expect, it } from "vitest";
import { levelFromXp, levelStart } from "./level";

describe("levelFromXp", () => {
  it("empieza en el nivel 1", () => {
    expect(levelFromXp(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNext: 10, progress: 0 });
  });

  it("sube justo al llegar al inicio de cada nivel", () => {
    for (const level of [2, 3, 10, 50]) {
      expect(levelFromXp(levelStart(level)).level).toBe(level);
      expect(levelFromXp(levelStart(level) - 1).level).toBe(level - 1);
    }
  });

  it("calcula el progreso dentro del nivel", () => {
    // Nivel 2: de 10 a 40 XP.
    expect(levelFromXp(25)).toMatchObject({ level: 2, xpIntoLevel: 15, xpForNext: 30, progress: 0.5 });
  });
});
