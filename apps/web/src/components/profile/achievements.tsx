import type { Json } from "@repo/db";
import { sanitizeParts } from "@repo/avatars";
import { Avatar } from "@repo/ui/avatar";
import { achievementsFor } from "@/lib/achievements";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { InlinePicto } from "@/components/picto";

export type AchievementStatus = { achievement: string; progress: number; goal: number; unlocked_at: string | null };

/**
 * Logros del perfil: los conseguidos primero y luego los más avanzados. Cada
 * uno enseña tu monstruo con la ropa que da (en gris si aún no la tienes).
 */
export async function Achievements({ statuses, avatarSeed, avatarParts }: { statuses: AchievementStatus[]; avatarSeed: number; avatarParts: Json }) {
  const locale = await getLocale();
  const m = await getMessages();
  const dateFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
  const catalog = achievementsFor(locale);
  const byId = new Map(statuses.map((status) => [status.achievement, status]));
  const items = catalog.map((achievement) => ({
    achievement,
    status: byId.get(achievement.id) ?? { achievement: achievement.id, progress: 0, goal: 1, unlocked_at: null },
  })).sort((a, b) => {
    if (a.status.unlocked_at && b.status.unlocked_at) return a.status.unlocked_at.localeCompare(b.status.unlocked_at);
    if (a.status.unlocked_at || b.status.unlocked_at) return a.status.unlocked_at ? -1 : 1;
    return b.status.progress / b.status.goal - a.status.progress / a.status.goal;
  });
  const unlocked = items.filter((item) => item.status.unlocked_at).length;
  const parts = sanitizeParts(avatarParts);

  return (
    <section id="logros" aria-labelledby="achievements-title" className="flex scroll-mt-24 flex-col gap-4">
      <div>
        <h2 id="achievements-title" className="text-xl font-semibold">
          {m.achievements.title}
        </h2>
        <p className="text-sm text-muted">
          {m.achievements.summary(unlocked, catalog.length)}
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ achievement, status }) => {
          const done = status.unlocked_at !== null;
          return (
            <li key={achievement.id} className="flex items-center gap-3 rounded-3xl bg-surface p-3 shadow-soft">
              <span
                className={`grid size-16 shrink-0 place-items-center rounded-2xl ${done ? "" : "opacity-45 grayscale"}`}
                style={{ background: "var(--cell)" }}
              >
                <Avatar seed={avatarSeed} parts={{ ...parts, [achievement.reward.slot]: achievement.reward.id }} size={52} mood={done ? "happy" : "neutral"} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-semibold">
                  <InlinePicto name={achievement.icon} className="mr-1.5" />
                  {achievement.name}
                </span>
                <span className="text-xs text-muted">{achievement.description}</span>
                {done ? (
                  <span className="text-xs">
                    <strong>{achievement.reward.label}</strong>
                    <span className="text-muted">{m.achievements.since(dateFormat.format(new Date(status.unlocked_at!)))}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {status.goal > 1 && (
                      <>
                        <span
                          role="progressbar"
                          aria-label={m.achievements.progress(achievement.name)}
                          aria-valuemin={0}
                          aria-valuemax={status.goal}
                          aria-valuenow={status.progress}
                          className="h-1.5 flex-1 overflow-hidden rounded-full"
                          style={{ background: "var(--cell)" }}
                        >
                          <span className="block h-full rounded-full bg-ink" style={{ width: `${(status.progress / status.goal) * 100}%` }} />
                        </span>
                        <span className="tabular shrink-0">
                          {status.progress}/{status.goal}
                        </span>
                      </>
                    )}
                    {status.goal === 1 && <span>{m.achievements.reward(achievement.reward.label)}</span>}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
