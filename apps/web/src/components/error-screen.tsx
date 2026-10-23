import type { ReactNode } from "react";
import type { MonsterParts, Mood } from "@repo/avatars";
import { Avatar } from "@repo/ui/avatar";

/** Colores de ficha del 2048 para cada cifra del código (texto oscuro u claro según la ficha). */
const TILE: Record<string, { background: string; color: string }> = {
  "0": { background: "var(--t2048)", color: "#ffffff" },
  "4": { background: "var(--t128)", color: "#15171c" },
  "5": { background: "var(--t64)", color: "#ffffff" },
};

/**
 * Pantalla de error con la estética de la app: el código hecho de fichas del
 * 2048 que caen una a una, un monster y qué hacer ahora. La usan el 404 y el
 * error general.
 */
export function ErrorScreen({
  code,
  monster,
  mood,
  title,
  body,
  children,
  inline = false,
}: {
  code: string;
  monster: Partial<MonsterParts>;
  mood: Mood;
  title: string;
  body: string;
  /** Botones o enlaces. */
  children: ReactNode;
  /** Dentro de una página que ya tiene su <main> (p. ej. una partida que no existe). */
  inline?: boolean;
}) {
  const Wrapper = inline ? "section" : "main";
  return (
    <Wrapper
      className={`mx-auto flex w-full max-w-xl flex-col items-center justify-center gap-6 text-center ${inline ? "py-6" : "flex-1 px-4 pt-6 pb-24 sm:px-6"}`}
    >
      <div aria-hidden className="flex items-end gap-2.5 sm:gap-3">
        {[...code].map((digit, i) => (
          <span
            key={i}
            className="error-tile display grid size-20 place-items-center rounded-[22%] text-5xl font-bold shadow-soft sm:size-24 sm:text-6xl"
            style={{ ...(TILE[digit] ?? { background: "var(--cell)", color: "var(--ink)" }), animationDelay: `${i * 110}ms` }}
          >
            {digit}
          </span>
        ))}
      </div>
      <div className="error-monster -mt-2">
        <Avatar seed={7} parts={monster} size={120} mood={mood} />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="display text-4xl font-bold text-balance sm:text-5xl">{title}</h1>
        <p className="text-muted text-balance">{body}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">{children}</div>
    </Wrapper>
  );
}
