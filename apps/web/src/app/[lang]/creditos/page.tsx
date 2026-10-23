import type { Metadata } from "next";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { alternatesFor } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  return { title: m.legal.credits, alternates: alternatesFor("/creditos", locale) };
}

const link = "underline underline-offset-2 hover:text-ink";

/** De quién son los dibujos y el código ajeno que usa la app, con su licencia (CC BY y CC BY-SA piden citarlos). */
export default async function CreditsPage() {
  const m = await getMessages();
  const t = m.credits;
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-24 sm:px-6">
      <h1 className="display mb-3 text-5xl font-bold sm:text-6xl">{m.legal.credits}</h1>
      <p className="mb-10 text-muted">{t.intro}</p>

      <div className="flex flex-col gap-10">
        <Credit
          title={t.chessTitle}
          body={t.chessBody}
          images={["/chess/rk.svg", "/chess/rn.svg", "/chess/bq.svg", "/chess/bp.svg"]}
          author={{ name: "neverRare", href: "https://github.com/neverRare" }}
          license={{ name: "CC BY 4.0", href: "https://creativecommons.org/licenses/by/4.0/" }}
          files={["/chess/LICENSE.txt"]}
          labels={t}
        />
        <Credit
          title={t.openmojiTitle}
          body={t.openmojiBody}
          images={["/rps/rock-x.svg", "/rps/spock-o.svg", "/icons/pong.svg", "/icons/minesweeper.svg", "/icons/friend.svg"]}
          author={{ name: "OpenMoji", href: "https://openmoji.org" }}
          license={{ name: "CC BY-SA 4.0", href: "https://creativecommons.org/licenses/by-sa/4.0/" }}
          files={["/rps/LICENSE.txt", "/icons/LICENSE.txt"]}
          labels={t}
        />
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">{t.ownTitle}</h2>
          <p className="text-muted">{t.ownBody}</p>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">{t.codeTitle}</h2>
          <p className="text-muted">
            {t.chessJs}{" "}
            <a href="https://github.com/jhlywa/chess.js" target="_blank" rel="noopener noreferrer" className={link}>
              chess.js
            </a>{" "}
            (
            <a href="https://opensource.org/license/bsd-2-clause" target="_blank" rel="noopener noreferrer" className={link}>
              BSD 2-Clause
            </a>
            )
          </p>
        </section>
      </div>
    </main>
  );
}

function Credit({
  title,
  body,
  images,
  author,
  license,
  files,
  labels,
}: {
  title: string;
  body: string;
  images: string[];
  author: { name: string; href: string };
  license: { name: string; href: string };
  /** Los LICENSE.txt que van con los archivos: qué se ha cambiado de cada uno. */
  files: string[];
  labels: { license: string; files: string };
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div aria-hidden className="flex flex-wrap gap-2">
        {images.map((src) => (
          <span key={src} className="grid size-14 place-items-center rounded-2xl" style={{ background: "var(--cell)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="size-10" />
          </span>
        ))}
      </div>
      <p className="text-muted">{body}</p>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <a href={author.href} target="_blank" rel="noopener noreferrer" className={link}>
          {author.name}
        </a>
        <span>
          {labels.license}:{" "}
          <a href={license.href} target="_blank" rel="noopener noreferrer" className={link}>
            {license.name}
          </a>
        </span>
        <span>
          {labels.files}:{" "}
          {files.map((file, i) => (
            <span key={file}>
              {i > 0 && ", "}
              <a href={file} className={link}>
                {file.slice(1)}
              </a>
            </span>
          ))}
        </span>
      </p>
    </section>
  );
}
