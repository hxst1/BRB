import { describe, expect, it } from "vitest";
import { decodeMove, encodeMove, legalMoves, newGame, play, replay, squareIndex, type ChessState } from ".";

/** Jugadas en notación de casillas ("e2e4", "e7e8q"). */
function moves(...list: string[]): number[] {
  return list.map((uci) => encodeMove(squareIndex(uci.slice(0, 2)), squareIndex(uci.slice(2, 4)), (uci[4] as "q" | undefined) ?? undefined));
}

function playAll(list: string[]): ChessState {
  const state = replay(moves(...list));
  if (!state) throw new Error("partida no válida");
  return state;
}

describe("ajedrez", () => {
  it("codifica cualquier jugada en un smallint", () => {
    const code = encodeMove(squareIndex("a7"), squareIndex("a8"), "n");
    expect(code).toBeLessThan(32768);
    expect(decodeMove(code)).toEqual({ from: squareIndex("a7"), to: squareIndex("a8"), promotion: "n" });
    expect(decodeMove(-1)).toBeNull();
    expect(decodeMove(5 * 4096)).toBeNull();
  });

  it("empiezan las blancas (X) y se alternan los turnos", () => {
    expect(newGame().turn).toBe("x");
    const state = playAll(["e2e4"]);
    expect(state.turn).toBe("o");
    expect(state.last).toEqual({ from: squareIndex("e2"), to: squareIndex("e4") });
    expect(play(state, "x", moves("d2d4")[0]!)).toEqual({ ok: false, error: "not_your_turn" });
  });

  it("rechaza las jugadas ilegales", () => {
    expect(play(newGame(), "x", moves("e2e5")[0]!)).toEqual({ ok: false, error: "illegal" });
    expect(replay(moves("e2e4", "e2e4"))).toBeNull();
  });

  it("mate del pastor: ganan las blancas", () => {
    const state = playAll(["e2e4", "e7e5", "f1c4", "b8c6", "d1h5", "g8f6", "h5f7"]);
    expect(state.ending).toBe("checkmate");
    expect(state.winner).toBe("x");
    expect(state.turn).toBeNull();
    expect(play(state, "o", moves("a7a6")[0]!)).toEqual({ ok: false, error: "game_over" });
    expect(replay([...state.moves, ...moves("a7a6")])).toBeNull();
  });

  it("enroque, captura al paso y coronación", () => {
    const castled = playAll(["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6", "e1g1"]);
    expect(castled.board[squareIndex("g1")]).toEqual({ mark: "x", type: "k" });
    expect(castled.board[squareIndex("f1")]).toEqual({ mark: "x", type: "r" });

    const passant = playAll(["e2e4", "a7a6", "e4e5", "d7d5", "e5d6"]);
    expect(passant.board[squareIndex("d5")]).toBeNull();

    // El peón de h llega a h7 y corona capturando el caballo de g8.
    const promoted = playAll(["h2h4", "g7g5", "h4g5", "h7h6", "g5h6", "a7a6", "h6h7", "a6a5", "h7g8n"]);
    expect(promoted.board[squareIndex("g8")]).toEqual({ mark: "x", type: "n" });
  });

  it("ofrece las jugadas legales y avisa de las coronaciones", () => {
    expect(legalMoves(newGame(), squareIndex("e2")).map((m) => m.to).sort()).toEqual([squareIndex("e3"), squareIndex("e4")].sort());
    const beforePromotion = playAll(["h2h4", "g7g5", "h4g5", "h7h6", "g5h6", "a7a6", "h6h7", "a6a5"]);
    const promotions = legalMoves(beforePromotion, squareIndex("h7"));
    expect(promotions.length).toBeGreaterThan(0);
    expect(promotions.every((m) => m.promotion)).toBe(true);
  });

  it("tablas por ahogado y por repetición", () => {
    // Ahogado conocido (Loyd): las negras no tienen jugadas y no están en jaque.
    const stalemate = playAll(["e2e3", "a7a5", "d1h5", "a8a6", "h5a5", "h7h5", "h2h4", "a6h6", "a5c7", "f7f6", "c7d7", "e8f7", "d7b7", "d8d3", "b7b8", "d3h7", "b8c8", "f7g6", "c8e6"]);
    expect(stalemate.ending).toBe("stalemate");
    expect(stalemate.winner).toBeNull();

    const repetition = playAll(["g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1", "f6g8"]);
    expect(repetition.ending).toBe("threefold");
  });
});
