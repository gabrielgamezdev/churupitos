// La última cuenta con la que registró cada uno (M7), para no elegirla cada vez. Vive
// en el teléfono: es una comodidad, y si no está (otro teléfono, datos borrados) se
// elige a mano. Se guarda por persona, porque los dos pagan desde cuentas distintas.

const key = (userId: string) => `churupitos:last-account:${userId}`;

export function rememberAccount(userId: string, accountId: string) {
  try {
    localStorage.setItem(key(userId), accountId);
  } catch {
    // Sin almacenamiento (modo privado), no se recuerda y ya.
  }
}

// La que se recuerda, solo si sigue existiendo: cada recarga desde los Excels hasta el
// corte crea las cuentas otra vez, con identificadores nuevos.
export function rememberedAccount(userId: string, accountIds: string[]): string | null {
  try {
    const accountId = localStorage.getItem(key(userId));
    return accountId && accountIds.includes(accountId) ? accountId : null;
  } catch {
    return null;
  }
}
