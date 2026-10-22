import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DAILY_GAMES, WEEKDAY_GAMES } from "./daily";

describe("reto diario", () => {
  const dir = new URL("../../../../supabase/migrations/", import.meta.url);
  const sql = readFileSync(new URL(readdirSync(dir).find((name) => name.endsWith("_daily_rotation.sql"))!, dir), "utf8");

  it("la rotación de cada día laborable es la de la base de datos", () => {
    const inDb = Object.fromEntries([...sql.matchAll(/when (\d) then '([a-z0-9-]+)'/g)].map(([, day, game]) => [Number(day), game]));
    expect(WEEKDAY_GAMES).toEqual(inDb);
  });

  it("todos los juegos que pueden tocar tienen nombre", () => {
    const pool = sql.match(/pool text\[\] := array\[([^\]]+)\]/)![1]!.match(/'([a-z0-9-]+)'/g)!.map((id) => id.slice(1, -1));
    expect(Object.keys(DAILY_GAMES).sort()).toEqual(pool.sort());
  });
});
