"use client";

import { Bone, TextLine } from "@/components/skeleton";
import { useMessages } from "@/lib/i18n/client";

/** La página de amigos mientras carga: tu código a un lado y, al otro, añadir amigos y la lista. */
export function FriendsPageSkeleton() {
  const m = useMessages();
  return (
    <div aria-hidden inert className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16">
      <div>
        <div className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-soft">
          <div>
            <p className="font-semibold">{m.friends.yourCode}</p>
            <p className="text-sm text-muted">{m.friends.yourCodeHint}</p>
          </div>
          <TextLine className="display w-56 text-6xl" />
          <div className="flex flex-wrap items-center gap-2">
            <Bone className="h-9 w-40 rounded-full" />
            <Bone className="h-9 w-32 rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{m.friends.addWithCode}</p>
          <div className="flex gap-2">
            <span className="tabular w-40 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-lg tracking-[0.12em] text-muted/50">K7XQ2</span>
            <span className="grid place-items-center rounded-xl bg-ink px-4 font-semibold text-bg opacity-40">{m.friends.add}</span>
          </div>
          <p className="min-h-5" />
        </div>
        <FriendRowsSkeleton />
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <p className="font-semibold">{m.groups.title}</p>
          <p className="text-sm text-muted">{m.groups.hint}</p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{m.groups.name}</p>
          <div className="flex gap-2">
            <span className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-muted/50">{m.groups.namePlaceholder}</span>
            <span className="grid place-items-center rounded-xl bg-ink px-4 font-semibold text-bg opacity-40">{m.groups.create}</span>
          </div>
          <p className="min-h-5" />
        </div>
      </div>
    </div>
  );
}

/** La lista de amigos en gris mientras llega. */
export function FriendRowsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-1">
      <TextLine className="w-28 text-sm" />
      <ul className="flex flex-col">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="flex items-center gap-3 border-b border-line py-2.5">
            <Bone className="size-9 shrink-0 rounded-full" />
            <TextLine className="w-28 min-w-0 flex-1" />
            <TextLine className="w-32 text-sm" />
          </li>
        ))}
      </ul>
    </div>
  );
}
