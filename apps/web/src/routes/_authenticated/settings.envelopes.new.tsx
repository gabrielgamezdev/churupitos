import { createFileRoute } from "@tanstack/react-router";

import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { EnvelopeForm } from "@/features/catalog/envelope-form";
import { useCloseToCatalog } from "@/features/catalog/use-close";

export const Route = createFileRoute("/_authenticated/settings/envelopes/new")({
  component: NewEnvelopePage,
});

// Un sobre nuevo (M11): va al final del presupuesto.
function NewEnvelopePage() {
  const close = useCloseToCatalog();
  return (
    // Sin el hueco de la barra: abajo va «Crear», fijo.
    <Screen className="pb-0">
      <ScreenHeader
        title="Nuevo sobre"
        back={{ to: "/settings/catalog" }}
        backLabel="Volver sin guardar"
      />
      <EnvelopeForm onDone={close} />
    </Screen>
  );
}
