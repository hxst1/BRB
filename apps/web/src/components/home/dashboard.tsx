import Link from "next/link";
import type { Functions, Match } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";
import { DailyCard } from "@/components/daily/daily-summary";
import { LevelBar } from "@/components/level-bar";
import { battleshipMyTurn, isTurnBased, turnOf } from "@/components/tictactoe/data";
import { CHALLENGE_EXPIRY_MS, matchGameKey, matchHref } from "@/lib/games";
import { getLocale, getMessages } from "@/lib/i18n/server";
import type { Messages } from "@/lib/i18n";
import { MATCH_WITH_PLAYERS, PLAYER_COLUMNS } from "@/lib/queries";
import type { Viewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { FirstSteps, type FirstStep } from "./first-steps";
import { GameCards } from "./game-cards";
import { NowSection, type NowItem, type WaitingItem } from "./now";

type GameTally = { myTurn: number; invites: number; waiting: number };

/** Los primeros pasos solo salen a las cuentas nuevas (las de antes ya saben moverse). */
const FIRST_STEPS_DAYS = 14;

/**
 * ¿Le toca al usuario? En los juegos por turnos, por los movimientos; piedra,
 * papel o tijera y hundir la flota, si no está en `waiting` (ver fetchChosen).
 */
function myTurnIn(match: Match, viewerId: string, waiting: ReadonlySet<string>): boolean {
  if (isTurnBased(match.game)) return turnOf(match) === (match.player_x === viewerId ? "x" : "o");
  if (match.game === "pong" || match.game === "tron" || match.game === "typing") return true;
  return !waiting.has(match.id);
}

export async function Dashboard({ viewer }: { viewer: Viewer }) {
  const supabase = await createClient();
  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  const { ago, number, time, timeLeft } = m.format;
  const [
    { data: matches },
    { data: requests },
    { data: standing },
    { data: snake },
    { data: lightsOut },
    { data: minesweeper },
    { data: sudoku },
    { data: solitaire },
    { data: queens },
    { data: challenges },
    { data: daily },
    { data: wordle },
    { data: battleship },
    { data: pins },
    { data: profile },
    { data: steps },
  ] =
    await Promise.all([
    supabase
      .from("matches")
      .select(MATCH_WITH_PLAYERS)
      .in("status", ["pending", "active"])
      .order("updated_at", { ascending: false }),
    supabase
      .from("friendships")
      .select(`id, created_at, requester:profiles!friendships_requester_id_fkey(${PLAYER_COLUMNS})`)
      .eq("status", "pending")
      .eq("addressee_id", viewer.id),
    supabase.rpc("get_my_standing", { game: "2048" }).maybeSingle(),
    supabase.rpc("get_my_standing", { game: "snake" }).maybeSingle(),
    supabase.rpc("get_my_standing", { game: "lightsout" }).maybeSingle(),
    supabase.rpc("get_my_standing", { game: "minesweeper-medium" }).maybeSingle(),
    supabase.rpc("get_my_standing", { game: "sudoku-medium" }).maybeSingle(),
    supabase.rpc("get_my_standing", { game: "solitaire" }).maybeSingle(),
    supabase.rpc("get_my_standing", { game: "queens-medium" }).maybeSingle(),
    supabase.rpc("get_my_challenges", { max_rows: 20 }),
    supabase.rpc("get_my_daily").maybeSingle(),
    supabase
      .from("wordle_games")
      .select("day, guesses, solved, finished_at")
      .eq("user_id", viewer.id)
      .eq("lang", locale)
      .order("day", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.rpc("get_battleship_status"),
    supabase.from("pinned_games").select("game").order("pinned_at"),
    supabase.from("profiles").select("first_steps_dismissed, created_at").eq("id", viewer.id).single(),
    // La misma regla que el logro "Primeros pasos".
    supabase.rpc("get_my_first_steps").maybeSingle(),
  ]);
  // Solo cuenta la partida de hoy (el día lo da el resumen del reto diario).
  const wordleToday = wordle && daily && wordle.day === daily.day ? wordle : null;

  // Elecciones ya hechas en la ronda en curso de piedra, papel o tijera.
  const rpsActive = (matches ?? []).filter((m) => m.status === "active" && (m.game === "rps" || m.game === "rpsls"));
  const { data: choices } = rpsActive.length
    ? await supabase.from("match_choices").select("match_id, round").in("match_id", rpsActive.map((m) => m.id))
    : { data: [] };
  const roundOf = new Map(rpsActive.map((m) => [m.id, m.moves.length / 2]));
  const chosen = new Set((choices ?? []).filter((c) => roundOf.get(c.match_id) === c.round).map((c) => c.match_id));
  // Hundir la flota: esperando a que el rival coloque o dispare.
  for (const status of battleship ?? []) {
    const match = matches?.find((m) => m.id === status.match_id);
    if (match && !battleshipMyTurn(match, viewer.id, status)) chosen.add(match.id);
  }

  // "Ahora": lo que te toca (primero), retos recibidos, retos al 2048 y solicitudes.
  const now: NowItem[] = [];
  const invites: NowItem[] = [];
  const waiting: WaitingItem[] = [];
  const expiresAt = (match: Match) => new Date(new Date(match.created_at).getTime() + CHALLENGE_EXPIRY_MS);
  const tally: Record<"tictactoe" | "connect4" | "battleship" | "rps" | "pong" | "tron" | "chess" | "reversi" | "dots" | "typing", GameTally> = {
    tictactoe: { myTurn: 0, invites: 0, waiting: 0 },
    connect4: { myTurn: 0, invites: 0, waiting: 0 },
    battleship: { myTurn: 0, invites: 0, waiting: 0 },
    tron: { myTurn: 0, invites: 0, waiting: 0 },
    chess: { myTurn: 0, invites: 0, waiting: 0 },
    reversi: { myTurn: 0, invites: 0, waiting: 0 },
    dots: { myTurn: 0, invites: 0, waiting: 0 },
    typing: { myTurn: 0, invites: 0, waiting: 0 },
    rps: { myTurn: 0, invites: 0, waiting: 0 },
    pong: { myTurn: 0, invites: 0, waiting: 0 },
  };
  for (const match of matches ?? []) {
    const rival = match.player_x === viewer.id ? match.o : match.x;
    const icon = matchGameKey(match.game);
    const name = m.matchGames[icon];
    const counts = tally[match.game === "rpsls" ? "rps" : (match.game as keyof typeof tally)] ?? tally.rps;
    if (match.status === "pending") {
      if (match.created_by !== viewer.id) {
        counts.invites++;
        invites.push({
          key: match.id,
          kind: "invite",
          id: match.id,
          href: matchHref(match),
          person: rival,
          icon,
          title: m.home.challengesYou(rival.username, name),
          detail: m.home.inviteDetail(capitalize(ago(match.created_at)), timeLeft(expiresAt(match))),
        });
      } else {
        counts.waiting++;
        waiting.push({
          key: match.id,
          href: matchHref(match),
          person: rival,
          icon,
          title: m.home.waitingTitle(rival.username, name),
          detail: m.home.expiresIn(timeLeft(expiresAt(match))),
        });
      }
    } else if (myTurnIn(match, viewer.id, chosen)) {
      counts.myTurn++;
      now.push({
        key: match.id,
        kind: "turn",
        id: match.id,
        href: matchHref(match),
        person: rival,
        icon,
        title: match.game === "pong" || match.game === "tron" ? m.home.liveAgainst(name, rival.username) : m.home.yourTurnAgainst(rival.username),
        detail: match.game === "pong" || match.game === "tron" ? m.home.liveJoin : `${name}, ${ago(match.updated_at)}`,
      });
    } else counts.waiting++;
  }
  now.push(...invites);
  for (const challenge of challenges ?? []) {
    if (!challenge.incoming || challenge.status !== "pending") continue;
    now.push({
      key: challenge.id,
      kind: "challenge",
      id: challenge.id,
      href: `/2048?reto=${challenge.id}`,
      person: {
        id: challenge.other_id,
        username: challenge.other_username,
        avatar_seed: challenge.other_avatar_seed,
        avatar_parts: challenge.other_avatar_parts,
      },
      icon: "2048",
      title: m.home.challenge2048(challenge.other_username),
      detail: m.home.challenge2048Detail(number(challenge.target_score), capitalize(ago(challenge.created_at))),
    });
  }
  for (const request of requests ?? []) {
    now.push({
      key: request.id,
      kind: "friend",
      id: request.id,
      href: "/amigos",
      person: request.requester,
      icon: "friend",
      title: m.home.wantsToBeFriends(request.requester.username),
      detail: capitalize(ago(request.created_at)),
    });
  }

  const firstSteps: FirstStep[] = [
    { id: "monster", done: !!steps?.monster },
    { id: "friend", done: !!steps?.friend },
    { id: "daily", done: !!steps?.daily },
  ];
  // Al completarlos desaparecen (y salta el aviso del logro); antes, solo con la X.
  const showFirstSteps =
    !!profile &&
    !!steps &&
    !profile.first_steps_dismissed &&
    isNewAccount(profile.created_at) &&
    firstSteps.some((step) => !step.done);

  return (
    <>
      <section className="flex flex-wrap items-center gap-6">
        <Link href="/perfil" className="grid size-28 shrink-0 place-items-center rounded-[1.75rem] bg-surface shadow-soft">
          <Avatar seed={viewer.avatar_seed} parts={viewer.avatar_parts} size={96} label={m.home.yourMonster} />
        </Link>
        <div className="flex min-w-60 flex-1 flex-col gap-4">
          <h1 className="display text-5xl font-bold sm:text-6xl">
            {m.home.hello(viewer.username)}
            {viewer.supporter_tier && (
              <span title={m.common.supporter} className="ml-2 align-top text-2xl" style={{ color: "var(--t256)" }}>
                ✦
              </span>
            )}
          </h1>
          <LevelBar xp={viewer.xp} className="max-w-sm" />
        </div>
      </section>

      {showFirstSteps && <FirstSteps viewerId={viewer.id} steps={firstSteps} />}

      <div className="mt-12">
        <NowSection items={now} waiting={waiting} />
      </div>

      {daily && (
        <div className="mt-12">
          <DailyCard summary={daily} />
        </div>
      )}

      <div className="mt-14">
        <GameCards
          pinned={(pins ?? []).map((pin) => pin.game)}
          stats={{
            "2048": <SoloStats m={m} standing={standing} />,
            snake: <SoloStats m={m} standing={snake} />,
            "lights-out": <SoloStats m={m} standing={lightsOut} unit={m.home.levels} />,
            minesweeper: <SoloStats m={m} standing={minesweeper} format={(ms) => m.home.onMedium(time(ms))} />,
            sudoku: <SoloStats m={m} standing={sudoku} format={(ms) => m.home.onMedium(time(ms))} />,
            solitaire: <SoloStats m={m} standing={solitaire} format={time} />,
            queens: <SoloStats m={m} standing={queens} format={(ms) => m.home.onMedium(time(ms))} />,
            wordle: wordleToday?.finished_at ? (
              <span>
                {m.home.today} <strong className="tabular">{wordleToday.solved ? wordleToday.guesses.length : "X"}/6</strong>
              </span>
            ) : wordleToday ? (
              <strong>{m.home.wordleHalfway}</strong>
            ) : (
              <span className="text-muted">{m.home.wordleNotYet}</span>
            ),
            tictactoe: <MatchStats m={m} counts={tally.tictactoe} />,
            connect4: <MatchStats m={m} counts={tally.connect4} />,
            battleship: <MatchStats m={m} counts={tally.battleship} />,
            tron: <MatchStats m={m} counts={tally.tron} />,
            chess: <MatchStats m={m} counts={tally.chess} />,
            reversi: <MatchStats m={m} counts={tally.reversi} />,
            dots: <MatchStats m={m} counts={tally.dots} />,
            typing: <MatchStats m={m} counts={tally.typing} />,
            rps: <MatchStats m={m} counts={tally.rps} />,
            pong: <MatchStats m={m} counts={tally.pong} />,
          }}
        />
      </div>
    </>
  );
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const isNewAccount = (createdAt: string) => new Date(createdAt).getTime() > Date.now() - FIRST_STEPS_DAYS * 24 * 60 * 60 * 1000;

/** Récord y puesto en un juego en solitario. */
function SoloStats({
  m,
  standing,
  unit,
  format = m.format.number,
}: {
  m: Messages;
  standing: Functions<"get_my_standing">["Returns"][number] | null;
  /** Unidad tras el récord (p. ej. niveles); sin ella, solo el número. */
  unit?: (score: number) => string;
  /** Si el récord es un tiempo, cómo mostrarlo. */
  format?: (score: number) => string;
}) {
  if (standing?.best_score == null) return <span className="text-muted">{m.home.noScore}</span>;
  return (
    <span className="flex flex-col gap-0.5">
      <span>
        {m.home.yourRecord} <strong className="tabular">{format(standing.best_score)}</strong>
        {unit && ` ${unit(standing.best_score)}`}
      </span>
      <span className="text-muted">
        {m.home.worldRank(standing.global_rank, standing.global_players)}
        {standing.friends_players > 1 && m.home.friendsRank(standing.friends_rank)}
      </span>
    </span>
  );
}

function MatchStats({ m, counts }: { m: Messages; counts: GameTally }) {
  if (counts.myTurn > 0) return <strong>{m.home.yourTurnIn(counts.myTurn)}</strong>;
  if (counts.invites > 0) return <strong>{m.home.unansweredInvites(counts.invites)}</strong>;
  if (counts.waiting > 0) return <span className="text-muted">{m.home.waitingRival(counts.waiting)}</span>;
  return <span className="text-muted">{m.home.noMatches}</span>;
}
