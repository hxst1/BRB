import Link from "next/link";
import { replay } from "@repo/games/tictactoe";
import type { Json, Match } from "@repo/db";
import { Avatar } from "@/components/avatar";
import { LevelBar } from "@/components/level-bar";
import { formatNumber } from "@/lib/format";
import { matchGame, matchHref } from "@/lib/games";
import { MATCH_WITH_PLAYERS, PLAYER_COLUMNS } from "@/lib/queries";
import type { Viewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { GameCards } from "./game-cards";

type Person = { id: string; username: string; avatar_seed: number; avatar_parts: Json };
type Pending = { key: string; href: string; person: Person; text: string; urgent?: boolean };
type GameTally = { myTurn: number; invites: number; waiting: number };

/** ¿Le toca al usuario? 3 en raya por movimientos; piedra, papel o tijera si aún no ha elegido. */
function myTurnIn(match: Match, viewerId: string, chosen: ReadonlySet<string>): boolean {
  if (match.game === "tictactoe") return replay(match.moves)?.turn === (match.player_x === viewerId ? "x" : "o");
  return !chosen.has(match.id);
}

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

  // Elecciones ya hechas en la ronda en curso de piedra, papel o tijera.
  const rpsActive = (matches ?? []).filter((m) => m.status === "active" && m.game !== "tictactoe");
  const { data: choices } = rpsActive.length
    ? await supabase.from("match_choices").select("match_id, round").in("match_id", rpsActive.map((m) => m.id))
    : { data: [] };
  const roundOf = new Map(rpsActive.map((m) => [m.id, m.moves.length / 2]));
  const chosen = new Set((choices ?? []).filter((c) => roundOf.get(c.match_id) === c.round).map((c) => c.match_id));

  const pending: Pending[] = [];
  const tally: Record<"tictactoe" | "rps", GameTally> = {
    tictactoe: { myTurn: 0, invites: 0, waiting: 0 },
    rps: { myTurn: 0, invites: 0, waiting: 0 },
  };
  for (const match of matches ?? []) {
    const rival = match.player_x === viewer.id ? match.o : match.x;
    const name = matchGame(match.game).name;
    const counts = tally[match.game === "tictactoe" ? "tictactoe" : "rps"];
    if (match.status === "pending") {
      if (match.created_by !== viewer.id) {
        counts.invites++;
        pending.push({ key: match.id, href: matchHref(match), person: rival, text: `${rival.username} te reta: ${name.toLowerCase()}` });
      } else counts.waiting++;
    } else if (myTurnIn(match, viewer.id, chosen)) {
      counts.myTurn++;
      pending.push({ key: match.id, href: matchHref(match), person: rival, text: `Te toca contra ${rival.username} (${name.toLowerCase()})`, urgent: true });
    } else counts.waiting++;
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
      href: "/amigos",
      person: request.requester,
      text: `${request.requester.username} te ha enviado una solicitud de amistad`,
    });
  }

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

      <div className="mt-14">
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
          statsTicTacToe={<MatchStats counts={tally.tictactoe} />}
          statsRps={<MatchStats counts={tally.rps} />}
        />
      </div>
    </>
  );
}

function MatchStats({ counts }: { counts: GameTally }) {
  if (counts.myTurn > 0) {
    return <strong>{counts.myTurn === 1 ? "Te toca en 1 partida" : `Te toca en ${counts.myTurn} partidas`}</strong>;
  }
  if (counts.invites > 0) {
    return <strong>{counts.invites === 1 ? "Tienes 1 reto sin responder" : `Tienes ${counts.invites} retos sin responder`}</strong>;
  }
  if (counts.waiting > 0) {
    return (
      <span className="text-muted">
        {counts.waiting === 1 ? "1 partida esperando al rival" : `${counts.waiting} partidas esperando al rival`}
      </span>
    );
  }
  return <span className="text-muted">Ninguna partida en juego. Reta a alguien.</span>;
}
