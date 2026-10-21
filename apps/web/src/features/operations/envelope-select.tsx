import { NativeSelect } from "@/components/ui/native-select";
import type { AccountBalance } from "@/features/balances/use-account-balances";
import type { Envelope } from "@/features/envelopes/queries";
import { formatMoney } from "@/lib/money";

// Los sobres en el orden del presupuesto, cada uno con lo que tiene en la cuenta elegida.
export function EnvelopeSelect({
  envelopes,
  account,
  cellByEnvelope,
  invalid,
  ...props
}: React.ComponentProps<"select"> & {
  envelopes: Envelope[];
  account: Pick<AccountBalance, "currency"> | undefined;
  cellByEnvelope: Map<string, number>;
  invalid: boolean;
}) {
  return (
    <NativeSelect aria-invalid={invalid ? true : undefined} {...props}>
      <option value="">Elige el sobre</option>
      {envelopes.map((envelope) => {
        const cents = cellByEnvelope.get(envelope.id);
        const name =
          envelope.emoji && !envelope.isThirdParty
            ? `${envelope.emoji} ${envelope.name}`
            : envelope.name;
        return (
          <option key={envelope.id} value={envelope.id}>
            {account && cents !== undefined
              ? `${name} · ${formatMoney(cents, account.currency)}`
              : name}
          </option>
        );
      })}
    </NativeSelect>
  );
}
