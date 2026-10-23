/**
 * Textos de cada juego en español: nombre, título y descripción para buscadores,
 * cómo se juega y preguntas frecuentes. Tienen que describir el juego tal y
 * como es. Los datos que no se traducen están en lib/seo.ts.
 */

export type GameTexts = {
  name: string;
  /** Título de la pestaña y del resultado de búsqueda (sin el nombre de la app). */
  title: string;
  /** Descripción para buscadores: 120-160 caracteres. */
  description: string;
  /** Frase corta para la imagen al compartir. */
  tagline: string;
  genre: string;
  howTo: string[];
  faq: { q: string; a: string }[];
};

const NO_DOWNLOAD = "No. Se juega en el navegador, en el móvil o en el ordenador. Si quieres, puedes añadirla a la pantalla de inicio como una app.";

export const GAMES_ES = {
  "2048": {
    name: "2048",
    title: "2048 online gratis",
    description: "Juega al 2048 gratis en el navegador: desliza, junta fichas iguales hasta llegar a 2048 y compite en el ranking y en el reto diario.",
    tagline: "Junta fichas hasta llegar a 2048",
    genre: "Puzle",
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
  snake: {
    name: "Snake",
    title: "Snake online gratis",
    description: "Juega al Snake clásico gratis en el navegador: come manzanas, crece sin chocar y sube en el ranking. Funciona en el móvil y en el ordenador.",
    tagline: "Come sin chocar, cada vez más rápido",
    genre: "Arcade",
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
  "lights-out": {
    name: "Lights Out",
    title: "Lights Out online gratis",
    description: "Juega a Lights Out gratis: pulsa las luces para apagarlas todas, nivel a nivel, con un número limitado de pulsaciones. Un puzle de lógica.",
    tagline: "Apágalo todo, nivel a nivel",
    genre: "Puzle de lógica",
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
  minesweeper: {
    name: "Buscaminas",
    title: "Buscaminas online gratis",
    description: "Juega al Buscaminas clásico gratis en el navegador, en fácil, medio o difícil. Despeja el tablero sin pisar una mina y compite por el mejor tiempo.",
    tagline: "Despeja el tablero contra el reloj",
    genre: "Puzle de lógica",
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
  sudoku: {
    name: "Sudoku",
    title: "Sudoku online gratis",
    description: "Juega al Sudoku gratis en el navegador, en fácil, medio o difícil, con notas y progreso guardado. Cada sudoku tiene una única solución.",
    tagline: "Sin repetir, y contra el reloj",
    genre: "Puzle de lógica",
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
  wordle: {
    name: "Wordle",
    title: "Wordle en español: la palabra del día",
    description: "Juega al Wordle en español gratis: adivina la palabra del día de 5 letras en 6 intentos y compara tu resultado con tus amigos.",
    tagline: "La palabra del día en 6 intentos",
    genre: "Juego de palabras",
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
  tictactoe: {
    name: "3 en raya",
    title: "3 en raya online contra tus amigos",
    description: "Juega al 3 en raya (tres en línea) online contra tus amigos, por turnos y a vuestro ritmo. Gratis, en el navegador y con avisos cuando te toca.",
    tagline: "Por turnos, cada uno cuando puede",
    genre: "Juego de mesa",
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
  connect4: {
    name: "4 en raya",
    title: "4 en raya online contra tus amigos",
    description: "Juega al 4 en raya (Conecta 4) online contra tus amigos, por turnos. Deja caer fichas y junta cuatro en línea antes que tu rival. Gratis.",
    tagline: "Deja caer fichas y junta cuatro",
    genre: "Juego de mesa",
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
  battleship: {
    name: "Hundir la flota",
    title: "Hundir la flota online contra tus amigos",
    description: "Juega a Hundir la flota online contra tus amigos: coloca tus barcos en secreto y dispara por turnos hasta hundir los suyos. Gratis, en el navegador.",
    tagline: "Agua, tocado y hundido",
    genre: "Juego de estrategia",
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
  rps: {
    name: "Piedra, papel o tijera",
    title: "Piedra, papel o tijera online (y lagarto, Spock)",
    description: "Juega a piedra, papel o tijera online contra tus amigos, al mejor de 3, o a la versión con lagarto y Spock. Gratis, en el navegador.",
    tagline: "Al mejor de 3, con lagarto y Spock",
    genre: "Juego de manos",
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
  pong: {
    name: "Pong",
    title: "Pong online en directo contra tus amigos",
    description: "Juega al Pong online en directo contra un amigo, los dos a la vez desde el móvil o el ordenador. Gana quien llegue antes a 5 puntos. Gratis.",
    tagline: "En directo, los dos a la vez",
    genre: "Arcade",
    howTo: [
      "Reta a un amigo y entrad los dos a la partida.",
      "Mueve tu pala para devolver la bola. Cada golpe la acelera un poco.",
      "Gana quien llegue antes a 5 puntos.",
    ],
    faq: [{ q: "¿Tenemos que estar conectados a la vez?", a: "Sí. Pong se juega en directo." }],
  },
  tron: {
    name: "Tron",
    title: "Tron online en directo contra tus amigos",
    description: "Juega a Tron online en directo contra un amigo: mueve tu moto, encierra a tu rival con tu estela y no choques. A 3 rondas, gratis y en el navegador.",
    tagline: "En directo: encierra a tu rival",
    genre: "Arcade",
    howTo: [
      "Reta a un amigo y entrad los dos a la partida.",
      "Tu moto deja una estela que se borra al poco. Gira con las flechas o deslizando.",
      "Pierde la ronda quien choque contra una pared o contra una estela.",
      "Gana quien se lleve antes 3 rondas.",
    ],
    faq: [{ q: "¿Tenemos que estar conectados a la vez?", a: "Sí. Tron se juega en directo." }],
  },
  chess: {
    name: "Ajedrez",
    title: "Ajedrez online contra tus amigos",
    description: "Juega al ajedrez online contra tus amigos, por turnos y sin reloj: cada uno mueve cuando puede y te avisamos cuando te toca. Gratis, en el navegador.",
    tagline: "Por turnos, sin reloj",
    genre: "Juego de estrategia",
    howTo: [
      "Reta a un amigo. Uno juega con las rojas, que empiezan, y el otro con las azules.",
      "Por turnos, cada uno mueve una pieza. Toca una pieza tuya para ver adónde puede ir.",
      "Gana quien dé jaque mate: el rey rival está amenazado y no tiene escapatoria.",
      "Hay tablas por ahogado, por repetir tres veces la misma posición, por 50 jugadas sin capturas ni movimientos de peón y cuando no queda material para dar mate.",
    ],
    faq: [
      { q: "¿Hay reloj?", a: "No. Es por turnos: cada uno mueve cuando puede y te avisamos cuando te toca." },
      { q: "¿Se pueden enrocar, coronar y capturar al paso?", a: "Sí. Se aplican todas las reglas del ajedrez, y la app solo deja hacer jugadas legales." },
      { q: "¿Hay que descargar algo?", a: NO_DOWNLOAD },
    ],
  },
} satisfies Record<string, GameTexts>;
