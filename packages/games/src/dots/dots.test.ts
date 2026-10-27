import { describe, expect, it } from "vitest";
import { createRng, nextInt } from "../rng";
import { BOXES, EDGES, PASS, boxEdges, edgeBoxes, horizontalEdge, newGame, play, replay, verticalEdge, type DotsState } from ".";

function randomGame(seed: number): DotsState {
  let rng = createRng(seed);
  let state = newGame();
  while (state.turn) {
    const free = state.edges.flatMap((owner, edge) => (owner ? [] : [edge]));
    const [pick, next] = nextInt(rng, free.length);
    rng = next;
    const result = play(state, state.turn, free[pick]!);
    if (!result.ok) throw new Error(result.error);
    state = result.state;
  }
  return state;
}

describe("Puntos y cajas", () => {
  it("cada raya interior es lado de dos cajas y cada caja tiene cuatro rayas distintas", () => {
    expect(edgeBoxes(horizontalEdge(0, 0))).toEqual([0]);
    expect(edgeBoxes(horizontalEdge(1, 0))).toEqual([0, BOXES]);
    expect(edgeBoxes(verticalEdge(0, BOXES))).toEqual([BOXES - 1]);
    for (let box = 0; box < BOXES * BOXES; box++) {
      const sides = boxEdges(box);
      expect(new Set(sides).size).toBe(4);
      for (const side of sides) expect(edgeBoxes(side)).toContain(box);
    }
  });

  it("quien cierra una caja se la queda y vuelve a jugar", () => {
    // X traza tres lados de la primera caja (O juega lejos) y O la cierra.
    const [top, bottom, left, right] = boxEdges(0);
    const far = horizontalEdge(BOXES, BOXES - 1);
    const state = replay([top, far, bottom, horizontalEdge(BOXES, BOXES - 2), left, right, PASS])!;
    expect(state.boxes[0]).toBe("o");
    expect(state.score).toEqual({ x: 0, o: 1 });
    expect(state.turn).toBe("o");
    expect(state.closed).toEqual([0]);
  });

  it("rechaza rayas repetidas, fuera del tablero o fuera de turno", () => {
    const state = replay([0])!;
    expect(play(state, "o", 0)).toEqual({ ok: false, error: "taken" });
    expect(play(state, "o", EDGES)).toEqual({ ok: false, error: "invalid_edge" });
    expect(play(state, "x", 1)).toEqual({ ok: false, error: "not_your_turn" });
  });

  it("las partidas acaban con todas las cajas y X juega siempre en los pares", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const state = randomGame(seed);
      expect(state.turn).toBeNull();
      expect(state.score.x + state.score.o).toBe(BOXES * BOXES);
      expect(state.edges.every(Boolean)).toBe(true);
      expect(replay(state.moves)?.score).toEqual(state.score);

      let partial = newGame();
      state.moves.forEach((edge, i) => {
        if (edge === PASS) return;
        const result = play(partial, i % 2 === 0 ? "x" : "o", edge);
        expect(result.ok).toBe(true);
        if (result.ok) partial = result.state;
      });
    }
  });

  it("no acepta un PASS de más ni que falte", () => {
    const moves = randomGame(7).moves;
    const at = moves.indexOf(PASS);
    expect(at).toBeGreaterThan(0);
    expect(replay([...moves.slice(0, at), ...moves.slice(at + 1)])).toBeNull();
    expect(replay([0, PASS])).toBeNull();
  });
});
