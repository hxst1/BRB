import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SOUNDS } from "./sound";

describe("sonidos", () => {
  it("cada sonido de la app tiene su archivo (scripts/sounds/build.mjs) y no sobra ninguno", () => {
    const manifest = JSON.parse(readFileSync(new URL("../../public/sounds/manifest.json", import.meta.url), "utf8")) as { name: string; file: string }[];
    expect(manifest.map((sound) => sound.name).sort()).toEqual([...SOUNDS].sort());
    for (const sound of manifest) expect(() => readFileSync(new URL(`../../public${sound.file}`, import.meta.url))).not.toThrow();
  });
});
