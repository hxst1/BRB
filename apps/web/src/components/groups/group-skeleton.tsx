"use client";

import { Bone, TextLine } from "@/components/skeleton";
import { useMessages } from "@/lib/i18n/client";

/** La página de un grupo mientras carga: nombre, botones, invitación y miembros. */
export function GroupSkeleton() {
  const m = useMessages();
  return (
    <div aria-hidden inert className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <TextLine className="w-32 text-sm" />
        <TextLine className="display w-64 text-5xl sm:text-6xl" />
        <TextLine className="w-24 text-sm" />
      </div>
      <Bone className="h-11 w-56 rounded-full" />
      <div className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-soft">
        <div>
          <p className="font-semibold">{m.groups.invite}</p>
          <p className="text-sm text-muted">{m.groups.inviteHint}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Bone className="h-9 w-36 rounded-full" />
          <Bone className="h-9 w-32 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <TextLine className="w-20 text-sm" />
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-3 border-b border-line py-2.5">
            <Bone className="size-9 rounded-full" />
            <TextLine className="w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
