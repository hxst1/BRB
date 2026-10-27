"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameIcon } from "@/components/game-icon";
import { INVITE_GAMES } from "@/lib/guest";
import { matchHref, type MatchGame } from "@/lib/games";
import { useLocale, useMessages } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

/**
 * Elegir juego y empezar la partida contra quien invita. Sin sesión, primero
 * crea una cuenta de invitado (anónima) con el código: así ya son amigos y la
 * partida empieza al momento (challenge_inviter).
 */
export function InviteStart({ code, inviter, initialGame, signedIn }: { code: string; inviter: string; initialGame: MatchGame; signedIn: boolean }) {
  const m = useMessages();
  const t = m.invite;
  const locale = useLocale();
  const router = useRouter();
  const [game, setGame] = useState<MatchGame>(initialGame);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!signedIn) {
      const { error: signInError } = await supabase.auth.signInAnonymously({ options: { data: { invited_by: code, locale } } });
      if (signInError) {
        setError(t.guestError);
        setBusy(false);
        return;
      }
    }
    const { data: matchId, error: matchError } = await supabase.rpc("challenge_inviter", { code, game });
    if (matchError?.hint === "not_friends") {
      // Con cuenta propia y sin ser amigos: primero la solicitud de amistad, como siempre.
      router.push(`/amigos?codigo=${code}`);
      return;
    }
    if (matchError || !matchId) {
      setError(t.startError);
      setBusy(false);
      return;
    }
    router.push(matchHref({ id: matchId, game }));
    router.refresh();
  }

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div role="radiogroup" aria-label={t.pickGame} className="grid w-full grid-cols-3 gap-2">
        {INVITE_GAMES.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={game === option}
            onClick={() => setGame(option)}
            className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-sm font-medium transition-colors ${
              game === option ? "bg-surface shadow-lift ring-2 ring-ink" : "bg-surface/60 text-muted hover:text-ink"
            }`}
          >
            <GameIcon name={option} className="size-9" />
            {m.matchGames[option]}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => void start()}
        disabled={busy}
        className="w-full rounded-full bg-ink px-6 py-3.5 text-lg font-semibold text-bg disabled:opacity-60"
      >
        {busy ? t.starting : signedIn ? t.playSignedIn(m.matchGames[game], inviter) : t.playNow(m.matchGames[game])}
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {!signedIn && (
        <p className="text-sm text-muted">
          {t.orAccount}{" "}
          <Link href="/entrar?modo=registro" className="font-medium text-ink underline underline-offset-4">
            {t.createAccount}
          </Link>{" "}
          ·{" "}
          <Link href={`/entrar?next=${encodeURIComponent(`/unete/${code}?juego=${game}`)}`} className="font-medium text-ink underline underline-offset-4">
            {t.haveAccount}
          </Link>
        </p>
      )}
    </div>
  );
}
