import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";

import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";

export const Route = createFileRoute("/_authenticated/debts")({
  component: DebtsPage,
});

// Deudas está en la barra desde M4 para que no cambie de forma; su pantalla es de M5.
function DebtsPage() {
  return (
    <Screen>
      <ScreenHeader title="Deudas" />
      <section className="flex flex-col items-center gap-2 rounded-lg bg-surface-raised px-4 py-8 text-center">
        <Construction aria-hidden="true" className="size-6 text-ink-muted" />
        <h2 className="text-heading">En construcción</h2>
        <p className="text-body text-ink-muted">
          Aquí van a estar las deudas y lo que les deben, con las cuotas por fecha. Mientras tanto,
          siguen en el Excel.
        </p>
      </section>
    </Screen>
  );
}
