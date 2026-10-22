import type { Metadata } from "next";
import { brand, siteUrl } from "@repo/brand";

/**
 * Textos para buscadores y asistentes (Google, Bing, ChatGPT, Perplexity…):
 * título y descripción de cada juego, cómo se juega y preguntas frecuentes.
 * Salen en la propia página (sección "Cómo se juega"), en los datos
 * estructurados (JSON-LD), en el sitemap, en /llms.txt y en las imágenes para
 * compartir. Tienen que describir el juego tal y como es.
 */

export type GameGuide = {
  id: string;
  path: string;
  name: string;
  /** Título de la pestaña y del resultado de búsqueda (sin el nombre de la app). */
  title: string;
  /** Descripción para buscadores: 120-160 caracteres. */
  description: string;
  /** Frase corta para la imagen al compartir. */
  tagline: string;
  mode: "solo" | "friends";
  genre: string;
  howTo: string[];
  faq: { q: string; a: string }[];
  /** Color de la imagen al compartir (de la paleta de la app). */
  accent: string;
  /**
   * Cuándo se publicó. Al añadir un juego, pon la fecha del día: a quien ya
   * tenía cuenta le saldrá el aviso de "juego nuevo" (components/news).
   */
  addedAt: string;
};

const NO_DOWNLOAD = "No. Se juega en el navegador, en el móvil o en el ordenador. Si quieres, puedes añadirla a la pantalla de inicio como una app.";

