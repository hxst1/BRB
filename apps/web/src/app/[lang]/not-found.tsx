import Link from "next/link";
import { ErrorScreen } from "@/components/error-screen";
import { getMessages } from "@/lib/i18n/server";

/** 404: la página no existe (o la partida ya no está). */
export default async function NotFound() {
  const m = await getMessages();
  return (
    <ErrorScreen
      code="404"
      monster={{ body: "round", palette: "violet", eyes: "cyclops", mouth: "oh", top: "antenna" }}
      mood="neutral"
      title={m.errors.notFoundTitle}
      body={m.errors.notFoundBody}
    >
      <Link href="/" className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
        {m.common.backHome}
      </Link>
      <Link href="/2048" className="rounded-full border border-line px-5 py-2.5 font-semibold hover:border-muted">
        {m.errors.play}
      </Link>
    </ErrorScreen>
  );
}
