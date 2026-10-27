import Link from "next/link";
import { getMessages } from "@/lib/i18n/server";
import { CreateGroup } from "./create-group";

export type GroupSummary = { id: string; name: string; members: number };

/** Tus grupos (cada uno lleva a su página) y el formulario para crear otro. */
export async function MyGroups({ groups }: { groups: GroupSummary[] }) {
  const m = await getMessages();
  return (
    <section aria-labelledby="groups-title" className="flex flex-col gap-4">
      <div>
        <h2 id="groups-title" className="font-semibold">
          {m.groups.title}
        </h2>
        <p className="text-sm text-muted">{m.groups.hint}</p>
      </div>
      {groups.length > 0 && (
        <ul className="flex flex-col">
          {groups.map((group) => (
            <li key={group.id}>
              <Link href={`/grupos/${group.id}`} className="group flex items-center gap-3 border-b border-line py-2.5">
                <span className="min-w-0 flex-1 truncate font-medium group-hover:underline group-hover:underline-offset-4">{group.name}</span>
                <span className="text-sm text-muted">{m.groups.members(group.members)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <CreateGroup />
    </section>
  );
}
