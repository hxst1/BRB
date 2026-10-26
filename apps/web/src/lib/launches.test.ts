import { describe, expect, it } from "vitest";
import { messagesFor } from "./i18n";
import { LAUNCH_WINDOW_MS, launchMessage, launchesFor, pendingLaunches, type Launch } from "./launches";

const now = Date.parse("2026-11-02T12:00:00Z");
const hours = (h: number) => h * 60 * 60 * 1000;
const solitaire: Launch = { id: "solitaire", path: "/solitario", addedAt: now - hours(30) };
const queens: Launch = { id: "queens", path: "/reinas", addedAt: now - hours(2) };
const old: Launch = { id: "sudoku", path: "/sudoku", addedAt: now - LAUNCH_WINDOW_MS - 1 };
const future: Launch = { id: "tron", path: "/tron", addedAt: now + hours(1) };

describe("aviso de juegos nuevos", () => {
  it("solo los publicados hace poco y sin anunciar", () => {
    expect(pendingLaunches([solitaire, queens, old, future], new Set(["solitaire"]), now)).toEqual([queens]);
  });

  it("a cada uno, los que salieron después de crear su cuenta y aún no ha visto", () => {
    const pending = [solitaire, queens];
    expect(launchesFor(pending, { createdAt: now - hours(100), seen: new Set() })).toEqual([solitaire, queens]);
    expect(launchesFor(pending, { createdAt: now - hours(10), seen: new Set() })).toEqual([queens]);
    expect(launchesFor(pending, { createdAt: now - hours(100), seen: new Set(["queens"]) })).toEqual([solitaire]);
  });

  it("uno lleva a su página; varios, juntos en un aviso a la portada", () => {
    const es = messagesFor("es");
    expect(launchMessage(es, [queens])).toEqual({
      title: "Nuevo juego: Reinas",
      body: "Una por fila, columna y color. Pruébalo ahora.",
      url: "/reinas",
      tag: "new-game",
    });
    expect(launchMessage(es, [solitaire, queens])).toMatchObject({ title: "Juegos nuevos: Solitario y Reinas", url: "/" });
    expect(launchMessage(messagesFor("en"), [solitaire, queens]).title).toBe("New games: Solitaire and Queens");
  });
});
