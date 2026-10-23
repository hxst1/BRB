import { describe, expect, it } from "vitest";
import solutionsEn from "./solutions-en.json";
import solutionsEs from "./solutions.json";
import validEn from "./valid-words-en.json";
import validEs from "./valid-words.json";

describe.each([
  ["español", solutionsEs, validEs, /^[a-zñ]{5}$/],
  ["inglés", solutionsEn, validEn, /^[a-z]{5}$/],
])("palabras del Wordle en %s", (_lang, solutions, valid, shape) => {
  it("las soluciones son palabras válidas de 5 letras y no se repiten", () => {
    const accepted = new Set(valid);
    expect(solutions.filter((word) => !shape.test(word) || !accepted.has(word))).toEqual([]);
    expect(new Set(solutions).size).toBe(solutions.length);
  });

  it("hay palabras para más de un año sin repetir", () => {
    expect(solutions.length).toBeGreaterThan(365);
  });
});
