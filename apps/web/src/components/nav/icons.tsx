/** Iconos de trazo para la navegación (heredan el color del texto). */
const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function HomeIcon() {
  return (
    <svg {...base}>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}

export function ChatIcon() {
  return (
    <svg {...base}>
      <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4.5 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
    </svg>
  );
}

export function FriendsIcon() {
  return (
    <svg {...base}>
      <circle cx="9" cy="9" r="3.5" />
      <path d="M3 19.5c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5" />
      <path d="M15.5 5.6a3.5 3.5 0 0 1 0 6.8M17.5 15.2c1.7.6 3 2 3.5 4.3" />
    </svg>
  );
}

export function TrophyIcon() {
  return (
    <svg {...base}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 6H5a2 2 0 0 0 2 4h1M16 6h3a2 2 0 0 1-2 4h-1M12 13v4M8.5 20h7M10 17h4" />
    </svg>
  );
}

export function GamesIcon() {
  return (
    <svg {...base}>
      <path d="M7 8h10a4 4 0 0 1 4 4v2.5a2.5 2.5 0 0 1-4.6 1.4L15 14H9l-1.4 1.9A2.5 2.5 0 0 1 3 14.5V12a4 4 0 0 1 4-4z" />
      <path d="M8 10.5v3M6.5 12h3M15.5 11h.01M17.5 13h.01" />
    </svg>
  );
}

export function MegaphoneIcon() {
  return (
    <svg {...base}>
      <path d="M4 10v4a1 1 0 0 0 1 1h2l8 4V5L7 9H5a1 1 0 0 0-1 1z" />
      <path d="M7 15l1.2 4.2a1 1 0 0 0 1 .8h1.3M18.5 9.5a3.5 3.5 0 0 1 0 5" />
    </svg>
  );
}
