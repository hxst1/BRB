"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { correctPrefix, wordsPerMinute } from "@repo/games/typing";
import type { Match } from "@repo/db";
import { LiveMatchShell } from "@/components/live/match-shell";
import { MARK_COLOR } from "@/components/tictactoe/match-view";
import { createClient } from "@/lib/supabase/client";
import { useMessages } from "@/lib/i18n/client";
import { playSound } from "@/lib/sound";

type Mark = "x" | "o";
/** "ready": ya hay salida (cuenta atrás y carrera, según la hora). */
type Phase = "lobby" | "starting" | "ready" | "checking" | "error";

/** El progreso del rival llega como mucho cada tanto (y siempre el último). */
const PROGRESS_EVERY_MS = 120;
/** Lo que se puede seguir escribiendo después de un error, antes de corregirlo. */
const MAX_WRONG = 8;
/** Veces que se pregunta (una por segundo) si el rival ya ha entrado, antes de rendirse. */
const JOIN_ATTEMPTS = 20;

type Race = { text: string; startsAt: number };

/**
 * Carrera de tecleo en directo. Al estar los dos, el servidor fija la salida y
 * cada uno escribe el mismo texto; por el canal privado `typing:<id>` solo va
 * el progreso, para ver avanzar al rival. Quien acaba primero se lo manda al
 * servidor, que mide el tiempo y cierra la partida (el resultado lo enseña
 * LiveMatchShell).
 */
export function TypingMatchView({ matchId, viewerId }: { matchId: string; viewerId: string }) {
  return <LiveMatchShell matchId={matchId} viewerId={viewerId} game="typing" live={(props) => <LiveRace {...props} />} />;
}

async function requestStart(matchId: string, create: boolean): Promise<Race | null> {
  const sentAt = Date.now();
  const response = await fetch(`/api/matches/${matchId}/typing`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "start", create }),
  });
  if (!response.ok) throw new Error(`start ${response.status}`);
  const body = (await response.json()) as { started?: false; text: string; startsAt: string; serverNow: string };
  if (body.started === false) return null;
  // El reloj del navegador puede ir adelantado o atrasado: se ajusta con la
  // hora del servidor, contando que la respuesta tarda la mitad del viaje.
  const offset = Date.parse(body.serverNow) - (sentAt + Date.now()) / 2;
  return { text: body.text, startsAt: Date.parse(body.startsAt) - offset };
}

