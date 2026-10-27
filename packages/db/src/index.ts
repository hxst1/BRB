import type { Database } from "./database.types";

export type { Database, Json } from "./database.types";

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type Functions<T extends keyof PublicSchema["Functions"]> = PublicSchema["Functions"][T];

export type Profile = Tables<"profiles">;
export type Friendship = Tables<"friendships">;
export type GameRun = Tables<"game_runs">;
export type Match = Tables<"matches">;
export type LeaderboardEntry = Functions<"get_leaderboard">["Returns"][number];
/** Cada reto de hoy y cómo va (ver `get_my_dailies`). */
export type DailyStatus = Functions<"get_my_dailies">["Returns"][number];

/** La racha del usuario (ver `get_my_streak`). `recent`: [{ day, kind }] de las dos últimas semanas. */
export type StreakStatus = Functions<"get_my_streak">["Returns"][number];

/** Resultado de `send_friend_request` (ver migración init). */
export type FriendRequestResult =
  | "sent"
  | "accepted"
  | "already_sent"
  | "already_friends"
  | "self"
  | "not_found"
  | "rate_limited";
