import { rank, suit } from "@repo/games/solitaire";

/** Palos dibujados (♠ ♥ ♦ ♣): los caracteres salen como emoji en algunos móviles. Toman el color del texto. */
const PATHS = [
  // Picas
  "M12 2.5C9.4 6.2 3.5 9.4 3.5 14a4.3 4.3 0 0 0 7.3 3.1L9.6 21.5h4.8l-1.2-4.4A4.3 4.3 0 0 0 20.5 14c0-4.6-5.9-7.8-8.5-11.5z",
  // Corazones
  "M12 21C8.6 18.4 2.5 14 2.5 8.6 2.5 5.7 4.7 3.5 7.4 3.5c2 0 3.6 1.1 4.6 2.8 1-1.7 2.6-2.8 4.6-2.8 2.7 0 4.9 2.2 4.9 5.1C21.5 14 15.4 18.4 12 21z",
  // Diamantes
  "M12 2 19.5 12 12 22 4.5 12z",
  // Tréboles
  "M12 2.8a4.1 4.1 0 0 1 3.3 6.6 4.1 4.1 0 1 1-1.9 6.9l1.1 5.2H9.5l1.1-5.2a4.1 4.1 0 1 1-1.9-6.9A4.1 4.1 0 0 1 12 2.8z",
];

export function Suit({ suit, className }: { suit: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d={PATHS[suit]} fill="currentColor" />
    </svg>
  );
}

const RANK_LABELS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

/** Cara de una carta: número y palo en la esquina (lo que asoma en una columna) y el palo grande en medio. */
export function CardFace({ card }: { card: number }) {
  const r = rank(card);
  return (
    <span aria-hidden className="solitaire-face-inner">
      <span className="solitaire-corner">
        <span className={`display font-bold ${r === 10 ? "tracking-[-0.08em]" : ""}`}>{RANK_LABELS[r - 1]}</span>
        <Suit suit={suit(card)} className="solitaire-corner-suit" />
      </span>
      {r > 10 ? (
        <span className="solitaire-center display font-bold">{RANK_LABELS[r - 1]}</span>
      ) : (
        <Suit suit={suit(card)} className="solitaire-center-suit" />
      )}
    </span>
  );
}
