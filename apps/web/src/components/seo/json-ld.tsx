/**
 * Datos estructurados (schema.org) para buscadores y asistentes. Se escapa `<`
 * para que ningún texto pueda cerrar la etiqueta <script>.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
