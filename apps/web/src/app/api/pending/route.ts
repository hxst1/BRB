import { createClientForRequest } from "@/lib/supabase/server";

/**
 * Lo pendiente de quien ha iniciado sesión, para el número del icono de la
 * extensión de Chrome (que lo pide con las cookies de la web): lo mismo que
 * los avisos de la barra de navegación (components/site-header).
 */
export async function GET(request: Request) {
  const { supabase, userId } = await createClientForRequest(request);
  if (!userId) return Response.json({ signedIn: false }, { headers: { "cache-control": "no-store" } });
  const [{ data: pending }, { data: unread }] = await Promise.all([
    supabase.rpc("get_pending_counts").maybeSingle(),
    supabase.rpc("get_unread_messages"),
  ]);
  return Response.json(
    {
      signedIn: true,
      home: pending ? pending.my_turn + pending.match_invites + pending.challenges : 0,
      chat: unread ?? 0,
      friends: pending?.friend_requests ?? 0,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
