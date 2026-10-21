import { useCanGoBack, useRouter } from "@tanstack/react-router";

// Al terminar un formulario de sobres y cuentas, a la lista: atrás si se llegó desde ella,
// y si no, sin dejar rastro en el historial.
export function useCloseToCatalog() {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  return () => {
    if (canGoBack) router.history.back();
    else void router.navigate({ to: "/settings/catalog", replace: true });
  };
}
