import type { Functions } from "@repo/db";
import type { Messages } from "@/lib/i18n";

export type Challenge = Functions<"get_my_challenges">["Returns"][number];

/** Estado de un reto de 2048 contado desde el punto de vista de quien lo ve. */
export function describeChallenge(row: Challenge, m: Messages): string {
  const t = m.challenge2048;
  const target = m.format.number(row.target_score);
  const attempt = row.attempt_score === null ? "" : m.format.number(row.attempt_score);
  const name = row.other_username;
  const tie = row.status === "lost" && row.attempt_score === row.target_score;

  if (row.incoming) {
    switch (row.status) {
      case "pending":
        return t.inPending(name, target);
      case "playing":
        return t.inPlaying(name);
      case "won":
        return t.inWon(name, attempt, target);
      case "lost":
        if (tie) return t.inTie(name, target);
        return attempt ? t.inLost(name, target, attempt) : t.inAbandoned(name);
      case "declined":
        return t.inDeclined(name);
    }
  }
  switch (row.status) {
    case "pending":
      return t.outPending(name, target);
    case "playing":
      return t.outPlaying(name);
    case "won":
      return t.outWon(name, attempt, target);
    case "lost":
      if (tie) return t.outTie(name, target);
      return attempt ? t.outLost(name, attempt, target) : t.outAbandoned(name);
    case "declined":
      return t.outDeclined(name);
  }
  return "";
}
