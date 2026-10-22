import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { partAchievement, PART_OPTIONS } from "@repo/avatars";
import { ACHIEVEMENTS } from "./achievements";

const dir = new URL("../../../../supabase/migrations/", import.meta.url);
const sql = readFileSync(new URL(readdirSync(dir).find((name) => name.endsWith("_achievements.sql"))!, dir), "utf8");

describe("logros", () => {
  it("son los mismos que comprueba la base de datos", () => {
    const body = sql.slice(sql.indexOf("create function private.achievement_progress"), sql.indexOf("create function private.grant_achievements"));
    const inDb = [...body.matchAll(/select '([a-z0-9-]+)',/g)].map((m) => m[1]);
    expect(inDb.sort()).toEqual(ACHIEVEMENTS.map((a) => a.id).sort());
  });

  it("cada uno da la parte del avatar que lo pide, igual que en la base de datos", () => {
    const inDb = [...sql.matchAll(/when slot = '(\w+)' and id = '(\w+)' then '([a-z0-9-]+)'/g)].map(([, slot, id, achievement]) => ({
      slot,
      id,
      achievement,
    }));
    const inAvatars = (["palette", "top"] as const).flatMap((slot) =>
      PART_OPTIONS[slot].flatMap((id) => {
        const achievement = partAchievement(slot, id);
        return achievement ? [{ slot, id, achievement }] : [];
      }),
    );
    const inCatalog = ACHIEVEMENTS.map((a) => ({ slot: a.reward.slot, id: a.reward.id, achievement: a.id }));
    const sort = (list: { slot: string; id: string }[]) => [...list].sort((a, b) => `${a.slot}${a.id}`.localeCompare(`${b.slot}${b.id}`));
    expect(sort(inAvatars)).toEqual(sort(inDb));
    expect(sort(inCatalog)).toEqual(sort(inDb));
  });
});
