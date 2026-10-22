/**
 * Markdown mínimo para los textos legales (que se editan en el panel de
 * admin): títulos (#, ##, ###), párrafos, listas (- y 1.), **negrita** y
 * [enlaces](https://…). Todo el HTML del texto se escapa, y los enlaces solo
 * pueden ser http(s), mailto o rutas de la propia web.
 */
function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inline(text: string): string {
  return escape(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, url: string) =>
      /^(https?:\/\/|mailto:|\/)/.test(url) ? `<a href="${url}"${url.startsWith("/") ? "" : ' rel="noopener noreferrer" target="_blank"'}>${label}</a>` : label,
    );
}

export function renderMarkdown(source: string): string {
  const html: string[] = [];
  // En un objeto: TypeScript no sigue los cambios hechos dentro de las funciones de abajo.
  const open: { list: { tag: "ul" | "ol"; items: string[] } | null } = { list: null };
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    const list = open.list;
    if (list) html.push(`<${list.tag}>${list.items.map((item) => `<li>${inline(item)}</li>`).join("")}</${list.tag}>`);
    open.list = null;
  };

  for (const raw of source.split("\n")) {
    const line = raw.trim();
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const numbered = line.match(/^\d+\.\s+(.*)$/);

    if (!line) {
      flushParagraph();
      flushList();
    } else if (heading) {
      flushParagraph();
      flushList();
      // # y ## pasan a h2 y ### a h3: el h1 de la página es el título del documento.
      const level = Math.max(2, heading[1]!.length);
      html.push(`<h${level}>${inline(heading[2]!)}</h${level}>`);
    } else if (bullet || numbered) {
      flushParagraph();
      const tag = bullet ? "ul" : "ol";
      if (open.list?.tag !== tag) {
        flushList();
        open.list = { tag, items: [] };
      }
      open.list!.items.push((bullet ?? numbered)![1]!);
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return html.join("\n");
}
