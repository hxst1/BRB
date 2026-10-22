import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PART_OPTIONS, type MonsterParts } from "@repo/avatars";
import { Avatar } from "@repo/ui/avatar";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = { title: "Bribones", robots: PRIVATE_PAGE };

/** Galería para revisar el generador. Solo en desarrollo. */
export default function MonstersPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const seeds = Array.from({ length: 48 }, (_, i) => ((i + 1) * 2654435761) >>> 0);
  const sample: MonsterParts = { body: "round", palette: "violet", eyes: "two", mouth: "fangs", top: "horns", cheeks: true };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
      <h1 className="display mb-8 text-6xl font-bold">Bribones</h1>

      <h2 className="mb-4 text-xl font-semibold">Al azar</h2>
      <ul className="grid grid-cols-4 gap-6 sm:grid-cols-6 lg:grid-cols-8">
        {seeds.map((seed) => (
          <li key={seed} className="grid place-items-center">
            <Avatar seed={seed} size={88} />
          </li>
        ))}
      </ul>

      <h2 className="mt-14 mb-4 text-xl font-semibold">Tamaños reales</h2>
      <div className="flex flex-wrap items-center gap-4">
        {seeds.slice(0, 12).map((seed) => (
          <span key={seed} className="flex items-center gap-2 rounded-full bg-surface py-1 pr-3 pl-1 text-sm shadow-soft">
            <Avatar seed={seed} size={28} />
            jugador
          </span>
        ))}
      </div>

      <h2 className="mt-14 mb-4 text-xl font-semibold">Estados de ánimo</h2>
      <div className="flex gap-6">
        {(["neutral", "happy", "sad"] as const).map((mood) => (
          <Avatar key={mood} seed={7} parts={{ ...sample }} size={120} mood={mood} label={mood} />
        ))}
      </div>

      <h2 className="mt-14 mb-4 text-xl font-semibold">Exclusivos de supporter</h2>
      <div className="flex gap-6">
        <Avatar seed={1} parts={{ ...sample, palette: "gold", top: "crown" }} size={120} />
        <Avatar seed={2} parts={{ ...sample, body: "ghost", palette: "night", top: "crown", eyes: "cyclops" }} size={120} />
      </div>

      <h2 className="mt-14 mb-4 text-xl font-semibold">Gafas con cada tipo de ojos</h2>
      <div className="flex flex-wrap gap-4">
        {PART_OPTIONS.eyes.map((eyes) =>
          PART_OPTIONS.body.map((body) => (
            <figure key={`${eyes}-${body}`} className="flex flex-col items-center gap-1">
              <Avatar seed={4} parts={{ ...sample, body, eyes, top: "sunglasses" }} size={72} />
              <figcaption className="text-xs text-muted">
                {eyes}/{body}
              </figcaption>
            </figure>
          )),
        )}
      </div>

      <h2 className="mt-14 mb-4 text-xl font-semibold">Degradados con cada cuerpo</h2>
      <div className="flex flex-wrap gap-4">
        {(["rainbow", "galaxy"] as const).map((palette) =>
          PART_OPTIONS.body.map((body) => (
            <Avatar key={`${palette}-${body}`} seed={5} parts={{ ...sample, body, palette, top: "ears" }} size={88} label={`${palette}/${body}`} />
          )),
        )}
      </div>

      <h2 className="mt-14 mb-4 text-xl font-semibold">Todas las partes</h2>
      {(["body", "eyes", "mouth", "top"] as const).map((slot) => (
        <div key={slot} className="mb-6">
          <p className="mb-2 text-sm text-muted">{slot}</p>
          <div className="flex flex-wrap gap-4">
            {(PART_OPTIONS[slot] as string[]).map((id) => (
              <figure key={id} className="flex flex-col items-center gap-1">
                <Avatar seed={3} parts={{ ...sample, [slot]: id }} size={80} />
                <figcaption className="text-xs text-muted">{id}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
