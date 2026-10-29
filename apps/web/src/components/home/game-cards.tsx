import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { DragScrollList } from "@/components/drag-scroll";
import { Crown } from "@/components/queens/crown";
import { CardFace } from "@/components/solitaire/card";
import { PinButton } from "./pin-button";
import { getMessages } from "@/lib/i18n/server";

/** Tablero en miniatura para la tarjeta del 2048 (decorativo). */
const PREVIEW_2048 = [2, 0, 8, 0, 0, 16, 64, 4, 0, 4, 128, 32, 2, 8, 512, 2048];
const PREVIEW_TTT = ["×", "", "○", "", "×", "", "○", "", ""];
/** 4 en raya en miniatura (5 × 4, de arriba abajo): x, o o vacía. */
const PREVIEW_C4 = [".....", "..o..", ".xxo.", "oxox."];
/** Hundir la flota en miniatura (5 × 5): barco (s), tocado (h), agua (m). */
const PREVIEW_SEA = ["m....", ".sss.", "....m", "h....", "h..m."];
/** Snake en miniatura (5 × 5): cuerpo de la cola a la cabeza y la manzana. */
const PREVIEW_SNAKE = { body: [20, 15, 16, 17, 12, 7, 8], food: 4 };
/** Luces encendidas del Lights Out en miniatura (4 × 4). */
const PREVIEW_LIGHTS = [1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1];
/** Buscaminas en miniatura (5 × 5): números, casillas cerradas (·) y una bandera (f). */
const PREVIEW_MINES = ["..1··", "..12·", "...1f", "11.1·", "·1.1·"];
/** Sudoku en miniatura: una caja de 3 × 3 con pistas (p) y números del jugador (j). */
const PREVIEW_SUDOKU: [string, "p" | "j" | ""][] = [
  ["5", "p"], ["", ""], ["8", "j"],
  ["", ""], ["2", "p"], ["", ""],
  ["7", "j"], ["", ""], ["4", "p"],
];
/** Ajedrez en miniatura (4 × 4, la esquina de un tablero): pieza y su color, o vacía. */
const PREVIEW_CHESS = ["bk", "", "", "br", "", "bp", "", "", "", "", "rn", "", "rq", "", "", "rk"];
/** Solitario en miniatura: tres columnas (null es una carta tapada): K♠ y Q♥, una tapada con el 7♦ y el A♣. */
const PREVIEW_SOLITAIRE: (number | null)[][] = [[12, 24], [null, 32], [39]];
/** Reinas en miniatura (5 × 5): región de cada casilla, dos reinas (q) y algunas × (x). */
const PREVIEW_QUEENS = { regions: [0, 0, 1, 1, 1, 0, 2, 2, 1, 1, 3, 3, 2, 2, 1, 3, 4, 4, 2, 1, 3, 4, 2, 2, 2], marks: { 1: "q", 10: "q", 0: "x", 5: "x", 7: "x" } as Record<number, "q" | "x"> };
/** Reversi en miniatura (4 × 4): fichas rojas (x), azules (o) o casilla vacía. */
const PREVIEW_REVERSI = [".o..", "xxo.", ".xox", "..o."];
/** Carrera de tecleo en miniatura: palabras de cada línea (su ancho) y cuántas van escritas. */
const PREVIEW_TYPING = { lines: [[22, 14, 30, 18], [16, 26, 12, 24], [28, 18, 20]], typed: 5 };
/** Órbitas en miniatura: anillos (radio, color y hacia dónde mira su hueco, en grados) alrededor del centro. */
const PREVIEW_ORBITS = [
  { r: 40, color: "--t1024", gap: -40 },
  { r: 29, color: "--t2048", gap: 150 },
  { r: 18, color: "--t256", gap: 60 },
];
/** Wordle en miniatura: tres intentos hasta acertar. */
const PREVIEW_WORDLE = ["bybbb", "gbygb", "ggggg"];

