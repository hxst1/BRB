"use client";

import { useParams } from "next/navigation";
import { TextLine, ToggleSkeleton } from "@/components/skeleton";
import { useMessages } from "@/lib/i18n/client";

/**
 * Un texto legal (legal/[slug]) mientras llega: la vuelta al inicio y las
 * pestañas (con la de la página elegida, que se sabe por la ruta), el título,
 * la fecha y unas líneas de texto en gris.
 */
export function LegalSkeleton({ documents }: { documents: readonly { slug: string; key: "terms" | "privacy" | "cookies" }[] }) {
  const m = useMessages();
  const { slug } = useParams<{ slug: string }>();
  return (
    <div aria-hidden inert className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <p className="self-start text-sm text-muted">← {m.common.backHome}</p>
        <ToggleSkeleton
          className="grid auto-cols-fr grid-flow-col"
          item="px-2 py-2 text-center text-sm"
          active={documents.findIndex((doc) => doc.slug === slug)}
          options={documents.map((doc) => m.legal[doc.key])}
        />
      </div>
      <div>
        <TextLine className="display w-3/4 text-4xl sm:text-5xl" />
        <TextLine className="mt-2 w-48 text-sm" />
      </div>
      <div className="flex flex-col leading-[1.6]">
        {Array.from({ length: 12 }, (_, i) => (
          <TextLine key={i} className={i % 4 === 3 ? "mb-[0.9rem] w-2/3" : "w-full"} />
        ))}
      </div>
    </div>
  );
}
