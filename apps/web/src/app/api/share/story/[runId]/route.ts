import { renderMonsterSvg, resolveMonster } from "@repo/avatars";
import { siteUrl } from "@repo/brand";
import { messagesFor } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import { storyImage } from "@/lib/og";
import { gameGuide } from "@/lib/seo";
import { getViewerId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

type Level = "easy" | "medium" | "hard";
type Described = { guide: "2048" | "snake" | "lights-out" | "minesweeper" | "sudoku" | "solitaire" | "queens"; icon: string; level: Level | null; time: boolean };

/** De `game_runs.game` a su guía (nombre y color), su icono, su dificultad y si va por tiempo. */
function describe(game: string): Described | null {
  const [base, level] = game.split("-") as [string, Level | undefined];
  if (base === "2048" || base === "snake") return { guide: base, icon: base, level: null, time: false };
  if (base === "lightsout") return { guide: "lights-out", icon: "lightsout", level: null, time: false };
  if (base === "solitaire") return { guide: "solitaire", icon: "solitaire", level: null, time: true };
  if ((base === "minesweeper" || base === "sudoku" || base === "queens") && level) return { guide: base, icon: base, level, time: true };
  return null;
}

/**
 * Imagen para compartir una partida terminada en una historia (ver
 * components/share-story). Solo de tus partidas: game_runs solo deja ver las
 * propias.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/share/story/[runId]">) {
  const { runId } = await params;
  const viewerId = await getViewerId();
  if (!viewerId) return new Response("Hay que iniciar sesión", { status: 401 });

  const supabase = await createClient();
  const { data: run } = await supabase.from("game_runs").select("game, score, status, daily").eq("id", runId).maybeSingle();
  const game = run && describe(run.game);
  if (!run || run.status !== "finished" || run.score === null || !game) return new Response("Partida no encontrada", { status: 404 });

  const locale = await getRequestLocale();
  const m = messagesFor(locale);
  const guide = gameGuide(game.guide, locale);
  const origin = new URL(request.url).origin;
  const [{ data: profile }, { data: code }, { data: standing }, icon, appIcon] = await Promise.all([
    supabase.from("profiles").select("username, avatar_seed, avatar_parts").eq("id", viewerId).single(),
    supabase.from("friend_codes").select("code").eq("user_id", viewerId).maybeSingle(),
    supabase.rpc("get_my_standing", { game: run.game }).maybeSingle(),
    fetch(`${origin}/icons/${game.icon}.svg`).then((response) => response.text()),
    fetch(`${origin}/icons/icon-192.png`)
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .catch(() => null),
  ]);
  if (!profile) return new Response("Perfil no encontrado", { status: 404 });

  const { number, time } = m.format;
  const score = game.time ? time(run.score) : game.guide === "lights-out" ? m.daily.levels(number(run.score), run.score) : m.daily.points(number(run.score));
  // Con su código, quien entra por el QR empieza ya como amigo (ver app/invita).
  const url = code ? `${siteUrl()}/invita/${code.code}` : siteUrl();

  return storyImage({
    game: guide.name,
    detail: run.daily ? m.daily.title : game.level ? m.levels[game.level] : null,
    score,
    record: standing?.best_score === run.score ? { label: m.story.record, rank: m.story.rank(standing.global_rank, standing.global_players) } : null,
    username: profile.username,
    monster: renderMonsterSvg(resolveMonster(profile.avatar_seed, profile.avatar_parts), "happy"),
    icon,
    accent: guide.accent,
    challenge: m.story.challenge,
    join: m.story.join,
    url,
    urlLabel: url.replace(/^https?:\/\//, ""),
    appIcon,
  });
}
