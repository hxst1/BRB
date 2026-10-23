import { timingSafeEqual } from "node:crypto";
import { decodeShot } from "@repo/games/battleship";
import { replay as replayRps, type Variant } from "@repo/games/rps";
import type { Tables } from "@repo/db";
import { matchGame, matchGameKey, matchHref } from "@/lib/games";
import type { Messages } from "@/lib/i18n";
import { sendPush, type PushMessage } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lo llama la base de datos (trigger con pg_net) cuando pasa algo que puede
 * merecer una notificación, y pg_cron a las 20:00 con las rachas a punto de
 * perderse. Decide a quién avisar y con qué texto.
 */

type Change =
  | { table: "messages"; type: "INSERT"; record: Tables<"messages"> }
  | { table: "friendships"; type: "INSERT"; record: Tables<"friendships"> }
  | { table: "matches"; type: "UPDATE"; record: Tables<"matches">; old_record: Tables<"matches"> }
  | { table: "streaks"; type: "REMINDER"; records: { user_id: string; streak_days: number }[] };

/** `message` redacta el aviso con los textos del idioma de quien lo recibe. */
type Notification = { userId: string; message: (m: Messages) => PushMessage };

/** Los retos pendientes caducan a los 3 días (un poco menos, por si el trabajo se adelanta). */
const EXPIRY_MS = 3 * 24 * 60 * 60 * 1000 - 5 * 60 * 1000;


function authorized(request: Request): boolean {
  const expected = process.env.PUSH_WEBHOOK_SECRET;
  const received = request.headers.get("x-push-secret");
  if (!expected || !received || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

async function usernames(ids: string[]): Promise<Record<string, string>> {
  const { data } = await createAdminClient().from("profiles").select("id, username").in("id", ids);
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.username]));
}

function truncate(text: string, max = 120): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

