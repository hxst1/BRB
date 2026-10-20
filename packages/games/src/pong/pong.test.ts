import { describe, expect, it } from "vitest";
import { FIELD_HEIGHT, newGame, paddleLine, SERVE_DELAY, step, WIN_SCORE, type PongState } from ".";

/** Simula `seconds` a 60 FPS con las palas fijas. */
function run(state: PongState, seconds: number, paddles = { x: 0.5, o: 0.5 }) {
  let current = state;
  const events: string[] = [];
  for (let t = 0; t < seconds; t += 1 / 60) {
    const result = step(current, 1 / 60, paddles);
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events };
}

describe("pong", () => {
  it("espera antes de sacar", () => {
    const { state } = run(newGame("x"), SERVE_DELAY / 2);
    expect(state.ball.y).toBeCloseTo(FIELD_HEIGHT / 2);
  });

  it("la pala devuelve la pelota y acelera", () => {
    const { state, events } = run(newGame("x"), SERVE_DELAY + 1.2);
    expect(events).toContain("hit");
    expect(state.ball.vy).toBeLessThan(0);
    expect(Math.abs(state.ball.vy)).toBeGreaterThan(0.85);
  });

  it("si la pala no está, el rival marca", () => {
    const { state, events } = run(newGame("x"), SERVE_DELAY + 1.5, { x: 0.05, o: 0.5 });
    expect(events).toContain("point");
    expect(state.score).toEqual({ x: 0, o: 1 });
    expect(state.serveTo).toBe("x");
  });

  it("golpear con el borde de la pala desvía la pelota", () => {
    const state: PongState = {
      ...newGame("x"),
      pause: 0,
      ball: { x: 0.6, y: paddleLine("x") - 0.1, vx: 0, vy: 1 },
    };
    const { state: after } = run(state, 0.2);
    expect(after.ball.vx).toBeGreaterThan(0);
  });

  it("rebota en las paredes laterales", () => {
    const state: PongState = { ...newGame("x"), pause: 0, ball: { x: 0.05, y: 0.8, vx: -1, vy: 0.01 } };
    const { state: after, events } = run(state, 0.2);
    expect(events).toContain("wall");
    expect(after.ball.vx).toBeGreaterThan(0);
  });

  it("termina al llegar a los puntos necesarios", () => {
    let state = newGame("x");
    for (let i = 0; i < WIN_SCORE; i++) state = run(state, SERVE_DELAY + 1.5, { x: 0.05, o: 0.5 }).state;
    expect(state.winner).toBe("o");
    expect(state.score.o).toBe(WIN_SCORE);
    // Terminada, ya no cambia.
    expect(run(state, 2).state.score).toEqual(state.score);
  });

  it("no atraviesa la pala aunque el fotograma sea largo", () => {
    const state: PongState = { ...newGame("x"), pause: 0, ball: { x: 0.5, y: paddleLine("x") - 0.05, vx: 0, vy: 2 } };
    const { events } = step(state, 0.1, { x: 0.5, o: 0.5 });
    expect(events).toContain("hit");
  });
});
