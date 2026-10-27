import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LegalSkeleton } from "@/components/legal-skeleton";
import { renderMarkdown } from "@/lib/markdown";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { alternatesFor } from "@/lib/seo";

/** Los tres textos legales, en este orden en las pestañas. */
const DOCUMENTS = [
  { slug: "terminos", label: "Términos", key: "terms" },
  { slug: "privacidad", label: "Privacidad", key: "privacy" },
  { slug: "cookies", label: "Cookies", key: "cookies" },
] as const;

export function generateStaticParams() {
  return DOCUMENTS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/legal/[slug]">): Promise<Metadata> {
  const [{ slug }, m, locale] = await Promise.all([params, getMessages(), getLocale()]);
  const doc = DOCUMENTS.find((item) => item.slug === slug);
  return doc ? { title: m.legal[doc.key], alternates: alternatesFor(`/legal/${slug}`, locale) } : {};
}

export default function LegalPage({ params, searchParams }: PageProps<"/[lang]/legal/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-24 sm:px-6">
      <Suspense fallback={<LegalSkeleton documents={DOCUMENTS} />}>
        <LegalDocument params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/**
 * El texto que vale es el español. En otro idioma se muestra su traducción (si
 * la hay) avisando de ello, y con ?original el texto español.
 */
async function LegalDocument({
  params,
  searchParams,
}: {
  params: PageProps<"/[lang]/legal/[slug]">["params"];
  searchParams: PageProps<"/[lang]/legal/[slug]">["searchParams"];
}) {
  const [{ slug }, { original }, m, locale, supabase] = await Promise.all([params, searchParams, getMessages(), getLocale(), createClient()]);
  if (!DOCUMENTS.some((doc) => doc.slug === slug)) notFound();
  const [{ data: spanish }, { data: translation }] = await Promise.all([
    supabase.from("legal_documents").select("title, body, updated_at").eq("slug", slug).maybeSingle(),
    locale === "es" || original !== undefined
      ? Promise.resolve({ data: null })
      : supabase.from("legal_translations").select("title, body, updated_at").eq("slug", slug).eq("lang", locale).maybeSingle(),
  ]);
  if (!spanish) notFound();
  const doc = translation ?? spanish;

  return (
    <article className="flex flex-col gap-6">
      <nav aria-label={m.legal.title} className="flex flex-col gap-4">
        <Link href="/" className="self-start text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          ← {m.common.backHome}
        </Link>
        <div className="grid grid-flow-col auto-cols-fr rounded-full bg-line/60 p-1">
          {DOCUMENTS.map((item) => (
            <Link
              key={item.slug}
              href={`/legal/${item.slug}`}
              aria-current={item.slug === slug ? "page" : undefined}
              className={`rounded-full px-2 py-2 text-center text-sm transition-colors ${
                item.slug === slug ? "bg-surface font-medium shadow-soft" : "text-muted hover:text-ink"
              }`}
            >
              {m.legal[item.key]}
            </Link>
          ))}
        </div>
      </nav>

      <header>
        <h1 className="display text-4xl font-bold text-balance sm:text-5xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted">
          {m.legal.updated(new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(doc.updated_at)))}
        </p>
        {locale !== "es" && (
          <p className="mt-3 rounded-2xl p-3 text-sm" style={{ background: "var(--cell)" }}>
            {translation ? m.legal.translationNotice : original !== undefined ? m.legal.originalNotice : m.legal.onlySpanish}{" "}
            {translation ? (
              <Link href={`/legal/${slug}?original`} className="font-medium underline underline-offset-4">
                {m.legal.readOriginal}
              </Link>
            ) : (
              original !== undefined && (
                <Link href={`/legal/${slug}`} className="font-medium underline underline-offset-4">
                  {m.legal.readTranslation}
                </Link>
              )
            )}
          </p>
        )}
      </header>

      {/* Texto del panel de admin, pasado por un Markdown que escapa todo el HTML (lib/markdown.ts). */}
      <div className="legal-text" dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.body) }} />
    </article>
  );
}
