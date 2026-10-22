import { brand } from "@repo/brand";
import { absoluteUrl, GAME_GUIDES, HOME_FAQ } from "@/lib/seo";

/**
 * /llms.txt: resumen en Markdown para asistentes de IA (propuesta llmstxt.org).
 * Se genera de los mismos textos que las páginas.
 */

export function GET() {
  const section = (mode: "solo" | "friends") =>
    GAME_GUIDES.filter((game) => game.mode === mode)
      .map((game) => `- [${game.name}](${absoluteUrl(game.path)}): ${game.description}`)
      .join("\n");

  const body = `# ${brand.name}

> ${brand.description} Gratis, sin anuncios y sin descargar nada: se juega en el navegador del móvil o del ordenador, y se puede instalar como app (PWA). En español.

## Juegos en solitario

${section("solo")}

## Juegos contra amigos

${section("friends")}

## Más

- [Reto diario](${absoluteUrl("/reto-diario")}): la misma partida de 2048 para todo el mundo cada día, con un solo intento.
- [Ranking](${absoluteUrl("/ranking")}): clasificaciones por juego y por nivel.

## Preguntas frecuentes

${HOME_FAQ.map(({ q, a }) => `### ${q}\n\n${a}`).join("\n\n")}
`;
  return new Response(body, { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
