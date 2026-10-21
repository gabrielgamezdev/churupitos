import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState, MissingData } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { EnvelopeForm } from "@/features/catalog/envelope-form";
import { useCloseToCatalog } from "@/features/catalog/use-close";
import { envelopesQuery } from "@/features/envelopes/queries";

export const Route = createFileRoute("/_authenticated/settings/envelopes/$envelopeId")({
  component: EditEnvelopePage,
});

const HEADER = {
  title: "Sobre",
  back: { to: "/settings/catalog" },
  backLabel: "Volver sin guardar",
} as const;

// Cambiar un sobre, o archivarlo, reactivarlo o borrarlo (M11, R20).
function EditEnvelopePage() {
  const { envelopeId } = Route.useParams();
  const envelopes = useQuery(envelopesQuery);
  const close = useCloseToCatalog();
  if (!envelopes.data) {
    return (
      <Screen>
        <ScreenHeader {...HEADER} />
        <MissingData
          queries={[envelopes]}
          errorMessage="No se pudo cargar el sobre."
          skeleton={<Skeleton aria-label="Cargando" className="h-40 w-full" />}
        />
      </Screen>
    );
  }
  const envelope = envelopes.data.find((candidate) => candidate.id === envelopeId);
  if (!envelope) {
    return (
      <Screen>
        <ScreenHeader {...HEADER} />
        <EmptyState className="rounded-lg bg-surface-raised">Ese sobre ya no existe.</EmptyState>
      </Screen>
    );
  }
  return (
    // Sin el hueco de la barra: abajo va «Guardar», fijo.
    <Screen className="pb-0">
      <ScreenHeader {...HEADER} />
      {/* Por sobre: si cambia de uno a otro, el formulario empieza de nuevo. */}
      <EnvelopeForm key={envelope.id} envelope={envelope} onDone={close} />
    </Screen>
  );
}
