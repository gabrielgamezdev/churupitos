import { createFileRoute } from "@tanstack/react-router";

import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState } from "@/components/states";

export const Route = createFileRoute("/_authenticated/envelopes/")({
  component: EnvelopesPage,
});

// Provisional del paso 2 de M3: la lista llega en el paso 4.
function EnvelopesPage() {
  return (
    <Screen>
      <ScreenHeader title="Sobres" />
      <EmptyState>La lista de sobres llega en el siguiente paso.</EmptyState>
    </Screen>
  );
}
