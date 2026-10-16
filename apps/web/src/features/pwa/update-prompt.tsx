import { useRegisterSW } from "virtual:pwa-register/react";

import { Button } from "@/components/ui/button";

// Una app instalada casi nunca se recarga, así que el navegador tardaría mucho en
// enterarse de que hay versión nueva: se pregunta cada hora.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

// Aviso de versión nueva. La versión nueva espera a que la persona acepte
// (`registerType: "prompt"`), para no recargar la app a mitad de un registro.
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      setInterval(() => void registration.update(), UPDATE_CHECK_INTERVAL_MS);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm items-center gap-2 rounded-lg border bg-surface-raised p-3 shadow-lg"
    >
      <p className="flex-1 text-body">Hay una versión nueva de la app.</p>
      <Button variant="ghost" onClick={() => setNeedRefresh(false)}>
        Luego
      </Button>
      <Button onClick={() => void updateServiceWorker(true)}>Actualizar</Button>
    </div>
  );
}
