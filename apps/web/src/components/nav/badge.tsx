/** Contador rojo para avisos (mensajes sin leer, turnos, solicitudes). */
export function Badge({ count, label, className = "" }: { count: number; label: string; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={label}
      className={`tabular grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold text-white ring-2 ring-bg ${className}`}
      style={{ background: "var(--mark-x)" }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
