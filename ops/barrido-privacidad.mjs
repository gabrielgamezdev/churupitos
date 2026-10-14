// Barrido de privacidad: busca datos personales en lo que va a entrar en git.
//
// El repositorio es público y un dato dentro de un commit sobrevive al borrado
// del archivo: sacarlo después obliga a reescribir la historia. Por eso esto
// corre ANTES de cada commit (hook pre-commit), sobre su mensaje (hook
// commit-msg) y otra vez en cada push (CI).
//
//   node ops/barrido-privacidad.mjs                    lo que está en el índice
//   node ops/barrido-privacidad.mjs --mensaje ARCHIVO  el mensaje de un commit
//   node ops/barrido-privacidad.mjs --todo             todos los archivos versionados
//
// Sale con 0 si está limpio y con 1 si encuentra algo. Está en Node y no en
// bash porque en Windows `bash` desde npm abre el de WSL, no el de Git.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const [mode = "--indice", messageFile] = process.argv.slice(2);
if (!["--indice", "--mensaje", "--todo"].includes(mode) || (mode === "--mensaje" && !messageFile)) {
  console.error("uso: node ops/barrido-privacidad.mjs [--mensaje ARCHIVO | --todo]");
  process.exit(2);
}

const gitBuffer = (...args) => execFileSync("git", args, { maxBuffer: 256 * 1024 * 1024 });
const git = (...args) => gitBuffer(...args).toString("utf8");

process.chdir(git("rev-parse", "--show-toplevel").trim());

// En CI los registros de un repositorio público son públicos: allí se dice
// dónde está el hallazgo, pero nunca se imprime la línea que lo contiene.
const isCi = Boolean(process.env.CI);

// --- Los nombres -------------------------------------------------------------
// Viven fuera del repositorio: si estuvieran escritos aquí, este archivo sería
// él mismo la fuga que intenta evitar. Solo existen en privado/ y no se suben a
// ningún sitio, ni como secreto de la CI (ADR 0006): allí el barrido busca solo
// los patrones de abajo, y los nombres los vigilan los hooks locales.
const NAMES_FILE = "privado/barrido-nombres.txt";
const names = existsSync(NAMES_FILE)
  ? readFileSync(NAMES_FILE, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
  : [];

// --- Las reglas --------------------------------------------------------------
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Palabra completa con letras Unicode: el \b de JavaScript solo entiende ASCII
// y fallaría con un nombre acentuado.
const wholeWords = (words) =>
  new RegExp(`(?<![\\p{L}\\p{N}_])(?:${words.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}_])`, "u");

const rules = [
  names.length > 0 && { label: "nombres de bancos o personas", pattern: wholeWords(names) },
  // Importe con separador de miles y céntimos, que es como están escritos en
  // los Excels. Los ejemplos inventados usan cifras redondas.
  { label: "importes del histórico", pattern: /\d{1,3}\.\d{3},\d{2}/ },
  // Referencia a una celda de un libro mensual: mes, hoja y coordenada.
  { label: "referencias a celdas", pattern: /(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)\/[A-ZÁÉÍÓÚÑ $]+!?[A-Z]?\d+/ },
  { label: "correos personales", pattern: /[\w.%+-]+@(gmail|hotmail|outlook|yahoo|icloud|proton)\.[a-z]{2,}/i },
  { label: "IPs de la red de casa", pattern: /192\.168\.\d{1,3}\.\d{1,3}/ },
  // El autor no quiere rastro de la herramienta con la que se escribió el código.
  { label: "rastro de la herramienta", pattern: /Co-Authored-By|Generated with/i },
].filter(Boolean);

// --- El barrido --------------------------------------------------------------
const findings = [];

function scan(origin, text) {
  const lines = text.split(/\r?\n/);
  for (const { label, pattern } of rules) {
    const hits = [];
    lines.forEach((line, index) => {
      // `barrido:permitido` al final de una línea la excusa. Es para la
      // documentación que necesita citar un patrón para poder explicarlo.
      if (pattern.test(line) && !line.includes("barrido:permitido")) {
        hits.push(isCi ? `línea ${index + 1}` : `${index + 1}: ${line.trim()}`);
      }
    });
    if (hits.length > 0) {
      findings.push(`  ${origin} — ${label}:\n${hits.slice(0, 3).map((hit) => `    ${hit}`).join("\n")}`);
    }
  }
}

// El propio barrido queda fuera: para reconocer un patrón hay que escribirlo.
// Los lockfiles también: sus hashes en base64 dan falsos positivos con nombres
// cortos, y nadie los escribe a mano.
const isSkipped = (path) => /^ops\/barrido-/.test(path) || /(^|\/)package-lock\.json$/.test(path);
const isBinary = (buffer) => buffer.includes(0);
const listFiles = (output) => output.split("\0").filter(Boolean);

let scanned = 0;

if (mode === "--mensaje") {
  // Las líneas que empiezan por # son la plantilla de git, no el mensaje.
  const message = readFileSync(messageFile, "utf8")
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("#"))
    .join("\n");
  scan("mensaje del commit", message);
  scanned = 1;
} else {
  const files =
    mode === "--todo"
      ? listFiles(git("ls-files", "-z"))
      : listFiles(git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"));

  for (const path of files) {
    if (isSkipped(path)) continue;
    // En el índice se lee lo que va a entrar, no lo que hay en disco.
    if (mode === "--todo" && !existsSync(path)) continue;
    const content = mode === "--todo" ? readFileSync(path) : gitBuffer("show", `:${path}`);
    if (isBinary(content)) continue;
    scan(path, content.toString("utf8"));
    scanned += 1;
  }
}

if (findings.length > 0) {
  console.error("BARRIDO DE PRIVACIDAD: hay datos personales en lo que ibas a versionar.\n");
  console.error(findings.join("\n"));
  console.error(
    "\nSustituye los nombres por genéricos inventados y los importes por cifras redondas" +
      "\ninventadas. Si es un falso positivo, añade 'barrido:permitido' al final de esa línea" +
      "\ny explica por qué en el commit.",
  );
  process.exit(1);
}

if (mode !== "--mensaje") {
  console.log(`Barrido limpio: ${scanned} archivos revisados.`);
  if (names.length === 0) {
    console.log(
      isCi
        ? "Sin la lista de nombres, a propósito: en la CI solo se buscan patrones (ADR 0006)."
        : `AVISO: falta ${NAMES_FILE}, así que no se buscaron nombres propios.`,
    );
  }
}
