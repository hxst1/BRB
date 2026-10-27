"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { brand } from "@repo/brand";
import type { Json } from "@repo/db";
import { MAX_GUESSES, WORD_LENGTH, letterHints, shareGrid, type Mark } from "@repo/games/wordle";
import { Avatar } from "@repo/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { playSound } from "@/lib/sound";
import { useMessages } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/locales";

export type WordleState = {
  guesses: string[];
  patterns: string[];
  solved: boolean;
  finished: boolean;
  /** La palabra, solo si se han agotado los intentos sin acertar. */
  answer: string | null;
};

export type FriendResult = {
  user_id: string;
  username: string;
  avatar_seed: number;
  avatar_parts: Json;
  attempts: number;
  solved: boolean;
  patterns: string[];
};

/** Teclado de cada idioma (el inglés, sin ñ). */
const ROWS: Record<Locale, string[]> = { es: ["qwertyuiop", "asdfghjklñ", "zxcvbnm"], en: ["qwertyuiop", "asdfghjkl", "zxcvbnm"] };
/** Cuánto se ve un aviso ("No está en la lista"…). */
const TOAST_MS = 1800;

/** En el teclado, las letras descartadas se apagan para que destaque lo que queda. */
const KEY_ABSENT: CSSProperties = { background: "transparent", color: "var(--muted)", opacity: 0.45 };

const MARK_STYLE: Record<Mark, CSSProperties> = {
  g: { background: "var(--t512)", color: "#15171c", borderColor: "transparent" },
  y: { background: "var(--t128)", color: "#15171c", borderColor: "transparent" },
  b: { background: "var(--line)", color: "var(--muted)", borderColor: "transparent" },
};

