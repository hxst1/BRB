import { parseContribution, verifyGithubSignature } from "@/lib/github";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GitHub avisa aquí de las issues y pull requests del repo (ver lib/github.ts).
 * Cada código de amigo que aparezca, si es de alguien, le da el logro «Colaborador».
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyGithubSignature(raw, request.headers.get("x-hub-signature-256"), process.env.GITHUB_WEBHOOK_SECRET ?? "")) {
    return Response.json({ error: "Firma no válida" }, { status: 401 });
  }
  const event = request.headers.get("x-github-event");
  if (event === "ping") return Response.json({ ok: true });

  const contribution = parseContribution(event, JSON.parse(raw));
  if (!contribution) return Response.json({ ignored: true });

  const admin = createAdminClient();
  let credited = 0;
  for (const code of contribution.codes) {
    const { data: userId } = await admin.rpc("user_id_by_friend_code", { code });
    if (!userId) continue;
    const { data } = await admin.rpc("record_github_contribution", {
      user_id: userId,
      kind: contribution.kind,
      github_login: contribution.login,
      url: contribution.url,
    });
    if (data) credited++;
  }
  return Response.json({ ok: true, credited });
}
