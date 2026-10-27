import { describe, expect, it } from "vitest";
import { WORD_COUNT, correctPrefix, plausibleTime, raceText, wordsPerMinute } from ".";

describe("Carrera de tecleo", () => {
  it("el mismo id da el mismo texto, y otro id otro", () => {
    const id = "6f1c1f0e-8a6d-4a43-9d4f-2b0f6c1e9a10";
    expect(raceText(id, "es")).toBe(raceText(id, "es"));
    expect(raceText(id, "es")).not.toBe(raceText("otra", "es"));
    expect(raceText(id, "es").split(" ")).toHaveLength(WORD_COUNT);
  });

  it("solo letras sin tilde y espacios sueltos", () => {
    for (const language of ["es", "en"] as const) {
      for (let i = 0; i < 50; i++) expect(raceText(`p${i}`, language)).toMatch(/^[a-z]+( [a-z]+)*$/);
    }
  });

  it("cuenta las letras bien escritas hasta el primer error", () => {
    expect(correctPrefix("casa pe", "casa perro")).toBe(7);
    expect(correctPrefix("casa ro", "casa perro")).toBe(5);
    expect(correctPrefix("", "casa")).toBe(0);
  });

  it("palabras por minuto y tiempos imposibles", () => {
    expect(wordsPerMinute(250, 60000)).toBe(50);
    expect(plausibleTime("casa perro", 100)).toBe(false);
    expect(plausibleTime("casa perro", 3000)).toBe(true);
  });
});
