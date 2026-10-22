import type { Locale } from "@/lib/i18n/locales";

/**
 * Formatos de números, tiempos y fechas relativas en cada idioma. Los
 * diccionarios (lib/i18n) los exponen como `m.format`; las funciones sueltas de
 * abajo son las de español, para lo que aún no depende del idioma.
 */
export function makeFormat(locale: Locale) {
  const es = locale === "es";
  return {
    /** 12.840 / 12,840 (en español las cifras de 4 dígitos no se agrupan por defecto). */
    number: (value: number) => value.toLocaleString(locale, { useGrouping: "always" }),
    /** Tiempo de una partida: "45,2 s" o "1:05,3" (en inglés con punto). */
    time: (ms: number) => {
      const tenths = Math.floor(ms / 100);
      const minutes = Math.floor(tenths / 600);
      const seconds = Math.floor((tenths % 600) / 10);
      const decimal = tenths % 10;
      const sep = es ? "," : ".";
      return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, "0")}${sep}${decimal}` : `${seconds}${sep}${decimal} s`;
    },
    /** "hace 5 min" / "5 min ago". */
    ago: (date: string | Date, now = Date.now()) => {
      const minutes = Math.floor((now - new Date(date).getTime()) / 60_000);
      if (minutes < 1) return es ? "hace un momento" : "just now";
      if (minutes < 60) return es ? `hace ${minutes} min` : `${minutes} min ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return es ? `hace ${hours} h` : `${hours} h ago`;
      const days = Math.floor(hours / 24);
      if (es) return days === 1 ? "hace 1 día" : `hace ${days} días`;
      return days === 1 ? "1 day ago" : `${days} days ago`;
    },
    /** Lo que queda hasta una fecha: "5 min", "3 h", "2 días" / "2 days". */
    timeLeft: (until: string | Date, now = Date.now()) => {
      const minutes = Math.max(0, Math.ceil((new Date(until).getTime() - now) / 60_000));
      if (minutes < 60) return `${minutes} min`;
      const hours = Math.round(minutes / 60);
      if (hours < 24) return `${hours} h`;
      const days = Math.round(hours / 24);
      if (es) return days === 1 ? "1 día" : `${days} días`;
      return days === 1 ? "1 day" : `${days} days`;
    },
  };
}

const spanish = makeFormat("es");
export const formatNumber = spanish.number;
export const formatTime = spanish.time;
export const formatAgo = spanish.ago;
export const formatTimeLeft = spanish.timeLeft;
