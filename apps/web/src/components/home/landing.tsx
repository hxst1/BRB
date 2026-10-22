import { brand } from "@repo/brand";
import { JsonLd } from "@/components/seo/json-ld";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { absoluteUrl, guidesFor, homeFaq } from "@/lib/seo";
import { GameCards } from "./game-cards";
import { SignupButtons, SignupPerks } from "./signup-pitch";

export async function Landing() {
  const locale = await getLocale();
  const m = await getMessages();
  const faq = homeFaq(locale);
  return (
    <>
      <h1 className="display max-w-xl text-6xl font-bold text-balance sm:text-8xl">{m.landing.tagline}</h1>
      <p className="mt-5 max-w-md text-lg text-muted">
        {m.landing.intro}
      </p>
      <SignupButtons />
      <div className="mt-16">
        <GameCards />
      </div>

      <div className="mt-16">
        <SignupPerks />
      </div>

      <section aria-labelledby="faq-title" className="mt-20 flex max-w-2xl flex-col gap-1">
        <h2 id="faq-title" className="mb-2 text-xl font-semibold">
          {m.howTo.faq}
        </h2>
        {faq.map(({ q, a }) => (
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
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${absoluteUrl("/")}#website`,
              name: brand.name,
              alternateName: brand.expansion,
              url: absoluteUrl("/"),
              description: m.landing.description,
              inLanguage: locale,
            },
            {
              "@type": "ItemList",
              name: m.landing.gamesOf(brand.name),
              itemListElement: guidesFor(locale).map((game, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: absoluteUrl(game.path),
                name: game.name,
              })),
            },
            {
              "@type": "FAQPage",
              mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
            },
          ],
        }}
      />
    </>
  );
}
