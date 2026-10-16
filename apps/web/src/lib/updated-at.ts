const time = new Intl.DateTimeFormat("es-VE", { hour: "numeric", minute: "2-digit" });
const dayAndTime = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

// De cuándo son los datos que se ven sin conexión: «de las 8:15» si son de hoy, y
// con el día si no, para que nadie tome por de hoy un saldo de anteayer.
export function describeUpdatedAt(updatedAt: Date, now: Date = new Date()): string {
  const sameDay = updatedAt.toDateString() === now.toDateString();
  return sameDay ? `de las ${time.format(updatedAt)}` : `del ${dayAndTime.format(updatedAt)}`;
}
