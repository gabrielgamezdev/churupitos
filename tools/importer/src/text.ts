// Los textos del Excel se comparan exactos, pero sin las diferencias invisibles:
// la forma Unicode (NFC), los saltos de línea de las celdas multilínea y los
// espacios repetidos o duros. Los emoji se respetan, con sus uniones (U+200D) y
// selectores (U+FE0F): «👨‍💻 Ana» y «👤 Ana» son cadenas distintas.
export function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).normalize("NFC").replace(/\s+/gu, " ").trim();
}

// Para reconocer títulos y cabeceras («📦 Distribución de los ingresos»), que
// cambian de emoji o de mayúsculas de un mes a otro: solo letras, dígitos y
// espacios, sin acentos y en minúscula.
export function normalizeLabel(value: unknown): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}$ ]/gu, "")
    .replace(/ +/g, " ")
    .trim()
    .toLowerCase();
}
