// Las fechas del Excel llegan como número de serie (días desde 1899-12-30) o, a
// veces, como texto. Se convierten a `AAAA-MM-DD` sin pasar por la zona horaria
// de la máquina: una fecha no tiene hora, así que ninguna zona puede moverla de día.

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;

export function serialToIsoDate(serial: number): string {
  return new Date(EXCEL_EPOCH_UTC + Math.floor(serial) * DAY_MS).toISOString().slice(0, 10);
}

// Los formatos que se han visto escritos a mano: 14/01/2026, 14-01-2026, 14/1/26 y
// 2026-01-14. Lo que no se entiende (como «???») devuelve null.
export function parseDateText(text: string): string | null {
  let year: number;
  let month: number;
  let day: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  const local = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/.exec(text);
  if (iso) {
    [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (local) {
    [day, month, year] = [Number(local[1]), Number(local[2]), Number(local[3])];
    if (year < 100) year += 2000;
  } else {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

// El primer día del mes de una fecha `AAAA-MM-DD`.
export function monthStart(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}
