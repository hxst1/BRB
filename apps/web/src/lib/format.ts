/** 12.840, 3.110… (en español las cifras de 4 dígitos no se agrupan por defecto). */
export function formatNumber(value: number): string {
  return value.toLocaleString("es", { useGrouping: "always" });
}
