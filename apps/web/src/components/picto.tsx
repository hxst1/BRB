import { pictoSrc, type Picto } from "@/lib/pictos";

/** Dibujito (lib/pictos) del tamaño del texto que lo rodea. Decorativo: el texto ya dice lo que es. */
export function InlinePicto({ name, className = "" }: { name: Picto; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={pictoSrc(name)} alt="" aria-hidden draggable={false} className={`inline-block size-[1.3em] align-[-0.28em] ${className}`} />
  );
}
