import { describe, expect, it } from "vitest";
import { SOLVED, isWellFormed, letterHints, normalizeWord, scoreGuess, shareGrid } from ".";

describe("wordle", () => {
  it("normaliza tildes y conserva la ñ", () => {
    expect(normalizeWord("Árbol")).toBe("arbol");
    expect(normalizeWord("PINGÜINO")).toBe("pinguino");
    expect(normalizeWord("Niños")).toBe("niños");
    expect(isWellFormed("niños")).toBe(true);
    expect(isWellFormed("nino")).toBe(false);
    expect(isWellFormed("niño1")).toBe(false);
  });

  it("marca verdes, amarillas y grises", () => {
    expect(scoreGuess("perro", "perro")).toBe(SOLVED);
    expect(scoreGuess("cielo", "perro")).toBe("bbybg");
    expect(scoreGuess("tigre", "perro")).toBe("bbbgy");
  });

  it("las letras repetidas solo cuentan tantas veces como aparecen", () => {
    // "perro" tiene dos erres: una de "error" está en su sitio, otra en otro y la tercera sobra.
    expect(scoreGuess("error", "perro")).toBe("yygyb");
    // Solo hay una ele y ya está en verde: la otra queda gris.
    expect(scoreGuess("llama", "playa")).toBe("bggbg");
    // Una sola o en la solución: la primera o del intento se marca amarilla y la segunda, gris.
    expect(scoreGuess("ocaso", "polar")).toBe("ybybb");
  });

  it("el teclado se queda con la mejor pista de cada letra", () => {
    const hints = letterHints(["cielo", "error"], [scoreGuess("cielo", "perro"), scoreGuess("error", "perro")]);
    expect(hints.get("r")).toBe("g");
    expect(hints.get("e")).toBe("y");
    expect(hints.get("c")).toBe("b");
  });

  it("comparte solo los colores", () => {
    expect(shareGrid(["bbybg", SOLVED])).toBe("⬛⬛🟨⬛🟩\n🟩🟩🟩🟩🟩");
  });
});
