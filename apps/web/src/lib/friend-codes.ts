/**
 * Palabras de 5 letras o cifras de un texto: candidatas a código de amigo (se
 * comprueban luego en la base de datos). Para asignar un pago de Ko-fi o una
 * colaboración en GitHub a quien escribió su código.
 */
export function codesIn(text: unknown): string[] {
  if (typeof text !== "string") return [];
  return [...new Set(text.toUpperCase().match(/(?<![0-9A-Z])[0-9A-Z]{5}(?![0-9A-Z])/g) ?? [])];
}
