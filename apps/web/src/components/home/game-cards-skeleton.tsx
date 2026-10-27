"use client";

import { Bone, SessionHint, TextLine } from "@/components/skeleton";
import { useMessages } from "@/lib/i18n/client";

/** Cuántas tarjetas hay en cada grupo (game-cards.tsx). */
const GROUPS = [
  { id: "solo", cards: 8 },
  { id: "friends", cards: 10 },
] as const;

/**
 * Las tarjetas de los juegos (game-cards) mientras cargan: los mismos grupos
 * con sus títulos, y cada tarjeta con su dibujo, nombre y, con sesión, la
 * línea de tus datos. En el móvil, en fila deslizable; desde `sm`, en cuadrícula.
 */
export function GameCardsSkeleton({ stats = false }: { stats?: boolean }) {
  const m = useMessages();
  return (
    <div aria-hidden className="flex flex-col gap-10">
      {stats && <SessionHint />}
      {GROUPS.map((group) => (
        <div key={group.id}>
          <p className="text-xl font-semibold">{group.id === "solo" ? m.gameCards.soloTitle : m.gameCards.friendsTitle}</p>
          <p className="mb-4 text-sm text-muted">{group.id === "solo" ? m.gameCards.soloHint : m.gameCards.friendsHint}</p>
          <ul className="no-scrollbar -mx-4 flex gap-3 overflow-hidden px-4 pt-1 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:p-0 lg:grid-cols-3">
            {Array.from({ length: group.cards }, (_, i) => (
              <li key={i} className="w-[clamp(16rem,78%,20rem)] shrink-0 sm:w-auto">
                <GameCardSkeleton stats={stats} lines={group.id === "solo" ? 2 : 1} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** `lines`: líneas de tus datos (récord y puesto en los de solitario; partidas en los de amigos). */
function GameCardSkeleton({ stats, lines }: { stats: boolean; lines: number }) {
  return (
    <div className="grid h-full grid-cols-[6rem_minmax(0,1fr)] grid-rows-[auto_1fr] gap-x-3.5 gap-y-3 rounded-3xl bg-surface p-3.5 shadow-soft sm:flex sm:flex-col sm:gap-5 sm:p-5">
      <Bone className="aspect-square w-full rounded-xl sm:rounded-2xl" />
      <div className="flex flex-col self-center sm:self-auto">
        <TextLine className="display w-24 text-2xl sm:w-32 sm:text-3xl" />
        <TextLine className="w-full max-w-40 text-xs sm:text-sm" />
        <TextLine className="w-2/3 text-xs sm:hidden" />
      </div>
      {/* Tus datos: solo con sesión (signed-in, ver lib/session-hint.ts) si no se sabe aún. */}
      {stats && (
        <div className="col-span-2 self-end border-t border-line pt-2.5 text-xs signed-out:hidden sm:mt-auto sm:self-stretch sm:pt-3 sm:text-sm">
          <TextLine className="w-3/5" />
          {lines > 1 && <TextLine className="w-4/5" />}
        </div>
      )}
    </div>
  );
}
