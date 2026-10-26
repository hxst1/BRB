"use client";

import { startRun, type RunNotice } from "@/lib/start-run";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { randomSeed } from "@repo/games";
import {
  COLUMNS,
  FOUNDATIONS,
  GAME_ID,
  applyMove,
  autoMove,
  decodeMoves,
  encodeMoves,
  finishingMoves,
  generate,
  isColumn,
  isRed,
  isWon,
  rank,
  suit,
  type Move,
  type Pile,
  type State,
} from "@repo/games/solitaire";
import { createClient } from "@/lib/supabase/client";
import { GuestNotice } from "@/components/guest-notice";
import { useMessages } from "@/lib/i18n/client";
import { CardFace, Suit } from "./card";

/** Hora actual (fuera del componente: solo se llama desde eventos y efectos). */
const clock = () => Date.now();

type Save =
  | { status: "saving" }
  | { status: "saved"; time: number }
  | { status: "rejected" }
  | { status: "error"; message: string; retry: boolean };

/** Lo que se guarda en el navegador para retomar la partida al volver. */
type Stored = { runId: string | null; seed: number; startedAt: number; moves: string };

const STORAGE_KEY = "solitaire";

/** Al final, las cartas suben solas: una cada tanto (por encima del mínimo por movimiento que pide el servidor). */
const FINISH_STEP_MS = 130;

/** Lo que hay que mover el dedo para que un toque pase a ser arrastrar. */
const DRAG_THRESHOLD = 6;

function readStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

function writeStored(stored: Stored | null) {
  try {
    if (stored) localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento (modo privado): simplemente no se podrá retomar.
  }
}

/**
 * Retoma la partida guardada si sigue abierta en el servidor; si no, empieza
 * otra (con sesión, el servidor da la semilla y empieza a contar el tiempo).
 */
async function prepare(signedIn: boolean): Promise<{ stored: Stored; notice: RunNotice | null }> {
  const saved = readStored();
  if (saved) {
    if (!saved.runId && !signedIn) return { stored: saved, notice: null };
    if (saved.runId && signedIn) {
      const { data } = await createClient().from("game_runs").select("status, started_at").eq("id", saved.runId).maybeSingle();
      if (data?.status === "playing") return { stored: { ...saved, startedAt: new Date(data.started_at).getTime() }, notice: null };
    }
  }
  const fresh = (seed: number, runId: string | null): Stored => ({ runId, seed, startedAt: clock(), moves: "" });
  if (!signedIn) return { stored: fresh(randomSeed(), null), notice: null };
  const { run, notice } = await startRun(GAME_ID);
  return run ? { stored: fresh(run.seed, run.id), notice: null } : { stored: fresh(randomSeed(), null), notice };
}

/** Medidas del tablero para un ancho dado: 7 columnas de cartas de 5 × 7. */
function measure(width: number) {
  const gap = Math.max(4, width * 0.018);
  const cardW = (width - gap * 6) / 7;
  const cardH = cardW * 1.4;
  const top = cardH + gap * 3;
  // Sitio para columnas largas; si alguna no cabe ni juntando sus cartas, el tablero crece (ver tableHeight).
  const height = Math.round(cardH * 4.7);
  return { gap, cardW, cardH, top, height, x: (column: number) => column * (cardW + gap) };
}
type Geometry = ReturnType<typeof measure>;

/** Dónde está cada carta: posición, si se ve y desde qué montón se puede coger. */
type Place = { x: number; y: number; z: number; faceUp: boolean; pile: Pile | "s"; count: number; playable: boolean };

