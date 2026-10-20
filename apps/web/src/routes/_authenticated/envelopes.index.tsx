import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight } from "lucide-react";

import { EnvelopeChip } from "@/components/envelope-chip";
import { List, ListRow } from "@/components/list";
import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState, MissingData, StaleDataBanner } from "@/components/states";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { summarizeEnvelopes } from "@/features/envelopes/envelope-summary";
import { EnvelopeRow, EnvelopeRowSkeleton } from "@/features/envelopes/envelope-row";
import { envelopeBalancesQuery, envelopesQuery } from "@/features/envelopes/queries";

export const Route = createFileRoute("/_authenticated/envelopes/")({
  component: EnvelopesPage,
});

// Sobres: para qué es el dinero, y cuánto tiene cada uno hoy en cada moneda.
function EnvelopesPage() {
  const envelopes = useQuery(envelopesQuery);
  const balances = useQuery(envelopeBalancesQuery());
  const queries = [envelopes, balances];

  if (!envelopes.data || !balances.data) {
    return (
      <Screen>
        <ScreenHeader title="Sobres" />
        <MissingData
          queries={queries}
          errorMessage="No se pudieron cargar los sobres."
          skeleton={
            <List aria-hidden="true">
              <EnvelopeRowSkeleton />
              <EnvelopeRowSkeleton />
              <EnvelopeRowSkeleton />
              <EnvelopeRowSkeleton />
            </List>
          }
        />
      </Screen>
    );
  }

  const { withMoney, empty } = summarizeEnvelopes(envelopes.data, balances.data);
  return (
    <Screen>
      <ScreenHeader title="Sobres">
        <p className="text-caption text-ink-muted">
          {withMoney.length === 1 ? "1 sobre con dinero" : `${withMoney.length} sobres con dinero`}
        </p>
      </ScreenHeader>
      <StaleDataBanner queries={queries} />

      {withMoney.length === 0 ? (
        <EmptyState>Todavía no hay datos importados.</EmptyState>
      ) : (
        <List>
          {withMoney.map((summary) => (
            <EnvelopeRow key={summary.envelope.id} {...summary} linked />
          ))}
        </List>
      )}

      {empty.length > 0 && (
        // Los que están en cero, ya gastados o de meses pasados: plegados, para que no estorben.
        <Collapsible className="flex flex-col gap-2">
          <CollapsibleTrigger className="group flex min-h-tap w-full items-center justify-between gap-3 rounded-lg bg-surface-raised px-4 text-body text-ink-muted active:bg-surface-sunken">
            <span>Sobres en cero · {empty.length}</span>
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform group-data-[state=open]:rotate-180"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <List>
              {empty.map((envelope) => (
                <ListRow key={envelope.id} asChild className="text-ink-muted">
                  <Link to="/envelopes/$envelopeId" params={{ envelopeId: envelope.id }}>
                    <EnvelopeChip
                      name={envelope.name}
                      emoji={envelope.emoji}
                      isThirdParty={envelope.isThirdParty}
                      className="text-body"
                    />
                    <ChevronRight aria-hidden="true" className="size-5" />
                  </Link>
                </ListRow>
              ))}
            </List>
          </CollapsibleContent>
        </Collapsible>
      )}
    </Screen>
  );
}
