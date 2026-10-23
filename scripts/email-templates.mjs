// Sube a Supabase en la nube las plantillas de email de supabase/templates (las
// mismas que usa el Supabase local, ver [auth.email.template.*] en config.toml).
// Uso: pnpm db:email-templates (lee SUPABASE_ACCESS_TOKEN y SUPABASE_PROJECT_REF de .env.deploy).
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.deploy", "utf8")
    .split("\n")
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
);
const config = readFileSync("supabase/config.toml", "utf8");

/** Asunto de una plantilla, tal cual está en config.toml. */
function subject(name) {
  const block = config.split(`[auth.email.template.${name}]`)[1];
  const line = block?.split("\n").find((l) => l.startsWith("subject = "));
  if (!line) throw new Error(`Sin asunto para ${name} en config.toml`);
  return JSON.parse(line.slice("subject = ".length));
}

const body = {};
for (const name of ["confirmation", "recovery"]) {
  body[`mailer_subjects_${name}`] = subject(name);
  body[`mailer_templates_${name}_content`] = readFileSync(`supabase/templates/${name}.html`, "utf8");
}

const response = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "content-type": "application/json" },
  body: JSON.stringify(body),
});
console.log(response.ok ? `Plantillas subidas: ${Object.keys(body).length / 2}` : `Error ${response.status}: ${await response.text()}`);
if (!response.ok) process.exit(1);
