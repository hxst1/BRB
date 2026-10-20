import type { Json } from "@repo/db";
import { PLAYER_COLUMNS } from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";

export type Friend = { id: string; username: string; avatar_seed: number; avatar_parts: Json };

/** Amigos aceptados del usuario (desde el navegador). */
export async function fetchFriends(viewerId: string): Promise<Friend[]> {
  const { data } = await createClient()
    .from("friendships")
    .select(
      `requester_id, requester:profiles!friendships_requester_id_fkey(${PLAYER_COLUMNS}),
       addressee:profiles!friendships_addressee_id_fkey(${PLAYER_COLUMNS})`,
    )
    .eq("status", "accepted");
  return (data ?? []).map((row) => (row.requester_id === viewerId ? row.addressee : row.requester));
}
