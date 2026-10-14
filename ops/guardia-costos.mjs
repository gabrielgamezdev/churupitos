// Guardia de costos: la publicación en Cloudflare solo puede servir estáticos.
//
// Servir archivos estáticos es gratis y sin límite en Cloudflare. Lo que cobra
// por uso es lo demás: un script de Worker, almacenes (KV, R2, D1), Durable
// Objects, colas, cron, IA… Un descuido ahí, sumado a un bucle o a un ataque,
// es como se generan facturas de miles de dólares. Por eso no se confía en que
// alguien lo vea en una revisión: si `wrangler.jsonc` pide algo fuera de esta
// lista, el check y la CI fallan (ADR 0007).
//
//   node ops/guardia-costos.mjs [archivo]     (por defecto, wrangler.jsonc)
//
// Sale con 0 si la configuración solo sirve estáticos y con 1 si no.

import { readFileSync } from "node:fs";

const CONFIG_FILE = process.argv[2] ?? "wrangler.jsonc";

// Lo único que puede tener la configuración. Cualquier clave nueva se añade aquí a
// propósito, nunca sin querer; si puede cobrar por uso, además con su ADR.
// `workers_dev` y `preview_urls` solo deciden en qué URLs se sirve: no cobran.
const ALLOWED_TOP_LEVEL = new Set([
  "$schema",
  "name",
  "compatibility_date",
  "send_metrics",
  "workers_dev",
  "preview_urls",
  "assets",
]);
const ALLOWED_ASSETS = new Set(["directory", "not_found_handling"]);

// JSONC: el mismo JSON, con comentarios y comas finales. Se quitan los
// comentarios que no están dentro de una cadena y las comas antes de } o ].
function parseJsonc(text) {
  let output = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (inString) {
      output += char;
      if (char === "\\") output += text[++i] ?? "";
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
      output += char;
    } else if (char === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      output += "\n";
    } else if (char === "/" && next === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i++;
    } else {
      output += char;
    }
  }
  return JSON.parse(output.replace(/,(\s*[}\]])/g, "$1"));
}

const config = parseJsonc(readFileSync(CONFIG_FILE, "utf8"));
const problems = [];

for (const key of Object.keys(config)) {
  if (!ALLOWED_TOP_LEVEL.has(key)) problems.push(`«${key}»`);
}
for (const key of Object.keys(config.assets ?? {})) {
  if (!ALLOWED_ASSETS.has(key)) problems.push(`«assets.${key}»`);
}
if (!config.assets?.directory) problems.push("falta «assets.directory»: sin él no hay nada que servir");

if (problems.length > 0) {
  console.error(`GUARDIA DE COSTOS: ${CONFIG_FILE} pide más que servir estáticos:`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(
    "\nTodo lo que no sea servir archivos puede cobrar por uso. Si de verdad hace falta," +
      "\nes una decisión del autor: un ADR nuevo y añadir la clave a la lista de" +
      "\nops/guardia-costos.mjs, nunca solo el cambio en la configuración.",
  );
  process.exit(1);
}

console.log("Guardia de costos: Cloudflare solo sirve estáticos.");
