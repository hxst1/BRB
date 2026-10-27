import { describe, expect, it } from "vitest";
import { GAMES_EN } from "./games-en";
import { GAMES_ES } from "./games-es";
import { GAMES_JA } from "./games-ja";
import { LOCALES, messagesFor, type Locale } from "./index";

/**
 * Forma de un diccionario: cada clave con su tipo, las listas con su largo y
 * las funciones como tales. Los textos cambian de un
 * idioma a otro; la forma, no (el tipo no comprueba el largo de las listas).
 */
function shape(value: unknown, path = ""): string[] {
  if (typeof value === "function") return [`${path}: función`];
  if (Array.isArray(value)) return [`${path}: lista de ${value.length}`, ...value.flatMap((item, i) => shape(item, `${path}[${i}]`))];
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, item]) => shape(item, path ? `${path}.${key}` : key));
  return [`${path}: ${typeof value}`];
}

const GAMES: Record<Locale, unknown> = { es: GAMES_ES, en: GAMES_EN, ja: GAMES_JA };

describe("textos de la app", () => {
  for (const locale of LOCALES.filter((locale) => locale !== "es")) {
    it(`${locale} tiene las mismas claves que el español`, () => {
      expect(shape(messagesFor(locale)).sort()).toEqual(shape(messagesFor("es")).sort());
    });

    it(`${locale} tiene los textos de cada juego, con los mismos pasos`, () => {
      const steps = (games: unknown) => shape(games).filter((line) => !line.includes(".faq"));
      expect(steps(GAMES[locale]).sort()).toEqual(steps(GAMES.es).sort());
    });
  }

  it("cada idioma sale en el selector con su nombre", () => {
    for (const locale of LOCALES) expect(Object.keys(messagesFor(locale).settings.languages).sort()).toEqual([...LOCALES].sort());
  });
});
