/**
 * Carrera de tecleo. Los dos jugadores escriben el mismo texto a la vez y
 * gana quien lo acaba antes. El texto sale de la semilla de la partida (su
 * id), así que el servidor lo puede rehacer para comprobar lo que le llega.
 *
 * Las palabras no llevan tildes ni eñes: cuestan distinto según el teclado y
 * la carrera tiene que ser justa.
 */

import { createRng, nextInt, seedFromString } from "../rng";

export type Language = "es" | "en";

/** Palabras de cada texto. */
export const WORD_COUNT = 24;
/**
 * Lo mínimo que se puede tardar por letra: 50 ms son 240 palabras por minuto,
 * más de lo que nadie mantiene en un texto entero. Lo que llegue más rápido no
 * se ha tecleado.
 */
export const MIN_MS_PER_CHAR = 50;
/** Cuenta atrás desde que estáis los dos hasta que se puede escribir. */
export const COUNTDOWN_MS = 3000;

const WORDS: Record<Language, readonly string[]> = {
  es: [
    "casa", "perro", "gato", "mesa", "silla", "agua", "fuego", "tierra", "cielo", "nube",
    "sol", "luna", "mar", "playa", "monte", "rio", "bosque", "arbol", "flor", "hoja",
    "libro", "papel", "lapiz", "mapa", "puerta", "ventana", "calle", "ciudad", "pueblo", "plaza",
    "tren", "barco", "coche", "moto", "bici", "viaje", "tiempo", "hora", "noche", "tarde",
    "verde", "rojo", "azul", "negro", "blanco", "gris", "claro", "oscuro", "grande", "corto",
    "largo", "nuevo", "viejo", "rapido", "lento", "fuerte", "suave", "dulce", "salado", "frio",
    "caliente", "alto", "bajo", "lejos", "cerca", "siempre", "nunca", "luego", "ahora", "pronto",
    "comer", "beber", "correr", "saltar", "nadar", "leer", "escribir", "cantar", "bailar", "jugar",
    "pensar", "mirar", "buscar", "llevar", "volver", "abrir", "cerrar", "subir", "bajar", "dormir",
    "amigo", "familia", "nombre", "mundo", "juego", "partida", "punto", "letra", "tecla", "raton",
    "pantalla", "musica", "pelota", "carta", "dado", "reloj", "camino", "puente", "torre", "isla",
    "pan", "queso", "fruta", "limon", "naranja", "manzana", "tomate", "arroz", "sopa", "cafe",
    "verano", "invierno", "otono", "lunes", "viernes", "domingo", "fiesta", "regalo", "sorpresa", "idea",
    "piedra", "arena", "viento", "lluvia", "nieve", "estrella", "planeta", "cohete", "robot", "dragon",
    "tigre", "oso", "lobo", "zorro", "conejo", "pato", "pez", "caballo", "vaca", "abeja",
  ],
  en: [
    "house", "dog", "cat", "table", "chair", "water", "fire", "earth", "sky", "cloud",
    "sun", "moon", "sea", "beach", "hill", "river", "forest", "tree", "flower", "leaf",
    "book", "paper", "pencil", "map", "door", "window", "street", "city", "town", "square",
    "train", "boat", "car", "bike", "trip", "time", "hour", "night", "evening", "morning",
    "green", "red", "blue", "black", "white", "grey", "light", "dark", "big", "short",
    "long", "new", "old", "fast", "slow", "strong", "soft", "sweet", "salty", "cold",
    "hot", "tall", "low", "far", "near", "always", "never", "later", "now", "soon",
    "eat", "drink", "run", "jump", "swim", "read", "write", "sing", "dance", "play",
    "think", "look", "find", "carry", "return", "open", "close", "climb", "drop", "sleep",
    "friend", "family", "name", "world", "game", "match", "point", "letter", "key", "mouse",
    "screen", "music", "ball", "card", "dice", "clock", "road", "bridge", "tower", "island",
    "bread", "cheese", "fruit", "lemon", "orange", "apple", "tomato", "rice", "soup", "coffee",
    "summer", "winter", "autumn", "monday", "friday", "sunday", "party", "gift", "surprise", "idea",
    "stone", "sand", "wind", "rain", "snow", "star", "planet", "rocket", "robot", "dragon",
    "tiger", "bear", "wolf", "fox", "rabbit", "duck", "fish", "horse", "cow", "bee",
  ],
};

/** El texto de la carrera: palabras al azar (sin repetir una seguida de sí misma), separadas por espacios. */
export function raceText(seed: string, language: Language, count = WORD_COUNT): string {
  const list = WORDS[language];
  let rng = createRng(seedFromString(`typing:${seed}`));
  const words: string[] = [];
  while (words.length < count) {
    const [index, next] = nextInt(rng, list.length);
    rng = next;
    const word = list[index]!;
    if (word !== words.at(-1)) words.push(word);
  }
  return words.join(" ");
}

/** Cuántas letras del principio están bien escritas. */
export function correctPrefix(typed: string, text: string): number {
  let i = 0;
  while (i < typed.length && i < text.length && typed[i] === text[i]) i++;
  return i;
}

/** Palabras por minuto, contando cinco letras por palabra como es costumbre. */
export function wordsPerMinute(chars: number, ms: number): number {
  if (ms <= 0) return 0;
  return Math.round(chars / 5 / (ms / 60000));
}

/** ¿Se puede haber tecleado este texto en este tiempo? */
export function plausibleTime(text: string, ms: number): boolean {
  return ms >= text.length * MIN_MS_PER_CHAR;
}
