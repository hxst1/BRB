import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/** Tablero en miniatura para la tarjeta del 2048 (decorativo). */
const PREVIEW_2048 = [2, 0, 8, 0, 0, 16, 64, 4, 0, 4, 128, 32, 2, 8, 512, 2048];
const PREVIEW_TTT = ["×", "", "○", "", "×", "", "○", "", ""];

/**
 * Tarjetas de los juegos. `stats` añade debajo una línea con tus datos
 * (récord, puesto, partidas en juego) cuando hay sesión.
 */
export function GameCards({ stats2048, statsTicTacToe }: { stats2048?: ReactNode; statsTicTacToe?: ReactNode }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li>
        <GameCard href="/2048" title="2048" subtitle="Tú solo contra el ranking" stats={stats2048}>
          <div aria-hidden className="grid grid-cols-4 gap-1.5 rounded-2xl p-1.5" style={{ background: "var(--board)" }}>
            {PREVIEW_2048.map((value, i) => (
              <span
                key={i}
                className="aspect-square rounded-lg transition-transform duration-300 group-hover:scale-95"
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
      <li>
        <GameCard href="/3-en-raya" title="3 en raya" subtitle="Contra tus amigos, a tu ritmo" stats={statsTicTacToe}>
          <div aria-hidden className="grid grid-cols-3 gap-1.5 rounded-2xl p-1.5" style={{ background: "var(--board)" }}>
            {PREVIEW_TTT.map((mark, i) => (
              <span
                key={i}
                className="display grid aspect-square place-items-center rounded-lg text-5xl font-bold transition-transform duration-300 group-hover:scale-95"
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
    </ul>
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
      className="group flex h-full flex-col gap-5 rounded-3xl bg-surface p-5 shadow-soft transition-shadow hover:shadow-lift"
    >
      {children}
      <div>
        <p className="display text-3xl font-bold">{title}</p>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>
      {stats && <div className="mt-auto border-t border-line pt-3 text-sm">{stats}</div>}
    </Link>
  );
}
