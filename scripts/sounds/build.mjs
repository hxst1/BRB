// Genera los sonidos de la app (apps/web/public/sounds/*.wav) con síntesis
// simple: tonos suaves y cortos, sin muestras de terceros. Deterministas:
// mismo código, mismos archivos. Se ejecuta con `node scripts/sounds/build.mjs`.
import { writeFileSync } from "node:fs";

const RATE = 22050;
const OUT = "apps/web/public/sounds";

/** Nota musical a frecuencia (A4 = 440 Hz). */
const note = (name) => {
  const [, letter, octave] = name.match(/^([A-G]#?)(\d)$/);
  const semis = { C: -9, "C#": -8, D: -7, "D#": -6, E: -5, F: -4, "F#": -3, G: -2, "G#": -1, A: 0, "A#": 1, B: 2 }[letter];
  return 440 * 2 ** ((semis + (octave - 4) * 12) / 12);
};

/**
 * Un tono con envolvente (ataque corto y caída exponencial) y, si se pide, un
 * deslizamiento de frecuencia. `bell` añade armónicos suaves (suena a campanita).
 */
function tone({ from, to = from, at = 0, dur, gain = 0.5, wave = "sine", attack = 0.006, bell = 0 }) {
  return (samples) => {
    const start = Math.round(at * RATE);
    const length = Math.round(dur * RATE);
    let phase = 0;
    for (let i = 0; i < length && start + i < samples.length; i++) {
      const t = i / length;
      const freq = from * (to / from) ** t;
      phase += (2 * Math.PI * freq) / RATE;
      const env = Math.min(1, i / (attack * RATE)) * Math.exp(-4.5 * t);
      let v = wave === "triangle" ? (2 / Math.PI) * Math.asin(Math.sin(phase)) : Math.sin(phase);
      if (bell) v += bell * Math.sin(phase * 2) * Math.exp(-6 * t) + bell * 0.5 * Math.sin(phase * 3) * Math.exp(-9 * t);
      samples[start + i] += v * env * gain;
    }
  };
}

/** Ruido suave filtrado (un roce, como una carta que se desliza). */
function rustle({ at = 0, dur, gain = 0.25, seed = 7 }) {
  return (samples) => {
    let x = seed;
    let low = 0;
    const start = Math.round(at * RATE);
    const length = Math.round(dur * RATE);
    for (let i = 0; i < length && start + i < samples.length; i++) {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      const white = (x / 0x7fffffff) * 2 - 1;
      low += 0.35 * (white - low);
      const t = i / length;
      const env = Math.min(1, i / (0.004 * RATE)) * Math.exp(-5 * t);
      samples[start + i] += (white - low) * env * gain;
    }
  };
}

/** Sonidos: nombre, para qué se usa (lo lee el panel de admin) y cómo se hace. */
const SOUNDS = {
  tap: { use: "Mover o colocar algo: casilla, ficha, número.", parts: [tone({ from: 1050, to: 900, dur: 0.05, gain: 0.4 })] },
  pop: { use: "Algo bueno y pequeño: juntar fichas, tocar un barco, subir una carta.", parts: [tone({ from: 520, to: 1100, dur: 0.09, gain: 0.45 }), tone({ from: 1040, to: 1600, dur: 0.05, gain: 0.12 })] },
  eat: { use: "Snake: comer una manzana.", parts: [tone({ from: note("E5"), dur: 0.06, gain: 0.4 }), tone({ from: note("B5"), at: 0.05, dur: 0.08, gain: 0.4 })] },
  flip: { use: "Solitario: robar o mover una carta.", parts: [rustle({ dur: 0.07, gain: 0.22 }), tone({ from: 1700, to: 1400, dur: 0.03, gain: 0.08 })] },
  error: { use: "Algo que no vale: una carta sin sitio, una reina que choca.", parts: [tone({ from: 240, to: 190, dur: 0.12, gain: 0.35, wave: "triangle" })] },
  turn: { use: "Te toca: tu rival ha movido.", parts: [tone({ from: note("A5"), dur: 0.22, gain: 0.35, bell: 0.25 }), tone({ from: note("E5"), at: 0.16, dur: 0.32, gain: 0.35, bell: 0.25 })] },
  level: { use: "Nivel superado (Lights Out) o algo completado.", parts: ["C5", "E5", "G5"].map((n, i) => tone({ from: note(n), at: i * 0.07, dur: 0.12, gain: 0.32, wave: "triangle" })).concat(tone({ from: note("C6"), at: 0.21, dur: 0.25, gain: 0.3, bell: 0.2 })) },
  win: { use: "Partida ganada o resuelta.", parts: ["C5", "E5", "G5", "C6"].map((n, i) => tone({ from: note(n), at: i * 0.09, dur: 0.16, gain: 0.32, wave: "triangle" })).concat(tone({ from: note("E6"), at: 0.36, dur: 0.45, gain: 0.25, bell: 0.3 }), tone({ from: note("G6"), at: 0.44, dur: 0.4, gain: 0.12, bell: 0.2 })) },
  lose: { use: "Partida perdida (sin dramas: suave).", parts: ["G4", "E4", "C4"].map((n, i) => tone({ from: note(n), to: note(n) * 0.97, at: i * 0.13, dur: 0.2, gain: 0.3, wave: "triangle" })) },
  beep: { use: "Cuenta atrás de las partidas en directo.", parts: [tone({ from: note("E5"), dur: 0.09, gain: 0.32 })] },
  go: { use: "¡Ya! Empieza la partida en directo.", parts: [tone({ from: note("B5"), dur: 0.2, gain: 0.32, bell: 0.2 })] },
};

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const manifest = [];
for (const [name, { use, parts }] of Object.entries(SOUNDS)) {
  const samples = new Float32Array(Math.round(RATE * 1.0));
  for (const part of parts) part(samples);
  // Hasta donde suena (sin el silencio del final) y a un volumen igual para todos.
  let end = samples.length;
  while (end > 0 && Math.abs(samples[end - 1]) < 0.002) end--;
  const trimmed = samples.slice(0, end + Math.round(RATE * 0.01));
  const peak = trimmed.reduce((max, v) => Math.max(max, Math.abs(v)), 0) || 1;
  for (let i = 0; i < trimmed.length; i++) trimmed[i] *= 0.6 / peak;
  writeFileSync(`${OUT}/${name}.wav`, wav(trimmed));
  manifest.push({ name, file: `/sounds/${name}.wav`, use, seconds: Number((trimmed.length / RATE).toFixed(2)) });
}
writeFileSync(`${OUT}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Sonidos generados: ${manifest.map((s) => s.name).join(", ")}`);