async function notificationsFor(change: Change): Promise<Notification[]> {
  if (change.table === "streaks") {
    return change.records.map((r) => ({
      userId: r.user_id,
      message: (m) => ({ title: m.push.streakTitle(r.streak_days), body: m.push.streakBody, url: "/reto-diario", tag: "streak" }),
    }));
  }

  if (change.table === "messages") {
    const msg = change.record;
    const names = await usernames([msg.sender_id]);
    return [
      {
        userId: msg.recipient_id,
        message: (m) => ({
          title: names[msg.sender_id] ?? m.push.someone,
          body: msg.kind === "sticker" ? m.push.sticker(msg.body) : truncate(msg.body),
          url: `/chat/${msg.sender_id}`,
          tag: `chat:${msg.sender_id}`,
        }),
      },
    ];
  }

  if (change.table === "friendships") {
    const f = change.record;
    if (f.status !== "pending") return [];
    const names = await usernames([f.requester_id]);
    return [
      {
        userId: f.addressee_id,
        message: (m) => ({
          title: m.push.friendTitle,
          body: m.push.friendBody(names[f.requester_id] ?? m.push.someone),
          url: "/amigos",
          tag: `friend:${f.requester_id}`,
        }),
      },
    ];
  }

  // Partidas
  const { record: match, old_record: old } = change;
  const names = await usernames([match.player_x, match.player_o]);
  const name = (m: Messages, id: string) => names[id] ?? m.push.rival;
  const other = (id: string) => (id === match.player_x ? match.player_o : match.player_x);
  const url = matchHref(match);
  const tag = `match:${match.id}`;
  const game = (m: Messages) => m.matchGames[matchGameKey(match.game)];
  const notify = (userId: string, title: (m: Messages) => string, body: (m: Messages) => string): Notification => ({
    userId,
    message: (m) => ({ title: title(m), body: body(m), url, tag }),
  });
  const resigned = (winner: string) =>
    notify(winner, (m) => m.push.finished, (m) => m.push.resigned(name(m, other(winner))));

  // El reto (pendiente) ya llega como mensaje del chat; aquí, sus respuestas.
  if (old.status === "pending" && match.status === "active") {
    return [notify(match.created_by, (m) => m.push.acceptedTitle, (m) => m.push.accepted(name(m, other(match.created_by)), game(m)))];
  }
  if (old.status === "pending" && match.status === "declined") {
    return [notify(match.created_by, (m) => m.push.declinedTitle, (m) => m.push.declined(name(m, other(match.created_by))))];
  }
  if (old.status === "pending" && match.status === "cancelled") {
    // Lo retira quien retó (no hace falta avisar) o caduca a los 3 días (ver expire_challenges).
    const expired = Date.now() - new Date(match.created_at).getTime() >= EXPIRY_MS;
    if (!expired) return [];
    return [
      {
        userId: match.created_by,
        message: (m) => ({
          title: m.push.expiredTitle,
          body: m.push.expired(name(m, other(match.created_by)), game(m)),
          url: matchGame(match.game).path,
          tag,
        }),
      },
    ];
  }

  if (match.game === "tictactoe" || match.game === "connect4") {
    // Quien acaba de mover no necesita aviso: se notifica al otro.
    const lastMover = match.moves.length % 2 === 1 ? match.player_x : match.player_o;
    const target = match.end_reason === "resign"
      ? (match.winner === "x" ? match.player_x : match.player_o)
      : other(lastMover);
    if (match.status === "finished") {
      if (match.end_reason === "resign") return [resigned(target)];
      return [
        notify(
          target,
          (m) => m.push.finished,
          (m) => (!match.winner ? m.push.draw(name(m, other(target))) : m.push.theyWonRematch(name(m, other(target)))),
        ),
      ];
    }
    return [notify(target, (m) => m.push.yourTurn, (m) => m.push.moved(name(m, other(target)), game(m)))];
  }

  if (match.game === "battleship") {
    if (match.end_reason === "resign") return [resigned(match.winner === "x" ? match.player_x : match.player_o)];
    // Solo los disparos avisan (colocar la flota no cambia los movimientos).
    const shot = match.moves.length > old.moves.length ? decodeShot(match.moves.at(-1)!) : null;
    if (!shot) return [];
    const shooter = match.moves.length % 2 === 1 ? match.player_x : match.player_o;
    const target = other(shooter);
    if (match.status === "finished") {
      return [notify(target, (m) => m.push.finished, (m) => m.push.fleetSunk(name(m, shooter)))];
    }
    return [notify(target, (m) => m.push.yourTurn, (m) => m.push.shot(name(m, shooter), m.push.shotResult[shot.result]))];
  }

  if (match.game === "pong" || match.game === "tron") {
    if (match.status !== "finished") return [];
    if (match.end_reason === "disputed") {
      return [match.player_x, match.player_o].map((id) => notify(id, (m) => m.push.noWinner(game(m)), (m) => m.push.disputed));
    }
    if (match.end_reason === "resign") return [resigned(match.winner === "x" ? match.player_x : match.player_o)];
    return [];
  }

  // Piedra, papel o tijera: las rondas se resuelven para los dos a la vez.
  const state = replayRps(match.game as Variant, match.moves);
  const last = state?.rounds.at(-1);
  if (match.status === "finished") {
    if (match.end_reason === "resign") return [resigned(match.winner === "x" ? match.player_x : match.player_o)];
    return [match.player_x, match.player_o].map((id) => {
      const mine = id === match.player_x ? "x" : "o";
      return notify(
        id,
        (m) => m.push.finished,
        (m) => (!match.winner ? m.push.draw(name(m, other(id))) : match.winner === mine ? m.push.youBeat(name(m, other(id))) : m.push.beatYou(name(m, other(id)))),
      );
    });
  }
  if (!last) return [];
  return [match.player_x, match.player_o].map((id) => {
    const mine = id === match.player_x ? "x" : "o";
    const theirs = mine === "x" ? "o" : "x";
    return notify(
      id,
      (m) => m.push.rpsVersus(m.rps.choices[last[mine]], m.rps.choices[last[theirs]].toLowerCase()),
      (m) => m.push.rpsNext(!last.winner ? m.match.draw : last.winner === mine ? m.push.roundYours : m.push.roundTheirs(name(m, other(id)))),
    );
  });
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "No autorizado" }, { status: 401 });

  const change = (await request.json().catch(() => null)) as Change | null;
  if (!change || !["messages", "friendships", "matches", "streaks"].includes(change.table)) {
    return Response.json({ error: "Evento no válido" }, { status: 400 });
  }

  const notifications = await notificationsFor(change);
  const sent = await Promise.all(notifications.map((n) => sendPush(n.userId, n.message)));
  return Response.json({ notified: notifications.length, sent: sent.reduce((a, b) => a + b, 0) });
}
