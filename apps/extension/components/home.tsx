import { useEffect, useState, type ReactNode } from "react";
import { browser } from "wxt/browser";
import type { Tables } from "@repo/db";
import { levelFromXp } from "@repo/games/level";
import { Avatar } from "@repo/ui/avatar";
import { fetchCounts, updateBadge, type Counts } from "@/lib/pending";
import { openSite } from "@/lib/open";
import { supabase } from "@/lib/supabase";

type Profile = Pick<Tables<"profiles">, "username" | "avatar_seed" | "avatar_parts" | "xp">;

export function Home({ userId, onPlay2048 }: { userId: string; onPlay2048: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase()
      .from("profiles")
      .select("username, avatar_seed, avatar_parts, xp")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (!cancelled) setProfile(data);
      });
    void fetchCounts().then((next) => {
      if (cancelled) return;
      setCounts(next);
      void updateBadge(next);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const level = profile ? levelFromXp(profile.xp) : null;
  const nothingPending = counts && counts.home + counts.chat + counts.friends === 0;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="grid size-14 place-items-center rounded-2xl bg-surface shadow-soft">
          {profile && <Avatar seed={profile.avatar_seed} parts={profile.avatar_parts} size={46} mood="happy" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{profile?.username ?? "…"}</p>
          {level && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Nivel {level.level}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <span className="block h-full rounded-full bg-ink" style={{ width: `${level.progress * 100}%` }} />
              </span>
            </div>
          )}
        </div>
      </div>

      <section className="flex flex-col gap-1">
        <h2 className="text-xs font-medium text-muted">Pendiente</h2>
        {counts === null ? (
          <div className="h-16 animate-pulse rounded-2xl bg-line/40" />
        ) : nothingPending ? (
          <p className="text-sm text-muted">Nada pendiente. Buen momento para un 2048.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {counts.home > 0 && (
              <PendingRow
                count={counts.home}
                text={counts.home === 1 ? "partida o reto esperándote" : "partidas o retos esperándote"}
                onClick={() => void openSite("/")}
              />
            )}
            {counts.chat > 0 && (
              <PendingRow
                count={counts.chat}
                text={counts.chat === 1 ? "mensaje sin leer" : "mensajes sin leer"}
                onClick={() => void openSite("/chat")}
              />
            )}
            {counts.friends > 0 && (
              <PendingRow
                count={counts.friends}
                text={counts.friends === 1 ? "solicitud de amistad" : "solicitudes de amistad"}
                onClick={() => void openSite("/amigos")}
              />
            )}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium text-muted">Jugar</h2>
        <button type="button" onClick={onPlay2048} className="flex items-center gap-3 rounded-2xl bg-ink p-3 text-left text-bg">
          <MiniBoard />
          <span className="flex-1">
            <span className="block font-semibold">2048 aquí mismo</span>
            <span className="block text-xs opacity-70">Cuenta para el ranking</span>
          </span>
        </button>
        <div className="grid grid-cols-3 gap-2">
          <Shortcut onClick={() => void openSite("/3-en-raya")} label="3 en raya" icon={<span className="font-bold"><span style={{ color: "var(--mark-x)" }}>×</span><span style={{ color: "var(--mark-o)" }}>○</span></span>} />
          <Shortcut onClick={() => void openSite("/piedra-papel-tijera")} label="Piedra, papel o tijera" icon="✂️" />
          <Shortcut onClick={() => void openSite("/ranking")} label="Ranking" icon="🏆" />
        </div>
      </section>

      <footer className="mt-auto flex items-center justify-between text-sm">
        <button type="button" onClick={() => void openSite("/")} className="font-medium hover:underline">
          Abrir la web
        </button>
        <button
          type="button"
          onClick={() => void supabase().auth.signOut().then(() => browser.action.setBadgeText({ text: "" }))}
          className="text-muted hover:text-danger"
        >
          Cerrar sesión
        </button>
      </footer>
    </div>
  );
}

function PendingRow({ count, text, onClick }: { count: number; text: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl bg-surface p-2.5 text-left text-sm shadow-soft hover:shadow-lift">
        <span className="tabular grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold text-white" style={{ background: "var(--mark-x)" }}>
          {count}
        </span>
        {text}
      </button>
    </li>
  );
}

function Shortcut({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-surface px-1 py-2.5 text-xs font-medium shadow-soft hover:shadow-lift">
      <span aria-hidden className="text-lg leading-none">
        {icon}
      </span>
      <span className="text-center leading-tight text-balance">{label}</span>
    </button>
  );
}

function MiniBoard() {
  return (
    <span aria-hidden className="grid size-11 shrink-0 grid-cols-2 gap-0.5 rounded-xl bg-white/10 p-1">
      {[2048, 64, 8, 512].map((value) => (
        <span key={value} className="rounded-[4px]" style={{ background: `var(--t${value})` }} />
      ))}
    </span>
  );
}