export const GAME_GUIDES: GameGuide[] = [
  {
    id: "2048",
    addedAt: "2026-10-20T11:12:40+02:00",
    path: "/2048",
    name: "2048",
    title: "2048 online gratis",
    description: "Juega al 2048 gratis en el navegador: desliza, junta fichas iguales hasta llegar a 2048 y compite en el ranking y en el reto diario.",
    tagline: "Junta fichas hasta llegar a 2048",
    mode: "solo",
    genre: "Puzle",
    accent: "#845ef7",
    howTo: [
      "Desliza (o usa las flechas del teclado) para mover todas las fichas hacia un lado.",
      "Dos fichas con el mismo número se juntan en una con la suma: 2 y 2 hacen 4, 4 y 4 hacen 8…",
      "Tras cada movimiento aparece una ficha nueva. La partida acaba cuando no puedes moverte.",
      "Tu puntuación es la suma de todas las fichas que has juntado. Intenta llegar a 2048 y seguir.",
    ],
    faq: [
      { q: "¿Hay un 2048 diario?", a: "Sí. Los lunes el reto diario es de 2048: todo el mundo juega la misma partida, con un solo intento y su propio ranking. El resto de días toca otro juego." },
      { q: "¿Puedo retar a un amigo?", a: "Sí. Al terminar una partida puedes retar a un amigo a superar tu puntuación." },
      { q: "¿Hay que descargar algo?", a: NO_DOWNLOAD },
    ],
  },
  {
    id: "snake",
    addedAt: "2026-10-20T14:36:02+02:00",
    path: "/snake",
    name: "Snake",
    title: "Snake online gratis",
    description: "Juega al Snake clásico gratis en el navegador: come manzanas, crece sin chocar y sube en el ranking. Funciona en el móvil y en el ordenador.",
    tagline: "Come sin chocar, cada vez más rápido",
    mode: "solo",
    genre: "Arcade",
    accent: "#40c057",
    howTo: [
      "Mueve la serpiente con las flechas, con WASD o deslizando el dedo.",
      "Cada manzana suma 10 puntos y te hace más larga.",
      "Pierdes si chocas contra una pared o contra tu propio cuerpo.",
    ],
    faq: [
      { q: "¿Cómo se juega en el móvil?", a: "Desliza el dedo hacia donde quieras girar." },
      { q: "¿Hay que descargar algo?", a: NO_DOWNLOAD },
    ],
  },
  {
    id: "lights-out",
    addedAt: "2026-10-20T17:44:48+02:00",
    path: "/lights-out",
    name: "Lights Out",
    title: "Lights Out online gratis",
    description: "Juega a Lights Out gratis: pulsa las luces para apagarlas todas, nivel a nivel, con un número limitado de pulsaciones. Un puzle de lógica.",
    tagline: "Apágalo todo, nivel a nivel",
    mode: "solo",
    genre: "Puzle de lógica",
    accent: "#fab005",
    howTo: [
      "Al pulsar una luz cambian ella y sus vecinas de arriba, abajo, izquierda y derecha.",
      "Apaga todas las luces para pasar al siguiente nivel.",
      "Cada nivel tiene un límite de pulsaciones, y el tablero crece cada dos niveles.",
      "Tu puntuación son los niveles superados en una partida.",
    ],
    faq: [
      { q: "¿Todos los niveles tienen solución?", a: "Sí. Cada nivel se genera desde un tablero apagado, así que siempre se puede resolver dentro del límite." },
      { q: "¿Hay que descargar algo?", a: NO_DOWNLOAD },
    ],
  },
  {
    id: "minesweeper",
    addedAt: "2026-10-22T08:11:02+02:00",
    path: "/buscaminas",
    name: "Buscaminas",
    title: "Buscaminas online gratis",
    description: "Juega al Buscaminas clásico gratis en el navegador, en fácil, medio o difícil. Despeja el tablero sin pisar una mina y compite por el mejor tiempo.",
    tagline: "Despeja el tablero contra el reloj",
    mode: "solo",
    genre: "Puzle de lógica",
    accent: "#22b8cf",
    howTo: [
      "Destapa casillas: cada número indica cuántas minas hay alrededor.",
      "Marca con una bandera las casillas donde sabes que hay una mina (clic derecho, o pulsación larga en el móvil).",
      "Ganas al destapar todas las casillas sin mina. La primera casilla nunca es una mina.",
      "Fácil: 9 × 9 con 10 minas. Medio: 16 × 16 con 40. Difícil: 16 × 30 con 99. Gana el menor tiempo.",
    ],
    faq: [
      { q: "¿Cómo se pone una bandera en el móvil?", a: "Mantén pulsada la casilla, o activa el modo bandera." },
      { q: "¿Hay que descargar algo?", a: NO_DOWNLOAD },
    ],
  },
  {
    id: "sudoku",
    addedAt: "2026-10-22T08:23:27+02:00",
    path: "/sudoku",
    name: "Sudoku",
    title: "Sudoku online gratis",
    description: "Juega al Sudoku gratis en el navegador, en fácil, medio o difícil, con notas y progreso guardado. Cada sudoku tiene una única solución.",
    tagline: "Sin repetir, y contra el reloj",
    mode: "solo",
    genre: "Puzle de lógica",
    accent: "#4c6ef5",
    howTo: [
      "Rellena el tablero de 9 × 9 con números del 1 al 9.",
      "Ningún número puede repetirse en la misma fila, columna ni caja de 3 × 3.",
      "Usa las notas para apuntar los números posibles de cada casilla.",
      "Fácil empieza con 40 números, medio con 32 y difícil con 26. Gana el menor tiempo.",
    ],
    faq: [
      { q: "¿Se guarda la partida si cierro la página?", a: "Sí. Puedes seguir el sudoku donde lo dejaste." },
      { q: "¿Los sudokus tienen una sola solución?", a: "Sí. Todos se comprueban para que tengan una única solución." },
      { q: "¿Hay que descargar algo?", a: NO_DOWNLOAD },
    ],
  },
  {
    id: "wordle",
    addedAt: "2026-10-20T18:34:41+02:00",
    path: "/wordle",
    name: "Wordle",
    title: "Wordle en español: la palabra del día",
    description: "Juega al Wordle en español gratis: adivina la palabra del día de 5 letras en 6 intentos y compara tu resultado con tus amigos.",
    tagline: "La palabra del día en 6 intentos",
    mode: "solo",
    genre: "Juego de palabras",
    accent: "#40c057",
    howTo: [
      "Escribe una palabra de 5 letras y pulsa enviar.",
      "Verde: la letra está en su sitio. Amarillo: está en la palabra, pero en otro sitio. Gris: no está.",
      "Tienes 6 intentos. La palabra cambia cada día y es la misma para todo el mundo.",
    ],
    faq: [
      { q: "¿Cada cuánto cambia la palabra?", a: "Una vez al día. Todo el mundo tiene la misma palabra." },
      { q: "¿Puedo ver cómo les ha ido a mis amigos?", a: "Sí. Al terminar ves los resultados de tus amigos de ese día." },
      { q: "¿Hay que descargar algo?", a: NO_DOWNLOAD },
    ],
  },
  {
    id: "tictactoe",
    addedAt: "2026-10-20T11:27:56+02:00",
    path: "/3-en-raya",
    name: "3 en raya",
    title: "3 en raya online contra tus amigos",
    description: "Juega al 3 en raya (tres en línea) online contra tus amigos, por turnos y a vuestro ritmo. Gratis, en el navegador y con avisos cuando te toca.",
    tagline: "Por turnos, cada uno cuando puede",
    mode: "friends",
    genre: "Juego de mesa",
    accent: "#ff6b6b",
    howTo: [
      "Reta a un amigo. Uno juega con × y el otro con ○.",
      "Por turnos, cada uno marca una casilla del tablero de 3 × 3.",
      "Gana quien junte tres marcas en línea: en horizontal, en vertical o en diagonal.",
    ],
    faq: [
      { q: "¿Tenemos que estar conectados a la vez?", a: "No. Es por turnos: cada uno juega cuando puede y te avisamos cuando te toca." },
      { q: "¿Hay que descargar algo?", a: NO_DOWNLOAD },
    ],
  },
  {
    id: "connect4",
    addedAt: "2026-10-21T09:56:59+02:00",
    path: "/4-en-raya",
    name: "4 en raya",
    title: "4 en raya online contra tus amigos",
    description: "Juega al 4 en raya (Conecta 4) online contra tus amigos, por turnos. Deja caer fichas y junta cuatro en línea antes que tu rival. Gratis.",
    tagline: "Deja caer fichas y junta cuatro",
    mode: "friends",
    genre: "Juego de mesa",
    accent: "#ff6b6b",
    howTo: [
      "Reta a un amigo. Por turnos, cada uno deja caer una ficha en una columna.",
      "La ficha cae hasta el hueco libre más bajo.",
      "Gana quien junte cuatro fichas en línea: en horizontal, en vertical o en diagonal.",
    ],
    faq: [
      { q: "¿Es lo mismo que Conecta 4?", a: "Sí, son las mismas reglas." },
      { q: "¿Tenemos que estar conectados a la vez?", a: "No. Es por turnos y te avisamos cuando te toca." },
    ],
  },
  {
    id: "battleship",
    addedAt: "2026-10-21T10:31:14+02:00",
    path: "/hundir-la-flota",
    name: "Hundir la flota",
    title: "Hundir la flota online contra tus amigos",
    description: "Juega a Hundir la flota online contra tus amigos: coloca tus barcos en secreto y dispara por turnos hasta hundir los suyos. Gratis, en el navegador.",
    tagline: "Agua, tocado y hundido",
    mode: "friends",
    genre: "Juego de estrategia",
    accent: "#22b8cf",
    howTo: [
      "Reta a un amigo y coloca tu flota en un tablero de 10 × 10: portaaviones (5), acorazado (4), crucero (3), submarino (3) y destructor (2).",
      "Por turnos, disparad a una casilla del tablero del otro: agua, tocado o hundido.",
      "Gana quien hunda antes toda la flota rival. Ninguno ve los barcos del otro.",
    ],
    faq: [
      { q: "¿Puede mi rival ver dónde están mis barcos?", a: "No. Las flotas se guardan en el servidor y solo se revela cada disparo." },
      { q: "¿Tenemos que estar conectados a la vez?", a: "No. Es por turnos y te avisamos cuando te toca disparar." },
    ],
  },
  {
    id: "rps",
    addedAt: "2026-10-20T12:23:36+02:00",
    path: "/piedra-papel-tijera",
    name: "Piedra, papel o tijera",
    title: "Piedra, papel o tijera online (y lagarto, Spock)",
    description: "Juega a piedra, papel o tijera online contra tus amigos, al mejor de 3, o a la versión con lagarto y Spock. Gratis, en el navegador.",
    tagline: "Al mejor de 3, con lagarto y Spock",
    mode: "friends",
    genre: "Juego de manos",
    accent: "#fab005",
    howTo: [
      "Reta a un amigo. Cada uno elige en secreto y se revela a la vez.",
      "Piedra gana a tijera, tijera gana a papel y papel gana a piedra.",
      "Con lagarto y Spock hay dos opciones más, y cada una gana a otras dos.",
      "Gana quien se lleve antes 2 rondas.",
    ],
    faq: [
      { q: "¿Puede el otro ver lo que he elegido antes de elegir?", a: "No. Las dos elecciones se revelan a la vez." },
    ],
  },
  {
    id: "pong",
    addedAt: "2026-10-20T12:58:27+02:00",
    path: "/pong",
    name: "Pong",
    title: "Pong online en directo contra tus amigos",
    description: "Juega al Pong online en directo contra un amigo, los dos a la vez desde el móvil o el ordenador. Gana quien llegue antes a 5 puntos. Gratis.",
    tagline: "En directo, los dos a la vez",
    mode: "friends",
    genre: "Arcade",
    accent: "#22b8cf",
    howTo: [
      "Reta a un amigo y entrad los dos a la partida.",
      "Mueve tu pala para devolver la bola. Cada golpe la acelera un poco.",
      "Gana quien llegue antes a 5 puntos.",
    ],
    faq: [{ q: "¿Tenemos que estar conectados a la vez?", a: "Sí. Pong se juega en directo." }],
  },
  {
    id: "tron",
    addedAt: "2026-10-21T23:43:17+02:00",
    path: "/tron",
    name: "Tron",
    title: "Tron online en directo contra tus amigos",
    description: "Juega a Tron online en directo contra un amigo: mueve tu moto, encierra a tu rival con tu estela y no choques. A 3 rondas, gratis y en el navegador.",
    tagline: "En directo: encierra a tu rival",
    mode: "friends",
    genre: "Arcade",
    accent: "#ff6b6b",
    howTo: [
      "Reta a un amigo y entrad los dos a la partida.",
      "Tu moto deja una estela que se borra al poco. Gira con las flechas o deslizando.",
      "Pierde la ronda quien choque contra una pared o contra una estela.",
      "Gana quien se lleve antes 3 rondas.",
    ],
    faq: [{ q: "¿Tenemos que estar conectados a la vez?", a: "Sí. Tron se juega en directo." }],
  },
];

