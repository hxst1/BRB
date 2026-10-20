/**
 * Pong vertical (pensado para el móvil): X defiende el borde de abajo y O el
 * de arriba. Todo en unidades del campo: ancho 1, alto FIELD_HEIGHT.
 *
 * Es lógica pura: quien hace de anfitrión llama a `step` en cada fotograma
 * con la posición de las dos palas y retransmite el resultado.
 */

export type Mark = "x" | "o";

export const FIELD_HEIGHT = 1.6;
export const PADDLE_WIDTH = 0.24;
export const PADDLE_HEIGHT = 0.03;
/** Distancia de cada pala a su borde. */
export const PADDLE_MARGIN = 0.06;
export const BALL_RADIUS = 0.022;
export const WIN_SCORE = 5;

const START_SPEED = 0.85;
const MAX_SPEED = 2.2;
const SPEEDUP = 1.06;
/** Ángulo máximo de salida al golpear en el borde de la pala (radianes). */
const MAX_BOUNCE_ANGLE = Math.PI / 3;
/** Pausa entre puntos (segundos). */
export const SERVE_DELAY = 1.2;
/** Paso fijo de la simulación: evita que la pelota atraviese la pala a pocos FPS. */
const SUBSTEP = 1 / 240;

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface PongState {
  ball: Ball;
  /** Centro horizontal de cada pala. */
  paddles: Record<Mark, number>;
  score: Record<Mark, number>;
  /** Segundos hasta el siguiente saque (0 = en juego). */
  pause: number;
  /** Hacia quién va el próximo saque (quien encajó el último punto). */
  serveTo: Mark;
  winner: Mark | null;
}

export type PongEvent = "hit" | "wall" | "point";

export function clampPaddle(x: number): number {
  return Math.min(1 - PADDLE_WIDTH / 2, Math.max(PADDLE_WIDTH / 2, x));
}

/** Línea (y) en la que la pelota toca la pala de cada jugador. */
export function paddleLine(mark: Mark): number {
  return mark === "x" ? FIELD_HEIGHT - PADDLE_MARGIN - PADDLE_HEIGHT / 2 : PADDLE_MARGIN + PADDLE_HEIGHT / 2;
}

function servedBall(towards: Mark): Ball {
  return { x: 0.5, y: FIELD_HEIGHT / 2, vx: 0, vy: towards === "x" ? START_SPEED : -START_SPEED };
}

export function newGame(serveTo: Mark = "x"): PongState {
  return {
    ball: servedBall(serveTo),
    paddles: { x: 0.5, o: 0.5 },
    score: { x: 0, o: 0 },
    pause: SERVE_DELAY,
    serveTo,
    winner: null,
  };
}

/**
 * Avanza la partida `dt` segundos con las palas en `paddles`. Devuelve el
 * nuevo estado y lo que ha pasado (para sonidos o vibración).
 */
export function step(state: PongState, dt: number, paddles: Record<Mark, number>): { state: PongState; events: PongEvent[] } {
  const events: PongEvent[] = [];
  let next: PongState = { ...state, paddles: { x: clampPaddle(paddles.x), o: clampPaddle(paddles.o) } };
  if (next.winner) return { state: next, events };

  let remaining = Math.min(dt, 0.1);
  while (remaining > 0) {
    const h = Math.min(SUBSTEP, remaining);
    remaining -= h;

    if (next.pause > 0) {
      next = { ...next, pause: Math.max(0, next.pause - h) };
      continue;
    }

    const ball = { ...next.ball };
    ball.x += ball.vx * h;
    ball.y += ball.vy * h;

    // Paredes laterales
    if (ball.x < BALL_RADIUS) {
      ball.x = BALL_RADIUS;
      ball.vx = Math.abs(ball.vx);
      events.push("wall");
    } else if (ball.x > 1 - BALL_RADIUS) {
      ball.x = 1 - BALL_RADIUS;
      ball.vx = -Math.abs(ball.vx);
      events.push("wall");
    }

    // Palas: solo si la pelota va hacia esa pala y cruza su línea.
    for (const mark of ["x", "o"] as const) {
      const towards = mark === "x" ? ball.vy > 0 : ball.vy < 0;
      const line = paddleLine(mark) + (mark === "x" ? -BALL_RADIUS : BALL_RADIUS);
      const crossed = mark === "x" ? ball.y >= line && next.ball.y < line + 0.001 : ball.y <= line && next.ball.y > line - 0.001;
      const offset = (ball.x - next.paddles[mark]) / (PADDLE_WIDTH / 2 + BALL_RADIUS);
      if (towards && crossed && Math.abs(offset) <= 1) {
        const speed = Math.min(MAX_SPEED, Math.hypot(ball.vx, ball.vy) * SPEEDUP);
        const angle = offset * MAX_BOUNCE_ANGLE;
        ball.vx = speed * Math.sin(angle);
        ball.vy = (mark === "x" ? -1 : 1) * speed * Math.cos(angle);
        ball.y = line;
        events.push("hit");
      }
    }

    // Punto: la pelota sale por el borde de alguien.
    const conceded: Mark | null = ball.y > FIELD_HEIGHT + BALL_RADIUS ? "x" : ball.y < -BALL_RADIUS ? "o" : null;
    if (conceded) {
      const scorer: Mark = conceded === "x" ? "o" : "x";
      const score = { ...next.score, [scorer]: next.score[scorer] + 1 };
      const winner = score[scorer] >= WIN_SCORE ? scorer : null;
      next = { ...next, score, winner, serveTo: conceded, ball: servedBall(conceded), pause: winner ? 0 : SERVE_DELAY };
      events.push("point");
      if (winner) break;
      continue;
    }

    next = { ...next, ball };
  }

  return { state: next, events };
}