export function WordleGame({
  lang,
  day,
  dayLabel,
  initial,
  initialFriends,
}: {
  /** Idioma de las palabras (puede no ser el de la app). */
  lang: Locale;
  day: string;
  dayLabel: string;
  initial: WordleState;
  initialFriends: FriendResult[];
}) {
  const m = useMessages();
  const [game, setGame] = useState(initial);
  const [current, setCurrent] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [friends, setFriends] = useState(initialFriends);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const reject = useCallback((message: string) => {
    playSound("error");
    setToast(message);
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }, []);

  const submit = useCallback(async () => {
    if (busy || game.finished) return;
    if (current.length < WORD_LENGTH) return reject(m.wordle.tooShort);
    setBusy(true);
    try {
      const response = await fetch("/api/wordle/guess", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ day, guess: current, lang }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return reject(body.error ?? m.wordle.checkError);

      setCurrent("");
      playSound(body.solved ? "win" : body.finished ? "lose" : "flip");
      setGame((previous) => ({
        guesses: [...previous.guesses, body.guess],
        patterns: [...previous.patterns, body.pattern],
        solved: body.solved,
        finished: body.finished,
        answer: body.answer,
      }));
      if (body.finished) {
        const { data } = await createClient().rpc("get_wordle_friends", { lang });
        setFriends(data ?? []);
      }
    } catch {
      reject(m.wordle.offline);
    } finally {
      setBusy(false);
    }
  }, [busy, current, day, game.finished, reject, m, lang]);

  const type = useCallback(
    (key: string) => {
      if (game.finished) return;
      if (key === "enter") void submit();
      else if (key === "back") {
        playSound("tap", { volume: 0.4, pitch: 0.9 });
        setCurrent((word) => word.slice(0, -1));
      } else if (/^[a-zñ]$/.test(key)) {
        playSound("tap", { volume: 0.5 });
        setCurrent((word) => (word.length < WORD_LENGTH ? word + key : word));
      }
    },
    [game.finished, submit],
  );

  // Teclado físico
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select")) return;
      const key = event.key === "Enter" ? "enter" : event.key === "Backspace" ? "back" : event.key.toLowerCase();
      if (key !== "enter" && key !== "back" && !/^[a-zñ]$/.test(key)) return;
      event.preventDefault();
      type(key);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [type]);

  const hints = letterHints(game.guesses, game.patterns);
  const rows = Array.from({ length: MAX_GUESSES }, (_, row) => {
    if (row < game.guesses.length) return { letters: game.guesses[row]!, pattern: game.patterns[row]! };
    if (row === game.guesses.length && !game.finished) return { letters: current, pattern: null, active: true };
    return { letters: "", pattern: null };
  });

  async function share() {
    const score = game.solved ? game.guesses.length : "X";
    const text = `${brand.name} Wordle ${dayLabel}: ${score}/${MAX_GUESSES}\n\n${shareGrid(game.patterns)}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), TOAST_MS);
      }
    } catch {
      // Compartir cancelado: no pasa nada.
    }
  }

  return (
    <section className="flex w-full max-w-[30rem] flex-col gap-5">
      <div className="relative">
        <div role="grid" aria-label={m.wordle.attempts} className="mx-auto grid w-full max-w-[22rem] gap-1.5">
          {rows.map((row, r) => (
            <div
              key={r}
              role="row"
              className={`grid grid-cols-5 gap-1.5 ${row.active && shake ? "wordle-shake" : ""}`}
            >
              {Array.from({ length: WORD_LENGTH }, (_, i) => {
                const letter = row.letters[i] ?? "";
                const mark = row.pattern?.[i] as Mark | undefined;
                return (
                  <div
                    key={i}
                    role="gridcell"
                    aria-label={letter ? `${letter.toUpperCase()}${mark ? `, ${m.wordle.marks[mark]}` : ""}` : m.minesweeper.empty}
                    className="display grid aspect-square place-items-center rounded-xl border-2 text-3xl font-bold uppercase transition-colors duration-300"
                    style={
                      mark
                        ? { ...MARK_STYLE[mark], transitionDelay: `${i * 120}ms` }
                        : { borderColor: letter ? "var(--muted)" : "var(--line)" }
                    }
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {(toast || copied) && (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <p role="status" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg shadow-lift">
              {copied ? m.wordle.copied : toast}
            </p>
          </div>
        )}
      </div>

      {game.finished ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-soft">
          <div>
            <p className="display text-2xl font-bold">
              {game.solved
                ? game.guesses.length === 1
                  ? m.wordle.firstTry
                  : m.wordle.solvedIn(game.guesses.length)
                : m.wordle.itWas(game.answer?.toUpperCase() ?? null)}
            </p>
            <p className="text-sm text-muted">{m.wordle.tomorrow}</p>
          </div>
          <button type="button" onClick={() => void share()} className="self-start rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
            {m.wordle.share}
          </button>
        </div>
      ) : (
        <Keyboard rows={ROWS[lang]} hints={hints} onKey={type} disabled={busy} />
      )}

      {game.finished && <Friends friends={friends} />}
    </section>
  );
}

function Keyboard({ rows, hints, onKey, disabled }: { rows: string[]; hints: Map<string, Mark>; onKey: (key: string) => void; disabled: boolean }) {
  const m = useMessages();
  return (
    <div aria-label={m.wordle.keyboard} className="wordle-keyboard flex flex-col gap-1.5 select-none">
      {rows.map((row, r) => (
        <div key={row} className="flex justify-center gap-1">
          {r === 2 && (
            <Key label={m.wordle.enter} wide onClick={() => onKey("enter")} disabled={disabled}>
              {m.wordle.enter}
            </Key>
          )}
          {[...row].map((letter) => {
            const mark = hints.get(letter);
            return (
              <Key key={letter} label={letter.toUpperCase()} style={mark === "b" ? KEY_ABSENT : mark ? MARK_STYLE[mark] : undefined} onClick={() => onKey(letter)}>
                {letter}
              </Key>
            );
          })}
          {r === 2 && (
            <Key label={m.sudoku.erase} wide onClick={() => onKey("back")}>
              ⌫
            </Key>
          )}
        </div>
      ))}
    </div>
  );
}

function Key({
  label,
  wide = false,
  style,
  disabled,
  onClick,
  children,
}: {
  label: string;
  wide?: boolean;
  style?: CSSProperties;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-13 place-items-center rounded-lg bg-line/70 font-semibold uppercase transition-colors active:scale-95 disabled:opacity-50 ${
        wide ? "max-w-16 min-w-0 flex-[1.5] px-1 text-xs" : "max-w-11 min-w-0 flex-1 text-base"
      }`}
      style={style}
    >
      {children}
    </button>
  );
}

function Friends({ friends }: { friends: FriendResult[] }) {
  const m = useMessages();
  if (friends.length <= 1) {
    return <p className="text-sm text-muted">{m.wordle.friendsEmpty}</p>;
  }
  return (
    <section aria-labelledby="wordle-friends" className="flex flex-col gap-3">
      <h2 id="wordle-friends" className="text-xl font-semibold">
        {m.wordle.friendsToday}
      </h2>
      <ul className="flex flex-col">
        {friends.map((friend) => (
          <li key={friend.user_id} className="flex items-center gap-3 border-b border-line py-2.5">
            <Avatar seed={friend.avatar_seed} parts={friend.avatar_parts} size={32} />
            <span className="min-w-0 flex-1 truncate">{friend.username}</span>
            <span aria-hidden className="flex flex-col gap-px">
              {friend.patterns.map((pattern, r) => (
                <span key={r} className="flex gap-px">
                  {[...pattern].map((mark, i) => (
                    <span key={i} className="size-2 rounded-[2px]" style={{ background: MARK_STYLE[mark as Mark].background }} />
                  ))}
                </span>
              ))}
            </span>
            <span className="tabular w-10 text-right font-semibold">
              {friend.solved ? friend.attempts : "X"}/{MAX_GUESSES}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
