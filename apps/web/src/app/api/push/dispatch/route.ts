import { timingSafeEqual } from "node:crypto";
import { replay as replayRps, CHOICE_NAMES, type Variant } from "@repo/games/rps";
import type { Tables } from "@repo/db";
import { matchGame, matchHref } from "@/lib/games";
import { sendPush, type PushMessage } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lo llama la base de datos (trigger con pg_net) cuando pasa algo que puede
 * merecer una notificación. Decide a quién avisar y con qué texto.
 */

type Change =
  | { table: "messages"; type: "INSERT"; record: Tables<"messages"> }
  | { table: "friendships"; type: "INSERT"; record: Tables<"friendships"> }
  | { table: "matches"; type: "UPDATE"; record: Tables<"matches">; old_record: Tables<"matches"> };

type Notification = { userId: string; message: PushMessage };

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
  if (change.table === "messages") {
    const m = change.record;
    const names = await usernames([m.sender_id]);
    const sender = names[m.sender_id] ?? "Alguien";
    return [
      {
        userId: m.recipient_id,
        message: { title: sender, body: truncate(m.body), url: `/chat/${m.sender_id}`, tag: `chat:${m.sender_id}` },
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
        message: {
          title: "Solicitud de amistad",
          body: `${names[f.requester_id] ?? "Alguien"} quiere añadirte como amigo.`,
          url: "/amigos",
          tag: `friend:${f.requester_id}`,
        },
      },
    ];
  }

  // Partidas
  const { record: m, old_record: old } = change;
  const names = await usernames([m.player_x, m.player_o]);
  const name = (id: string) => names[id] ?? "Tu rival";
  const other = (id: string) => (id === m.player_x ? m.player_o : m.player_x);
  const url = matchHref(m);
  const tag = `match:${m.id}`;
  const game = matchGame(m.game).name;
  const notify = (userId: string, title: string, body: string): Notification => ({
    userId,
    message: { title, body, url, tag },
  });

  // El reto (pendiente) ya llega como mensaje del chat; aquí, sus respuestas.
  if (old.status === "pending" && m.status === "active") {
    return [notify(m.created_by, "Reto aceptado", `${name(other(m.created_by))} ha aceptado tu reto: ${game.toLowerCase()}.`)];
  }
  if (old.status === "pending" && m.status === "declined") {
    return [notify(m.created_by, "Reto rechazado", `${name(other(m.created_by))} ha rechazado tu reto.`)];
  }

  if (m.game === "tictactoe") {
    // Quien acaba de mover no necesita aviso: se notifica al otro.
    const lastMover = m.moves.length % 2 === 1 ? m.player_x : m.player_o;
    const target = m.end_reason === "resign"
      ? (m.winner === "x" ? m.player_x : m.player_o)
      : other(lastMover);
    if (m.status === "finished") {
      const body =
        m.end_reason === "resign"
          ? `${name(other(target))} se ha rendido. ¡Ganas tú!`
          : !m.winner
            ? `Empate con ${name(other(target))}.`
            : `${name(other(target))} ha ganado esta vez. ¿Revancha?`;
      return [notify(target, "Partida terminada", body)];
    }
    return [notify(target, "Te toca", `${name(other(target))} ha movido. Tu turno en el ${game.toLowerCase()}.`)];
  }

  // Piedra, papel o tijera: las rondas se resuelven para los dos a la vez.
  const state = replayRps(m.game as Variant, m.moves);
  const last = state?.rounds.at(-1);
  if (m.status === "finished") {
    if (m.end_reason === "resign") {
      const winner = m.winner === "x" ? m.player_x : m.player_o;
      return [notify(winner, "Partida terminada", `${name(other(winner))} se ha rendido. ¡Ganas tú!`)];
    }
    return [m.player_x, m.player_o].map((id) => {
      const mine = id === m.player_x ? "x" : "o";
      const body = !m.winner ? `Empate con ${name(other(id))}.` : m.winner === mine ? `¡Has ganado a ${name(other(id))}!` : `${name(other(id))} te ha ganado.`;
      return notify(id, "Partida terminada", body);
    });
  }
  if (!last) return [];
  return [m.player_x, m.player_o].map((id) => {
    const mine = id === m.player_x ? "x" : "o";
    const result = !last.winner ? "Empate" : last.winner === mine ? "Ronda para ti" : `Ronda para ${name(other(id))}`;
    return notify(
      id,
      `${CHOICE_NAMES[last[mine]]} contra ${CHOICE_NAMES[last[mine === "x" ? "o" : "x"]].toLowerCase()}`,
      `${result}. Elige para la siguiente.`,
    );
  });
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "No autorizado" }, { status: 401 });

  const change = (await request.json().catch(() => null)) as Change | null;
  if (!change || !["messages", "friendships", "matches"].includes(change.table)) {
    return Response.json({ error: "Evento no válido" }, { status: 400 });
  }

  const notifications = await notificationsFor(change);
  const sent = await Promise.all(notifications.map((n) => sendPush(n.userId, n.message)));
  return Response.json({ notified: notifications.length, sent: sent.reduce((a, b) => a + b, 0) });
}
