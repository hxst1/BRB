import Link from "next/link";
import type { CSSProperties } from "react";
import { brand } from "@repo/brand";

/** Tablero en miniatura para la tarjeta del 2048 (decorativo). */
const PREVIEW = [2, 0, 8, 0, 0, 16, 64, 4, 0, 4, 128, 32, 2, 8, 512, 2048];

const TIC_TAC_TOE = ["×", "", "○", "", "×", "", "○", "", ""];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16 sm:px-6">
      <h1 className="display max-w-xl text-6xl font-bold text-balance sm:text-8xl">{brand.tagline}</h1>
      <p className="mt-5 max-w-md text-lg text-muted">
        Partidas cortas para cuando necesitas desconectar cinco minutos. Compite en el ranking y reta a tus amigos.
      </p>

      <h2 className="mt-16 mb-5 text-xl font-semibold">Juegos</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li>
          <Link
            href="/2048"
            className="group flex flex-col gap-5 rounded-3xl bg-surface p-5 shadow-soft transition-shadow hover:shadow-lift"
          >
            <div className="grid grid-cols-4 gap-1.5 rounded-2xl p-1.5" style={{ background: "var(--board)" }}>
              {PREVIEW.map((value, i) => (
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
            <div>
              <p className="display text-3xl font-bold">2048</p>
              <p className="text-sm text-muted">Tú solo contra el ranking</p>
            </div>
          </Link>
        </li>
        <li>
          <Link
            href="/3-en-raya"
            className="group flex h-full flex-col gap-5 rounded-3xl bg-surface p-5 shadow-soft transition-shadow hover:shadow-lift"
          >
            <div aria-hidden className="grid grid-cols-3 gap-1.5 rounded-2xl p-1.5" style={{ background: "var(--board)" }}>
              {TIC_TAC_TOE.map((mark, i) => (
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
            <div className="mt-auto">
              <p className="display text-3xl font-bold">3 en raya</p>
              <p className="text-sm text-muted">Contra tus amigos, a tu ritmo</p>
            </div>
          </Link>
        </li>
      </ul>
    </main>
  );
}
