import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { DragScrollList } from "@/components/drag-scroll";
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
/** Wordle en miniatura: tres intentos hasta acertar. */
const PREVIEW_WORDLE = ["bybbb", "gbygb", "ggggg"];

/**
 * En el móvil, fila deslizable: cada tarjeta mide algo menos de la mitad del
 * ancho para que asome la siguiente y se vea que hay más juegos al lado.
 */
const ITEM = "w-[clamp(9.5rem,42%,11rem)] shrink-0 snap-start sm:w-auto";

export type GameId =
  | "2048"
  | "snake"
  | "lights-out"
  | "minesweeper"
  | "sudoku"
  | "wordle"
  | "tictactoe"
  | "connect4"
  | "battleship"
  | "rps"
  | "pong"
  | "tron"
  | "chess";

type Game = { id: GameId; group: "solo" | "friends"; href: string; preview: ReactNode };

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
      <GameCard game={game} texts={m.gameCards[game.id]} stats={stats[game.id]} pinned={pinned ? favourites.includes(game) : undefined} />
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
 */
function GameCard({ game, texts, stats, pinned }: { game: Game; texts: { title: string; subtitle: string }; stats?: ReactNode; pinned?: boolean }) {
  return (
    <div className="group relative flex h-full flex-col gap-3 rounded-3xl bg-surface p-3.5 shadow-soft transition-shadow hover:shadow-lift sm:gap-5 sm:p-5">
      {game.preview}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={game.href} className="display block text-2xl font-bold after:absolute after:inset-0 after:rounded-3xl sm:text-3xl">
            {texts.title}
          </Link>
          <p className="text-xs text-muted sm:text-sm">{texts.subtitle}</p>
        </div>
        {pinned !== undefined && <PinButton game={game.id} title={texts.title} pinned={pinned} />}
      </div>
      {stats && <div className="mt-auto border-t border-line pt-2.5 text-xs sm:pt-3 sm:text-sm">{stats}</div>}
    </div>
  );
}
