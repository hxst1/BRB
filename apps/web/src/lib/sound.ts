/**
 * Sonidos de los juegos: cortos, suaves y a poco volumen. Se generan con
 * scripts/sounds/build.mjs (public/sounds; el panel de admin lee su
 * manifest.json). Se pueden silenciar: el botón del altavoz de cada juego o
 * Ajustes; se recuerda en el navegador.
 */

export const SOUNDS = ["tap", "pop", "eat", "flip", "error", "turn", "level", "win", "lose", "beep", "go"] as const;
export type Sound = (typeof SOUNDS)[number];

const MUTED_KEY = "sound:muted";
/** Volumen general: los sonidos acompañan, no protagonizan. */
const VOLUME = 0.35;

let context: AudioContext | null = null;
const buffers = new Map<Sound, Promise<AudioBuffer | null>>();
const listeners = new Set<() => void>();

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    if (muted) localStorage.setItem(MUTED_KEY, "1");
    else localStorage.removeItem(MUTED_KEY);
  } catch {
    // Sin almacenamiento: vale para esta visita.
  }
  listeners.forEach((listener) => listener());
}

/** Para useSyncExternalStore: el botón del altavoz se entera de los cambios. */
export function subscribeMuted(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => event.key === MUTED_KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function load(name: Sound, ctx: AudioContext): Promise<AudioBuffer | null> {
  let buffer = buffers.get(name);
  if (!buffer) {
    buffer = fetch(`/sounds/${name}.wav`)
      .then((response) => response.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .catch(() => null);
    buffers.set(name, buffer);
  }
  return buffer;
}

/**
 * Suena `name` (si no está silenciado). `pitch` lo sube o baja un poco (p. ej.
 * fichas más altas, nota más aguda). Nunca falla: sin audio, simplemente no suena.
 */
export function playSound(name: Sound, { volume = 1, pitch = 1 }: { volume?: number; pitch?: number } = {}) {
  if (typeof window === "undefined" || isMuted()) return;
  try {
    context ??= new AudioContext();
    const ctx = context;
    // El navegador lo deja en pausa hasta que se toca la página: se reanuda al primer sonido.
    if (ctx.state === "suspended") void ctx.resume();
    void load(name, ctx).then((buffer) => {
      if (!buffer || isMuted()) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = pitch;
      const gain = ctx.createGain();
      gain.gain.value = VOLUME * volume;
      source.connect(gain).connect(ctx.destination);
      source.start();
    });
  } catch {
    // Sin Web Audio: sin sonido.
  }
}
