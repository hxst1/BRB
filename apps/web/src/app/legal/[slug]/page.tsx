import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { renderMarkdown } from "@/lib/markdown";
import { createClient } from "@/lib/supabase/server";

/** Los tres textos legales, en este orden en las pestañas. */
const DOCUMENTS = [
  { slug: "terminos", label: "Términos" },
  { slug: "privacidad", label: "Privacidad" },
  { slug: "cookies", label: "Cookies" },
] as const;

export function generateStaticParams() {
  return DOCUMENTS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const label = DOCUMENTS.find((doc) => doc.slug === slug)?.label;
  return label ? { title: label, alternates: { canonical: `/legal/${slug}` } } : {};
}

export default function LegalPage({ params }: PageProps<"/legal/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-24 sm:px-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-surface" />}>
        <LegalDocument params={params} />
      </Suspense>
    </main>
  );
}

async function LegalDocument({ params }: { params: PageProps<"/legal/[slug]">["params"] }) {
  const { slug } = await params;
  if (!DOCUMENTS.some((doc) => doc.slug === slug)) notFound();
  const { data: doc } = await (await createClient()).from("legal_documents").select("title, body, updated_at").eq("slug", slug).maybeSingle();
  if (!doc) notFound();

  return (
    <article className="flex flex-col gap-6">
      <nav aria-label="Textos legales" className="flex flex-col gap-4">
        <Link href="/" className="self-start text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          ← Volver al inicio
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
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <header>
        <h1 className="display text-4xl font-bold text-balance sm:text-5xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted">
          Última actualización: {new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(new Date(doc.updated_at))}
        </p>
      </header>

      {/* Texto del panel de admin, pasado por un Markdown que escapa todo el HTML (lib/markdown.ts). */}
      <div className="legal-text" dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.body) }} />
    </article>
  );
}
