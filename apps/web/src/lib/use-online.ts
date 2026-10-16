import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

// Si el teléfono tiene red, según TanStack Query: el mismo criterio con el que pausa
// las consultas y recarga al volver la red.
export function useOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
  );
}
