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
        <li className="flex flex-col gap-5 rounded-3xl border border-dashed border-line p-5">
          <div aria-hidden className="grid grid-cols-3 gap-1.5 p-1.5 text-muted/50">
            {TIC_TAC_TOE.map((mark, i) => (
              <span key={i} className="display grid aspect-square place-items-center rounded-lg bg-line/40 text-5xl font-bold">
                {mark}
              </span>
            ))}
          </div>
          <p className="display mt-auto text-3xl font-bold text-muted">3 en raya</p>
          <p className="text-sm text-muted">Contra tus amigos. Muy pronto.</p>
        </li>
      </ul>
    </main>
  );
}