function LiveRace({ match, me, rivalName, onReported }: { match: Match; me: Mark; rivalName: string; onReported: () => void }) {
  const m = useMessages();
  const rival: Mark = me === "x" ? "o" : "x";
  const channelRef = useRef<RealtimeChannel | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const [phase, setPhase] = useState<Phase>("lobby");
  const [race, setRace] = useState<Race | null>(null);
  const [rivalHere, setRivalHere] = useState(false);
  const [typed, setTyped] = useState("");
  const [rivalChars, setRivalChars] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [notice, setNotice] = useState<string | null>(null);
  const sent = useRef({ chars: -1, at: 0 });
  const phaseRef = useRef<Phase>("lobby");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Al entrar, por si la carrera ya había empezado (p. ej. al recargar a media carrera).
  useEffect(() => {
    let cancelled = false;
    requestStart(match.id, false)
      .then((existing) => {
        if (cancelled || !existing) return;
        setRace(existing);
        setPhase("ready");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [match.id]);

  // Canal privado: presencia de los dos y progreso del rival.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    void (async () => {
      // Los canales privados comprueban la política de RLS con el token del usuario.
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase.channel(`typing:${match.id}`, {
        config: { private: true, broadcast: { self: false }, presence: { key: me } },
      });
      channelRef.current = channel;
      channel
        .on("presence", { event: "sync" }, () => setRivalHere(Object.keys(channel!.presenceState()).includes(rival)))
        .on("broadcast", { event: "progress" }, ({ payload }) => setRivalChars((payload as { chars: number }).chars))
        .subscribe((status) => {
          if (status === "SUBSCRIBED") void channel!.track({ online: true });
        });
    })();

    return () => {
      cancelled = true;
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [match.id, me, rival]);

  // Con los dos aquí, cada uno dice que ha entrado. La salida se fija cuando
  // lo han dicho los dos; hasta entonces, se vuelve a preguntar cada segundo.
  const join = useCallback(async () => {
    if (phaseRef.current === "starting") return;
    phaseRef.current = "starting";
    try {
      for (let attempt = 0; attempt < JOIN_ATTEMPTS && mounted.current; attempt++) {
        const started = await requestStart(match.id, true);
        if (started) {
          setRace(started);
          setPhase("ready");
          return;
        }
        if (attempt === 0) setPhase("starting");
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }
      throw new Error("sin salida");
    } catch {
      if (!mounted.current) return;
      setNotice(m.typing.startError);
      setPhase("error");
    }
  }, [match.id, m]);

  useEffect(() => {
    if (rivalHere && phaseRef.current === "lobby") void join();
  }, [rivalHere, join]);

  // Reloj de la cuenta atrás y de las palabras por minuto.
  useEffect(() => {
    if (phase !== "ready") return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [phase]);

  const left = race ? race.startsAt - now : Infinity;
  const secondsLeft = Math.ceil(left / 1000);
  const started = left <= 0;
  const racing = phase === "ready" && started;
  // Un pitido por segundo de la cuenta atrás y "¡ya!" al salir.
  useEffect(() => {
    if (phase !== "ready") return;
    if (started) playSound("go");
    else if (secondsLeft <= 3) playSound("beep");
  }, [phase, started, secondsLeft]);

  // El foco, en cuanto hay salida y otra vez al empezar. En el móvil el teclado
  // solo se abre si el foco llega de un toque: por eso se puede tocar la caja
  // (o cualquier sitio de la carrera, ver focusInput) durante la cuenta atrás.
  const canFocus = phase === "lobby" || phase === "starting" || phase === "ready";
  useEffect(() => {
    if (phase === "ready") input.current?.focus({ preventScroll: true });
  }, [phase, racing]);

  function focusInput(event: ReactMouseEvent) {
    if (!canFocus || (event.target as HTMLElement).closest("button, a")) return;
    input.current?.focus({ preventScroll: true });
  }

  const text = race?.text ?? "";
  const correct = correctPrefix(typed, text);
  const wrong = typed.length > correct;

  const sendProgress = useCallback((chars: number, force = false) => {
    const last = sent.current;
    if (chars === last.chars) return;
    if (!force && Date.now() - last.at < PROGRESS_EVERY_MS) return;
    sent.current = { chars, at: Date.now() };
    void channelRef.current?.send({ type: "broadcast", event: "progress", payload: { chars } });
  }, []);

  // Lo último siempre llega, aunque se haya escrito muy seguido.
  useEffect(() => {
    if (!racing) return;
    const timer = window.setTimeout(() => sendProgress(correct, true), PROGRESS_EVERY_MS);
    return () => window.clearTimeout(timer);
  }, [correct, racing, sendProgress]);

  async function finish(value: string) {
    setPhase("checking");
    sendProgress(value.length, true);
    const response = await fetch(`/api/matches/${match.id}/typing`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "finish", typed: value }),
    });
    if (response.ok) {
      onReported();
      return;
    }
    // 409: lo normal es que el rival haya llegado antes; al recargar, el
    // resultado sustituye a la carrera. Si no, queda el error para reintentar.
    if (response.status === 409) onReported();
    const body = await response.json().catch(() => ({}));
    setNotice(response.status < 500 && body.error ? body.error : m.typing.saveError);
    setPhase("error");
  }

  function onChange(value: string) {
    if (!racing) return;
    const ok = correctPrefix(value, text);
    // Tras un error se puede seguir un poco, pero hay que corregirlo para avanzar.
    if (value.length - ok > MAX_WRONG) return;
    if (value.length > typed.length && ok < value.length && correct === typed.length) playSound("error");
    setTyped(value);
    setNotice(null);
    sendProgress(ok);
    if (value === text) void finish(value);
  }

  const elapsed = race && racing ? Math.max(0, now - race.startsAt) : 0;
  const status =
    phase === "lobby"
      ? m.live.waitingFor(rivalName)
      : phase === "starting"
        ? m.typing.preparing
        : phase === "ready" && !started
          ? m.typing.countdown(Math.max(1, secondsLeft))
          : phase === "checking"
            ? m.typing.checking
            : null;

  return (
    <div className="flex flex-col gap-4" onClick={focusInput}>
      <div className="flex flex-col gap-2.5">
        <Lane label={m.match.you} mark={me} chars={correct} total={text.length} extra={elapsed > 1000 ? m.typing.wpm(wordsPerMinute(correct, elapsed)) : null} />
        <Lane label={rivalName} mark={rival} chars={rivalChars} total={text.length} />
      </div>

      <div className="relative rounded-3xl bg-surface p-4 shadow-soft sm:p-5">
        <p aria-label={m.typing.textAria} className={`text-lg leading-relaxed text-pretty sm:text-xl ${race ? "" : "invisible"}`}>
          {race ? (
            <>
              <span className="text-ink">{text.slice(0, correct)}</span>
              {wrong && <span className="rounded-sm bg-danger/20 text-danger">{text.slice(correct, typed.length) || " "}</span>}
              <span className={`text-muted ${racing ? "typing-caret" : ""}`}>{text.slice(Math.max(correct, typed.length))}</span>
            </>
          ) : (
            "·".repeat(120)
          )}
        </p>
        {status && (
          <div className="absolute inset-0 grid place-items-center rounded-3xl bg-bg/70 p-6 text-center backdrop-blur-sm">
            <p aria-live="polite" className="display text-2xl font-bold text-balance">
              {status}
            </p>
          </div>
        )}
      </div>

      <label className="sr-only" htmlFor="typing-input">
        {m.typing.label}
      </label>
      <textarea
        id="typing-input"
        ref={input}
        value={typed}
        onChange={(event) => onChange(event.target.value)}
        onPaste={(event) => {
          event.preventDefault();
          setNotice(m.typing.noPaste);
        }}
        onDrop={(event) => event.preventDefault()}
        /* Antes de la salida no está desactivada: así se puede tocar y tener el teclado
           listo (lo que se escriba antes de tiempo no cuenta, ver onChange). */
        disabled={!canFocus}
        rows={2}
        placeholder={racing ? m.typing.go : m.typing.getReady}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={`w-full resize-none rounded-2xl border-2 bg-surface px-4 py-3 text-lg outline-none transition-colors ${
          wrong ? "border-danger" : "border-line focus:border-ink"
        } disabled:opacity-60`}
      />
      <p aria-live="polite" className={`min-h-5 text-center text-sm ${wrong || phase === "error" ? "text-danger" : "text-muted"}`}>
        {wrong ? m.typing.fix : notice}
      </p>
      {phase === "error" && (race ? typed === text : true) && (
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            void (race ? finish(typed) : join());
          }}
          className="self-center rounded-full bg-ink px-5 py-2.5 font-semibold text-bg"
        >
          {m.errors.retry}
        </button>
      )}
    </div>
  );
}

/** La barra de progreso de cada uno, de su color. */
function Lane({ label, mark, chars, total, extra }: { label: string; mark: Mark; chars: number; total: number; extra?: string | null }) {
  const m = useMessages();
  const pct = total ? Math.min(100, Math.round((chars / total) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-semibold">{label}</span>
        <span className="tabular shrink-0 text-muted">{extra ?? `${pct} %`}</span>
      </div>
      <div
        role="progressbar"
        aria-label={m.typing.progressAria(label, pct)}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-3 overflow-hidden rounded-full bg-line/60"
      >
        <div className="h-full rounded-full transition-[width] duration-150" style={{ width: `${pct}%`, background: MARK_COLOR[mark] }} />
      </div>
    </div>
  );
}
