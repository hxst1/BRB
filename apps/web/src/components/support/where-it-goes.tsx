/**
 * A dónde va el dinero de los apoyos, para ser transparentes. Si cambia en
 * qué se gasta, se cambia aquí.
 */
const SPENDING = [
  {
    icon: "🌐",
    title: "Un dominio propio",
    detail: "Un nombre definitivo para la app y su renovación cada año.",
  },
  {
    icon: "🗄️",
    title: "Base de datos y servidores",
    detail: "Supabase (cuentas, partidas y rankings) y Vercel (la web), cuando se queden pequeños sus planes gratuitos.",
  },
  {
    icon: "✉️",
    title: "Emails y avisos",
    detail: "El servicio que envía los correos de confirmación y de recuperar la contraseña.",
  },
  {
    icon: "🤖",
    title: "Inteligencia artificial para desarrollar",
    detail: "Las herramientas de IA con las que se programan y se diseñan los juegos nuevos.",
  },
  {
    icon: "🚀",
    title: "Lo que viene",
    detail: "Publicar la app en las tiendas de iPhone y Android, la extensión de Chrome y nuevas integraciones.",
  },
];

export function WhereItGoes({ compact = false }: { compact?: boolean }) {
  return (
    <section aria-labelledby="where-title" className="flex flex-col gap-3">
      <h2 id="where-title" className={compact ? "font-semibold" : "text-xl font-semibold"}>
        ¿A dónde va tu apoyo?
      </h2>
      <ul className="flex flex-col gap-2">
        {SPENDING.map((item) => (
          <li key={item.title} className="flex gap-3">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl text-lg" style={{ background: "var(--cell)" }}>
              {item.icon}
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold">{item.title}</span>
              {!compact && <span className="text-sm text-muted">{item.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        Nunca habrá anuncios ni se venderán tus datos. Lo que se recibe se dedica solo a mantener y mejorar la app.
      </p>
    </section>
  );
}
