/**
 * "¿Cómo se juega?" de cada juego, en palabras que entienda un niño: frases
 * cortas, un dibujito por paso y el objetivo primero. Las reglas completas
 * están en lib/seo.ts (sección "Cómo se juega" de cada página).
 */
export type HowToPlay = { goal: string; steps: { icon: string; text: string }[] };

export const HOW_TO_PLAY: Record<string, HowToPlay> = {
  "2048": {
    goal: "Junta fichas iguales para hacer números cada vez más grandes. ¡Intenta llegar a 2048!",
    steps: [
      { icon: "👆", text: "Desliza el dedo (o usa las flechas) y todas las fichas se mueven hacia ese lado." },
      { icon: "➕", text: "Si chocan dos fichas con el mismo número, se juntan en una: 2 y 2 hacen 4." },
      { icon: "🆕", text: "Cada vez que mueves, sale una ficha nueva." },
      { icon: "🛑", text: "Se acaba cuando el tablero se llena y ya no puedes mover nada." },
    ],
  },
  snake: {
    goal: "Come manzanas para hacer tu serpiente muy larga, ¡sin chocarte!",
    steps: [
      { icon: "🐍", text: "Tu serpiente no para de avanzar. Tú decides hacia dónde gira." },
      { icon: "👆", text: "Desliza el dedo o usa las flechas para girar." },
      { icon: "🍎", text: "Cada manzana que comes te hace más larga y te da 10 puntos." },
      { icon: "💥", text: "Si chocas con la pared o con tu propia cola, se acaba la partida." },
    ],
  },
  "lights-out": {
    goal: "Apaga todas las luces del tablero.",
    steps: [
      { icon: "💡", text: "Al tocar una casilla, cambia ella y las de arriba, abajo, izquierda y derecha." },
      { icon: "🔁", text: "Las que estaban encendidas se apagan, y las apagadas se encienden." },
      { icon: "✋", text: "Tienes pocas pulsaciones: piensa antes de tocar." },
      { icon: "⬆️", text: "Si lo apagas todo, pasas de nivel y el tablero crece." },
    ],
  },
  minesweeper: {
    goal: "Destapa todas las casillas que no tienen mina. ¡Sin pisar ninguna!",
    steps: [
      { icon: "👆", text: "Toca una casilla para destaparla. La primera nunca tiene mina." },
      { icon: "🔢", text: "Un número te dice cuántas minas hay tocando esa casilla (también en diagonal)." },
      { icon: "🚩", text: "Si sabes dónde hay una mina, ponle una bandera (mantén pulsado o usa el modo bandera)." },
      { icon: "⏱️", text: "Ganas al destapar todas las casillas sin mina. Cuanto más rápido, mejor." },
    ],
  },
  sudoku: {
    goal: "Rellena el tablero con números del 1 al 9.",
    steps: [
      { icon: "➡️", text: "En cada fila no se puede repetir ningún número." },
      { icon: "⬇️", text: "En cada columna, tampoco." },
      { icon: "🟦", text: "Y en cada cuadrado de 3 × 3, tampoco." },
      { icon: "✏️", text: "Si dudas, usa las notas para apuntar los números que podrían ir en una casilla." },
    ],
  },
  wordle: {
    goal: "Adivina la palabra secreta del día. Tiene 5 letras y tienes 6 intentos.",
    steps: [
      { icon: "⌨️", text: "Escribe una palabra de 5 letras y envíala." },
      { icon: "🟩", text: "Verde: esa letra está en la palabra y en su sitio." },
      { icon: "🟨", text: "Amarillo: la letra está en la palabra, pero en otro sitio." },
      { icon: "⬛", text: "Gris: esa letra no está. Usa las pistas para el siguiente intento." },
    ],
  },
  tictactoe: {
    goal: "Pon tres de tus fichas en línea antes que tu amigo.",
    steps: [
      { icon: "👋", text: "Reta a un amigo. Uno juega con × y el otro con ○." },
      { icon: "🔁", text: "Por turnos, cada uno pone su ficha en una casilla libre." },
      { icon: "📏", text: "Gana quien junte tres en raya: en fila, en columna o en diagonal." },
      { icon: "🤝", text: "Si se llena el tablero sin tres en raya, es empate." },
    ],
  },
  connect4: {
    goal: "Junta cuatro fichas de tu color en línea antes que tu amigo.",
    steps: [
      { icon: "👋", text: "Reta a un amigo. Por turnos, cada uno elige una columna." },
      { icon: "⬇️", text: "Tu ficha cae hasta el hueco libre más bajo de esa columna." },
      { icon: "📏", text: "Gana quien junte cuatro: en fila, en columna o en diagonal." },
      { icon: "🧠", text: "Fíjate también en las fichas de tu amigo para taparle el camino." },
    ],
  },
  battleship: {
    goal: "Hunde todos los barcos de tu amigo antes de que él hunda los tuyos.",
    steps: [
      { icon: "🚢", text: "Coloca tus barcos en tu tablero. Tu amigo no puede verlos." },
      { icon: "🎯", text: "Por turnos, cada uno dispara a una casilla del tablero del otro." },
      { icon: "💧", text: "Agua: no había barco. Tocado: le has dado a un barco. Hundido: ¡barco entero!" },
      { icon: "🏆", text: "Gana quien hunda antes todos los barcos del otro." },
    ],
  },
  rps: {
    goal: "Elige mejor que tu amigo. Gana quien consiga antes 2 rondas.",
    steps: [
      { icon: "🤫", text: "Los dos elegís a la vez y en secreto." },
      { icon: "🪨", text: "La piedra rompe la tijera." },
      { icon: "✂️", text: "La tijera corta el papel." },
      { icon: "📄", text: "El papel envuelve la piedra. Con lagarto y Spock hay dos opciones más." },
    ],
  },
  pong: {
    goal: "Devuelve la bola y que tu amigo no pueda. Gana quien llegue antes a 5 puntos.",
    steps: [
      { icon: "👋", text: "Reta a un amigo y entrad los dos a la vez." },
      { icon: "🏓", text: "Mueve tu pala para que la bola rebote en ella." },
      { icon: "⚡", text: "Cada vez que la golpeáis, la bola va un poco más rápido." },
      { icon: "🥅", text: "Si la bola pasa por tu lado, tu amigo se lleva el punto." },
    ],
  },
  tron: {
    goal: "Encierra a tu amigo con tu estela, ¡sin chocarte tú!",
    steps: [
      { icon: "🏍️", text: "Tu moto no para de avanzar y deja una estela detrás." },
      { icon: "👆", text: "Desliza el dedo o usa las flechas para girar." },
      { icon: "💥", text: "Pierde la ronda quien choque con una pared o con una estela." },
      { icon: "🏆", text: "Gana quien se lleve antes 3 rondas." },
    ],
  },
};
