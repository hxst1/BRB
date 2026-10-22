import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("markdown de los textos legales", () => {
  it("pinta títulos, párrafos, listas, negrita y enlaces", () => {
    const html = renderMarkdown("## Quién\n\nHola **tú**, mira [esto](https://example.com).\n\n- uno\n- dos\n\n1. a\n2. b");
    expect(html).toContain("<h2>Quién</h2>");
    expect(html).toContain("<p>Hola <strong>tú</strong>, mira <a href=\"https://example.com\" rel=\"noopener noreferrer\" target=\"_blank\">esto</a>.</p>");
    expect(html).toContain("<ul><li>uno</li><li>dos</li></ul>");
    expect(html).toContain("<ol><li>a</li><li>b</li></ol>");
  });

  it("escapa el HTML y no deja enlaces peligrosos", () => {
    const html = renderMarkdown('<script>alert(1)</script> [clic](javascript:alert(1)) <img src=x onerror="y">');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("&lt;script&gt;");
  });
});
