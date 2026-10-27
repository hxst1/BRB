"use client";

import { useRouter } from "next/navigation";
import type { Json } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";
import { ConfirmButton } from "@/components/confirm-button";
import { useMessages } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

export type GroupMember = { id: string; username: string; avatar_seed: number; avatar_parts: Json };

/** Quién está en el grupo. Quien lo lleva puede echar a los demás. */
export function GroupMembers({
  groupId,
  members,
  adminId,
  viewerId,
}: {
  groupId: string;
  members: GroupMember[];
  adminId: string;
  viewerId: string;
}) {
  const m = useMessages();
  const router = useRouter();

  async function remove(userId: string) {
    await createClient().rpc("remove_group_member", { group_id: groupId, user_id: userId });
    router.refresh();
  }

  return (
    <section aria-labelledby="members-title" className="flex flex-col gap-1">
      <h2 id="members-title" className="text-sm text-muted">
        {m.groups.members(members.length)}
      </h2>
      <ul className="flex flex-col">
        {members.map((member) => (
          <li key={member.id} className="flex items-center gap-3 border-b border-line py-2.5">
            <Avatar seed={member.avatar_seed} parts={member.avatar_parts} size={36} />
            <span className="min-w-0 flex-1 truncate font-medium">
              {member.username}
              {member.id === adminId && <span className="ml-2 text-xs font-normal text-muted">{m.groups.admin}</span>}
              {member.id === viewerId && <span className="ml-2 text-xs font-normal text-muted">{m.common.you}</span>}
            </span>
            {viewerId === adminId && member.id !== viewerId && (
              <span className="flex items-center gap-3">
                <ConfirmButton label={m.groups.remove} confirmLabel={m.groups.confirmRemove} onConfirm={() => void remove(member.id)} />
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
