"use client";

import { InlinePicto } from "@/components/picto";
import { Bone, SessionHint, TextLine, ToggleSkeleton } from "@/components/skeleton";
import { useMessages } from "@/lib/i18n/client";

/**
 * El ranking (ranking-board) mientras se sabe quién mira: los selectores como
 * salen al entrar (nivel, y con sesión "todos / amigos") y el podio con las filas.
 */
export function RankingSkeleton() {
  const m = useMessages();
  const t = m.rankingBoard;
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <SessionHint />
      <ToggleSkeleton
        className="grid auto-cols-fr grid-flow-col"
        item="px-3 py-2 text-sm text-center"
        options={[
          <>
            <InlinePicto name="star" className="mr-1.5" />
            {t.level}
          </>,
          <>
            <InlinePicto name="gamepad" className="mr-1.5" />
            {t.games}
          </>,
        ]}
      />
      <div className="flex items-center justify-between gap-2 signed-out:hidden">
        <ToggleSkeleton item="px-3 py-1 text-sm" options={[t.global, m.ranking.friends]} />
      </div>
      <RankingRowsSkeleton />
    </div>
  );
}

/** El podio y unas filas, mientras llegan los puestos. */
export function RankingRowsSkeleton() {
  const height: Record<number, string> = { 1: "h-28", 2: "h-20", 3: "h-14" };
  return (
    <>
      <div aria-hidden className="grid grid-cols-3 items-end gap-2 sm:gap-4">
        {[2, 1, 3].map((rank) => (
          <div key={rank} className="flex min-w-0 flex-col items-center gap-2">
            <Bone className={`rounded-full ${rank === 1 ? "size-[84px]" : "size-16"}`} />
            <div className="flex w-full min-w-0 flex-col items-center">
              <TextLine className="w-20 max-w-full" />
              <TextLine className="w-14 text-sm" />
              <TextLine className="w-10 text-xs" />
            </div>
            <Bone className={`w-full rounded-t-2xl rounded-b-none ${height[rank]}`} />
          </div>
        ))}
      </div>
      <ol aria-hidden className="flex flex-col">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="flex items-center gap-3 border-b border-line py-2.5">
            <TextLine className="w-8 pl-3 text-sm" />
            <Bone className="size-[34px] shrink-0 rounded-full" />
            <TextLine className="w-28 min-w-0 flex-1" />
            <span className="flex flex-col items-end">
              <TextLine className="w-16" />
              <TextLine className="w-12 text-xs" />
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
