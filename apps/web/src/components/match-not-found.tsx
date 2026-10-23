"use client";

import Link from "next/link";
import { ErrorScreen } from "@/components/error-screen";
import { useMessages } from "@/lib/i18n/client";

/** La partida no existe (la retiraron, caducó o no es tuya): como un 404, dentro de la página del juego. */
export function MatchNotFound({ path }: { path: string }) {
  const m = useMessages();
  return (
    <ErrorScreen
      inline
      code="404"
      monster={{ body: "bean", palette: "mint", eyes: "odd", mouth: "oh", top: "tuft" }}
      mood="neutral"
      title={m.match.notFound}
      body={m.match.notFoundBody}
    >
      <Link href={path} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
        {m.match.seeYours}
      </Link>
      <Link href="/" className="rounded-full border border-line px-5 py-2.5 font-semibold hover:border-muted">
        {m.common.backHome}
      </Link>
    </ErrorScreen>
  );
}
