/**
 * "¿Cómo se juega?" de cada juego, en palabras que entienda un niño: frases
 * cortas, un dibujito por paso y el objetivo primero. Las reglas completas
 * están en lib/seo.ts (sección "Cómo se juega" de cada página).
 */
import type { Locale } from "./i18n/locales";
import type { Picto } from "./pictos";

export type HowToPlay = { goal: string; steps: { icon: Picto; text: string }[] };

const HOW_TO_PLAY_ES: Record<string, HowToPlay> = {
  reversi: {
    goal: "Acaba con más fichas de tu color que tu amigo.",
    steps: [
      { icon: "wave", text: "Reta a un amigo. Empiezan las rojas." },
      { icon: "tap", text: "Pon una ficha en una casilla marcada: tiene que encerrar fichas de tu amigo entre ella y otra tuya." },
      { icon: "repeat", text: "Las fichas encerradas se dan la vuelta y pasan a ser tuyas." },
      { icon: "trophy", text: "Cuando nadie puede jugar, gana quien tenga más fichas." },
    ],
  },
  dots: {
    goal: "Cierra más cajas que tu amigo.",
    steps: [
      { icon: "pencil", text: "Por turnos, traza una raya entre dos puntos." },
      { icon: "box", text: "Si pones el cuarto lado de una caja, es tuya." },
      { icon: "repeat", text: "Cada vez que cierras una caja, vuelves a jugar." },
      { icon: "trophy", text: "Cuando están todas cerradas, gana quien tenga más." },
    ],
  },
  typing: {
    goal: "Escribe el texto antes que tu amigo.",
    steps: [
      { icon: "wave", text: "Reta a un amigo y entrad los dos a la partida." },
      { icon: "timer", text: "Tras una cuenta atrás, sale el texto. El mismo para los dos." },
      { icon: "keyboard", text: "Escríbelo tal cual. Si te equivocas, borra para seguir." },
      { icon: "fast", text: "Gana quien acabe primero." },
    ],
  },
  chess: {
    goal: "Da jaque mate al rey de tu amigo: amenázalo sin que pueda escapar.",
    steps: [
      { icon: "wave", text: "Reta a un amigo. Empiezan las rojas." },
      { icon: "tap", text: "Toca una pieza tuya: se marcan las casillas adonde puede ir. Luego toca el destino." },
      { icon: "knight", text: "Cada pieza se mueve a su manera. La app solo te deja hacer jugadas legales." },
      { icon: "wait", text: "No hay reloj: mueve cuando puedas y avisaremos a tu amigo." },
    ],
  },
  "2048": {
    goal: "Junta fichas iguales para hacer números cada vez más grandes. ¡Intenta llegar a 2048!",
    steps: [
      { icon: "tap", text: "Desliza el dedo (o usa las flechas) y todas las fichas se mueven hacia ese lado." },
      { icon: "plus", text: "Si chocan dos fichas con el mismo número, se juntan en una: 2 y 2 hacen 4." },
      { icon: "new", text: "Cada vez que mueves, sale una ficha nueva." },
      { icon: "stop", text: "Se acaba cuando el tablero se llena y ya no puedes mover nada." },
    ],
  },
  snake: {
    goal: "Come manzanas para hacer tu serpiente muy larga, ¡sin chocarte!",
    steps: [
      { icon: "snake", text: "Tu serpiente no para de avanzar. Tú decides hacia dónde gira." },
      { icon: "tap", text: "Desliza el dedo o usa las flechas para girar." },
      { icon: "apple", text: "Cada manzana que comes te hace más larga y te da 10 puntos." },
      { icon: "crash", text: "Si chocas con la pared o con tu propia cola, se acaba la partida." },
    ],
  },
  "lights-out": {
    goal: "Apaga todas las luces del tablero.",
    steps: [
      { icon: "idea", text: "Al tocar una casilla, cambia ella y las de arriba, abajo, izquierda y derecha." },
      { icon: "look", text: "Antes de tocar, mantén el dedo encima (o pasa el ratón en el ordenador) y verás qué casillas cambiarán." },
      { icon: "repeat", text: "Las que estaban encendidas se apagan, y las apagadas se encienden." },
      { icon: "hand", text: "Tienes pocas pulsaciones: piensa antes de tocar." },
      { icon: "up", text: "Si lo apagas todo, pasas de nivel y el tablero crece." },
    ],
  },
  minesweeper: {
    goal: "Destapa todas las casillas que no tienen mina. ¡Sin pisar ninguna!",
    steps: [
      { icon: "tap", text: "Toca una casilla para destaparla. La primera nunca tiene mina." },
      { icon: "numbers", text: "Un número te dice cuántas minas hay tocando esa casilla (también en diagonal)." },
      { icon: "flag", text: "Si sabes dónde hay una mina, ponle una bandera (mantén pulsado o usa el modo bandera)." },
      { icon: "timer", text: "Ganas al destapar todas las casillas sin mina. Cuanto más rápido, mejor." },
    ],
  },
  sudoku: {
    goal: "Rellena el tablero con números del 1 al 9.",
    steps: [
      { icon: "right", text: "En cada fila no se puede repetir ningún número." },
      { icon: "down", text: "En cada columna, tampoco." },
      { icon: "box", text: "Y en cada cuadrado de 3 × 3, tampoco." },
      { icon: "pencil", text: "Si dudas, usa las notas para apuntar los números que podrían ir en una casilla." },
    ],
  },
  queens: {
    goal: "Pon una reina en cada fila, en cada columna y en cada región de color.",
    steps: [
      { icon: "crown", text: "Solo cabe una reina por fila, una por columna y una por color." },
      { icon: "stop", text: "Dos reinas no pueden tocarse, ni siquiera en diagonal." },
      { icon: "tap", text: "Toca una casilla para marcarla con una × (ahí no va). Tócala otra vez para poner una reina." },
      { icon: "timer", text: "Cada tablero tiene una sola solución. Cuanto más rápido, mejor." },
    ],
  },
  solitaire: {
    goal: "Sube todas las cartas a los cuatro montones de arriba, uno por palo, del as al rey.",
    steps: [
      { icon: "cards", text: "En las columnas, pon cada carta sobre otra un número mayor y de otro color: un 6 rojo sobre un 7 negro." },
      { icon: "tap", text: "Toca una carta y se va sola adonde encaje. También puedes arrastrarla." },
      { icon: "repeat", text: "Si te atascas, roba del mazo. Cuando se acabe, se vuelve a pasar todas las veces que quieras." },
      { icon: "timer", text: "Todas las partidas tienen solución. Cuanto más rápido las termines, mejor." },
    ],
  },
  wordle: {
    goal: "Adivina la palabra secreta del día. Tiene 5 letras y tienes 6 intentos.",
    steps: [
      { icon: "keyboard", text: "Escribe una palabra de 5 letras y envíala." },
      { icon: "tile-green", text: "Verde: esa letra está en la palabra y en su sitio." },
      { icon: "tile-yellow", text: "Amarillo: la letra está en la palabra, pero en otro sitio." },
      { icon: "tile-gray", text: "Gris: esa letra no está. Usa las pistas para el siguiente intento." },
    ],
  },
  tictactoe: {
    goal: "Pon tres de tus fichas en línea antes que tu amigo.",
    steps: [
      { icon: "wave", text: "Reta a un amigo. Uno juega con × y el otro con ○." },
      { icon: "repeat", text: "Por turnos, cada uno pone su ficha en una casilla libre." },
      { icon: "line", text: "Gana quien junte tres en raya: en fila, en columna o en diagonal." },
      { icon: "handshake", text: "Si se llena el tablero sin tres en raya, es empate." },
    ],
  },
  connect4: {
    goal: "Junta cuatro fichas de tu color en línea antes que tu amigo.",
    steps: [
      { icon: "wave", text: "Reta a un amigo. Por turnos, cada uno elige una columna." },
      { icon: "down", text: "Tu ficha cae hasta el hueco libre más bajo de esa columna." },
      { icon: "line", text: "Gana quien junte cuatro: en fila, en columna o en diagonal." },
      { icon: "think", text: "Fíjate también en las fichas de tu amigo para taparle el camino." },
    ],
  },
  battleship: {
    goal: "Hunde todos los barcos de tu amigo antes de que él hunda los tuyos.",
    steps: [
      { icon: "ship", text: "Coloca tus barcos en tu tablero. Tu amigo no puede verlos." },
      { icon: "target", text: "Por turnos, cada uno dispara a una casilla del tablero del otro." },
      { icon: "water", text: "Agua: no había barco. Tocado: le has dado a un barco. Hundido: ¡barco entero!" },
      { icon: "trophy", text: "Gana quien hunda antes todos los barcos del otro." },
    ],
  },
  rps: {
    goal: "Elige mejor que tu amigo. Gana quien consiga antes 2 rondas.",
    steps: [
      { icon: "secret", text: "Los dos elegís a la vez y en secreto." },
      { icon: "rock", text: "La piedra rompe la tijera." },
      { icon: "scissors", text: "La tijera corta el papel." },
      { icon: "paper", text: "El papel envuelve la piedra. Con lagarto y Spock hay dos opciones más." },
    ],
  },
  pong: {
    goal: "Devuelve la bola y que tu amigo no pueda. Gana quien llegue antes a 5 puntos.",
    steps: [
      { icon: "wave", text: "Reta a un amigo y entrad los dos a la vez." },
      { icon: "paddle", text: "Mueve tu pala para que la bola rebote en ella." },
      { icon: "fast", text: "Cada vez que la golpeáis, la bola va un poco más rápido." },
      { icon: "goal", text: "Si la bola pasa por tu lado, tu amigo se lleva el punto." },
    ],
  },
  tron: {
    goal: "Encierra a tu amigo con tu estela, ¡sin chocarte tú!",
    steps: [
      { icon: "tron", text: "Tu moto no para de avanzar y deja una estela detrás." },
      { icon: "tap", text: "Desliza el dedo o usa las flechas para girar." },
      { icon: "crash", text: "Pierde la ronda quien choque con una pared o con una estela." },
      { icon: "trophy", text: "Gana quien se lleve antes 3 rondas." },
    ],
  },
};

