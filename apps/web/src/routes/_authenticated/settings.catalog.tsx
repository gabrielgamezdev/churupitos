import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

import { EnvelopeChip } from "@/components/envelope-chip";
import { List, ListRow } from "@/components/list";
import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { MissingData } from "@/components/states";
import { buttonVariants } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountBalances, type AccountBalance } from "@/features/balances/use-account-balances";
import { envelopesQuery, type Envelope } from "@/features/envelopes/queries";
import { budgetOrder } from "@/features/operations/envelope-order";
import { CURRENCY_NAMES, type Currency } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings/catalog")({
  component: CatalogPage,
});

const CURRENCIES: Currency[] = ["VES", "USD"];

// Sobres y cuentas (M11): crear los nuevos y retirar los que ya no se usan. Los
// archivados van plegados al final de cada lista (R20).
function CatalogPage() {
  const envelopes = useQuery(envelopesQuery);
  const accounts = useAccountBalances();

  return (
    <Screen>
      <ScreenHeader
        title="Sobres y cuentas"
        back={{ to: "/settings" }}
        backLabel="Volver a Ajustes"
      />
      {envelopes.data && accounts.data ? (
        <>
          <EnvelopesSection envelopes={envelopes.data} />
          <AccountsSection accounts={accounts.data} />
        </>
      ) : (
        <MissingData
          queries={[envelopes, accounts]}
          errorMessage="No se pudieron cargar los sobres y las cuentas."
          skeleton={<Skeleton aria-label="Cargando" className="h-64 w-full" />}
        />
      )}
    </Screen>
  );
}

function EnvelopesSection({ envelopes }: { envelopes: Envelope[] }) {
  const ordered = budgetOrder(envelopes);
  const row = (envelope: Envelope) => (
    <ListRow key={envelope.id} asChild className={cn(envelope.archived && "text-ink-muted")}>
      <Link to="/settings/envelopes/$envelopeId" params={{ envelopeId: envelope.id }}>
        <EnvelopeChip
          name={envelope.name}
          emoji={envelope.emoji}
          isThirdParty={envelope.isThirdParty}
          className={cn("text-body", !envelope.isThirdParty && !envelope.archived && "text-ink")}
        />
        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-ink-muted" />
      </Link>
    </ListRow>
  );
  return (
    <section aria-labelledby="catalog-envelopes-title" className="flex flex-col gap-3">
      <SectionTitle id="catalog-envelopes-title" title="Sobres">
        <AddLink to="/settings/envelopes/new">Agregar sobre</AddLink>
      </SectionTitle>
      <List>{ordered.filter((envelope) => !envelope.archived).map(row)}</List>
      <ArchivedGroup count={ordered.filter((envelope) => envelope.archived).length}>
        {ordered.filter((envelope) => envelope.archived).map(row)}
      </ArchivedGroup>
    </section>
  );
}

function AccountsSection({ accounts }: { accounts: AccountBalance[] }) {
  const row = (account: AccountBalance) => (
    <ListRow key={account.accountId} asChild className={cn(account.archived && "text-ink-muted")}>
      <Link to="/settings/accounts/$accountId" params={{ accountId: account.accountId }}>
        <span className="min-w-0 truncate text-body">{account.name}</span>
        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-ink-muted" />
      </Link>
    </ListRow>
  );
  const archived = accounts.filter((account) => account.archived);
  return (
    <section aria-labelledby="catalog-accounts-title" className="flex flex-col gap-3">
      <SectionTitle id="catalog-accounts-title" title="Cuentas">
        <AddLink to="/settings/accounts/new">Agregar cuenta</AddLink>
      </SectionTitle>
      {CURRENCIES.map((currency) => {
        const active = accounts.filter(
          (account) => account.currency === currency && !account.archived,
        );
        if (active.length === 0) return null;
        return (
          <div key={currency} className="flex flex-col gap-2">
            <h3 className="px-1 text-caption text-ink-muted">{CURRENCY_NAMES[currency]}</h3>
            <List>{active.map(row)}</List>
          </div>
        );
      })}
      <ArchivedGroup count={archived.length}>{archived.map(row)}</ArchivedGroup>
    </section>
  );
}

function SectionTitle({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="text-heading">
        {title}
      </h2>
      {children}
    </div>
  );
}

function AddLink({
  to,
  children,
}: {
  to: "/settings/envelopes/new" | "/settings/accounts/new";
  children: React.ReactNode;
}) {
  return (
    <Link to={to} className={buttonVariants({ variant: "outline" })}>
      <Plus aria-hidden="true" />
      {children}
    </Link>
  );
}

// Los archivados, plegados: casi nunca se miran, pero desde aquí se reactivan.
function ArchivedGroup({ count, children }: { count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <Collapsible className="flex flex-col gap-2">
      <CollapsibleTrigger className="group flex min-h-tap w-full items-center justify-between gap-3 rounded-lg bg-surface-raised px-4 text-body text-ink-muted active:bg-surface-sunken">
        <span>Archivados · {count}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 transition-transform group-data-[state=open]:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <List>{children}</List>
      </CollapsibleContent>
    </Collapsible>
  );
}
