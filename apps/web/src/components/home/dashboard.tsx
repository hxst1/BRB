import Link from "next/link";
import { replay } from "@repo/games/tictactoe";
import type { Json } from "@repo/db";
import { Avatar } from "@/components/avatar";
import { LevelBar } from "@/components/level-bar";
import { formatNumber } from "@/lib/format";
import { MATCH_WITH_PLAYERS, PLAYER_COLUMNS } from "@/lib/queries";
import type { Viewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { GameCards } from "./game-cards";

type Person = { id: string; username: string; avatar_seed: number; avatar_parts: Json };
type Pending = { key: string; href: string; person: Person; text: string; urgent?: boolean };

export async function Dashboard({ viewer }: { viewer: Viewer }) {
  const supabase = await createClient();
  const [{ data: matches }, { data: requests }, { data: standing }, { data: challenges }] = await Promise.all([
    supabase
      .from("matches")
      .select(MATCH_WITH_PLAYERS)
      .in("status", ["pending", "active"])
      .order("updated_at", { ascending: false }),
    supabase
      .from("friendships")
      .select(`id, requester:profiles!friendships_requester_id_fkey(${PLAYER_COLUMNS})`)
      .eq("status", "pending")
      .eq("addressee_id", viewer.id),
    supabase.rpc("get_my_standing", { game: "2048" }).maybeSingle(),
    supabase.rpc("get_my_challenges", { max_rows: 20 }),
  ]);

  const pending: Pending[] = [];
  let waiting = 0;
  let invites = 0;
  for (const match of matches ?? []) {
    const myMark = match.player_x === viewer.id ? "x" : "o";
    const rival = myMark === "x" ? match.o : match.x;
    if (match.status === "pending") {
      if (match.created_by !== viewer.id) {
        invites++;
        pending.push({ key: match.id, href: `/3-en-raya/${match.id}`, person: rival, text: `${rival.username} te reta al 3 en raya` });
      } else waiting++;
    } else if (replay(match.moves)?.turn === myMark) {
      pending.push({ key: match.id, href: `/3-en-raya/${match.id}`, person: rival, text: `Te toca contra ${rival.username}`, urgent: true });
    } else waiting++;
  }
  for (const challenge of challenges ?? []) {
    if (!challenge.incoming || challenge.status !== "pending") continue;
    pending.push({
      key: challenge.id,
      href: `/2048?reto=${challenge.id}`,
      person: {
        id: challenge.other_id,
        username: challenge.other_username,
        avatar_seed: challenge.other_avatar_seed,
        avatar_parts: challenge.other_avatar_parts,
      },
      text: `${challenge.other_username} te reta al 2048: supera ${formatNumber(challenge.target_score)}`,
    });
  }
  for (const request of requests ?? []) {
    pending.push({
      key: request.id,
      href: "/perfil",
      person: request.requester,
      text: `${request.requester.username} te ha enviado una solicitud de amistad`,
    });
  }
  const myTurn = pending.filter((item) => item.urgent).length;

  return (
    <>
      <section className="flex flex-wrap items-center gap-6">
        <Link href="/perfil" className="grid size-28 shrink-0 place-items-center rounded-[1.75rem] bg-surface shadow-soft">
          <Avatar seed={viewer.avatar_seed} parts={viewer.avatar_parts} size={96} mood="happy" label="Tu monstruo" />
        </Link>
        <div className="flex min-w-60 flex-1 flex-col gap-4">
          <h1 className="display text-5xl font-bold sm:text-6xl">Hola, {viewer.username}</h1>
          <LevelBar xp={viewer.xp} className="max-w-sm" />
        </div>
      </section>

      <section aria-labelledby="pending-title" className="mt-14 max-w-xl">
        <h2 id="pending-title" className="mb-2 text-xl font-semibold">
          Pendiente
        </h2>
        {pending.length === 0 ? (
          <p className="text-muted">Nada pendiente. Buen momento para echar una partida.</p>
        ) : (
          <ul className="flex flex-col">
            {pending.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="flex items-center gap-3 border-b border-line py-2.5 hover:bg-surface/60">
                  <Avatar seed={item.person.avatar_seed} parts={item.person.avatar_parts} size={36} />
                  <span className={`min-w-0 flex-1 ${item.urgent ? "font-semibold" : ""}`}>{item.text}</span>
                  {item.urgent && <span className="rounded-full bg-ink px-3 py-1 text-sm font-medium text-bg">Jugar</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <h2 className="mt-14 mb-5 text-xl font-semibold">Juegos</h2>
      <GameCards
        stats2048={
          standing?.best_score != null ? (
            <span className="flex flex-col gap-0.5">
              <span>
                Tu récord: <strong className="tabular">{formatNumber(standing.best_score)}</strong>
              </span>
              <span className="text-muted">
                {standing.global_rank}º de {standing.global_players} en el mundo
                {standing.friends_players > 1 && `, ${standing.friends_rank}º entre tus amigos`}
              </span>
            </span>
          ) : (
            <span className="text-muted">Aún no tienes puntuación. Juega una partida.</span>
          )
        }
        statsTicTacToe={
          myTurn > 0 ? (
            <strong>{myTurn === 1 ? "Te toca en 1 partida" : `Te toca en ${myTurn} partidas`}</strong>
          ) : invites > 0 ? (
            <strong>{invites === 1 ? "Tienes 1 reto sin responder" : `Tienes ${invites} retos sin responder`}</strong>
          ) : waiting > 0 ? (
            <span className="text-muted">{waiting === 1 ? "1 partida esperando al rival" : `${waiting} partidas esperando al rival`}</span>
          ) : (
            <span className="text-muted">Ninguna partida en juego. Reta a alguien.</span>
          )
        }
      />
    </>
  );
}