export function gameGuide(id: string): GameGuide {
  const guide = GAME_GUIDES.find((game) => game.id === id);
  if (!guide) throw new Error(`Juego sin guía: ${id}`);
  return guide;
}

/** Metadatos de la página de un juego: título, descripción, URL canónica y tarjetas al compartir. */
export function gameMetadata(id: string): Metadata {
  const game = gameGuide(id);
  return {
    title: game.title,
    description: game.description,
    alternates: { canonical: game.path },
    openGraph: { title: `${game.title} · ${brand.name}`, description: game.description, url: game.path, type: "website" },
  };
}

/** Para páginas que no deben salir en buscadores (perfil, chat, partidas concretas…). */
export const PRIVATE_PAGE: Metadata["robots"] = { index: false, follow: false };

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
}

/** Preguntas frecuentes de la portada (también para los datos estructurados). */
export const HOME_FAQ: { q: string; a: string }[] = [
  { q: `¿Qué es ${brand.name}?`, a: `${brand.name} es una colección de minijuegos online gratis para jugar en ratos libres: ${new Intl.ListFormat("es", { type: "conjunction" }).format(GAME_GUIDES.map((g) => g.name))}. Hay rankings, retos diarios y partidas contra tus amigos.` },
  { q: "¿Es gratis?", a: "Sí, todos los juegos son gratis y sin anuncios. Quien quiera puede apoyar el proyecto y recibe a cambio ropa exclusiva para su avatar, nunca ventajas en las partidas." },
  { q: "¿Hay que descargar algo?", a: NO_DOWNLOAD },
  { q: "¿Necesito una cuenta?", a: "Los juegos en solitario se pueden probar sin cuenta. Para guardar tus puntuaciones, salir en el ranking y jugar contra amigos hace falta una cuenta gratuita." },
  { q: "¿Puedo jugar con mis amigos?", a: "Sí. Añade a tus amigos con su código y retadlos a 3 en raya, 4 en raya, Hundir la flota, Piedra, papel o tijera, Pong o Tron. Te avisamos cuando te toca." },
];
