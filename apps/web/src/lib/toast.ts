// El aviso de abajo, después de guardar algo (M7): uno a la vez, y vive fuera de las
// pantallas, porque guardar vuelve a la anterior y el aviso tiene que seguir ahí.

export type ToastAction = {
  label: string;
  // Lo que hace el botón, contra la base. Si falla, el aviso lo dice.
  run: () => Promise<unknown>;
};

export type ToastInput = {
  // Qué pasó: «Gasto guardado».
  message: string;
  // Lo que cambió por ello: «🍔 Comida queda en Bs X».
  detail?: string;
  action?: ToastAction;
};

export type Toast = ToastInput & { id: number };

// Con «Deshacer», 10 s o más: hay que verlo, entenderlo y alcanzarlo (WCAG 2.2.1). Sin
// botón, lo justo para leerlo. Tocarlo detiene la cuenta.
export const TOAST_WITH_ACTION_MS = 10_000;
export const TOAST_MS = 5_000;

let current: Toast | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

// Uno nuevo reemplaza al que hubiera.
export function showToast(input: ToastInput) {
  current = { ...input, id: nextId++ };
  emit();
}

export function dismissToast(id: number) {
  if (current?.id !== id) return;
  current = null;
  emit();
}

export function subscribeToToast(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function currentToast(): Toast | null {
  return current;
}
