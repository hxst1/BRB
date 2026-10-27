import type { Json } from "@repo/db";
import { sanitizeParts } from "@repo/avatars";
import { Avatar } from "@repo/ui/avatar";
import { achievementVisible, achievementsFor, rewardSummary, wearing } from "@/lib/achievements";
import { rewardBackground } from "@/lib/theme";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { InlinePicto } from "@/components/picto";
import { Bone, TextLine } from "@/components/skeleton";

/**
 * Los logros mientras llegan: el título y una tarjeta en gris por logro (el
 * orden depende de los tuyos, así que sin nombres). Los de temporada, que
 * salen o no según la fecha, no cuentan.
 */
export async function AchievementsSkeleton() {
  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  const count = achievementsFor(locale).filter((achievement) => !achievement.until).length;
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div>
        <p className="text-xl font-semibold">{m.achievements.title}</p>
        <TextLine className="w-40 text-sm" />
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="flex items-center gap-3 rounded-3xl bg-surface p-3 shadow-soft">
            <Bone className="size-16 shrink-0 rounded-2xl" />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <TextLine className="w-32" />
              <span className="flex flex-col text-xs">
                <TextLine className="w-full" />
                <TextLine className="w-1/2" />
              </span>
              <TextLine className="w-24 text-xs" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type AchievementStatus ={ achievement: string; progress: number; goal: number; unlocked_at: string | null };

/**
 * Logros del perfil: los conseguidos primero y luego los más avanzados. Cada
 * uno enseña tu monstruo con la ropa que da, o sobre el color de la app que da
 * (en gris si aún no lo tienes).
 */
export async function Achievements({ statuses, avatarSeed, avatarParts }: { statuses: AchievementStatus[]; avatarSeed: number; avatarParts: Json }) {
  const locale = await getLocale();
  const m = await getMessages();
  const dateFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
  const byId = new Map(statuses.map((status) => [status.achievement, status]));
  const catalog = achievementsFor(locale).filter((achievement) => achievementVisible(achievement, Boolean(byId.get(achievement.id)?.unlocked_at)));
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

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ achievement, status }) => {
          const done = status.unlocked_at !== null;
          return (
            <li key={achievement.id} className="flex items-center gap-3 rounded-3xl bg-surface p-3 shadow-soft">
              <span
                className={`grid size-16 shrink-0 place-items-center rounded-2xl ${done ? "" : "opacity-45 grayscale"}`}
                style={{ background: rewardBackground(achievement.reward) }}
              >
                <Avatar seed={avatarSeed} parts={wearing(parts, achievement.reward)} size={52} mood={done ? "happy" : "neutral"} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-semibold">
                  <InlinePicto name={achievement.icon} className="mr-1.5" />
                  {achievement.name}
                </span>
                <span className="text-xs text-muted">{achievement.description}</span>
                {done ? (
                  <span className="text-xs">
                    <strong>{rewardSummary(achievement, locale)}</strong>
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
                    {status.goal === 1 && <span>{m.achievements.reward(rewardSummary(achievement, locale))}</span>}
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
