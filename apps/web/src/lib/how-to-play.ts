/**
 * "¿Cómo se juega?" de cada juego, en palabras que entienda un niño: frases
 * cortas, un dibujito por paso y el objetivo primero. Las reglas completas
 * están en lib/seo.ts (sección "Cómo se juega" de cada página).
 */
import type { Locale } from "./i18n/locales";

export type HowToPlay = { goal: string; steps: { icon: string; text: string }[] };

const HOW_TO_PLAY_ES: Record<string, HowToPlay> = {
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

const HOW_TO_PLAY_EN: Record<string, HowToPlay> = {
  "2048": {
    goal: "Merge matching tiles to make bigger and bigger numbers. Try to reach 2048!",
    steps: [
      { icon: "👆", text: "Swipe (or use the arrow keys) and every tile slides that way." },
      { icon: "➕", text: "When two tiles with the same number bump into each other, they merge: 2 and 2 make 4." },
      { icon: "🆕", text: "Every time you move, a new tile appears." },
      { icon: "🛑", text: "It's over when the board is full and nothing can move." },
    ],
  },
  snake: {
    goal: "Eat apples to make your snake really long, without crashing!",
    steps: [
      { icon: "🐍", text: "Your snake never stops moving. You choose where it turns." },
      { icon: "👆", text: "Swipe or use the arrow keys to turn." },
      { icon: "🍎", text: "Every apple you eat makes you longer and gives you 10 points." },
      { icon: "💥", text: "If you hit the wall or your own tail, the game is over." },
    ],
  },
  "lights-out": {
    goal: "Switch off every light on the board.",
    steps: [
      { icon: "💡", text: "Tapping a square toggles it and the ones above, below, left and right." },
      { icon: "🔁", text: "The ones that were on go off, and the ones that were off come on." },
      { icon: "✋", text: "You only have a few taps: think before you tap." },
      { icon: "⬆️", text: "Switch them all off and you level up, and the board grows." },
    ],
  },
  minesweeper: {
    goal: "Reveal every square that doesn't have a mine. Without stepping on one!",
    steps: [
      { icon: "👆", text: "Tap a square to reveal it. The first one never has a mine." },
      { icon: "🔢", text: "A number tells you how many mines touch that square (diagonals too)." },
      { icon: "🚩", text: "If you know where a mine is, flag it (press and hold, or use flag mode)." },
      { icon: "⏱️", text: "You win when every square without a mine is revealed. The faster, the better." },
    ],
  },
  sudoku: {
    goal: "Fill the board with numbers from 1 to 9.",
    steps: [
      { icon: "➡️", text: "No number can repeat in a row." },
      { icon: "⬇️", text: "Or in a column." },
      { icon: "🟦", text: "Or in each 3 × 3 square." },
      { icon: "✏️", text: "If you're not sure, use notes to jot down the numbers that could go in a square." },
    ],
  },
  wordle: {
    goal: "Guess the secret word of the day. It has 5 letters and you have 6 tries.",
    steps: [
      { icon: "⌨️", text: "Type a 5-letter word and send it." },
      { icon: "🟩", text: "Green: that letter is in the word and in the right spot." },
      { icon: "🟨", text: "Yellow: the letter is in the word, but somewhere else." },
      { icon: "⬛", text: "Grey: that letter isn't in the word. Use the clues for your next try." },
    ],
  },
  tictactoe: {
    goal: "Get three of your marks in a row before your friend does.",
    steps: [
      { icon: "👋", text: "Challenge a friend. One plays × and the other ○." },
      { icon: "🔁", text: "Taking turns, each of you puts a mark in an empty square." },
      { icon: "📏", text: "Three in a row wins: across, down or diagonally." },
      { icon: "🤝", text: "If the board fills up without three in a row, it's a draw." },
    ],
  },
  connect4: {
    goal: "Line up four pieces of your colour before your friend does.",
    steps: [
      { icon: "👋", text: "Challenge a friend. Taking turns, each of you picks a column." },
      { icon: "⬇️", text: "Your piece falls to the lowest empty space in that column." },
      { icon: "📏", text: "Four in a row wins: across, down or diagonally." },
      { icon: "🧠", text: "Keep an eye on your friend's pieces too, to block their way." },
    ],
  },
  battleship: {
    goal: "Sink all of your friend's ships before they sink yours.",
    steps: [
      { icon: "🚢", text: "Place your ships on your board. Your friend can't see them." },
      { icon: "🎯", text: "Taking turns, each of you fires at a square on the other's board." },
      { icon: "💧", text: "Miss: no ship there. Hit: you got a ship. Sunk: the whole ship!" },
      { icon: "🏆", text: "The first to sink every ship of the other wins." },
    ],
  },
  rps: {
    goal: "Pick better than your friend. The first to win 2 rounds wins.",
    steps: [
      { icon: "🤫", text: "You both pick at the same time, in secret." },
      { icon: "🪨", text: "Rock breaks scissors." },
      { icon: "✂️", text: "Scissors cut paper." },
      { icon: "📄", text: "Paper wraps rock. With lizard and Spock there are two more options." },
    ],
  },
  pong: {
    goal: "Return the ball so your friend can't. The first to 5 points wins.",
    steps: [
      { icon: "👋", text: "Challenge a friend and both join at the same time." },
      { icon: "🏓", text: "Move your paddle so the ball bounces off it." },
      { icon: "⚡", text: "Every time it's hit, the ball goes a little faster." },
      { icon: "🥅", text: "If the ball gets past you, your friend gets the point." },
    ],
  },
  tron: {
    goal: "Trap your friend with your trail, without crashing yourself!",
    steps: [
      { icon: "🏍️", text: "Your bike never stops and leaves a trail behind it." },
      { icon: "👆", text: "Swipe or use the arrow keys to turn." },
      { icon: "💥", text: "Whoever hits a wall or a trail loses the round." },
      { icon: "🏆", text: "The first to win 3 rounds wins." },
    ],
  },
};

export const HOW_TO_PLAY: Record<Locale, Record<string, HowToPlay>> = { es: HOW_TO_PLAY_ES, en: HOW_TO_PLAY_EN };