function placeCards(state: State, g: Geometry): Place[] {
  const places: Place[] = [];
  state.stock.forEach((card, i) => {
    places[card] = { x: g.x(0), y: 0, z: i, faceUp: false, pile: "s", count: 0, playable: i === state.stock.length - 1 };
  });
  // El descarte enseña las tres de arriba un poco abiertas; solo se juega la última.
  const fan = g.cardW * 0.3;
  state.waste.forEach((card, i) => {
    const fromTop = state.waste.length - 1 - i;
    places[card] = { x: g.x(1) + Math.max(0, 2 - fromTop) * fan, y: 0, z: i, faceUp: true, pile: "w", count: 1, playable: fromTop === 0 };
  });
  state.foundations.forEach((count, s) => {
    for (let i = 0; i < count; i++) {
      places[s * 13 + i] = { x: g.x(3 + s), y: 0, z: i, faceUp: true, pile: FOUNDATIONS[s]!, count: 1, playable: i === count - 1 };
    }
  });
  const room = g.height - g.top - g.cardH;
  state.tableau.forEach((column, c) => {
    const downStep = g.cardH * 0.13;
    // Si la columna no cabe, se juntan las destapadas (sin bajar de un mínimo legible).
    const wanted = g.cardH * 0.3;
    const upStep =
      column.up.length > 1 ? Math.max(g.cardH * 0.2, Math.min(wanted, (room - column.down.length * downStep) / (column.up.length - 1))) : wanted;
    column.down.forEach((card, i) => {
      places[card] = { x: g.x(c), y: g.top + i * downStep, z: 20 + i, faceUp: false, pile: COLUMNS[c]!, count: 0, playable: false };
    });
    column.up.forEach((card, i) => {
      places[card] = {
        x: g.x(c),
        y: g.top + column.down.length * downStep + i * upStep,
        z: 20 + column.down.length + i,
        faceUp: true,
        pile: COLUMNS[c]!,
        count: column.up.length - i,
        playable: true,
      };
    });
  });
  return places;
}

/** Alto del tablero: el previsto o, si una columna se pasa, lo que ocupa. */
function tableHeight(places: Place[], g: Geometry): number {
  return Math.max(g.height, ...places.map((place) => Math.ceil(place.y + g.cardH)));
}

type Drag = { card: number; pile: Pile; count: number; startX: number; startY: number; dx: number; dy: number; moved: boolean };

