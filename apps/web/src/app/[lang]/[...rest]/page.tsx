import { notFound } from "next/navigation";

/** Cualquier dirección que no es una página: así se ve el 404 propio (app/[lang]/not-found.tsx) y no el de Next. */
export default function UnknownPage() {
  notFound();
}
