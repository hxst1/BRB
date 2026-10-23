import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { API_ERRORS_EN } from "./api-errors";

/** Todos los route.ts de app/api. */
function routes(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? routes(path) : name === "route.ts" ? [path] : [];
  });
}

describe("errores de la API", () => {
  it("cada error que ve el usuario tiene su traducción al inglés", () => {
    const missing: string[] = [];
    for (const file of routes(join(__dirname, "../../app/api"))) {
      const source = readFileSync(file, "utf8");
      if (!source.includes("apiJson")) continue;
      for (const [, text] of source.matchAll(/error: "([^"]+)"/g)) if (!(text! in API_ERRORS_EN)) missing.push(text!);
      // Tablas de errores por código (p. ej. MOVE_ERRORS en la ruta de jugadas).
      for (const [, table] of source.matchAll(/_ERRORS[^=]*= \{([^}]*)\}/g)) {
        for (const [, text] of table!.matchAll(/: "([^"]+)"/g)) if (!(text! in API_ERRORS_EN)) missing.push(text!);
      }
    }
    expect(missing).toEqual([]);
  });
});
