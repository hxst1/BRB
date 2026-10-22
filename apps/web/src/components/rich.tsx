import { Fragment } from "react";

/** Texto de los diccionarios con **negritas** (lo único que se marca dentro de un texto traducido). */
export function Rich({ text }: { text: string }) {
  return text.split("**").map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>));
}
