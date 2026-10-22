/** 12.840, 3.110… (en español las cifras de 4 dígitos no se agrupan por defecto). */
export function formatNumber(value: number): string {
  return value.toLocaleString("es", { useGrouping: "always" });
}

/** Tiempo de una partida: "45,2 s" o "1:05,3". */
export function formatTime(ms: number): string {
  const tenths = Math.floor(ms / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = Math.floor((tenths % 600) / 10);
  const decimal = tenths % 10;
  return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, "0")},${decimal}` : `${seconds},${decimal} s`;
}
