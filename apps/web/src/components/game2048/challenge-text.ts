import type { Functions } from "@repo/db";
import { formatNumber } from "@/lib/format";

export type Challenge = Functions<"get_my_challenges">["Returns"][number];

/** Estado de un reto de 2048 contado desde el punto de vista de quien lo ve. */
export function describeChallenge(row: Challenge): string {
  const target = formatNumber(row.target_score);
  const attempt = row.attempt_score === null ? "" : formatNumber(row.attempt_score);
  const name = row.other_username;
  const tie = row.status === "lost" && row.attempt_score === row.target_score;

  if (row.incoming) {
    switch (row.status) {
      case "pending":
        return `${name} te reta: supera ${target}`;
      case "playing":
        return `Estás jugando el reto de ${name}`;
      case "won":
        return `Superaste a ${name}: ${attempt} contra ${target}`;
      case "lost":
        if (tie) return `Empataste con ${name} a ${target}: había que superarle`;
        return attempt ? `${name} te ganó: ${target} contra tus ${attempt}` : `Abandonaste el reto de ${name}`;
      case "declined":
        return `Rechazaste el reto de ${name}`;
    }
  }
  switch (row.status) {
    case "pending":
      return `Retaste a ${name} a superar ${target}`;
    case "playing":
      return `${name} está jugando tu reto`;
    case "won":
      return `${name} te superó: ${attempt} contra tus ${target}`;
    case "lost":
      if (tie) return `${name} empató contigo a ${target}, pero no te superó`;
      return attempt ? `${name} no te superó: ${attempt} contra tus ${target}` : `${name} abandonó tu reto`;
    case "declined":
      return `${name} rechazó tu reto`;
  }
  return "";
}
