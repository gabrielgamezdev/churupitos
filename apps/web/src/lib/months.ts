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
const dayMonth = new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "long" });

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

// «10 de octubre», para un día que puede no ser del mes que se mira.
export function dayMonthLabel(day: string): string {
  return dayMonth.format(toDate(day));
}

// Cuándo se registró algo en la app: «20 de octubre a las 3:15 p. m.». Es un instante, no un
// día del libro: se lee en la hora de Caracas aunque el teléfono esté en otra (R13).
const registeredAt = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Caracas",
});

export function registeredAtLabel(instant: string): string {
  return registeredAt.format(new Date(instant));
}

// El día `delta` días después (o antes, en negativo) de otro, con el calendario y sin
// pasar por ninguna zona horaria (R13).
export function addDays(day: string, delta: number): string {
  const date = toDate(day);
  date.setDate(date.getDate() + delta);
  return today(date);
}

// El encabezado de cada día del libro: «Hoy», «Ayer» o «Lunes 13».
export function dayLabel(day: string, todayDay: string): string {
  if (day === todayDay) return "Hoy";
  if (day === addDays(todayDay, -1)) return "Ayer";
  return `${capitalize(weekday.format(toDate(day)))} ${Number(day.slice(8))}`;
}
