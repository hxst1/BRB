import Link from "next/link";
import { DragScrollList } from "@/components/drag-scroll";
import type { CSSProperties, ReactNode } from "react";

/** Tablero en miniatura para la tarjeta del 2048 (decorativo). */
const PREVIEW_2048 = [2, 0, 8, 0, 0, 16, 64, 4, 0, 4, 128, 32, 2, 8, 512, 2048];
const PREVIEW_TTT = ["×", "", "○", "", "×", "", "○", "", ""];
/** Snake en miniatura (5 × 5): cuerpo de la cola a la cabeza y la manzana. */
const PREVIEW_SNAKE = { body: [20, 15, 16, 17, 12, 7, 8], food: 4 };

const ITEM = "w-44 shrink-0 snap-start sm:w-auto";

/**
 * Tarjetas de los juegos. `stats` añade debajo una línea con tus datos
 * (récord, puesto, partidas en juego) cuando hay sesión.
 *
 * Dos grupos: en solitario y contra amigos. En el móvil cada grupo va en fila
 * con scroll horizontal (asoma la siguiente para que se vea que hay más);
 * desde `sm`, en cuadrícula.
 */
export function GameCards({
  stats2048,
  statsSnake,
  statsTicTacToe,
  statsRps,
  statsPong,
}: {
  stats2048?: ReactNode;
  statsSnake?: ReactNode;
  statsTicTacToe?: ReactNode;
  statsRps?: ReactNode;
  statsPong?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-10">
      <GameSection title="En solitario" description="Cuando quieras, contra el ranking.">
        <li className={ITEM}>
          <GameCard href="/2048" title="2048" subtitle="Tú solo contra el ranking" stats={stats2048}>
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
          </GameCard>
        </li>
        <li className={ITEM}>
          <GameCard href="/snake" title="Snake" subtitle="Come sin chocar, cada vez más rápido" stats={statsSnake}>
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
          </GameCard>
        </li>
      </GameSection>
      <GameSection title="Contra tus amigos" description="Rétalos y jugad a vuestro ritmo.">
        <li className={ITEM}>
          <GameCard href="/3-en-raya" title="3 en raya" subtitle="Por turnos, cada uno cuando puede" stats={statsTicTacToe}>
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
          </GameCard>
        </li>
        <li className={ITEM}>
          <GameCard href="/piedra-papel-tijera" title="Piedra, papel o tijera" subtitle="Al mejor de 3, con lagarto y Spock" stats={statsRps}>
            <div aria-hidden className="grid aspect-[4/3] grid-cols-3 place-items-center gap-1 rounded-xl p-1 sm:aspect-square sm:gap-1.5 sm:rounded-2xl sm:p-1.5" style={{ background: "var(--board)" }}>
              {["🪨", "📄", "✂️", "🦎", "🖖", "🪨"].map((emoji, i) => (
                <span
                  key={i}
                  className="grid size-full place-items-center rounded-md text-2xl transition-transform duration-300 group-hover:scale-95 sm:rounded-lg sm:text-4xl"
                  style={{ background: "var(--cell)", transitionDelay: `${(i % 3) * 25}ms` }}
                >
                  {emoji}
                </span>
              ))}
            </div>
          </GameCard>
        </li>
        <li className={ITEM}>
          <GameCard href="/pong" title="Pong" subtitle="En directo, los dos a la vez" stats={statsPong}>
            <div aria-hidden className="relative aspect-square overflow-hidden rounded-xl sm:rounded-2xl" style={{ background: "var(--board)" }}>
              <span className="absolute top-[12%] left-[38%] h-[5%] w-[30%] rounded-full" style={{ background: "var(--mark-o)" }} />
              <span className="absolute top-1/2 right-0 left-0 border-t-2 border-dashed" style={{ borderColor: "var(--cell)" }} />
              <span className="absolute top-[30%] left-[58%] size-[9%] rounded-full bg-ink transition-transform duration-500 group-hover:translate-x-[-120%] group-hover:translate-y-[220%]" />
              <span className="absolute bottom-[12%] left-[22%] h-[5%] w-[30%] rounded-full" style={{ background: "var(--mark-x)" }} />
            </div>
          </GameCard>
        </li>
      </GameSection>
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

function GameCard({
  href,
  title,
  subtitle,
  stats,
  children,
}: {
  href: string;
  title: string;
  subtitle: string;
  stats?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col gap-3 rounded-3xl bg-surface p-3.5 shadow-soft transition-shadow hover:shadow-lift sm:gap-5 sm:p-5"
    >
      {children}
      <div>
        <p className="display text-2xl font-bold sm:text-3xl">{title}</p>
        <p className="text-xs text-muted sm:text-sm">{subtitle}</p>
      </div>
      {stats && <div className="mt-auto border-t border-line pt-2.5 text-xs sm:pt-3 sm:text-sm">{stats}</div>}
    </Link>
  );
}
