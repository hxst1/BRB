import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("acepta rutas internas", () => {
    expect(safeNext("/perfil")).toBe("/perfil");
    expect(safeNext("/3-en-raya/abc?x=1#y")).toBe("/3-en-raya/abc?x=1#y");
  });

  it.each([
    ["//evil.com"],
    ["/\\evil.com"],
    ["/\tevil.com"],
    ["/\t/evil.com"],
    ["/\n/evil.com"],
    ["https://evil.com"],
    ["evil.com"],
    ["javascript:alert(1)"],
    [""],
  ])("rechaza %j", (value) => {
    expect(safeNext(value)).toBe("/");
  });

  it("rechaza valores que no son texto", () => {
    expect(safeNext(null)).toBe("/");
    expect(safeNext(["/perfil"])).toBe("/");
  });
});
