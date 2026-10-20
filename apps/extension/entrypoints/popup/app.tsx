import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { browser } from "wxt/browser";
import { brand } from "@repo/brand";
import { supabase } from "@/lib/supabase";
import { Home } from "@/components/home";
import { SignIn } from "@/components/sign-in";
import { QuickGame } from "@/components/quick-game";

type View = "home" | "2048";

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [view, setView] = useState<View>("home");

  useEffect(() => {
    const client = supabase();
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      void browser.runtime.sendMessage("refresh-badge").catch(() => undefined);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="flex min-h-[480px] flex-col gap-4 bg-bg p-4 text-ink">
      <header className="flex items-center justify-between">
        <span className="display text-2xl font-bold">{brand.name}</span>
        {view === "2048" && (
          <button type="button" onClick={() => setView("home")} className="text-sm text-muted hover:text-ink">
            Volver
          </button>
        )}
      </header>

      {session === undefined ? (
        <div className="h-40 animate-pulse rounded-3xl bg-line/40" />
      ) : session === null ? (
        <SignIn />
      ) : view === "2048" ? (
        <QuickGame accessToken={session.access_token} />
      ) : (
        <Home userId={session.user.id} onPlay2048={() => setView("2048")} />
      )}
    </div>
  );
}
