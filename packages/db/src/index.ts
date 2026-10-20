import type { Database } from "./database.types";

export type { Database, Json } from "./database.types";

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type Functions<T extends keyof PublicSchema["Functions"]> = PublicSchema["Functions"][T];

export type Profile = Tables<"profiles">;
export type Friendship = Tables<"friendships">;
export type GameRun = Tables<"game_runs">;
export type LeaderboardEntry = Functions<"get_leaderboard">["Returns"][number];

/** Resultado de `send_friend_request` (ver migración init). */
export type FriendRequestResult =
  | "sent"
  | "accepted"
  | "already_sent"
  | "already_friends"
  | "self"
  | "not_found"
  | "rate_limited";
