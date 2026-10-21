import { createFileRoute } from "@tanstack/react-router";

import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { AccountForm } from "@/features/catalog/account-form";
import { useCloseToCatalog } from "@/features/catalog/use-close";

export const Route = createFileRoute("/_authenticated/settings/accounts/new")({
  component: NewAccountPage,
});

// Una cuenta nueva (M11): va al final de las de su moneda.
function NewAccountPage() {
  const close = useCloseToCatalog();
  return (
    // Sin el hueco de la barra: abajo va «Crear», fijo.
    <Screen className="pb-0">
      <ScreenHeader
        title="Nueva cuenta"
        back={{ to: "/settings/catalog" }}
        backLabel="Volver sin guardar"
      />
      <AccountForm onDone={close} />
    </Screen>
  );
}
