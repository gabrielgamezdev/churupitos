// Freno de consultas a Supabase (ADR 0007).
//
// Un bucle en la app (un efecto que se dispara a sí mismo, una consulta que se
// invalida sin fin) haría miles de peticiones. En el plan gratis eso no cuesta
// dinero, pero agota la cuota de transferencia del proyecto y los datos móviles
// del teléfono. El uso normal son pocas consultas por pantalla, así que pasar de
// MAX_REQUESTS en una ventana es señal de error, y se frena TODO hasta recargar:
// si se volviera a dejar pasar al vaciarse la ventana, el bucle seguiría, solo
// que más despacio.

export const MAX_REQUESTS = 60;
export const WINDOW_MS = 60_000;

export class RequestBrakeError extends Error {
  constructor() {
    super("Se frenaron las consultas: la app hizo demasiadas seguidas.");
    this.name = "RequestBrakeError";
  }
}

interface RequestBrakeOptions {
  maxRequests?: number;
  windowMs?: number;
  now?: () => number;
}

export function createRequestBrake({
  maxRequests = MAX_REQUESTS,
  windowMs = WINDOW_MS,
  now = Date.now,
}: RequestBrakeOptions = {}) {
  const recent: number[] = [];
  const listeners = new Set<() => void>();
  let tripped = false;

  function allow(): boolean {
    if (tripped) return false;
    const current = now();
    let oldest = recent[0];
    while (oldest !== undefined && current - oldest >= windowMs) {
      recent.shift();
      oldest = recent[0];
    }
    if (recent.length >= maxRequests) {
      tripped = true;
      listeners.forEach((listener) => listener());
      return false;
    }
    recent.push(current);
    return true;
  }

  return {
    wrap(baseFetch: typeof fetch): typeof fetch {
      return (input, init) =>
        allow() ? baseFetch(input, init) : Promise.reject(new RequestBrakeError());
    },
    isTripped: () => tripped,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
