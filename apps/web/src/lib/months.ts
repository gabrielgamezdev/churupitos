// Las fechas del libro son días sin hora (R13): «AAAA-MM-DD», y los meses, «AAAA-MM».
// Se comparan como texto y nunca pasan por una zona horaria: `toISOString()` daría el
// día en UTC, que de noche en Caracas ya es mañana.

const pad = (value: number) => String(value).padStart(2, "0");

// El día de hoy en el teléfono, que está en Caracas.
export function today(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function monthOf(day: string): string {
  return day.slice(0, 7);
}

export function addMonths(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const index = year * 12 + (monthNumber - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

export function firstDay(month: string): string {
  return `${month}-01`;
}

export function lastDay(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  // El día 0 del mes siguiente es el último de este.
  return `${month}-${pad(new Date(year, monthNumber, 0).getDate())}`;
}

const monthYear = new Intl.DateTimeFormat("es-VE", { month: "long", year: "numeric" });
const monthOnly = new Intl.DateTimeFormat("es-VE", { month: "long" });
const weekday = new Intl.DateTimeFormat("es-VE", { weekday: "long" });

function toDate(day: string): Date {
  const [year, month, date] = day.split("-").map(Number) as [number, number, number];
  return new Date(year, month - 1, date);
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// «Octubre 2026», como el nombre del Excel de ese mes.
export function monthLabel(month: string): string {
  return capitalize(monthYear.format(toDate(firstDay(month))).replace(" de ", " "));
}

// «septiembre», para dentro de una frase.
export function monthName(month: string): string {
  return monthOnly.format(toDate(firstDay(month)));
}

// El encabezado de cada día del libro: «Hoy», «Ayer» o «Lunes 13».
export function dayLabel(day: string, todayDay: string): string {
  if (day === todayDay) return "Hoy";
  const yesterday = toDate(todayDay);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === today(yesterday)) return "Ayer";
  return `${capitalize(weekday.format(toDate(day)))} ${Number(day.slice(8))}`;
}
