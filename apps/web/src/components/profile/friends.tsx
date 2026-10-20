"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { FriendRequestResult, Json } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";
import { ChallengeMenu } from "@/components/challenge-menu";
import { createClient } from "@/lib/supabase/client";

type Person = { id: string; username: string; avatar_seed: number; avatar_parts: Json };
type Row = { id: string; status: "pending" | "accepted"; other: Person; incoming: boolean };

const RESULT_MESSAGES: Record<FriendRequestResult, { text: string; ok: boolean }> = {
  sent: { text: "Solicitud enviada. Saldrá en tu lista cuando la acepte.", ok: true },
  accepted: { text: "Ya sois amigos: esa persona también te había añadido.", ok: true },
  already_sent: { text: "Ya le has enviado una solicitud. Toca esperar.", ok: true },
  already_friends: { text: "Ya sois amigos.", ok: true },
  self: { text: "Ese es tu propio código.", ok: false },
  not_found: { text: "No hay nadie con ese código. Revisa que esté bien escrito.", ok: false },
  rate_limited: { text: "Demasiados intentos seguidos. Prueba otra vez dentro de un rato.", ok: false },
};

const PERSON = "id, username, avatar_seed, avatar_parts";

export function Friends({ viewerId, initialCode = "" }: { viewerId: string; initialCode?: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  // Llega relleno al abrir un enlace de invitación (/amigos?codigo=…).
  const [code, setCode] = useState(initialCode);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ text: string; ok: boolean } | null>(
    initialCode ? { text: "Te han invitado: pulsa Añadir para enviarle una solicitud.", ok: true } : null,
  );

  const load = useCallback(async () => {
    const { data } = await createClient()
      .from("friendships")
      .select(
        `id, status, requester_id,
         requester:profiles!friendships_requester_id_fkey(${PERSON}),
         addressee:profiles!friendships_addressee_id_fkey(${PERSON})`,
      )
      .order("created_at", { ascending: false });

    return (data ?? []).map((row) => {
      const incoming = row.requester_id !== viewerId;
      return { id: row.id, status: row.status, incoming, other: incoming ? row.requester : row.addressee };
    });
  }, [viewerId]);

  const reload = useCallback(async () => setRows(await load()), [load]);

  useEffect(() => {
    let cancelled = false;
    load().then((next) => {
      if (!cancelled) setRows(next);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function addFriend(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    const { data, error } = await createClient().rpc("send_friend_request", { friend_code: code });
    setSending(false);
    setResult(error ? { text: "No se ha podido enviar. Inténtalo otra vez.", ok: false } : RESULT_MESSAGES[data as FriendRequestResult]);
    if (!error && data !== "not_found" && data !== "self" && data !== "rate_limited") {
      setCode("");
      await reload();
    }
  }

  async function respond(id: string, accept: boolean) {
    await createClient().rpc("respond_friend_request", { request_id: id, accept });
    await reload();
  }

  async function remove(friendId: string) {
    await createClient().rpc("remove_friend", { friend_id: friendId });
    await reload();
  }

  const incoming = rows?.filter((row) => row.status === "pending" && row.incoming) ?? [];
  const outgoing = rows?.filter((row) => row.status === "pending" && !row.incoming) ?? [];
  const friends = rows?.filter((row) => row.status === "accepted") ?? [];

  return (
    <section aria-labelledby="friends-title" className="flex flex-col gap-6">
      <h2 id="friends-title" className="sr-only">
        Tus amigos
      </h2>

      <form onSubmit={addFriend} className="flex flex-col gap-2">
        <label htmlFor="friend-code" className="text-sm font-medium">
          Añadir con su código
        </label>
        <div className="flex gap-2">
          <input
            id="friend-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ""))}
            maxLength={5}
            required
            minLength={5}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="K7XQ2"
            className="tabular w-40 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-lg font-semibold tracking-[0.12em] outline-none placeholder:font-normal placeholder:text-muted/50 focus:border-focus"
          />
          <button
            type="submit"
            disabled={sending || code.length !== 5}
            className="rounded-xl bg-ink px-4 font-semibold text-bg disabled:opacity-40"
          >
            Añadir
          </button>
        </div>
        <p aria-live="polite" className={`min-h-5 text-sm ${result?.ok === false ? "text-danger" : "text-muted"}`}>
          {result?.text}
        </p>
      </form>

      {rows === null ? (
        <div className="h-24 animate-pulse rounded-2xl bg-line/40" />
      ) : (
        <>
          {incoming.length > 0 && (
            <PeopleList title="Quieren ser tus amigos">
              {incoming.map((row) => (
                <PersonRow key={row.id} person={row.other}>
                  <button type="button" onClick={() => void respond(row.id, true)} className="rounded-full bg-ink px-3 py-1 text-sm font-medium text-bg">
                    Aceptar
                  </button>
                  <button type="button" onClick={() => void respond(row.id, false)} className="text-sm text-muted hover:text-ink">
                    Rechazar
                  </button>
                </PersonRow>
              ))}
            </PeopleList>
          )}

          <PeopleList title={friends.length ? `Tus amigos (${friends.length})` : "Tus amigos"}>
            {friends.length === 0 && (
              <li className="py-3 text-sm text-muted">Aún no tienes amigos aquí. Pásales tu código y pídeles el suyo.</li>
            )}
            {friends.map((row) => (
              <PersonRow key={row.id} person={row.other}>
                <Link href={`/chat/${row.other.id}`} className="text-sm font-medium text-muted hover:text-ink">
                  Mensaje
                </Link>
                <ChallengeMenu friendId={row.other.id} />
                <ConfirmButton label="Eliminar" confirmLabel="Sí, eliminar" onConfirm={() => void remove(row.other.id)} />
              </PersonRow>
            ))}
          </PeopleList>

          {outgoing.length > 0 && (
            <PeopleList title="Solicitudes enviadas">
              {outgoing.map((row) => (
                <PersonRow key={row.id} person={row.other}>
                  <button type="button" onClick={() => void remove(row.other.id)} className="text-sm text-muted hover:text-ink">
                    Cancelar
                  </button>
                </PersonRow>
              ))}
            </PeopleList>
          )}
        </>
      )}
    </section>
  );
}

function PeopleList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-sm text-muted">{title}</h3>
      <ul className="flex flex-col">{children}</ul>
    </div>
  );
}

function PersonRow({ person, children }: { person: Person; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 border-b border-line py-2.5">
      <Avatar seed={person.avatar_seed} parts={person.avatar_parts} size={36} />
      <span className="min-w-0 flex-1 truncate font-medium">{person.username}</span>
      <span className="flex items-center gap-3">{children}</span>
    </li>
  );
}

/** Confirmación en línea en vez de un diálogo del navegador. */
function ConfirmButton({ label, confirmLabel, onConfirm }: { label: string; confirmLabel: string; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="text-sm text-muted hover:text-ink">
        {label}
      </button>
    );
  }
  return (
    <>
      <button type="button" onClick={onConfirm} className="text-sm font-medium text-danger">
        {confirmLabel}
      </button>
      <button type="button" onClick={() => setAsking(false)} className="text-sm text-muted hover:text-ink">
        No
      </button>
    </>
  );
}
