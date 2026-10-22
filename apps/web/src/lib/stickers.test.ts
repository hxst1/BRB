import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STICKERS } from "@repo/avatars";
import { STICKER_LIST } from "./stickers";

describe("stickers", () => {
  it("son los mismos que acepta la base de datos, con el mismo emoji", () => {
    const dir = new URL("../../../../supabase/migrations/", import.meta.url);
    const sql = readFileSync(new URL(readdirSync(dir).find((name) => name.endsWith("_stickers.sql"))!, dir), "utf8");
    const inDb = [...sql.matchAll(/when '(\w+)' then '([^']+)'/g)].map(([, id, emoji]) => ({ id, emoji }));
    expect(STICKER_LIST.map(({ id, emoji }) => ({ id, emoji }))).toEqual(inDb);
    expect(STICKER_LIST.map((s) => s.id).sort()).toEqual([...STICKERS].sort());
  });
});
