import { NativeSelect } from "@/components/ui/native-select";
import type { AccountBalance } from "@/features/balances/use-account-balances";
import { CURRENCY_NAMES, type Currency } from "@/lib/money";

const CURRENCIES: Currency[] = ["VES", "USD"];

interface AccountSelectProps extends React.ComponentProps<"select"> {
  accounts: AccountBalance[];
  invalid: boolean;
}

// La cuenta de un formulario: la lista del sistema, con las cuentas agrupadas por moneda
// en el orden de las hojas del Excel.
export function AccountSelect({ accounts, invalid, ...props }: AccountSelectProps) {
  return (
    <NativeSelect aria-invalid={invalid ? true : undefined} {...props}>
      <option value="">Elige la cuenta</option>
      {CURRENCIES.map((currency) => (
        <optgroup key={currency} label={CURRENCY_NAMES[currency]}>
          {accounts
            .filter((row) => row.currency === currency)
            .map((row) => (
              <option key={row.accountId} value={row.accountId}>
                {row.name}
              </option>
            ))}
        </optgroup>
      ))}
    </NativeSelect>
  );
}
