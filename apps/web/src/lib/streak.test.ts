import { describe, expect, it } from "vitest";
import { recentDays, streakTier } from "./streak";

describe("tramos de la racha", () => {
  it("cada racha en su tramo, con lo que falta para el siguiente", () => {
    expect(streakTier(0)).toEqual({ tier: "out", next: { tier: "spark", in: 1 } });
    expect(streakTier(1)).toEqual({ tier: "spark", next: { tier: "flame", in: 9 } });
    expect(streakTier(9).tier).toBe("spark");
    expect(streakTier(10)).toEqual({ tier: "flame", next: { tier: "bonfire", in: 20 } });
    expect(streakTier(99).tier).toBe("bonfire");
    expect(streakTier(100).tier).toBe("blue");
    expect(streakTier(400)).toEqual({ tier: "gold", next: null });
  });

  it("los días recientes, a prueba de datos raros", () => {
    expect(recentDays([{ day: "2026-10-26", kind: "played" }, { day: "2026-10-27", kind: null }, { day: 3 }, { day: "2026-10-25", kind: "x" }])).toEqual([
      { day: "2026-10-26", kind: "played" },
      { day: "2026-10-27", kind: null },
      { day: "2026-10-25", kind: null },
    ]);
    expect(recentDays(null)).toEqual([]);
  });
});
