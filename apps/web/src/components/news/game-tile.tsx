/** Miniatura con el color del juego: un tablero de 3 × 3 con la diagonal encendida. */
export function GameTile({ accent, className = "bg-surface" }: { accent: string; className?: string }) {
  return (
    <span aria-hidden className={`grid size-14 shrink-0 grid-cols-3 gap-0.5 rounded-2xl p-1.5 ${className}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="rounded-[4px]" style={{ background: i === 4 || i === 0 || i === 8 ? accent : "var(--cell)" }} />
      ))}
    </span>
  );
}
