import { describe, expect, it } from "vitest";
import { CHOICES, MAX_ROUNDS, replay, resolveRound, type Variant } from ".";

const idx = (variant: Variant, name: string) => (CHOICES[variant] as readonly string[]).indexOf(name);

describe("resolveRound", () => {
  it("aplica las reglas clásicas", () => {
    expect(resolveRound("rps", idx("rps", "rock"), idx("rps", "scissors"))).toMatchObject({
      winner: "x",
      verdict: "La piedra aplasta la tijera",
    });
    expect(resolveRound("rps", idx("rps", "rock"), idx("rps", "paper"))).toMatchObject({ winner: "o" });
    expect(resolveRound("rps", 1, 1)).toMatchObject({ winner: null, verdict: null });
  });

  it("cada opción de la variante lagarto Spock gana a dos y pierde contra dos", () => {
    const n = CHOICES.rpsls.length;
    for (let a = 0; a < n; a++) {
      let wins = 0;
      let losses = 0;
      for (let b = 0; b < n; b++) {
        if (a === b) continue;
        const round = resolveRound("rpsls", a, b);
        if (round.winner === "x") wins++;
        else losses++;
        // Simétrico: si a gana a b, b pierde contra a con la misma frase.
        const reverse = resolveRound("rpsls", b, a);
        expect(reverse.winner).toBe(round.winner === "x" ? "o" : "x");
        expect(reverse.verdict).toBe(round.verdict);
      }
      expect([wins, losses]).toEqual([2, 2]);
    }
  });

  it("Spock vaporiza la piedra y el lagarto envenena a Spock", () => {
    expect(resolveRound("rpsls", idx("rpsls", "spock"), idx("rpsls", "rock")).verdict).toBe("Spock vaporiza la piedra");
    expect(resolveRound("rpsls", idx("rpsls", "spock"), idx("rpsls", "lizard")).verdict).toBe("El lagarto envenena a Spock");
  });
});

describe("replay", () => {
  it("gana quien llega antes a 2 rondas; los empates no cuentan", () => {
    // empate, gana X, gana O, gana X
    const state = replay("rps", [0, 0, 0, 2, 0, 1, 1, 0]);
    expect(state).toMatchObject({ score: { x: 2, o: 1 }, finished: true, winner: "x" });
    expect(state!.rounds).toHaveLength(4);
  });

  it("sigue abierta mientras nadie llegue a 2", () => {
    expect(replay("rps", [0, 2])).toMatchObject({ finished: false, winner: null, score: { x: 1, o: 0 } });
  });

  it("rechaza elecciones fuera de la variante y rondas tras el final", () => {
    expect(replay("rps", [0, 4])).toBeNull();
    expect(replay("rps", [0])).toBeNull();
    expect(replay("rps", [0, 2, 0, 2, 0, 2])).toBeNull();
  });

  it("con el tope de rondas termina; empate si van iguales", () => {
    const draws = Array.from({ length: MAX_ROUNDS * 2 }, () => 0);
    expect(replay("rps", draws)).toMatchObject({ finished: true, winner: null });
  });
});
