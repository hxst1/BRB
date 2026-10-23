import { brand } from "@repo/brand";
import { messagesFor } from "@/lib/i18n";
import { absoluteUrl, GAME_GUIDES, guidesFor, HOME_FAQ, localizedPath } from "@/lib/seo";

/**
 * /llms.txt: resumen en Markdown para asistentes de IA (propuesta llmstxt.org).
 * Se genera de los mismos textos que las páginas, con un resumen en inglés al final.
 */

export function GET() {
  const section = (mode: "solo" | "friends") =>
    GAME_GUIDES.filter((game) => game.mode === mode)
      .map((game) => `- [${game.name}](${absoluteUrl(game.path)}): ${game.description}`)
      .join("\n");

  const english = guidesFor("en")
    .map((game) => `- [${game.name}](${absoluteUrl(localizedPath(game.path, "en"))}): ${game.description}`)
    .join("\n");

  const body = `# ${brand.name}

> ${brand.description} Gratis, sin anuncios y sin descargar nada: se juega en el navegador del móvil o del ordenador, y se puede instalar como app (PWA). En español y en inglés.

## Juegos en solitario

${section("solo")}

## Juegos contra amigos

${section("friends")}

## Más

- [Reto diario](${absoluteUrl("/reto-diario")}): cada día un juego (lunes 2048, martes Snake, miércoles Buscaminas, jueves Lights Out, viernes Sudoku y el fin de semana sorpresa), la misma partida para todo el mundo y un solo intento.
- [Ranking](${absoluteUrl("/ranking")}): clasificaciones por juego y por nivel.

## Preguntas frecuentes

${HOME_FAQ.map(({ q, a }) => `### ${q}\n\n${a}`).join("\n\n")}

## In English

${messagesFor("en").landing.description} The whole app is also available in English at ${absoluteUrl("/en")}.

${english}
`;
  return new Response(body, { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
