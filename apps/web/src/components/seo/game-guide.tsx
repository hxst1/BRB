import { brand } from "@repo/brand";
import { absoluteUrl, gameGuide } from "@/lib/seo";
import { JsonLd } from "./json-ld";
import { getLocale, getMessages } from "@/lib/i18n/server";

/**
 * "Cómo se juega" debajo de cada juego: reglas y preguntas frecuentes, a la
 * vista y como datos estructurados (VideoGame + FAQPage).
 */
export async function GameGuideSection({ id }: { id: string }) {
  const locale = await getLocale();
  const m = await getMessages();
  const game = gameGuide(id, locale);
  const url = absoluteUrl(game.path);

  return (
    <section aria-labelledby="guide-title" className="mt-16 flex max-w-2xl flex-col gap-6 border-t border-line pt-8">
      <div className="flex flex-col gap-3">
        <h2 id="guide-title" className="text-xl font-semibold">
          {m.howTo.howToPlayGame(game.name)}
        </h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-muted marker:text-ink">
          {game.howTo.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="mb-2 text-xl font-semibold">{m.howTo.faq}</h2>
        {game.faq.map(({ q, a }) => (
          <details key={q} className="group border-b border-line py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
              {q}
              <span aria-hidden className="text-muted transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 text-muted">{a}</p>
          </details>
        ))}
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "VideoGame",
              "@id": `${url}#game`,
              name: game.name,
              description: game.description,
              url,
              image: absoluteUrl(`${game.path}/opengraph-image`),
              inLanguage: locale,
              genre: game.genre,
              gamePlatform: [m.howTo.webBrowser, "Android", "iOS"],
              applicationCategory: "GameApplication",
              operatingSystem: m.howTo.anyOs,
              playMode: game.mode === "solo" ? "SinglePlayer" : "MultiPlayer",
              numberOfPlayers: game.mode === "solo" ? 1 : 2,
              isAccessibleForFree: true,
              offers: { "@type": "Offer", price: 0, priceCurrency: "EUR" },
              isPartOf: { "@type": "WebSite", name: brand.name, url: absoluteUrl("/") },
            },
            {
              "@type": "FAQPage",
              mainEntity: game.faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: brand.name, item: absoluteUrl("/") },
                { "@type": "ListItem", position: 2, name: game.name, item: url },
              ],
            },
          ],
        }}
      />
    </section>
  );
}