/**
 * En el móvil, fila deslizable de tarjetas apaisadas: cada una ocupa unas tres
 * cuartas partes del ancho para que asome la siguiente y se vea que hay más.
 */
const ITEM = "w-[clamp(16rem,78%,20rem)] shrink-0 snap-start sm:w-auto";

export type GameId =
  | "2048"
  | "snake"
  | "lights-out"
  | "minesweeper"
  | "sudoku"
  | "solitaire"
  | "queens"
  | "orbits"
  | "wordle"
  | "tictactoe"
  | "connect4"
  | "battleship"
  | "rps"
  | "pong"
  | "tron"
  | "chess"
  | "reversi"
  | "dots"
  | "typing";

/** `beta`: juego en pruebas (sin ranking todavía), con su etiqueta en la tarjeta. */
type Game = { id: GameId; group: "solo" | "friends"; href: string; preview: ReactNode; beta?: true };

const GAMES: Game[] = [
  {
    id: "2048",
    group: "solo",
    href: "/2048",
    preview: (
        <div aria-hidden className="grid grid-cols-4 gap-1 rounded-xl p-1 sm:gap-1.5 sm:rounded-2xl sm:p-1.5" style={{ background: "var(--board)" }}>
          {PREVIEW_2048.map((value, i) => (
            <span
              key={i}
              className="aspect-square rounded-md transition-transform sm:rounded-lg duration-300 group-hover:scale-95"
              style={
                {
                  background: value ? `var(--t${value})` : "var(--cell)",
                  transitionDelay: `${(i % 4) * 25}ms`,
                } as CSSProperties
              }
            />
          ))}
        </div>
    ),
  },
  {
    id: "snake",
    group: "solo",
    href: "/snake",
    preview: (
        <div aria-hidden className="grid grid-cols-5 gap-1 rounded-xl p-1 sm:gap-1.5 sm:rounded-2xl sm:p-1.5" style={{ background: "var(--board)" }}>
          {Array.from({ length: 25 }, (_, i) => {
            const segment = PREVIEW_SNAKE.body.indexOf(i);
            const isHead = segment === PREVIEW_SNAKE.body.length - 1;
            return (
              <span
                key={i}
                className={`aspect-square transition-transform duration-300 group-hover:scale-95 ${
                  i === PREVIEW_SNAKE.food ? "scale-75 rounded-full" : "rounded-md sm:rounded-lg"
                }`}
                style={{
                  background:
                    i === PREVIEW_SNAKE.food ? "var(--t64)" : isHead ? "var(--t1024)" : segment >= 0 ? "var(--t512)" : "var(--cell)",
                  transitionDelay: `${Math.max(segment, 0) * 30}ms`,
                }}
              />
            );
          })}
        </div>
    ),
  },
  {
    id: "lights-out",
    group: "solo",
    href: "/lights-out",
    preview: (
        <div aria-hidden className="grid grid-cols-4 gap-1 rounded-xl p-1 sm:gap-1.5 sm:rounded-2xl sm:p-1.5" style={{ background: "var(--board)" }}>
          {PREVIEW_LIGHTS.map((on, i) => (
            <span
              key={i}
              className="aspect-square rounded-md transition-transform duration-300 group-hover:scale-95 sm:rounded-lg"
              style={{ background: on ? "var(--t128)" : "var(--cell)", transitionDelay: `${(i % 4) * 25}ms` }}
            />
          ))}
        </div>
    ),
  },
  {
    id: "minesweeper",
    group: "solo",
    href: "/buscaminas",
    preview: (
        <div aria-hidden className="grid grid-cols-5 gap-1 rounded-xl p-1 sm:gap-1.5 sm:rounded-2xl sm:p-1.5" style={{ background: "var(--board)" }}>
          {PREVIEW_MINES.flatMap((row, r) =>
            [...row].map((kind, i) => (
              <span
                key={`${r}${i}`}
                className="display grid aspect-square place-items-center rounded-md text-sm font-bold transition-transform duration-300 group-hover:scale-95 sm:rounded-lg sm:text-xl"
                style={{
                  background: kind === "·" || kind === "f" ? "var(--cell)" : "transparent",
                  color: kind === "2" ? "var(--t512)" : "var(--mark-o)",
                  transitionDelay: `${i * 25}ms`,
                }}
              >
                {kind === "f" ? <span className="size-2.5 rounded-sm sm:size-3.5" style={{ background: "var(--mark-x)" }} /> : /\d/.test(kind) ? kind : null}
              </span>
            )),
          )}
        </div>
    ),
  },
  {
    id: "sudoku",
    group: "solo",
    href: "/sudoku",
    preview: (
        <div aria-hidden className="grid grid-cols-3 gap-1 rounded-xl p-1 sm:gap-1.5 sm:rounded-2xl sm:p-1.5" style={{ background: "var(--board)" }}>
          {PREVIEW_SUDOKU.map(([digit, kind], i) => (
            <span
              key={i}
              className="display grid aspect-square place-items-center rounded-md text-2xl font-bold transition-transform duration-300 group-hover:scale-95 sm:rounded-lg sm:text-4xl"
              style={{
                background: "var(--cell)",
                color: kind === "j" ? "var(--mark-o)" : "var(--ink)",
                transitionDelay: `${(i % 3) * 25}ms`,
              }}
            >
              {digit}
            </span>
          ))}
        </div>
    ),
  },
  {
    id: "solitaire",
    group: "solo",
    href: "/solitario",
    preview: (
        <div aria-hidden className="solitaire grid grid-cols-3 gap-1 rounded-xl p-1 sm:gap-1.5 sm:rounded-2xl sm:p-1.5" style={{ background: "var(--board)" }}>
          {PREVIEW_SOLITAIRE.map((column, i) => (
            <span key={i} className="relative self-start" style={{ aspectRatio: `5 / ${7 + (column.length - 1) * 2.4}` }}>
              {column.map((card, j) => (
                <span
                  key={j}
                  className={`solitaire-card absolute inset-x-0 aspect-[5/7] transition-transform duration-300 group-hover:-translate-y-0.5 ${
                    card === null ? "solitaire-back" : "solitaire-face"
                  }`}
                  style={{
                    top: `${(j / (column.length - 1 + 7 / 2.4)) * 100}%`,
                    color: card !== null && card >= 13 && card < 39 ? "var(--mark-x)" : "var(--ink)",
                    transitionDelay: `${i * 40}ms`,
                  }}
                >
                  {card !== null && <CardFace card={card} />}
                </span>
              ))}
            </span>
          ))}
        </div>
    ),
  },
  {
    id: "queens",
    group: "solo",
    href: "/reinas",
    preview: (
        <div aria-hidden className="queens grid grid-cols-5 gap-px overflow-hidden rounded-xl border-2 sm:rounded-2xl" style={{ borderColor: "var(--queens-line)" }}>
          {PREVIEW_QUEENS.regions.map((region, i) => (
            <span
              key={i}
              className="grid aspect-square place-items-center transition-transform duration-300 group-hover:scale-95"
              style={{ background: `var(--q${region})`, color: "#15171c", transitionDelay: `${(i % 5) * 25}ms` }}
            >
              {PREVIEW_QUEENS.marks[i] === "q" ? (
                <Crown className="size-3/5" />
              ) : PREVIEW_QUEENS.marks[i] === "x" ? (
                <span className="text-xs font-bold opacity-45 sm:text-base">×</span>
              ) : null}
            </span>
          ))}
        </div>
    ),
  },
  {
    id: "orbits",
    group: "solo",
    href: "/orbitas",
    beta: true,
    preview: (
        <div aria-hidden className="rounded-xl p-1 sm:rounded-2xl sm:p-1.5" style={{ background: "var(--board)" }}>
          <svg viewBox="0 0 100 100" className="block aspect-square w-full">
            {PREVIEW_ORBITS.map((ring, i) => {
              // El arco entero menos un hueco de 70°, que gira un poco al pasar por encima.
              const start = ((ring.gap + 35) * Math.PI) / 180;
              const end = ((ring.gap - 35 + 360) * Math.PI) / 180;
              const point = (angle: number) => `${50 + ring.r * Math.cos(angle)} ${50 + ring.r * Math.sin(angle)}`;
              return (
                <path
                  key={i}
                  d={`M${point(start)} A${ring.r} ${ring.r} 0 1 1 ${point(end)}`}
                  fill="none"
                  stroke={`var(${ring.color})`}
                  strokeWidth="7"
                  strokeLinecap="round"
                  className="origin-center transition-transform duration-500 group-hover:rotate-45"
                  style={{ transitionDelay: `${i * 60}ms`, transformBox: "view-box" }}
                />
              );
            })}
            <circle cx="50" cy="50" r="6" fill="var(--cell)" />
            <circle cx="50" cy="94" r="4" fill="var(--ink)" />
          </svg>
        </div>
    ),
  },
  {
    id: "wordle",
    group: "solo",
    href: "/wordle",
    preview: (
        <div aria-hidden className="grid aspect-square grid-cols-5 content-center gap-1 rounded-xl p-1.5 sm:gap-1.5 sm:rounded-2xl sm:p-2.5" style={{ background: "var(--board)" }}>
          {PREVIEW_WORDLE.flatMap((row, r) =>
            [...row].map((mark, i) => (
              <span
                key={`${r}${i}`}
                className="aspect-square rounded-md transition-transform duration-300 group-hover:scale-95 sm:rounded-lg"
                style={{
                  background: mark === "g" ? "var(--t512)" : mark === "y" ? "var(--t128)" : "var(--cell)",
                  transitionDelay: `${i * 25}ms`,
                }}
              />
            )),
          )}
        </div>
    ),
  },
  {
    id: "tictactoe",
    group: "friends",
    href: "/3-en-raya",
    preview: (
        <div aria-hidden className="grid grid-cols-3 gap-1 rounded-xl p-1 sm:gap-1.5 sm:rounded-2xl sm:p-1.5" style={{ background: "var(--board)" }}>
          {PREVIEW_TTT.map((mark, i) => (
            <span
              key={i}
              className="display grid aspect-square place-items-center rounded-lg text-2xl font-bold sm:text-5xl transition-transform duration-300 group-hover:scale-95"
              style={{
                background: "var(--cell)",
                color: mark === "×" ? "var(--mark-x)" : "var(--mark-o)",
                transitionDelay: `${(i % 3) * 25}ms`,
              }}
            >
              {mark}
            </span>
          ))}
        </div>
    ),
  },
  {
    id: "connect4",
    group: "friends",
    href: "/4-en-raya",
    preview: (
        <div aria-hidden className="grid aspect-square grid-cols-5 content-end gap-1 rounded-xl p-1.5 sm:gap-1.5 sm:rounded-2xl sm:p-2.5" style={{ background: "var(--board)" }}>
          {PREVIEW_C4.flatMap((row, r) =>
            [...row].map((mark, i) => (
              <span
                key={`${r}${i}`}
                className="aspect-square rounded-full transition-transform duration-300 group-hover:translate-y-0.5"
                style={{
                  background: mark === "x" ? "var(--mark-x)" : mark === "o" ? "var(--mark-o)" : "var(--cell)",
                  transitionDelay: `${i * 25}ms`,
                }}
              />
            )),
          )}
        </div>
    ),
  },
  {
    id: "battleship",
    group: "friends",
    href: "/hundir-la-flota",
    preview: (
        <div aria-hidden className="grid aspect-square grid-cols-5 gap-1 rounded-xl p-1.5 sm:gap-1.5 sm:rounded-2xl sm:p-2.5" style={{ background: "var(--board)" }}>
          {PREVIEW_SEA.flatMap((row, r) =>
            [...row].map((kind, i) => (
              <span
                key={`${r}${i}`}
                className="grid aspect-square place-items-center rounded-md transition-transform duration-300 group-hover:scale-95 sm:rounded-lg"
                style={{
                  background: kind === "s" ? "var(--t4)" : kind === "h" ? "var(--mark-x)" : "var(--cell)",
                  transitionDelay: `${i * 25}ms`,
                }}
              >
                {kind === "m" && <span className="size-1.5 rounded-full sm:size-2" style={{ background: "var(--mark-o)" }} />}
              </span>
            )),
          )}
        </div>
    ),
  },
  {
    id: "rps",
    group: "friends",
    href: "/piedra-papel-tijera",
    preview: (
        <div aria-hidden className="grid aspect-[4/3] grid-cols-3 place-items-center gap-1 rounded-xl p-1 sm:aspect-square sm:gap-1.5 sm:rounded-2xl sm:p-1.5" style={{ background: "var(--board)" }}>
          {["rock-x", "paper-o", "scissors-x", "lizard-o", "spock-x", "rock-o"].map((hand, i) => (
            <span
              key={i}
              className="grid size-full place-items-center rounded-md transition-transform duration-300 group-hover:scale-95 sm:rounded-lg"
              style={{ background: "var(--cell)", transitionDelay: `${(i % 3) * 25}ms` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/rps/${hand}.svg`} alt="" className="size-[80%]" />
            </span>
          ))}
        </div>
    ),
  },
  {
    id: "pong",
    group: "friends",
    href: "/pong",
    preview: (
        <div aria-hidden className="relative aspect-square overflow-hidden rounded-xl sm:rounded-2xl" style={{ background: "var(--board)" }}>
          <span className="absolute top-[12%] left-[38%] h-[5%] w-[30%] rounded-full" style={{ background: "var(--mark-o)" }} />
          <span className="absolute top-1/2 right-0 left-0 border-t-2 border-dashed" style={{ borderColor: "var(--cell)" }} />
          <span className="absolute top-[30%] left-[58%] size-[9%] rounded-full bg-ink transition-transform duration-500 group-hover:translate-x-[-120%] group-hover:translate-y-[220%]" />
          <span className="absolute bottom-[12%] left-[22%] h-[5%] w-[30%] rounded-full" style={{ background: "var(--mark-x)" }} />
        </div>
    ),
  },
  {
    id: "tron",
    group: "friends",
    href: "/tron",
    preview: (
        <div aria-hidden className="relative aspect-square overflow-hidden rounded-xl sm:rounded-2xl" style={{ background: "var(--board)" }}>
          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
            <path d="M12 70 H45 V30 H70" fill="none" stroke="var(--mark-x)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M88 30 H80 V78 H55 V48" fill="none" stroke="var(--mark-o)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="70" cy="30" r="5.5" fill="var(--mark-x)" />
            <circle cx="55" cy="48" r="5.5" fill="var(--mark-o)" />
          </svg>
        </div>
    ),
  },
  {
    id: "chess",
    group: "friends",
    href: "/ajedrez",
    preview: (
      <div aria-hidden className="grid aspect-square grid-cols-4 gap-1 rounded-xl p-1 sm:gap-1.5 sm:rounded-2xl sm:p-1.5" style={{ background: "var(--board)" }}>
        {PREVIEW_CHESS.map((piece, i) => (
          <span
            key={i}
            className="grid aspect-square place-items-center rounded-md sm:rounded-lg"
            style={{ background: ((i % 4) + Math.floor(i / 4)) % 2 === 1 ? "var(--chess-dark)" : "var(--chess-light)" }}
          >
            {piece && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/chess/${piece}.svg`} alt="" className="size-[80%] transition-transform duration-300 group-hover:-translate-y-0.5" style={{ transitionDelay: `${i * 20}ms` }} />
            )}
          </span>
        ))}
      </div>
    ),
  },
  {
    id: "reversi",
    group: "friends",
    href: "/reversi",
    preview: (
      <div aria-hidden className="grid aspect-square grid-cols-4 gap-1 rounded-xl p-1 sm:gap-1.5 sm:rounded-2xl sm:p-1.5" style={{ background: "var(--board)" }}>
        {PREVIEW_REVERSI.flatMap((row, r) =>
          [...row].map((piece, i) => (
            <span key={`${r}${i}`} className="grid aspect-square place-items-center rounded-md sm:rounded-lg" style={{ background: "var(--cell)" }}>
              {piece !== "." && (
                <span
                  className={`size-[78%] rounded-full shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] ${r === 2 && i === 2 ? "transition-transform duration-500 group-hover:[transform:rotateY(180deg)]" : ""}`}
                  style={{ background: piece === "x" ? "var(--mark-x)" : "var(--mark-o)" }}
                />
              )}
            </span>
          )),
        )}
      </div>
    ),
  },
  {
    id: "dots",
    group: "friends",
    href: "/puntos-y-cajas",
    preview: (
      <div aria-hidden className="relative aspect-square overflow-hidden rounded-xl sm:rounded-2xl" style={{ background: "var(--board)" }}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
          <rect x="16" y="16" width="34" height="34" rx="3" fill="var(--mark-x)" opacity="0.3" />
          <rect x="50" y="50" width="34" height="34" rx="3" fill="var(--mark-o)" opacity="0.3" />
          <g strokeWidth="5" strokeLinecap="round">
            <path d="M16 16H50V50H16Z M50 16H84" stroke="var(--mark-x)" fill="none" />
            <path d="M50 50H84V84H50Z M16 84V50" stroke="var(--mark-o)" fill="none" />
            <path d="M84 16V50" stroke="var(--mark-x)" className="opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </g>
          <g fill="var(--ink)">
            {[16, 50, 84].flatMap((y) => [16, 50, 84].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="4.5" />))}
          </g>
        </svg>
      </div>
    ),
  },
  {
    id: "typing",
    group: "friends",
    href: "/carrera-de-tecleo",
    preview: (
      <div aria-hidden className="flex aspect-square flex-col justify-between gap-2 rounded-xl p-2.5 sm:rounded-2xl sm:p-4" style={{ background: "var(--board)" }}>
        <div className="flex flex-col gap-1.5 sm:gap-2">
          {PREVIEW_TYPING.lines.map((line, r) => (
            <div key={r} className="flex gap-1">
              {line.map((width, i) => {
                const index = PREVIEW_TYPING.lines.slice(0, r).reduce((sum, l) => sum + l.length, 0) + i;
                return (
                  <span
                    key={i}
                    className="h-2 rounded-full sm:h-2.5"
                    style={{ width: `${width}%`, background: index < PREVIEW_TYPING.typed ? "var(--ink)" : "var(--cell)" }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="h-2 w-[70%] rounded-full transition-[width] duration-500 group-hover:w-[92%] sm:h-2.5" style={{ background: "var(--mark-x)" }} />
          <span className="h-2 w-[52%] rounded-full transition-[width] duration-500 group-hover:w-[64%] sm:h-2.5" style={{ background: "var(--mark-o)" }} />
        </div>
      </div>
    ),
  },
];

/**
 * Tarjetas de los juegos. `stats` añade debajo una línea con tus datos
 * (récord, puesto, partidas en juego) cuando hay sesión.
 *
 * Con `pinned` (solo con sesión) cada tarjeta lleva una chincheta, y los
 * juegos fijados salen primero, en "Tus juegos", en el orden en que se
 * fijaron. El resto va en dos grupos: en solitario y contra amigos. En el
 * móvil cada grupo va en fila con scroll horizontal (asoma la siguiente para
 * que se vea que hay más); desde `sm`, en cuadrícula.
 */
export async function GameCards({ stats = {}, pinned }: { stats?: Partial<Record<GameId, ReactNode>>; pinned?: readonly string[] }) {
  const m = await getMessages();
  const favourites = (pinned ?? []).flatMap((id) => GAMES.find((game) => game.id === id) ?? []);
  const rest = GAMES.filter((game) => !favourites.includes(game));
  const card = (game: Game) => (
    <li key={game.id} className={ITEM}>
      <GameCard
        game={game}
        texts={m.gameCards[game.id]}
        stats={stats[game.id]}
        pinned={pinned ? favourites.includes(game) : undefined}
        beta={game.beta && m.gameCards.beta}
      />
    </li>
  );

  return (
    <div className="flex flex-col gap-10">
      {favourites.length > 0 && (
        <GameSection title={m.gameCards.pinnedTitle} description={m.gameCards.pinnedHint}>
          {favourites.map(card)}
        </GameSection>
      )}
      {rest.some((game) => game.group === "solo") && (
        <GameSection title={m.gameCards.soloTitle} description={m.gameCards.soloHint}>
          {rest.filter((game) => game.group === "solo").map(card)}
        </GameSection>
      )}
      {rest.some((game) => game.group === "friends") && (
        <GameSection title={m.gameCards.friendsTitle} description={m.gameCards.friendsHint}>
          {rest.filter((game) => game.group === "friends").map(card)}
        </GameSection>
      )}
    </div>
  );
}

function GameSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mb-4 text-sm text-muted">{description}</p>
      <DragScrollList className="no-scrollbar cursor-grab active:cursor-grabbing sm:cursor-auto -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:p-0 lg:grid-cols-3">
        {children}
      </DragScrollList>
    </section>
  );
}

/**
 * `pinned` undefined: sin chincheta (sin sesión). El enlace cubre toda la
 * tarjeta (con ::after) y la chincheta queda por encima, junto al título.
 * En el móvil, apaisada (dibujo a la izquierda, nombre a la derecha y tus
 * datos debajo); desde `sm`, en vertical.
 */
function GameCard({
  game,
  texts,
  stats,
  pinned,
  beta,
}: {
  game: Game;
  texts: { title: string; subtitle: string };
  stats?: ReactNode;
  pinned?: boolean;
  /** Etiqueta de juego en pruebas. */
  beta?: string;
}) {
  return (
    <div className="group relative grid h-full grid-cols-[6rem_minmax(0,1fr)] grid-rows-[auto_1fr] gap-x-3.5 gap-y-3 rounded-3xl bg-surface p-3.5 shadow-soft transition-shadow hover:shadow-lift sm:flex sm:flex-col sm:gap-5 sm:p-5">
      <div className="self-center sm:self-auto">{game.preview}</div>
      <div className="flex items-start justify-between gap-2 self-center sm:self-auto">
        <div className="min-w-0">
          <Link href={game.href} className="display block text-2xl font-bold after:absolute after:inset-0 after:rounded-3xl sm:text-3xl">
            {texts.title}
          </Link>
          <p className="text-xs text-muted sm:text-sm">{texts.subtitle}</p>
          {beta && <span className="mt-1.5 inline-block rounded-full bg-line px-2 py-0.5 text-[0.7rem] font-semibold text-muted">{beta}</span>}
        </div>
        {pinned !== undefined && <PinButton game={game.id} title={texts.title} pinned={pinned} />}
      </div>
      {stats && <div className="col-span-2 self-end border-t border-line pt-2.5 text-xs sm:mt-auto sm:self-stretch sm:pt-3 sm:text-sm">{stats}</div>}
    </div>
  );
}
