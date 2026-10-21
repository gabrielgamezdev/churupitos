import { createFileRoute } from "@tanstack/react-router";

import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState, MissingData } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountBalances } from "@/features/balances/use-account-balances";
import { AccountForm } from "@/features/catalog/account-form";
import { useCloseToCatalog } from "@/features/catalog/use-close";

export const Route = createFileRoute("/_authenticated/settings/accounts/$accountId")({
  component: EditAccountPage,
});

const HEADER = {
  title: "Cuenta",
  back: { to: "/settings/catalog" },
  backLabel: "Volver sin guardar",
} as const;

// Cambiar una cuenta, o archivarla, reactivarla o borrarla (M11, R20).
function EditAccountPage() {
  const { accountId } = Route.useParams();
  const accounts = useAccountBalances();
  const close = useCloseToCatalog();
  if (!accounts.data) {
    return (
      <Screen>
        <ScreenHeader {...HEADER} />
        <MissingData
          queries={[accounts]}
          errorMessage="No se pudo cargar la cuenta."
          skeleton={<Skeleton aria-label="Cargando" className="h-40 w-full" />}
        />
      </Screen>
    );
  }
  const account = accounts.data.find((candidate) => candidate.accountId === accountId);
  if (!account) {
    return (
      <Screen>
        <ScreenHeader {...HEADER} />
        <EmptyState className="rounded-lg bg-surface-raised">Esa cuenta ya no existe.</EmptyState>
      </Screen>
    );
  }
  return (
    // Sin el hueco de la barra: abajo va «Guardar», fijo.
    <Screen className="pb-0">
      <ScreenHeader {...HEADER} />
      <AccountForm key={account.accountId} account={account} onDone={close} />
    </Screen>
  );
}
