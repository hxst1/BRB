/** Corona de las reinas (toma el color del texto). */
export function Crown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M3 8.5 7.5 12 12 5l4.5 7L21 8.5 19 18H5L3 8.5zM5 20h14"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
