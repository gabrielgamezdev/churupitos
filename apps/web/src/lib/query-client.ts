import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { onlineManager, QueryClient } from "@tanstack/react-query";

// Lo último que se vio se guarda en el teléfono, para enseñarlo sin conexión con la
// hora de cuando se trajo. TRAMPAS: `gcTime` y `maxAge` valen lo mismo, y menos de
// 24 días, o la caché vuelve vacía.
export const CACHE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

// Lo traído hace menos de un minuto no se vuelve a pedir al cambiar de pantalla o de
// mes: ir y volver por el libro no gasta consultas (ni el freno, ADR 0007). Estirar
// hacia abajo recarga igual.
const STALE_TIME_MS = 60_000;

export const queryClient = new QueryClient({
  defaultOptions: { queries: { gcTime: CACHE_MAX_AGE_MS, staleTime: STALE_TIME_MS } },
});

export const queryPersister = createAsyncStoragePersister({
  storage: window.localStorage,
  key: "churupitos-query-cache",
});

// TanStack Query arranca creyendo que hay red, y solo cambia de idea con los eventos
// `online`/`offline`. Abierta sin red, intentaría cada consulta con sus reintentos.
// `navigator.onLine` a veces dice que hay red sin haberla, pero cuando dice que no,
// no la hay.
if (!navigator.onLine) onlineManager.setOnline(false);
