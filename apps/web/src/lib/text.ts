// Un texto para comparar al buscar: sin mayúsculas ni tildes, así «Café» y «cafe» son lo
// mismo.
export function foldText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
