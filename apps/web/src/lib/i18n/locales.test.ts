import { describe, expect, it } from "vitest";
import { makeFormat } from "@/lib/format";
import { contentLanguage, LOCALES, pickLocale } from "./locales";

describe("idioma de la petición", () => {
  it("el de Ajustes manda; si no, el primero de los nuestros que pida el navegador", () => {
    expect(pickLocale("en", "ja-JP,ja;q=0.9")).toBe("en");
    expect(pickLocale(undefined, "ja-JP,ja;q=0.9,en-US;q=0.8")).toBe("ja");
    expect(pickLocale(undefined, "fr-FR,en;q=0.8,ja;q=0.5")).toBe("en");
    expect(pickLocale(undefined, "fr-FR,es;q=0.8")).toBe("es");
    expect(pickLocale("xx", null)).toBe("es");
  });

  it("el japonés usa el contenido en inglés (Wordle, carrera, novedades, textos legales)", () => {
    expect(LOCALES.map(contentLanguage)).toEqual(["es", "en", "en"]);
  });
});

describe("formatos en japonés", () => {
  const format = makeFormat("ja");
  const now = Date.parse("2026-10-27T12:00:00Z");

  it("números, tiempos y fechas relativas", () => {
    expect(format.number(12840)).toBe("12,840");
    expect(format.time(45_200)).toBe("45.2秒");
    expect(format.time(65_300)).toBe("1:05.3");
    expect(format.ago(new Date(now - 30_000), now)).toBe("たった今");
    expect(format.ago(new Date(now - 5 * 60_000), now)).toBe("5分前");
    expect(format.ago(new Date(now - 3 * 3_600_000), now)).toBe("3時間前");
    expect(format.ago(new Date(now - 2 * 86_400_000), now)).toBe("2日前");
    expect(format.timeLeft(new Date(now + 2 * 86_400_000), now)).toBe("2日");
  });
});