const HOW_TO_PLAY_EN: Record<string, HowToPlay> = {
  reversi: {
    goal: "Finish with more pieces of your colour than your friend.",
    steps: [
      { icon: "wave", text: "Challenge a friend. Red moves first." },
      { icon: "tap", text: "Place a piece on a marked square: it has to trap your friend's pieces between it and another of yours." },
      { icon: "repeat", text: "Trapped pieces flip over and become yours." },
      { icon: "trophy", text: "When nobody can play, whoever has the most pieces wins." },
    ],
  },
  dots: {
    goal: "Close more boxes than your friend.",
    steps: [
      { icon: "pencil", text: "Taking turns, draw a line between two dots." },
      { icon: "box", text: "Draw the fourth side of a box and it's yours." },
      { icon: "repeat", text: "Every time you close a box, you go again." },
      { icon: "trophy", text: "When they're all closed, whoever has the most wins." },
    ],
  },
  typing: {
    goal: "Type the text before your friend does.",
    steps: [
      { icon: "wave", text: "Challenge a friend and both join the game." },
      { icon: "timer", text: "After a countdown, the text appears. The same for both of you." },
      { icon: "keyboard", text: "Type it exactly. If you make a mistake, delete it to carry on." },
      { icon: "fast", text: "Whoever finishes first wins." },
    ],
  },
  chess: {
    goal: "Checkmate your friend's king: attack it so it has nowhere to escape.",
    steps: [
      { icon: "wave", text: "Challenge a friend. Red moves first." },
      { icon: "tap", text: "Tap one of your pieces: the squares it can move to light up. Then tap where it goes." },
      { icon: "knight", text: "Each piece moves its own way. The app only lets you make legal moves." },
      { icon: "wait", text: "There's no clock: move whenever you can and we'll let your friend know." },
    ],
  },
  "2048": {
    goal: "Merge matching tiles to make bigger and bigger numbers. Try to reach 2048!",
    steps: [
      { icon: "tap", text: "Swipe (or use the arrow keys) and every tile slides that way." },
      { icon: "plus", text: "When two tiles with the same number bump into each other, they merge: 2 and 2 make 4." },
      { icon: "new", text: "Every time you move, a new tile appears." },
      { icon: "stop", text: "It's over when the board is full and nothing can move." },
    ],
  },
  snake: {
    goal: "Eat apples to make your snake really long, without crashing!",
    steps: [
      { icon: "snake", text: "Your snake never stops moving. You choose where it turns." },
      { icon: "tap", text: "Swipe or use the arrow keys to turn." },
      { icon: "apple", text: "Every apple you eat makes you longer and gives you 10 points." },
      { icon: "crash", text: "If you hit the wall or your own tail, the game is over." },
    ],
  },
  "lights-out": {
    goal: "Switch off every light on the board.",
    steps: [
      { icon: "idea", text: "Tapping a square toggles it and the ones above, below, left and right." },
      { icon: "look", text: "Before tapping, hold your finger on a square (or hover with the mouse on a computer) to see which squares will change." },
      { icon: "repeat", text: "The ones that were on go off, and the ones that were off come on." },
      { icon: "hand", text: "You only have a few taps: think before you tap." },
      { icon: "up", text: "Switch them all off and you level up, and the board grows." },
    ],
  },
  minesweeper: {
    goal: "Reveal every square that doesn't have a mine. Without stepping on one!",
    steps: [
      { icon: "tap", text: "Tap a square to reveal it. The first one never has a mine." },
      { icon: "numbers", text: "A number tells you how many mines touch that square (diagonals too)." },
      { icon: "flag", text: "If you know where a mine is, flag it (press and hold, or use flag mode)." },
      { icon: "timer", text: "You win when every square without a mine is revealed. The faster, the better." },
    ],
  },
  sudoku: {
    goal: "Fill the board with numbers from 1 to 9.",
    steps: [
      { icon: "right", text: "No number can repeat in a row." },
      { icon: "down", text: "Or in a column." },
      { icon: "box", text: "Or in each 3 × 3 square." },
      { icon: "pencil", text: "If you're not sure, use notes to jot down the numbers that could go in a square." },
    ],
  },
  queens: {
    goal: "Place a queen in every row, every column and every colour region.",
    steps: [
      { icon: "crown", text: "Only one queen fits in each row, each column and each colour." },
      { icon: "stop", text: "Two queens can't touch, not even diagonally." },
      { icon: "tap", text: "Tap a square to mark it with an × (no queen there). Tap it again to place a queen." },
      { icon: "timer", text: "Every board has exactly one solution. The faster, the better." },
    ],
  },
  solitaire: {
    goal: "Move every card to the four piles at the top, one per suit, from ace to king.",
    steps: [
      { icon: "cards", text: "In the columns, put each card on one a rank higher and of the other colour: a red 6 on a black 7." },
      { icon: "tap", text: "Tap a card and it moves where it fits. You can also drag it." },
      { icon: "repeat", text: "If you're stuck, draw from the pile. When it runs out, turn it over as many times as you like." },
      { icon: "timer", text: "Every deal can be won. The faster you finish, the better." },
    ],
  },
  wordle: {
    goal: "Guess the secret word of the day. It has 5 letters and you have 6 tries.",
    steps: [
      { icon: "keyboard", text: "Type a 5-letter word and send it." },
      { icon: "tile-green", text: "Green: that letter is in the word and in the right spot." },
      { icon: "tile-yellow", text: "Yellow: the letter is in the word, but somewhere else." },
      { icon: "tile-gray", text: "Grey: that letter isn't in the word. Use the clues for your next try." },
    ],
  },
  tictactoe: {
    goal: "Get three of your marks in a row before your friend does.",
    steps: [
      { icon: "wave", text: "Challenge a friend. One plays × and the other ○." },
      { icon: "repeat", text: "Taking turns, each of you puts a mark in an empty square." },
      { icon: "line", text: "Three in a row wins: across, down or diagonally." },
      { icon: "handshake", text: "If the board fills up without three in a row, it's a draw." },
    ],
  },
  connect4: {
    goal: "Line up four pieces of your colour before your friend does.",
    steps: [
      { icon: "wave", text: "Challenge a friend. Taking turns, each of you picks a column." },
      { icon: "down", text: "Your piece falls to the lowest empty space in that column." },
      { icon: "line", text: "Four in a row wins: across, down or diagonally." },
      { icon: "think", text: "Keep an eye on your friend's pieces too, to block their way." },
    ],
  },
  battleship: {
    goal: "Sink all of your friend's ships before they sink yours.",
    steps: [
      { icon: "ship", text: "Place your ships on your board. Your friend can't see them." },
      { icon: "target", text: "Taking turns, each of you fires at a square on the other's board." },
      { icon: "water", text: "Miss: no ship there. Hit: you got a ship. Sunk: the whole ship!" },
      { icon: "trophy", text: "The first to sink every ship of the other wins." },
    ],
  },
  rps: {
    goal: "Pick better than your friend. The first to win 2 rounds wins.",
    steps: [
      { icon: "secret", text: "You both pick at the same time, in secret." },
      { icon: "rock", text: "Rock breaks scissors." },
      { icon: "scissors", text: "Scissors cut paper." },
      { icon: "paper", text: "Paper wraps rock. With lizard and Spock there are two more options." },
    ],
  },
  pong: {
    goal: "Return the ball so your friend can't. The first to 5 points wins.",
    steps: [
      { icon: "wave", text: "Challenge a friend and both join at the same time." },
      { icon: "paddle", text: "Move your paddle so the ball bounces off it." },
      { icon: "fast", text: "Every time it's hit, the ball goes a little faster." },
      { icon: "goal", text: "If the ball gets past you, your friend gets the point." },
    ],
  },
  tron: {
    goal: "Trap your friend with your trail, without crashing yourself!",
    steps: [
      { icon: "tron", text: "Your bike never stops and leaves a trail behind it." },
      { icon: "tap", text: "Swipe or use the arrow keys to turn." },
      { icon: "crash", text: "Whoever hits a wall or a trail loses the round." },
      { icon: "trophy", text: "The first to win 3 rounds wins." },
    ],
  },
};

export const HOW_TO_PLAY: Record<Locale, Record<string, HowToPlay>> = { es: HOW_TO_PLAY_ES, en: HOW_TO_PLAY_EN };