export function SolitaireGame({ viewerId, onSaved }: { viewerId: string | null; onSaved: () => void }) {
  const m = useMessages();
  const t = m.solitaire;
  const signedIn = viewerId !== null;
  const [game, setGame] = useState<Stored | null>(null);
  const [notice, setNotice] = useState<RunNotice | null>(null);
  const [save, setSave] = useState<Save | null>(null);
  const [confirmingNew, setConfirmingNew] = useState(false);
  const [now, setNow] = useState(0);
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  /** Carta que no tiene adónde ir: tiembla un momento. */
  const [refused, setRefused] = useState<number | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const loading = useRef<Promise<{ stored: Stored; notice: RunNotice | null }> | null>(null);
  /** Partida ya enviada al servidor: no se manda dos veces. */
  const submitted = useRef<string | null>(null);

  const seed = game?.seed;
  // El reparto sale de la semilla: se genera una vez por partida.
  const deal = useMemo(() => (seed === undefined ? null : generate(seed)), [seed]);
  // Los movimientos guardados se repiten hasta el primero que no valga (si el
  // almacenamiento se ha estropeado): lo que se ve es lo que se envía.
  const { state, moves } = useMemo(() => {
    if (!deal || !game) return { state: null, moves: [] as Move[] };
    let current = deal;
    const valid: Move[] = [];
    for (const move of decodeMoves(game.moves) ?? []) {
      const next = applyMove(current, move);
      if (!next) break;
      valid.push(move);
      current = next;
    }
    return { state: current, moves: valid };
  }, [deal, game]);
  const won = state !== null && isWon(state);

  useEffect(() => {
    let cancelled = false;
    (loading.current ?? (loading.current = prepare(signedIn))).then(({ stored, notice: message }) => {
      if (cancelled) return;
      writeStored(stored);
      setGame(stored);
      setNotice(message);
      setNow(clock());
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const restart = useCallback(async () => {
    writeStored(null);
    loading.current = prepare(signedIn);
    const { stored, notice: message } = await loading.current;
    writeStored(stored);
    setGame(stored);
    setNotice(message);
    setSave(null);
    setConfirmingNew(false);
    setNow(clock());
  }, [signedIn]);

  // El ancho del tablero manda en el tamaño de las cartas (el tablero aparece al cargar la partida).
  const loaded = game !== null;
  useEffect(() => {
    const element = board.current;
    if (!loaded || !element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [loaded]);

  // Cronómetro de la pantalla (el oficial lo mide el servidor).
  useEffect(() => {
    if (!game || won) return;
    const timer = setInterval(() => setNow(clock()), 250);
    return () => clearInterval(timer);
  }, [game, won]);

  const commit = useCallback((next: Stored) => {
    setGame(next);
    writeStored(next);
  }, []);

  /**
   * Manda la partida ganada al servidor. Se borra del navegador solo cuando el
   * servidor ya la ha cerrado: si falla la red, se puede reintentar (o se
   * reintenta sola al volver a la página).
   */
  const submit = useCallback(
    (stored: Stored) => {
      if (!stored.runId || submitted.current === stored.runId) return;
      submitted.current = stored.runId;
      setSave({ status: "saving" });
      fetch(`/api/runs/${stored.runId}/finish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ moves: stored.moves }),
      })
        .then(async (response) => {
          const body = await response.json().catch(() => ({}));
          if (response.ok) {
            writeStored(null);
            setSave({ status: "saved", time: body.score });
            onSaved();
          } else if (response.status === 422) {
            writeStored(null);
            setSave({ status: "rejected" });
          } else if (response.status === 409) {
            // Ya estaba cerrada: lo normal es que un envío anterior llegara aunque no su respuesta.
            writeStored(null);
            setSave({ status: "error", message: body.error ?? m.run.saveError, retry: false });
          } else {
            submitted.current = null;
            setSave({ status: "error", message: body.error ?? m.run.saveError, retry: true });
          }
        })
        .catch(() => {
          submitted.current = null;
          setSave({ status: "error", message: m.run.offlineSave, retry: true });
        });
    },
    [onSaved, m],
  );

  useEffect(() => {
    if (!won || !game) return;
    if (game.runId) submit(game);
    // Sin sesión no hay nada que enviar: la próxima vez, partida nueva.
    else writeStored(null);
  }, [won, game, submit]);

  /** Hace un movimiento si vale. */
  const play = useCallback(
    (move: Move): boolean => {
      if (!game || !state || won) return false;
      const next = applyMove(state, move);
      if (!next) return false;
      commit({ ...game, moves: encodeMoves([...moves, move]) });
      return true;
    },
    [game, state, won, moves, commit],
  );

  // Todo destapado y sin mazo: las cartas suben solas a los montones finales.
  const finishing = useMemo(() => (state && !won ? finishingMoves(state) : null), [state, won]);

  const undo = useCallback(() => {
    // Mientras suben solas, no (el botón también está desactivado).
    if (!game || won || finishing || moves.length === 0) return;
    commit({ ...game, moves: encodeMoves(moves.slice(0, -1)) });
  }, [game, won, finishing, moves, commit]);

  const refuse = useCallback((card: number) => {
    setRefused(card);
    setTimeout(() => setRefused((current) => (current === card ? null : current)), 320);
  }, []);

  useEffect(() => {
    if (!finishing?.length) return;
    const timer = setTimeout(() => play(finishing[0]!), FINISH_STEP_MS);
    return () => clearTimeout(timer);
  }, [finishing, play]);

  // Teclado: espacio roba, Z deshace.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      if (event.key.toLowerCase() === "z") undo();
      else if (event.key === " " && !target?.closest("button")) play({ draw: true });
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, play]);

  const g = width > 0 ? measure(width) : null;
  const places = useMemo(() => (state && g ? placeCards(state, g) : null), [state, g?.cardW]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Montón sobre el que se ha soltado lo que se arrastraba (por el centro de la carta de arriba). */
  function dropTarget(place: Place, dx: number, dy: number): Pile | null {
    if (!g) return null;
    const cx = place.x + dx + g.cardW / 2;
    const cy = place.y + dy + g.cardH / 2;
    const column = Math.max(0, Math.min(6, Math.floor((cx + g.gap / 2) / (g.cardW + g.gap))));
    if (cy < g.top - g.gap) return column >= 3 ? FOUNDATIONS[column - 3]! : null;
    return COLUMNS[column]!;
  }

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>, card: number) {
    const place = places?.[card];
    if (!place || !place.faceUp || !place.playable || place.pile === "s" || won || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ card, pile: place.pile, count: place.count, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0, moved: false });
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    setDrag({ ...drag, dx, dy, moved: true });
  }

  function onPointerUp() {
    if (!drag || !state) return;
    setDrag(null);
    if (!drag.moved) {
      // Un toque: la carta va sola adonde encaje.
      const move = autoMove(state, drag.pile, drag.count);
      if (!move || !play(move)) refuse(drag.card);
      return;
    }
    const to = places && dropTarget(places[drag.card]!, drag.dx, drag.dy);
    if (to && to !== drag.pile) play({ from: drag.pile, to, count: drag.count });
  }

  if (!game || !state) return <div className="aspect-[4/5] w-full max-w-[30rem] animate-pulse rounded-[18px] bg-line/40" />;

  const elapsed = Math.max(0, now - game.startedAt);
  /** Cartas que se arrastran: la cogida y las que lleva encima. */
  const dragging = new Set<number>();
  if (drag?.moved && places) {
    const pile = places[drag.card]!.pile;
    for (let card = 0; card < 52; card++) {
      const place = places[card]!;
      // De una columna se lleva la escalera; del descarte y de los finales, solo la de arriba.
      const taken = isColumn(pile as Pile) ? place.count <= drag.count : place.playable;
      if (place.pile === pile && place.faceUp && taken) dragging.add(card);
    }
  }
  const cardName = (card: number) => t.cardAria(t.ranks[rank(card) - 1]!, t.suits[suit(card)]!);

  return (
    <section className="flex w-full max-w-[30rem] flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-end gap-5">
          <div className="flex flex-col">
            <span className="text-xs text-muted">{m.minesweeper.time}</span>
            <span className="tabular display text-4xl font-bold">{m.format.time(elapsed)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted">{t.movesLabel}</span>
            <span className="tabular display text-4xl font-bold">{moves.length}</span>
          </div>
        </div>
        {confirmingNew ? (
          <span className="flex items-center gap-3 text-sm">
            {t.abandon}
            <button type="button" onClick={() => void restart()} className="font-medium text-danger">
              {m.run.yes}
            </button>
            <button type="button" onClick={() => setConfirmingNew(false)} className="text-muted hover:text-ink">
              {m.run.no}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => (moves.length > 0 && !won ? setConfirmingNew(true) : void restart())}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft transition-colors hover:border-muted"
          >
            {t.newGame}
          </button>
        )}
      </div>

      {/* isolate: el z-index de las cartas solo cuenta dentro del tablero (si no, tapan los diálogos). */}
      <div ref={board} className="solitaire relative isolate w-full select-none" style={{ height: g && places ? tableHeight(places, g) : 0 }}>
        {g && places && (
          <>
            {/* Huecos: mazo, montones finales y columnas. */}
            <button
              type="button"
              onClick={() => play({ draw: true })}
              disabled={won || (state.stock.length === 0 && state.waste.length === 0)}
              // Con cartas en el mazo, el foco va a la de arriba (el hueco queda debajo).
              tabIndex={state.stock.length > 0 ? -1 : 0}
              aria-label={state.stock.length > 0 ? t.draw(state.stock.length) : t.recycle}
              className="solitaire-slot absolute grid place-items-center"
              style={{ left: g.x(0), top: 0, width: g.cardW, height: g.cardH }}
            >
              {state.stock.length === 0 && state.waste.length > 0 && (
                <svg viewBox="0 0 24 24" className="w-2/5 text-muted" aria-hidden>
                  <path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            {FOUNDATIONS.map((pile, s) => (
              <div
                key={pile}
                aria-hidden
                className="solitaire-slot absolute grid place-items-center"
                style={{ left: g.x(3 + s), top: 0, width: g.cardW, height: g.cardH }}
              >
                <Suit suit={s} className="w-2/5 opacity-25" />
              </div>
            ))}
            {COLUMNS.map((pile, c) => (
              <div key={pile} aria-hidden className="solitaire-slot absolute" style={{ left: g.x(c), top: g.top, width: g.cardW, height: g.cardH }} />
            ))}

            {places.map((place, card) => {
              const lifted = dragging.has(card);
              const x = place.x + (lifted ? drag!.dx : 0);
              const y = place.y + (lifted ? drag!.dy : 0);
              const isStockTop = place.pile === "s" && place.playable;
              return (
                <button
                  key={card}
                  type="button"
                  tabIndex={(place.faceUp && place.playable) || isStockTop ? 0 : -1}
                  aria-label={place.faceUp ? cardName(card) : isStockTop ? t.draw(state.stock.length) : t.faceDown}
                  aria-hidden={!place.faceUp && !isStockTop}
                  onClick={(event) => {
                    // Con el teclado (sin puntero): Intro mueve la carta adonde encaje.
                    if (isStockTop) play({ draw: true });
                    else if (event.detail === 0 && place.faceUp && place.playable && place.pile !== "s") {
                      const move = autoMove(state, place.pile, place.count);
                      if (!move || !play(move)) refuse(card);
                    }
                  }}
                  onPointerDown={(event) => onPointerDown(event, card)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={() => setDrag(null)}
                  className={`solitaire-card absolute top-0 left-0 ${place.faceUp ? "solitaire-face" : "solitaire-back"} ${
                    lifted ? "solitaire-lifted" : ""
                  } ${refused === card ? "solitaire-refused" : ""}`}
                  style={{
                    width: g.cardW,
                    height: g.cardH,
                    transform: `translate3d(${x}px, ${y}px, 0)`,
                    zIndex: lifted ? 500 + place.z : place.pile === "s" || isFoundationPlace(place) ? place.z : 100 + place.z,
                    color: isRed(card) ? "var(--mark-x)" : "var(--ink)",
                    touchAction: place.faceUp && place.playable ? "none" : undefined,
                  }}
                >
                  {place.faceUp && <CardFace card={card} />}
                </button>
              );
            })}
          </>
        )}
      </div>

      {won ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface p-4 shadow-soft">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="display text-2xl font-bold">{t.won}</p>
            <p className="text-sm">
              {!game.runId
                ? m.sudoku.notRanked
                : save?.status === "saving"
                  ? m.common.saving
                  : save?.status === "saved"
                    ? m.minesweeper.officialTime(m.format.time(save.time))
                    : save?.status === "rejected"
                      ? m.run.rejected
                      : save?.status === "error"
                        ? save.message
                        : null}
            </p>
            {save?.status === "error" && save.retry && (
              <button type="button" onClick={() => submit(game)} className="self-start text-sm font-medium underline underline-offset-4">
                {m.errors.retry}
              </button>
            )}
          </div>
          <button type="button" onClick={() => void restart()} className="shrink-0 rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
            {t.another}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={moves.length === 0 || finishing !== null}
            className="flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft transition-colors hover:border-muted disabled:opacity-40"
          >
            {m.sudoku.undo}
          </button>
        </div>
      )}

      {notice && <p className="text-sm text-muted">{m.run[notice]}</p>}

      {!signedIn && <GuestNotice next="/solitario" />}

      <p className="text-sm text-muted">{t.hint}</p>
    </section>
  );
}

const isFoundationPlace = (place: Place) => place.pile >= "A" && place.pile <= "D";
