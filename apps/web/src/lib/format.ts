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

/** "hace un momento", "hace 5 min", "hace 3 h", "hace 2 días". */
export function formatAgo(date: string | Date, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(date).getTime()) / 60_000);
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "hace 1 día" : `hace ${days} días`;
}

/** Lo que queda hasta una fecha: "5 min", "3 h", "2 días". */
export function formatTimeLeft(until: string | Date, now = Date.now()): string {
  const minutes = Math.max(0, Math.ceil((new Date(until).getTime() - now) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 día" : `${days} días`;
}
