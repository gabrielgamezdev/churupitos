import { Button } from "@/components/ui/button";
import { queryClient as appQueryClient } from "@/lib/query-client";
import { monthName } from "@/lib/months";
import { showToast } from "@/lib/toast";
import { useOnline } from "@/lib/use-online";
import { writeErrorMessage } from "@/lib/write-error";

import { closeMonth, useOpenMonth } from "./queries";

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

interface ClosedMonthNoticeProps {
  // El mes cerrado, `AAAA-MM`.
  month: string;
  // Qué se quería hacer: «para corregirlo», «para registrar ahí».
  purpose: string;
  className?: string;
}

// Lo que se ve en lugar de Corregir, Borrar o Guardar cuando el mes está cerrado (M12,
// R21): por qué no se puede, y «Abrir octubre» para hacerlo a propósito. Se vuelve a
// cerrar solo al terminar el día, o antes con «Cerrar» en el aviso o en Inicio.
export function ClosedMonthNotice({ month, purpose, className }: ClosedMonthNoticeProps) {
  const online = useOnline();
  const open = useOpenMonth();
  const name = monthName(month);
  const openIt = async () => {
    try {
      await open.mutateAsync(month);
      showToast({
        message: `${capitalize(name)} abierto hasta el fin del día`,
        action: {
          label: "Cerrar",
          run: async () => {
            await closeMonth(month);
            await appQueryClient.invalidateQueries();
          },
        },
      });
    } catch {
      // `open.error` lo dice debajo.
    }
  };
  return (
    <div className={className}>
      <div className="flex flex-col gap-2 rounded-md bg-surface-sunken p-3">
        <p className="text-body">
          {capitalize(name)} está cerrado: se abre {purpose}.
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={!online || open.isPending}
          onClick={() => void openIt()}
        >
          {open.isPending ? "Abriendo…" : `Abrir ${name}`}
        </Button>
        {open.error && (
          <p role="alert" className="text-body text-destructive">
            No se abrió. {writeErrorMessage(open.error)}
          </p>
        )}
      </div>
    </div>
  );
}
