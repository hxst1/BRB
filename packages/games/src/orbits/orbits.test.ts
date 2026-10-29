import { describe, expect, it } from "vitest";
import { LIVES, START_RADIUS, canLaunch, decodeLaunches, newGame, replay, step, wouldClear, type OrbitsState } from ".";

/** Espera a que se pueda apuntar (tras la pausa, ya con los anillos del nivel que toca). */
function aim(state: OrbitsState): OrbitsState {
  while (state.status !== "aim") state = step(state);
  return state;
}

/** ¿Lanzar en el próximo tic llega al centro? */
const clearsNext = (state: OrbitsState) => wouldClear(state.rings, state.tick + 1 - state.levelStart);

/** Espera al primer tic en que lanzar llega al centro, y lanza. */
function launchWhenClear(state: OrbitsState): OrbitsState {
  state = aim(state);
  while (!clearsNext(state)) state = step(state);
  return step(state, true);
}

/** Deja volar la bola hasta que choca o llega. */
function land(state: OrbitsState): OrbitsState {
  while (state.status === "flying") state = step(state);
  return state;
}

/** Espera al primer tic en que lanzar choca, y lanza. */
function launchIntoRing(state: OrbitsState): OrbitsState {
  state = aim(state);
  while (clearsNext(state)) state = step(state);
  return step(state, true);
}

describe("órbitas", () => {
  it("la misma semilla da los mismos anillos", () => {
    expect(newGame(7).rings).toEqual(newGame(7).rings);
    expect(newGame(7).rings).not.toEqual(newGame(8).rings);
  });

  it("empieza con un anillo y la bola abajo, esperando", () => {
    const state = newGame(1);
    expect(state.rings).toHaveLength(1);
    expect(state.status).toBe("aim");
    expect(state.ball).toBe(START_RADIUS);
    expect(state.lives).toBe(LIVES);
  });

  it("los anillos giran aunque no se lance", () => {
    let state = newGame(3);
    const ring = state.rings[0]!;
    for (let i = 0; i < 10; i++) state = step(state);
    expect(state.tick).toBe(10);
    expect(state.status).toBe("aim");
    expect(ring.speed).not.toBe(0);
  });

  it("lanzar en buen momento supera el nivel y el siguiente tiene más anillos", () => {
    let state = land(launchWhenClear(newGame(5)));
    expect(state.status).toBe("cleared");
    expect(state.score).toBe(1);
    state = launchWhenClear(state);
    expect(state.level).toBe(2);
    expect(state.rings).toHaveLength(2);
  });

  it("chocar quita una vida y repite el nivel; sin vidas, se acaba", () => {
    let state = land(launchIntoRing(newGame(9)));
    expect(state.status).toBe("crashed");
    expect(state.lives).toBe(LIVES - 1);
    expect(state.hit).toBe(0);
    for (let i = 1; i < LIVES; i++) state = land(launchIntoRing(state));
    expect(state.status).toBe("over");
    expect(state.level).toBe(1);
    expect(step(state, true)).toBe(state);
  });

  it("no se puede lanzar con la bola en vuelo", () => {
    const flying = launchWhenClear(newGame(2));
    expect(canLaunch(flying)).toBe(false);
    expect(step(flying, true).launches).toBe(flying.launches);
  });

  it("todos los niveles se pueden superar", () => {
    for (const seed of [1, 2, 3, 42, 1234]) {
      let state = newGame(seed);
      for (let level = 1; level <= 15; level++) state = land(launchWhenClear(state));
      expect(state.score).toBe(15);
      expect(state.lives).toBe(LIVES);
    }
  });

  it("la repetición da el mismo resultado", () => {
    let state = newGame(77);
    for (let i = 0; i < 6; i++) state = land(launchWhenClear(state));
    state = land(launchIntoRing(state));
    const result = replay(77, state.launches);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.state.score).toBe(6);
    expect(result.state.lives).toBe(LIVES - 1);
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it("rechaza lanzamientos imposibles o mal codificados", () => {
    expect(decodeLaunches("")).toEqual([]);
    expect(decodeLaunches("3.10")).toEqual([3, 13]);
    expect(decodeLaunches("0")).toBeNull();
    expect(decodeLaunches("3..4")).toBeNull();
    expect(decodeLaunches("x")).toBeNull();
    // El segundo lanzamiento, un tic después del primero: la bola sigue en vuelo.
    expect(replay(1, "5.1")).toEqual({ valid: false, reason: "Lanzamiento imposible en el tic 6" });
  });
});
